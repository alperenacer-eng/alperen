# 🐳 Acerler Bims Takip - Docker Kurulum Rehberi

## 📋 Gereksinimler

- Docker Desktop (Windows/Mac) veya Docker Engine (Linux)
- Docker Compose
- Minimum 2GB RAM

## 🚀 Hızlı Başlangıç

### 1. Projeyi İndirin
```bash
git clone https://github.com/KULLANICI/acerler-bims.git
cd acerler-bims
```

### 2. Docker ile Başlatın
```bash
# İlk kurulum ve başlatma
docker-compose up -d --build

# Logları izle
docker-compose logs -f
```

### 3. Tarayıcıda Açın
```
http://localhost
```

Varsayılan giriş:
- **Email:** alperenacer@acerler.com
- **Şifre:** 1234

---

## 🔧 Yapılandırma

### Port Değiştirme
`docker-compose.yml` dosyasında:
```yaml
frontend:
  ports:
    - "8080:80"  # localhost:8080 üzerinden erişim
```

### Farklı Domain/Port için Cloudflare Ayarı
1. Cloudflare DNS'e A kaydı ekleyin
2. Port 80 veya 443 kullanın (Cloudflare proxy için)

---

## 📊 Yönetim Komutları

```bash
# Başlat
docker-compose up -d

# Durdur
docker-compose down

# Yeniden başlat
docker-compose restart

# Logları gör
docker-compose logs -f

# Sadece backend logları
docker-compose logs -f backend

# Container durumu
docker-compose ps

# Yeniden build (kod değişikliğinde)
docker-compose up -d --build
```

---

## 💾 Veri Yedekleme

Veritabanı ve yüklenen dosyalar `./data` ve `./uploads` klasörlerinde saklanır.

### Yedekleme
```bash
# Windows PowerShell
Compress-Archive -Path .\data, .\uploads -DestinationPath backup_$(Get-Date -Format 'yyyyMMdd').zip

# Linux/Mac
tar -czvf backup_$(date +%Y%m%d).tar.gz data/ uploads/
```

### Geri Yükleme
```bash
# Containerları durdur
docker-compose down

# Yedekten geri yükle
# Windows: Extract-Archive veya manuel çıkart
# Linux: tar -xzvf backup_YYYYMMDD.tar.gz

# Tekrar başlat
docker-compose up -d
```

---

## 🔒 Cloudflare ile Güvenlik

### Sadece Cloudflare'den Erişim (Windows Firewall)

1. Windows Firewall'u açın
2. Inbound Rules > New Rule
3. Port 80 için sadece Cloudflare IP'lerine izin verin:
   - 173.245.48.0/20
   - 103.21.244.0/22
   - 103.22.200.0/22
   - 103.31.4.0/22
   - 141.101.64.0/18
   - 108.162.192.0/18
   - 190.93.240.0/20
   - 188.114.96.0/20
   - 197.234.240.0/22
   - 198.41.128.0/17
   - 162.158.0.0/15
   - 104.16.0.0/13
   - 104.24.0.0/14
   - 172.64.0.0/13
   - 131.0.72.0/22

---

## ❓ Sorun Giderme

### Container başlamıyor
```bash
# Detaylı log
docker-compose logs backend

# Container içine gir
docker exec -it acerler-backend /bin/bash
```

### 502 Bad Gateway
Backend container'ın çalıştığından emin olun:
```bash
docker-compose ps
docker-compose restart backend
```

### Veritabanı hatası
```bash
# data klasörü izinlerini kontrol et
ls -la data/

# SQLite dosyasını kontrol et
docker exec -it acerler-backend ls -la /app/data/
```

### Port kullanımda
```bash
# Windows - hangi uygulama kullanıyor?
netstat -ano | findstr :80

# Farklı port kullan (docker-compose.yml)
ports:
  - "8080:80"
```

---

## 🔄 Güncelleme

```bash
# En son kodu çek
git pull

# Yeniden build et ve başlat
docker-compose up -d --build
```
