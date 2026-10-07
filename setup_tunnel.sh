#!/bin/bash
# ==============================================================================
# SCRIPT KET NOI CLOUDFLARE TUNNEL TU DONG CHO APP CHAM CONG
# Token da duoc nhung san - Chi can chay: bash setup_tunnel.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}       KICH HOAT CLOUDFLARE TUNNEL CHO APP CHAM CONG 24/7             ${NC}"
echo -e "${BLUE}======================================================================${NC}"

# 1. Kiem tra quyen root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[LOI] Vui long chay voi quyen root: sudo bash setup_tunnel.sh${NC}"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 2. Cai dat cloudflared neu chua co
if ! command -v cloudflared &> /dev/null; then
    echo -e "${YELLOW}[1/3] Dang cai dat cloudflared tren VPS...${NC}"
    mkdir -p --mode=0755 /usr/share/keyrings
    curl -fsSL https://pkg.cloudflare.com/cloudflare-public-v2.gpg | tee /usr/share/keyrings/cloudflare-public-v2.gpg >/dev/null
    echo 'deb [signed-by=/usr/share/keyrings/cloudflare-public-v2.gpg] https://pkg.cloudflare.com/cloudflared any main' | tee /etc/apt/sources.list.d/cloudflared.list
    apt-get update -y && apt-get install -y cloudflared
fi

# 3. Token cua Cloudflare Tunnel
DEFAULT_TOKEN="eyJhIjoiYjYzZjEwYjhjZDQzNmVjMDgxYzQxY2IyMDY1MzA0NWIiLCJ0IjoiZmZmZWMyODgtYWI5Yy00NTM5LTk4YWEtZjhlYTViYWNmMGYyIiwicyI6IllUQTNaalU0TXpBdE56QmxZUzAwWWpGbUxUZzRNV1V0WmpWaU5qTTVZalkxTWpCaiJ9"
TOKEN="${1:-$DEFAULT_TOKEN}"

echo -e "${BLUE}[2/3] Dang ket noi Tunnel voi token cua ban...${NC}"
cloudflared service uninstall 2>/dev/null || true
cloudflared service install "$TOKEN"

# 4. Kich hoat service cloudflared chay 24/7 va tu bat khi reboot
echo -e "${BLUE}[3/3] Kich hoat service cloudflared chay ngam va tu bat khi reboot...${NC}"
systemctl daemon-reload
systemctl enable --now cloudflared
systemctl restart cloudflared

echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}        CLOUDFLARE TUNNEL DA HOAT DONG VA KET NOI THANH CONG!        ${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "Trang thai dich vu: ${YELLOW}$(systemctl is-active cloudflared)${NC}"
echo -e "Tu khoi dong khi reboot: ${YELLOW}$(systemctl is-enabled cloudflared)${NC}"
echo -e ""
echo -e "👉 Bay gio tren man hinh web Cloudflare Zero Trust,"
echo -e "   trang thai Tunnel se tu dong chuyen sang CONNECTED (Mau xanh)!"
echo -e "======================================================================"
