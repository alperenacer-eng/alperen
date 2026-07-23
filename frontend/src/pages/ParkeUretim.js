import React, { useState, useEffect, useMemo } from 'react';
import useFormDraft from '../hooks/useFormDraft';
import DraftBanner from '../components/DraftBanner';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Plus, Trash2, Pencil, Save, X, Factory, Package, Boxes, Clock, Layers, UserCircle,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  uretim_tarihi: todayStr(),
  urun_grup: '',
  urun_id: '',
  urun_adi: '',
  urun_birim: '',
  renk: '',
  operator_id: '',
  operator_adi: '',
  uretim_paleti: 0,
  fire: 0,
  calisma_saat: 0,
  calisma_dakika: 0,
  toplam_baski_sayisi: 0,
  aciklama: '',
  aciklama2: '',
  aciklama3: '',
  harcanan: {}, // { [hammadde_id]: miktar }
});

// Hammadde sıralama: Kullanıcı tanımlı özel sıra (normalize edilmiş)
const HAMMADDE_ORDER = [
  'M3İNCE',
  '02IRMAK',
  'ÇIMENTOİNCE',  // farklı yazımlar için
  'ÇİMENTOİNCE',
  'CIMENTOINCE',
  'ÇIMENTOBEYAZ',
  'ÇİMENTOBEYAZ',
  'CIMENTOBEYAZ',
  'M3KALIN',
  '05',
  '513',
  '1525',
  'ÇIMENTOKALIN',
  'ÇİMENTOKALIN',
  'CIMENTOKALIN',
];

const normalizeHammadde = (name) => {
  if (!name) return '';
  return name.toString().toUpperCase().replace(/[-\s().,/]/g, '');
};

const getHammaddeOrderIndex = (name) => {
  const n = normalizeHammadde(name);
  const idx = HAMMADDE_ORDER.indexOf(n);
  return idx === -1 ? 999 : idx;
};

const ParkeUretim = () => {
  const { token } = useAuth();
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const [urunler, setUrunler] = useState([]);
  const [hammaddeler, setHammaddeler] = useState([]);
  const [operatorler, setOperatorler] = useState([]);
  const [kayitlar, setKayitlar] = useState([]);

  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  // 📄 TASLAK: yeni kayıt eklerken otomatik kaydet, kaynaklara gidip dönünce dropdown yenile
  const { draftSavedAt, draftRestored, clearDraft } = useFormDraft(
    'parke_uretim_draft_v1',
    form,
    setForm,
    {
      enabled: !editId,
      hasContent: (fd) => !!(
        fd && (fd.urun_id || fd.operator_id || fd.hammadde_id || fd.miktar || fd.notlar)
      ),
      onFocusRefresh: () => fetchAll(),
    }
  );

  const fetchAll = async () => {
    await Promise.all([
      fetchUrunler(),
      fetchHammaddeler(),
      fetchOperatorler(),
      fetchKayitlar(),
    ]);
  };

  const fetchUrunler = async () => {
    try {
      const res = await axios.get(`${API_URL}/parke-urunler`, authHeaders);
      setUrunler(res.data);
    } catch (e) { toast.error('Ürünler yüklenemedi'); }
  };
  const fetchHammaddeler = async () => {
    try {
      const res = await axios.get(`${API_URL}/parke-hammaddeler`, authHeaders);
      // özel sıralama: HAMMADDE_ORDER → sonra alfabetik
      const sorted = [...res.data].sort((a, b) => {
        const ai = getHammaddeOrderIndex(a.hammadde_adi);
        const bi = getHammaddeOrderIndex(b.hammadde_adi);
        if (ai !== bi) return ai - bi;
        return (a.hammadde_adi || '').localeCompare(b.hammadde_adi || '', 'tr');
      });
      setHammaddeler(sorted);
    } catch (e) { toast.error('Hammaddeler yüklenemedi'); }
  };
  const fetchOperatorler = async () => {
    try {
      const res = await axios.get(`${API_URL}/parke-operatorler`, authHeaders);
      setOperatorler(res.data);
    } catch (e) { toast.error('Operatörler yüklenemedi'); }
  };
  const fetchKayitlar = async () => {
    try {
      const res = await axios.get(`${API_URL}/parke-uretim`, authHeaders);
      setKayitlar(res.data);
    } catch (e) { toast.error('Üretim kayıtları yüklenemedi'); }
  };

  // Net üretim hesabı (canlı)
  const netUretim = useMemo(() => {
    const p = parseFloat(form.uretim_paleti) || 0;
    const f = parseFloat(form.fire) || 0;
    return p - f;
  }, [form.uretim_paleti, form.fire]);

  // Seçili ürünün paletteki bilgileri ve M²/Adet hesabı
  const selectedUrun = useMemo(() => {
    if (!form.urun_id) return null;
    return urunler.find((u) => u.id === form.urun_id) || null;
  }, [form.urun_id, urunler]);

  const adetPerM2 = useMemo(() => {
    if (!selectedUrun) return 0;
    const adet = parseFloat(selectedUrun.paletteki_adet) || 0;
    const m2 = parseFloat(selectedUrun.paletteki_m2) || 0;
    if (adet <= 0 || m2 <= 0) return 0;
    return adet / m2;
  }, [selectedUrun]);

  // Net Üretim Paleti × Adet/M² = otomatik hesap
  const netUretimM2 = useMemo(() => {
    return netUretim * adetPerM2;
  }, [netUretim, adetPerM2]);

  // Toplam dakika
  const toplamDakika = useMemo(() => {
    const s = parseInt(form.calisma_saat) || 0;
    const d = parseInt(form.calisma_dakika) || 0;
    return s * 60 + d;
  }, [form.calisma_saat, form.calisma_dakika]);

  // Aynı isimli ürünleri grupla (cins bazında)
  const urunGruplari = useMemo(() => {
    const map = new Map();
    urunler.forEach((u) => {
      const key = (u.urun_adi || '').trim();
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(u);
    });
    return Array.from(map.entries())
      .map(([urun_adi, items]) => ({ urun_adi, items }))
      .sort((a, b) => a.urun_adi.localeCompare(b.urun_adi, 'tr'));
  }, [urunler]);

  // Seçili gruptaki renk seçenekleri
  const selectedGroupItems = useMemo(() => {
    if (!form.urun_grup) return [];
    return urunler.filter((u) => (u.urun_adi || '').trim() === form.urun_grup);
  }, [form.urun_grup, urunler]);

  const handleUrunGrupChange = (urun_adi) => {
    const items = urunler.filter((u) => (u.urun_adi || '').trim() === urun_adi);
    if (items.length === 1) {
      // Tek varyant varsa otomatik seç
      const u = items[0];
      setForm((prev) => ({
        ...prev,
        urun_grup: urun_adi,
        urun_id: u.id,
        urun_adi: u.urun_adi,
        urun_birim: u.birim || '',
        renk: u.renk || '',
      }));
    } else {
      // Birden fazla varyant varsa renk seçimi bekle
      setForm((prev) => ({
        ...prev,
        urun_grup: urun_adi,
        urun_id: '',
        urun_adi: urun_adi,
        urun_birim: items[0]?.birim || '',
        renk: '',
      }));
    }
  };

  const handleRenkChange = (urunId) => {
    const urun = urunler.find((u) => u.id === urunId);
    if (!urun) return;
    setForm((prev) => ({
      ...prev,
      urun_id: urun.id,
      urun_adi: urun.urun_adi,
      urun_birim: urun.birim || '',
      renk: urun.renk || '',
    }));
  };

  const handleOperatorChange = (opId) => {
    const op = operatorler.find((o) => o.id === opId);
    setForm((prev) => ({
      ...prev,
      operator_id: opId,
      operator_adi: op?.ad_soyad || '',
    }));
  };

  const handleHammaddeMiktarChange = (hammaddeId, val) => {
    setForm((prev) => ({
      ...prev,
      harcanan: { ...prev.harcanan, [hammaddeId]: val },
    }));
  };

  const buildPayload = () => {
    const harcanan_hammaddeler = hammaddeler
      .map((h) => ({
        hammadde_id: h.id,
        hammadde_adi: h.hammadde_adi,
        birim: h.birim,
        miktar: parseFloat(form.harcanan?.[h.id]) || 0,
      }))
      .filter((x) => x.miktar > 0);

    return {
      uretim_tarihi: form.uretim_tarihi,
      urun_id: form.urun_id,
      urun_adi: form.urun_adi,
      urun_birim: form.urun_birim,
      renk: form.renk,
      operator_id: form.operator_id,
      operator_adi: form.operator_adi,
      uretim_paleti: parseFloat(form.uretim_paleti) || 0,
      fire: parseFloat(form.fire) || 0,
      net_uretim: netUretim,
      harcanan_hammaddeler,
      calisma_saat: parseInt(form.calisma_saat) || 0,
      calisma_dakika: parseInt(form.calisma_dakika) || 0,
      calisma_suresi: toplamDakika,
      toplam_baski_sayisi: parseInt(form.toplam_baski_sayisi) || 0,
      aciklama: form.aciklama,
      aciklama2: form.aciklama2,
      aciklama3: form.aciklama3,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.urun_grup) { toast.error('Lütfen bir ürün cinsi seçin'); return; }
    if (!form.urun_id) {
      if (selectedGroupItems.length > 1) {
        toast.error('Lütfen bir renk seçin');
      } else {
        toast.error('Lütfen bir ürün seçin');
      }
      return;
    }
    if (!form.uretim_tarihi) { toast.error('Üretim tarihi zorunlu'); return; }
    const payload = buildPayload();
    try {
      if (editId) {
        await axios.put(`${API_URL}/parke-uretim/${editId}`, payload, authHeaders);
        toast.success('Üretim kaydı güncellendi');
      } else {
        await axios.post(`${API_URL}/parke-uretim`, payload, authHeaders);
        toast.success('Üretim kaydı eklendi');
        try { localStorage.removeItem('parke_uretim_draft_v1'); } catch (e) {}
      }
      handleCancel();
      fetchKayitlar();
    } catch (err) {
      toast.error(editId ? 'Güncellenemedi' : 'Kaydedilemedi');
    }
  };

  const handleEdit = (k) => {
    setEditId(k.id);
    const harcananMap = {};
    (k.harcanan_hammaddeler || []).forEach((h) => {
      harcananMap[h.hammadde_id] = h.miktar;
    });
    setForm({
      uretim_tarihi: (k.uretim_tarihi || '').slice(0, 10),
      urun_grup: k.urun_adi || '',
      urun_id: k.urun_id,
      urun_adi: k.urun_adi,
      urun_birim: k.urun_birim || '',
      renk: k.renk || '',
      operator_id: k.operator_id || '',
      operator_adi: k.operator_adi || '',
      uretim_paleti: k.uretim_paleti || 0,
      fire: k.fire || 0,
      calisma_saat: k.calisma_saat || 0,
      calisma_dakika: k.calisma_dakika || 0,
      toplam_baski_sayisi: k.toplam_baski_sayisi || 0,
      aciklama: k.aciklama || '',
      aciklama2: k.aciklama2 || '',
      aciklama3: k.aciklama3 || '',
      harcanan: harcananMap,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditId(null);
    setForm(emptyForm());
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/parke-uretim/${deleteId}`, authHeaders);
      toast.success('Üretim kaydı silindi');
      fetchKayitlar();
    } catch (e) {
      toast.error('Silinemedi');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Factory className="text-green-600" size={32} />
            Parke Üretim
          </h1>
          <p className="text-gray-600 mt-1">Günlük üretim verilerini, fire ve harcanan hammaddeleri kaydedin.</p>
        </div>
        {editId && (
          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">
            ✏️ Düzenleme modu
          </span>
        )}
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow border border-green-100 p-6 mb-8 space-y-6"
      >
        {!editId && (
          <DraftBanner
            draftSavedAt={draftSavedAt}
            draftRestored={draftRestored}
            onClear={clearDraft}
          />
        )}
        {/* Üst alan: temel bilgiler */}
        <div>
          <h2 className="text-lg font-semibold text-green-700 mb-3 flex items-center gap-2">
            <Package size={18} /> Üretim Bilgileri
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="uretim_tarihi">Üretim Tarihi *</Label>
              <Input
                id="uretim_tarihi"
                type="date"
                data-testid="input-uretim-tarihi"
                value={form.uretim_tarihi}
                onChange={(e) => setForm({ ...form, uretim_tarihi: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Operatör</Label>
              <Select value={form.operator_id} onValueChange={handleOperatorChange}>
                <SelectTrigger data-testid="select-operator">
                  <SelectValue placeholder="Operatör seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {operatorler.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-400">
                      Önce Kaynaklar'dan operatör ekleyin
                    </div>
                  ) : (
                    operatorler.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        <span className="flex items-center gap-2">
                          <UserCircle size={14} /> {o.ad_soyad}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ürün (Cins) *</Label>
              <Select value={form.urun_grup} onValueChange={handleUrunGrupChange}>
                <SelectTrigger data-testid="select-urun-grup">
                  <SelectValue placeholder="Ürün cinsi seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {urunGruplari.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-400">
                      Önce Kaynaklar'dan ürün ekleyin
                    </div>
                  ) : (
                    urunGruplari.map((g) => (
                      <SelectItem key={g.urun_adi} value={g.urun_adi}>
                        {g.urun_adi}
                        {g.items.length > 1 && (
                          <span className="ml-2 text-xs text-gray-500">({g.items.length} renk)</span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Renk *</Label>
              <Select
                value={form.urun_id}
                onValueChange={handleRenkChange}
                disabled={!form.urun_grup || selectedGroupItems.length === 0}
              >
                <SelectTrigger data-testid="select-renk">
                  <SelectValue
                    placeholder={
                      !form.urun_grup
                        ? 'Önce ürün cinsi seçin'
                        : selectedGroupItems.length === 1
                        ? selectedGroupItems[0].renk || 'Renk yok'
                        : 'Renk seçin...'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {selectedGroupItems.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-400">Önce ürün cinsi seçin</div>
                  ) : (
                    selectedGroupItems.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.renk || '— Renksiz —'}
                        {u.ebat ? <span className="ml-2 text-xs text-gray-500">({u.ebat})</span> : null}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Birim (otomatik)</Label>
              <div
                data-testid="display-urun-birim"
                className="h-10 px-3 py-2 rounded-md border bg-gray-50 border-gray-200 text-gray-700 flex items-center font-semibold"
              >
                {form.urun_birim || <span className="text-gray-400 font-normal">Ürün seçilince gelir</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Üretim Paleti / Fire / Net */}
        <div>
          <h2 className="text-lg font-semibold text-green-700 mb-3 flex items-center gap-2">
            <Layers size={18} /> Üretim Miktarı
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="uretim_paleti">Üretim Paleti</Label>
              <Input
                id="uretim_paleti"
                type="number"
                step="0.01"
                data-testid="input-uretim-paleti"
                value={form.uretim_paleti}
                onChange={(e) => setForm({ ...form, uretim_paleti: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="fire">Fire</Label>
              <Input
                id="fire"
                type="number"
                step="0.01"
                data-testid="input-fire"
                value={form.fire}
                onChange={(e) => setForm({ ...form, fire: e.target.value })}
              />
            </div>
            <div>
              <Label>Net Üretim (otomatik)</Label>
              <div
                data-testid="display-net-uretim"
                className={`h-10 px-3 py-2 rounded-md border font-bold text-lg flex items-center ${
                  netUretim < 0
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-green-50 border-green-300 text-green-700'
                }`}
              >
                {netUretim.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                {form.urun_birim && (
                  <span className="ml-2 text-sm font-normal text-gray-500">{form.urun_birim}</span>
                )}
              </div>
            </div>
            <div>
              <Label>📐 Net Üretim Toplam (otomatik)</Label>
              <div
                data-testid="display-net-uretim-m2"
                className={`h-10 px-3 py-2 rounded-md border font-bold text-lg flex items-center ${
                  adetPerM2 > 0
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
                title={
                  adetPerM2 > 0
                    ? `${netUretim.toLocaleString('tr-TR')} × ${adetPerM2.toLocaleString('tr-TR', { maximumFractionDigits: 4 })} (Adet/M²)`
                    : 'Ürün için Paletteki Adet ve M² tanımlı olmalı'
                }
              >
                {adetPerM2 > 0 ? (
                  netUretimM2.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                ) : (
                  <span className="text-sm font-normal">Plt. Adet & M² girin</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* HARCANAN HAMMADDELER */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-amber-700 mb-3 flex items-center gap-2">
            <Boxes size={18} /> Harcanan Hammaddeler
          </h2>
          {hammaddeler.length === 0 ? (
            <div className="text-center py-6 bg-amber-50 rounded-md border border-amber-200 text-amber-700">
              Önce <strong>Kaynaklar &gt; Hammaddeler</strong> sekmesinden hammadde ekleyin.
            </div>
          ) : (
            <div className="overflow-x-auto bg-amber-50/30 rounded-md border border-amber-100">
              <table className="w-full text-sm">
                <thead className="bg-amber-100 text-amber-900">
                  <tr>
                    <th className="px-4 py-2 text-left">Hammadde</th>
                    <th className="px-4 py-2 text-left w-24">Birim</th>
                    <th className="px-4 py-2 text-left w-48">Harcanan Miktar</th>
                  </tr>
                </thead>
                <tbody>
                  {hammaddeler.map((h) => (
                    <tr key={h.id} className="border-t border-amber-100">
                      <td className="px-4 py-2 font-medium">{h.hammadde_adi}</td>
                      <td className="px-4 py-2 text-gray-600">{h.birim}</td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          data-testid={`input-hammadde-${h.id}`}
                          value={form.harcanan?.[h.id] ?? ''}
                          onChange={(e) => handleHammaddeMiktarChange(h.id, e.target.value)}
                          placeholder="0"
                          className="h-9"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Çalışma süresi & baskı */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-blue-700 mb-3 flex items-center gap-2">
            <Clock size={18} /> Çalışma Bilgileri
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="calisma_saat">Çalışma Süresi (Saat)</Label>
              <Input
                id="calisma_saat"
                type="number"
                min="0"
                data-testid="input-calisma-saat"
                value={form.calisma_saat}
                onChange={(e) => setForm({ ...form, calisma_saat: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="calisma_dakika">Çalışma Süresi (Dakika)</Label>
              <Input
                id="calisma_dakika"
                type="number"
                min="0"
                max="59"
                data-testid="input-calisma-dakika"
                value={form.calisma_dakika}
                onChange={(e) => setForm({ ...form, calisma_dakika: e.target.value })}
              />
            </div>
            <div>
              <Label>Toplam Dakika (otomatik)</Label>
              <div
                data-testid="display-toplam-dakika"
                className="h-10 px-3 py-2 rounded-md border bg-blue-50 border-blue-300 text-blue-700 font-bold flex items-center"
              >
                {toplamDakika.toLocaleString('tr-TR')} dk
              </div>
            </div>
            <div>
              <Label htmlFor="toplam_baski_sayisi">Toplam Baskı Sayısı</Label>
              <Input
                id="toplam_baski_sayisi"
                type="number"
                data-testid="input-toplam-baski"
                value={form.toplam_baski_sayisi}
                onChange={(e) => setForm({ ...form, toplam_baski_sayisi: e.target.value })}
              />
            </div>
            <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="aciklama">Açıklama 1</Label>
                <Input
                  id="aciklama"
                  data-testid="input-aciklama"
                  value={form.aciklama}
                  onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="aciklama2">Açıklama 2</Label>
                <Input
                  id="aciklama2"
                  data-testid="input-aciklama2"
                  value={form.aciklama2}
                  onChange={(e) => setForm({ ...form, aciklama2: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="aciklama3">Açıklama 3</Label>
                <Input
                  id="aciklama3"
                  data-testid="input-aciklama3"
                  value={form.aciklama3}
                  onChange={(e) => setForm({ ...form, aciklama3: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t pt-4">
          <Button
            type="submit"
            data-testid="btn-uretim-save"
            className="bg-green-600 hover:bg-green-700"
          >
            <Save size={16} className="mr-2" />
            {editId ? 'Güncelle' : 'Kaydet'}
          </Button>
          {editId && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              data-testid="btn-uretim-cancel"
            >
              <X size={16} className="mr-2" /> İptal
            </Button>
          )}
        </div>
      </form>

      {/* KAYITLAR LİSTESİ */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">
            Üretim Kayıtları ({kayitlar.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-3 text-left">Tarih</th>
                <th className="px-3 py-3 text-left">Operatör</th>
                <th className="px-3 py-3 text-left">Ürün</th>
                <th className="px-3 py-3 text-left">Birim</th>
                <th className="px-3 py-3 text-left">Renk</th>
                <th className="px-3 py-3 text-right">Palet</th>
                <th className="px-3 py-3 text-right">Fire</th>
                <th className="px-3 py-3 text-right">Net</th>
                <th className="px-3 py-3 text-right">Süre</th>
                <th className="px-3 py-3 text-right">Baskı</th>
                <th className="px-3 py-3 text-left">Hammaddeler</th>
                <th className="px-3 py-3 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {kayitlar.length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-4 py-10 text-center text-gray-400">
                    Henüz üretim kaydı eklenmedi
                  </td>
                </tr>
              ) : (
                kayitlar.map((k) => (
                  <tr key={k.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-3 whitespace-nowrap">{(k.uretim_tarihi || '').slice(0, 10)}</td>
                    <td className="px-3 py-3">{k.operator_adi || '—'}</td>
                    <td className="px-3 py-3 font-medium">{k.urun_adi}</td>
                    <td className="px-3 py-3">{k.urun_birim || '—'}</td>
                    <td className="px-3 py-3">{k.renk || '—'}</td>
                    <td className="px-3 py-3 text-right">{k.uretim_paleti.toLocaleString('tr-TR')}</td>
                    <td className="px-3 py-3 text-right text-red-600">{k.fire.toLocaleString('tr-TR')}</td>
                    <td className="px-3 py-3 text-right font-bold text-green-700">
                      {k.net_uretim.toLocaleString('tr-TR')}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      {k.calisma_saat || 0}sa {k.calisma_dakika || 0}dk
                      <div className="text-xs text-gray-400">{k.calisma_suresi} dk</div>
                    </td>
                    <td className="px-3 py-3 text-right">{k.toplam_baski_sayisi}</td>
                    <td className="px-3 py-3 text-xs text-gray-600 max-w-xs">
                      {(k.harcanan_hammaddeler || []).length === 0
                        ? '—'
                        : (k.harcanan_hammaddeler || [])
                            .map((h) => `${h.hammadde_adi}: ${h.miktar} ${h.birim}`)
                            .join(', ')}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(k)}
                          data-testid={`btn-uretim-edit-${k.id}`}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteId(k.id)}
                          data-testid={`btn-uretim-delete-${k.id}`}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Üretim Kaydını Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu üretim kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ParkeUretim;
