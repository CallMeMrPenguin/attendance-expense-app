# HƯỚNG DẪN TRIỂN KHAI CLOUDFLARE 24/7 CHO DỰ ÁN CHẤM CÔNG

> **Dự án**: Chấm Công & Quản Lý Thu Chi (`attendance-expense-app`)  
> **Cổng nội bộ**: `127.0.0.1:9000` (Không chạm đến cổng 8000 của Center Manager)  
> **Đường link Cloudflare**: `https://chamcong.upkidscentermanager.io.vn`  
> **Quản lý tiến trình 24/7**: PM2 ([ecosystem.config.cjs](file:///c:/Users/ACER/Desktop/RANDOM%20PROJECT/CHẤM%20CÔNG/ecosystem.config.cjs)) + Tự khởi động cùng VPS (Systemd Boot Persistence)  
> **Cơ chế bảo mật**: Cloudflare Proxy ẩn IP thật 100% + Hỗ trợ Cloudflare Zero Trust OTP (Tùy chọn)  

---

## ⚡ 1. CÁC TỐI ƯU HIỆU NĂNG 24/7

1. **Khống chế RAM Node.js & Chống Tràn Bộ Nhớ**:
   - Cấu hình Node V8 heap ceiling `--max-old-space-size=512`.
   - PM2 tự động restart nếu vượt ngưỡng `600MB RAM`, bổ sung `kill_timeout: 5000ms` bảo vệ an toàn cho các giao dịch SQLite.
2. **Tối ưu SQLite Tốc Độ Cao 24/7**:
   - `journal_mode = WAL`: Ghi và đọc đồng thời không gây lock database.
   - `synchronous = NORMAL`: Giảm hơn 80% áp lực ghi đĩa so với FULL.
   - `temp_store = MEMORY`: Xử lý bảng tạm và sắp xếp trực tiếp trên RAM.
   - `mmap_size = 256MB`: Tăng tốc độ đọc dữ liệu qua bộ nhớ đệm trang.
   - `busy_timeout = 5000ms` & `cache_size = 16MB`: Khắc phục triệt để lỗi lock khi có nhiều yêu cầu.
3. **Nén dữ liệu HTTP**: Bật `compress: true` trong `next.config.ts`.
4. **Bảo toàn dữ liệu**: Đặt cờ `assume-unchanged` cho database `data/local.db` và tự động backup ra `/var/backups/chamcong/` trước mỗi lần cập nhật.

---

## 🚀 2. QUY TRÌNH TRIỂN KHAI TRÊN VPS (CHỈ 1 LẦN)

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

### ✨ Script `deploy_vps.sh` sẽ tự động:
1. Cài đặt Node.js 20 LTS, PM2 và build Next.js tối ưu.
2. Khởi chạy ứng dụng qua PM2 trên cổng `9000`.
3. Kích hoạt tự khởi động khi VPS reboot (`pm2-root.service` và `caddy.service`).
4. Cấu hình Caddy Reverse Proxy tại `/etc/caddy/conf.d/chamcong.caddy`.
5. Đăng ký cronjob tự động kiểm tra Git (`auto_update.sh`) chạy ngầm mỗi 2 phút.

Sau khi chạy xong, bạn mở trình duyệt trên điện thoại hoặc máy tính là truy cập được ngay:  
👉 **`https://chamcong.upkidscentermanager.io.vn`**

---

## 🔒 3. CÁCH KHÓA BẢO MẬT (CHỈ BẠN MỚI ĐƯỢC VÀO WEB) BẰNG CLOUDFLARE ZERO TRUST

Nếu bạn muốn **chỉ duy nhất bạn mới vào được link này** (không ai khác trên mạng xem được) mà **không cần cài app VPN**:

1. Đăng nhập [dash.cloudflare.com](https://dash.cloudflare.com) -> Vào mục **Zero Trust** (menu bên trái).
2. Chọn **Access** -> **Applications** -> Bấm **Add an application** -> Chọn **Self-hosted**.
3. Điền thông tin:
   - **Application name**: `Chấm Công`
   - **Subdomain**: `chamcong`
   - **Domain**: `upkidscentermanager.io.vn`
4. Ở bước **Add a policy**:
   - **Policy name**: `Chi Cho Phep Admin`
   - **Action**: `Allow`
   - **Rule type**: `Emails` -> Điền email của bạn (ví dụ: `buiduchung2004@gmail.com`).
5. Bấm **Next** -> **Save application**.

**Kết quả**: Bất kỳ ai vào web `https://chamcong.upkidscentermanager.io.vn` sẽ gặp màn hình yêu cầu nhập mã OTP gửi về Gmail. Chỉ có bạn nhận được mã nên chỉ có bạn mới vào được!

---

## 🔄 4. CƠ CHẾ TỰ ĐỘNG CẬP NHẬT KHI CÓ THAY ĐỔI Ở GIT

Khi bạn chỉnh sửa code ở máy tính và push lên GitHub:
```bash
git add . ; git commit -m "feat: cap nhat" ; git push origin main
```
Trong vòng tối đa 2 phút, VPS sẽ **tự động sao lưu database, kéo code mới, build lại và reload ứng dụng** mà không làm gián đoạn người dùng.

---

## 🛠️ 5. CÁC LỆNH QUẢN TRỊ TRÊN VPS

| Nhu cầu | Lệnh |
|---|---|
| **Xem trạng thái app** | `pm2 status` |
| **Xem log app trực tiếp** | `pm2 logs chamcong` |
| **Khởi động lại app thủ công** | `pm2 restart chamcong` |
| **Xem log tự cập nhật** | `tail -f /var/log/chamcong_autoupdate.log` |
| **Xem log Caddy** | `journalctl -u caddy -e -n 50` |
