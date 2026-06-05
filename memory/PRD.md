# BİMS - Acerler Bims Yönetim Sistemi

## Orijinal Problem Statement
Acerler şirketi için iç kullanıma yönelik, bims/parke/çimento/personel/araç gibi modüller içeren bir ERP benzeri yönetim sistemi. React + FastAPI + SQLite mimarisi.

## Teknik Mimari
- **Frontend:** React + TailwindCSS + shadcn/ui (`/app/frontend`)
- **Backend:** FastAPI (`/app/backend`)
- **DB:** SQLite (`bims.db`)
- **Auth:** JWT (kullanıcı: `alperenacer@acerler.com` / `1234`)

## Modüller
Bims Üretim, Parke Üretim, Çimento, Araçlar, Motorin, Personel, Teklif, İrsaliye, Kaynaklar.

## Personel Modülü Detayları
- Personel Listesi
- Puantaj (günlük durum girişi: geldi/gelmedi/izinli/raporlu/hafta tatili/resmi tatil/bayram tatili/izinsiz gelmedi/pazar çalışması/resmi tatil çalıştı/bayram çalıştı)
- Puantaj Raporlama (Personel Bazlı, Tesis Bazlı, Gün Bazlı, Detaylı Liste sekmeleri + Excel/PDF export)
- İzin Yönetimi
- Maaş Bordrosu

## CHANGELOG
- 2026-02-05 — **Belirleme'ye "Tümünü Kaydet" + departman bazlı toplu kaydet butonları.**
  - Üst satırda **"Tümünü Kaydet"** (emerald) — tüm dirty satırlar tek API çağrısı batch'iyle paralel kaydedilir.
  - Her departman kartının başında **"Bu Departmanı Kaydet"** (mavi) — sadece o departmandaki dirty satırlar.
  - Her iki butonda **rozet** ile dirty sayısı gösterilir; dirty yoksa gri+disabled.
- 2026-02-05 — Personel Listesi'ne "Belirleme" sekmesi eklendi.
  - Sekme yapısı: Liste / Belirleme (shadcn Tabs).
  - Belirleme: Personeller departmana göre gruplandırılır. Her satırda Ad Soyad + Maaş + Günlük + 11 durum için **(Çarpan × Ücret)** ikilisi.
  - Düzenleme mantığı: Çarpan değişince ücret otomatik recompute; Ücret elle değişince "manuel override" (sarı kenarlık + ↺ geri alma butonu). Satır başına "Kaydet" butonu.
  - DB: `personeller` tablosuna 11 yeni override kolonu (`ucret_override_*` — NULL = override yok).
  - Bordro: `hesapla_bordro_kalemleri` endpoint'i override varsa direkt birim ücret × gün/saat olarak kullanır (çarpan yerine).
- 2026-02-05 — Bordro tablosu "Durum Ek" kolonu + Bordro uyarı banner + Yıllık trend grafiği.
  - Tablo: Mevcut R.Tatil ile Toplam arasına amber "Durum Ek" kolonu — tooltip ile her durumun breakdown'u.
  - Uyarı Banner: Modal'larda hesap sonrası bilgilendirme — "Bayram Çalıştı çarpanı R.Tatil'e dahildir" + (gün>0 ama çarpan=0 olan **izinli/hafta_tatili/resmi_tatil/bayram_tatili** için kontrol uyarısı).
  - Yıllık Trend: Seçili yıl için 12 ay LineChart — Durum Ek + F.Mesai + Pazar + R.Tatil yığılmış sütun (Recharts). Kayıt yoksa gizli.
- 2026-02-05 — Bordro Excel/PDF Export + Aylık Durum Özeti + "Durum Ek Toplamı" kartı.
  - Excel: 3 sheet — "Bordrolar" (durum_ek_ucret_toplam dahil), "Durum Ek Detayı" (her bordro için 7 durum × gün/çarpan/ücret), "Aylık Durum Özeti" (tüm personel toplam).
  - PDF: Yazdırılabilir HTML — özet + her bordro altında durum breakdown.
  - 6. Özet Kart: **"Durum Ek Ücret Toplamı"** (amber renkli, üst panelde).
  - **Aylık Durum Özeti paneli**: Bordro tablosundan önce — her durum için (gün + toplam ücret) tüm personel toplamı; kayıt yoksa otomatik gizlenir.
- 2026-02-05 — Maaş Bordrosu durum çarpanları entegrasyonu + Personel Listesi Çarpanlar kolonu + Excel export genişletme.
  - Backend: `maas_bordrolari` tablosuna 2 yeni kolon (`durum_ek_ucret_toplam`, `durum_detay_json`). `hesapla_bordro_kalemleri` endpoint'i 7 durum (gelmedi/izinli/raporlu/hafta_tatili/resmi_tatil/bayram_tatili/izinsiz_gelmedi) için gün sayımı + ek ücret hesabı dönüyor. `bayram_calisti` zaten "resmi_tatil_ucreti"ne dahil olduğu için çift sayım yok. Toplam ödemeye `durum_ek_ucret_toplam` dahil ediliyor.
  - Frontend MaasBordrosu.js: Hem "Yeni Bordro" hem "Düzenle" modalında **"Durum Bazlı Ek Ücretler"** paneli — her durumun gün × çarpan × ücret breakdown'u + toplam.
  - Frontend PersonelListesi.js: Tabloya **"Çarpanlar"** kolonu (özet rozet + tooltip ile 11 çarpan detayı). Excel export'a 8 yeni durum çarpanı kolonu eklendi.
- 2026-02-05 — Personel Listesi: "Durum Çarpanları" paneli eklendi.
  - 8 puantaj durumu için günlük çarpan (Gelmedi, İzinli, Raporlu, Hafta Tatili, Resmi Tatil, Bayram Tatili, İzinsiz Gelmedi, Bayram Çalıştı). Geldi=1.0 sabit; Pazar Çalışması / Resmi Tatil Çalıştı / Fazla Mesai çarpanları zaten mevcut.
  - DB: 8 yeni kolon (`durum_carpan_*`), default değerlerle.
  - UI: Hem "Yeni Personel" hem "Düzenle" modallarında açılır/kapanır panel; her alan için "Ücret = ⌈Günlük Hak Ediş × Çarpan⌉" canlı önizleme.
  - **Maaş Bordrosu'na henüz entegre edilmedi** (sadece kayıt aşaması — entegrasyon ileride).
- 2026-02-05 — Puantaj Raporlama'ya "Eksik Çalıştığı Saat" kolonu eklendi.
  - Helper: `eksikDakikaKaydi(p)` ve `dakikayiFormatla(dk)` (zaten mevcuttu).
  - Hesaplama: `(17:00 - cikis_saati)` sadece `durum === 'geldi'` günleri için. Çıkış 17:00 veya sonrası → 0 (negatif gösterilmez). Çıkış saati boş → 0.
  - Eklendiği yerler: Personel Bazlı tablo (toplam, satır başına), Detaylı Liste (kayıt bazlı), Excel export (Personel Bazlı + Detaylı Liste sheet'leri), PDF export (Personel Bazlı + Detaylı Liste tabloları).
  - Test: Screenshot ile UI doğrulaması yapıldı. Örnek: 08:00→12:30 → "4sa 30dk", 08:00→18:00 → "-".
- 2026-02-04 — Saat→Dakika çevrim hatası giderildi (önceki sessiondan).

## ROADMAP
P2 / Backlog:
- Personel modülünün diğer alt sayfalarını geliştirme (Ana Sayfa "Yakında eklenecek")
- Diğer modüllerin (Bims Üretim, Parke, Çimento, Araçlar vs.) içeriklerinin tamamlanması
- Refactor: server.py'yi `/app/backend/routes`, `/app/backend/models` altında parçalama

## Test Kullanıcı
Bkz. `/app/memory/test_credentials.md`
