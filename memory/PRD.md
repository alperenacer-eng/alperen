# Acerler BIMS Takip - PRD

## Original Problem Statement
GitHub repo: https://github.com/alperenacer-eng/alperen
"projemi aç" → Mevcut projeyi /app içine alıp ayağa kaldır.
"puantaj sayfasına toplu puantaj alanı die bir sekme aç..."

## Tech Stack
- Backend: FastAPI + aiosqlite (SQLite) — port 8001
- Frontend: React 19 + craco + Tailwind + shadcn/ui — port 3000
- Auth: JWT (passlib/bcrypt)

## Completed (Jun 5, 2026)
- Projeyi GitHub'dan alıp /app içine kuruldu, bağımlılıklar yüklendi, servisler ayağa kaldırıldı.
- Puantaj sayfasına **Tabs** eklendi: "Günlük Toplu Giriş" (mevcut) ve "Toplu Puantaj" (yeni).
- Yeni "Toplu Puantaj" sekmesi:
  - Tek personel seçimi (arama kutulu dropdown)
  - Tarih aralığı (Başlangıç–Bitiş) + Pazar atla seçeneği
  - Şablon (Durum/Giriş/Çıkış/Fazla Mesai/Tesis/Not) → "Tümüne Uygula" veya "Sadece Boşlara"
  - Her gün **alt alta sıralı** satır halinde listeleniyor (gün adı + tarih + tüm alanlar)
  - "Tümünü Kaydet" → her gün için `/api/puantaj/toplu` çağrısı
  - Mevcut kayıtlar otomatik pre-fill edilir, "Mevcut kayıt" rozeti gösterilir

## Backlog / Next
- P2: Birden fazla personeli aynı anda toplu puantaj sekmesinde işleyebilme
- P2: Excel export/import (toplu puantaj için)
- P2: "Tarih aralığı şablonları" (kaydedilmiş şablonlar)
