#!/bin/bash
# ==============================================================================
# SCRIPT CAI DAT CLOUDFLARED TU DONG TREN VPS (UBUNTU / DEBIAN)
# Khong can copy paste lenh dai - Chi can go: bash install_cloudflared.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}          DANG CAI DAT CLOUDFLARED (CLOUDFLARE TUNNEL)               ${NC}"
echo -e "${BLUE}======================================================================${NC}"

# 1. Kiem tra quyen root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[LOI] Vui long chay voi quyen root (sudo bash install_cloudflared.sh)${NC}"
    exit 1
fi

# 2. Them GPG key cua Cloudflare
echo -e "${BLUE}[1/3] Dang them khoa Cloudflare GPG key...${NC}"
mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-public-v2.gpg | tee /usr/share/keyrings/cloudflare-public-v2.gpg >/dev/null

# 3. Them repository vao apt
echo -e "${BLUE}[2/3] Dang them Cloudflare repository...${NC}"
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-public-v2.gpg] https://pkg.cloudflare.com/cloudflared any main' | tee /etc/apt/sources.list.d/cloudflared.list

# 4. Cai dat package cloudflared
echo -e "${BLUE}[3/3] Dang cap nhat goi va cai dat cloudflared...${NC}"
apt-get update -y
apt-get install -y cloudflared

echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}             CAI DAT CLOUDFLARED HOAN TAT 100%!                      ${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "Phien ban da cai: ${YELLOW}$(cloudflared --version)${NC}"
echo -e ""

# 5. Neu co truyen Token lam tham so dau vao (vi du: bash install_cloudflared.sh eyJh...)
if [ -n "$1" ]; then
    echo -e "${BLUE}Phat hien Token Cloudflare Tunnel. Dang cai dat service...${NC}"
    cloudflared service install "$1"
    systemctl daemon-reload
    systemctl enable --now cloudflared
    echo -e "${GREEN}[OK] Cloudflare Tunnel da duoc ket noi va dang chay ngam 24/7!${NC}"
else
    echo -e "Cac cach ket noi Tunnel tiep theo:"
    echo -e "1. Neu co Token tu Cloudflare Zero Trust: chay lenh"
    echo -e "   ${YELLOW}cloudflared service install <TOKEN_CUA_BAN>${NC}"
    echo -e "2. Neu muon tao link HTTPS mien phi nhanh (khong can token/domain):"
    echo -e "   ${YELLOW}cloudflared tunnel --url http://127.0.0.1:9000${NC}"
fi
echo -e "======================================================================"
