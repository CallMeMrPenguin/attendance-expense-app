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
pm2 restart chamcong || pm2 reload chamcong || pm2 start ecosystem.config.cjs
pm2 save --force

echo "=========================================================="
echo ">>> DA SUA LOI VA KHOI DONG LAI THANH CONG! <<<"
echo "Hay F5 lai trinh duyet de xem toan bo du lieu."
echo "=========================================================="
