# HƯỚNG DẪN TRIỂN KHAI 24/7 DỰ ÁN CHẤM CÔNG (CỔNG 9000)

> **Dự án**: Chấm Công & Quản Lý Thu Chi (`attendance-expense-app`)  
> **Cổng nội bộ**: `127.0.0.1:9000` (Độc lập 100%, không chạm vào bất kỳ app hay tên miền nào khác trên VPS)  
> **Quản lý tiến trình 24/7**: PM2 ([ecosystem.config.cjs](file:///c:/Users/ACER/Desktop/RANDOM%20PROJECT/CHẤM%20CÔNG/ecosystem.config.cjs)) + Tự khởi động cùng VPS (Systemd Boot Persistence)  
> **Cơ chế cập nhật**: Tự động phát hiện thay đổi trên GitHub mỗi 2 phút (`auto_update.sh`)  

---

## ❓ GIẢI ĐÁP: CLOUDFLARE ZERO TRUST FREE TIER CÓ BỊ TÍNH PHÍ OVERLIMIT KHÔNG?

**Trả lời ngắn gọn: KHÔNG BAO GIỜ.**

1. **Không yêu cầu thẻ tín dụng**: Gói Free của Cloudflare Zero Trust không bắt buộc nhập thông tin thanh toán.
2. **Cơ chế Hard-Cap (Chặn chứ không trừ tiền)**:
   - Giới hạn gói Free là **50 người dùng (seats)**.
   - Nếu có người thứ 51 truy cập, hệ thống sẽ **hiển thị thông báo từ chối truy cập (Access Denied)** chứ **TUYỆT ĐỐI KHÔNG TỰ ĐỘNG NÂNG CẤP HAY THU PHÍ PHÁT SINH**.
   - Bạn chỉ dùng cho cá nhân (1 người), tức là chỉ sử dụng **1/50 seat** (2% hạn mức).
3. **Băng thông & Lưu lượng web**: **Không giới hạn** và hoàn toàn miễn phí trọn đời cho lưu lượng duyệt web thông thường.
4. **Bạn hoàn toàn có thể không dùng Zero Trust**: Nếu không muốn dùng, bạn có thể tự trỏ tên miền riêng hoặc dùng Cloudflare Tunnel thông thường (xem mục 4).

---

## ⚡ 1. CÁC TỐI ƯU HIỆU NĂNG 24/7 ĐÃ CẤU HÌNH

1. **Khống chế RAM Node.js & Chống Tràn Bộ Nhớ**:
   - Node V8 heap ceiling: `--max-old-space-size=512`.
   - PM2 tự động khởi động lại nếu vượt ngưỡng `600MB RAM`, bổ sung `kill_timeout: 5000ms` bảo vệ an toàn cho các giao dịch SQLite.
2. **Tối ưu SQLite Tốc Độ Cao 24/7**:
   - `journal_mode = WAL`: Ghi và đọc đồng thời không gây lock database.
   - `synchronous = NORMAL`: Giảm hơn 80% áp lực ghi đĩa so với FULL.
   - `temp_store = MEMORY`: Xử lý bảng tạm và sắp xếp trực tiếp trên RAM.
   - `mmap_size = 256MB`: Tăng tốc độ đọc dữ liệu qua bộ nhớ đệm trang.
   - `busy_timeout = 5000ms` & `cache_size = 16MB`: Khắc phục triệt để lỗi lock khi có nhiều yêu cầu.
3. **Bảo toàn dữ liệu**: Đặt cờ `assume-unchanged` cho database `data/local.db` và tự động backup ra `/var/backups/chamcong/` trước mỗi lần cập nhật.

---

## 🚀 2. QUY TRÌNH TRIỂN KHAI TRÊN VPS (CHỈ 1 LẦN)

Trên màn hình **Console** hoặc terminal của VPS:

```bash
# 1. Đi vào thư mục chứa code
cd /var/www

# 2. Tải mã nguồn từ GitHub
git clone https://github.com/CallMeMrPenguin/attendance-expense-app.git

# 3. Đi vào thư mục và chạy script tự động
cd attendance-expense-app
bash deploy_vps.sh
```

### ✨ Script `deploy_vps.sh` sẽ tự động:
1. Cài đặt Node.js 20 LTS, PM2 và build Next.js tối ưu.
2. Khởi chạy ứng dụng qua PM2 trên cổng nội bộ `127.0.0.1:9000`.
3. Kích hoạt tự khởi động khi VPS reboot (`pm2-root.service`).
4. Đăng ký cronjob tự động kiểm tra Git (`auto_update.sh`) chạy ngầm mỗi 2 phút.
5. **Không can thiệp vào bất kỳ tên miền hay web nào khác trên VPS.**

---

## 🔄 3. CƠ CHẾ TỰ ĐỘNG CẬP NHẬT KHI CÓ THAY ĐỔI Ở GIT

Khi bạn chỉnh sửa code ở máy tính và push lên GitHub:
```bash
git add . ; git commit -m "feat: cap nhat" ; git push origin main
```
Trong vòng tối đa 2 phút, VPS sẽ **tự động sao lưu database, kéo code mới, build lại và reload ứng dụng** mà không làm gián đoạn hệ thống.

---

## 🌐 4. CÁCH TỰ KẾT NỐI CLOUDFLARE LINK QUA VPS (TÙY Ý BẠN)

Sau khi app đã chạy tại `127.0.0.1:9000`, bạn có thể tự thêm kết nối Cloudflare theo cách bạn muốn:

### Cách A: Cloudflare Quick Tunnel (Không cần tên miền, miễn phí 100%)
Cài đặt `cloudflared` trên VPS và chạy lệnh:
```bash
cloudflared tunnel --url http://127.0.0.1:9000
```
Cloudflare sẽ cung cấp ngay cho bạn một link HTTPS miễn phí dạng `https://<ten-ngau-nhien>.trycloudflare.com` để bạn truy cập từ điện thoại/máy tính bất kỳ lúc nào.

### Cách B: Gán vào tên miền riêng của bạn
Nếu bạn có một tên miền riêng (ví dụ `chamcong.tenmienrieng.com`):
- Trỏ bản ghi DNS của tên miền đó về IP của VPS (bật proxy đám mây cam Cloudflare).
- Thêm cấu hình Reverse Proxy tới `127.0.0.1:9000` trên Caddy hoặc Nginx.

---

## 🛠️ 5. CÁC LỆNH QUẢN TRỊ TRÊN VPS

| Nhu cầu | Lệnh |
|---|---|
| **Xem trạng thái app** | `pm2 status` |
| **Xem log app trực tiếp** | `pm2 logs chamcong` |
| **Khởi động lại app thủ công** | `pm2 restart chamcong` |
| **Xem log tự cập nhật Git** | `tail -f /var/log/chamcong_autoupdate.log` |
| **Kiểm tra cổng 9000 đang chạy** | `curl -I http://127.0.0.1:9000` |
