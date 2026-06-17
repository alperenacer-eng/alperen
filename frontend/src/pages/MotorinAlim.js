import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Save, Fuel, Truck, User, Scale, PlusCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MotorinAlim = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [tedarikciler, setTedarikciler] = useState([]);
  const [tesisler, setTesisler] = useState([]);
  const [markalar, setMarkalar] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Hızlı kaynak ekleme modalı
  const [quickAddModal, setQuickAddModal] = useState({ open: false, type: '', title: '' });
  const [quickAddValue, setQuickAddValue] = useState('');
  
  const [formData, setFormData] = useState({
    tarih: new Date().toISOString().split('T')[0],
    tedarikci_id: '',
    tedarikci_adi: '',
    akaryakit_markasi: '',
    cekici_plaka: '',
    dorse_plaka: '',
    sofor_adi: '',
    sofor_soyadi: '',
    miktar_litre: '',
    miktar_kg: '',
    kesafet: '',
    kantar_kg: '',
    birim_fiyat: '',
    toplam_tutar: '',
    fatura_no: '',
    irsaliye_no: '',
    odeme_durumu: 'beklemede',
    vade_tarihi: '',
    teslim_alan: user?.name || '',
    bosaltim_tesisi: '',
    notlar: ''
  });

  // 6 satırlık miktar/ağırlık girişi — her satır: { miktar_kg, kesafet, net_litre_giris, kantar_kg } → net_litre_hesap otomatik
  const [entries, setEntries] = useState(() =>
    Array.from({ length: 6 }, () => ({ miktar_kg: '', kesafet: '', net_litre_giris: '', kantar_kg: '' }))
  );

  const updateEntry = (idx, field, value) => {
    setEntries(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  // Her satır için net litre hesaplama: kg / kesafet
  const computeNetLitre = (row) => {
    const kg = parseFloat(row.miktar_kg) || 0;
    const k = parseFloat(row.kesafet) || 0;
    if (kg > 0 && k > 0) return kg / k;
    return 0;
  };

  // 6 satırın toplamları
  const totals = entries.reduce((acc, row) => {
    acc.miktar_kg += parseFloat(row.miktar_kg) || 0;
    acc.kantar_kg += parseFloat(row.kantar_kg) || 0;
    acc.net_litre += computeNetLitre(row);
    acc.net_litre_giris += parseFloat(row.net_litre_giris) || 0;
    return acc;
  }, { miktar_kg: 0, kantar_kg: 0, net_litre: 0, net_litre_giris: 0 });

  useEffect(() => {
    fetchTedarikciler();
    fetchTesisler();
    fetchMarkalar();
  }, []);

  // Otomatik toplam tutar hesaplama (Net Litre × Birim Fiyat)
  useEffect(() => {
    const miktar = totals.net_litre || 0;
    const birim = parseFloat(formData.birim_fiyat) || 0;
    setFormData(prev => ({
      ...prev,
      toplam_tutar: (miktar * birim).toFixed(2)
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals.net_litre, formData.birim_fiyat]);

  const fetchTedarikciler = async () => {
    try {
      const res = await axios.get(`${API_URL}/motorin-tedarikciler`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTedarikciler(res.data);
    } catch (error) {
      console.log('Tedarikçiler yüklenemedi');
    }
  };

  const fetchTesisler = async () => {
    try {
      const res = await axios.get(`${API_URL}/bosaltim-tesisleri`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTesisler(res.data);
    } catch (error) {
      console.log('Tesisler yüklenemedi');
    }
  };

  const fetchMarkalar = async () => {
    try {
      const res = await axios.get(`${API_URL}/akaryakit-markalari`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMarkalar(res.data);
    } catch (error) {
      console.log('Markalar yüklenemedi');
    }
  };

  // Hızlı kaynak ekleme fonksiyonu
  const handleQuickAdd = async () => {
    if (!quickAddValue.trim()) {
      toast.error('Lütfen bir değer girin');
      return;
    }

    const endpoints = {
      'tedarikci': '/motorin-tedarikciler',
      'akaryakit_markasi': '/akaryakit-markalari',
      'bosaltim_tesisi': '/bosaltim-tesisleri'
    };

    try {
      const response = await axios.post(`${API_URL}${endpoints[quickAddModal.type]}`, 
        { name: quickAddValue.trim() },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      if (response.data) {
        toast.success(`${quickAddModal.title} eklendi`);
        setQuickAddModal({ open: false, type: '', title: '' });
        setQuickAddValue('');
        
        // İlgili listeyi yenile ve eklenen değeri seç
        if (quickAddModal.type === 'tedarikci') {
          fetchTedarikciler();
          setFormData(prev => ({ 
            ...prev, 
            tedarikci_id: response.data.id,
            tedarikci_adi: quickAddValue.trim() 
          }));
        } else if (quickAddModal.type === 'akaryakit_markasi') {
          fetchMarkalar();
          setFormData(prev => ({ ...prev, akaryakit_markasi: quickAddValue.trim() }));
        } else if (quickAddModal.type === 'bosaltim_tesisi') {
          fetchTesisler();
          setFormData(prev => ({ ...prev, bosaltim_tesisi: quickAddValue.trim() }));
        }
      }
    } catch (error) {
      console.error('Kaynak ekleme hatası:', error);
      toast.error('Ekleme başarısız');
    }
  };

  const openQuickAddModal = (type, title) => {
    setQuickAddModal({ open: true, type, title });
    setQuickAddValue('');
  };

  const handleTedarikciChange = (e) => {
    const tedarikciId = e.target.value;
    const tedarikci = tedarikciler.find(t => t.id === tedarikciId);
    setFormData({
      ...formData,
      tedarikci_id: tedarikciId,
      tedarikci_adi: tedarikci ? tedarikci.name : ''
    });
  };

  const handleTesisChange = (e) => {
    const tesisId = e.target.value;
    const tesis = tesisler.find(t => t.id === tesisId);
    setFormData({
      ...formData,
      bosaltim_tesisi: tesis ? tesis.name : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 6 satırdan en az birini doldurmuş olmalı
    const filledEntries = entries.filter(r => parseFloat(r.miktar_kg) > 0 && parseFloat(r.kesafet) > 0);
    if (filledEntries.length === 0) {
      toast.error('En az bir Miktar/Ağırlık satırı doldurun (KG + Kesafet)');
      return;
    }

    // Tüm zorunlu alanları kontrol et
    if (!formData.tarih || !formData.tedarikci_adi || !formData.akaryakit_markasi ||
        !formData.cekici_plaka || !formData.dorse_plaka || !formData.sofor_adi ||
        !formData.sofor_soyadi || !formData.birim_fiyat ||
        !formData.teslim_alan || !formData.bosaltim_tesisi) {
      toast.error('Tüm alanları doldurunuz! (* ile işaretli alanlar zorunludur)');
      return;
    }

    setLoading(true);
    try {
      // Satır detaylarını notlar'a ekle (backend şeması değiştirilmeden)
      const entriesText = entries
        .map((r, i) => {
          const netL = computeNetLitre(r);
          if (parseFloat(r.miktar_kg) > 0 || parseFloat(r.kantar_kg) > 0 || parseFloat(r.net_litre_giris) > 0) {
            return `[${i + 1}] KG: ${r.miktar_kg || '-'} | Net L (Giriş): ${r.net_litre_giris || '-'} | Kesafet: ${r.kesafet || '-'} | Net L (Hesap): ${netL ? netL.toFixed(2) : '-'} | Kantar KG: ${r.kantar_kg || '-'}`;
          }
          return null;
        })
        .filter(Boolean)
        .join('\n');

      const combinedNotes = [formData.notlar, '--- Miktar/Ağırlık Detayları (6 Satır) ---', entriesText]
        .filter(s => s && s.trim())
        .join('\n');

      const submitData = {
        ...formData,
        miktar_litre: totals.net_litre || 0,
        miktar_kg: totals.miktar_kg || 0,
        kesafet: totals.net_litre > 0 ? totals.miktar_kg / totals.net_litre : 0,
        kantar_kg: totals.kantar_kg || 0,
        birim_fiyat: parseFloat(formData.birim_fiyat) || 0,
        toplam_tutar: (totals.net_litre || 0) * (parseFloat(formData.birim_fiyat) || 0),
        notlar: combinedNotes
      };

      await axios.post(`${API_URL}/motorin-alimlar`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Motorin alım kaydı oluşturuldu');
      navigate('/motorin-liste');
    } catch (error) {
      toast.error('Kayıt oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" data-testid="motorin-alim-page">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
            <Fuel className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Motorin Alım Kaydı</h1>
            <p className="text-slate-400">Yeni motorin alımı kaydedin</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Temel Bilgiler */}
        <div className="glass-effect rounded-xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Fuel className="w-5 h-5 text-green-400" />
            Temel Bilgiler
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Tarih */}
            <div>
              <Label className="text-slate-300">Tarih *</Label>
              <Input
                type="date"
                value={formData.tarih}
                onChange={(e) => setFormData({ ...formData, tarih: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                required
              />
            </div>

            {/* Tedarikçi */}
            <div>
              <Label className="text-slate-300">Tedarikçi *</Label>
              <div className="flex gap-2 mt-1">
                <select
                  value={formData.tedarikci_id}
                  onChange={handleTedarikciChange}
                  className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2"
                  required
                >
                  <option value="">Tedarikçi Seçin</option>
                  {tedarikciler.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="border-green-500/50 text-green-400 hover:bg-green-500/20 h-10 w-10"
                  onClick={() => openQuickAddModal('tedarikci', 'Tedarikçi')}
                >
                  <PlusCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Akaryakıt Markası */}
            <div>
              <Label className="text-slate-300">Akaryakıt Markası *</Label>
              <div className="flex gap-2 mt-1">
                <select
                  value={formData.akaryakit_markasi}
                  onChange={(e) => setFormData({ ...formData, akaryakit_markasi: e.target.value })}
                  className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2"
                  required
                >
                  <option value="">Marka Seçin</option>
                  {markalar.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="border-green-500/50 text-green-400 hover:bg-green-500/20 h-10 w-10"
                  onClick={() => openQuickAddModal('akaryakit_markasi', 'Akaryakıt Markası')}
                >
                  <PlusCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Teslim Alan */}
            <div>
              <Label className="text-slate-300">Teslim Alan *</Label>
              <Input
                type="text"
                value={formData.teslim_alan}
                onChange={(e) => setFormData({ ...formData, teslim_alan: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="Teslim alan kişi"
                required
              />
            </div>

            {/* Boşaltım Yapılan Tesis */}
            <div>
              <Label className="text-slate-300">Boşaltım Yapılan Tesis *</Label>
              <div className="flex gap-2 mt-1">
                <select
                  value={formData.bosaltim_tesisi}
                  onChange={handleTesisChange}
                  className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2"
                  required
                >
                  <option value="">Tesis Seçin</option>
                  {tesisler.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="border-green-500/50 text-green-400 hover:bg-green-500/20 h-10 w-10"
                  onClick={() => openQuickAddModal('bosaltim_tesisi', 'Boşaltım Tesisi')}
                >
                  <PlusCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Araç ve Şoför Bilgileri */}
        <div className="glass-effect rounded-xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-400" />
            Araç ve Şoför Bilgileri
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Çekici Plaka */}
            <div>
              <Label className="text-slate-300">Çekici Plaka *</Label>
              <Input
                type="text"
                value={formData.cekici_plaka}
                onChange={(e) => setFormData({ ...formData, cekici_plaka: e.target.value.toUpperCase() })}
                className="bg-slate-800 border-slate-700 text-white mt-1 uppercase"
                placeholder="34 ABC 123"
                required
              />
            </div>

            {/* Dorse Plaka */}
            <div>
              <Label className="text-slate-300">Dorse Plaka *</Label>
              <Input
                type="text"
                value={formData.dorse_plaka}
                onChange={(e) => setFormData({ ...formData, dorse_plaka: e.target.value.toUpperCase() })}
                className="bg-slate-800 border-slate-700 text-white mt-1 uppercase"
                placeholder="34 DEF 456"
                required
              />
            </div>

            {/* Şoför Adı */}
            <div>
              <Label className="text-slate-300">Şoför Adı *</Label>
              <Input
                type="text"
                value={formData.sofor_adi}
                onChange={(e) => setFormData({ ...formData, sofor_adi: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="Şoför adı"
                required
              />
            </div>

            {/* Şoför Soyadı */}
            <div>
              <Label className="text-slate-300">Şoför Soyadı *</Label>
              <Input
                type="text"
                value={formData.sofor_soyadi}
                onChange={(e) => setFormData({ ...formData, sofor_soyadi: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="Şoför soyadı"
                required
              />
            </div>
          </div>
        </div>

        {/* Miktar ve Ağırlık Bilgileri — 6 Satır */}
        <div className="glass-effect rounded-xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400" />
            Miktar ve Ağırlık Bilgileri (6 Giriş)
          </h2>

          {/* Başlık satırı */}
          <div className="hidden md:grid gap-2 mb-2 text-xs text-slate-400 uppercase tracking-wider font-semibold px-1" style={{ gridTemplateColumns: '40px repeat(5, minmax(0, 1fr))' }}>
            <div>#</div>
            <div>Miktar (KG) *</div>
            <div>Net Litre (Giriş)</div>
            <div>Kesafet (kg/L)</div>
            <div>Net Litre (Hesap)</div>
            <div>Kantar (KG)</div>
          </div>

          <div className="space-y-2" data-testid="entries-list">
            {entries.map((row, idx) => {
              const netLitre = computeNetLitre(row);
              return (
                <div
                  key={idx}
                  className="grid grid-cols-1 gap-2 items-center bg-slate-900/40 rounded-lg p-2 border border-slate-800 md:[grid-template-columns:40px_repeat(5,minmax(0,1fr))]"
                  data-testid={`entry-row-${idx}`}
                >
                  <div className="text-amber-400 font-bold text-center text-sm">
                    <span className="md:hidden text-slate-400 text-xs mr-2">Sıra:</span>{idx + 1}
                  </div>
                  <div>
                    <Label className="md:hidden text-slate-300 text-xs">Miktar (KG)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.miktar_kg}
                      onChange={(e) => updateEntry(idx, 'miktar_kg', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9"
                      placeholder="Örn: 8350"
                      data-testid={`entry-miktar-kg-${idx}`}
                    />
                  </div>
                  <div>
                    <Label className="md:hidden text-slate-300 text-xs">Net Litre (Giriş)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.net_litre_giris}
                      onChange={(e) => updateEntry(idx, 'net_litre_giris', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9"
                      placeholder="Manuel L"
                      data-testid={`entry-net-litre-giris-${idx}`}
                    />
                  </div>
                  <div>
                    <Label className="md:hidden text-slate-300 text-xs">Kesafet</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={row.kesafet}
                      onChange={(e) => updateEntry(idx, 'kesafet', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9"
                      placeholder="0.835"
                      data-testid={`entry-kesafet-${idx}`}
                    />
                  </div>
                  <div>
                    <Label className="md:hidden text-slate-300 text-xs">Net Litre (Hesap)</Label>
                    <Input
                      type="text"
                      value={netLitre > 0 ? netLitre.toFixed(2) : ''}
                      readOnly
                      className="bg-slate-950/60 border-slate-800 text-amber-400 font-mono h-9"
                      placeholder="Otomatik"
                      data-testid={`entry-net-litre-${idx}`}
                    />
                  </div>
                  <div>
                    <Label className="md:hidden text-slate-300 text-xs">Kantar KG</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.kantar_kg}
                      onChange={(e) => updateEntry(idx, 'kantar_kg', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9"
                      placeholder="Kantar"
                      data-testid={`entry-kantar-kg-${idx}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toplamlar */}
          <div className="mt-4 pt-4 border-t-2 border-amber-500/40">
            <div
              className="grid grid-cols-1 gap-2 items-end bg-amber-500/10 rounded-lg p-3 md:[grid-template-columns:40px_repeat(5,minmax(0,1fr))]"
              data-testid="entries-totals"
            >
              <div className="text-amber-400 font-bold text-center text-sm uppercase">Σ</div>
              <div>
                <Label className="text-amber-300 text-xs uppercase tracking-wider">Toplam KG</Label>
                <Input
                  type="text"
                  value={totals.miktar_kg > 0 ? totals.miktar_kg.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : '0'}
                  readOnly
                  className="bg-slate-950/60 border-amber-500/30 text-amber-300 font-mono font-bold h-10"
                  data-testid="total-miktar-kg"
                />
              </div>
              <div>
                <Label className="text-amber-300 text-xs uppercase tracking-wider">Toplam Net L (Giriş)</Label>
                <Input
                  type="text"
                  value={totals.net_litre_giris > 0 ? totals.net_litre_giris.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : '0'}
                  readOnly
                  className="bg-slate-950/60 border-amber-500/30 text-amber-300 font-mono font-bold h-10"
                  data-testid="total-net-litre-giris"
                />
              </div>
              <div>
                <Label className="text-amber-300 text-xs uppercase tracking-wider">Ort. Kesafet</Label>
                <Input
                  type="text"
                  value={totals.net_litre > 0 ? (totals.miktar_kg / totals.net_litre).toFixed(4) : '-'}
                  readOnly
                  className="bg-slate-950/60 border-amber-500/30 text-amber-300 font-mono h-10"
                  data-testid="total-avg-kesafet"
                />
              </div>
              <div>
                <Label className="text-amber-300 text-xs uppercase tracking-wider">Toplam Net L (Hesap)</Label>
                <Input
                  type="text"
                  value={totals.net_litre > 0 ? totals.net_litre.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : '0'}
                  readOnly
                  className="bg-slate-950/60 border-amber-500/30 text-amber-300 font-mono font-bold h-10"
                  data-testid="total-net-litre"
                />
              </div>
              <div>
                <Label className="text-amber-300 text-xs uppercase tracking-wider">Toplam Kantar KG</Label>
                <Input
                  type="text"
                  value={totals.kantar_kg > 0 ? totals.kantar_kg.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : '0'}
                  readOnly
                  className="bg-slate-950/60 border-amber-500/30 text-amber-300 font-mono font-bold h-10"
                  data-testid="total-kantar-kg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fiyat Bilgileri */}
        <div className="glass-effect rounded-xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            💰 Fiyat Bilgileri
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Birim Fiyat */}
            <div>
              <Label className="text-slate-300">Birim Fiyat (₺/Litre) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.birim_fiyat}
                onChange={(e) => setFormData({ ...formData, birim_fiyat: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="Örn: 42.50"
                required
              />
            </div>

            {/* Toplam Tutar */}
            <div>
              <Label className="text-slate-300">Toplam Tutar (₺)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.toplam_tutar}
                onChange={(e) => setFormData({ ...formData, toplam_tutar: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1 font-semibold text-green-400"
                readOnly
              />
            </div>

            {/* Ödeme Durumu */}
            <div>
              <Label className="text-slate-300">Ödeme Durumu</Label>
              <select
                value={formData.odeme_durumu}
                onChange={(e) => setFormData({ ...formData, odeme_durumu: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1"
              >
                <option value="beklemede">Beklemede</option>
                <option value="odendi">Ödendi</option>
                <option value="vadeli">Vadeli</option>
              </select>
            </div>
          </div>

          {/* Vade Tarihi */}
          {formData.odeme_durumu === 'vadeli' && (
            <div className="mt-4">
              <Label className="text-slate-300">Vade Tarihi</Label>
              <Input
                type="date"
                value={formData.vade_tarihi}
                onChange={(e) => setFormData({ ...formData, vade_tarihi: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1 max-w-xs"
              />
            </div>
          )}
        </div>

        {/* Belge Bilgileri */}
        <div className="glass-effect rounded-xl border border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">📄 Belge Bilgileri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fatura No */}
            <div>
              <Label className="text-slate-300">Fatura No</Label>
              <Input
                type="text"
                value={formData.fatura_no}
                onChange={(e) => setFormData({ ...formData, fatura_no: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="Fatura numarası"
              />
            </div>

            {/* İrsaliye No */}
            <div>
              <Label className="text-slate-300">İrsaliye No</Label>
              <Input
                type="text"
                value={formData.irsaliye_no}
                onChange={(e) => setFormData({ ...formData, irsaliye_no: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
                placeholder="İrsaliye numarası"
              />
            </div>

            {/* Notlar */}
            <div className="md:col-span-2">
              <Label className="text-slate-300">Notlar</Label>
              <textarea
                value={formData.notlar}
                onChange={(e) => setFormData({ ...formData, notlar: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1 min-h-[80px]"
                placeholder="Ek notlar..."
              />
            </div>
          </div>
        </div>

        {/* Özet Kartı */}
        {totals.net_litre > 0 && formData.birim_fiyat && (
          <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl">
            <h3 className="text-green-400 font-semibold mb-4 text-lg">📊 Alım Özeti (6 Satır Toplamı)</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-2xl font-bold text-white">{totals.net_litre.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-slate-400">Net Litre</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-2xl font-bold text-white">{totals.miktar_kg.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-slate-400">KG</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-2xl font-bold text-white">₺{parseFloat(formData.birim_fiyat).toFixed(2)}</p>
                <p className="text-xs text-slate-400">Birim Fiyat</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-400">₺{(totals.net_litre * (parseFloat(formData.birim_fiyat) || 0)).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-slate-400">Toplam Tutar</p>
              </div>
              {formData.cekici_plaka && (
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-lg font-bold text-blue-400">{formData.cekici_plaka}</p>
                  <p className="text-xs text-slate-400">Çekici</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </form>

      {/* Hızlı Kaynak Ekleme Modal */}
      <Dialog open={quickAddModal.open} onOpenChange={(open) => setQuickAddModal(prev => ({ ...prev, open }))}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Yeni {quickAddModal.title} Ekle
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">{quickAddModal.title} Adı</Label>
              <Input
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(e.target.value)}
                placeholder={`${quickAddModal.title} adını girin`}
                className="bg-slate-800/50 border-slate-700"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuickAdd();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setQuickAddModal({ open: false, type: '', title: '' })}
            >
              İptal
            </Button>
            <Button 
              type="button" 
              className="bg-green-500 hover:bg-green-600"
              onClick={handleQuickAdd}
            >
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MotorinAlim;
