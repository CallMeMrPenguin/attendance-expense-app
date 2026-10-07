# THÔNG TIN & HƯỚNG DẪN TÁI SỬ DỤNG VPS CHO MỌI DỰ ÁN

Tài liệu này lưu trữ toàn bộ thông tin máy chủ VPS và các mẫu triển khai để bất kỳ dự án nào khác (như Chấm Công, Class Mixer, Wordwall Flashcard Maker,...) đều có thể dễ dàng tái sử dụng cùng một VPS mà không bị xung đột.

---

## 1. Thông Tin Kết Nối VPS

| Mục | Thông tin chi tiết |
|---|---|
| **Địa chỉ IP** | `160.30.161.121` |
| **Cổng SSH** | `22` |
| **Người dùng** | `root` |
| **Mật khẩu root** | `ga+$IL|3` |
| **Khóa SSH công khai (Client)** | `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICqfonfEzne6QWYenI25Ev6s3baneW0J8+PX83rM/V0Y mgw.ps99@gmail.com` |
| **Hệ điều hành** | Ubuntu 22.04 LTS / 24.04 LTS |
| **Bộ nhớ ảo (Swap RAM)** | 2GB Swap (`/swapfile`) đã kích hoạt |
| **Firewall (UFW)** | Cho phép cổng `22/tcp`, `80/tcp`, `443/tcp` |

### Lệnh SSH nhanh:
```bash
ssh root@160.30.161.121
```

---

## 2. Thông Tin Tên Miền & DNS

- **Tên miền chính**: `upkidscentermanager.io.vn` (hỗ trợ trỏ subdomain không giới hạn `*.upkidscentermanager.io.vn`)
- **Quản lý DNS**: Cloudflare (`https://dash.cloudflare.com`)
  - Cloudflare Nameservers: `amit.ns.cloudflare.com` / `karina.ns.cloudflare.com`
- **Nhà đăng ký tên miền**: ZHost (Mật khẩu gốc: `Px3!Y7AdO3NZ151`)

---

## 3. Web Server (Caddy Server - Tự Động Cấp SSL HTTPS)

Máy chủ đang dùng **Caddy Server** với cấu hình phân nhánh mô-đun:
- File cấu hình gốc: `/etc/caddy/Caddyfile` đã kích hoạt dòng:
  ```caddy
  import /etc/caddy/conf.d/*.caddy
  ```
- Mỗi dự án mới chỉ cần thêm 1 file `.caddy` vào thư mục `/etc/caddy/conf.d/` mà **không cần sửa Caddyfile gốc**.

### Mẫu cấu hình Caddy cho dự án mới:
Tạo file `/etc/caddy/conf.d/<ten_du_an>.caddy`:
```caddy
ten_du_an.upkidscentermanager.io.vn {
    # Nếu có Backend API:
    handle /api/* {
        reverse_proxy localhost:<cong_backend_vd_8001>
    }

    # Phục vụ Frontend:
    handle {
        root * /var/www/<ten_du_an>/dist
        try_files {path} /index.html
        file_server
    }
}
```
Sau đó nạp lại Caddy bằng lệnh:
```bash
systemctl reload caddy
```
Caddy sẽ **tự động cấp chứng chỉ SSL HTTPS miễn phí** qua Let's Encrypt ngay lập tức!

---

## 4. Cơ Sở Dữ Liệu PostgreSQL 16 (Docker)

PostgreSQL 16 đang chạy trong container Docker:
- **Tên container**: `center_manager_db`
- **Địa chỉ kết nối nội bộ**: `127.0.0.1:5432`
- **User quản trị**: `center_user`
- **Mật khẩu**: `Center_Db_2026_SecureP@ss` (hoặc `center_secure_pass_2026`)

### Tạo Database mới cho dự án khác:
```bash
docker exec -i center_manager_db psql -U center_user -d postgres -c "CREATE DATABASE <ten_db_moi>;"
```

---

## 5. Quy Trình 3 Bước Triển Khai Dự Án Mới Lên VPS

1. **Bước 1**: Đưa code lên VPS (thư mục `/var/www/<ten_du_an>/`) và build frontend:
   ```bash
   mkdir -p /var/www/<ten_du_an>
   # copy hoặc git clone code vào đây và build dist
   ```

2. **Bước 2**: Tạo file cấu hình Caddy `/etc/caddy/conf.d/<ten_du_an>.caddy` như mẫu ở Mục 3.

3. **Bước 3**: Reload Caddy:
   ```bash
   systemctl reload caddy
   ```

Đã có thể truy cập ngay website qua HTTPS!
