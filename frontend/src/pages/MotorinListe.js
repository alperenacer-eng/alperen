import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Filter,
  Calendar,
  Fuel
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MotorinListe = () => {
  const { token } = useAuth();
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

  useEffect(() => {
    fetchData();
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(num);
  };

  const filteredAlimlar = alimlar.filter(a => 
    (a.tedarikci_adi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.fatura_no || '').toLowerCase().includes(searchTerm.toLowerCase())
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

                          <div className="flex gap-4 mt-2 text-xs text-slate-500">
                            {alim.fatura_no && <span>Fatura: {alim.fatura_no}</span>}
                            {alim.irsaliye_no && <span>İrsaliye: {alim.irsaliye_no}</span>}
                            {alim.teslim_alan && <span>Teslim Alan: {alim.teslim_alan}</span>}
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
    </div>
  );
};

export default MotorinListe;
