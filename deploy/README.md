# Acerler Bims Takip - Sunucu Kurulum Rehberi

## 📋 Gereksinimler

| Program | Versiyon |
|---------|----------|
| Ubuntu/Debian | 20.04+ / 11+ |
| Python | 3.11+ |
| Node.js | 18+ |
| Nginx | En güncel |

## 🚀 Hızlı Kurulum (3 Adım)

### Adım 1: Temel Programları Kur
```bash
# Root olarak bağlanın
ssh root@SUNUCU_IP

# Kurulum scriptini indir ve çalıştır
wget -O install.sh https://raw.githubusercontent.com/REPO/install.sh
chmod +x install.sh
./install.sh
```

### Adım 2: Proje Dosyalarını Kopyala
```bash
# Bilgisayarınızdan sunucuya kopyalayın
scp -r backend/ root@SUNUCU_IP:/var/www/acerler-bims/
scp -r frontend/ root@SUNUCU_IP:/var/www/acerler-bims/
scp deploy/setup.sh root@SUNUCU_IP:/var/www/acerler-bims/
```

### Adım 3: Kurulumu Tamamla
```bash
cd /var/www/acerler-bims
chmod +x setup.sh
./setup.sh
```

## ☁️ Cloudflare Ayarları

### DNS Ayarları
1. Cloudflare Dashboard > DNS > Add Record
2. Ekleyin:
   - **Type:** A
   - **Name:** bims (veya istediğiniz subdomain)
   - **IPv4:** Sunucu IP adresiniz
   - **Proxy status:** Proxied (turuncu bulut) ✅

### SSL Ayarları
1. SSL/TLS > Overview
2. **Full (strict)** seçin

### Güvenlik (IP Gizleme)
Cloudflare proxy açıkken IP adresiniz otomatik gizlenir.

## 🔧 Nginx Ayarları

`/etc/nginx/sites-available/acerler-bims` dosyasını düzenleyin:

```nginx
server {
    listen 80;
    server_name bims.sizindomain.com;  # DEĞİŞTİRİN

    root /var/www/acerler-bims/frontend/build;
    index index.html;

    # API -> Backend
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 🔒 Sadece Cloudflare'den Erişim (IP Gizleme)

Sunucunuza sadece Cloudflare üzerinden erişim için:

```bash
# UFW Firewall kur
apt install ufw

# Varsayılan kurallar
ufw default deny incoming
ufw default allow outgoing

# SSH izni (ÖNEMLİ - kilitlemeyin!)
ufw allow 22/tcp

# Sadece Cloudflare IP'lerine HTTP/HTTPS izni
# Cloudflare IPv4
ufw allow from 173.245.48.0/20 to any port 80,443 proto tcp
ufw allow from 103.21.244.0/22 to any port 80,443 proto tcp
ufw allow from 103.22.200.0/22 to any port 80,443 proto tcp
ufw allow from 103.31.4.0/22 to any port 80,443 proto tcp
ufw allow from 141.101.64.0/18 to any port 80,443 proto tcp
ufw allow from 108.162.192.0/18 to any port 80,443 proto tcp
ufw allow from 190.93.240.0/20 to any port 80,443 proto tcp
ufw allow from 188.114.96.0/20 to any port 80,443 proto tcp
ufw allow from 197.234.240.0/22 to any port 80,443 proto tcp
ufw allow from 198.41.128.0/17 to any port 80,443 proto tcp
ufw allow from 162.158.0.0/15 to any port 80,443 proto tcp
ufw allow from 104.16.0.0/13 to any port 80,443 proto tcp
ufw allow from 104.24.0.0/14 to any port 80,443 proto tcp
ufw allow from 172.64.0.0/13 to any port 80,443 proto tcp
ufw allow from 131.0.72.0/22 to any port 80,443 proto tcp

# Firewall'u etkinleştir
ufw enable
```

## 📊 Servis Yönetimi

```bash
# Backend durumu
sudo supervisorctl status acerler-backend

# Backend yeniden başlat
sudo supervisorctl restart acerler-backend

# Logları izle
tail -f /var/log/acerler-bims/backend.err.log

# Nginx yeniden başlat
sudo systemctl restart nginx
```

## 🗄️ Veritabanı

SQLite veritabanı dosyası:
```
/var/www/acerler-bims/backend/database.db
```

Yedekleme:
```bash
cp /var/www/acerler-bims/backend/database.db ~/backup/database_$(date +%Y%m%d).db
```

## ❓ Sorun Giderme

### Backend çalışmıyor
```bash
# Logları kontrol et
cat /var/log/acerler-bims/backend.err.log

# Manuel başlat
cd /var/www/acerler-bims/backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001
```

### 502 Bad Gateway
```bash
# Backend çalışıyor mu?
curl http://localhost:8001/api/health

# Nginx config doğru mu?
nginx -t
```

### Sayfa yüklenmiyor
```bash
# Build dosyaları var mı?
ls /var/www/acerler-bims/frontend/build/

# Yoksa tekrar build al
cd /var/www/acerler-bims/frontend
yarn build
```
