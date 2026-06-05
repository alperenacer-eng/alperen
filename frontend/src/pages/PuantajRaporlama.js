import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, Calendar, Users, Clock, FileSpreadsheet, FileText,
  TrendingUp, CalendarDays, User, Building2, RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useColumnOrder } from '@/hooks/useColumnOrder';
import { DraggableTableHead } from '@/components/DraggableTableHead';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const formatCurrency = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v || 0);

// Puantaj durum başlıkları (Puantaj sayfasıyla aynı sıra)
const DURUM_KOLONLAR = [
  { value: 'geldi', label: 'Geldi', short: 'Geldi', color: 'text-green-400' },
  { value: 'gelmedi', label: 'Gelmedi', short: 'Gelmedi', color: 'text-red-400' },
  { value: 'izinli', label: 'İzinli', short: 'İzinli', color: 'text-blue-400' },
  { value: 'raporlu', label: 'Raporlu', short: 'Raporlu', color: 'text-yellow-400' },
  { value: 'hafta_tatili', label: 'Hafta Tatili', short: 'Hf. Tatili', color: 'text-purple-400' },
  { value: 'resmi_tatil', label: 'Resmi Tatil', short: 'R. Tatil', color: 'text-orange-400' },
  { value: 'bayram_tatili', label: 'Bayram Tatili', short: 'Byr. Tatil', color: 'text-pink-400' },
  { value: 'izinsiz_gelmedi', label: 'İzinsiz Gelmedi', short: 'İzinsiz', color: 'text-rose-400' },
  { value: 'pazar_calismasi', label: 'Pazar Çalışması', short: 'Pazar Çal.', color: 'text-cyan-400' },
  { value: 'resmi_tatil_calisti', label: 'Resmi Tatil Çalıştı', short: 'R.T. Çal.', color: 'text-amber-400' },
  { value: 'bayram_calisti', label: 'Bayram Çalıştı', short: 'Byr. Çal.', color: 'text-fuchsia-400' },
];

const PuantajRaporlama = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();

  // Giriş-çıkış-fazla mesai'den çalışılan süreyi "Xsa Ydk" olarak hesaplar
  const calismaSuresi = (p) => {
    if ((p?.durum || 'geldi') !== 'geldi') return '-';
    const g = (p.giris_saati || '').trim();
    const c = (p.cikis_saati || '').trim();
    if (!g || !c) return '-';
    const [gh, gm] = g.split(':').map(Number);
    const [ch, cm] = c.split(':').map(Number);
    if (isNaN(gh) || isNaN(gm) || isNaN(ch) || isNaN(cm)) return '-';
    let toplamDakika = (ch * 60 + cm) - (gh * 60 + gm);
    if (toplamDakika < 0) toplamDakika += 24 * 60; // gece vardiyası desteği
    const fmDakika = Math.round(((p.fazla_mesai || 0) * 60));
    toplamDakika -= fmDakika;
    if (toplamDakika < 0) toplamDakika = 0;
    const sa = Math.floor(toplamDakika / 60);
    const dk = toplamDakika % 60;
    return `${sa}sa ${dk.toString().padStart(2, '0')}dk`;
  };

  // Bir kayıt için eksik çalışma dakikası (yalnızca 'geldi' günlerinde, 17:00 - cikis_saati)
  // Çıkış 17:00 veya sonrası ise 0 döner. Çıkış saati yoksa 0 döner.
  const HEDEF_CIKIS_DK = 17 * 60; // 17:00 = 1020 dk
  const eksikDakikaKaydi = (p) => {
    if ((p?.durum || 'geldi') !== 'geldi') return 0;
    const c = (p.cikis_saati || '').trim();
    if (!c) return 0;
    const [ch, cm] = c.split(':').map(Number);
    if (isNaN(ch) || isNaN(cm)) return 0;
    const cikisDk = ch * 60 + cm;
    const eksik = HEDEF_CIKIS_DK - cikisDk;
    return eksik > 0 ? eksik : 0;
  };

  // Dakikayı "Xsa Ydk" formatına çevirir (0 ise '-')
  const dakikayiFormatla = (dk) => {
    if (!dk || dk <= 0) return '-';
    const sa = Math.floor(dk / 60);
    const d = dk % 60;
    return `${sa}sa ${d.toString().padStart(2, '0')}dk`;
  };

  
  const [puantajlar, setPuantajlar] = useState([]);
  const [personeller, setPersoneller] = useState([]);
  const [tesisler, setTesisler] = useState([]);
  const [loading, setLoading] = useState(true);
  // Aktif sekme — Excel/PDF export'ları aktif sekmeye göre çalışır
  const [activeTab, setActiveTab] = useState('personel');
  
  // Tarih aralığı
  const [periodType, setPeriodType] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const headers = { Authorization: `Bearer ${token}` };

  const getDateRange = useCallback(() => {
    const today = new Date();
    let start, end;
    
    switch (periodType) {
      case 'daily':
        start = new Date(today);
        end = new Date(today);
        break;
      case 'weekly':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay() + 1);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'monthly':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'custom':
        start = startDate ? new Date(startDate) : new Date(today.getFullYear(), today.getMonth(), 1);
        end = endDate ? new Date(endDate) : new Date();
        break;
      default:
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date();
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }, [periodType, startDate, endDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [puantajRes, personelRes, tesisRes] = await Promise.all([
        axios.get(`${API_URL}/puantaj`, { headers }),
        axios.get(`${API_URL}/personeller`, { headers }),
        axios.get(`${API_URL}/tesisler`, { headers })
      ]);
      setPuantajlar(puantajRes.data);
      setPersoneller(personelRes.data.filter(p => p.aktif));
      setTesisler(tesisRes.data);
    } catch (e) {
      console.error(e);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!currentModule || currentModule.id !== 'personel') {
      navigate('/');
      return;
    }
    fetchData();
    
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, [currentModule, fetchData, navigate]);

  const { start, end } = getDateRange();
  const filteredPuantajlar = puantajlar.filter(p => {
    return p.tarih >= start && p.tarih <= end;
  });

  // Özet İstatistikler
  const stats = {
    toplamKayit: filteredPuantajlar.length,
    toplamFazlaMesai: filteredPuantajlar.reduce((sum, p) => sum + (p.fazla_mesai || 0), 0),
    benzersizGunSayisi: [...new Set(filteredPuantajlar.map(p => p.tarih))].length,
    benzersizPersonelSayisi: [...new Set(filteredPuantajlar.map(p => p.personel_id))].length,
    benzersizTesisSayisi: [...new Set(filteredPuantajlar.map(p => p.tesis_adi).filter(Boolean))].length
  };

  // Toplam hak edilen ücret hesaplaması — Belirleme'deki çarpan/override değerlerini baz alır.
  // Bordro hesabı ile aynı mantık: F.Mesai saatlik (toplam saat), Pazar/R.Tatil günlük, diğer 7 durum günlük.
  // 'pazar_calismasi', 'resmi_tatil_calisti', 'bayram_calisti' → R.Tatil Çal. veya Pazar Çal. ücretine sayılır.
  const hesaplaPersonelHakedilen = (personel, puantajlari) => {
    const maas = parseFloat(personel.maas) || 0;
    const gunluk = maas / 30;
    const saatlik = gunluk / 8;
    const fc = parseFloat(personel.fazla_mesai_carpan ?? 1.5);
    const pc = parseFloat(personel.pazar_carpan ?? 2.0);
    const rc = parseFloat(personel.resmi_tatil_carpan ?? 2.0);
    const applyOvr = (ovr, fallback) => (ovr !== null && ovr !== undefined && ovr !== '' && !isNaN(parseFloat(ovr))) ? parseFloat(ovr) : fallback;
    const fmBirim = applyOvr(personel.ucret_override_fazla_mesai,         Math.ceil(saatlik * fc));
    const pzBirim = applyOvr(personel.ucret_override_pazar,                Math.ceil(gunluk * pc));
    const rtBirim = applyOvr(personel.ucret_override_resmi_tatil_calisti,  Math.ceil(gunluk * rc));
    let toplamFm = 0, pazarGun = 0, rtGun = 0;
    const durumGun = { gelmedi:0, izinli:0, raporlu:0, hafta_tatili:0, resmi_tatil:0, bayram_tatili:0, izinsiz_gelmedi:0 };
    puantajlari.forEach(p => {
      const durum = (p.durum || 'geldi').toLowerCase();
      const fm = parseFloat(p.fazla_mesai) || 0;
      let haftaGunu = -1;
      try { haftaGunu = new Date(p.tarih).getDay(); } catch (_) {}
      // Pazar günü mantığı
      if (durum === 'pazar_calismasi') pazarGun += 1;
      else if (haftaGunu === 0 && durum === 'geldi') pazarGun += 1;
      else if (durum === 'resmi_tatil_calisti' || durum === 'bayram_calisti') rtGun += 1;
      else if ((durum === 'resmi_tatil' || durum === 'bayram_tatili') && p.giris_saati && p.cikis_saati) rtGun += 1;
      else if (durumGun[durum] !== undefined) durumGun[durum] += 1;
      if (fm > 0 && ['geldi','resmi_tatil','bayram_tatili','pazar_calismasi','resmi_tatil_calisti','bayram_calisti'].includes(durum)) {
        toplamFm += fm;
      }
    });
    const fmUcret = toplamFm > 0 ? Math.ceil(fmBirim * toplamFm) : 0;
    const pzUcret = pazarGun > 0 ? Math.ceil(pzBirim * pazarGun) : 0;
    const rtUcret = rtGun > 0 ? Math.ceil(rtBirim * rtGun) : 0;
    // 7 durum bazlı ek ücret
    const durumMap = [
      ['gelmedi',         personel.durum_carpan_gelmedi,         personel.ucret_override_gelmedi,         0.0],
      ['izinli',          personel.durum_carpan_izinli,          personel.ucret_override_izinli,          1.0],
      ['raporlu',         personel.durum_carpan_raporlu,         personel.ucret_override_raporlu,         0.0],
      ['hafta_tatili',    personel.durum_carpan_hafta_tatili,    personel.ucret_override_hafta_tatili,    1.0],
      ['resmi_tatil',     personel.durum_carpan_resmi_tatil,     personel.ucret_override_resmi_tatil,     1.0],
      ['bayram_tatili',   personel.durum_carpan_bayram_tatili,   personel.ucret_override_bayram_tatili,   1.0],
      ['izinsiz_gelmedi', personel.durum_carpan_izinsiz_gelmedi, personel.ucret_override_izinsiz_gelmedi, 0.0],
    ];
    let durumEk = 0;
    durumMap.forEach(([k, carpan, ovr, defC]) => {
      const gun = durumGun[k] || 0;
      if (gun <= 0) return;
      const c = parseFloat(carpan ?? defC);
      const birim = applyOvr(ovr, Math.ceil(gunluk * c));
      if (birim > 0) durumEk += Math.ceil(birim * gun);
    });
    return { fmUcret, pzUcret, rtUcret, durumEk, toplam: fmUcret + pzUcret + rtUcret + durumEk };
  };

  // Personel Bazlı Rapor (tesis bilgisiyle + her durum sayısı + eksik çalışma saati + hak edilen toplam)
  const personelRaporu = personeller.map(personel => {
    const personelPuantajlari = filteredPuantajlar.filter(p => p.personel_id === personel.id);
    const calisilanTesisler = [...new Set(personelPuantajlari.map(p => p.tesis_adi).filter(Boolean))];
    // Her durumun toplamını hesapla
    const durumSayilari = {};
    DURUM_KOLONLAR.forEach(d => { durumSayilari[d.value] = 0; });
    personelPuantajlari.forEach(p => {
      const d = (p.durum || 'geldi');
      if (durumSayilari[d] !== undefined) durumSayilari[d] += 1;
    });
    // Tüm 'geldi' günlerindeki eksik çalışma dakikalarının toplamı (17:00 - cikis_saati)
    const toplamEksikDakika = personelPuantajlari.reduce((sum, p) => sum + eksikDakikaKaydi(p), 0);
    const hak = hesaplaPersonelHakedilen(personel, personelPuantajlari);
    return {
      id: personel.id,
      ad_soyad: personel.ad_soyad,
      departman: personel.departman || '-',
      maas: personel.maas || 0,
      calismaGunu: personelPuantajlari.length,
      toplamFazlaMesai: personelPuantajlari.reduce((sum, p) => sum + (p.fazla_mesai || 0), 0),
      tesisler: calisilanTesisler,
      durumSayilari,
      toplamEksikDakika,
      hakedilen: hak,
    };
  }).filter(p => p.calismaGunu > 0).sort((a, b) => b.calismaGunu - a.calismaGunu);

  // Tesis Bazlı Rapor
  const tesisRaporu = (() => {
    const tesisMap = {};
    filteredPuantajlar.forEach(p => {
      const tesisAdi = p.tesis_adi || 'Belirtilmemiş';
      if (!tesisMap[tesisAdi]) {
        tesisMap[tesisAdi] = {
          tesis_adi: tesisAdi,
          kayitSayisi: 0,
          personeller: new Set(),
          toplamFazlaMesai: 0
        };
      }
      tesisMap[tesisAdi].kayitSayisi++;
      tesisMap[tesisAdi].personeller.add(p.personel_adi);
      tesisMap[tesisAdi].toplamFazlaMesai += (p.fazla_mesai || 0);
    });
    return Object.values(tesisMap).map(t => ({
      ...t,
      personelSayisi: t.personeller.size,
      personelListesi: [...t.personeller]
    })).sort((a, b) => b.kayitSayisi - a.kayitSayisi);
  })();

  // Gün Bazlı Rapor
  const gunler = [...new Set(filteredPuantajlar.map(p => p.tarih))].sort();
  const gunRaporu = gunler.map(tarih => {
    const gunPuantajlari = filteredPuantajlar.filter(p => p.tarih === tarih);
    return {
      tarih,
      personelSayisi: gunPuantajlari.length,
      toplamFazlaMesai: gunPuantajlari.reduce((sum, p) => sum + (p.fazla_mesai || 0), 0)
    };
  });

  // Excel Export - Personel Bazlı tabloyu birebir yansıtır (xlsx)
  const exportToExcel = () => {
    try {
      // 1) Personel Bazlı sheet (ekrandaki tablo ile aynı)
      const personelHeader = [
        '#',
        'Personel Adı',
        'Maaş (₺)',
        'Departman',
        'Çal. Günü',
        ...DURUM_KOLONLAR.map(d => d.label),
        'Fazla Mesai (saat)',
        'Eksik Çal. Saat',
        'F.Mesai Ücreti (₺)',
        'Pazar Ücreti (₺)',
        'R.Tatil Çal. Ücreti (₺)',
        'Durum Ek Ücret (₺)',
        'Hak Edilen Toplam (₺)',
        'Çalıştığı Tesisler',
      ];
      const personelRows = personelRaporu.map((p, idx) => [
        idx + 1,
        p.ad_soyad,
        Number((p.maas || 0).toFixed(2)),
        p.departman,
        p.calismaGunu,
        ...DURUM_KOLONLAR.map(d => p.durumSayilari[d.value] || 0),
        Number(p.toplamFazlaMesai.toFixed(1)),
        dakikayiFormatla(p.toplamEksikDakika),
        Number((p.hakedilen.fmUcret || 0).toFixed(2)),
        Number((p.hakedilen.pzUcret || 0).toFixed(2)),
        Number((p.hakedilen.rtUcret || 0).toFixed(2)),
        Number((p.hakedilen.durumEk || 0).toFixed(2)),
        Number((p.hakedilen.toplam || 0).toFixed(2)),
        p.tesisler.join(', ') || '-',
      ]);
      const wsPersonel = XLSX.utils.aoa_to_sheet([personelHeader, ...personelRows]);

      // 2) Tesis Bazlı sheet
      const tesisHeader = ['Tesis Adı', 'Kayıt Sayısı', 'Personel Sayısı', 'Toplam Fazla Mesai (saat)', 'Çalışan Personeller'];
      const tesisRows = tesisRaporu.map(t => [
        t.tesis_adi,
        t.kayitSayisi,
        t.personelSayisi,
        Number(t.toplamFazlaMesai.toFixed(1)),
        t.personelListesi.join(', '),
      ]);
      const wsTesis = XLSX.utils.aoa_to_sheet([tesisHeader, ...tesisRows]);

      // 3) Gün Bazlı sheet
      const gunHeader = ['Tarih', 'Gün', 'Personel Sayısı', 'Toplam Fazla Mesai (saat)'];
      const gunRows = gunRaporu.map(g => {
        const d = new Date(g.tarih);
        const gunAdi = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][d.getDay()];
        return [g.tarih, gunAdi, g.personelSayisi, Number(g.toplamFazlaMesai.toFixed(1))];
      });
      const wsGun = XLSX.utils.aoa_to_sheet([gunHeader, ...gunRows]);

      // 4) Detaylı Liste sheet (ekrandaki Detaylı tablosu ile aynı: tüm durum kolonları)
      const detayHeader = [
        'Tarih', 'Personel', 'Tesis', 'Giriş', 'Çıkış', 'Fazla Mesai (saat)', 'Çalışılan Süre', 'Eksik Çal.',
        ...DURUM_KOLONLAR.map(d => d.label),
        'Not',
      ];
      const detayRows = [...filteredPuantajlar]
        .sort((a, b) => b.tarih.localeCompare(a.tarih))
        .map(p => {
          const durum = p.durum || 'geldi';
          return [
            p.tarih,
            p.personel_adi || '',
            p.tesis_adi || '-',
            p.giris_saati || '-',
            p.cikis_saati || '-',
            Number((p.fazla_mesai || 0).toFixed(1)),
            calismaSuresi(p),
            dakikayiFormatla(eksikDakikaKaydi(p)),
            ...DURUM_KOLONLAR.map(d => (durum === d.value ? 1 : 0)),
            p.notlar || '-',
          ];
        });
      const wsDetay = XLSX.utils.aoa_to_sheet([detayHeader, ...detayRows]);

      const wb = XLSX.utils.book_new();

      // Aktif sekmeye göre sadece o tabloyu indir
      if (activeTab === 'personel') {
        XLSX.utils.book_append_sheet(wb, wsPersonel, 'Personel Bazlı');
      } else if (activeTab === 'tesis') {
        XLSX.utils.book_append_sheet(wb, wsTesis, 'Tesis Bazlı');
      } else if (activeTab === 'gun') {
        XLSX.utils.book_append_sheet(wb, wsGun, 'Gün Bazlı');
      } else if (activeTab === 'detay') {
        XLSX.utils.book_append_sheet(wb, wsDetay, 'Detaylı Liste');
      } else {
        // Fallback: tüm sekmeleri ekle
        XLSX.utils.book_append_sheet(wb, wsPersonel, 'Personel Bazlı');
        XLSX.utils.book_append_sheet(wb, wsTesis, 'Tesis Bazlı');
        XLSX.utils.book_append_sheet(wb, wsGun, 'Gün Bazlı');
        XLSX.utils.book_append_sheet(wb, wsDetay, 'Detaylı Liste');
      }

      const tabAdi = { personel: 'personel_bazli', tesis: 'tesis_bazli', gun: 'gun_bazli', detay: 'detayli_liste' }[activeTab] || 'rapor';
      XLSX.writeFile(wb, `puantaj_${tabAdi}_${start}_${end}.xlsx`);
      toast.success('Excel raporu indirildi');
    } catch (e) {
      console.error(e);
      toast.error('Excel oluşturulurken hata oluştu');
    }
  };

  // PDF Export — aktif sekmeye göre rapor
  const exportToPDF = () => {
    const tabBasliklari = {
      personel: 'Personel Bazlı Rapor',
      tesis: 'Tesis Bazlı Rapor',
      gun: 'Gün Bazlı Rapor',
      detay: 'Detaylı Kayıt Listesi',
    };

    let tableHtml = '';
    if (activeTab === 'personel') {
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Personel Adı</th>
              <th>Maaş (₺)</th>
              <th>Departman</th>
              <th>Çal. Günü</th>
              ${DURUM_KOLONLAR.map(d => `<th>${d.short}</th>`).join('')}
              <th>Fazla Mesai</th>
              <th>Eksik Çal.</th>
              <th>Hak Edilen (₺)</th>
              <th>Çalıştığı Tesisler</th>
            </tr>
          </thead>
          <tbody>
            ${personelRaporu.map(p => `
              <tr>
                <td>${p.ad_soyad}</td>
                <td style="text-align:right;color:#059669">${formatCurrency(p.maas || 0)}</td>
                <td>${p.departman}</td>
                <td>${p.calismaGunu}</td>
                ${DURUM_KOLONLAR.map(d => `<td style="text-align:center">${p.durumSayilari[d.value] || 0}</td>`).join('')}
                <td>${p.toplamFazlaMesai.toFixed(1)} saat</td>
                <td>${dakikayiFormatla(p.toplamEksikDakika)}</td>
                <td style="text-align:right;font-weight:600;color:#059669">${formatCurrency(p.hakedilen.toplam)}</td>
                <td class="tesis-list">${p.tesisler.join(', ') || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    } else if (activeTab === 'tesis') {
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Tesis Adı</th>
              <th>Kayıt Sayısı</th>
              <th>Personel Sayısı</th>
              <th>Fazla Mesai</th>
              <th>Çalışan Personeller</th>
            </tr>
          </thead>
          <tbody>
            ${tesisRaporu.map(t => `
              <tr>
                <td>${t.tesis_adi}</td>
                <td>${t.kayitSayisi}</td>
                <td>${t.personelSayisi}</td>
                <td>${t.toplamFazlaMesai.toFixed(1)} saat</td>
                <td class="tesis-list">${t.personelListesi.join(', ')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    } else if (activeTab === 'gun') {
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Gün</th>
              <th>Personel Sayısı</th>
              <th>Fazla Mesai</th>
            </tr>
          </thead>
          <tbody>
            ${gunRaporu.map(g => {
              const date = new Date(g.tarih);
              const gunAdi = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][date.getDay()];
              return `
                <tr>
                  <td>${g.tarih}</td>
                  <td>${gunAdi}</td>
                  <td>${g.personelSayisi}</td>
                  <td>${g.toplamFazlaMesai.toFixed(1)} saat</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>`;
    } else if (activeTab === 'detay') {
      const detaySorted = [...filteredPuantajlar].sort((a, b) => b.tarih.localeCompare(a.tarih));
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Personel</th>
              <th>Tesis</th>
              <th>Giriş</th>
              <th>Çıkış</th>
              <th>F. Mesai</th>
              <th>Çalışılan Süre</th>
              <th>Eksik Çal.</th>
              ${DURUM_KOLONLAR.map(d => `<th>${d.short}</th>`).join('')}
              <th>Not</th>
            </tr>
          </thead>
          <tbody>
            ${detaySorted.map(p => {
              const durum = p.durum || 'geldi';
              return `
              <tr>
                <td>${p.tarih}</td>
                <td>${p.personel_adi || ''}</td>
                <td>${p.tesis_adi || '-'}</td>
                <td>${p.giris_saati || '-'}</td>
                <td>${p.cikis_saati || '-'}</td>
                <td>${(p.fazla_mesai || 0).toFixed(1)}</td>
                <td>${calismaSuresi(p)}</td>
                <td>${dakikayiFormatla(eksikDakikaKaydi(p))}</td>
                ${DURUM_KOLONLAR.map(d => `<td style="text-align:center">${durum === d.value ? '✓' : ''}</td>`).join('')}
                <td>${p.notlar || '-'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Puantaj Raporu - ${tabBasliklari[activeTab] || ''}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          h2 { color: #666; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          tr:nth-child(even) { background-color: #fafafa; }
          .header-info { color: #666; margin-bottom: 20px; }
          .tesis-list { font-size: 11px; color: #666; }
        </style>
      </head>
      <body>
        <h1>Puantaj Raporu</h1>
        <div class="header-info">
          <strong>Tarih Aralığı:</strong> ${start} - ${end}
        </div>
        <h2>${tabBasliklari[activeTab] || 'Rapor'}</h2>
        ${tableHtml}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
    toast.success('PDF raporu hazırlandı');
  };

  // ===========================================================
  // SÜTUN TANIMLARI (Sürükle-Bırak ile Yeniden Sıralanabilir)
  // ===========================================================

  // 1) Personel Bazlı tablo sütunları
  const personelColumns = React.useMemo(() => [
    {
      key: 'no', label: '#', headCls: 'text-white font-semibold',
      renderCell: (p, idx) => <TableCell key="no" className="text-slate-200">{idx + 1}</TableCell>
    },
    {
      key: 'ad', label: 'Personel Adı', headCls: 'text-white font-semibold min-w-[180px]',
      renderCell: (p) => <TableCell key="ad" className="font-semibold text-white">{p.ad_soyad}</TableCell>
    },
    {
      key: 'maas', label: 'Maaş', headCls: 'text-emerald-300 whitespace-nowrap',
      renderCell: (p) => <TableCell key="maas" className="text-emerald-300 font-medium whitespace-nowrap">{formatCurrency(p.maas)}</TableCell>
    },
    {
      key: 'dep', label: 'Departman', headCls: 'text-slate-300 min-w-[120px]',
      renderCell: (p) => <TableCell key="dep" className="text-slate-300">{p.departman}</TableCell>
    },
    {
      key: 'gun', label: 'Çal. Günü', headCls: 'text-slate-300',
      renderCell: (p) => <TableCell key="gun" className="text-blue-400 font-medium">{p.calismaGunu}</TableCell>
    },
    ...DURUM_KOLONLAR.map(d => ({
      key: `durum_${d.value}`,
      label: d.short,
      headTitle: d.label,
      headCls: `${d.color} text-center whitespace-nowrap`,
      renderCell: (p) => {
        const val = p.durumSayilari[d.value] || 0;
        return <TableCell key={`durum_${d.value}`} className={`text-center ${val > 0 ? d.color + ' font-semibold' : 'text-slate-600'}`}>{val}</TableCell>;
      }
    })),
    {
      key: 'fm', label: 'Fazla Mesai', headCls: 'text-slate-300',
      renderCell: (p) => <TableCell key="fm" className="text-orange-400 font-medium whitespace-nowrap">{p.toplamFazlaMesai.toFixed(1)} sa</TableCell>
    },
    {
      key: 'eksik', label: 'Eksik Çal.',
      headTitle: "17:00'dan önce çıkılan toplam süre (sadece 'Geldi' günlerinde)",
      headCls: 'text-rose-300 whitespace-nowrap',
      renderCell: (p) => (
        <TableCell key="eksik" className={`whitespace-nowrap font-medium ${p.toplamEksikDakika > 0 ? 'text-rose-400' : 'text-slate-600'}`} data-testid={`eksik-cal-saat-${p.id}`}>
          {dakikayiFormatla(p.toplamEksikDakika)}
        </TableCell>
      )
    },
    {
      key: 'hak', label: 'Hak Edilen Ücret',
      headTitle: "Belirleme'deki çarpan/override değerlerine göre hak edilen toplam ücret",
      headCls: 'text-emerald-300 whitespace-nowrap',
      renderCell: (p) => (
        <TableCell key="hak"
          className="whitespace-nowrap text-emerald-300 font-semibold"
          title={`F.Mesai: ${formatCurrency(p.hakedilen.fmUcret)} · Pazar: ${formatCurrency(p.hakedilen.pzUcret)} · R.Tatil Çal.: ${formatCurrency(p.hakedilen.rtUcret)} · Durum Ek: ${formatCurrency(p.hakedilen.durumEk)}`}
          data-testid={`hakedilen-toplam-${p.id}`}>
          {formatCurrency(p.hakedilen.toplam)}
        </TableCell>
      )
    },
    {
      key: 'tesisler', label: 'Çalıştığı Tesisler', headCls: 'text-slate-300 min-w-[180px]',
      renderCell: (p) => (
        <TableCell key="tesisler">
          {p.tesisler.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {p.tesisler.map((tesis, i) => (
                <span key={i} className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full whitespace-nowrap">
                  {tesis}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-slate-500">-</span>
          )}
        </TableCell>
      )
    },
  ], []);

  // 2) Tesis Bazlı tablo sütunları
  const tesisColumns = React.useMemo(() => [
    {
      key: 'tesis', label: 'Tesis Adı', headCls: 'text-white font-semibold',
      renderCell: (t) => (
        <TableCell key="tesis" className="font-medium text-white">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-400" />
            {t.tesis_adi}
          </div>
        </TableCell>
      )
    },
    {
      key: 'kayit', label: 'Kayıt Sayısı', headCls: 'text-slate-300',
      renderCell: (t) => <TableCell key="kayit" className="text-blue-400 font-medium">{t.kayitSayisi}</TableCell>
    },
    {
      key: 'personel', label: 'Personel Sayısı', headCls: 'text-slate-300',
      renderCell: (t) => <TableCell key="personel" className="text-green-400 font-medium">{t.personelSayisi} kişi</TableCell>
    },
    {
      key: 'fm', label: 'Toplam Fazla Mesai', headCls: 'text-slate-300',
      renderCell: (t) => <TableCell key="fm" className="text-orange-400 font-medium">{t.toplamFazlaMesai.toFixed(1)} saat</TableCell>
    },
    {
      key: 'personeller', label: 'Çalışan Personeller', headCls: 'text-slate-300',
      renderCell: (t) => (
        <TableCell key="personeller">
          <div className="flex flex-wrap gap-1 max-w-md">
            {t.personelListesi.map((personel, i) => (
              <span key={i} className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                {personel}
              </span>
            ))}
          </div>
        </TableCell>
      )
    },
  ], []);

  // 3) Gün Bazlı tablo sütunları
  const gunColumns = React.useMemo(() => [
    {
      key: 'tarih', label: 'Tarih', headCls: 'text-white font-semibold',
      renderCell: (g) => <TableCell key="tarih" className="font-medium text-white">{g.tarih}</TableCell>
    },
    {
      key: 'gun_adi', label: 'Gün', headCls: 'text-slate-300',
      renderCell: (g) => {
        const date = new Date(g.tarih);
        const gunAdi = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][date.getDay()];
        return <TableCell key="gun_adi" className="text-slate-300">{gunAdi}</TableCell>;
      }
    },
    {
      key: 'personel_sayisi', label: 'Personel Sayısı', headCls: 'text-slate-300',
      renderCell: (g) => <TableCell key="personel_sayisi" className="text-green-400 font-medium">{g.personelSayisi} kişi</TableCell>
    },
    {
      key: 'fm', label: 'Toplam Fazla Mesai', headCls: 'text-slate-300',
      renderCell: (g) => <TableCell key="fm" className="text-orange-400 font-medium">{g.toplamFazlaMesai.toFixed(1)} saat</TableCell>
    },
  ], []);

  // 4) Detaylı Liste tablo sütunları
  const detayColumns = React.useMemo(() => [
    {
      key: 'tarih', label: 'Tarih', headCls: 'text-white font-semibold min-w-[110px]',
      renderCell: (p) => <TableCell key="tarih" className="text-white">{p.tarih}</TableCell>
    },
    {
      key: 'personel', label: 'Personel', headCls: 'text-white font-semibold min-w-[160px]',
      renderCell: (p) => <TableCell key="personel" className="font-semibold text-white">{p.personel_adi}</TableCell>
    },
    {
      key: 'tesis', label: 'Tesis', headCls: 'text-slate-300 min-w-[140px]',
      renderCell: (p) => <TableCell key="tesis" className="text-cyan-400">{p.tesis_adi || '-'}</TableCell>
    },
    {
      key: 'giris', label: 'Giriş', headCls: 'text-slate-300',
      renderCell: (p) => <TableCell key="giris" className="text-green-400">{p.giris_saati || '-'}</TableCell>
    },
    {
      key: 'cikis', label: 'Çıkış', headCls: 'text-slate-300',
      renderCell: (p) => <TableCell key="cikis" className="text-red-400">{p.cikis_saati || '-'}</TableCell>
    },
    {
      key: 'fm', label: 'F. Mesai', headCls: 'text-slate-300 whitespace-nowrap',
      renderCell: (p) => <TableCell key="fm" className="text-orange-400 whitespace-nowrap">{p.fazla_mesai?.toFixed(1) || '0'}</TableCell>
    },
    {
      key: 'sure', label: 'Çalışılan Süre',
      headCls: 'text-emerald-300 whitespace-nowrap',
      headTitle: "Çıkış - Giriş - Fazla Mesai (sadece 'Geldi' için)",
      renderCell: (p) => <TableCell key="sure" className="text-emerald-300 font-medium whitespace-nowrap">{calismaSuresi(p)}</TableCell>
    },
    {
      key: 'eksik', label: 'Eksik Çal.',
      headCls: 'text-rose-300 whitespace-nowrap',
      headTitle: "17:00 - Çıkış Saati (sadece 'Geldi' için)",
      renderCell: (p) => <TableCell key="eksik" className={`whitespace-nowrap font-medium ${eksikDakikaKaydi(p) > 0 ? 'text-rose-400' : 'text-slate-700'}`}>{dakikayiFormatla(eksikDakikaKaydi(p))}</TableCell>
    },
    ...DURUM_KOLONLAR.map(d => ({
      key: `durum_${d.value}`,
      label: d.short,
      headTitle: d.label,
      headCls: `${d.color} text-center whitespace-nowrap`,
      renderCell: (p) => {
        const durum = p.durum || 'geldi';
        return (
          <TableCell key={`durum_${d.value}`} className={`text-center ${durum === d.value ? d.color + ' font-bold' : 'text-slate-700'}`}>
            {durum === d.value ? '✓' : '-'}
          </TableCell>
        );
      }
    })),
    {
      key: 'not', label: 'Not', headCls: 'text-slate-300 min-w-[140px]',
      renderCell: (p) => <TableCell key="not" className="text-slate-400 text-sm">{p.notlar || '-'}</TableCell>
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  // Sütun sıraları (localStorage'da saklanır)
  const personelColKeys = React.useMemo(() => personelColumns.map(c => c.key), [personelColumns]);
  const tesisColKeys = React.useMemo(() => tesisColumns.map(c => c.key), [tesisColumns]);
  const gunColKeys = React.useMemo(() => gunColumns.map(c => c.key), [gunColumns]);
  const detayColKeys = React.useMemo(() => detayColumns.map(c => c.key), [detayColumns]);

  const personelOrder = useColumnOrder('puantaj-rap-personel-cols', personelColKeys);
  const tesisOrder = useColumnOrder('puantaj-rap-tesis-cols', tesisColKeys);
  const gunOrder = useColumnOrder('puantaj-rap-gun-cols', gunColKeys);
  const detayOrder = useColumnOrder('puantaj-rap-detay-cols', detayColKeys);

  // Sıralı sütunlar
  const orderedPersonelCols = personelOrder.order.map(k => personelColumns.find(c => c.key === k)).filter(Boolean);
  const orderedTesisCols = tesisOrder.order.map(k => tesisColumns.find(c => c.key === k)).filter(Boolean);
  const orderedGunCols = gunOrder.order.map(k => gunColumns.find(c => c.key === k)).filter(Boolean);
  const orderedDetayCols = detayOrder.order.map(k => detayColumns.find(c => c.key === k)).filter(Boolean);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Geri
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Puantaj Raporlama</h1>
            <p className="text-slate-400">Personel çalışma ve mesai raporları</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToExcel} variant="outline" className="border-green-600 text-green-400 hover:bg-green-600/20">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button onClick={exportToPDF} variant="outline" className="border-red-600 text-red-400 hover:bg-red-600/20">
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Tarih Filtresi */}
      <Card className="glass-effect border-slate-800 mb-6">
        <CardHeader className="border-b border-slate-800 pb-4">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Tarih Aralığı
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="text-slate-300">Başlangıç Tarihi</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPeriodType('custom');
                }}
                className="bg-slate-950 border-slate-700 mt-1 w-44"
              />
            </div>
            <div>
              <Label className="text-slate-300">Bitiş Tarihi</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPeriodType('custom');
                }}
                className="bg-slate-950 border-slate-700 mt-1 w-44"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={periodType === 'daily' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodType('daily')}
                className={periodType === 'daily' ? 'bg-orange-600' : 'border-slate-700'}
              >
                Bugün
              </Button>
              <Button 
                variant={periodType === 'weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodType('weekly')}
                className={periodType === 'weekly' ? 'bg-orange-600' : 'border-slate-700'}
              >
                Bu Hafta
              </Button>
              <Button 
                variant={periodType === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodType('monthly')}
                className={periodType === 'monthly' ? 'bg-orange-600' : 'border-slate-700'}
              >
                Bu Ay
              </Button>
            </div>
            <div className="text-slate-400 text-sm ml-auto bg-slate-800 px-3 py-2 rounded-lg">
              Seçili: <span className="text-white font-medium">{start}</span> - <span className="text-white font-medium">{end}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Özet İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Toplam Kayıt</p>
                <p className="text-2xl font-bold text-white">{stats.toplamKayit}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Personel Sayısı</p>
                <p className="text-2xl font-bold text-white">{stats.benzersizPersonelSayisi}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Building2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Tesis Sayısı</p>
                <p className="text-2xl font-bold text-white">{stats.benzersizTesisSayisi}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <CalendarDays className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Gün Sayısı</p>
                <p className="text-2xl font-bold text-white">{stats.benzersizGunSayisi}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Toplam Fazla Mesai</p>
                <p className="text-2xl font-bold text-orange-500">{stats.toplamFazlaMesai.toFixed(1)} Saat</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rapor Tabları */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 mb-4">
          <TabsTrigger value="personel" className="data-[state=active]:bg-orange-600">
            <User className="w-4 h-4 mr-2" />
            Personel Bazlı
          </TabsTrigger>
          <TabsTrigger value="tesis" className="data-[state=active]:bg-orange-600">
            <Building2 className="w-4 h-4 mr-2" />
            Tesis Bazlı
          </TabsTrigger>
          <TabsTrigger value="gun" className="data-[state=active]:bg-orange-600">
            <CalendarDays className="w-4 h-4 mr-2" />
            Gün Bazlı
          </TabsTrigger>
          <TabsTrigger value="detay" className="data-[state=active]:bg-orange-600">
            <FileText className="w-4 h-4 mr-2" />
            Detaylı Liste
          </TabsTrigger>
        </TabsList>

        {/* Personel Bazlı Rapor */}
        <TabsContent value="personel">
          <Card className="glass-effect border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg text-white">Personel Bazlı Rapor</CardTitle>
                <Button onClick={personelOrder.reset} size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:text-white h-8 text-xs">
                  <RotateCcw className="w-3 h-3 mr-1" /> Sütun Sırasını Sıfırla
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Sütun başlıklarını sürükleyerek yer değiştirebilirsiniz.</p>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
              ) : personelRaporu.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Bu dönemde kayıt bulunmuyor</div>
              ) : (
                <ScrollArea className="max-h-[500px] w-full">
                  <div className="w-max min-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 bg-slate-900/50">
                        {orderedPersonelCols.map(col => (
                          <DraggableTableHead
                            key={col.key}
                            colKey={col.key}
                            onReorder={personelOrder.reorder}
                            className={col.headCls}
                            title={col.headTitle}
                          >
                            {col.label}
                          </DraggableTableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {personelRaporu.map((p, idx) => (
                        <TableRow key={p.id} className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'}`}>
                          {orderedPersonelCols.map(col => (
                            <React.Fragment key={col.key}>{col.renderCell(p, idx)}</React.Fragment>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tesis Bazlı Rapor */}
        <TabsContent value="tesis">
          <Card className="glass-effect border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg text-white">Tesis Bazlı Rapor</CardTitle>
                <Button onClick={tesisOrder.reset} size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:text-white h-8 text-xs">
                  <RotateCcw className="w-3 h-3 mr-1" /> Sütun Sırasını Sıfırla
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Sütun başlıklarını sürükleyerek yer değiştirebilirsiniz.</p>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
              ) : tesisRaporu.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Bu dönemde kayıt bulunmuyor</div>
              ) : (
                <ScrollArea className="max-h-[500px] w-full">
                  <div className="w-max min-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 bg-slate-900/50">
                        {orderedTesisCols.map(col => (
                          <DraggableTableHead
                            key={col.key}
                            colKey={col.key}
                            onReorder={tesisOrder.reorder}
                            className={col.headCls}
                            title={col.headTitle}
                          >
                            {col.label}
                          </DraggableTableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tesisRaporu.map((t, idx) => (
                        <TableRow key={t.tesis_adi} className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'}`}>
                          {orderedTesisCols.map(col => (
                            <React.Fragment key={col.key}>{col.renderCell(t, idx)}</React.Fragment>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gün Bazlı Rapor */}
        <TabsContent value="gun">
          <Card className="glass-effect border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg text-white">Gün Bazlı Rapor</CardTitle>
                <Button onClick={gunOrder.reset} size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:text-white h-8 text-xs">
                  <RotateCcw className="w-3 h-3 mr-1" /> Sütun Sırasını Sıfırla
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Sütun başlıklarını sürükleyerek yer değiştirebilirsiniz.</p>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
              ) : gunRaporu.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Bu dönemde kayıt bulunmuyor</div>
              ) : (
                <ScrollArea className="max-h-[500px] w-full">
                  <div className="w-max min-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 bg-slate-900/50">
                        {orderedGunCols.map(col => (
                          <DraggableTableHead
                            key={col.key}
                            colKey={col.key}
                            onReorder={gunOrder.reorder}
                            className={col.headCls}
                            title={col.headTitle}
                          >
                            {col.label}
                          </DraggableTableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gunRaporu.map((g, idx) => (
                        <TableRow key={g.tarih} className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'}`}>
                          {orderedGunCols.map(col => (
                            <React.Fragment key={col.key}>{col.renderCell(g, idx)}</React.Fragment>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detaylı Liste */}
        <TabsContent value="detay">
          <Card className="glass-effect border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg text-white">Detaylı Kayıt Listesi</CardTitle>
                <Button onClick={detayOrder.reset} size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:text-white h-8 text-xs">
                  <RotateCcw className="w-3 h-3 mr-1" /> Sütun Sırasını Sıfırla
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Sütun başlıklarını sürükleyerek yer değiştirebilirsiniz.</p>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
              ) : filteredPuantajlar.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Bu dönemde kayıt bulunmuyor</div>
              ) : (
                <ScrollArea className="max-h-[500px] w-full">
                  <div className="w-max min-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 bg-slate-900/50">
                        {orderedDetayCols.map(col => (
                          <DraggableTableHead
                            key={col.key}
                            colKey={col.key}
                            onReorder={detayOrder.reorder}
                            className={col.headCls}
                            title={col.headTitle}
                          >
                            {col.label}
                          </DraggableTableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...filteredPuantajlar].sort((a, b) => b.tarih.localeCompare(a.tarih)).map((p, idx) => (
                        <TableRow key={p.id} className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'}`}>
                          {orderedDetayCols.map(col => (
                            <React.Fragment key={col.key}>{col.renderCell(p, idx)}</React.Fragment>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PuantajRaporlama;
