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
echo "[1/4] Dang dong bo Git moi nhat..."
git checkout -- . 2>/dev/null || true
git reset --hard origin/main 2>/dev/null || true
git pull origin main

echo "[2/4] Dang cai dat phien ban SQLite on dinh (11.8.1)..."
npm install better-sqlite3@11.8.1 --no-audit --no-fund

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
