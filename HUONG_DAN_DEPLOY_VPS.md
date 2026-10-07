# HƯỚNG DẪN TRIỂN KHAI NỘI BỘ (100% PRIVATE TAILSCALE) CHO DỰ ÁN CHẤM CÔNG

> **Dự án**: Chấm Công & Quản Lý Thu Chi (`attendance-expense-app`)  
> **Chế độ**: **100% Riêng Tư (Private Only)** — **KHÔNG public ra Internet**  
> **Cổng nội bộ**: `127.0.0.1:9000` (Chỉ lắng nghe localhost)  
> **Mạng riêng truy cập**: Tailscale MagicDNS `https://<ten-vps>.ts.net` hoặc IP `http://100.x.x.x:9000`  
> **Quản lý tiến trình 24/7**: PM2 + Tự khởi động cùng VPS (Systemd Boot Persistence)  

---

## 🔒 1. NGUYÊN TẮC BẢO MẬT & RIÊNG TƯ

- **KHÔNG mở cổng 9000 ra ngoài Internet**: Cổng 9000 chỉ lắng nghe trên `127.0.0.1`.
- **KHÔNG cấu hình public domain**: Không tạo bất kỳ file Caddyfile hay trỏ domain ra ngoài. Người ngoài mạng Internet hoàn toàn không thể quét thấy hoặc truy cập ứng dụng này.
- **Áp dụng Tailscale riêng biệt cho dự án này**: Sử dụng tính năng `tailscale serve --bg http://127.0.0.1:9000` để chỉ các thiết bị trong mạng Tailnet của bạn (máy tính, điện thoại) mới có thể kết nối.

---

## ⚡ 2. CÁC TỐI ƯU HIỆU NĂNG 24/7

1. **Khống chế RAM Node.js**: Cấu hình Node V8 heap ceiling `--max-old-space-size=512` và PM2 `max_memory_restart: 600M` nhằm triệt tiêu hoàn toàn nguy cơ rò rỉ bộ nhớ.
2. **Tối ưu hóa SQLite 24/7**:
   - `journal_mode = WAL`: Ghi và đọc đồng thời không gây lock.
   - `synchronous = NORMAL`: Giảm hơn 80% áp lực ghi đĩa.
   - `temp_store = MEMORY`: Xử lý bảng tạm và sắp xếp trên RAM.
   - `mmap_size = 256MB`: Tăng tốc độ đọc dữ liệu qua bộ nhớ đệm trang.
   - `busy_timeout = 5000ms` & `cache_size = 16MB`: Chống lỗi lock khi có nhiều yêu cầu.
3. **Nén dữ liệu HTTP**: `compress: true` trong `next.config.ts`.
4. **Bảo toàn dữ liệu**: Đặt cờ `assume-unchanged` cho database `data/local.db` và tự động backup ra `/var/backups/chamcong/` trước mỗi lần cập nhật.

---

## 🚀 3. QUY TRÌNH TRIỂN KHAI TRÊN VPS (CHỈ 1 LẦN)

Trên màn hình **Console** hoặc terminal của VPS:

```bash
# 1. Đi vào thư mục web
cd /var/www

# 2. Tải mã nguồn từ GitHub
git clone https://github.com/CallMeMrPenguin/attendance-expense-app.git

# 3. Đi vào thư mục và chạy script tự động
cd attendance-expense-app
bash deploy_vps.sh
```

*(Nếu VPS chưa đăng nhập Tailscale, script sẽ yêu cầu đăng nhập bằng lệnh `tailscale up`).*

### ✨ Script sẽ tự động:
1. Gỡ bỏ mọi cấu hình public domain cũ (nếu có).
2. Cài đặt Node.js 20, PM2 và build Next.js tối ưu.
3. Chạy ứng dụng trên `127.0.0.1:9000` với PM2.
4. Kích hoạt tự khởi động khi VPS reboot (`pm2-root` & `tailscaled`).
5. Gán riêng cổng 9000 vào Tailscale Serve nội bộ.
6. Cài đặt cronjob tự động cập nhật khi có code mới trên Git (`auto_update.sh`).

---

## 🔄 4. CƠ CHẾ TỰ ĐỘNG CẬP NHẬT KHI CÓ THAY ĐỔI Ở GIT

Khi bạn chỉnh sửa code ở máy tính và push lên GitHub:
```bash
git add . ; git commit -m "feat: cap nhat" ; git push origin main
```
Trong vòng tối đa 2 phút, VPS sẽ **tự động sao lưu database, kéo code mới, build lại và reload ứng dụng** mà không làm mất trạng thái Tailscale hay gián đoạn dịch vụ.

---

## 🛠️ 5. CÁC LỆNH QUẢN TRỊ TRÊN VPS

| Nhu cầu | Lệnh |
|---|---|
| **Xem trạng thái app** | `pm2 status` |
| **Xem log app trực tiếp** | `pm2 logs chamcong` |
| **Kiểm tra trạng thái Tailscale** | `tailscale status` |
| **Xem link MagicDNS Tailscale** | `tailscale serve status` |
| **Xem log tự cập nhật** | `tail -f /var/log/chamcong_autoupdate.log` |
