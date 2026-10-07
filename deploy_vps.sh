#!/bin/bash
# ==============================================================================
# SCRIPT TRIEN KHAI 1-CLICK: CHAM CONG & QUAN LY CHI PHI (NOI BO TAILSCALE 100%)
# Port: 127.0.0.1:9000 | KHONG PUBLIC RA INTERNET | CHI TRUY CAP QUA TAILSCALE
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}  TRIEN KHAI UNG DUNG CHAM CONG NOI BO (TAILSCALE PRIVATE ONLY)${NC}"
echo -e "${BLUE}======================================================================${NC}"

# 1. Kiem tra quyen root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[LOI] Vui long chay script voi quyen root (sudo bash deploy_vps.sh)${NC}"
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# 2. Xoa bo bat ky cau hinh public domain nao neu tung ton tai (Dam bao tuyet doi khong public)
if [ -f "/etc/caddy/conf.d/chamcong.caddy" ]; then
    echo -e "${YELLOW}[AN NINH] Xoa bo cau hinh public Caddy...${NC}"
    rm -f /etc/caddy/conf.d/chamcong.caddy
    systemctl reload caddy 2>/dev/null || true
fi

# 3. Cai dat cac cong cu can thiet
echo -e "${BLUE}[1/6] Kiem tra he dieu hanh va cai dat cong cu...${NC}"
apt-get update -y
apt-get install -y curl git build-essential python3

# 4. Cai dat Node.js 20 LTS neu chua co
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
    echo -e "${YELLOW}[INFO] Dang cai dat Node.js 20 LTS...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo -e "${GREEN}[OK] Node.js: $(node -v) | npm: $(npm -v)${NC}"

# 5. Cai dat PM2 quan ly tien trinh chay ngam 24/7
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}[INFO] Dang cai dat PM2...${NC}"
    npm install -g pm2
fi
echo -e "${GREEN}[OK] PM2 da san sang.${NC}"

# 6. Cau hinh moi truong .env.local (Chi lang nghe localhost 127.0.0.1)
echo -e "${BLUE}[2/6] Thiet lap bien moi truong noi bo (.env.local)...${NC}"
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
fi

# Bao ve database SQLite khong bi ghi de boi git pull
if [ -f "data/local.db" ]; then
    git update-index --assume-unchanged data/local.db 2>/dev/null || true
fi

# 7. Cai dat dependencies & build production Next.js
echo -e "${BLUE}[3/6] Cai dat thu vien va build Next.js Production...${NC}"
npm install
npm run build

# 8. Khoi dong Next.js noi bo tren 127.0.0.1:9000 (Toi uu 24/7, tran RAM 600MB)
echo -e "${BLUE}[4/6] Khoi dong ung dung bang PM2 (Chay ngam 24/7, Memory cap 600MB)...${NC}"
pm2 delete chamcong 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

# Kich hoat che do tu khoi dong khi reboot VPS (Boot Persistence)
echo -e "${BLUE}[5/6] Kich hoat tu khoi dong khi VPS reboot (systemd)...${NC}"
pm2 startup systemd -u root --hp /root 2>/dev/null || true
systemctl enable pm2-root 2>/dev/null || true
echo -e "${GREEN}[OK] pm2-root da duoc enable tu khoi dong khi VPS bat.${NC}"

# 9. Cai dat & cau hinh Tailscale (Duy nhat port 9000)
echo -e "${BLUE}[6/6] Thiet lap Tailscale danh rieng cho cong 9000...${NC}"
chmod +x "$PROJECT_DIR/auto_update.sh"
chmod +x "$PROJECT_DIR/setup_tailscale.sh" 2>/dev/null || true

if ! command -v tailscale &> /dev/null; then
    echo -e "${YELLOW}[INFO] Dang cai dat Tailscale...${NC}"
    curl -fsSL https://tailscale.com/install.sh | sh
fi

systemctl enable tailscaled
systemctl start tailscaled

TS_STATUS=$(tailscale status 2>&1 || true)
if echo "$TS_STATUS" | grep -q "Logged out"; then
    echo -e "${YELLOW}[TAILSCALE] Vui long dang nhap Tailscale bang lenh: tailscale up${NC}"
else
    echo -e "${GREEN}[OK] Tailscale da ket noi.${NC}"
fi

# Expose duy nhat port 9000 qua mang rieng Tailscale Serve
tailscale serve --bg http://127.0.0.1:9000 2>/dev/null || true

# 10. Thiet lap Auto-Update Cronjob (Kiem tra Git moi 2 phut)
CRON_CMD="*/2 * * * * bash $PROJECT_DIR/auto_update.sh >/dev/null 2>&1"
(crontab -l 2>/dev/null | grep -v "auto_update.sh" ; echo "$CRON_CMD") | crontab -

TS_IP=$(tailscale ip -4 2>/dev/null || echo "100.x.x.x")
TS_DNS=$(tailscale status --json 2>/dev/null | grep -o '"DNSName":"[^"]*' | head -n1 | cut -d'"' -f4 | sed 's/\.$//' || echo "")

echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}        TRIEN KHAI NOI BO TAILSCALE HOAN TAT (100% PRIVATE)          ${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "Ung dung HOAN TOAN KHONG PUBLIC RA NGOAI INTERNET."
echo -e "Chi co the truy cap an toan qua mang Tailscale cua ban:"
if [ -n "$TS_DNS" ]; then
    echo -e "👉 MagicDNS URL:       ${YELLOW}https://${TS_DNS}${NC}"
fi
echo -e "👉 Tailscale Private IP: ${YELLOW}http://${TS_IP}:9000${NC}"
echo -e ""
echo -e "Dac diem van hanh:"
echo -e "✔ KHONG co Caddy public domain, KHONG mo port 9000 ra Internet."
echo -e "✔ Chi thiet bi trong Tailnet cua ban moi co quyen ket noi."
echo -e "✔ Tu khoi dong khi VPS reboot (tailscaled & pm2-root da duoc enable)."
echo -e "✔ Tu dong keo code va cap nhat khi co commit moi tren Git."
echo -e "======================================================================"
