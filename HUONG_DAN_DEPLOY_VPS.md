# HƯỚNG DẪN TRIỂN KHAI, TỐI ƯU 24/7 & TAILSCALE CHO DỰ ÁN CHẤM CÔNG

> **Dự án**: Chấm Công & Quản Lý Thu Chi (`attendance-expense-app`)  
> **VPS IP**: `160.30.161.121`  
> **Cổng nội bộ**: `127.0.0.1:9000` (Không chạm đến cổng 8000 của Center Manager)  
> **Tên miền công khai**: `https://chamcong.upkidscentermanager.io.vn`  
> **Mạng riêng Tailscale**: MagicDNS `https://<tailscale-vps-name>.ts.net` (Gán riêng cho cổng 9000)  
> **Quản lý tiến trình 24/7**: PM2 ([ecosystem.config.cjs](file:///c:/Users/ACER/Desktop/RANDOM%20PROJECT/CHẤM%20CÔNG/ecosystem.config.cjs)) + Systemd Boot Persistence  

---

## ⚡ 1. CÁC TỐI ƯU HIỆU NĂNG 24/7 ĐÃ ĐƯỢC THIẾT LẬP

Để ứng dụng hoạt động 24/7 mượt mà trên VPS 2GB RAM cùng với Center Manager và PostgreSQL:
1. **Kiểm soát RAM Node.js**: Cấu hình Node V8 heap ceiling `--max-old-space-size=512` và PM2 `max_memory_restart: 600M` nhằm triệt tiêu hoàn toàn nguy cơ rò rỉ bộ nhớ (memory leak).
2. **Tối ưu cơ sở dữ liệu SQLite**:
   - `journal_mode = WAL`: Ghi và đọc đồng thời không gây lock.
   - `synchronous = NORMAL`: Giảm 80% số lần ghi đĩa (I/O disk wait) so với FULL.
   - `temp_store = MEMORY`: Xử lý bảng tạm và sắp xếp trực tiếp trên RAM.
   - `mmap_size = 256MB`: Đọc dữ liệu nhanh qua bộ nhớ đệm trang OS.
   - `cache_size = 16MB` & `busy_timeout = 5000ms`: Chống lỗi `SQLITE_BUSY` khi có nhiều truy vấn.
3. **Nén dữ liệu HTTP**: Bật `compress: true` trong `next.config.ts` để tối ưu băng thông mạng.
4. **Bảo toàn dữ liệu**: Đặt cờ `git update-index --assume-unchanged data/local.db` và tạo bản sao lưu trước mỗi lần cập nhật.

---

## 🔒 2. CƠ CHẾ TAILSCALE DÀNH RIÊNG CHO DỰ ÁN NÀY

- **Không ảnh hưởng đến các dự án khác**: Tailscale chỉ được gán riêng biệt cho cổng `9000` thông qua tính năng `tailscale serve --bg http://127.0.0.1:9000`. Cổng 8000 và các web khác vẫn mở công khai bình thường.
- **Tự động cấp chứng chỉ TLS**: Tailscale Serve tự động tạo HTTPS an toàn mã hóa WireGuard trên MagicDNS của mạng riêng.
- **Tự khởi động cùng hệ điều hành**: Dịch vụ `tailscaled.service` được kích hoạt ở cấp độ systemd (`systemctl enable tailscaled`), tự động phục hồi kết nối ngay khi VPS vừa boot.

---

## 🚀 3. QUY TRÌNH TRIỂN KHAI 1-CLICK TRÊN VPS (CHỈ 1 LẦN)

Trên màn hình **Console** (noVNC trên web Proxmox) hoặc SSH vào VPS:

```bash
# 1. Đi vào thư mục web
cd /var/www

# 2. Tải mã nguồn từ GitHub
git clone https://github.com/CallMeMrPenguin/attendance-expense-app.git

# 3. Đi vào thư mục và chạy script tự động
cd attendance-expense-app
bash deploy_vps.sh
```

### ✨ Script `deploy_vps.sh` sẽ tự động:
1. Cài đặt Node.js 20 LTS, PM2, build-essential.
2. Build production Next.js với các thiết lập tối ưu.
3. Khởi chạy ứng dụng qua PM2 với cấu hình giới hạn RAM 600MB.
4. Kích hoạt tự khởi động khi VPS reboot (`pm2 startup systemd` & `systemctl enable pm2-root`).
5. Tạo cấu hình Caddy tại `/etc/caddy/conf.d/chamcong.caddy` và kích hoạt SSL Let's Encrypt.
6. Cài đặt và kích hoạt Tailscale cho cổng 9000 (`tailscaled.service`).
7. Đăng ký tác vụ tự động kiểm tra Git (`auto_update.sh`) chạy ngầm mỗi 2 phút.

---

## 🔄 4. CƠ CHẾ TỰ ĐỘNG CẬP NHẬT KHI CÓ THAY ĐỔI Ở GIT (AUTO-UPDATE)

Bất kỳ khi nào bạn hoàn thành code trên máy tính:
```bash
git add . ; git commit -m "feat: cap nhat moi" ; git push origin main
```
Trong vòng tối đa 2 phút:
- VPS tự động phát hiện mã mới từ GitHub.
- Tự động sao lưu database SQLite vào `/var/backups/chamcong/`.
- Tự động kéo mã nguồn (`git pull`), cài package mới (`npm install`), build (`npm run build`).
- Tự reload ứng dụng trên PM2 (`pm2 reload chamcong`) với **Zero Downtime**.
- Duy trì nguyên trạng kết nối Tailscale.

---

## 🛠️ 5. CÁC LỆNH QUẢN TRỊ NHANH TRÊN VPS

| Nhu cầu | Lệnh |
|---|---|
| **Xem trạng thái app** | `pm2 status` |
| **Xem log app 24/7** | `pm2 logs chamcong` |
| **Kiểm tra trạng thái Tailscale** | `tailscale status` |
| **Xem cấu hình Tailscale Serve** | `tailscale serve status` |
| **Xem log tự động cập nhật Git** | `tail-f /var/log/chamcong_autoupdate.log` |
| **Khởi động lại app thủ công** | `pm2 restart chamcong` |
| **Chạy script Tailscale độc lập** | `cd /var/www/attendance-expense-app && bash setup_tailscale.sh` |
