#!/bin/bash

#==============================================
# ACERLER BİMS TAKİP - SUNUCU KURULUM SCRİPTİ
# Ubuntu/Debian için
#==============================================

set -e

echo "================================================"
echo "  ACERLER BİMS TAKİP - KURULUM BAŞLIYOR"
echo "================================================"

# Renk kodları
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Değişkenler - BUNLARI DEĞİŞTİRİN
APP_DIR="/var/www/acerler-bims"
DOMAIN="bims.yourdomain.com"  # Kendi domaininizi yazın
BACKEND_PORT=8001
FRONTEND_PORT=3000

echo -e "${YELLOW}[1/7] Sistem güncelleniyor...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}[2/7] Gerekli paketler kuruluyor...${NC}"
apt install -y curl wget git nginx supervisor build-essential

# Python 3.11 kurulumu
echo -e "${YELLOW}[3/7] Python 3.11 kuruluyor...${NC}"
apt install -y software-properties-common
add-apt-repository -y ppa:deadsnakes/ppa
apt update
apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Node.js 20 kurulumu
echo -e "${YELLOW}[4/7] Node.js 20 kuruluyor...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g yarn

echo -e "${YELLOW}[5/7] Uygulama dizini hazırlanıyor...${NC}"
mkdir -p $APP_DIR
cd $APP_DIR

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  TEMEL KURULUM TAMAMLANDI!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Şimdi yapmanız gerekenler:"
echo ""
echo "1. Proje dosyalarını $APP_DIR klasörüne kopyalayın:"
echo "   - backend/ klasörü"
echo "   - frontend/ klasörü"
echo ""
echo "2. setup.sh scriptini çalıştırın:"
echo "   cd $APP_DIR && bash setup.sh"
echo ""
