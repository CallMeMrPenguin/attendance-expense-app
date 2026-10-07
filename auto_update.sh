#!/bin/bash
# ==============================================================================
# SCRIPT TU DONG KIEM TRA GIT VA CAP NHAT TRIEN KHAI UNG DUNG CHAM CONG
# ==============================================================================

# Xac dinh thu muc chua du an
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR" || exit 1

LOG_FILE="/var/log/chamcong_autoupdate.log"
LOCK_FILE="/tmp/chamcong_update.lock"

# Tranh truong hop chay trung lap nhieu tien trinh update cung luc
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE" 2>/dev/null)
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
        exit 0
    fi
fi
echo $$ > "$LOCK_FILE"

log_msg() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Kiem tra ket noi mang va fetch git moi nhat
git fetch origin main --quiet 2>/dev/null
if [ $? -ne 0 ]; then
    rm -f "$LOCK_FILE"
    exit 0
fi

LOCAL_HASH=$(git rev-parse HEAD 2>/dev/null)
REMOTE_HASH=$(git rev-parse origin/main 2>/dev/null)

if [ "$LOCAL_HASH" != "$REMOTE_HASH" ] && [ -n "$REMOTE_HASH" ]; then
    log_msg "======================================================="
    log_msg "PHAT HIEN CODE MOI TREN GITHUB!"
    log_msg "Local:  $LOCAL_HASH"
    log_msg "Remote: $REMOTE_HASH"
    log_msg "Dang tien hanh cap nhat..."

    # 1. Bao ve du lieu database SQLite local.db (Khong de git ghi de hoac conflict)
    if [ -f "data/local.db" ]; then
        mkdir -p /var/backups/chamcong
        cp "data/local.db" "/var/backups/chamcong/local_$(date '+%Y%m%d_%H%M%S').db" 2>/dev/null
        git update-index --assume-unchanged data/local.db 2>/dev/null || true
    fi

    # 2. Keo code moi nhat
    git reset --hard HEAD --quiet
    git pull origin main --quiet

    if [ $? -ne 0 ]; then
        log_msg "LOI: Khong the git pull code moi."
        rm -f "$LOCK_FILE"
        exit 1
    fi

    # 3. Cai dat thu vien moi (neu co)
    log_msg "Dang cai dat dependencies (npm install)..."
    npm install --no-audit --no-fund >> "$LOG_FILE" 2>&1

    # 4. Dong goi ung dung Next.js
    log_msg "Dang build Next.js production (npm run build)..."
    npm run build >> "$LOG_FILE" 2>&1

    if [ $? -ne 0 ]; then
        log_msg "LOI: Build that bai! Vui long kiem tra log."
        rm -f "$LOCK_FILE"
        exit 1
    fi

    # 5. Khoi dong lai tien trinh Next.js tren PM2
    log_msg "Dang reload ung dung tren PM2..."
    if command -v pm2 &> /dev/null; then
        pm2 reload chamcong || pm2 restart chamcong || pm2 start ecosystem.config.cjs
        pm2 save --force >> "$LOG_FILE" 2>&1
    fi

    log_msg "HOAN TAT CAP NHAT & TRIEN KHAI THANH CONG!"
    log_msg "======================================================="
fi

rm -f "$LOCK_FILE"
exit 0
