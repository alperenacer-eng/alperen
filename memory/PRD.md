# Acerler BIMS - Proje Geliştirme Notları

## Original Problem Statement
GitHub'dan getirilen mevcut Acerler BIMS projesinin Puantaj, Personel ve Raporlama modüllerine yeni özellikler eklendi. Motorin modülündeki Excel yükleme akışı genişletildi (yüklenen dosyaları görüntüleme/düzenleme/silme + doğru veri eşleme).

## Tech Stack
- Backend: FastAPI + SQLite (aiosqlite)
- Frontend: React 19 + CRACO + Tailwind + Radix UI

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

## Next Action Items
- Kullanıcı yeni Excel akışını test edip dönüş yapacak
- Diğer modüllerde benzer Excel desteği isteniyorsa eklenebilir
