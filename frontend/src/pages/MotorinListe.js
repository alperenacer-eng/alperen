import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Filter,
  Calendar,
  Fuel,
  X,
  Save
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MotorinListe = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('alim');
  const [alimlar, setAlimlar] = useState([]);
  const [vermeler, setVermeler] = useState([]);
  const [stok, setStok] = useState({ mevcut_stok: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({
    baslangic: '',
    bitis: ''
  });
  
  // Düzenleme Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAlim, setEditingAlim] = useState(null);
  const [editingVerme, setEditingVerme] = useState(null);
  const [tedarikciler, setTedarikciler] = useState([]);
  const [tesisler, setTesisler] = useState([]);
  const [markalar, setMarkalar] = useState([]);
  const [araclar, setAraclar] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
    fetchTedarikciler();
    fetchTesisler();
    fetchMarkalar();
    fetchAraclar();
  }, [dateFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFilter.baslangic && dateFilter.bitis) {
        params.baslangic_tarihi = dateFilter.baslangic;
        params.bitis_tarihi = dateFilter.bitis;
      }

      const [alimRes, vermeRes, stokRes] = await Promise.all([
        axios.get(`${API_URL}/motorin-alimlar`, { 
          headers: { Authorization: `Bearer ${token}` },
          params 
        }),
        axios.get(`${API_URL}/motorin-verme`, { 
          headers: { Authorization: `Bearer ${token}` },
          params 
        }),
        axios.get(`${API_URL}/motorin-stok`, { 
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setAlimlar(alimRes.data);
      setVermeler(vermeRes.data);
      setStok(stokRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

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

  const fetchAraclar = async () => {
    try {
      const res = await axios.get(`${API_URL}/araclar`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAraclar(res.data);
    } catch (error) {
      console.log('Araçlar yüklenemedi');
    }
  };

  const handleDeleteAlim = async (id) => {
    if (!window.confirm('Bu alım kaydını silmek istediğinize emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/motorin-alimlar/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kayıt silindi');
      fetchData();
    } catch (error) {
      toast.error('Silinemedi');
    }
  };

  const handleDeleteVerme = async (id) => {
    if (!window.confirm('Bu verme kaydını silmek istediğinize emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/motorin-verme/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kayıt silindi');
      fetchData();
    } catch (error) {
      toast.error('Silinemedi');
    }
  };

  // Düzenleme işlemleri
  const handleEditAlim = (alim) => {
    setEditingAlim({
      ...alim,
      miktar_litre: alim.miktar_litre?.toString() || '',
      miktar_kg: alim.miktar_kg?.toString() || '',
      kesafet: alim.kesafet?.toString() || '',
      kantar_kg: alim.kantar_kg?.toString() || '',
      birim_fiyat: alim.birim_fiyat?.toString() || '',
      toplam_tutar: alim.toplam_tutar?.toString() || ''
    });
    setEditingVerme(null);
    setShowEditModal(true);
  };

  const handleEditVerme = (verme) => {
    setEditingVerme({
      ...verme,
      miktar_litre: verme.miktar_litre?.toString() || '',
      kilometre: verme.kilometre?.toString() || ''
    });
    setEditingAlim(null);
    setShowEditModal(true);
  };

  const handleSaveAlim = async () => {
    // Zorunlu alan kontrolü
    if (!editingAlim.tarih || !editingAlim.tedarikci_adi || !editingAlim.akaryakit_markasi ||
        !editingAlim.cekici_plaka || !editingAlim.dorse_plaka || !editingAlim.sofor_adi || 
        !editingAlim.sofor_soyadi || !editingAlim.miktar_litre || !editingAlim.miktar_kg || 
        !editingAlim.kesafet || !editingAlim.kantar_kg || !editingAlim.birim_fiyat || 
        !editingAlim.teslim_alan || !editingAlim.bosaltim_tesisi) {
      toast.error('Tüm alanları doldurunuz!');
      return;
    }

    setSaving(true);
    try {
      const submitData = {
        ...editingAlim,
        miktar_litre: parseFloat(editingAlim.miktar_litre) || 0,
        miktar_kg: parseFloat(editingAlim.miktar_kg) || 0,
        kesafet: parseFloat(editingAlim.kesafet) || 0,
        kantar_kg: parseFloat(editingAlim.kantar_kg) || 0,
        birim_fiyat: parseFloat(editingAlim.birim_fiyat) || 0,
        toplam_tutar: parseFloat(editingAlim.toplam_tutar) || 0
      };

      await axios.put(`${API_URL}/motorin-alimlar/${editingAlim.id}`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Kayıt güncellendi');
      setShowEditModal(false);
      setEditingAlim(null);
      fetchData();
    } catch (error) {
      toast.error('Güncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVerme = async () => {
    // Zorunlu alan kontrolü
    if (!editingVerme.tarih || !editingVerme.arac_id || !editingVerme.miktar_litre) {
      toast.error('Tarih, araç ve miktar zorunludur!');
      return;
    }

    setSaving(true);
    try {
      const submitData = {
        ...editingVerme,
        miktar_litre: parseFloat(editingVerme.miktar_litre) || 0,
        kilometre: parseFloat(editingVerme.kilometre) || 0
      };

      await axios.put(`${API_URL}/motorin-verme/${editingVerme.id}`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Kayıt güncellendi');
      setShowEditModal(false);
      setEditingVerme(null);
      fetchData();
    } catch (error) {
      toast.error('Güncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  // Otomatik hesaplamalar
  useEffect(() => {
    if (editingAlim) {
      const miktar = parseFloat(editingAlim.miktar_litre) || 0;
      const birim = parseFloat(editingAlim.birim_fiyat) || 0;
      const kesafet = parseFloat(editingAlim.kesafet) || 0;
      
      setEditingAlim(prev => ({
        ...prev,
        toplam_tutar: (miktar * birim).toFixed(2),
        miktar_kg: kesafet > 0 ? (miktar * kesafet).toFixed(2) : prev.miktar_kg
      }));
    }
  }, [editingAlim?.miktar_litre, editingAlim?.birim_fiyat, editingAlim?.kesafet]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(num);
  };

  const filteredAlimlar = alimlar.filter(a => 
    (a.tedarikci_adi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.fatura_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.cekici_plaka || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.dorse_plaka || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.sofor_adi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.sofor_soyadi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.teslim_alan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.bosaltim_tesisi || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVermeler = vermeler.filter(v => 
    (v.arac_plaka || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.sofor_adi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.personel_adi || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOdemeDurumuBadge = (durum) => {
    switch (durum) {
      case 'odendi':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Ödendi</span>;
      case 'vadeli':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Vadeli</span>;
      default:
        return <span className="px-2 py-1 bg-slate-500/20 text-slate-400 rounded text-xs">Beklemede</span>;
    }
  };

  return (
    <div className="animate-fade-in" data-testid="motorin-liste-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Motorin Kayıtları</h1>
          <p className="text-slate-400">Alım ve verme kayıtlarını yönetin</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate('/motorin-alim')}
            className="bg-green-600 hover:bg-green-700"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Yeni Alım
          </Button>
          <Button
            onClick={() => navigate('/motorin-verme-giris')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Araçlara Ver
          </Button>
        </div>
      </div>

      {/* Stok Özeti */}
      <div className="glass-effect rounded-xl p-4 border border-slate-800 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
          <Fuel className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <p className="text-sm text-slate-400">Mevcut Stok</p>
          <p className="text-2xl font-bold text-white">{formatNumber(stok.mevcut_stok)} <span className="text-sm text-slate-400">Litre</span></p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('alim')}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === 'alim'
              ? 'bg-green-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Alımlar ({alimlar.length})
        </button>
        <button
          onClick={() => setActiveTab('verme')}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === 'verme'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          Vermeler ({vermeler.length})
        </button>
      </div>

      {/* Filters */}
      <div className="glass-effect rounded-xl border border-slate-800 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <Input
              type="date"
              value={dateFilter.baslangic}
              onChange={(e) => setDateFilter({ ...dateFilter, baslangic: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="Başlangıç"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <Input
              type="date"
              value={dateFilter.bitis}
              onChange={(e) => setDateFilter({ ...dateFilter, bitis: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="Bitiş"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setDateFilter({ baslangic: '', bitis: '' })}
            className="border-slate-700 text-slate-400"
          >
            <Filter className="w-4 h-4 mr-2" />
            Temizle
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-slate-400 mt-4">Yükleniyor...</p>
        </div>
      ) : (
        <>
          {/* Alımlar Tab */}
          {activeTab === 'alim' && (
            <div className="space-y-3">
              {filteredAlimlar.length > 0 ? (
                filteredAlimlar.map((alim) => (
                  <div key={alim.id} className="glass-effect rounded-xl border border-slate-800 p-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-5 h-5 text-green-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-white">{alim.tedarikci_adi || 'Tedarikçi Belirtilmemiş'}</p>
                            {alim.akaryakit_markasi && (
                              <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                                ⛽ {alim.akaryakit_markasi}
                              </span>
                            )}
                            {getOdemeDurumuBadge(alim.odeme_durumu)}
                          </div>
                          <p className="text-sm text-slate-400">{alim.tarih}</p>
                          
                          {/* Araç ve Şoför Bilgileri */}
                          <div className="flex flex-wrap gap-3 mt-2">
                            {alim.cekici_plaka && (
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                                🚛 Çekici: {alim.cekici_plaka}
                              </span>
                            )}
                            {alim.dorse_plaka && (
                              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                                🚚 Dorse: {alim.dorse_plaka}
                              </span>
                            )}
                            {(alim.sofor_adi || alim.sofor_soyadi) && (
                              <span className="px-2 py-1 bg-slate-500/20 text-slate-400 rounded text-xs">
                                👤 {alim.sofor_adi} {alim.sofor_soyadi}
                              </span>
                            )}
                          </div>

                          {/* KG ve Kesafet */}
                          <div className="flex flex-wrap gap-3 mt-2">
                            {alim.miktar_kg > 0 && (
                              <span className="text-xs text-amber-400">
                                ⚖️ {formatNumber(alim.miktar_kg)} KG
                              </span>
                            )}
                            {alim.kesafet > 0 && (
                              <span className="text-xs text-slate-500">
                                Kesafet: {alim.kesafet}
                              </span>
                            )}
                            {alim.kantar_kg > 0 && (
                              <span className="text-xs text-orange-400">
                                Kantar: {formatNumber(alim.kantar_kg)} KG
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                            {alim.fatura_no && <span>Fatura: {alim.fatura_no}</span>}
                            {alim.irsaliye_no && <span>İrsaliye: {alim.irsaliye_no}</span>}
                            {alim.teslim_alan && <span>Teslim Alan: {alim.teslim_alan}</span>}
                            {alim.bosaltim_tesisi && (
                              <span className="text-cyan-400">📍 Tesis: {alim.bosaltim_tesisi}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-400">{formatNumber(alim.miktar_litre)} L</p>
                          <p className="text-sm text-slate-400">{formatCurrency(alim.toplam_tutar)}</p>
                          <p className="text-xs text-slate-500">₺{parseFloat(alim.birim_fiyat).toFixed(2)}/L</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-slate-400 hover:text-blue-400"
                            onClick={() => handleEditAlim(alim)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-slate-400 hover:text-red-400"
                            onClick={() => handleDeleteAlim(alim.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Henüz alım kaydı yok</p>
                  <Button
                    onClick={() => navigate('/motorin-alim')}
                    className="mt-4 bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    İlk Alımı Kaydet
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Vermeler Tab */}
          {activeTab === 'verme' && (
            <div className="space-y-3">
              {filteredVermeler.length > 0 ? (
                filteredVermeler.map((verme) => (
                  <div key={verme.id} className="glass-effect rounded-xl border border-slate-800 p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <TrendingDown className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{verme.arac_plaka || 'Araç'}</p>
                          <p className="text-sm text-slate-400">{verme.arac_bilgi}</p>
                          <p className="text-sm text-slate-400">{verme.tarih}</p>
                          <div className="flex gap-4 mt-1 text-xs text-slate-500">
                            {verme.kilometre > 0 && <span>KM: {formatNumber(verme.kilometre)}</span>}
                            {(verme.sofor_adi || verme.personel_adi) && (
                              <span>Şoför: {verme.sofor_adi || verme.personel_adi}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xl font-bold text-blue-400">{formatNumber(verme.miktar_litre)} L</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-slate-400 hover:text-blue-400"
                            onClick={() => handleEditVerme(verme)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-slate-400 hover:text-red-400"
                            onClick={() => handleDeleteVerme(verme.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <TrendingDown className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Henüz verme kaydı yok</p>
                  <Button
                    onClick={() => navigate('/motorin-verme-giris')}
                    className="mt-4 bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    İlk Vermeyi Kaydet
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Düzenleme Modal - Alım */}
      {showEditModal && editingAlim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-4xl my-8">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Alım Kaydını Düzenle</h2>
              <button
                onClick={() => { setShowEditModal(false); setEditingAlim(null); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Temel Bilgiler */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-slate-300">Tarih *</Label>
                  <Input
                    type="date"
                    value={editingAlim.tarih}
                    onChange={(e) => setEditingAlim({ ...editingAlim, tarih: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    required
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Tedarikçi *</Label>
                  <select
                    value={editingAlim.tedarikci_id}
                    onChange={(e) => {
                      const t = tedarikciler.find(x => x.id === e.target.value);
                      setEditingAlim({ 
                        ...editingAlim, 
                        tedarikci_id: e.target.value,
                        tedarikci_adi: t ? t.name : editingAlim.tedarikci_adi
                      });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1"
                  >
                    <option value="">Seçin</option>
                    {tedarikciler.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-slate-300">Akaryakıt Markası *</Label>
                  <select
                    value={editingAlim.akaryakit_markasi}
                    onChange={(e) => setEditingAlim({ ...editingAlim, akaryakit_markasi: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1"
                    required
                  >
                    <option value="">Seçin</option>
                    {markalar.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-slate-300">Teslim Alan *</Label>
                  <Input
                    value={editingAlim.teslim_alan}
                    onChange={(e) => setEditingAlim({ ...editingAlim, teslim_alan: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    required
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Boşaltım Tesisi *</Label>
                  <select
                    value={editingAlim.bosaltim_tesisi}
                    onChange={(e) => setEditingAlim({ ...editingAlim, bosaltim_tesisi: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1"
                    required
                  >
                    <option value="">Seçin</option>
                    {tesisler.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Araç ve Şoför */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-slate-300">Çekici Plaka *</Label>
                  <Input
                    value={editingAlim.cekici_plaka}
                    onChange={(e) => setEditingAlim({ ...editingAlim, cekici_plaka: e.target.value.toUpperCase() })}
                    className="bg-slate-800 border-slate-700 text-white mt-1 uppercase"
                    required
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Dorse Plaka *</Label>
                  <Input
                    value={editingAlim.dorse_plaka}
                    onChange={(e) => setEditingAlim({ ...editingAlim, dorse_plaka: e.target.value.toUpperCase() })}
                    className="bg-slate-800 border-slate-700 text-white mt-1 uppercase"
                    required
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Şoför Adı *</Label>
                  <Input
                    value={editingAlim.sofor_adi}
                    onChange={(e) => setEditingAlim({ ...editingAlim, sofor_adi: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    required
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Şoför Soyadı *</Label>
                  <Input
                    value={editingAlim.sofor_soyadi}
                    onChange={(e) => setEditingAlim({ ...editingAlim, sofor_soyadi: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    required
                  />
                </div>
              </div>

              {/* Miktar ve Ağırlık */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-slate-300">Miktar (Litre) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingAlim.miktar_litre}
                    onChange={(e) => setEditingAlim({ ...editingAlim, miktar_litre: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    required
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Kesafet (kg/L) *</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={editingAlim.kesafet}
                    onChange={(e) => setEditingAlim({ ...editingAlim, kesafet: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    required
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Miktar KG *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingAlim.miktar_kg}
                    onChange={(e) => setEditingAlim({ ...editingAlim, miktar_kg: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    required
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Kantar KG *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingAlim.kantar_kg}
                    onChange={(e) => setEditingAlim({ ...editingAlim, kantar_kg: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    required
                  />
                </div>
              </div>

              {/* Fiyat */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300">Birim Fiyat (₺/L) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingAlim.birim_fiyat}
                    onChange={(e) => setEditingAlim({ ...editingAlim, birim_fiyat: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    required
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Toplam Tutar (₺)</Label>
                  <Input
                    type="number"
                    value={editingAlim.toplam_tutar}
                    className="bg-slate-800 border-slate-700 text-white mt-1 text-green-400"
                    readOnly
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Ödeme Durumu</Label>
                  <select
                    value={editingAlim.odeme_durumu}
                    onChange={(e) => setEditingAlim({ ...editingAlim, odeme_durumu: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1"
                  >
                    <option value="beklemede">Beklemede</option>
                    <option value="odendi">Ödendi</option>
                    <option value="vadeli">Vadeli</option>
                  </select>
                </div>
              </div>

              {/* Belgeler */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Fatura No</Label>
                  <Input
                    value={editingAlim.fatura_no}
                    onChange={(e) => setEditingAlim({ ...editingAlim, fatura_no: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">İrsaliye No</Label>
                  <Input
                    value={editingAlim.irsaliye_no}
                    onChange={(e) => setEditingAlim({ ...editingAlim, irsaliye_no: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Notlar</Label>
                <textarea
                  value={editingAlim.notlar}
                  onChange={(e) => setEditingAlim({ ...editingAlim, notlar: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1 min-h-[60px]"
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-slate-800">
              <Button
                variant="outline"
                onClick={() => { setShowEditModal(false); setEditingAlim(null); }}
                className="border-slate-700 text-slate-300 flex-1"
              >
                İptal
              </Button>
              <Button
                onClick={handleSaveAlim}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Kaydediliyor...' : 'Güncelle'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Düzenleme Modal - Verme */}
      {showEditModal && editingVerme && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Verme Kaydını Düzenle</h2>
              <button
                onClick={() => { setShowEditModal(false); setEditingVerme(null); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <Label className="text-slate-300">Tarih *</Label>
                <Input
                  type="date"
                  value={editingVerme.tarih}
                  onChange={(e) => setEditingVerme({ ...editingVerme, tarih: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  required
                />
              </div>

              <div>
                <Label className="text-slate-300">Araç *</Label>
                <select
                  value={editingVerme.arac_id}
                  onChange={(e) => {
                    const a = araclar.find(x => x.id === e.target.value);
                    setEditingVerme({ 
                      ...editingVerme, 
                      arac_id: e.target.value,
                      arac_plaka: a ? a.plaka : '',
                      arac_bilgi: a ? `${a.marka || ''} ${a.model || ''}` : ''
                    });
                  }}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1"
                  required
                >
                  <option value="">Seçin</option>
                  {araclar.map(a => (
                    <option key={a.id} value={a.id}>{a.plaka} - {a.marka} {a.model}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-slate-300">Miktar (Litre) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingVerme.miktar_litre}
                  onChange={(e) => setEditingVerme({ ...editingVerme, miktar_litre: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  required
                />
              </div>

              <div>
                <Label className="text-slate-300">Kilometre</Label>
                <Input
                  type="number"
                  value={editingVerme.kilometre}
                  onChange={(e) => setEditingVerme({ ...editingVerme, kilometre: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-slate-300">Şoför Adı</Label>
                <Input
                  value={editingVerme.sofor_adi}
                  onChange={(e) => setEditingVerme({ ...editingVerme, sofor_adi: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-slate-300">Notlar</Label>
                <textarea
                  value={editingVerme.notlar}
                  onChange={(e) => setEditingVerme({ ...editingVerme, notlar: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1 min-h-[60px]"
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-slate-800">
              <Button
                variant="outline"
                onClick={() => { setShowEditModal(false); setEditingVerme(null); }}
                className="border-slate-700 text-slate-300 flex-1"
              >
                İptal
              </Button>
              <Button
                onClick={handleSaveVerme}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Kaydediliyor...' : 'Güncelle'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MotorinListe;
