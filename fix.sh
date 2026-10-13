#!/bin/bash
# ==============================================================================
# SCRIPT 1-CLICK SUA LOI VA CAP NHAT DATABASE CHO VPS
# Chay bang lenh: bash fix.sh
# ==============================================================================

PROJECT_DIR="/var/www/attendance-expense-app"
if [ ! -d "$PROJECT_DIR" ]; then
    PROJECT_DIR="/root/attendance-expense-app"
fi
if [ ! -d "$PROJECT_DIR" ]; then
    PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

cd "$PROJECT_DIR" || exit 1
echo "[0/4] Tam dung PM2 de giai phong file lock SQLite..."
pm2 stop chamcong 2>/dev/null || true

echo "[1/4] Dang dong bo Git moi nhat..."
if [ -f "data/local.db" ]; then
    mkdir -p /var/backups/chamcong
    cp "data/local.db" "/var/backups/chamcong/local_$(date '+%Y%m%d_%H%M%S').db" 2>/dev/null
    cp "data/local.db" "/tmp/chamcong_local_db_preservation.db" 2>/dev/null
fi
git update-index --no-assume-unchanged data/local.db 2>/dev/null || true
git checkout -- . 2>/dev/null || true
git reset --hard origin/main 2>/dev/null || true
git pull origin main

if [ -f "/tmp/chamcong_local_db_preservation.db" ]; then
    echo "[1.5/4] Bao ve toan ven du lieu VPS (giu nguyen database live)..."
    cp "/tmp/chamcong_local_db_preservation.db" "data/local.db"
    rm -f "/tmp/chamcong_local_db_preservation.db"
fi

echo "[2/4] Dang cai dat phien ban SQLite on dinh (11.8.1)..."
npm install better-sqlite3@11.8.1 --no-audit --no-fund

echo "[2.5/4] Kiem tra toan ven va nap du lieu mau (data/seed_data.json)..."
node data/seed_runner.cjs || true

echo "[3/4] Dang build Next.js..."
npm run build

echo "[4/4] Dang khoi dong lai PM2..."
pm2 delete chamcong 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save --force

echo "[5/5] Kich hoat Git Watcher tu dong cap nhat 24/7 (chamcong-watcher)..."
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
StandardOutput=append:/var/log/chamcong_autoupdate.log
StandardError=append:/var/log/chamcong_autoupdate.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload 2>/dev/null || true
systemctl enable chamcong-watcher 2>/dev/null || true
systemctl restart chamcong-watcher 2>/dev/null || true

echo "=========================================================="
echo ">>> DA SUA LOI VA KHOI DONG LAI THANH CONG! <<<"
echo "Git Auto-Watcher da bat: tu dong cap nhat \u0026 tu refresh trinh duyet."
echo "=========================================================="
