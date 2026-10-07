# HƯỚNG DẪN TRIỂN KHAI VÀ TỰ ĐỘNG CẬP NHẬT TRÊN VPS

> **Dự án**: Chấm Công & Quản Lý Thu Chi (`attendance-expense-app`)  
> **VPS IP**: `160.30.161.121`  
> **Domain**: `https://chamcong.upkidscentermanager.io.vn`  
> **Web Server**: Caddy 2 (Tự động cấp SSL HTTPS)  
> **Process Manager**: PM2 (Quản lý tiến trình Next.js cổng 9000)

---

## 🚀 1. TRIỂN KHAI LẦN ĐẦU LÊN VPS (CHỈ CHẠY 1 LẦN DUY NHẤT)

Mở màn hình **Console** (trên giao diện web Proxmox) hoặc đăng nhập SSH vào VPS:

```bash
# 1. Đi vào thư mục chứa web
cd /var/www

# 2. Clone mã nguồn từ GitHub
git clone https://github.com/CallMeMrPenguin/attendance-expense-app.git

# 3. Đi vào thư mục dự án và chạy script triển khai tự động
cd attendance-expense-app
bash deploy_vps.sh
```

### ✨ Script `deploy_vps.sh` sẽ tự động 100%:
1. Cài đặt các gói hệ thống cần thiết (Node.js 20 LTS, PM2, build-essential).
2. Tạo file cấu hình môi trường `.env.local`.
3. Bảo vệ an toàn dữ liệu cơ sở dữ liệu SQLite (`data/local.db`) không bao giờ bị xung đột hoặc mất mát khi kéo code mới.
4. Cài đặt thư viện (`npm install`) và build tối ưu hóa production (`npm run build`).
5. Khởi chạy ứng dụng chạy ngầm bằng **PM2** trên cổng `9000` (tự động khởi động lại nếu VPS reboot).
6. Tạo cấu hình Caddy tự động tại `/etc/caddy/conf.d/chamcong.caddy` và reload Caddy.
7. Cài đặt tác vụ ngầm tự động cập nhật (**Cronjob chu kỳ 2 phút**) gọi script `auto_update.sh`.

Ngay sau khi chạy xong, bạn có thể truy cập ngay:  
👉 **`https://chamcong.upkidscentermanager.io.vn`** (Đã có chứng chỉ SSL xanh!).

---

## 🔄 2. CƠ CHẾ TỰ ĐỘNG CẬP NHẬT KHI CÓ THAY ĐỔI Ở GIT (AUTO-UPDATE)

File **`auto_update.sh`** đã được cấu hình sẵn trong dự án.

### ⚙️ Cách thức hoạt động:
1. **Hoàn toàn tự động**: Cứ mỗi 2 phút, VPS sẽ tự động kiểm tra GitHub repository `origin/main`.
2. Khi bạn sửa code ở máy tính và chạy lệnh:
   ```bash
   git add . ; git commit -m "update feature" ; git push origin main
   ```
3. Trong vòng tối đa 2 phút:
   - VPS phát hiện có commit mới.
   - Sao lưu dữ liệu database hiện tại vào `/var/backups/chamcong/`.
   - Tự động kéo code mới (`git pull origin main`).
   - Cài đặt package mới nếu có (`npm install`).
   - Tự build lại (`npm run build`).
   - Reload ứng dụng trên PM2 (`pm2 reload chamcong`) **mà không làm gián đoạn người dùng (Zero Downtime)**.

### 📝 Xem nhật ký (Log) cập nhật tự động trên VPS:
```bash
tail -f /var/log/chamcong_autoupdate.log
```

---

## 🛠️ 3. CÁC LỆNH HỮU ÍCH TRÊN VPS

| Nhu cầu | Lệnh thực thi |
|---|---|
| **Xem trạng thái app** | `pm2 status` |
| **Xem log app trực tiếp** | `pm2 logs chamcong` |
| **Khởi động lại app thủ công** | `pm2 restart chamcong` |
| **Xem log Caddy web server** | `journalctl -u caddy -e -n 50` |
| **Chạy cập nhật thủ công ngay lập tức** | `cd /var/www/attendance-expense-app && bash auto_update.sh` |
