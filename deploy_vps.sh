#!/bin/bash
# ==============================================================================
# SCRIPT TRIEN KHAI 1-CLICK: CHAM CONG & QUAN LY CHI PHI (PORT 9000)
# Port: 127.0.0.1:9000 | Toi uu 24/7 + Tu khoi dong khi reboot + Tu cap nhat Git
# KHONG DONG VAO BAT KY TEN MIEN HOAC APP KHAC TREN VPS
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}   TRIEN KHAI UNG DUNG CHAM CONG LEN VPS (NOI BO 127.0.0.1:9000)${NC}"
echo -e "${BLUE}======================================================================${NC}"

# 1. Kiem tra quyen root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[LOI] Vui long chay script voi quyen root (sudo bash deploy_vps.sh)${NC}"
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# 2. Xoa bo bat ky file caddy trung lap nao neu tung tao nham
rm -f /etc/caddy/conf.d/chamcong.caddy 2>/dev/null || true

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

# Cai dat cloudflared neu chua co
if ! command -v cloudflared &> /dev/null; then
    echo -e "${YELLOW}[INFO] Dang cai dat cloudflared...${NC}"
    mkdir -p --mode=0755 /usr/share/keyrings
    curl -fsSL https://pkg.cloudflare.com/cloudflare-public-v2.gpg | tee /usr/share/keyrings/cloudflare-public-v2.gpg >/dev/null
    echo 'deb [signed-by=/usr/share/keyrings/cloudflare-public-v2.gpg] https://pkg.cloudflare.com/cloudflared any main' | tee /etc/apt/sources.list.d/cloudflared.list
    apt-get update -y && apt-get install -y cloudflared
fi
echo -e "${GREEN}[OK] Cloudflared: $(cloudflared --version 2>/dev/null || echo 'san sang')${NC}"

# 5. Cai dat PM2 quan ly tien trinh chay ngam 24/7
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}[INFO] Dang cai dat PM2 de quan ly ung dung 24/7...${NC}"
    npm install -g pm2
fi
echo -e "${GREEN}[OK] PM2 da san sang.${NC}"

# 6. Cau hinh bien moi truong (.env.local)
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
    echo -e "${GREEN}[OK] Da tao file .env.local${NC}"
fi

# Bao ve database SQLite khong bi ghi de boi git pull
if [ -f "data/local.db" ]; then
    git update-index --assume-unchanged data/local.db 2>/dev/null || true
fi

# 7. Cai dat dependencies & build production Next.js
echo -e "${BLUE}[3/6] Cai dat dependencies (npm install)...${NC}"
npm install

echo -e "${BLUE}[4/6] Dong goi ban build toi uu (npm run build)...${NC}"
npm run build

# 8. Khoi dong ung dung bang PM2 tren cong noi bo 9000 (Toi uu 24/7, tran RAM 600MB)
echo -e "${BLUE}[5/6] Khoi dong Next.js tren 127.0.0.1:9000 (PM2)...${NC}"
pm2 delete chamcong 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

# 9. Kich hoat tu dong khoi dong khi reboot VPS (Boot Persistence)
echo -e "${BLUE}[6/6] Kich hoat tu dong khoi dong khi VPS reboot (systemd)...${NC}"
pm2 startup systemd -u root --hp /root 2>/dev/null || true
systemctl enable pm2-root 2>/dev/null || true
echo -e "${GREEN}[OK] pm2-root.service da duoc bat thanh cong.${NC}"

# 10. Thiet lap Git Auto-Update Daemon (Systemd Watcher Service moi 45s)
chmod +x "$PROJECT_DIR/auto_update.sh"

cat << EOF > /etc/systemd/system/chamcong-watcher.service
[Unit]
Description=Cham Cong Git Auto-Update Watcher Daemon
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR
ExecStart=/bin/bash $PROJECT_DIR/auto_update.sh --loop
Restart=always
RestartSec=10
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now chamcong-watcher.service 2>/dev/null || true

# Dự phòng thêm cronjob
CRON_CMD="*/2 * * * * bash $PROJECT_DIR/auto_update.sh >/dev/null 2>&1"
(crontab -l 2>/dev/null | grep -v "auto_update.sh" ; echo "$CRON_CMD") | crontab -

echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}             TRIEN KHAI & TOI UU HOAN TAT 100%!                      ${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "Ung dung dang chay noi bo an toan tai:"
echo -e "👉  ${YELLOW}http://127.0.0.1:9000${NC}"
echo -e ""
echo -e "Dac diem van hanh:"
echo -e "✔ HOAN TOAN KHONG DONG DEN BAT KY TEN MIEN HOAC WEB NAO KHAC TREN VPS."
echo -e "✔ Port 9000 chay doc lap (khong dung cham Center Manager port 8000 hay Postgres)."
echo -e "✔ Toi uu RAM 24/7 (Node ceiling 512MB, PM2 auto-restart 600MB, SQLite WAL)."
echo -e "✔ Tu dong khoi dong lai khi VPS reboot (pm2-root.service da duoc enable)."
echo -e "✔ Git Auto-Update Watcher (chamcong-watcher.service) kiem tra code moi 45s/lan."
echo -e "  Moi khi ban 'git push origin main' o may tinh, VPS se tu dong keo code ve build lai!"
echo -e "======================================================================"
