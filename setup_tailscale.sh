#!/bin/bash
# ==============================================================================
# SCRIPT TRIEN KHAI TAILSCALE CHO DU AN CHAM CONG & QUAN LY CHI PHI
# Ap dung rieng biet cho Port 9000 - Tu dong khoi dong cung VPS 24/7
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}     TRIEN KHAI TAILSCALE MANG RIENG CHO UNG DUNG CHAM CONG${NC}"
echo -e "${BLUE}======================================================================${NC}"

# 1. Kiem tra quyen root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[LOI] Vui long chay script voi quyen root (sudo bash setup_tailscale.sh)${NC}"
    exit 1
fi

# 2. Cai dat Tailscale tren Ubuntu neu chua co
if ! command -v tailscale &> /dev/null; then
    echo -e "${YELLOW}[1/4] Dang cai dat Tailscale tren VPS...${NC}"
    curl -fsSL https://tailscale.com/install.sh | sh
else
    echo -e "${GREEN}[OK] Tailscale da duoc cai dat tren he thong.${NC}"
fi

# 3. Kich hoat service tailscaled tu dong khoi dong cung VPS (Boot persistence)
echo -e "${BLUE}[2/4] Kich hoat che do tu khoi dong khi reboot VPS (systemd)...${NC}"
systemctl enable tailscaled
systemctl start tailscaled
echo -e "${GREEN}[OK] tailscaled.service da duoc enable thanh cong.${NC}"

# 4. Kiem tra trang thai dang nhap Tailscale
echo -e "${BLUE}[3/4] Kiem tra ket noi Tailnet...${NC}"
TS_STATUS=$(tailscale status 2>&1 || true)

if echo "$TS_STATUS" | grep -q "Logged out"; then
    echo -e "${YELLOW}VPS chua duoc lien ket voi tai khoan Tailscale cua ban.${NC}"
    echo -e "Vui long nhan duong link duoi day de dang nhap/xac thuc thiet bi:"
    tailscale up --operator=root --accept-routes=false
elif echo "$TS_STATUS" | grep -q "100\."; then
    echo -e "${GREEN}[OK] VPS da duoc ket noi vao mang Tailnet thanh cong!${NC}"
else
    echo -e "${YELLOW}Dang khoi dong Tailscale...${NC}"
    tailscale up --operator=root --accept-routes=false || true
fi

# 5. Cau hinh Tailscale Serve RIENG BIET cho ung dung Cham Cong (Port 9000)
# Tinh nang nay chi expose port 9000 tren mang Tailscale MagicDNS ma khong anh huong toi Center Manager hay bat ky web nao khac
echo -e "${BLUE}[4/4] Cau hinh Tailscale Serve rieng cho cong 9000 (Cham Cong)...${NC}"
tailscale serve --bg http://127.0.0.1:9000

# Lay thong tin IP va MagicDNS
TS_IP=$(tailscale ip -4 2>/dev/null || echo "100.x.x.x")
TS_DNS=$(tailscale status --json 2>/dev/null | grep -o '"DNSName":"[^"]*' | head -n1 | cut -d'"' -f4 | sed 's/\.$//' || echo "")

echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}             TRIEN KHAI TAILSCALE CHO APP HOAN TAT!                  ${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "Thong tin truy cap noi bo an toan qua Tailscale:"
if [ -n "$TS_DNS" ]; then
    echo -e "👉 MagicDNS URL (HTTPS an toan): ${YELLOW}https://${TS_DNS}${NC}"
fi
echo -e "👉 Tailscale IP:                 ${YELLOW}http://${TS_IP}:9000${NC}"
echo -e ""
echo -e "Đac tinh toi uu 24/7:"
echo -e "✔ Chi ap dung duy nhat cho port 9000 (Khong dong cham den Center Manager hay DB)"
echo -e "✔ Ma hoa dau cuoi WireGuard toc do cao, khong lo bot scan hoac brute-force"
echo -e "✔ Tu dong ket noi va phuc hoi khi VPS khoi dong lai (systemd enabled)"
echo -e "======================================================================"
