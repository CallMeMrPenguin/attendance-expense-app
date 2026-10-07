#!/bin/bash
# ==============================================================================
# SCRIPT TRIEN KHAI 1-CLICK: CHAM CONG & QUAN LY CHI PHI (TOI UU 24/7 + TAILSCALE)
# Host: 160.30.161.121 | Port: 9000 | Domain: chamcong.upkidscentermanager.io.vn
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}  TRIEN KHAI UNG DUNG CHAM CONG LEN VPS (TOI UU 24/7 & TAILSCALE)${NC}"
echo -e "${BLUE}======================================================================${NC}"

# 1. Kiem tra quyen root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[LOI] Vui long chay script voi quyen root (sudo bash deploy_vps.sh)${NC}"
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# 2. Cài đặt các công cụ hệ điều hành cần thiết
echo -e "${BLUE}[1/8] Kiem tra va cap nhat he dieu hanh Ubuntu...${NC}"
apt-get update -y
apt-get install -y curl git build-essential python3

# 3. Kiem tra va cai dat Node.js 20 LTS neu chua co
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
    echo -e "${YELLOW}[INFO] Dang cai dat Node.js 20 LTS...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo -e "${GREEN}[OK] Node.js version: $(node -v) | npm version: $(npm -v)${NC}"

# 4. Kiem tra va cai dat PM2 de quan ly tien trinh chay ngam 24/7
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}[INFO] Dang cai dat PM2 de quan ly ung dung chay 24/7...${NC}"
    npm install -g pm2
fi
echo -e "${GREEN}[OK] PM2 da san sang.${NC}"

# 5. Cau hinh moi truong .env.local
echo -e "${BLUE}[2/8] Thiet lap bien moi truong (.env.local)...${NC}"
if [ ! -f ".env.local" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
    else
        cat << 'EOF' > .env.local
PORT=9000
GMAIL_USER=
GMAIL_APP_PASSWORD=
GMAIL_ALLOWED_SENDER=VCBDigibank@info.vietcombank.com.vn
EOF
    fi
    echo -e "${GREEN}[OK] Da khoi tao .env.local${NC}"
else
    echo -e "${GREEN}[OK] File .env.local da ton tai.${NC}"
fi

# Bao ve database SQLite khong bi ghi de boi git pull
if [ -f "data/local.db" ]; then
    git update-index --assume-unchanged data/local.db 2>/dev/null || true
fi

# 6. Cai dat thu vien Node
echo -e "${BLUE}[3/8] Dang cai dat dependencies (npm install)...${NC}"
npm install

# 7. Dong goi ung dung toi uu (Build Next.js Production)
echo -e "${BLUE}[4/8] Dang build Next.js Production toi uu hoa...${NC}"
npm run build

# 8. Khoi dong ung dung bang PM2 voi cau hinh toi uu 24/7
echo -e "${BLUE}[5/8] Khoi dong ung dung voi PM2 (Gioi han RAM 600MB, Tu khoi phuc)...${NC}"
pm2 delete chamcong 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

# Kich hoat PM2 khoi dong cung VPS (Boot Persistence)
echo -e "${BLUE}[6/8] Kich hoat che do tu dong khoi dong khi VPS reboot...${NC}"
pm2 startup systemd -u root --hp /root 2>/dev/null || true
systemctl enable pm2-root 2>/dev/null || true
echo -e "${GREEN}[OK] He thong tu khoi dong khi VPS reboot da duoc kich hoat.${NC}"

# 9. Cau hinh Caddy Reverse Proxy cho domain chamcong.upkidscentermanager.io.vn
echo -e "${BLUE}[7/8] Cau hinh Caddy Web Server & SSL Let's Encrypt...${NC}"
mkdir -p /etc/caddy/conf.d

cat << 'EOF' > /etc/caddy/conf.d/chamcong.caddy
chamcong.upkidscentermanager.io.vn {
    reverse_proxy 127.0.0.1:9000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
EOF

if ! grep -q "import /etc/caddy/conf.d/\*.caddy" /etc/caddy/Caddyfile 2>/dev/null; then
    echo "import /etc/caddy/conf.d/*.caddy" >> /etc/caddy/Caddyfile
fi

systemctl enable caddy 2>/dev/null || true
systemctl reload caddy || systemctl restart caddy

# 10. Cai dat va cau hinh Tailscale (Ap dung rieng cho du an Cham Cong)
echo -e "${BLUE}[8/8] Trien khai Tailscale mang rieng cho du an Cham Cong (Port 9000)...${NC}"
chmod +x "$PROJECT_DIR/setup_tailscale.sh"
chmod +x "$PROJECT_DIR/auto_update.sh"

if ! command -v tailscale &> /dev/null; then
    echo -e "${YELLOW}[INFO] Dang cai dat Tailscale...${NC}"
    curl -fsSL https://tailscale.com/install.sh | sh
fi

# Bat tailscaled chay ngam va tu khoi dong khi reboot
systemctl enable tailscaled
systemctl start tailscaled

# Neu chua dang nhap Tailscale, huong dan user
TS_STATUS=$(tailscale status 2>&1 || true)
if echo "$TS_STATUS" | grep -q "Logged out"; then
    echo -e "${YELLOW}[TAILSCALE] Vui long mo link duoi day de lien ket VPS vao mang Tailnet cua ban:${NC}"
    tailscale up --operator=root --accept-routes=false || true
else
    echo -e "${GREEN}[OK] Tailscale da ket noi.${NC}"
fi

# Expose duy nhat port 9000 qua Tailscale Serve
tailscale serve --bg http://127.0.0.1:9000 2>/dev/null || true

# 11. Thiet lap Auto-Update Cronjob (Kiem tra Git moi 2 phut)
CRON_CMD="*/2 * * * * bash $PROJECT_DIR/auto_update.sh >/dev/null 2>&1"
(crontab -l 2>/dev/null | grep -v "auto_update.sh" ; echo "$CRON_CMD") | crontab -

TS_IP=$(tailscale ip -4 2>/dev/null || echo "Chua co")
TS_DNS=$(tailscale status --json 2>/dev/null | grep -o '"DNSName":"[^"]*' | head -n1 | cut -d'"' -f4 | sed 's/\.$//' || echo "")

echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}             TRIEN KHAI & TOI UU HOAN TAT 100%!                      ${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "Ung dung cua ban san sang tai cac kenh truy cap:"
echo -e "1. Tên miền HTTPS công khai: ${YELLOW}https://chamcong.upkidscentermanager.io.vn${NC}"
if [ -n "$TS_DNS" ]; then
    echo -e "2. Mạng riêng Tailscale MagicDNS: ${YELLOW}https://${TS_DNS}${NC}"
fi
echo -e "3. IP Tailscale nội bộ:        ${YELLOW}http://${TS_IP}:9000${NC}"
echo -e ""
echo -e "Cac tinh nang toi uu 24/7 da duoc ap dung:"
echo -e "✔ Gioi han tran RAM (Heap 512MB, Auto Restart 600MB tren PM2)."
echo -e "✔ SQLite WAL + Synchronous NORMAL + Cache 16MB + Memory Temp Store (Chong I/O lag)."
echo -e "✔ Compression & Performance Header da bat trong Next.js."
echo -e "✔ TU DONG KHOI DONG KHI VPS REBOOT: pm2-root.service, tailscaled.service, caddy.service deu duoc enable."
echo -e "✔ TAILSCALE: Chi gan rieng cho port 9000 (khong anh huong toi Center Manager hay Postgres)."
echo -e "✔ AUTO-UPDATE: Tu dong keo code ve build lai trong vong 2 phut sau khi git push."
echo -e "======================================================================"
