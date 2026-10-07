#!/bin/bash
# ==============================================================================
# SCRIPT KET NOI CLOUDFLARE TUNNEL TUDONG
# Chay: bash setup_tunnel.sh [TOKEN]
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}             CAU HINH & KET NOI CLOUDFLARE TUNNEL                    ${NC}"
echo -e "${BLUE}======================================================================${NC}"

# 1. Kiem tra quyen root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[LOI] Vui long chay voi sudo: sudo bash setup_tunnel.sh${NC}"
    exit 1
fi

# 2. Dam bao cloudflared da duoc cai dat
if ! command -v cloudflared &> /dev/null; then
    echo -e "${YELLOW}Chua phat hien cloudflared. Dang tu dong cai dat...${NC}"
    bash "$SCRIPT_DIR/install_cloudflared.sh"
fi

# 3. Lay token tu doi so $1 hoac tu file cloudflared_token.txt
TOKEN="$1"
if [ -z "$TOKEN" ] && [ -f "$SCRIPT_DIR/cloudflared_token.txt" ]; then
    TOKEN=$(cat "$SCRIPT_DIR/cloudflared_token.txt" | tr -d '\r\n ' || true)
fi

# 4. Neu co token: cai dat service chay 24/7
if [ -n "$TOKEN" ]; then
    echo -e "${BLUE}Dang cai dat va kich hoat Cloudflare Tunnel Service voi Token...${NC}"
    cloudflared service uninstall 2>/dev/null || true
    cloudflared service install "$TOKEN"
    systemctl daemon-reload
    systemctl enable --now cloudflared
    echo -e "${GREEN}======================================================================${NC}"
    echo -e "${GREEN}     TUNNEL DA KET NOI VA CHAY NGAM THANH CONG 24/7!                 ${NC}"
    echo -e "${GREEN}======================================================================${NC}"
    echo -e "Trang thai dich vu: ${YELLOW}$(systemctl is-active cloudflared)${NC}"
    echo -e "Tu dong khoi dong khi reboot VPS: ${YELLOW}$(systemctl is-enabled cloudflared)${NC}"
    exit 0
fi

# 5. Neu khong co token: huong dan
echo -e "${YELLOW}Chua tim thay Token de cai dat Service.${NC}"
echo -e "Ban co the chay 1 trong 2 cach sau:"
echo -e "👉 Cach 1 (Co Token tu Zero Trust):"
echo -e "   ${YELLOW}bash setup_tunnel.sh <TOKEN_CUA_BAN>${NC}"
echo -e ""
echo -e "👉 Cach 2 (Tao link HTTPS mien phi nhanh khong can token):"
echo -e "   ${YELLOW}cloudflared tunnel --url http://127.0.0.1:9000${NC}"
echo -e "======================================================================"
