#!/bin/bash
# ==============================================================================
# SCRIPT TRIEN KHAI 1-CLICK UNG DUNG CHAM CONG & QUAN LY CHI PHI LEN VPS
# Host: 160.30.161.121 | Domain: chamcong.upkidscentermanager.io.vn
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}     TRIEN KHAI UNG DUNG CHAM CONG & QUAN LY CHI PHI LEN VPS${NC}"
echo -e "${BLUE}======================================================================${NC}"

# 1. Kiem tra quyen root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[LOI] Vui long chay script voi quyen root (sudo bash deploy_vps.sh)${NC}"
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}[1/7] Kiem tra va cai dat cac cong cu can thiet tren Ubuntu...${NC}"
apt-get update -y
apt-get install -y curl git build-essential python3

# 2. Kiem tra va cai dat Node.js (v20 LTS) neu chua co
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
    echo -e "${YELLOW}[INFO] Node.js chua co hoac phien ban cu. Dang cai dat Node.js 20 LTS...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo -e "${GREEN}[OK] Node.js version: $(node -v) | npm version: $(npm -v)${NC}"

# 3. Kiem tra va cai dat PM2 (Process Manager)
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}[INFO] Dang cai dat PM2 de quan ly ung dung chay ngam...${NC}"
    npm install -g pm2
fi
echo -e "${GREEN}[OK] PM2 da san sang.${NC}"

# 4. Cau hinh moi truong .env.local
echo -e "${BLUE}[2/7] Cau hinh bien moi truong (.env.local)...${NC}"
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

# Bao ve database SQLite khong bi ghi de boi git
if [ -f "data/local.db" ]; then
    git update-index --assume-unchanged data/local.db 2>/dev/null || true
fi

# 5. Cai dat thu vien Node
echo -e "${BLUE}[3/7] Dang cai dat thu vien ung dung (npm install)...${NC}"
npm install

# 6. Build Next.js Production
echo -e "${BLUE}[4/7] Dang tao ban build toi uu (npm run build)...${NC}"
npm run build

# 7. Khoi dong ung dung bang PM2 tren cong 9000
echo -e "${BLUE}[5/7] Khoi dong ung dung Next.js voi PM2...${NC}"
pm2 delete chamcong 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# 8. Cau hinh Caddy Reverse Proxy cho subdomain chamcong.upkidscentermanager.io.vn
echo -e "${BLUE}[6/7] Cau hinh Caddy Web Server & SSL...${NC}"
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

# Dam bao Caddyfile goc co import cac file trong conf.d
if ! grep -q "import /etc/caddy/conf.d/\*.caddy" /etc/caddy/Caddyfile 2>/dev/null; then
    echo "import /etc/caddy/conf.d/*.caddy" >> /etc/caddy/Caddyfile
fi

systemctl reload caddy || systemctl restart caddy

# 9. Thiet lap Auto-Update Cronjob (Kiem tra Git moi 2 phut)
echo -e "${BLUE}[7/7] Thiet lap co che tu dong cap nhat khi co thay doi tren Git...${NC}"
chmod +x "$PROJECT_DIR/auto_update.sh"

CRON_CMD="*/2 * * * * bash $PROJECT_DIR/auto_update.sh >/dev/null 2>&1"
(crontab -l 2>/dev/null | grep -v "auto_update.sh" ; echo "$CRON_CMD") | crontab -

echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}             TRIEN KHAI & CAU HINH HOAN TAT 100%!                    ${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "Ung dung cua ban da hoat dong tai:"
echo -e "👉  ${YELLOW}https://chamcong.upkidscentermanager.io.vn${NC}"
echo -e ""
echo -e "Thong tin hoat dong:"
echo -e "- Port noi bo: 127.0.0.1:9000 (Next.js Managed by PM2)"
echo -e "- SSL HTTPS: Tu dong cap boi Caddy (Let's Encrypt)"
echo -e "- Tu dong cap nhat: Cronjob da duoc kich hoat (chu ky 2 phut/lan)."
echo -e "  Moi khi ban chay 'git push origin main' o may tinh,"
echo -e "  VPS se tu dong keo code ve, build lai va cap nhat trong vong 2 phut!"
echo -e "======================================================================"
