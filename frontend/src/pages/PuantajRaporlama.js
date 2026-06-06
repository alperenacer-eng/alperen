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
  TrendingUp, CalendarDays, User, Building2, RotateCcw,
  Calculator, Plus, Minus, GripVertical, X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useColumnOrder } from '@/hooks/useColumnOrder';
import { DraggableTableHead } from '@/components/DraggableTableHead';
import { useCustomDurumlar } from '@/context/CustomDurumlarContext';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const formatCurrency = (v) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v || 0);

// Puantaj durum başlıkları (Puantaj sayfasıyla aynı sıra) - yerleşik
const BASE_DURUM_KOLONLAR = [
  { value: 'geldi', label: 'Geldi', short: 'Geldi', color: 'text-green-400' },
  { value: 'izinli', label: 'İzinli', short: 'İzinli', color: 'text-blue-400' },
  { value: 'raporlu', label: 'Raporlu', short: 'Raporlu', color: 'text-yellow-400' },
  { value: 'hafta_tatili', label: 'Hafta Tatili', short: 'Hf. Tatili', color: 'text-purple-400' },
  { value: 'resmi_tatil', label: 'Resmi Tatil', short: 'R. Tatil', color: 'text-orange-400' },
  { value: 'bayram_tatili', label: 'Bayram Tatili', short: 'Byr. Tatil', color: 'text-pink-400' },
  { value: 'izinsiz_gelmedi', label: 'İzinsiz Gelmedi', short: 'İzinsiz', color: 'text-rose-400' },
  { value: 'olum_izni', label: 'Ölüm İzni', short: 'Ölüm İz.', color: 'text-gray-300' },
  { value: 'dogum_izni', label: 'Doğum İzni', short: 'Doğum İz.', color: 'text-teal-300' },
  { value: 'pazar_calismasi', label: 'Pazar Çalışması', short: 'Pazar Çal.', color: 'text-cyan-400' },
  { value: 'resmi_tatil_calisti', label: 'Resmi Tatil Çalıştı', short: 'R.T. Çal.', color: 'text-amber-400' },
  { value: 'bayram_calisti', label: 'Bayram Çalıştı', short: 'Byr. Çal.', color: 'text-fuchsia-400' },
];

const PuantajRaporlama = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  const { activeCustomDurumlar } = useCustomDurumlar();

  // Yerleşik + aktif custom durumları birleştir
  const DURUM_KOLONLAR = React.useMemo(() => [
    ...BASE_DURUM_KOLONLAR,
    ...activeCustomDurumlar.map(c => ({
      value: c.value,
      label: c.label,
      short: c.label.length > 10 ? c.label.slice(0, 9) + '…' : c.label,
      color: c.color_class || 'text-amber-400',
      isCustom: true,
      tip: c.tip,
      def_carpan: c.def_carpan,
    })),
  ], [activeCustomDurumlar]);

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

  // Personel Bazlı sekmesi için yıl/ay/sıralama filtreleri
  const _today = new Date();
  const [personelYear, setPersonelYear] = useState(String(_today.getFullYear()));
  const [personelMonth, setPersonelMonth] = useState(String(_today.getMonth() + 1));
  const [personelSort, setPersonelSort] = useState('ad_asc');

  // ACER Rapor sekmesi state'i (pivot/sürükle-bırak)
  const [acerPersonelId, setAcerPersonelId] = useState('');
  const [acerYear, setAcerYear] = useState(String(_today.getFullYear()));
  const [acerMonth, setAcerMonth] = useState(String(_today.getMonth() + 1));
  const [acerTopla, setAcerTopla] = useState([]);    // metric key listesi
  const [acerCikart, setAcerCikart] = useState([]);  // metric key listesi
  const [acerDragKey, setAcerDragKey] = useState(null);
  const [acerSabit, setAcerSabit] = useState(0);     // sabit ekle/çıkar (ikramiye, kesinti gibi)
  
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
    const eksikCarpan = parseFloat(personel.durum_carpan_eksik_calisma ?? 1.0);
    const eksikBirim = applyOvr(personel.ucret_override_eksik_calisma,      Math.ceil(saatlik * eksikCarpan));
    // Custom durumlar için JSON çarpan/override parse
    const customCarpanlar = (() => {
      try { return JSON.parse(personel.custom_durum_carpanlar || '{}') || {}; } catch (_) { return {}; }
    })();
    const customOverrides = (() => {
      try { return JSON.parse(personel.custom_durum_overrides || '{}') || {}; } catch (_) { return {}; }
    })();
    let toplamFm = 0, pazarGun = 0, rtGun = 0;
    const durumGun = { izinli:0, raporlu:0, hafta_tatili:0, resmi_tatil:0, bayram_tatili:0, izinsiz_gelmedi:0, olum_izni:0, dogum_izni:0 };
    // Aktif custom durumlar için sayım slotları aç
    activeCustomDurumlar.forEach(c => { durumGun[c.value] = 0; });
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
    // Durum bazlı ek ücret (yerleşik + custom)
    const durumMap = [
      ['izinli',          personel.durum_carpan_izinli,          personel.ucret_override_izinli,          1.0],
      ['raporlu',         personel.durum_carpan_raporlu,         personel.ucret_override_raporlu,         0.0],
      ['hafta_tatili',    personel.durum_carpan_hafta_tatili,    personel.ucret_override_hafta_tatili,    1.0],
      ['resmi_tatil',     personel.durum_carpan_resmi_tatil,     personel.ucret_override_resmi_tatil,     1.0],
      ['bayram_tatili',   personel.durum_carpan_bayram_tatili,   personel.ucret_override_bayram_tatili,   1.0],
      ['izinsiz_gelmedi', personel.durum_carpan_izinsiz_gelmedi, personel.ucret_override_izinsiz_gelmedi, 0.0],
      ['olum_izni',       personel.durum_carpan_olum_izni,       personel.ucret_override_olum_izni,       1.0],
      ['dogum_izni',      personel.durum_carpan_dogum_izni,      personel.ucret_override_dogum_izni,      1.0],
    ];
    let durumEk = 0;
    // Her durum için birim fiyatları topla (Belirleme tablosundan)
    const birimFiyatlar = {
      geldi: Math.ceil(gunluk),  // 'geldi' günleri ana maaşa dahil — günlük birim
      fazla_mesai: fmBirim,
      eksik_calisma: eksikBirim,
      pazar_calismasi: pzBirim,
      resmi_tatil_calisti: rtBirim,
      bayram_calisti: rtBirim,  // bayram çal. → R.Tatil ücretine sayılır
    };
    durumMap.forEach(([k, carpan, ovr, defC]) => {
      const c = parseFloat(carpan ?? defC);
      const birim = applyOvr(ovr, Math.ceil(gunluk * c));
      birimFiyatlar[k] = birim;
      const gun = durumGun[k] || 0;
      if (gun <= 0) return;
      if (birim > 0) durumEk += Math.ceil(birim * gun);
    });
    // Custom durumlar için birim hesabı + ek ücret toplamı
    activeCustomDurumlar.forEach(cd => {
      const carp = customCarpanlar[cd.value] !== undefined ? parseFloat(customCarpanlar[cd.value]) : parseFloat(cd.def_carpan ?? 1.0);
      const ovr = customOverrides[cd.value];
      const baz = (cd.tip === 'saatlik') ? saatlik : gunluk;
      const birim = applyOvr(ovr, Math.ceil(baz * carp));
      birimFiyatlar[cd.value] = birim;
      const gun = durumGun[cd.value] || 0;
      if (gun > 0 && birim > 0) durumEk += Math.ceil(birim * gun);
    });
    return { fmUcret, pzUcret, rtUcret, durumEk, toplam: fmUcret + pzUcret + rtUcret + durumEk, birimFiyatlar };
  };

  // Personel Bazlı Rapor (tesis bilgisiyle + her durum sayısı + eksik çalışma saati + hak edilen toplam)
  // Personel sekmesi için yıl + ay filtresi uygulanır
  const personelPuantajFiltresi = puantajlar.filter(p => {
    if (!p.tarih) return false;
    const parts = p.tarih.split('-');
    if (parts.length < 2) return false;
    const yyyy = parts[0];
    const mm = String(parseInt(parts[1], 10));
    return yyyy === String(personelYear) && mm === String(personelMonth);
  });

  const personelRaporu = personeller.map(personel => {
    const personelPuantajlari = personelPuantajFiltresi.filter(p => p.personel_id === personel.id);
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
  }).filter(p => p.calismaGunu > 0).sort((a, b) => {
    const trCmp = (x, y) => (x || '').localeCompare((y || ''), 'tr', { sensitivity: 'base' });
    switch (personelSort) {
      case 'ad_desc':       return trCmp(b.ad_soyad, a.ad_soyad);
      case 'gun_desc':      return (b.calismaGunu || 0) - (a.calismaGunu || 0);
      case 'gun_asc':       return (a.calismaGunu || 0) - (b.calismaGunu || 0);
      case 'fm_desc':       return (b.toplamFazlaMesai || 0) - (a.toplamFazlaMesai || 0);
      case 'fm_asc':        return (a.toplamFazlaMesai || 0) - (b.toplamFazlaMesai || 0);
      case 'hak_desc':      return (b.hakedilen?.toplam || 0) - (a.hakedilen?.toplam || 0);
      case 'hak_asc':       return (a.hakedilen?.toplam || 0) - (b.hakedilen?.toplam || 0);
      case 'departman_asc': return trCmp(a.departman, b.departman) || trCmp(a.ad_soyad, b.ad_soyad);
      case 'ad_asc':
      default:              return trCmp(a.ad_soyad, b.ad_soyad);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ACER Rapor (pivot/sürükle-bırak) — seçilen kişi + yıl + ay için metrikler
  // ─────────────────────────────────────────────────────────────────────────────
  const acerSecilenPersonel = personeller.find(p => p.id === acerPersonelId) || null;

  const acerPuantajlari = (() => {
    if (!acerSecilenPersonel) return [];
    return puantajlar.filter(p => {
      if (!p.tarih || p.personel_id !== acerSecilenPersonel.id) return false;
      const parts = p.tarih.split('-');
      if (parts.length < 2) return false;
      return parts[0] === String(acerYear) && String(parseInt(parts[1], 10)) === String(acerMonth);
    });
  })();

  // Tüm metrikleri (key/label/count/unit/birim/tutar) tek seferde üret
  const acerMetrikler = (() => {
    if (!acerSecilenPersonel) return [];
    const p = acerSecilenPersonel;
    const maas = parseFloat(p.maas) || 0;
    const gunluk = maas / 30;
    const saatlik = gunluk / 8;
    const fc = parseFloat(p.fazla_mesai_carpan ?? 1.5);
    const pc = parseFloat(p.pazar_carpan ?? 2.0);
    const rc = parseFloat(p.resmi_tatil_carpan ?? 2.0);
    const eksikCarpan = parseFloat(p.durum_carpan_eksik_calisma ?? 1.0);
    const applyOvr = (ovr, fallback) =>
      (ovr !== null && ovr !== undefined && ovr !== '' && !isNaN(parseFloat(ovr))) ? parseFloat(ovr) : fallback;

    // Sayımlar
    let geldiGun = 0, pazarGun = 0, rtCalGun = 0, byrCalGun = 0;
    let fmSaat = 0, eksikDakikaTop = 0;
    const durumGun = {
      izinli:0, raporlu:0, hafta_tatili:0, resmi_tatil:0, bayram_tatili:0,
      izinsiz_gelmedi:0, olum_izni:0, dogum_izni:0
    };
    activeCustomDurumlar.forEach(c => { durumGun[c.value] = 0; });

    acerPuantajlari.forEach(pp => {
      const d = (pp.durum || 'geldi').toLowerCase();
      let haftaGunu = -1;
      try { haftaGunu = new Date(pp.tarih).getDay(); } catch (_) { /* noop */ }
      const fm = parseFloat(pp.fazla_mesai) || 0;
      if (d === 'geldi') {
        if (haftaGunu === 0) pazarGun += 1; else geldiGun += 1;
      } else if (d === 'pazar_calismasi') pazarGun += 1;
      else if (d === 'resmi_tatil_calisti') rtCalGun += 1;
      else if (d === 'bayram_calisti') byrCalGun += 1;
      else if (durumGun[d] !== undefined) durumGun[d] += 1;
      if (fm > 0 && ['geldi','resmi_tatil','bayram_tatili','pazar_calismasi','resmi_tatil_calisti','bayram_calisti'].includes(d)) {
        fmSaat += fm;
      }
      eksikDakikaTop += eksikDakikaKaydi(pp);
    });

    // Custom durum birim/carpan map
    let customCarpanlar = {}; let customOverrides = {};
    try { customCarpanlar = JSON.parse(p.custom_durum_carpanlar || '{}') || {}; } catch (_) { /* noop */ }
    try { customOverrides = JSON.parse(p.custom_durum_overrides || '{}') || {}; } catch (_) { /* noop */ }

    // Yerleşik durumlar birim fiyatı
    const fmBirim    = applyOvr(p.ucret_override_fazla_mesai,         Math.ceil(saatlik * fc));
    const pzBirim    = applyOvr(p.ucret_override_pazar,                Math.ceil(gunluk * pc));
    const rtBirim    = applyOvr(p.ucret_override_resmi_tatil_calisti,  Math.ceil(gunluk * rc));
    const eksikBirim = applyOvr(p.ucret_override_eksik_calisma,        Math.ceil(saatlik * eksikCarpan));

    const durumBirim = (key, carpan, ovr, defC) => {
      const c = parseFloat(carpan ?? defC);
      return applyOvr(ovr, Math.ceil(gunluk * c));
    };

    const items = [];
    items.push({ key: 'geldi', label: 'Geldi (Hafta İçi/Cmt)', kategori: 'gun', count: geldiGun, unit: 'gün', birim: Math.ceil(gunluk), tutar: Math.ceil(gunluk) * geldiGun });
    items.push({ key: 'fazla_mesai', label: 'Fazla Mesai', kategori: 'saat', count: fmSaat, unit: 'saat', birim: fmBirim, tutar: Math.ceil(fmBirim * fmSaat) });
    items.push({ key: 'eksik_calisma', label: 'Eksik Çalışma', kategori: 'saat', count: +(eksikDakikaTop/60).toFixed(2), unit: 'saat', birim: eksikBirim, tutar: Math.ceil(eksikBirim * (eksikDakikaTop/60)) });
    items.push({ key: 'pazar_calismasi', label: 'Pazar Çalışması', kategori: 'gun', count: pazarGun, unit: 'gün', birim: pzBirim, tutar: Math.ceil(pzBirim * pazarGun) });
    items.push({ key: 'resmi_tatil_calisti', label: 'Resmi Tatil Çalıştı', kategori: 'gun', count: rtCalGun, unit: 'gün', birim: rtBirim, tutar: Math.ceil(rtBirim * rtCalGun) });
    items.push({ key: 'bayram_calisti', label: 'Bayram Çalıştı', kategori: 'gun', count: byrCalGun, unit: 'gün', birim: rtBirim, tutar: Math.ceil(rtBirim * byrCalGun) });

    const durumLabels = {
      izinli: 'İzinli', raporlu: 'Raporlu', hafta_tatili: 'Hafta Tatili',
      resmi_tatil: 'Resmi Tatil', bayram_tatili: 'Bayram Tatili',
      izinsiz_gelmedi: 'İzinsiz Gelmedi', olum_izni: 'Ölüm İzni', dogum_izni: 'Doğum İzni'
    };
    const durumDef = [
      ['izinli',          p.durum_carpan_izinli,          p.ucret_override_izinli,          1.0],
      ['raporlu',         p.durum_carpan_raporlu,         p.ucret_override_raporlu,         0.0],
      ['hafta_tatili',    p.durum_carpan_hafta_tatili,    p.ucret_override_hafta_tatili,    1.0],
      ['resmi_tatil',     p.durum_carpan_resmi_tatil,     p.ucret_override_resmi_tatil,     1.0],
      ['bayram_tatili',   p.durum_carpan_bayram_tatili,   p.ucret_override_bayram_tatili,   1.0],
      ['izinsiz_gelmedi', p.durum_carpan_izinsiz_gelmedi, p.ucret_override_izinsiz_gelmedi, 0.0],
      ['olum_izni',       p.durum_carpan_olum_izni,       p.ucret_override_olum_izni,       1.0],
      ['dogum_izni',      p.durum_carpan_dogum_izni,      p.ucret_override_dogum_izni,      1.0],
    ];
    durumDef.forEach(([k, carpan, ovr, defC]) => {
      const birim = durumBirim(k, carpan, ovr, defC);
      const gun = durumGun[k] || 0;
      items.push({ key: k, label: durumLabels[k], kategori: 'gun', count: gun, unit: 'gün', birim, tutar: Math.ceil(birim * gun) });
    });
    activeCustomDurumlar.forEach(cd => {
      const carp = customCarpanlar[cd.value] !== undefined ? parseFloat(customCarpanlar[cd.value]) : parseFloat(cd.def_carpan ?? 1.0);
      const ovr = customOverrides[cd.value];
      const baz = (cd.tip === 'saatlik') ? saatlik : gunluk;
      const birim = applyOvr(ovr, Math.ceil(baz * carp));
      const gun = durumGun[cd.value] || 0;
      items.push({ key: cd.value, label: cd.label + ' (özel)', kategori: cd.tip === 'saatlik' ? 'saat' : 'gun', count: gun, unit: cd.tip === 'saatlik' ? 'saat' : 'gün', birim, tutar: Math.ceil(birim * gun), custom: true });
    });
    // Brüt Maaş (sabit referans — Kullanıcı isterse topla'ya alır)
    items.push({ key: 'brut_maas', label: 'Brüt Maaş (referans)', kategori: 'sabit', count: 1, unit: 'aylık', birim: Math.ceil(maas), tutar: Math.ceil(maas) });
    return items;
  })();

  const acerMetrikGetir = (key) => acerMetrikler.find(m => m.key === key);

  const acerTotals = (() => {
    const sum = (arr) => arr.reduce((s, k) => {
      const m = acerMetrikGetir(k);
      return s + (m ? (m.tutar || 0) : 0);
    }, 0);
    const t = sum(acerTopla);
    const c = sum(acerCikart);
    const sb = parseFloat(acerSabit) || 0;
    return { topla: t, cikart: c, sabit: sb, net: t - c + sb };
  })();

  // Mevcut (henüz Topla/Çıkart'a atanmamış) metrikler
  const acerKullanilabilir = acerMetrikler.filter(m => !acerTopla.includes(m.key) && !acerCikart.includes(m.key));

  // Drag/Drop yardımcıları
  const acerOnDragStart = (key) => setAcerDragKey(key);
  const acerOnDragEnd = () => setAcerDragKey(null);
  const acerOnDrop = (target) => {
    const key = acerDragKey;
    if (!key) return;
    // Önce her listeden çıkar
    setAcerTopla(prev => prev.filter(k => k !== key));
    setAcerCikart(prev => prev.filter(k => k !== key));
    if (target === 'topla') setAcerTopla(prev => prev.includes(key) ? prev : [...prev, key]);
    else if (target === 'cikart') setAcerCikart(prev => prev.includes(key) ? prev : [...prev, key]);
    // 'mevcut' ise sadece çıkarmış oluyoruz
    setAcerDragKey(null);
  };
  const acerKaldir = (key, source) => {
    if (source === 'topla') setAcerTopla(prev => prev.filter(k => k !== key));
    else if (source === 'cikart') setAcerCikart(prev => prev.filter(k => k !== key));
  };
  const acerTumunuTemizle = () => { setAcerTopla([]); setAcerCikart([]); setAcerSabit(0); };

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
      // 1) Personel Bazlı sheet — kullanıcının sıraladığı sütun düzenini KULLANIR
      const orderedKeys = personelOrder.order.filter(k => personelExportMap[k]);
      const personelHeader = [
        ...orderedKeys.map(k => personelExportMap[k].label),
        // Ek özet sütunları (her zaman sonda)
        'F.Mesai Ücreti (₺)',
        'Pazar Ücreti (₺)',
        'R.Tatil Çal. Ücreti (₺)',
        'Durum Ek Ücret (₺)',
      ];
      const personelRows = personelRaporu.map((p, idx) => [
        ...orderedKeys.map(k => personelExportMap[k].value(p, idx)),
        Number((p.hakedilen.fmUcret || 0).toFixed(2)),
        Number((p.hakedilen.pzUcret || 0).toFixed(2)),
        Number((p.hakedilen.rtUcret || 0).toFixed(2)),
        Number((p.hakedilen.durumEk || 0).toFixed(2)),
      ]);
      const wsPersonel = XLSX.utils.aoa_to_sheet([personelHeader, ...personelRows]);

      // 2) Tesis Bazlı sheet - sıralı sütunlar
      const tesisOrderedKeys = tesisOrder.order.filter(k => tesisExportMap[k]);
      const tesisHeader = tesisOrderedKeys.map(k => tesisExportMap[k].label);
      const tesisRows = tesisRaporu.map(t => tesisOrderedKeys.map(k => tesisExportMap[k].value(t)));
      const wsTesis = XLSX.utils.aoa_to_sheet([tesisHeader, ...tesisRows]);

      // 3) Gün Bazlı sheet - sıralı sütunlar
      const gunOrderedKeys = gunOrder.order.filter(k => gunExportMap[k]);
      const gunHeader = gunOrderedKeys.map(k => gunExportMap[k].label);
      const gunRows = gunRaporu.map(g => gunOrderedKeys.map(k => gunExportMap[k].value(g)));
      const wsGun = XLSX.utils.aoa_to_sheet([gunHeader, ...gunRows]);

      // 4) Detaylı Liste sheet - sıralı sütunlar
      const detayOrderedKeys = detayOrder.order.filter(k => detayExportMap[k]);
      const detayHeader = detayOrderedKeys.map(k => detayExportMap[k].label);
      const detayRows = [...filteredPuantajlar]
        .sort((a, b) => b.tarih.localeCompare(a.tarih))
        .map(p => detayOrderedKeys.map(k => detayExportMap[k].value(p)));
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
      // Kullanıcının sıraladığı sütun düzenini kullan
      const orderedKeys = personelOrder.order.filter(k => personelExportMap[k]);
      const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
      const fmtCell = (k, val, p) => {
        if (val === '' || val === '-' || val == null) return '-';
        if (typeof val === 'number') {
          if (k === 'maas' || k.startsWith('birim_') || k.startsWith('tutar_') || k === 'fm_birim' || k === 'fm_tutar' || k === 'eksik_birim' || k === 'eksik_tutar' || k === 'hak') return formatCurrency(val);
          if (k === 'fm') return `${val.toFixed(1)} sa`;
          return val;
        }
        return escapeHtml(val);
      };
      const cellStyle = (k) => {
        if (k === 'baz_gun') return 'text-align:center;color:#b45309;font-weight:600';
        if (k === 'maas' || k === 'hak') return 'text-align:right;color:#059669;font-weight:600';
        if (k.startsWith('birim_') || k === 'fm_birim' || k === 'eksik_birim') return 'text-align:center;font-size:10px;color:#64748b';
        if (k.startsWith('tutar_') || k === 'fm_tutar') return 'text-align:right;color:#059669;font-weight:600';
        if (k === 'eksik_tutar') return 'text-align:right;color:#e11d48;font-weight:600';
        if (k.startsWith('durum_') || k === 'fm' || k === 'gun') return 'text-align:center';
        return '';
      };
      const headStyle = (k) => {
        if (k.startsWith('birim_') || k === 'fm_birim' || k === 'eksik_birim') return 'font-size:10px;color:#64748b';
        if (k.startsWith('tutar_') || k === 'fm_tutar') return 'color:#059669';
        if (k === 'eksik_tutar') return 'color:#e11d48';
        return '';
      };
      tableHtml = `
        <table>
          <thead>
            <tr>
              ${orderedKeys.map(k => `<th style="${headStyle(k)}">${escapeHtml(personelExportMap[k].label)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${personelRaporu.map((p, idx) => `
              <tr>
                ${orderedKeys.map(k => {
                  const v = personelExportMap[k].value(p, idx);
                  return `<td style="${cellStyle(k)}">${fmtCell(k, v, p)}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    } else if (activeTab === 'tesis') {
      const tesisKeys = tesisOrder.order.filter(k => tesisExportMap[k]);
      tableHtml = `
        <table>
          <thead>
            <tr>
              ${tesisKeys.map(k => `<th>${tesisExportMap[k].label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tesisRaporu.map(t => `
              <tr>
                ${tesisKeys.map(k => `<td>${tesisExportMap[k].value(t)}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    } else if (activeTab === 'gun') {
      const gunKeys = gunOrder.order.filter(k => gunExportMap[k]);
      tableHtml = `
        <table>
          <thead>
            <tr>
              ${gunKeys.map(k => `<th>${gunExportMap[k].label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${gunRaporu.map(g => `
              <tr>
                ${gunKeys.map(k => `<td>${gunExportMap[k].value(g)}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    } else if (activeTab === 'detay') {
      const detayKeys = detayOrder.order.filter(k => detayExportMap[k]);
      const detaySorted = [...filteredPuantajlar].sort((a, b) => b.tarih.localeCompare(a.tarih));
      tableHtml = `
        <table>
          <thead>
            <tr>
              ${detayKeys.map(k => `<th>${detayExportMap[k].label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${detaySorted.map(p => `
              <tr>
                ${detayKeys.map(k => {
                  const v = detayExportMap[k].value(p);
                  const isDurum = k.startsWith('durum_');
                  return `<td${isDurum ? ' style="text-align:center"' : ''}>${isDurum ? (v === 1 ? '✓' : '') : v}</td>`;
                }).join('')}
              </tr>
            `).join('')}
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
          ${activeTab === 'personel'
            ? `<strong>Dönem:</strong> ${personelYear} / ${String(personelMonth).padStart(2,'0')}`
            : `<strong>Tarih Aralığı:</strong> ${start} - ${end}`}
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
      key: 'baz_gun', label: 'Baz Alınan Gün',
      headTitle: 'Ay kaç gün çekerse çeksin (28/29/30/31) maaş hesabında sabit kullanılan gün sayısı',
      headCls: 'text-amber-300 whitespace-nowrap text-center',
      renderCell: (p) => (
        <TableCell key="baz_gun" className="text-amber-300 font-semibold text-center whitespace-nowrap" data-testid={`baz-alinan-gun-${p.id}`}>
          30
        </TableCell>
      )
    },
    {
      key: 'dep', label: 'Departman', headCls: 'text-slate-300 min-w-[120px]',
      renderCell: (p) => <TableCell key="dep" className="text-slate-300">{p.departman}</TableCell>
    },
    {
      key: 'gun', label: 'Çal. Günü', headCls: 'text-slate-300',
      renderCell: (p) => <TableCell key="gun" className="text-blue-400 font-medium">{p.calismaGunu}</TableCell>
    },
    ...DURUM_KOLONLAR.flatMap(d => [
      {
        key: `durum_${d.value}`,
        label: d.short,
        headTitle: d.label,
        headCls: `${d.color} text-center whitespace-nowrap`,
        renderCell: (p) => {
          const val = p.durumSayilari[d.value] || 0;
          return <TableCell key={`durum_${d.value}`} className={`text-center whitespace-nowrap ${val > 0 ? d.color + ' font-semibold' : 'text-slate-600'}`}>{val}</TableCell>;
        }
      },
      {
        key: `birim_${d.value}`,
        label: `${d.short} ₺`,
        headTitle: `${d.label} — Belirleme'deki birim fiyat`,
        headCls: 'text-slate-400 text-center whitespace-nowrap text-xs',
        renderCell: (p) => {
          const birim = p.hakedilen?.birimFiyatlar?.[d.value] || 0;
          return (
            <TableCell key={`birim_${d.value}`} className="text-center whitespace-nowrap text-slate-400 text-xs" data-testid={`birim-fiyat-${d.value}-${p.id}`}>
              {birim > 0 ? formatCurrency(birim) : '-'}
            </TableCell>
          );
        }
      },
      {
        key: `tutar_${d.value}`,
        label: `${d.short} Tutar`,
        headTitle: `${d.label} — gün × birim fiyat = toplam tutar`,
        headCls: 'text-emerald-300 text-center whitespace-nowrap',
        renderCell: (p) => {
          const val = p.durumSayilari[d.value] || 0;
          const birim = p.hakedilen?.birimFiyatlar?.[d.value] || 0;
          const tutar = val * birim;
          return (
            <TableCell key={`tutar_${d.value}`} className={`text-center whitespace-nowrap font-medium ${tutar > 0 ? 'text-emerald-300' : 'text-slate-600'}`} data-testid={`tutar-${d.value}-${p.id}`}>
              {tutar > 0 ? formatCurrency(tutar) : '-'}
            </TableCell>
          );
        }
      }
    ]),
    {
      key: 'fm', label: 'Fazla Mesai',
      headTitle: 'Toplam fazla mesai saati',
      headCls: 'text-slate-300 text-center whitespace-nowrap',
      renderCell: (p) => (
        <TableCell key="fm" className="text-orange-400 font-medium whitespace-nowrap text-center">{p.toplamFazlaMesai.toFixed(1)} sa</TableCell>
      )
    },
    {
      key: 'fm_birim', label: 'F.Mesai ₺/sa',
      headTitle: "Belirleme'deki saatlik fazla mesai birim fiyatı",
      headCls: 'text-slate-400 text-center whitespace-nowrap text-xs',
      renderCell: (p) => {
        const birim = p.hakedilen?.birimFiyatlar?.fazla_mesai || 0;
        return (
          <TableCell key="fm_birim" className="text-center whitespace-nowrap text-slate-400 text-xs" data-testid={`birim-fiyat-fazla-mesai-${p.id}`}>
            {birim > 0 ? formatCurrency(birim) : '-'}
          </TableCell>
        );
      }
    },
    {
      key: 'fm_tutar', label: 'F.Mesai Tutar',
      headTitle: 'Fazla mesai saati × saatlik birim fiyat',
      headCls: 'text-emerald-300 text-center whitespace-nowrap',
      renderCell: (p) => {
        const tutar = p.hakedilen?.fmUcret || 0;
        return (
          <TableCell key="fm_tutar" className={`text-center whitespace-nowrap font-medium ${tutar > 0 ? 'text-emerald-300' : 'text-slate-600'}`} data-testid={`tutar-fazla-mesai-${p.id}`}>
            {tutar > 0 ? formatCurrency(tutar) : '-'}
          </TableCell>
        );
      }
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
      key: 'eksik_birim', label: 'Eksik Çal. ₺/sa',
      headTitle: "Belirleme'deki eksik çalışılan saat için saatlik birim fiyat",
      headCls: 'text-slate-400 text-center whitespace-nowrap text-xs',
      renderCell: (p) => {
        const birim = p.hakedilen?.birimFiyatlar?.eksik_calisma || 0;
        return (
          <TableCell key="eksik_birim" className="text-center whitespace-nowrap text-slate-400 text-xs" data-testid={`birim-fiyat-eksik-calisma-${p.id}`}>
            {birim > 0 ? formatCurrency(birim) : '-'}
          </TableCell>
        );
      }
    },
    {
      key: 'eksik_tutar', label: 'Eksik Çal. Tutar',
      headTitle: 'Eksik çalışma saati × saatlik birim fiyat (maaştan düşülen / hesaplanan tutar)',
      headCls: 'text-rose-300 text-center whitespace-nowrap',
      renderCell: (p) => {
        const saat = (p.toplamEksikDakika || 0) / 60;
        const birim = p.hakedilen?.birimFiyatlar?.eksik_calisma || 0;
        const tutar = Math.ceil(saat * birim);
        return (
          <TableCell key="eksik_tutar" className={`text-center whitespace-nowrap font-medium ${tutar > 0 ? 'text-rose-300' : 'text-slate-600'}`} data-testid={`tutar-eksik-calisma-${p.id}`}>
            {tutar > 0 ? formatCurrency(tutar) : '-'}
          </TableCell>
        );
      }
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
  ], [DURUM_KOLONLAR]);

  // PERSONEL EXPORT MAP: her sütun key'i için Excel/PDF için { label, value(p, idx) }
  const personelExportMap = React.useMemo(() => {
    const map = {
      no:       { label: '#', value: (p, idx) => idx + 1 },
      ad:       { label: 'Personel Adı', value: (p) => p.ad_soyad },
      maas:     { label: 'Maaş (₺)', value: (p) => Number((p.maas || 0).toFixed(2)) },
      baz_gun:  { label: 'Baz Alınan Gün', value: () => 30 },
      dep:      { label: 'Departman', value: (p) => p.departman || '-' },
      gun:      { label: 'Çal. Günü', value: (p) => p.calismaGunu },
      fm:       { label: 'Fazla Mesai (saat)', value: (p) => Number(p.toplamFazlaMesai.toFixed(1)) },
      fm_birim: { label: 'F.Mesai Birim (₺/sa)', value: (p) => Number(((p.hakedilen?.birimFiyatlar?.fazla_mesai) || 0).toFixed(2)) },
      fm_tutar: { label: 'F.Mesai Tutar (₺)', value: (p) => Number((p.hakedilen?.fmUcret || 0).toFixed(2)) },
      eksik:    { label: 'Eksik Çal. Saat', value: (p) => dakikayiFormatla(p.toplamEksikDakika) },
      eksik_birim: { label: 'Eksik Çal. Birim (₺/sa)', value: (p) => Number(((p.hakedilen?.birimFiyatlar?.eksik_calisma) || 0).toFixed(2)) },
      eksik_tutar: { label: 'Eksik Çal. Tutar (₺)', value: (p) => Number((((p.toplamEksikDakika || 0) / 60) * ((p.hakedilen?.birimFiyatlar?.eksik_calisma) || 0)).toFixed(2)) },
      hak:      { label: 'Hak Edilen Toplam (₺)', value: (p) => Number((p.hakedilen?.toplam || 0).toFixed(2)) },
      tesisler: { label: 'Çalıştığı Tesisler', value: (p) => (p.tesisler || []).join(', ') || '-' },
    };
    DURUM_KOLONLAR.forEach(d => {
      map[`durum_${d.value}`] = { label: d.label, value: (p) => p.durumSayilari[d.value] || 0 };
      map[`birim_${d.value}`] = { label: `${d.short} Birim (₺)`, value: (p) => Number(((p.hakedilen?.birimFiyatlar?.[d.value]) || 0).toFixed(2)) };
      map[`tutar_${d.value}`] = { label: `${d.short} Tutar (₺)`, value: (p) => {
        const v = p.durumSayilari[d.value] || 0;
        const b = p.hakedilen?.birimFiyatlar?.[d.value] || 0;
        return Number((v * b).toFixed(2));
      }};
    });
    return map;
  }, [DURUM_KOLONLAR]);

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
  ], [DURUM_KOLONLAR]);

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

  // TESİS/GÜN/DETAY Export Mapları
  const tesisExportMap = React.useMemo(() => ({
    tesis:           { label: 'Tesis Adı', value: (t) => t.tesis_adi },
    kayit:           { label: 'Kayıt Sayısı', value: (t) => t.kayitSayisi },
    personel:        { label: 'Personel Sayısı', value: (t) => t.personelSayisi },
    fm:              { label: 'Toplam Fazla Mesai (saat)', value: (t) => Number(t.toplamFazlaMesai.toFixed(1)) },
    personeller:     { label: 'Çalışan Personeller', value: (t) => t.personelListesi.join(', ') },
  }), []);

  const gunExportMap = React.useMemo(() => ({
    tarih:           { label: 'Tarih', value: (g) => g.tarih },
    gun_adi:         { label: 'Gün', value: (g) => ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'][new Date(g.tarih).getDay()] },
    personel_sayisi: { label: 'Personel Sayısı', value: (g) => g.personelSayisi },
    fm:              { label: 'Toplam Fazla Mesai (saat)', value: (g) => Number(g.toplamFazlaMesai.toFixed(1)) },
  }), []);

  const detayExportMap = React.useMemo(() => {
    const m = {
      tarih:    { label: 'Tarih', value: (p) => p.tarih },
      personel: { label: 'Personel', value: (p) => p.personel_adi || '' },
      tesis:    { label: 'Tesis', value: (p) => p.tesis_adi || '-' },
      giris:    { label: 'Giriş', value: (p) => p.giris_saati || '-' },
      cikis:    { label: 'Çıkış', value: (p) => p.cikis_saati || '-' },
      fm:       { label: 'Fazla Mesai (saat)', value: (p) => Number((p.fazla_mesai || 0).toFixed(1)) },
      sure:     { label: 'Çalışılan Süre', value: (p) => calismaSuresi(p) },
      eksik:    { label: 'Eksik Çal.', value: (p) => dakikayiFormatla(eksikDakikaKaydi(p)) },
      not:      { label: 'Not', value: (p) => p.notlar || '-' },
    };
    DURUM_KOLONLAR.forEach(d => {
      m[`durum_${d.value}`] = { label: d.label, value: (p) => ((p.durum || 'geldi') === d.value ? 1 : 0) };
    });
    return m;
  }, [DURUM_KOLONLAR]);

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
          <TabsTrigger value="acer" data-testid="acer-rapor-tab" className="data-[state=active]:bg-orange-600">
            <Calculator className="w-4 h-4 mr-2" />
            ACER Rapor
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

              {/* Kişi Bazlı Filtreler: Yıl + Ay + Sıralama */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-slate-400 mb-1 block">Yıl</Label>
                  <Select value={personelYear} onValueChange={setPersonelYear}>
                    <SelectTrigger data-testid="personel-rapor-yil-select" className="bg-slate-900 border-slate-700 text-white h-9">
                      <SelectValue placeholder="Yıl" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
                      {(() => {
                        const cy = new Date().getFullYear();
                        const years = [];
                        for (let y = cy + 1; y >= cy - 6; y--) years.push(y);
                        return years.map(y => (
                          <SelectItem key={y} value={String(y)} className="text-white focus:bg-slate-800 focus:text-white">
                            {y}
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-400 mb-1 block">Ay</Label>
                  <Select value={personelMonth} onValueChange={setPersonelMonth}>
                    <SelectTrigger data-testid="personel-rapor-ay-select" className="bg-slate-900 border-slate-700 text-white h-9">
                      <SelectValue placeholder="Ay" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
                      {[
                        { v: '1',  l: 'Ocak' },
                        { v: '2',  l: 'Şubat' },
                        { v: '3',  l: 'Mart' },
                        { v: '4',  l: 'Nisan' },
                        { v: '5',  l: 'Mayıs' },
                        { v: '6',  l: 'Haziran' },
                        { v: '7',  l: 'Temmuz' },
                        { v: '8',  l: 'Ağustos' },
                        { v: '9',  l: 'Eylül' },
                        { v: '10', l: 'Ekim' },
                        { v: '11', l: 'Kasım' },
                        { v: '12', l: 'Aralık' },
                      ].map(m => (
                        <SelectItem key={m.v} value={m.v} className="text-white focus:bg-slate-800 focus:text-white">
                          {m.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-400 mb-1 block">Sıralama</Label>
                  <Select value={personelSort} onValueChange={setPersonelSort}>
                    <SelectTrigger data-testid="personel-rapor-sort-select" className="bg-slate-900 border-slate-700 text-white h-9">
                      <SelectValue placeholder="Sıralama" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
                      <SelectItem value="ad_asc"        className="text-white focus:bg-slate-800 focus:text-white">Ada Göre (A → Z)</SelectItem>
                      <SelectItem value="ad_desc"       className="text-white focus:bg-slate-800 focus:text-white">Ada Göre (Z → A)</SelectItem>
                      <SelectItem value="gun_desc"      className="text-white focus:bg-slate-800 focus:text-white">Çalışma Günü (Çok → Az)</SelectItem>
                      <SelectItem value="gun_asc"       className="text-white focus:bg-slate-800 focus:text-white">Çalışma Günü (Az → Çok)</SelectItem>
                      <SelectItem value="fm_desc"       className="text-white focus:bg-slate-800 focus:text-white">Fazla Mesai (Çok → Az)</SelectItem>
                      <SelectItem value="fm_asc"        className="text-white focus:bg-slate-800 focus:text-white">Fazla Mesai (Az → Çok)</SelectItem>
                      <SelectItem value="hak_desc"      className="text-white focus:bg-slate-800 focus:text-white">Hak Ediş (Çok → Az)</SelectItem>
                      <SelectItem value="hak_asc"       className="text-white focus:bg-slate-800 focus:text-white">Hak Ediş (Az → Çok)</SelectItem>
                      <SelectItem value="departman_asc" className="text-white focus:bg-slate-800 focus:text-white">Departmana Göre (A → Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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

        {/* ACER Rapor — Sürükle-bırak pivot raporlama */}
        <TabsContent value="acer">
          <Card className="glass-effect border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-orange-400" /> ACER Rapor
                </CardTitle>
                <Button
                  onClick={acerTumunuTemizle}
                  size="sm"
                  variant="outline"
                  data-testid="acer-rapor-temizle-btn"
                  className="border-slate-700 text-slate-300 hover:text-white h-8 text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Seçimleri Temizle
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Kişiyi, yılı ve ayı seçin. Sol panelden metrikleri Topla veya Çıkart alanına sürükleyip net sonucu hesaplayın.
              </p>

              {/* Filtreler */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-slate-400 mb-1 block">Personel</Label>
                  <Select value={acerPersonelId} onValueChange={setAcerPersonelId}>
                    <SelectTrigger data-testid="acer-rapor-personel-select" className="bg-slate-900 border-slate-700 text-white h-9">
                      <SelectValue placeholder="Personel seçin..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-64">
                      {personeller
                        .slice()
                        .sort((a, b) => (a.ad_soyad || '').localeCompare(b.ad_soyad || '', 'tr'))
                        .map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-white focus:bg-slate-800 focus:text-white">
                            {p.ad_soyad}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-400 mb-1 block">Yıl</Label>
                  <Select value={acerYear} onValueChange={setAcerYear}>
                    <SelectTrigger data-testid="acer-rapor-yil-select" className="bg-slate-900 border-slate-700 text-white h-9">
                      <SelectValue placeholder="Yıl" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
                      {(() => {
                        const cy = new Date().getFullYear();
                        const years = [];
                        for (let y = cy + 1; y >= cy - 6; y--) years.push(y);
                        return years.map(y => (
                          <SelectItem key={y} value={String(y)} className="text-white focus:bg-slate-800 focus:text-white">{y}</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-400 mb-1 block">Ay</Label>
                  <Select value={acerMonth} onValueChange={setAcerMonth}>
                    <SelectTrigger data-testid="acer-rapor-ay-select" className="bg-slate-900 border-slate-700 text-white h-9">
                      <SelectValue placeholder="Ay" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
                      {['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'].map((nm, i) => (
                        <SelectItem key={i+1} value={String(i+1)} className="text-white focus:bg-slate-800 focus:text-white">{nm}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              {!acerSecilenPersonel ? (
                <div className="p-8 text-center text-slate-400">
                  Raporu görmek için yukarıdan bir personel seçin.
                </div>
              ) : (
                <>
                  {acerPuantajlari.length === 0 && (
                    <div className="mb-3 p-2.5 rounded-md bg-amber-900/20 border border-amber-700/40 text-xs text-amber-200">
                      <strong>{acerSecilenPersonel.ad_soyad}</strong> için {acerYear}/{String(acerMonth).padStart(2,'0')} döneminde puantaj kaydı yok. Tüm metrikler 0 değerle gösteriliyor; yine de Topla/Çıkart alanına atayıp şablon hazırlayabilirsiniz.
                    </div>
                  )}
                  {/* Drag/Drop Üç Sütun */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {/* Mevcut Metrikler */}
                    <div
                      data-testid="acer-rapor-mevcut-zone"
                      className={`rounded-lg border-2 border-dashed p-3 min-h-[240px] transition-colors ${acerDragKey ? 'border-slate-600 bg-slate-900/30' : 'border-slate-800 bg-slate-900/20'}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => acerOnDrop('mevcut')}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <GripVertical className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-semibold text-slate-200">Mevcut Metrikler</h3>
                        <span className="ml-auto text-xs text-slate-500">{acerKullanilabilir.length}</span>
                      </div>
                      <div className="space-y-1.5">
                        {acerKullanilabilir.length === 0 ? (
                          <div className="text-xs text-slate-500 italic p-3 text-center">Tüm metrikler kullanımda</div>
                        ) : acerKullanilabilir.map(m => (
                          <div
                            key={m.key}
                            draggable
                            onDragStart={() => acerOnDragStart(m.key)}
                            onDragEnd={acerOnDragEnd}
                            data-testid={`acer-metric-${m.key}`}
                            className={`group flex items-center justify-between gap-2 p-2 rounded-md bg-slate-800/60 hover:bg-slate-800 border border-slate-700 cursor-grab active:cursor-grabbing ${m.count === 0 ? 'opacity-60' : ''}`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <GripVertical className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
                              <div className="min-w-0">
                                <div className="text-sm text-white truncate flex items-center gap-1.5">
                                  {m.label}
                                  {m.count === 0 && (
                                    <span className="text-[10px] px-1 py-0 rounded bg-slate-700 text-slate-400 border border-slate-600">veri yok</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {m.count} {m.unit} × {formatCurrency(m.birim)}
                                </div>
                              </div>
                            </div>
                            <div className={`text-sm font-semibold shrink-0 ${m.count === 0 ? 'text-slate-500' : 'text-slate-200'}`}>
                              {formatCurrency(m.tutar)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Toplama Zone */}
                    <div
                      data-testid="acer-rapor-topla-zone"
                      className={`rounded-lg border-2 border-dashed p-3 min-h-[240px] transition-colors ${acerDragKey ? 'border-emerald-500/60 bg-emerald-900/10' : 'border-emerald-700/40 bg-emerald-900/5'}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => acerOnDrop('topla')}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Plus className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-sm font-semibold text-emerald-300">Topla (+)</h3>
                        <span className="ml-auto text-xs text-emerald-400/80">{acerTopla.length}</span>
                      </div>
                      <div className="space-y-1.5">
                        {acerTopla.length === 0 ? (
                          <div className="text-xs text-emerald-200/40 italic p-6 text-center border border-dashed border-emerald-800/40 rounded-md">
                            Buraya sürükleyin
                          </div>
                        ) : acerTopla.map(k => {
                          const m = acerMetrikGetir(k);
                          if (!m) return null;
                          return (
                            <div
                              key={k}
                              draggable
                              onDragStart={() => acerOnDragStart(k)}
                              onDragEnd={acerOnDragEnd}
                              className="flex items-center justify-between gap-2 p-2 rounded-md bg-emerald-900/30 hover:bg-emerald-900/40 border border-emerald-700/50 cursor-grab active:cursor-grabbing"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-sm text-emerald-100 truncate">{m.label}</div>
                                <div className="text-[11px] text-emerald-300/70">
                                  {m.count} {m.unit} × {formatCurrency(m.birim)}
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-emerald-200">+{formatCurrency(m.tutar)}</div>
                              <button
                                onClick={() => acerKaldir(k, 'topla')}
                                className="text-emerald-300/60 hover:text-rose-400 p-0.5"
                                title="Kaldır"
                                data-testid={`acer-topla-remove-${k}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Çıkarma Zone */}
                    <div
                      data-testid="acer-rapor-cikart-zone"
                      className={`rounded-lg border-2 border-dashed p-3 min-h-[240px] transition-colors ${acerDragKey ? 'border-rose-500/60 bg-rose-900/10' : 'border-rose-700/40 bg-rose-900/5'}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => acerOnDrop('cikart')}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Minus className="w-4 h-4 text-rose-400" />
                        <h3 className="text-sm font-semibold text-rose-300">Çıkart (−)</h3>
                        <span className="ml-auto text-xs text-rose-400/80">{acerCikart.length}</span>
                      </div>
                      <div className="space-y-1.5">
                        {acerCikart.length === 0 ? (
                          <div className="text-xs text-rose-200/40 italic p-6 text-center border border-dashed border-rose-800/40 rounded-md">
                            Buraya sürükleyin
                          </div>
                        ) : acerCikart.map(k => {
                          const m = acerMetrikGetir(k);
                          if (!m) return null;
                          return (
                            <div
                              key={k}
                              draggable
                              onDragStart={() => acerOnDragStart(k)}
                              onDragEnd={acerOnDragEnd}
                              className="flex items-center justify-between gap-2 p-2 rounded-md bg-rose-900/30 hover:bg-rose-900/40 border border-rose-700/50 cursor-grab active:cursor-grabbing"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-sm text-rose-100 truncate">{m.label}</div>
                                <div className="text-[11px] text-rose-300/70">
                                  {m.count} {m.unit} × {formatCurrency(m.birim)}
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-rose-200">−{formatCurrency(m.tutar)}</div>
                              <button
                                onClick={() => acerKaldir(k, 'cikart')}
                                className="text-rose-300/60 hover:text-rose-400 p-0.5"
                                title="Kaldır"
                                data-testid={`acer-cikart-remove-${k}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Sabit ekle/çıkar (ikramiye/kesinti) */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-400 mb-1 block">Sabit Ekleme / Çıkarma (TL) — pozitif ekler, negatif çıkarır</Label>
                      <Input
                        type="number"
                        value={acerSabit}
                        onChange={(e) => setAcerSabit(e.target.value)}
                        data-testid="acer-rapor-sabit-input"
                        placeholder="0"
                        className="bg-slate-900 border-slate-700 text-white"
                      />
                    </div>
                  </div>

                  {/* Sonuç Özet */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-3">
                      <div className="text-xs text-emerald-300/80">Toplam (+)</div>
                      <div data-testid="acer-rapor-toplam-topla" className="text-xl font-bold text-emerald-200 mt-1">
                        {formatCurrency(acerTotals.topla)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-rose-700/40 bg-rose-900/10 p-3">
                      <div className="text-xs text-rose-300/80">Toplam (−)</div>
                      <div data-testid="acer-rapor-toplam-cikart" className="text-xl font-bold text-rose-200 mt-1">
                        −{formatCurrency(acerTotals.cikart)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                      <div className="text-xs text-slate-400">Sabit</div>
                      <div className={`text-xl font-bold mt-1 ${acerTotals.sabit < 0 ? 'text-rose-200' : 'text-slate-200'}`}>
                        {acerTotals.sabit >= 0 ? '+' : ''}{formatCurrency(acerTotals.sabit)}
                      </div>
                    </div>
                    <div className="rounded-lg border-2 border-orange-500/60 bg-gradient-to-br from-orange-900/30 to-amber-900/20 p-3">
                      <div className="text-xs text-orange-300">Net Sonuç</div>
                      <div data-testid="acer-rapor-net-sonuc" className={`text-2xl font-extrabold mt-1 ${acerTotals.net < 0 ? 'text-rose-300' : 'text-orange-200'}`}>
                        {formatCurrency(acerTotals.net)}
                      </div>
                    </div>
                  </div>

                  {/* Aşağıda detay: seçilen metriklerin tablosu */}
                  {(acerTopla.length > 0 || acerCikart.length > 0) && (
                    <div className="mt-4 rounded-lg border border-slate-800 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800 bg-slate-900/60">
                            <TableHead className="text-slate-300">İşlem</TableHead>
                            <TableHead className="text-slate-300">Metrik</TableHead>
                            <TableHead className="text-slate-300 text-right">Miktar</TableHead>
                            <TableHead className="text-slate-300 text-right">Birim Fiyat</TableHead>
                            <TableHead className="text-slate-300 text-right">Tutar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {acerTopla.map(k => {
                            const m = acerMetrikGetir(k); if (!m) return null;
                            return (
                              <TableRow key={`t-${k}`} className="border-slate-800">
                                <TableCell><span className="px-2 py-0.5 text-xs rounded bg-emerald-900/40 text-emerald-200 border border-emerald-700/50">+ Topla</span></TableCell>
                                <TableCell className="text-slate-200">{m.label}</TableCell>
                                <TableCell className="text-right text-slate-300">{m.count} {m.unit}</TableCell>
                                <TableCell className="text-right text-slate-300">{formatCurrency(m.birim)}</TableCell>
                                <TableCell className="text-right font-semibold text-emerald-200">+{formatCurrency(m.tutar)}</TableCell>
                              </TableRow>
                            );
                          })}
                          {acerCikart.map(k => {
                            const m = acerMetrikGetir(k); if (!m) return null;
                            return (
                              <TableRow key={`c-${k}`} className="border-slate-800">
                                <TableCell><span className="px-2 py-0.5 text-xs rounded bg-rose-900/40 text-rose-200 border border-rose-700/50">− Çıkart</span></TableCell>
                                <TableCell className="text-slate-200">{m.label}</TableCell>
                                <TableCell className="text-right text-slate-300">{m.count} {m.unit}</TableCell>
                                <TableCell className="text-right text-slate-300">{formatCurrency(m.birim)}</TableCell>
                                <TableCell className="text-right font-semibold text-rose-200">−{formatCurrency(m.tutar)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PuantajRaporlama;
