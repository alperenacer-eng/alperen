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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Trash2, Edit, Search, ArrowLeft, Eye, UserPlus, Wallet, X, FileSpreadsheet, Save, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const AYLAR = [
  { value: 1, label: 'Ocak' },
  { value: 2, label: 'Şubat' },
  { value: 3, label: 'Mart' },
  { value: 4, label: 'Nisan' },
  { value: 5, label: 'Mayıs' },
  { value: 6, label: 'Haziran' },
  { value: 7, label: 'Temmuz' },
  { value: 8, label: 'Ağustos' },
  { value: 9, label: 'Eylül' },
  { value: 10, label: 'Ekim' },
  { value: 11, label: 'Kasım' },
  { value: 12, label: 'Aralık' },
];

// Year options: from 2015 to current+2
const yilOptions = (() => {
  const now = new Date().getFullYear();
  const list = [];
  for (let y = now + 2; y >= 2015; y--) list.push(y);
  return list;
})();

// Puantaj durum tanımları için günlük çarpan alanları
// (Geldi=1.0 sabittir, gösterilmez. Pazar/Resmi Tatil ÇALIŞMA çarpanları ayrı kart üstünde.)
const DURUM_CARPAN_FIELDS = [
  { key: 'durum_carpan_gelmedi',         label: 'Gelmedi',          defVal: 0.0 },
  { key: 'durum_carpan_izinli',          label: 'İzinli',           defVal: 1.0 },
  { key: 'durum_carpan_raporlu',         label: 'Raporlu',          defVal: 0.0 },
  { key: 'durum_carpan_hafta_tatili',    label: 'Hafta Tatili',     defVal: 1.0 },
  { key: 'durum_carpan_resmi_tatil',     label: 'Resmi Tatil',      defVal: 1.0 },
  { key: 'durum_carpan_bayram_tatili',   label: 'Bayram Tatili',    defVal: 1.0 },
  { key: 'durum_carpan_izinsiz_gelmedi', label: 'İzinsiz Gelmedi',  defVal: 0.0 },
  { key: 'durum_carpan_bayram_calisti',  label: 'Bayram Çalıştı',   defVal: 2.0 },
];

// Belirleme tablosu için 11 durumun tam listesi (F.Mesai saatlik, diğerleri günlük)
// carpanKey: personeller tablosundaki çarpan kolonu adı
// overrideKey: aynı durumun manuel ücret override kolonu adı
// tip: 'saatlik' (F.Mesai) veya 'gunluk' (diğerleri)
const BELIRLEME_DURUMLARI = [
  { label: 'F.Mesai',         carpanKey: 'fazla_mesai_carpan',         overrideKey: 'ucret_override_fazla_mesai',         tip: 'saatlik', defCarpan: 1.5 },
  { label: 'Pazar Çal.',      carpanKey: 'pazar_carpan',               overrideKey: 'ucret_override_pazar',               tip: 'gunluk',  defCarpan: 2.0 },
  { label: 'R.Tatil Çal.',    carpanKey: 'resmi_tatil_carpan',         overrideKey: 'ucret_override_resmi_tatil_calisti', tip: 'gunluk',  defCarpan: 2.0 },
  { label: 'Gelmedi',         carpanKey: 'durum_carpan_gelmedi',       overrideKey: 'ucret_override_gelmedi',             tip: 'gunluk',  defCarpan: 0.0 },
  { label: 'İzinli',          carpanKey: 'durum_carpan_izinli',        overrideKey: 'ucret_override_izinli',              tip: 'gunluk',  defCarpan: 1.0 },
  { label: 'Raporlu',         carpanKey: 'durum_carpan_raporlu',       overrideKey: 'ucret_override_raporlu',             tip: 'gunluk',  defCarpan: 0.0 },
  { label: 'Hafta Tatili',    carpanKey: 'durum_carpan_hafta_tatili',  overrideKey: 'ucret_override_hafta_tatili',        tip: 'gunluk',  defCarpan: 1.0 },
  { label: 'Resmi Tatil',     carpanKey: 'durum_carpan_resmi_tatil',   overrideKey: 'ucret_override_resmi_tatil',         tip: 'gunluk',  defCarpan: 1.0 },
  { label: 'Bayram Tatili',   carpanKey: 'durum_carpan_bayram_tatili', overrideKey: 'ucret_override_bayram_tatili',       tip: 'gunluk',  defCarpan: 1.0 },
  { label: 'İzinsiz Gelm.',   carpanKey: 'durum_carpan_izinsiz_gelmedi', overrideKey: 'ucret_override_izinsiz_gelmedi',   tip: 'gunluk',  defCarpan: 0.0 },
  { label: 'Bayram Çal.',     carpanKey: 'durum_carpan_bayram_calisti', overrideKey: 'ucret_override_bayram_calisti',     tip: 'gunluk',  defCarpan: 2.0 },
];

// "Belirleme" sekmesi — Personel × 11 durum, çarpan ve ücret düzenlenebilir tablo.
// Mantık: Çarpan değişirse ücret otomatik yeniden hesaplanır (çarpana bağlı).
//        Ücret elle değişirse "override" sayılır, sarı kenarlık ile işaretlenir.
//        Override'ı kaldırmak için çarpan kalemini değiştirmek yeterli (recompute olur).
const BelirlemeTab = ({ personeller, formatCurrency, onSavePersonel }) => {
  // local edits: { [personelId]: { maas?, fazla_mesai_carpan?, ..., ucret_override_*? } }
  const [edits, setEdits] = useState({});
  const [savingIds, setSavingIds] = useState(new Set());
  // Departman bazında yatay scroll yönetimi
  const scrollRefs = React.useRef({});
  const scrollBy = (dep, delta) => {
    const el = scrollRefs.current[dep];
    if (el) el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // Gerçek değer (edit + personel)
  const valOf = (p, key) => {
    const e = edits[p.id] || {};
    return e[key] !== undefined ? e[key] : p[key];
  };
  const numOr = (v, def = 0) => {
    const n = parseFloat(v);
    return isNaN(n) ? def : n;
  };

  const maasOf = (p) => numOr(valOf(p, 'maas'), 0);
  const gunlukOf = (p) => maasOf(p) / 30;
  const saatlikOf = (p) => maasOf(p) / 30 / 8;

  // Hesaplanan ücret (override yoksa)
  const hesapTutar = (p, d) => {
    const c = numOr(valOf(p, d.carpanKey), d.defCarpan);
    const birim = d.tip === 'saatlik' ? saatlikOf(p) : gunlukOf(p);
    return Math.ceil(birim * c);
  };
  // Gösterilecek ücret (override varsa override, yoksa hesap)
  const gosterTutar = (p, d) => {
    const ovr = valOf(p, d.overrideKey);
    if (ovr !== null && ovr !== undefined && ovr !== '') return numOr(ovr, 0);
    return hesapTutar(p, d);
  };
  const overrideAktif = (p, d) => {
    const ovr = valOf(p, d.overrideKey);
    return ovr !== null && ovr !== undefined && ovr !== '';
  };

  const setEditField = (id, key, value) => {
    setEdits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: value } }));
  };

  // Çarpan değişti: override'ı temizle (çarpana göre yeniden hesaplanır)
  const onCarpanChange = (p, d, val) => {
    setEdits(prev => ({
      ...prev,
      [p.id]: {
        ...(prev[p.id] || {}),
        [d.carpanKey]: val === '' ? '' : parseFloat(val),
        [d.overrideKey]: null,
      },
    }));
  };
  // Ücret değişti: override olarak işaretle
  const onUcretChange = (p, d, val) => {
    setEditField(p.id, d.overrideKey, val === '' ? '' : parseFloat(val));
  };
  // Override'ı kaldır (çarpana geri dön)
  const clearOverride = (p, d) => {
    setEditField(p.id, d.overrideKey, null);
  };

  const handleSave = async (p) => {
    const e = edits[p.id];
    if (!e || Object.keys(e).length === 0) {
      toast.info('Değişiklik yok');
      return;
    }
    setSavingIds(prev => new Set(prev).add(p.id));
    try {
      // Boş override değerlerini null'a çevir (override'ı temizle)
      const payload = { ...e };
      Object.keys(payload).forEach(k => {
        if (payload[k] === '') payload[k] = null;
      });
      await onSavePersonel(p.id, payload);
      // Edit state temizle
      setEdits(prev => {
        const next = { ...prev };
        delete next[p.id];
        return next;
      });
      toast.success(`${p.ad_soyad} güncellendi`);
    } catch (err) {
      console.error(err);
      toast.error('Kaydedilemedi');
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(p.id);
        return next;
      });
    }
  };

  // Toplu kaydet: belirli bir kişi listesi için (departman veya tümü)
  const handleSaveBatch = async (personelList, label) => {
    const targets = personelList.filter(p => edits[p.id] && Object.keys(edits[p.id]).length > 0);
    if (targets.length === 0) {
      toast.info('Kaydedilecek değişiklik yok');
      return;
    }
    setSavingIds(prev => {
      const next = new Set(prev);
      targets.forEach(t => next.add(t.id));
      return next;
    });
    let ok = 0;
    let fail = 0;
    await Promise.all(targets.map(async (p) => {
      try {
        const payload = { ...edits[p.id] };
        Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
        await onSavePersonel(p.id, payload);
        ok += 1;
      } catch (err) {
        console.error(`Save fail for ${p.ad_soyad}:`, err);
        fail += 1;
      }
    }));
    // Başarılı olanların edit state'lerini temizle
    setEdits(prev => {
      const next = { ...prev };
      targets.forEach(t => { delete next[t.id]; });
      return next;
    });
    setSavingIds(prev => {
      const next = new Set(prev);
      targets.forEach(t => next.delete(t.id));
      return next;
    });
    if (fail === 0) toast.success(`${label}: ${ok} personel kaydedildi`);
    else toast.error(`${label}: ${ok} kaydedildi, ${fail} hata`);
  };

  // Çoklu seçim ve toplu belirleme
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [topluDurum, setTopluDurum] = useState(BELIRLEME_DURUMLARI[0].carpanKey);
  const [topluTip, setTopluTip] = useState('carpan'); // 'carpan' | 'ucret'
  const [topluDeger, setTopluDeger] = useState('');

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === personeller.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(personeller.map(p => p.id)));
    }
  };

  // Toplu uygulama: seçili personellerin edits state'ini günceller
  const handleTopluUygula = () => {
    if (selectedIds.size === 0) {
      toast.error('Önce personel seçin');
      return;
    }
    if (topluDeger === '' || isNaN(parseFloat(topluDeger))) {
      toast.error('Geçerli bir değer girin');
      return;
    }
    const durumDef = BELIRLEME_DURUMLARI.find(d => d.carpanKey === topluDurum);
    if (!durumDef) return;
    const value = parseFloat(topluDeger);
    setEdits(prev => {
      const next = { ...prev };
      selectedIds.forEach(id => {
        const cur = next[id] || {};
        if (topluTip === 'carpan') {
          // Çarpan değişikliği → override'ı temizle (çarpana göre hesaplanır)
          next[id] = { ...cur, [durumDef.carpanKey]: value, [durumDef.overrideKey]: null };
        } else {
          // Ücret override
          next[id] = { ...cur, [durumDef.overrideKey]: value };
        }
      });
      return next;
    });
    toast.success(`${selectedIds.size} personele "${durumDef.label}" ${topluTip === 'carpan' ? 'çarpanı' : 'ücreti'} = ${value} uygulandı`);
  };

  const allSelected = personeller.length > 0 && selectedIds.size === personeller.length;

  // Toplam dirty satır sayısı
  const dirtyCount = Object.keys(edits).filter(id => Object.keys(edits[id] || {}).length > 0).length;
  const anySaving = savingIds.size > 0;

  return (
    <div className="space-y-4" data-testid="belirleme-tab">
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="text-xs text-slate-400 flex-1">
          💡 <strong>Çarpan</strong> alanını değiştirirseniz ücret otomatik yeniden hesaplanır.
          <strong> Ücret</strong> alanını değiştirirseniz "manuel override" devreye girer (sarı kenarlık).
          Override'ı kaldırmak için çarpan alanını yeniden düzenleyin veya
          <span className="inline-flex items-center gap-1 px-1 mx-1 rounded bg-slate-800 border border-slate-700 text-[10px]"><RotateCcw className="w-3 h-3" /></span>
          butonuna basın.
        </div>
        <Button
          size="sm"
          onClick={() => handleSaveBatch(personeller, 'Tümü')}
          disabled={dirtyCount === 0 || anySaving}
          className={dirtyCount > 0 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-700'}
          data-testid="belirleme-save-all"
        >
          <Save className="w-4 h-4 mr-1" />
          Tümünü Kaydet {dirtyCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">{dirtyCount}</span>}
        </Button>
      </div>

      {/* Toplu Belirleme Paneli */}
      <Card className="glass-effect border-amber-700/50" data-testid="toplu-belirleme-panel">
        <CardHeader className="border-b border-slate-800 pb-3">
          <CardTitle className="text-base text-amber-300 flex items-center gap-2">
            ⚡ Toplu Belirleme
            <span className="text-xs text-slate-400 font-normal">
              ({selectedIds.size} personel seçili)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div>
              <Label className="text-xs text-slate-300">Durum / Kalem</Label>
              <Select value={topluDurum} onValueChange={setTopluDurum}>
                <SelectTrigger className="bg-slate-950 border-slate-700 mt-1" data-testid="toplu-durum-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 max-h-72">
                  {BELIRLEME_DURUMLARI.map(d => (
                    <SelectItem key={d.carpanKey} value={d.carpanKey}>{d.label} {d.tip === 'saatlik' ? '(saatlik)' : '(günlük)'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-300">Tip</Label>
              <Select value={topluTip} onValueChange={setTopluTip}>
                <SelectTrigger className="bg-slate-950 border-slate-700 mt-1" data-testid="toplu-tip-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="carpan">Çarpan</SelectItem>
                  <SelectItem value="ucret">Ücret (manuel)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-300">Değer</Label>
              <Input
                type="number"
                step="0.01"
                value={topluDeger}
                onChange={(e) => setTopluDeger(e.target.value)}
                className="bg-slate-950 border-slate-700 mt-1"
                placeholder={topluTip === 'carpan' ? 'örn. 1.5' : 'örn. 1500'}
                data-testid="toplu-deger-input"
              />
            </div>
            <Button
              onClick={handleTopluUygula}
              disabled={selectedIds.size === 0}
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="toplu-uygula-btn"
            >
              <Save className="w-4 h-4 mr-1" />
              Seçilenlere Uygula
            </Button>
            <Button
              variant="outline"
              onClick={toggleSelectAll}
              className="border-blue-700 text-blue-300 hover:bg-blue-900/30"
              data-testid="toplu-tumunu-sec"
            >
              {allSelected ? '☑ Tümünü Kaldır' : '☐ Tümünü Seç'}
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-[10px]">{personeller.length}</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedIds(new Set())}
              disabled={selectedIds.size === 0}
              className="border-slate-700 text-slate-300"
              data-testid="toplu-secim-temizle"
            >
              <X className="w-4 h-4 mr-1" />
              Seçimi Temizle
            </Button>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            Uygulayınca değişiklik <strong>edits</strong> state'ine işlenir (sarı çerçeve ile gösterilir). DB'ye yazmak için <strong>"Tümünü Kaydet"</strong> butonuna basın.
          </p>
        </CardContent>
      </Card>

      {/* Tek tablo - tüm personel */}
      <Card className="glass-effect border-slate-800">
        <CardHeader className="border-b border-slate-800 pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base text-blue-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              Tüm Personel <span className="text-slate-500 text-sm font-normal">({personeller.length} kişi)</span>
            </CardTitle>
            <div className="flex items-center gap-1 border border-slate-700 rounded-md bg-slate-900/60">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => scrollBy('all', -400)}
                title="Sola kaydır"
                data-testid="belirleme-scroll-left"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-[10px] text-slate-500 px-1">Kaydır</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => scrollBy('all', 400)}
                title="Sağa kaydır"
                data-testid="belirleme-scroll-right"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div
            ref={(el) => { if (el) scrollRefs.current['all'] = el; }}
            className="w-full overflow-x-auto"
            data-testid="belirleme-scroll-all"
          >
            <div className="min-w-max">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 bg-slate-900/95">
                    <TableHead className="text-slate-300 sticky left-0 bg-slate-950 z-10 w-12">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 cursor-pointer"
                        data-testid="belirleme-select-all-cb"
                        title="Tümünü seç/kaldır"
                      />
                    </TableHead>
                    <TableHead className="text-slate-300 sticky left-12 bg-slate-950 z-10 min-w-[180px]">Ad Soyad</TableHead>
                    <TableHead className="text-slate-300 min-w-[130px]">Departman</TableHead>
                    <TableHead className="text-slate-300 min-w-[110px]">Maaş</TableHead>
                    <TableHead className="text-slate-300 min-w-[110px]">Günlük</TableHead>
                    {BELIRLEME_DURUMLARI.map(d => (
                      <TableHead key={d.carpanKey} className="text-slate-300 min-w-[170px] text-center border-l border-slate-800">
                        <div>{d.label}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{d.tip === 'saatlik' ? '(₺/saat)' : '(₺/gün)'}</div>
                      </TableHead>
                    ))}
                    <TableHead className="text-slate-300 sticky right-0 bg-slate-950 z-10 min-w-[120px]">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personeller.map((p, idx) => {
                    const isDirty = edits[p.id] && Object.keys(edits[p.id]).length > 0;
                    const isSelected = selectedIds.has(p.id);
                    return (
                      <TableRow key={p.id} className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'} ${isDirty ? 'ring-1 ring-amber-500/40' : ''} ${isSelected ? 'bg-amber-900/10' : ''}`}>
                        <TableCell className="sticky left-0 bg-slate-950 z-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(p.id)}
                            className="w-4 h-4 cursor-pointer"
                            data-testid={`belirleme-select-${p.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-white sticky left-12 bg-slate-950 z-10">{p.ad_soyad}</TableCell>
                        <TableCell className="text-blue-300 text-sm">{p.departman || '-'}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={valOf(p, 'maas') ?? ''}
                            onChange={(e) => setEditField(p.id, 'maas', e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className="bg-slate-950 border-slate-700 h-8 text-sm w-[100px]"
                            data-testid={`belirleme-maas-${p.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-cyan-300 text-sm">{formatCurrency(gunlukOf(p))}</TableCell>
                        {BELIRLEME_DURUMLARI.map(d => {
                          const ovrAktif = overrideAktif(p, d);
                          const gost = gosterTutar(p, d);
                          return (
                            <TableCell key={d.carpanKey} className="border-l border-slate-800/50">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={valOf(p, d.carpanKey) ?? ''}
                                  onChange={(e) => onCarpanChange(p, d, e.target.value)}
                                  className="bg-slate-950 border-slate-700 h-8 text-xs w-[55px] text-center"
                                  placeholder={String(d.defCarpan)}
                                  data-testid={`belirleme-carpan-${d.carpanKey}-${p.id}`}
                                  title="Çarpan"
                                />
                                <span className="text-slate-500 text-xs">×</span>
                                <Input
                                  type="number"
                                  value={ovrAktif ? (valOf(p, d.overrideKey) ?? '') : Math.round(gost)}
                                  onChange={(e) => onUcretChange(p, d, e.target.value)}
                                  className={`bg-slate-950 h-8 text-xs w-[85px] text-right ${ovrAktif ? 'border-amber-500 text-amber-300' : 'border-slate-700'}`}
                                  data-testid={`belirleme-ucret-${d.overrideKey}-${p.id}`}
                                  title={ovrAktif ? 'Manuel override' : 'Hesaplanan tutar (düzenleyince override olur)'}
                                />
                                {ovrAktif && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-slate-400 hover:text-amber-400"
                                    onClick={() => clearOverride(p, d)}
                                    title="Override'ı kaldır (çarpana göre yeniden hesapla)"
                                    data-testid={`belirleme-clear-ovr-${d.overrideKey}-${p.id}`}
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                        <TableCell className="sticky right-0 bg-slate-950 z-10">
                          <Button
                            size="sm"
                            onClick={() => handleSave(p)}
                            disabled={!isDirty || savingIds.has(p.id)}
                            className={isDirty ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-700'}
                            data-testid={`belirleme-save-${p.id}`}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            {savingIds.has(p.id) ? '...' : 'Kaydet'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Tek noktada yönetilen "Durum Çarpanları" paneli (açılır/kapanır).
// Hem yeni personel hem düzenleme modalında aynı şekilde kullanılır.
// Props: data (mevcut değerler), onChange(key, value), gunluk (anlık günlük hak ediş ₺), formatCurrency
const DurumCarpanlariPanel = ({ data, onChange, gunluk, formatCurrency, idPrefix = 'new' }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="col-span-3 mt-2" data-testid={`${idPrefix}-durum-carpan-panel`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-sm text-left transition-colors"
        data-testid={`${idPrefix}-durum-carpan-toggle`}
      >
        <span className="font-semibold text-amber-400">📊 Durum Çarpanları (8 puantaj durumu için günlük çarpan)</span>
        <span className="text-slate-400">{open ? '▲ Gizle' : '▼ Göster'}</span>
      </button>
      {open && (
        <div className="mt-3 p-3 border border-slate-700 rounded-md bg-slate-900/50">
          <p className="text-[11px] text-slate-500 mb-3">
            Her durum için <strong>Günlük Hak Ediş × Çarpan</strong> formülüyle ücret yukarı yuvarlanarak hesaplanır.
            "Geldi" durumu için çarpan 1.0 sabittir.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {DURUM_CARPAN_FIELDS.map(f => {
              const raw = data?.[f.key];
              const val = (raw === undefined || raw === null) ? f.defVal : raw;
              const num = parseFloat(val) || 0;
              const ucret = Math.ceil((parseFloat(gunluk) || 0) * num);
              return (
                <div key={f.key}>
                  <Label className="text-xs text-slate-300">{f.label}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={raw ?? ''}
                    onChange={(e) => onChange(f.key, e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="bg-slate-950 border-slate-700 mt-1"
                    placeholder={String(f.defVal)}
                    data-testid={`${idPrefix}-${f.key}-input`}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Ücret: <span className="text-green-400 font-medium">{formatCurrency(ucret)}</span> / gün
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const ayLabel = (ay) => {
  const m = AYLAR.find(a => a.value === Number(ay));
  return m ? m.label : '-';
};

const emptyPersonel = {
  ad: '',
  soyad: '',
  ad_soyad: '',
  tc_kimlik: '',
  telefon: '',
  email: '',
  adres: '',
  dogum_tarihi: '',
  ise_giris_tarihi: '',
  departman: '',
  pozisyon: '',
  maas: 0,
  banka: '',
  iban: '',
  sgk_no: '',
  ehliyet_sinifi: '',
  kan_grubu: '',
  acil_durum_kisi: '',
  acil_durum_telefon: '',
  notlar: '',
  aktif: true,
  // Mesai ücret çarpanları
  fazla_mesai_carpan: 1.5,
  pazar_carpan: 2.0,
  resmi_tatil_carpan: 2.0,
  // Durum bazlı günlük çarpanlar (Geldi=1.0 sabittir, gösterilmez)
  durum_carpan_gelmedi: 0.0,
  durum_carpan_izinli: 1.0,
  durum_carpan_raporlu: 0.0,
  durum_carpan_hafta_tatili: 1.0,
  durum_carpan_resmi_tatil: 1.0,
  durum_carpan_bayram_tatili: 1.0,
  durum_carpan_izinsiz_gelmedi: 0.0,
  durum_carpan_bayram_calisti: 2.0,
  // İlk maaş dönemi opsiyonel alanları
  ilk_maas_baslangic_yil: null,
  ilk_maas_baslangic_ay: null,
  ilk_maas_bitis_yil: null,
  ilk_maas_bitis_ay: null,
};

const PersonelListesi = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  
  const [personeller, setPersoneller] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPersonel, setSelectedPersonel] = useState(null);
  const [editingPersonel, setEditingPersonel] = useState(null);
  const [newPersonel, setNewPersonel] = useState(emptyPersonel);
  const [departmanlar, setDepartmanlar] = useState([]);
  const [pozisyonlar, setPozisyonlar] = useState([]);

  // Salary history dialog
  const [isMaasDialogOpen, setIsMaasDialogOpen] = useState(false);
  const [maasPersonel, setMaasPersonel] = useState(null);
  const [maasDonemleri, setMaasDonemleri] = useState([]);
  const [yeniDonem, setYeniDonem] = useState({ baslangic_yil: '', baslangic_ay: '', bitis_yil: '', bitis_ay: '', maas: '' });
  const [editingDonemId, setEditingDonemId] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchPersoneller = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/personeller`, { headers });
      setPersoneller(response.data);
    } catch (e) {
      console.error(e);
      toast.error('Personeller yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchKaynaklar = useCallback(async () => {
    try {
      const [depRes, pozRes] = await Promise.all([
        axios.get(`${API_URL}/personel-departmanlar`, { headers }),
        axios.get(`${API_URL}/pozisyonlar`, { headers }),
      ]);
      setDepartmanlar(depRes.data);
      setPozisyonlar(pozRes.data);
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  useEffect(() => {
    if (!currentModule || currentModule.id !== 'personel') {
      navigate('/');
      return;
    }
    fetchPersoneller();
    fetchKaynaklar();
  }, [currentModule, fetchPersoneller, fetchKaynaklar, navigate]);

  const handleAddPersonel = async () => {
    const adVal = (newPersonel.ad || '').trim();
    const soyadVal = (newPersonel.soyad || '').trim();
    if (!adVal && !soyadVal) {
      toast.error('Ad veya Soyad zorunludur');
      return;
    }
    try {
      const payload = { ...newPersonel };
      payload.ad = adVal;
      payload.soyad = soyadVal;
      payload.ad_soyad = (adVal + ' ' + soyadVal).trim();
      // null değerleri temizle: backend opsiyonel kabul ediyor
      ['ilk_maas_baslangic_yil','ilk_maas_baslangic_ay','ilk_maas_bitis_yil','ilk_maas_bitis_ay'].forEach(k => {
        if (payload[k] === '' || payload[k] === null || payload[k] === undefined) {
          payload[k] = null;
        } else {
          payload[k] = Number(payload[k]);
        }
      });
      await axios.post(`${API_URL}/personeller`, payload, { headers });
      toast.success('Personel eklendi');
      setNewPersonel(emptyPersonel);
      setIsAddDialogOpen(false);
      fetchPersoneller();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || 'Personel eklenirken hata oluştu');
    }
  };

  const handleDeletePersonel = async (id) => {
    if (window.confirm('Bu personeli silmek istediğinize emin misiniz? Tüm maaş geçmişi de silinecektir.')) {
      try {
        await axios.delete(`${API_URL}/personeller/${id}`, { headers });
        toast.success('Personel silindi');
        fetchPersoneller();
      } catch (e) {
        console.error(e);
        toast.error('Personel silinirken hata oluştu');
      }
    }
  };

  const handleEditPersonel = (personel) => {
    setEditingPersonel({...personel});
    setIsEditDialogOpen(true);
  };

  const handleUpdatePersonel = async () => {
    if (!editingPersonel) {
      return;
    }
    const adVal = ((editingPersonel.ad ?? '') + '').trim();
    const soyadVal = ((editingPersonel.soyad ?? '') + '').trim();
    if (!adVal && !soyadVal) {
      toast.error('Ad veya Soyad zorunludur');
      return;
    }
    try {
      const payload = { ...editingPersonel, ad: adVal, soyad: soyadVal, ad_soyad: (adVal + ' ' + soyadVal).trim() };
      await axios.put(`${API_URL}/personeller/${editingPersonel.id}`, payload, { headers });
      toast.success('Personel güncellendi');
      setIsEditDialogOpen(false);
      setEditingPersonel(null);
      fetchPersoneller();
    } catch (e) {
      console.error(e);
      toast.error('Personel güncellenirken hata oluştu');
    }
  };

  // Belirleme sekmesinden tek personel için kısmi update
  const handleSavePersonelFromBelirleme = async (id, partialPayload) => {
    await axios.put(`${API_URL}/personeller/${id}`, partialPayload, { headers });
    await fetchPersoneller();
  };

  // ---- Maaş Geçmişi ----
  const openMaasDialog = async (personel) => {
    setMaasPersonel(personel);
    setIsMaasDialogOpen(true);
    setYeniDonem({ baslangic_yil: '', baslangic_ay: '', bitis_yil: '', bitis_ay: '', maas: '' });
    setEditingDonemId(null);
    await loadMaasDonemleri(personel.id);
  };

  const loadMaasDonemleri = async (personelId) => {
    try {
      const res = await axios.get(`${API_URL}/personeller/${personelId}/maas-donemleri`, { headers });
      setMaasDonemleri(res.data);
    } catch (e) {
      console.error(e);
      toast.error('Maaş dönemleri yüklenemedi');
    }
  };

  const handleSaveDonem = async () => {
    if (!yeniDonem.baslangic_yil || !yeniDonem.baslangic_ay) {
      toast.error('Başlangıç yıl ve ayı zorunludur');
      return;
    }
    if (!yeniDonem.maas || Number(yeniDonem.maas) <= 0) {
      toast.error('Geçerli bir maaş giriniz');
      return;
    }
    const payload = {
      baslangic_yil: Number(yeniDonem.baslangic_yil),
      baslangic_ay: Number(yeniDonem.baslangic_ay),
      bitis_yil: yeniDonem.bitis_yil ? Number(yeniDonem.bitis_yil) : null,
      bitis_ay: yeniDonem.bitis_ay ? Number(yeniDonem.bitis_ay) : null,
      maas: Number(yeniDonem.maas),
    };
    if ((payload.bitis_yil && !payload.bitis_ay) || (!payload.bitis_yil && payload.bitis_ay)) {
      toast.error('Bitiş tarihi için hem yıl hem ay girilmelidir (veya ikisi de boş)');
      return;
    }
    try {
      if (editingDonemId) {
        await axios.put(`${API_URL}/maas-donemleri/${editingDonemId}`, payload, { headers });
        toast.success('Maaş dönemi güncellendi');
      } else {
        await axios.post(`${API_URL}/personeller/${maasPersonel.id}/maas-donemleri`, payload, { headers });
        toast.success('Maaş dönemi eklendi');
      }
      setYeniDonem({ baslangic_yil: '', baslangic_ay: '', bitis_yil: '', bitis_ay: '', maas: '' });
      setEditingDonemId(null);
      await loadMaasDonemleri(maasPersonel.id);
      fetchPersoneller();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || 'Kaydedilemedi');
    }
  };

  const handleEditDonem = (d) => {
    setEditingDonemId(d.id);
    setYeniDonem({
      baslangic_yil: String(d.baslangic_yil),
      baslangic_ay: String(d.baslangic_ay),
      bitis_yil: d.bitis_yil ? String(d.bitis_yil) : '',
      bitis_ay: d.bitis_ay ? String(d.bitis_ay) : '',
      maas: String(d.maas),
    });
  };

  const handleCancelEditDonem = () => {
    setEditingDonemId(null);
    setYeniDonem({ baslangic_yil: '', baslangic_ay: '', bitis_yil: '', bitis_ay: '', maas: '' });
  };

  const handleDeleteDonem = async (donemId) => {
    if (!window.confirm('Bu maaş dönemini silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/maas-donemleri/${donemId}`, { headers });
      toast.success('Maaş dönemi silindi');
      await loadMaasDonemleri(maasPersonel.id);
    } catch (e) {
      console.error(e);
      toast.error('Silinemedi');
    }
  };

  const filteredPersoneller = personeller.filter(p =>
    p.ad_soyad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.departman?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.pozisyon?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Departmana göre grupla
  const groupedPersoneller = React.useMemo(() => {
    const groups = {};
    filteredPersoneller.forEach(p => {
      const dep = (p.departman && p.departman.trim()) ? p.departman : 'Belirtilmemiş';
      if (!groups[dep]) groups[dep] = [];
      groups[dep].push(p);
    });
    // Departman adlarını alfabetik sırala, "Belirtilmemiş" en sonda
    const keys = Object.keys(groups).sort((a, b) => {
      if (a === 'Belirtilmemiş') return 1;
      if (b === 'Belirtilmemiş') return -1;
      return a.localeCompare(b, 'tr');
    });
    return keys.map(k => ({ departman: k, personeller: groups[k] }));
  }, [filteredPersoneller]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);
  };

  // Personel için mesai/pazar/tatil ücretlerini hesapla
  // Personel başı F.Mesai (saatlik), Pazar (günlük), R.Tatil Çal. (günlük) ücretleri.
  // Belirleme'de override girilmişse onu döndürür; yoksa Maaş × Çarpan formülünden hesaplar.
  const hesaplaMesaiUcretleri = (p) => {
    const maas = parseFloat(p.maas) || 0;
    const gunluk = maas / 30;
    const saatlik = gunluk / 8;
    const fc = parseFloat(p.fazla_mesai_carpan ?? 1.5) || 0;
    const pc = parseFloat(p.pazar_carpan ?? 2.0) || 0;
    const rc = parseFloat(p.resmi_tatil_carpan ?? 2.0) || 0;
    const applyOvr = (ovr, fallback) => (ovr !== null && ovr !== undefined && ovr !== '' && !isNaN(parseFloat(ovr))) ? parseFloat(ovr) : fallback;
    return {
      fazlaMesaiSaatlik: applyOvr(p.ucret_override_fazla_mesai, Math.ceil(saatlik * fc)),
      pazarGunluk:       applyOvr(p.ucret_override_pazar, Math.ceil(gunluk * pc)),
      tatilGunluk:       applyOvr(p.ucret_override_resmi_tatil_calisti, Math.ceil(gunluk * rc)),
      // Override aktif olup olmadığı (UI'da rozet için)
      fmOverride:    p.ucret_override_fazla_mesai !== null && p.ucret_override_fazla_mesai !== undefined,
      pazarOverride: p.ucret_override_pazar !== null && p.ucret_override_pazar !== undefined,
      tatilOverride: p.ucret_override_resmi_tatil_calisti !== null && p.ucret_override_resmi_tatil_calisti !== undefined,
    };
  };

  const handleExportExcel = () => {
    try {
      const rows = filteredPersoneller.map((p) => {
        const u = hesaplaMesaiUcretleri(p);
        return {
          'Ad Soyad': p.ad_soyad || '',
          'Departman': p.departman || '',
          'Pozisyon': p.pozisyon || '',
          'Telefon': p.telefon || '',
          'İşe Giriş': p.ise_giris_tarihi || '',
          'Güncel Maaş (₺)': parseFloat(p.maas) || 0,
          'Fazla Mesai (₺/saat)': u.fazlaMesaiSaatlik,
          'Pazar Ücreti (₺/gün)': u.pazarGunluk,
          'Resmi Tatil Ücreti (₺/gün)': u.tatilGunluk,
          'Fazla Mesai Çarpan': parseFloat(p.fazla_mesai_carpan ?? 1.5) || 0,
          'Pazar Çarpan': parseFloat(p.pazar_carpan ?? 2.0) || 0,
          'Resmi Tatil Çarpan': parseFloat(p.resmi_tatil_carpan ?? 2.0) || 0,
          // Durum bazlı günlük çarpanlar (8 puantaj durumu)
          'Gelmedi Çarpan': parseFloat(p.durum_carpan_gelmedi ?? 0.0) || 0,
          'İzinli Çarpan': parseFloat(p.durum_carpan_izinli ?? 1.0) || 0,
          'Raporlu Çarpan': parseFloat(p.durum_carpan_raporlu ?? 0.0) || 0,
          'Hafta Tatili Çarpan': parseFloat(p.durum_carpan_hafta_tatili ?? 1.0) || 0,
          'Resmi Tatil (yalın) Çarpan': parseFloat(p.durum_carpan_resmi_tatil ?? 1.0) || 0,
          'Bayram Tatili Çarpan': parseFloat(p.durum_carpan_bayram_tatili ?? 1.0) || 0,
          'İzinsiz Gelmedi Çarpan': parseFloat(p.durum_carpan_izinsiz_gelmedi ?? 0.0) || 0,
          'Bayram Çalıştı Çarpan': parseFloat(p.durum_carpan_bayram_calisti ?? 2.0) || 0,
          'Durum': p.aktif ? 'Aktif' : 'Pasif',
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Personel');
      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `personel-listesi-${today}.xlsx`);
      toast.success('Excel dosyası indirildi');
    } catch (e) {
      console.error(e);
      toast.error('Excel oluşturulurken hata oluştu');
    }
  };

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
            <h1 className="text-3xl font-bold text-white mb-2">Personel Listesi</h1>
            <p className="text-slate-400">Toplam {personeller.length} personel</p>
          </div>
          <div className="flex items-center gap-2">
            <Button data-testid="export-excel-btn" onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel'e Aktar
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="w-4 h-4 mr-2" /> Yeni Personel Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle>Yeni Personel Ekle</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-4 py-4">
                <div className="col-span-3 border-b border-slate-700 pb-2 mb-2">
                  <h3 className="text-sm font-semibold text-blue-400">Kişisel Bilgiler</h3>
                </div>
                <div>
                  <Label className="text-red-400">Ad *</Label>
                  <Input value={newPersonel.ad} onChange={(e) => setNewPersonel({...newPersonel, ad: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label className="text-red-400">Soyad *</Label>
                  <Input value={newPersonel.soyad} onChange={(e) => setNewPersonel({...newPersonel, soyad: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>TC Kimlik No</Label>
                  <Input value={newPersonel.tc_kimlik} onChange={(e) => setNewPersonel({...newPersonel, tc_kimlik: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>Doğum Tarihi</Label>
                  <Input type="date" value={newPersonel.dogum_tarihi} onChange={(e) => setNewPersonel({...newPersonel, dogum_tarihi: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input value={newPersonel.telefon} onChange={(e) => setNewPersonel({...newPersonel, telefon: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>E-posta</Label>
                  <Input type="email" value={newPersonel.email} onChange={(e) => setNewPersonel({...newPersonel, email: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>Kan Grubu</Label>
                  <Select value={newPersonel.kan_grubu} onValueChange={(v) => setNewPersonel({...newPersonel, kan_grubu: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'].map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label>Adres</Label>
                  <Textarea value={newPersonel.adres} onChange={(e) => setNewPersonel({...newPersonel, adres: e.target.value})} className="bg-slate-950 border-slate-700" rows={2} />
                </div>

                <div className="col-span-3 border-b border-slate-700 pb-2 mb-2 mt-4">
                  <h3 className="text-sm font-semibold text-green-400">İş Bilgileri</h3>
                </div>
                <div>
                  <Label>İşe Giriş Tarihi</Label>
                  <Input type="date" value={newPersonel.ise_giris_tarihi} onChange={(e) => setNewPersonel({...newPersonel, ise_giris_tarihi: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>Departman</Label>
                  <Select value={newPersonel.departman} onValueChange={(v) => setNewPersonel({...newPersonel, departman: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {departmanlar.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pozisyon</Label>
                  <Select value={newPersonel.pozisyon} onValueChange={(v) => setNewPersonel({...newPersonel, pozisyon: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {pozisyonlar.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ehliyet Sınıfı</Label>
                  <Select value={newPersonel.ehliyet_sinifi} onValueChange={(v) => setNewPersonel({...newPersonel, ehliyet_sinifi: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {['Yok', 'B', 'C', 'D', 'E', 'SRC'].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>SGK No</Label>
                  <Input value={newPersonel.sgk_no} onChange={(e) => setNewPersonel({...newPersonel, sgk_no: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>

                {/* MAAŞ BİLGİLERİ - AYRI BÖLÜM */}
                <div className="col-span-3 border-b border-slate-700 pb-2 mb-2 mt-4">
                  <h3 className="text-sm font-semibold text-purple-400">💰 Maaş Bilgileri (Opsiyonel ilk dönem)</h3>
                  <p className="text-xs text-slate-500 mt-1">Maaş bilgisini şimdi girebilir veya personel oluşturduktan sonra "Maaş Geçmişi" üzerinden ekleyebilirsiniz.</p>
                </div>
                <div>
                  <Label>Maaş Tutarı (₺)</Label>
                  <Input type="number" value={newPersonel.maas || ''} onChange={(e) => setNewPersonel({...newPersonel, maas: parseFloat(e.target.value) || 0})} className="bg-slate-950 border-slate-700" placeholder="0" />
                </div>
                <div>
                  <Label>Başlangıç Yılı</Label>
                  <Select value={newPersonel.ilk_maas_baslangic_yil ? String(newPersonel.ilk_maas_baslangic_yil) : ''} onValueChange={(v) => setNewPersonel({...newPersonel, ilk_maas_baslangic_yil: v ? Number(v) : null})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Yıl" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                      {yilOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Başlangıç Ayı</Label>
                  <Select value={newPersonel.ilk_maas_baslangic_ay ? String(newPersonel.ilk_maas_baslangic_ay) : ''} onValueChange={(v) => setNewPersonel({...newPersonel, ilk_maas_baslangic_ay: v ? Number(v) : null})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Ay" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {AYLAR.map(a => <SelectItem key={a.value} value={String(a.value)}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div></div>
                <div>
                  <Label>Bitiş Yılı (boş bırakılabilir)</Label>
                  <Select value={newPersonel.ilk_maas_bitis_yil ? String(newPersonel.ilk_maas_bitis_yil) : ''} onValueChange={(v) => setNewPersonel({...newPersonel, ilk_maas_bitis_yil: v ? Number(v) : null})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Yıl" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                      {yilOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Bitiş Ayı (boş bırakılabilir)</Label>
                  <Select value={newPersonel.ilk_maas_bitis_ay ? String(newPersonel.ilk_maas_bitis_ay) : ''} onValueChange={(v) => setNewPersonel({...newPersonel, ilk_maas_bitis_ay: v ? Number(v) : null})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Ay" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {AYLAR.map(a => <SelectItem key={a.value} value={String(a.value)}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* MESAİ ÜCRET HESAPLAMA - YENİ BÖLÜM */}
                <div className="col-span-3 border-b border-slate-700 pb-2 mb-2 mt-4">
                  <h3 className="text-sm font-semibold text-amber-400">⏱️ Mesai Ücret Çarpanları</h3>
                  <p className="text-xs text-slate-500 mt-1">Günlük Hak Ediş = Maaş / 30. Mesai ücretleri günlük hak ediş × çarpan formülüyle hesaplanır.</p>
                </div>
                {(() => {
                  const maas = parseFloat(newPersonel.maas) || 0;
                  const gunluk = maas / 30;
                  const saatlik = gunluk / 8; // 8 saatlik mesai
                  const fc = parseFloat(newPersonel.fazla_mesai_carpan) || 0;
                  const pc = parseFloat(newPersonel.pazar_carpan) || 0;
                  const rc = parseFloat(newPersonel.resmi_tatil_carpan) || 0;
                  const fazlaMesaiSaatlik = Math.ceil(saatlik * fc);
                  const pazarGunluk = Math.ceil(gunluk * pc);
                  const tatilGunluk = Math.ceil(gunluk * rc);
                  return (
                    <>
                      <div className="col-span-3 bg-slate-800/40 rounded p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="text-center p-2 border border-slate-700 rounded">
                          <p className="text-xs text-slate-400">Günlük Hak Ediş</p>
                          <p className="text-lg font-semibold text-amber-300">{formatCurrency(gunluk)}</p>
                          <p className="text-[10px] text-slate-500 mt-1">(Maaş / 30)</p>
                        </div>
                        <div className="text-center p-2 border border-slate-700 rounded">
                          <p className="text-xs text-slate-400">Saatlik Ücret</p>
                          <p className="text-lg font-semibold text-cyan-300">{formatCurrency(saatlik)}</p>
                          <p className="text-[10px] text-slate-500 mt-1">(Maaş / 30 / 8)</p>
                        </div>
                        <div className="text-center p-2 border border-slate-700 rounded">
                          <p className="text-xs text-slate-400">Aylık Maaş</p>
                          <p className="text-lg font-semibold text-white">{formatCurrency(maas)}</p>
                        </div>
                      </div>

                      <div>
                        <Label>Fazla Mesai Çarpanı (saatlik)</Label>
                        <Input type="number" step="0.1" min="0" value={newPersonel.fazla_mesai_carpan ?? ''} onChange={(e) => setNewPersonel({...newPersonel, fazla_mesai_carpan: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="bg-slate-950 border-slate-700" placeholder="1.5" />
                        <p className="text-xs text-green-400 mt-1" data-testid="new-fazla-mesai-saatlik">Fazla Mesai: {formatCurrency(fazlaMesaiSaatlik)} / saat</p>
                        <p className="text-[10px] text-slate-500">⌈(Maaş/30/8) × {fc}⌉ yukarı yuvarlanmış</p>
                      </div>
                      <div>
                        <Label>Pazar Çalışma Çarpanı (günlük)</Label>
                        <Input type="number" step="0.1" min="0" value={newPersonel.pazar_carpan ?? ''} onChange={(e) => setNewPersonel({...newPersonel, pazar_carpan: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="bg-slate-950 border-slate-700" placeholder="2.0" />
                        <p className="text-xs text-green-400 mt-1">Pazar Ücreti: {formatCurrency(pazarGunluk)} / gün</p>
                        <p className="text-[10px] text-slate-500">⌈(Maaş/30) × {pc}⌉ yukarı yuvarlanmış</p>
                      </div>
                      <div>
                        <Label>Resmi Tatil Çarpanı (günlük)</Label>
                        <Input type="number" step="0.1" min="0" value={newPersonel.resmi_tatil_carpan ?? ''} onChange={(e) => setNewPersonel({...newPersonel, resmi_tatil_carpan: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="bg-slate-950 border-slate-700" placeholder="2.0" />
                        <p className="text-xs text-green-400 mt-1">Resmi Tatil Ücreti: {formatCurrency(tatilGunluk)} / gün</p>
                        <p className="text-[10px] text-slate-500">⌈(Maaş/30) × {rc}⌉ yukarı yuvarlanmış</p>
                      </div>

                      <DurumCarpanlariPanel
                        data={newPersonel}
                        onChange={(key, value) => setNewPersonel({...newPersonel, [key]: value})}
                        gunluk={gunluk}
                        formatCurrency={formatCurrency}
                        idPrefix="new"
                      />
                    </>
                  );
                })()}

                {/* BANKA BİLGİLERİ - AYRI BÖLÜM */}
                <div className="col-span-3 border-b border-slate-700 pb-2 mb-2 mt-4">
                  <h3 className="text-sm font-semibold text-cyan-400">🏦 Banka Bilgileri</h3>
                </div>
                <div>
                  <Label>Banka</Label>
                  <Input value={newPersonel.banka} onChange={(e) => setNewPersonel({...newPersonel, banka: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div className="col-span-2">
                  <Label>IBAN</Label>
                  <Input value={newPersonel.iban} onChange={(e) => setNewPersonel({...newPersonel, iban: e.target.value})} className="bg-slate-950 border-slate-700" placeholder="TR00 0000 0000 0000 0000 0000 00" />
                </div>

                <div className="col-span-3 border-b border-slate-700 pb-2 mb-2 mt-4">
                  <h3 className="text-sm font-semibold text-orange-400">Acil Durum İletişim</h3>
                </div>
                <div>
                  <Label>Acil Durum Kişisi</Label>
                  <Input value={newPersonel.acil_durum_kisi} onChange={(e) => setNewPersonel({...newPersonel, acil_durum_kisi: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>Acil Durum Telefonu</Label>
                  <Input value={newPersonel.acil_durum_telefon} onChange={(e) => setNewPersonel({...newPersonel, acil_durum_telefon: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>Notlar</Label>
                  <Input value={newPersonel.notlar} onChange={(e) => setNewPersonel({...newPersonel, notlar: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-slate-700">İptal</Button>
                <Button onClick={handleAddPersonel} className="bg-blue-600 hover:bg-blue-700">Kaydet</Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      {/* Sekmeler: Liste / Belirleme */}
      <Tabs defaultValue="liste" className="w-full" data-testid="personel-tabs">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="liste" data-testid="tab-liste">📋 Liste</TabsTrigger>
          <TabsTrigger value="belirleme" data-testid="tab-belirleme">⚙️ Belirleme</TabsTrigger>
        </TabsList>

        <TabsContent value="liste" className="mt-4">
          {/* Arama */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Ad, departman veya pozisyon ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900 border-slate-700 text-white"
              />
            </div>
          </div>

      {/* Tablo */}
      <Card className="glass-effect border-slate-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
          ) : filteredPersoneller.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Personel bulunamadı</div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-950">
                  <TableRow className="border-slate-800 bg-slate-900/95 backdrop-blur">
                    <TableHead className="text-slate-300">Ad Soyad</TableHead>
                    <TableHead className="text-slate-300">Departman</TableHead>
                    <TableHead className="text-slate-300">Pozisyon</TableHead>
                    <TableHead className="text-slate-300">Telefon</TableHead>
                    <TableHead className="text-slate-300">İşe Giriş</TableHead>
                    <TableHead className="text-slate-300">Güncel Maaş</TableHead>
                    <TableHead className="text-slate-300">F. Mesai (₺/saat)</TableHead>
                    <TableHead className="text-slate-300">Pazar (₺/gün)</TableHead>
                    <TableHead className="text-slate-300">R. Tatil (₺/gün)</TableHead>
                    <TableHead className="text-slate-300">Çarpanlar</TableHead>
                    <TableHead className="text-slate-300">Durum</TableHead>
                    <TableHead className="text-slate-300">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedPersoneller.map((grup) => (
                    <React.Fragment key={grup.departman}>
                      <TableRow className="border-slate-800 bg-blue-900/20 hover:bg-blue-900/30">
                        <TableCell colSpan={12} className="py-2">
                          <div className="flex items-center gap-2 text-sm font-semibold text-blue-300">
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
                            <span className="uppercase tracking-wide">{grup.departman}</span>
                            <span className="text-slate-400 font-normal">({grup.personeller.length} kişi)</span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {grup.personeller.map((p, idx) => {
                        const u = hesaplaMesaiUcretleri(p);
                        return (
                        <TableRow key={p.id} className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'} hover:bg-slate-800/50`}>
                          <TableCell className="font-medium text-white">{p.ad_soyad}</TableCell>
                          <TableCell className="text-slate-300">{p.departman || '-'}</TableCell>
                          <TableCell className="text-slate-300">{p.pozisyon || '-'}</TableCell>
                          <TableCell className="text-slate-300">{p.telefon || '-'}</TableCell>
                          <TableCell className="text-slate-300">{p.ise_giris_tarihi || '-'}</TableCell>
                          <TableCell className="text-white font-semibold">{formatCurrency(p.maas)}</TableCell>
                          <TableCell className={`text-blue-300 ${u.fmOverride ? 'border-l-2 border-amber-500' : ''}`} title={u.fmOverride ? 'Manuel ücret (Belirleme)' : `Çarpan: ${p.fazla_mesai_carpan ?? 1.5}`}>
                            {formatCurrency(u.fazlaMesaiSaatlik)}
                            {u.fmOverride && <span className="ml-1 text-[9px] px-1 rounded bg-amber-500/20 text-amber-300">M</span>}
                          </TableCell>
                          <TableCell className={`text-cyan-300 ${u.pazarOverride ? 'border-l-2 border-amber-500' : ''}`} title={u.pazarOverride ? 'Manuel ücret (Belirleme)' : `Çarpan: ${p.pazar_carpan ?? 2}`}>
                            {formatCurrency(u.pazarGunluk)}
                            {u.pazarOverride && <span className="ml-1 text-[9px] px-1 rounded bg-amber-500/20 text-amber-300">M</span>}
                          </TableCell>
                          <TableCell className={`text-orange-300 ${u.tatilOverride ? 'border-l-2 border-amber-500' : ''}`} title={u.tatilOverride ? 'Manuel ücret (Belirleme)' : `Çarpan: ${p.resmi_tatil_carpan ?? 2}`}>
                            {formatCurrency(u.tatilGunluk)}
                            {u.tatilOverride && <span className="ml-1 text-[9px] px-1 rounded bg-amber-500/20 text-amber-300">M</span>}
                          </TableCell>
                          <TableCell data-testid={`carpan-cell-${p.id}`}>
                            {(() => {
                              const carpanlar = {
                                'F.Mesai': p.fazla_mesai_carpan ?? 1.5,
                                'Pazar': p.pazar_carpan ?? 2.0,
                                'R.Tatil Çal.': p.resmi_tatil_carpan ?? 2.0,
                                'Gelmedi': p.durum_carpan_gelmedi ?? 0.0,
                                'İzinli': p.durum_carpan_izinli ?? 1.0,
                                'Raporlu': p.durum_carpan_raporlu ?? 0.0,
                                'Hafta T.': p.durum_carpan_hafta_tatili ?? 1.0,
                                'Resmi T.': p.durum_carpan_resmi_tatil ?? 1.0,
                                'Bayram T.': p.durum_carpan_bayram_tatili ?? 1.0,
                                'İzinsiz G.': p.durum_carpan_izinsiz_gelmedi ?? 0.0,
                                'Bayram Çal.': p.durum_carpan_bayram_calisti ?? 2.0,
                              };
                              const tip = Object.entries(carpanlar).map(([k, v]) => `${k}: ${v}`).join('\n');
                              const ozet = `${carpanlar['F.Mesai']} / ${carpanlar['Pazar']} / ${carpanlar['R.Tatil Çal.']}`;
                              return (
                                <span
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-700/40 cursor-help"
                                  title={tip}
                                >
                                  {ozet} <span className="ml-1 text-amber-500">+8</span>
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${p.aktif ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {p.aktif ? 'Aktif' : 'Pasif'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:text-blue-400" onClick={() => { setSelectedPersonel(p); setIsViewDialogOpen(true); }} title="Detay">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-purple-500 hover:text-purple-400" onClick={() => openMaasDialog(p)} title="Maaş Geçmişi">
                                <Wallet className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:text-green-400" onClick={() => handleEditPersonel(p)} title="Düzenle">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-400" onClick={() => handleDeletePersonel(p.id)} title="Sil">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="belirleme" className="mt-4">
          <BelirlemeTab
            personeller={filteredPersoneller}
            formatCurrency={formatCurrency}
            onSavePersonel={handleSavePersonelFromBelirleme}
          />
        </TabsContent>
      </Tabs>

      {/* Detay Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Personel Detayı</DialogTitle>
          </DialogHeader>
          {selectedPersonel && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-slate-400">Ad Soyad:</span> <span className="text-white ml-2">{selectedPersonel.ad_soyad}</span></div>
              <div><span className="text-slate-400">TC Kimlik:</span> <span className="text-white ml-2">{selectedPersonel.tc_kimlik || '-'}</span></div>
              <div><span className="text-slate-400">Telefon:</span> <span className="text-white ml-2">{selectedPersonel.telefon || '-'}</span></div>
              <div><span className="text-slate-400">E-posta:</span> <span className="text-white ml-2">{selectedPersonel.email || '-'}</span></div>
              <div><span className="text-slate-400">Departman:</span> <span className="text-white ml-2">{selectedPersonel.departman || '-'}</span></div>
              <div><span className="text-slate-400">Pozisyon:</span> <span className="text-white ml-2">{selectedPersonel.pozisyon || '-'}</span></div>
              <div><span className="text-slate-400">Güncel Maaş:</span> <span className="text-white ml-2">{formatCurrency(selectedPersonel.maas)}</span></div>
              <div><span className="text-slate-400">SGK No:</span> <span className="text-white ml-2">{selectedPersonel.sgk_no || '-'}</span></div>
              <div><span className="text-slate-400">İşe Giriş:</span> <span className="text-white ml-2">{selectedPersonel.ise_giris_tarihi || '-'}</span></div>
              <div><span className="text-slate-400">Kan Grubu:</span> <span className="text-white ml-2">{selectedPersonel.kan_grubu || '-'}</span></div>
              <div><span className="text-slate-400">Yıllık İzin:</span> <span className="text-white ml-2">{selectedPersonel.kalan_izin || 14} gün kaldı</span></div>
              <div><span className="text-slate-400">Banka:</span> <span className="text-white ml-2">{selectedPersonel.banka || '-'}</span></div>
              <div className="col-span-2"><span className="text-slate-400">IBAN:</span> <span className="text-white ml-2">{selectedPersonel.iban || '-'}</span></div>

              {/* Mesai ücret özeti */}
              {(() => {
                const u = hesaplaMesaiUcretleri(selectedPersonel);
                const maas = parseFloat(selectedPersonel.maas) || 0;
                const gunluk = maas / 30;
                const saatlik = gunluk / 8;
                const fc = parseFloat(selectedPersonel.fazla_mesai_carpan ?? 1.5) || 0;
                const pc = parseFloat(selectedPersonel.pazar_carpan ?? 2.0) || 0;
                const rc = parseFloat(selectedPersonel.resmi_tatil_carpan ?? 2.0) || 0;
                const Badge = ({ on }) => on ? <span className="ml-1 text-[9px] px-1 rounded bg-amber-500/20 text-amber-300">Manuel</span> : null;
                return (
                  <div className="col-span-2 mt-2 p-3 rounded bg-slate-800/40 border border-slate-700">
                    <p className="text-sm font-semibold text-amber-400 mb-2">⏱️ Mesai Ücret Hesabı</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 rounded bg-slate-900/60">
                        <p className="text-slate-400">Saatlik Ücret</p>
                        <p className="text-cyan-300 font-semibold">{formatCurrency(saatlik)}</p>
                        <p className="text-[10px] text-slate-500">(Maaş/30/8)</p>
                      </div>
                      <div className="p-2 rounded bg-slate-900/60" data-testid="detay-fazla-mesai-saatlik">
                        <p className="text-slate-400">Fazla Mesai {u.fmOverride ? '' : `(×${fc})`}<Badge on={u.fmOverride} /></p>
                        <p className="text-green-400 font-semibold">{formatCurrency(u.fazlaMesaiSaatlik)} / saat</p>
                        <p className="text-[10px] text-slate-500">{u.fmOverride ? 'Belirleme\'de manuel girildi' : `⌈(Maaş/30/8)×${fc}⌉`}</p>
                      </div>
                      <div className="p-2 rounded bg-slate-900/60">
                        <p className="text-slate-400">Pazar {u.pazarOverride ? '' : `(×${pc})`}<Badge on={u.pazarOverride} /></p>
                        <p className="text-green-400 font-semibold">{formatCurrency(u.pazarGunluk)} / gün</p>
                        <p className="text-[10px] text-slate-500">{u.pazarOverride ? 'Belirleme\'de manuel girildi' : `⌈(Maaş/30)×${pc}⌉`}</p>
                      </div>
                      <div className="p-2 rounded bg-slate-900/60">
                        <p className="text-slate-400">Resmi Tatil {u.tatilOverride ? '' : `(×${rc})`}<Badge on={u.tatilOverride} /></p>
                        <p className="text-green-400 font-semibold">{formatCurrency(u.tatilGunluk)} / gün</p>
                        <p className="text-[10px] text-slate-500">{u.tatilOverride ? 'Belirleme\'de manuel girildi' : `⌈(Maaş/30)×${rc}⌉`}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="col-span-2">
                <Button onClick={() => { setIsViewDialogOpen(false); openMaasDialog(selectedPersonel); }} className="bg-purple-600 hover:bg-purple-700">
                  <Wallet className="w-4 h-4 mr-2" /> Maaş Geçmişini Görüntüle
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Düzenleme Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Personel Düzenle</DialogTitle>
          </DialogHeader>
          {editingPersonel && (
            <>
              <div className="grid grid-cols-3 gap-4 py-4">
                <div className="col-span-3 border-b border-slate-700 pb-2 mb-2">
                  <h3 className="text-sm font-semibold text-blue-400">Kişisel Bilgiler</h3>
                </div>
                <div>
                  <Label className="text-red-400">Ad *</Label>
                  <Input value={editingPersonel.ad || ''} onChange={(e) => setEditingPersonel({...editingPersonel, ad: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label className="text-red-400">Soyad *</Label>
                  <Input value={editingPersonel.soyad || ''} onChange={(e) => setEditingPersonel({...editingPersonel, soyad: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>TC Kimlik</Label>
                  <Input value={editingPersonel.tc_kimlik || ''} onChange={(e) => setEditingPersonel({...editingPersonel, tc_kimlik: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input value={editingPersonel.telefon || ''} onChange={(e) => setEditingPersonel({...editingPersonel, telefon: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>E-posta</Label>
                  <Input value={editingPersonel.email || ''} onChange={(e) => setEditingPersonel({...editingPersonel, email: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>Doğum Tarihi</Label>
                  <Input type="date" value={editingPersonel.dogum_tarihi || ''} onChange={(e) => setEditingPersonel({...editingPersonel, dogum_tarihi: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>Kan Grubu</Label>
                  <Select value={editingPersonel.kan_grubu || ''} onValueChange={(value) => setEditingPersonel({...editingPersonel, kan_grubu: value})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'].map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-3 border-b border-slate-700 pb-2 mb-2 mt-4">
                  <h3 className="text-sm font-semibold text-green-400">İş Bilgileri</h3>
                </div>
                <div>
                  <Label>Departman</Label>
                  <Select value={editingPersonel.departman || ''} onValueChange={(value) => setEditingPersonel({...editingPersonel, departman: value})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {departmanlar.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pozisyon</Label>
                  <Select value={editingPersonel.pozisyon || ''} onValueChange={(value) => setEditingPersonel({...editingPersonel, pozisyon: value})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {pozisyonlar.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>İşe Giriş Tarihi</Label>
                  <Input type="date" value={editingPersonel.ise_giris_tarihi || ''} onChange={(e) => setEditingPersonel({...editingPersonel, ise_giris_tarihi: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>SGK No</Label>
                  <Input value={editingPersonel.sgk_no || ''} onChange={(e) => setEditingPersonel({...editingPersonel, sgk_no: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>Durum</Label>
                  <Select value={editingPersonel.aktif ? 'aktif' : 'pasif'} onValueChange={(value) => setEditingPersonel({...editingPersonel, aktif: value === 'aktif'})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="aktif">Aktif</SelectItem>
                      <SelectItem value="pasif">Pasif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* MAAŞ BÖLÜMÜ - AYRI */}
                <div className="col-span-3 border-b border-slate-700 pb-2 mb-2 mt-4">
                  <h3 className="text-sm font-semibold text-purple-400">💰 Maaş Bilgileri</h3>
                </div>
                <div className="col-span-3 bg-slate-800/40 rounded p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Güncel Maaş</p>
                    <p className="text-lg font-semibold text-white">{formatCurrency(editingPersonel.maas)}</p>
                  </div>
                  <Button onClick={() => { setIsEditDialogOpen(false); openMaasDialog(editingPersonel); }} className="bg-purple-600 hover:bg-purple-700">
                    <Wallet className="w-4 h-4 mr-2" /> Maaş Geçmişini Yönet
                  </Button>
                </div>

                {/* MESAİ ÜCRET HESAPLAMA - YENİ BÖLÜM */}
                <div className="col-span-3 border-b border-slate-700 pb-2 mb-2 mt-4">
                  <h3 className="text-sm font-semibold text-amber-400">⏱️ Mesai Ücret Çarpanları</h3>
                  <p className="text-xs text-slate-500 mt-1">Günlük Hak Ediş = Maaş / 30. Mesai ücretleri günlük hak ediş × çarpan formülüyle hesaplanır.</p>
                </div>
                {(() => {
                  const maas = parseFloat(editingPersonel.maas) || 0;
                  const gunluk = maas / 30;
                  const saatlik = gunluk / 8;
                  const fc = parseFloat(editingPersonel.fazla_mesai_carpan ?? 1.5) || 0;
                  const pc = parseFloat(editingPersonel.pazar_carpan ?? 2.0) || 0;
                  const rc = parseFloat(editingPersonel.resmi_tatil_carpan ?? 2.0) || 0;
                  const fazlaMesaiSaatlik = Math.ceil(saatlik * fc);
                  const pazarGunluk = Math.ceil(gunluk * pc);
                  const tatilGunluk = Math.ceil(gunluk * rc);
                  return (
                    <>
                      <div className="col-span-3 bg-slate-800/40 rounded p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="text-center p-2 border border-slate-700 rounded">
                          <p className="text-xs text-slate-400">Günlük Hak Ediş</p>
                          <p className="text-lg font-semibold text-amber-300">{formatCurrency(gunluk)}</p>
                          <p className="text-[10px] text-slate-500 mt-1">(Maaş / 30)</p>
                        </div>
                        <div className="text-center p-2 border border-slate-700 rounded">
                          <p className="text-xs text-slate-400">Saatlik Ücret</p>
                          <p className="text-lg font-semibold text-cyan-300">{formatCurrency(saatlik)}</p>
                          <p className="text-[10px] text-slate-500 mt-1">(Maaş / 30 / 8)</p>
                        </div>
                        <div className="text-center p-2 border border-slate-700 rounded">
                          <p className="text-xs text-slate-400">Aylık Maaş</p>
                          <p className="text-lg font-semibold text-white">{formatCurrency(maas)}</p>
                        </div>
                      </div>

                      <div>
                        <Label>Fazla Mesai Çarpanı (saatlik)</Label>
                        <Input type="number" step="0.1" min="0" value={editingPersonel.fazla_mesai_carpan ?? ''} onChange={(e) => setEditingPersonel({...editingPersonel, fazla_mesai_carpan: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="bg-slate-950 border-slate-700" placeholder="1.5" />
                        <p className="text-xs text-green-400 mt-1" data-testid="edit-fazla-mesai-saatlik">Fazla Mesai: {formatCurrency(fazlaMesaiSaatlik)} / saat</p>
                        <p className="text-[10px] text-slate-500">⌈(Maaş/30/8) × {fc}⌉ yukarı yuvarlanmış</p>
                      </div>
                      <div>
                        <Label>Pazar Çalışma Çarpanı (günlük)</Label>
                        <Input type="number" step="0.1" min="0" value={editingPersonel.pazar_carpan ?? ''} onChange={(e) => setEditingPersonel({...editingPersonel, pazar_carpan: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="bg-slate-950 border-slate-700" placeholder="2.0" />
                        <p className="text-xs text-green-400 mt-1">Pazar Ücreti: {formatCurrency(pazarGunluk)} / gün</p>
                        <p className="text-[10px] text-slate-500">⌈(Maaş/30) × {pc}⌉ yukarı yuvarlanmış</p>
                      </div>
                      <div>
                        <Label>Resmi Tatil Çarpanı (günlük)</Label>
                        <Input type="number" step="0.1" min="0" value={editingPersonel.resmi_tatil_carpan ?? ''} onChange={(e) => setEditingPersonel({...editingPersonel, resmi_tatil_carpan: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="bg-slate-950 border-slate-700" placeholder="2.0" />
                        <p className="text-xs text-green-400 mt-1">Resmi Tatil Ücreti: {formatCurrency(tatilGunluk)} / gün</p>
                        <p className="text-[10px] text-slate-500">⌈(Maaş/30) × {rc}⌉ yukarı yuvarlanmış</p>
                      </div>

                      <DurumCarpanlariPanel
                        data={editingPersonel}
                        onChange={(key, value) => setEditingPersonel({...editingPersonel, [key]: value})}
                        gunluk={gunluk}
                        formatCurrency={formatCurrency}
                        idPrefix="edit"
                      />
                    </>
                  );
                })()}

                {/* BANKA BİLGİLERİ - AYRI BÖLÜM */}
                <div className="col-span-3 border-b border-slate-700 pb-2 mb-2 mt-4">
                  <h3 className="text-sm font-semibold text-cyan-400">🏦 Banka Bilgileri</h3>
                </div>
                <div>
                  <Label>Banka</Label>
                  <Input value={editingPersonel.banka || ''} onChange={(e) => setEditingPersonel({...editingPersonel, banka: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div className="col-span-2">
                  <Label>IBAN</Label>
                  <Input value={editingPersonel.iban || ''} onChange={(e) => setEditingPersonel({...editingPersonel, iban: e.target.value})} className="bg-slate-950 border-slate-700" placeholder="TR00 0000 0000 0000 0000 0000 00" />
                </div>

                <div className="col-span-3 border-b border-slate-700 pb-2 mb-2 mt-4">
                  <h3 className="text-sm font-semibold text-orange-400">Adres</h3>
                </div>
                <div className="col-span-3">
                  <Label>Adres</Label>
                  <Input value={editingPersonel.adres || ''} onChange={(e) => setEditingPersonel({...editingPersonel, adres: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-slate-700">İptal</Button>
                <Button onClick={handleUpdatePersonel} className="bg-green-600 hover:bg-green-700">Güncelle</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Maaş Geçmişi Dialog */}
      <Dialog open={isMaasDialogOpen} onOpenChange={setIsMaasDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-purple-400" />
              Maaş Geçmişi {maasPersonel ? `- ${maasPersonel.ad_soyad}` : ''}
            </DialogTitle>
          </DialogHeader>

          {/* Yeni / Düzenleme Formu */}
          <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-purple-300 mb-3">
              {editingDonemId ? 'Maaş Dönemini Düzenle' : 'Yeni Maaş Dönemi Ekle'}
            </h4>
            <div className="grid grid-cols-5 gap-3">
              <div>
                <Label className="text-xs">Başlangıç Yılı *</Label>
                <Select value={yeniDonem.baslangic_yil} onValueChange={(v) => setYeniDonem({...yeniDonem, baslangic_yil: v})}>
                  <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Yıl" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                    {yilOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Başlangıç Ayı *</Label>
                <Select value={yeniDonem.baslangic_ay} onValueChange={(v) => setYeniDonem({...yeniDonem, baslangic_ay: v})}>
                  <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Ay" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {AYLAR.map(a => <SelectItem key={a.value} value={String(a.value)}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Bitiş Yılı</Label>
                <Select value={yeniDonem.bitis_yil} onValueChange={(v) => setYeniDonem({...yeniDonem, bitis_yil: v})}>
                  <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Yıl" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                    {yilOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Bitiş Ayı</Label>
                <Select value={yeniDonem.bitis_ay} onValueChange={(v) => setYeniDonem({...yeniDonem, bitis_ay: v})}>
                  <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Ay" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {AYLAR.map(a => <SelectItem key={a.value} value={String(a.value)}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Maaş (₺) *</Label>
                <Input type="number" value={yeniDonem.maas} onChange={(e) => setYeniDonem({...yeniDonem, maas: e.target.value})} className="bg-slate-950 border-slate-700" placeholder="0" />
              </div>
            </div>
            <div className="flex justify-between items-center mt-3">
              <div className="text-xs text-slate-400">
                * zorunlu alanlar. Bitiş tarihi boş ise süresiz (açık) dönem olarak kaydedilir.
              </div>
              <div className="flex gap-2">
                {editingDonemId && (
                  <Button variant="outline" onClick={handleCancelEditDonem} className="border-slate-700">
                    <X className="w-4 h-4 mr-1" /> Vazgeç
                  </Button>
                )}
                <Button onClick={handleSaveDonem} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-1" /> {editingDonemId ? 'Güncelle' : 'Dönem Ekle'}
                </Button>
              </div>
            </div>
          </div>

          {/* Dönem Listesi */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-2">Kayıtlı Maaş Dönemleri ({maasDonemleri.length})</h4>
            {maasDonemleri.length === 0 ? (
              <div className="p-6 text-center text-slate-500 border border-dashed border-slate-700 rounded">
                Henüz maaş dönemi kaydı yok. Yukarıdaki formdan ekleyebilirsiniz.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 bg-slate-900/50">
                    <TableHead className="text-slate-300">Başlangıç</TableHead>
                    <TableHead className="text-slate-300">Bitiş</TableHead>
                    <TableHead className="text-slate-300 text-right">Maaş</TableHead>
                    <TableHead className="text-slate-300">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maasDonemleri.map((d, idx) => (
                    <TableRow key={d.id} className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'}`}>
                      <TableCell className="text-white">
                        {ayLabel(d.baslangic_ay)} {d.baslangic_yil}
                      </TableCell>
                      <TableCell className="text-white">
                        {d.bitis_yil && d.bitis_ay ? `${ayLabel(d.bitis_ay)} ${d.bitis_yil}` : <span className="text-green-400">Devam ediyor</span>}
                      </TableCell>
                      <TableCell className="text-white text-right font-semibold">{formatCurrency(d.maas)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:text-blue-400" onClick={() => handleEditDonem(d)} title="Düzenle">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-400" onClick={() => handleDeleteDonem(d.id)} title="Sil">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setIsMaasDialogOpen(false)} className="border-slate-700">Kapat</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PersonelListesi;
