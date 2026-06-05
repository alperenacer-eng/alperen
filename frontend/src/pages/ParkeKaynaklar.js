import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Package, Boxes, X, Save, UserCircle } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const emptyUrun = { urun_adi: '', birim: 'm²', birim_fiyat: 0, ebat: '', renk: '', aciklama: '', paletteki_adet: 0, paletteki_m2: 0 };
const emptyHammadde = { hammadde_adi: '', birim: 'kg', birim_fiyat: 0, tedarikci: '', stok_miktari: 0, aciklama: '' };
const emptyOperator = { ad_soyad: '', telefon: '', aciklama: '' };

const ParkeKaynaklar = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('operatorler');

  // Operatörler state (ilk sekme isteğe göre)
  const [operatorler, setOperatorler] = useState([]);
  const [operatorForm, setOperatorForm] = useState(emptyOperator);
  const [editOperatorId, setEditOperatorId] = useState(null);
  const [deleteOperatorId, setDeleteOperatorId] = useState(null);

  // Üretilen Ürünler state
  const [urunler, setUrunler] = useState([]);
  const [urunForm, setUrunForm] = useState(emptyUrun);
  const [editUrunId, setEditUrunId] = useState(null);
  const [deleteUrunId, setDeleteUrunId] = useState(null);

  // Hammaddeler state
  const [hammaddeler, setHammaddeler] = useState([]);
  const [hammaddeForm, setHammaddeForm] = useState(emptyHammadde);
  const [editHammaddeId, setEditHammaddeId] = useState(null);
  const [deleteHammaddeId, setDeleteHammaddeId] = useState(null);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    fetchOperatorler();
    fetchUrunler();
    fetchHammaddeler();
  };

  // =================== OPERATORLER ===================
  const fetchOperatorler = async () => {
    try {
      const res = await axios.get(`${API_URL}/parke-operatorler`, authHeaders);
      setOperatorler(res.data);
    } catch (e) { toast.error('Operatörler yüklenemedi'); }
  };
  const handleOperatorSubmit = async (e) => {
    e.preventDefault();
    if (!operatorForm.ad_soyad.trim()) { toast.error('Ad Soyad zorunlu'); return; }
    try {
      if (editOperatorId) {
        await axios.put(`${API_URL}/parke-operatorler/${editOperatorId}`, operatorForm, authHeaders);
        toast.success('Operatör güncellendi');
      } else {
        await axios.post(`${API_URL}/parke-operatorler`, operatorForm, authHeaders);
        toast.success('Operatör eklendi');
      }
      setOperatorForm(emptyOperator);
      setEditOperatorId(null);
      fetchOperatorler();
    } catch (err) { toast.error('Operatör kaydedilemedi'); }
  };
  const handleOperatorEdit = (o) => {
    setEditOperatorId(o.id);
    setOperatorForm({ ad_soyad: o.ad_soyad || '', telefon: o.telefon || '', aciklama: o.aciklama || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleOperatorDelete = async () => {
    try {
      await axios.delete(`${API_URL}/parke-operatorler/${deleteOperatorId}`, authHeaders);
      toast.success('Operatör silindi');
      fetchOperatorler();
    } catch (e) { toast.error('Silinemedi'); }
    finally { setDeleteOperatorId(null); }
  };

  // =================== URUNLER ===================
  const fetchUrunler = async () => {
    try {
      const res = await axios.get(`${API_URL}/parke-urunler`, authHeaders);
      setUrunler(res.data);
    } catch (err) { toast.error('Ürünler yüklenemedi'); }
  };
  const handleUrunSubmit = async (e) => {
    e.preventDefault();
    if (!urunForm.urun_adi.trim()) { toast.error('Ürün adı zorunludur'); return; }
    try {
      const payload = {
        ...urunForm,
        birim_fiyat: parseFloat(urunForm.birim_fiyat) || 0,
        paletteki_adet: parseFloat(urunForm.paletteki_adet) || 0,
        paletteki_m2: parseFloat(urunForm.paletteki_m2) || 0,
      };
      if (editUrunId) {
        await axios.put(`${API_URL}/parke-urunler/${editUrunId}`, payload, authHeaders);
        toast.success('Ürün güncellendi');
      } else {
        await axios.post(`${API_URL}/parke-urunler`, payload, authHeaders);
        toast.success('Ürün eklendi');
      }
      setUrunForm(emptyUrun);
      setEditUrunId(null);
      fetchUrunler();
    } catch (err) { toast.error(editUrunId ? 'Güncellenemedi' : 'Eklenemedi'); }
  };
  const handleUrunEdit = (u) => {
    setEditUrunId(u.id);
    setUrunForm({
      urun_adi: u.urun_adi || '', birim: u.birim || 'm²', birim_fiyat: u.birim_fiyat || 0,
      ebat: u.ebat || '', renk: u.renk || '', aciklama: u.aciklama || '',
      paletteki_adet: u.paletteki_adet || 0, paletteki_m2: u.paletteki_m2 || 0,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleUrunDelete = async () => {
    try {
      await axios.delete(`${API_URL}/parke-urunler/${deleteUrunId}`, authHeaders);
      toast.success('Ürün silindi');
      fetchUrunler();
    } catch (err) { toast.error('Silinemedi'); }
    finally { setDeleteUrunId(null); }
  };

  // =================== HAMMADDELER ===================
  const fetchHammaddeler = async () => {
    try {
      const res = await axios.get(`${API_URL}/parke-hammaddeler`, authHeaders);
      setHammaddeler(res.data);
    } catch (err) { toast.error('Hammaddeler yüklenemedi'); }
  };
  const handleHammaddeSubmit = async (e) => {
    e.preventDefault();
    if (!hammaddeForm.hammadde_adi.trim()) { toast.error('Hammadde adı zorunludur'); return; }
    try {
      const payload = {
        ...hammaddeForm,
        birim_fiyat: parseFloat(hammaddeForm.birim_fiyat) || 0,
        stok_miktari: parseFloat(hammaddeForm.stok_miktari) || 0,
      };
      if (editHammaddeId) {
        await axios.put(`${API_URL}/parke-hammaddeler/${editHammaddeId}`, payload, authHeaders);
        toast.success('Hammadde güncellendi');
      } else {
        await axios.post(`${API_URL}/parke-hammaddeler`, payload, authHeaders);
        toast.success('Hammadde eklendi');
      }
      setHammaddeForm(emptyHammadde);
      setEditHammaddeId(null);
      fetchHammaddeler();
    } catch (err) { toast.error(editHammaddeId ? 'Güncellenemedi' : 'Eklenemedi'); }
  };
  const handleHammaddeEdit = (h) => {
    setEditHammaddeId(h.id);
    setHammaddeForm({
      hammadde_adi: h.hammadde_adi || '', birim: h.birim || 'kg',
      birim_fiyat: h.birim_fiyat || 0, tedarikci: h.tedarikci || '',
      stok_miktari: h.stok_miktari || 0, aciklama: h.aciklama || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleHammaddeDelete = async () => {
    try {
      await axios.delete(`${API_URL}/parke-hammaddeler/${deleteHammaddeId}`, authHeaders);
      toast.success('Hammadde silindi');
      fetchHammaddeler();
    } catch (err) { toast.error('Silinemedi'); }
    finally { setDeleteHammaddeId(null); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <span className="text-4xl">🪵</span>
          Parke Üretim — Kaynaklar
        </h1>
        <p className="text-gray-600 mt-1">Operatörler, ürünler, hammaddeler ve renkleri yönetin.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="operatorler" data-testid="tab-parke-operatorler" className="flex items-center gap-2">
            <UserCircle size={16} /> Operatörler
          </TabsTrigger>
          <TabsTrigger value="urunler" data-testid="tab-parke-urunler" className="flex items-center gap-2">
            <Package size={16} /> Ürünler
          </TabsTrigger>
          <TabsTrigger value="hammaddeler" data-testid="tab-parke-hammaddeler" className="flex items-center gap-2">
            <Boxes size={16} /> Hammaddeler
          </TabsTrigger>
        </TabsList>

        {/* ==================== OPERATÖRLER ==================== */}
        <TabsContent value="operatorler" className="mt-6">
          <div className="bg-white rounded-lg shadow p-6 mb-6 border border-purple-100">
            <h2 className="text-xl font-semibold mb-4 text-purple-700 flex items-center gap-2">
              {editOperatorId ? <Pencil size={20} /> : <Plus size={20} />}
              {editOperatorId ? 'Operatörü Düzenle' : 'Yeni Operatör Ekle'}
            </h2>
            <form onSubmit={handleOperatorSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Ad Soyad *</Label>
                <Input
                  data-testid="input-operator-ad"
                  value={operatorForm.ad_soyad}
                  onChange={(e) => setOperatorForm({ ...operatorForm, ad_soyad: e.target.value })}
                  placeholder="Örn: Ahmet Yılmaz"
                  required
                />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input
                  data-testid="input-operator-telefon"
                  value={operatorForm.telefon}
                  onChange={(e) => setOperatorForm({ ...operatorForm, telefon: e.target.value })}
                  placeholder="0555 ..."
                />
              </div>
              <div>
                <Label>Açıklama</Label>
                <Input
                  data-testid="input-operator-aciklama"
                  value={operatorForm.aciklama}
                  onChange={(e) => setOperatorForm({ ...operatorForm, aciklama: e.target.value })}
                />
              </div>
              <div className="md:col-span-3 flex gap-2">
                <Button type="submit" data-testid="btn-operator-save" className="bg-purple-600 hover:bg-purple-700">
                  <Save size={16} className="mr-2" />
                  {editOperatorId ? 'Güncelle' : 'Ekle'}
                </Button>
                {editOperatorId && (
                  <Button type="button" variant="outline" onClick={() => { setEditOperatorId(null); setOperatorForm(emptyOperator); }}>
                    <X size={16} className="mr-2" /> İptal
                  </Button>
                )}
              </div>
            </form>
          </div>
          <div className="bg-white rounded-lg shadow border border-purple-100 overflow-hidden">
            <div className="p-4 border-b bg-purple-50">
              <h3 className="font-semibold text-purple-800">Kayıtlı Operatörler ({operatorler.length})</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Ad Soyad</th>
                  <th className="px-4 py-3 text-left">Telefon</th>
                  <th className="px-4 py-3 text-left">Açıklama</th>
                  <th className="px-4 py-3 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {operatorler.length === 0 ? (
                  <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-400">Henüz operatör eklenmedi</td></tr>
                ) : operatorler.map((o) => (
                  <tr key={o.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{o.ad_soyad}</td>
                    <td className="px-4 py-3">{o.telefon || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{o.aciklama || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <Button size="sm" variant="outline" onClick={() => handleOperatorEdit(o)}>
                          <Pencil size={14} />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteOperatorId(o.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ==================== URUNLER ==================== */}
        <TabsContent value="urunler" className="mt-6">
          <div className="bg-white rounded-lg shadow p-6 mb-6 border border-green-100">
            <h2 className="text-xl font-semibold mb-4 text-green-700 flex items-center gap-2">
              {editUrunId ? <Pencil size={20} /> : <Plus size={20} />}
              {editUrunId ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
            </h2>
            <form onSubmit={handleUrunSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Ürün Adı *</Label>
                <Input data-testid="input-urun-adi" value={urunForm.urun_adi} onChange={(e) => setUrunForm({ ...urunForm, urun_adi: e.target.value })} required />
              </div>
              <div>
                <Label>Ebat</Label>
                <Input data-testid="input-urun-ebat" value={urunForm.ebat} onChange={(e) => setUrunForm({ ...urunForm, ebat: e.target.value })} />
              </div>
              <div>
                <Label>Renk</Label>
                <Input data-testid="input-urun-renk" value={urunForm.renk} onChange={(e) => setUrunForm({ ...urunForm, renk: e.target.value })} />
              </div>
              <div>
                <Label>Birim (m², adet, paket...)</Label>
                <Input data-testid="input-urun-birim" value={urunForm.birim} onChange={(e) => setUrunForm({ ...urunForm, birim: e.target.value })} />
              </div>
              <div>
                <Label>Birim Fiyat (₺)</Label>
                <Input data-testid="input-urun-fiyat" type="number" step="0.01" value={urunForm.birim_fiyat} onChange={(e) => setUrunForm({ ...urunForm, birim_fiyat: e.target.value })} />
              </div>
              <div>
                <Label>📦 Paletteki Adet</Label>
                <Input
                  data-testid="input-urun-paletteki-adet"
                  type="number"
                  step="0.01"
                  min="0"
                  value={urunForm.paletteki_adet}
                  onChange={(e) => setUrunForm({ ...urunForm, paletteki_adet: e.target.value })}
                  placeholder="Örn: 50"
                />
              </div>
              <div>
                <Label>📐 Paletteki M² / Adet</Label>
                <Input
                  data-testid="input-urun-paletteki-m2"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={urunForm.paletteki_m2}
                  onChange={(e) => setUrunForm({ ...urunForm, paletteki_m2: e.target.value })}
                  placeholder="Örn: 10.5"
                />
              </div>
              <div>
                <Label>🧮 Net Paletteki Adet / M² (otomatik)</Label>
                <div
                  data-testid="display-net-paletteki"
                  className="h-10 px-3 py-2 rounded-md border bg-blue-50 border-blue-300 text-blue-700 font-bold flex items-center"
                >
                  {(() => {
                    const adet = parseFloat(urunForm.paletteki_adet) || 0;
                    const m2 = parseFloat(urunForm.paletteki_m2) || 0;
                    if (adet <= 0 || m2 <= 0) return <span className="text-gray-400 font-normal">—</span>;
                    return (adet / m2).toLocaleString('tr-TR', { maximumFractionDigits: 4 });
                  })()}
                </div>
              </div>
              <div className="md:col-span-3">
                <Label>Açıklama</Label>
                <Textarea data-testid="input-urun-aciklama" value={urunForm.aciklama} onChange={(e) => setUrunForm({ ...urunForm, aciklama: e.target.value })} rows={2} />
              </div>
              <div className="md:col-span-3 flex gap-2">
                <Button type="submit" data-testid="btn-urun-save" className="bg-green-600 hover:bg-green-700">
                  <Save size={16} className="mr-2" />{editUrunId ? 'Güncelle' : 'Ekle'}
                </Button>
                {editUrunId && (
                  <Button type="button" variant="outline" onClick={() => { setEditUrunId(null); setUrunForm(emptyUrun); }}>
                    <X size={16} className="mr-2" />İptal
                  </Button>
                )}
              </div>
            </form>
          </div>
          <div className="bg-white rounded-lg shadow border border-green-100 overflow-hidden">
            <div className="p-4 border-b bg-green-50">
              <h3 className="font-semibold text-green-800">Kayıtlı Ürünler ({urunler.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Ürün</th>
                    <th className="px-4 py-3 text-left">Ebat</th>
                    <th className="px-4 py-3 text-left">Renk</th>
                    <th className="px-4 py-3 text-left">Birim</th>
                    <th className="px-4 py-3 text-right">Fiyat</th>
                    <th className="px-4 py-3 text-right">Plt. Adet</th>
                    <th className="px-4 py-3 text-right">Plt. M²</th>
                    <th className="px-4 py-3 text-right">Adet/M²</th>
                    <th className="px-4 py-3 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {urunler.length === 0 ? (
                    <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-400">Henüz ürün eklenmedi</td></tr>
                  ) : urunler.map((u) => {
                    const adet = u.paletteki_adet || 0;
                    const m2 = u.paletteki_m2 || 0;
                    const adetPerM2 = adet > 0 && m2 > 0 ? adet / m2 : 0;
                    return (
                    <tr key={u.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{u.urun_adi}</td>
                      <td className="px-4 py-3">{u.ebat || '—'}</td>
                      <td className="px-4 py-3">{u.renk || '—'}</td>
                      <td className="px-4 py-3">{u.birim}</td>
                      <td className="px-4 py-3 text-right">{u.birim_fiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                      <td className="px-4 py-3 text-right">{adet > 0 ? adet.toLocaleString('tr-TR') : '—'}</td>
                      <td className="px-4 py-3 text-right">{m2 > 0 ? m2.toLocaleString('tr-TR', { maximumFractionDigits: 4 }) : '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-700">
                        {adetPerM2 > 0 ? adetPerM2.toLocaleString('tr-TR', { maximumFractionDigits: 4 }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-center">
                          <Button size="sm" variant="outline" onClick={() => handleUrunEdit(u)}><Pencil size={14} /></Button>
                          <Button size="sm" variant="destructive" onClick={() => setDeleteUrunId(u.id)}><Trash2 size={14} /></Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ==================== HAMMADDELER ==================== */}
        <TabsContent value="hammaddeler" className="mt-6">
          <div className="bg-white rounded-lg shadow p-6 mb-6 border border-amber-100">
            <h2 className="text-xl font-semibold mb-4 text-amber-700 flex items-center gap-2">
              {editHammaddeId ? <Pencil size={20} /> : <Plus size={20} />}
              {editHammaddeId ? 'Hammaddeyi Düzenle' : 'Yeni Hammadde Ekle'}
            </h2>
            <form onSubmit={handleHammaddeSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Hammadde Adı *</Label>
                <Input data-testid="input-hammadde-adi" value={hammaddeForm.hammadde_adi} onChange={(e) => setHammaddeForm({ ...hammaddeForm, hammadde_adi: e.target.value })} required />
              </div>
              <div>
                <Label>Birim</Label>
                <Input data-testid="input-hammadde-birim" value={hammaddeForm.birim} onChange={(e) => setHammaddeForm({ ...hammaddeForm, birim: e.target.value })} />
              </div>
              <div>
                <Label>Birim Fiyat (₺)</Label>
                <Input data-testid="input-hammadde-fiyat" type="number" step="0.01" value={hammaddeForm.birim_fiyat} onChange={(e) => setHammaddeForm({ ...hammaddeForm, birim_fiyat: e.target.value })} />
              </div>
              <div>
                <Label>Tedarikçi</Label>
                <Input data-testid="input-hammadde-tedarikci" value={hammaddeForm.tedarikci} onChange={(e) => setHammaddeForm({ ...hammaddeForm, tedarikci: e.target.value })} />
              </div>
              <div>
                <Label>Stok Miktarı</Label>
                <Input data-testid="input-hammadde-stok" type="number" step="0.01" value={hammaddeForm.stok_miktari} onChange={(e) => setHammaddeForm({ ...hammaddeForm, stok_miktari: e.target.value })} />
              </div>
              <div className="md:col-span-3">
                <Label>Açıklama</Label>
                <Textarea data-testid="input-hammadde-aciklama" value={hammaddeForm.aciklama} onChange={(e) => setHammaddeForm({ ...hammaddeForm, aciklama: e.target.value })} rows={2} />
              </div>
              <div className="md:col-span-3 flex gap-2">
                <Button type="submit" data-testid="btn-hammadde-save" className="bg-amber-600 hover:bg-amber-700">
                  <Save size={16} className="mr-2" />{editHammaddeId ? 'Güncelle' : 'Ekle'}
                </Button>
                {editHammaddeId && (
                  <Button type="button" variant="outline" onClick={() => { setEditHammaddeId(null); setHammaddeForm(emptyHammadde); }}>
                    <X size={16} className="mr-2" />İptal
                  </Button>
                )}
              </div>
            </form>
          </div>
          <div className="bg-white rounded-lg shadow border border-amber-100 overflow-hidden">
            <div className="p-4 border-b bg-amber-50">
              <h3 className="font-semibold text-amber-800">Kayıtlı Hammaddeler ({hammaddeler.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Hammadde</th>
                    <th className="px-4 py-3 text-left">Birim</th>
                    <th className="px-4 py-3 text-right">Fiyat</th>
                    <th className="px-4 py-3 text-left">Tedarikçi</th>
                    <th className="px-4 py-3 text-right">Stok</th>
                    <th className="px-4 py-3 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {hammaddeler.length === 0 ? (
                    <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">Henüz hammadde eklenmedi</td></tr>
                  ) : hammaddeler.map((h) => (
                    <tr key={h.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{h.hammadde_adi}</td>
                      <td className="px-4 py-3">{h.birim}</td>
                      <td className="px-4 py-3 text-right">{h.birim_fiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                      <td className="px-4 py-3">{h.tedarikci || '—'}</td>
                      <td className="px-4 py-3 text-right">{h.stok_miktari.toLocaleString('tr-TR')} {h.birim}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-center">
                          <Button size="sm" variant="outline" onClick={() => handleHammaddeEdit(h)}><Pencil size={14} /></Button>
                          <Button size="sm" variant="destructive" onClick={() => setDeleteHammaddeId(h.id)}><Trash2 size={14} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialogs */}
      <AlertDialog open={!!deleteOperatorId} onOpenChange={(o) => !o && setDeleteOperatorId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Operatörü Sil</AlertDialogTitle>
            <AlertDialogDescription>Bu operatörü silmek istediğinize emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleOperatorDelete} className="bg-red-600 hover:bg-red-700">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteUrunId} onOpenChange={(o) => !o && setDeleteUrunId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ürünü Sil</AlertDialogTitle>
            <AlertDialogDescription>Bu ürünü silmek istediğinize emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleUrunDelete} className="bg-red-600 hover:bg-red-700">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteHammaddeId} onOpenChange={(o) => !o && setDeleteHammaddeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hammaddeyi Sil</AlertDialogTitle>
            <AlertDialogDescription>Bu hammaddeyi silmek istediğinize emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleHammaddeDelete} className="bg-red-600 hover:bg-red-700">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ParkeKaynaklar;
