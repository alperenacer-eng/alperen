# Acerler BIMS - Proje Geliştirme Notları

## Original Problem Statement
GitHub'dan getirilen mevcut Acerler BIMS projesinin Puantaj, Personel ve Raporlama modüllerine yeni özellikler eklendi. Motorin modülündeki Excel yükleme akışı genişletildi (yüklenen dosyaları görüntüleme/düzenleme/silme + doğru veri eşleme).

## Tech Stack
- Backend: FastAPI + SQLite (aiosqlite)
- Frontend: React 19 + CRACO + Tailwind + Radix UI

## 🌐 Domain & Deployment (KRİTİK — UNUTMA)
- **Custom Domain (kullanıcı tarafından alındı):** `acerlerbims` (tam uzantı kullanıcı tarafından belirtilmedi — sorulduğunda netleştir)
- **Emergent Production URL:** `https://acer-engine.emergent.host`
- **Emergent Preview URL (dev):** `https://photo-backup-app.preview.emergentagent.com`
- **GitHub Repo (otomatik yedek hedefi):** `alperenacer-eng/alperen` (branch: `main`)
- **Deploy durumu:** Production'a deploy edildi (Şub 2026), 50 kredi/ay
- **Custom domain bağlama:** Emergent'in "Link domain" → Entri akışıyla yapılacak (kullanıcı bağlayacak)

## 🗣️ Kullanıcı Dili
**TÜRKÇE** — tüm yanıtlar Türkçe olmalı.


## Bu Oturumda Yapılanlar

### Önceki Oturum (Jan 2026)
- Puantaj raporlama: Baz Alınan Gün + Birim Fiyat sütunları
- "Gelmedi" durumu UI'dan kaldırıldı
- Belirleme otomatik kayıt
- Eksik Çal. Saat, Ölüm/Doğum İzni durumları
- Belirleme renk sistemi + uyarı paneli
- MotorinKaynaklar bos endpoint düzeltmesi (bosaltim-tesisleri, akaryakit-markalari)

### Bu Oturum (Şubat 2026) - Motorin Excel Akışı
1. **Excel Veri Eşleme Bug Fix (P0 — RESOLVED)**:
   - `MotorinVerme.js` artık başlık-bazlı eşleme yapıyor (HEADER_SYNONYMS); sütun sırası önemli değil
   - `parseSayi()` Türkçe formatı (`1.234,56`) ve ondalık nokta (`250.5`) ayırımını doğru yapıyor
   - Önceki bug: `250.5` → `2505` olarak kaydediliyordu (nokta her zaman strip ediliyordu)

2. **Yüklenmiş Excel Dosyaları Yönetimi (RESOLVED)**:
   - Yeni `motorin_verme_uploads` tablosu (dosya adı + base64 + metadata)
   - `motorin_verme` tablosuna `upload_id` kolonu eklendi
   - Yeni endpoint'ler:
     - `POST /api/motorin-verme/bulk` — toplu kayıt + dosya saklama
     - `GET /api/motorin-verme-uploads?tesis_adi=...` — yükleme listesi
     - `GET /api/motorin-verme-uploads/{id}/records` — yüklemenin kayıtları
     - `GET /api/motorin-verme-uploads/{id}/download` — dosya indirme
     - `DELETE /api/motorin-verme-uploads/{id}?delete_records=true` — cascade silme
   - Frontend'de "Yüklenmiş Excel Dosyaları" tablosu (görüntüle, indir, sil)
   - Kayıtlar Modal: inline edit + Düzenle butonuyla modal + Sil (window.confirm)

3. **Diğer**:
   - `/api/personel` → `/api/personeller` URL düzeltmesi (frontend)

## Çalışan Modüller
BIMS, Çimento, Parke, Personel (+ Puantaj, Belirleme, Bordro, İzin),
Araç Yönetimi, Motorin (Verme + Alım + Kaynaklar + Liste + Raporlar), Teklifler, İrsaliyeler, Muayene Takip

## Veritabanı
SQLite: `/app/backend/data/database.db` (mevcut veriler korundu)

## Test Sonuçları
- iteration_1.json: Backend 100% / Frontend 80% (parseSayi decimal bug bulundu)
- iteration_2.json: Backend (cached 100%) / Frontend 100% — TÜM TESTLER GEÇTİ

## Refactoring Backlog (Düşük Öncelik)
- `server.py` 6800+ satır → modüllere bölünmeli (auth, motorin, puantaj, vb.)
- `MotorinVerme.js` 1430+ satır → alt bileşenlere bölünmeli (UploadsList, RecordsModal, EditRecordModal)
- `XLSX.utils.sheet_to_json({ raw: true })` ile sayısal hücrelerin doğrudan JS number gelmesi

### Bu Oturum (Şubat 2026) - GitHub Otomatik Senkronizasyon
1. **GitHub Auto-Sync (RESOLVED)**:
   - `/app/backend/github_sync.py` modülü oluşturuldu — debounce'lı, async push
   - FastAPI middleware: POST/PUT/DELETE → otomatik tetikleme
   - Her tablo `data/<table>.json` olarak push (3sn debounce)
   - Full `backups/database.db` push (10sn debounce)
   - `users` tablosu güvenlik için skip ediliyor (parola hash içerir)
   - Repo: `alperenacer-eng/alperen`, Branch: `main`
   - GITHUB_TOKEN .env'de saklı

2. **Manuel Tam Yedek Al Butonu (RESOLVED — Şub 2026)**:
   - Backend: `POST /api/github-sync/push-all` — `current_user` ile auth gerekli
   - Frontend: `ModuleSelector.js` ana sayfa sağ üstte turuncu gradient buton
   - Loading state, sonner toast (success/warning/error)
   - Tüm giriş yapmış kullanıcılara açık (admin/staff fark etmez)
   - Test: 45/45 tablo + database.db başarıyla GitHub'a push edildi

## Next Action Items
- Kullanıcı manuel yedek butonunu UI'da test edip dönüş yapacak
- Diğer modüllerde benzer Excel desteği isteniyorsa eklenebilir

### Bu Oturum (Tem 2025) — Önceki Yıldan İçerde Kalan
(devamı yukarıda)

### Bu Oturum (Tem 2025) — Kayıtlar Tarih Sıralama Bug Fix
1. **Bug**: Kayıt güncellendiğinde tarih sırası bozuluyordu (backend `created_at DESC` sıralıyor, `production_date` değiştiği zaman görsel sıra ile uyumsuzluk)
2. **Fix**: `filteredRecords` useMemo artık `production_date`'e (fallback: `created_at`) göre sıralanıyor. Aynı tarihte `created_at` ile ikincil sıralama (stability).
3. **Yeni Özellik**: "Sütunlar" butonunun yanına **Sıralama Yönü Toggle Butonu** eklendi (ArrowDownAZ / ArrowUpAZ ikonları). "Yeniden Eskiye" ↔ "Eskiden Yeniye". Tercih localStorage'a kaydediliyor (`bims_kayit_sort_order`).
4. **Test**: Frontend testing agent %100 (5/5) — bug fixed, feature works, persistence çalışıyor.
1. **ProductionEntry.js — Çıkan Paket satırlarına yeni alan**:
   - Grid `grid-cols-10` → `grid-cols-11`
   - Her paket satırının en sonuna "Önc. Yıl Kalan" input alanı eklendi (orange renk)
   - `onceki_yil_kalan` alanı JSON içinde otomatik saklanır (DB migration gerekmez)
2. **Backend `/api/reports/product-based`**:
   - `cikan_paket_N` JSON'undan `onceki_yil_kalan` toplanır (ürün bazında)
   - Response'a `onceki_yil_kalan` per product + `total_onceki_yil_kalan` totals'a eklendi
   - **Yeni formül:** `icerde_kalan = uretilen + onceki_yil_kalan - cikan`
3. **Reports.js — Ürün Bazlı Rapor**:
   - Yeni sütun: "Önceki Yıldan Kalan" (amber renk), Üretilen ile Çıkan arasında
   - Genel Toplam satırında da yer alır
4. **Backend testi: 7/7 başarılı** (endpoint doğrulandı, formül doğru, backward compatible)

### Bu Oturum (Şubat 2026) - Kayıtlar Filtreleme & BIMS Rapor Geliştirmesi
1. **BIMS Üretim Raporu — Ürün Bazlı (RESOLVED)**:
   - `/api/reports/monthly` endpoint'ine yeni alanlar eklendi: `net_palet`, `shift_breakdown` (vardiya), `strip_used`, `mix_count`, `cement_used` (harcanan), `machine_cement`
   - `Reports.js` UI'da yeni sütunlar gösteriliyor
   - **Excel'e Aktar butonu** (`xlsx` kütüphanesi) eklendi

2. **Kayıtlar Sayfası — Tablo Filtreleme (RESOLVED — Şub 2026)**:
   - `ProductionList.js`'e tarih aralığı filtresi (başlangıç → bitiş) eklendi
   - Tablo başlığının altına **sütun bazlı filtre satırı** eklendi (her görünür sütun için ayrı arama kutusu)
   - Hesaplanan sütunlar (Net Palet, Harcanan Çimt., vb.) da filtrelenebilir — `cellValue()` üzerinden eşleşme
   - Filtreleri tek tıkla temizleme butonu (X ikonu)
   - Genel arama, tarih aralığı ve sütun filtreleri **birlikte** çalışıyor (AND mantığı)
   - Manuel olarak doğrulandı: operatör/vardiya/ürün/tarih aralığı filtreleri doğru sonuç veriyor

3. **Kayıtlı Filtreler & Tüm Sütunlar Dışa Aktarım (RESOLVED — Şub 2026)**:
   - "Dışa aktarımda tüm sütunlar (55) — filtreler korunur" toggle eklendi → Excel/PDF tüm sütunlarla çıkıyor, filtreler uygulanıyor
   - "Kayıtlı Filtreler" popover'ı eklendi: aktif filtre kombinasyonunu (arama + tarih aralığı + tüm sütun filtreleri) isimle kaydet → tek tıkla yükle → sil
   - localStorage'da `bims_kayit_filter_presets` anahtarıyla saklanıyor
   - Manuel doğrulama: kaydet/yükle/temizle/sil senaryoları test edildi ve çalışıyor
