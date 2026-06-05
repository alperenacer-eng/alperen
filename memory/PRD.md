# Acerler BIMS - Proje Geliştirme Notları

## Original Problem Statement
GitHub'dan getirilen mevcut Acerler BIMS projesinin Puantaj, Personel ve Raporlama modüllerine yeni özellikler eklendi.

## Tech Stack
- Backend: FastAPI + SQLite (aiosqlite)
- Frontend: React 19 + CRACO + Tailwind + Radix UI

## Bu Oturumda Yapılanlar (Jan 2026)

### 1. Proje Kurulumu
- GitHub'dan `alperenacer-eng/alperen` repo'su klonlandı, /app'e taşındı
- Backend (Python deps) ve Frontend (Yarn deps) kuruldu
- Supervisor ile çalıştırıldı (backend: 8001, frontend: 3000)

### 2. Puantaj Raporlama → Yeni Sütunlar
- **"Baz Alınan Gün"** sabit 30 sütunu (maaş hesap baz günü)
- Her durum + Fazla Mesai için **"Birim Fiyat"** kutusu (Belirleme tablosundan)
- Excel ve PDF/yazdırma çıktıları da güncellendi

### 3. "Gelmedi" Durumu Kaldırıldı
- Tüm UI listelerinden (Puantaj, PuantajRaporlama, MaasBordrosu, PersonelListesi)
- Backend kolonları korundu (eski kayıtların bütünlüğü için)

### 4. Belirleme → Otomatik Kayıt
- "Seçilenlere Uygula" butonu artık değişiklikleri otomatik DB'ye kaydeder

### 5. Yeni Belirleme Kalemi: Eksik Çal. Saat
- `durum_carpan_eksik_calisma` + `ucret_override_eksik_calisma` (saatlik birim)
- PuantajRaporlama'da "Eksik Çal." sütunu yanına birim fiyat kutusu

### 6. Yeni Durumlar: Ölüm İzni & Doğum İzni
- Backend: 4 yeni kolon (carpan + override × 2 durum)
- Frontend: Puantaj seçici, raporlama, Belirleme, bordro etiketleri

### 7. Belirleme Renk Sistemi + Uyarı Paneli
- Her hücre: belirlenmiş (yeşil) / belirlenmemiş (kırmızı)
- Üstte uyarı kartı: eksik personeller chip olarak listelenir
- Belirleyince otomatik listeden çıkar (reactive)

## Çalışan Modüller
BIMS, Çimento, Parke, Personel (+ Puantaj, Belirleme, Bordro, İzin),
Araç Yönetimi, Motorin, Teklifler, İrsaliyeler, Muayene Takip

## Veritabanı
SQLite: `/app/backend/data/database.db` (mevcut veriler korundu)

## Next Action Items
- Kullanıcı test edip dönüş yapacak
