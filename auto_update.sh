#!/bin/bash
# ==============================================================================
# SCRIPT TU DONG KIEM TRA GIT VA CAP NHAT TRIEN KHAI UNG DUNG CHAM CONG
# Tich hop an toan Database SQLite, PM2 Zero-Downtime va Systemd Watcher
# ==============================================================================

# 1. Dam bao PATH co day du thu muc chua node, npm, pm2, git
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"
if [ -d "/root/.nvm" ]; then
    export NVM_DIR="/root/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" 2>/dev/null || true
fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR" || exit 1

# Tranh loi safe.directory tren Git moi
git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true

LOG_FILE="/var/log/chamcong_autoupdate.log"
LOCK_FILE="/tmp/chamcong_update.lock"

# 2. Ho tro che do loop chay ngam (Systemd Daemon Service)
if [ "$1" = "--loop" ] || [ "$1" = "-l" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Khoi dong Git Watcher Daemon (Chu ky kiem tra: 45 giay)..." | tee -a "$LOG_FILE"
    while true; do
        bash "$REPO_DIR/auto_update.sh" --once
        sleep 45
    done
    exit 0
fi

# 3. Tranh truong hop chay trung lap nhieu tien trinh update cung luc
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

# 4. Kiem tra ket noi mang va fetch git moi nhat
git fetch origin main --quiet 2>/dev/null
FETCH_STATUS=$?
if [ $FETCH_STATUS -ne 0 ]; then
    # Thu fetch lai khong co quiet de ghi ro loi neu co
    FETCH_ERR=$(git fetch origin main 2>&1 || true)
    if echo "$FETCH_ERR" | grep -qi "fatal"; then
        log_msg "CANH BAO git fetch: $FETCH_ERR"
    fi
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

    # 1. Sao luu an toan database SQLite local.db
    git update-index --no-assume-unchanged data/local.db 2>/dev/null || true
    if [ -f "data/local.db" ]; then
        mkdir -p /var/backups/chamcong
        cp "data/local.db" "/var/backups/chamcong/local_$(date '+%Y%m%d_%H%M%S').db" 2>/dev/null
    fi

    # 2. Keo code moi nhat
    git checkout -- . 2>/dev/null || true
    git reset --hard HEAD --quiet
    git pull origin main --quiet || {
        log_msg "Thu reset ve origin/main..."
        git reset --hard origin/main --quiet
    }

    if [ $? -ne 0 ]; then
        log_msg "LOI: Khong the git pull code moi."
        rm -f "$LOCK_FILE"
        exit 1
    fi

    # 3. Cai dat thu vien moi (neu co)
    log_msg "Dang cai dat dependencies (npm install)..."
    npm install --no-audit --no-fund >> "$LOG_FILE" 2>&1
    npm install better-sqlite3@11.8.1 --no-audit --no-fund >> "$LOG_FILE" 2>&1 || true

    # 4. Kiem tra va nap du lieu seed neu database SQLite tren VPS dang trong
    log_msg "Dang kiem tra va nap du lieu mau (data/seed_data.json)..."
    node data/seed_runner.cjs >> "$LOG_FILE" 2>&1 || true

    # 5. Dong goi ung dung Next.js
    log_msg "Dang build Next.js production (npm run build)..."
    npm run build >> "$LOG_FILE" 2>&1

    if [ $? -ne 0 ]; then
        log_msg "LOI: Build that bai! Vui long kiem tra $LOG_FILE."
        rm -f "$LOCK_FILE"
        exit 1
    fi

    # 5. Khoi dong lai tien trinh Next.js tren PM2
    log_msg "Dang reload ung dung tren PM2..."
    if command -v pm2 &> /dev/null; then
        pm2 delete chamcong 2>/dev/null || true
        pm2 start ecosystem.config.cjs >> "$LOG_FILE" 2>&1
        pm2 save --force >> "$LOG_FILE" 2>&1
    fi

    log_msg "HOAN TAT CAP NHAT & TRIEN KHAI THANH CONG!"
    log_msg "======================================================="
fi


rm -f "$LOCK_FILE"
exit 0
