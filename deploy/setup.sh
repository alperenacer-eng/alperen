#!/bin/bash

#==============================================
# ACERLER BİMS TAKİP - UYGULAMA KURULUM SCRİPTİ
#==============================================

set -e

# Renk kodları
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_DIR="/var/www/acerler-bims"
BACKEND_PORT=8001

echo "================================================"
echo "  UYGULAMA KURULUMU BAŞLIYOR"
echo "================================================"

cd $APP_DIR

# Backend kurulumu
echo -e "${YELLOW}[1/4] Backend kuruluyor...${NC}"
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ..

# Frontend kurulumu ve build
echo -e "${YELLOW}[2/4] Frontend kuruluyor ve build alınıyor...${NC}"
cd frontend

# .env dosyası oluştur
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=/api
EOF

yarn install
yarn build
cd ..

# Supervisor ayarları
echo -e "${YELLOW}[3/4] Supervisor ayarlanıyor...${NC}"
cat > /etc/supervisor/conf.d/acerler-bims.conf << EOF
[program:acerler-backend]
command=$APP_DIR/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port $BACKEND_PORT
directory=$APP_DIR/backend
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/acerler-bims/backend.err.log
stdout_logfile=/var/log/acerler-bims/backend.out.log
environment=PATH="$APP_DIR/backend/venv/bin"
EOF

# Log dizini oluştur
mkdir -p /var/log/acerler-bims
chown -R www-data:www-data /var/log/acerler-bims
chown -R www-data:www-data $APP_DIR

# Supervisor yeniden başlat
supervisorctl reread
supervisorctl update
supervisorctl restart acerler-backend

echo -e "${YELLOW}[4/4] Nginx ayarlanıyor...${NC}"

# Nginx config - Domain adını değiştirin!
cat > /etc/nginx/sites-available/acerler-bims << 'EOF'
server {
    listen 80;
    server_name bims.yourdomain.com;  # <-- DOMAIN ADRESİNİZİ DEĞİŞTİRİN

    # Frontend (React build)
    root /var/www/acerler-bims/frontend/build;
    index index.html;

    # Gzip sıkıştırma
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # API isteklerini backend'e yönlendir
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # React Router için - tüm istekleri index.html'e yönlendir
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Statik dosyalar için cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Nginx site'ı etkinleştir
ln -sf /etc/nginx/sites-available/acerler-bims /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Nginx test et ve yeniden başlat
nginx -t
systemctl restart nginx

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  KURULUM TAMAMLANDI!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Sonraki adımlar:"
echo ""
echo "1. /etc/nginx/sites-available/acerler-bims dosyasındaki"
echo "   'bims.yourdomain.com' kısmını kendi domaininizle değiştirin"
echo ""
echo "2. Cloudflare'de A kaydı oluşturun:"
echo "   - Type: A"
echo "   - Name: bims (veya @)"
echo "   - Content: SUNUCU_IP_ADRESINIZ"
echo "   - Proxy: Açık (turuncu bulut)"
echo ""
echo "3. SSL için (Cloudflare kullanıyorsanız):"
echo "   - SSL/TLS > Full (strict) seçin"
echo ""
echo "4. Nginx'i yeniden başlatın:"
echo "   sudo systemctl restart nginx"
echo ""
echo "5. Uygulamayı test edin:"
echo "   http://bims.yourdomain.com"
echo ""
