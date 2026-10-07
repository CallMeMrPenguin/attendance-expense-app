#!/bin/bash
# ==============================================================================
# SCRIPT TRIEN KHAI 1-CLICK: CHAM CONG & QUAN LY CHI PHI (CLOUDFLARE + CADDY)
# Host: 160.30.161.121 | Port: 9000 | Domain: chamcong.upkidscentermanager.io.vn
# Toi uu 24/7 + Tu dong khoi dong khi reboot + Tu dong cap nhat Git
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}   TRIEN KHAI UNG DUNG CHAM CONG LEN VPS (CLOUDFLARE + CADDY 24/7)${NC}"
echo -e "${BLUE}======================================================================${NC}"

# 1. Kiem tra quyen root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[LOI] Vui long chay script voi quyen root (sudo bash deploy_vps.sh)${NC}"
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# 2. Cai dat cac cong cu can thiet
echo -e "${BLUE}[1/7] Kiem tra he dieu hanh va cai dat cong cu...${NC}"
apt-get update -y
apt-get install -y curl git build-essential python3

# 3. Cai dat Node.js 20 LTS neu chua co
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
    echo -e "${YELLOW}[INFO] Dang cai dat Node.js 20 LTS...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo -e "${GREEN}[OK] Node.js: $(node -v) | npm: $(npm -v)${NC}"

# 4. Cai dat PM2 quan ly tien trinh chay ngam 24/7
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}[INFO] Dang cai dat PM2 de quan ly ung dung 24/7...${NC}"
    npm install -g pm2
fi
echo -e "${GREEN}[OK] PM2 da san sang.${NC}"

# 5. Cau hinh bien moi truong (.env.local)
echo -e "${BLUE}[2/7] Thiet lap bien moi truong (.env.local)...${NC}"
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
    echo -e "${GREEN}[OK] Da tao file .env.local${NC}"
fi

# Bao ve database SQLite khong bi ghi de boi git pull
if [ -f "data/local.db" ]; then
    git update-index --assume-unchanged data/local.db 2>/dev/null || true
fi

# 6. Cai dat dependencies & build production Next.js
echo -e "${BLUE}[3/7] Cai dat dependencies (npm install)...${NC}"
npm install

echo -e "${BLUE}[4/7] Dong goi ban build toi uu (npm run build)...${NC}"
npm run build

# 7. Khoi dong ung dung bang PM2 (Toi uu 24/7, tran RAM 600MB)
echo -e "${BLUE}[5/7] Khoi dong Next.js bang PM2 tren cong 9000...${NC}"
pm2 delete chamcong 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

# 8. Kich hoat tu dong khoi dong khi reboot VPS (Boot Persistence)
echo -e "${BLUE}[6/7] Kich hoat tu dong khoi dong khi VPS reboot (systemd)...${NC}"
pm2 startup systemd -u root --hp /root 2>/dev/null || true
systemctl enable pm2-root 2>/dev/null || true
echo -e "${GREEN}[OK] pm2-root.service da duoc bat thanh cong.${NC}"

# 9. Cau hinh Caddy Reverse Proxy & SSL Cloudflare
echo -e "${BLUE}[7/7] Cau hinh Caddy Web Server cho chamcong.upkidscentermanager.io.vn...${NC}"
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

# Dam bao Caddyfile goc co nap thu muc conf.d
if ! grep -q "import /etc/caddy/conf.d/\*.caddy" /etc/caddy/Caddyfile 2>/dev/null; then
    echo "import /etc/caddy/conf.d/*.caddy" >> /etc/caddy/Caddyfile
fi

systemctl enable caddy 2>/dev/null || true
systemctl reload caddy || systemctl restart caddy

# 10. Thiet lap Auto-Update Cronjob (Kiem tra Git moi 2 phut)
chmod +x "$PROJECT_DIR/auto_update.sh"
CRON_CMD="*/2 * * * * bash $PROJECT_DIR/auto_update.sh >/dev/null 2>&1"
(crontab -l 2>/dev/null | grep -v "auto_update.sh" ; echo "$CRON_CMD") | crontab -

echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}             TRIEN KHAI & CAU HINH HOAN TAT 100%!                    ${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "Ung dung cua ban da hoat dong tai:"
echo -e "👉  ${YELLOW}https://chamcong.upkidscentermanager.io.vn${NC}"
echo -e ""
echo -e "Dac diem he thong:"
echo -e "✔ Khong can cai dat app VPN, mo trinh duyet bat ky may nao la vao duoc ngay."
echo -e "✔ Cloudflare giu an toan IP VPS, chong DDoS va ma hoa SSL mien phi 100%."
echo -e "✔ Port noi bo 9000 khong dong cham den Center Manager (port 8000) hay Postgres."
echo -e "✔ Toi uu RAM 24/7 (Node ceiling 512MB, PM2 auto-restart 600MB, SQLite WAL)."
echo -e "✔ Tu dong chay lai khi VPS reboot (pm2-root & caddy systemd services)."
echo -e "✔ Tu dong keo code ve build lai trong vong 2 phut sau khi 'git push'."
echo -e "======================================================================"
