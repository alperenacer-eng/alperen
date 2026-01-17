import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Trash2, ArrowLeft, Edit, History, Boxes, TrendingUp, TrendingDown, Plus, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatNumber, formatInteger } from '@/utils/formatNumber';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const BimsStok = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [stokUrunler, setStokUrunler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteStokId, setDeleteStokId] = useState(null);
  
  // Açılış Fişleri
  const [acilisFisleri, setAcilisFisleri] = useState({});
  
  // Stok Hareketleri
  const [showStokHareket, setShowStokHareket] = useState(null);
  const [stokHareketler, setStokHareketler] = useState([]);
  
  // Yeni Hareket Ekleme
  const [showHareketModal, setShowHareketModal] = useState(null);
  const [yeniHareket, setYeniHareket] = useState({
    hareket_tipi: 'giris',
    miktar: 0,
    tarih: new Date().toISOString().split('T')[0],
    aciklama: ''
  });

  // Özet
  const [ozet, setOzet] = useState({ toplam_urun: 0, toplam_stok: 0, dusuk_stok: 0 });

  useEffect(() => {
    fetchStokUrunler();
    fetchOzet();
  }, []);

  const fetchStokUrunler = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/bims-stok-urunler`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStokUrunler(response.data);
    } catch (error) {
      console.error('Stok ürünleri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOzet = async () => {
    try {
      const response = await axios.get(`${API_URL}/bims-stok-ozet`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOzet(response.data);
    } catch (error) {
      console.error('Özet yüklenemedi:', error);
    }
  };

  const handleDeleteStok = async () => {
    try {
      await axios.delete(`${API_URL}/bims-stok-urunler/${deleteStokId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Stok ürünü silindi');
      fetchStokUrunler();
      fetchOzet();
    } catch (error) {
      toast.error('Silme başarısız');
    } finally {
      setDeleteStokId(null);
    }
  };

  const fetchStokHareketler = async (urunId) => {
    try {
      const response = await axios.get(`${API_URL}/bims-stok-hareketler?urun_id=${urunId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStokHareketler(response.data);
    } catch (error) {
      console.error('Hareketler yüklenemedi:', error);
    }
  };

  const handleShowHareketler = async (urun) => {
    setShowStokHareket(urun);
    await fetchStokHareketler(urun.id);
  };

  const handleAddHareket = async (e) => {
    e.preventDefault();
    if (yeniHareket.miktar <= 0) {
      toast.error('Miktar 0\'dan büyük olmalıdır');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/bims-stok-hareketler`, {
        urun_id: showHareketModal.id,
        ...yeniHareket
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Hareket eklendi');
      setShowHareketModal(null);
      setYeniHareket({
        hareket_tipi: 'giris',
        miktar: 0,
        tarih: new Date().toISOString().split('T')[0],
        aciklama: ''
      });
      fetchStokUrunler();
      fetchOzet();
    } catch (error) {
      toast.error('Hareket eklenemedi');
    }
  };

  // Açılış Fişi Kaydet
  const handleAcilisFisiKaydet = async (urun) => {
    const miktar = parseFloat(acilisFisleri[urun.id]);
    if (isNaN(miktar) || miktar < 0) {
      toast.error('Geçerli bir miktar girin');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/bims-stok-acilis-fisi`, {
        urun_id: urun.id,
        miktar: miktar,
        tarih: new Date().toISOString().split('T')[0]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Açılış fişi kaydedildi');
      fetchStokUrunler();
      fetchOzet();
      // Input'u temizle
      setAcilisFisleri(prev => {
        const updated = {...prev};
        delete updated[urun.id];
        return updated;
      });
    } catch (error) {
      toast.error('Açılış fişi kaydedilemedi');
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Geri
        </button>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">BIMS Stok Yönetimi</h1>
        <p className="text-slate-400">Ürün stoklarını ve hareketleri yönetin</p>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center">
              <Boxes className="w-6 h-6 text-teal-500" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Toplam Ürün</p>
              <p className="text-2xl font-bold text-white">{formatInteger(ozet.toplam_urun)}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Toplam Stok</p>
              <p className="text-2xl font-bold text-white">{formatInteger(ozet.toplam_stok)}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Düşük Stok</p>
              <p className="text-2xl font-bold text-white">{formatInteger(ozet.dusuk_stok)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stok Listesi */}
      <div className="glass-effect rounded-xl p-6 border border-slate-800">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Boxes className="w-5 h-5 text-teal-500" />
          Stok Listesi ({stokUrunler.length})
        </h2>
        
        {loading ? (
          <div className="text-center py-12 text-slate-400">Yükleniyor...</div>
        ) : stokUrunler.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Ürün Adı</th>
                  <th className="text-center py-3 px-2 text-slate-400 font-medium">Birim</th>
                  <th className="text-center py-3 px-2 text-blue-400 font-medium">Açılış Fişi</th>
                  <th className="text-right py-3 px-2 text-slate-400 font-medium">Mevcut Stok</th>
                  <th className="text-center py-3 px-2 text-slate-400 font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {stokUrunler.map((urun) => (
                  <tr key={urun.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-4 px-2">
                      <span className="text-white font-medium">{urun.urun_adi}</span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded">{urun.birim}</span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center justify-center gap-2">
                        <Input
                          type="number"
                          value={acilisFisleri[urun.id] !== undefined ? acilisFisleri[urun.id] : (urun.acilis_miktari || '')}
                          onChange={(e) => setAcilisFisleri({...acilisFisleri, [urun.id]: e.target.value})}
                          placeholder="0"
                          className="w-24 h-10 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-center font-bold"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAcilisFisiKaydet(urun)}
                          className="bg-blue-600 hover:bg-blue-500 text-white h-10 px-4 font-medium"
                        >
                          Kaydet
                        </Button>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <span className={`text-lg font-bold ${(urun.mevcut_stok || 0) > 10 ? 'text-teal-400' : (urun.mevcut_stok || 0) > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {formatInteger(urun.mevcut_stok || 0)}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setShowHareketModal(urun)}
                          className="text-green-400 hover:text-green-300 hover:bg-green-400/10"
                          title="Giriş/Çıkış Ekle"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleShowHareketler(urun)} 
                          className="text-slate-400 hover:text-white hover:bg-slate-700"
                          title="Hareketler"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <Boxes className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Henüz stok ürünü yok</p>
            <p className="text-sm mt-1">Kaynaklar → Ürünler'den ürün ekleyin</p>
          </div>
        )}
      </div>

      {/* Stok Hareketleri Modal */}
      <AlertDialog open={!!showStokHareket} onOpenChange={() => setShowStokHareket(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-teal-400" />
              Stok Hareketleri - {showStokHareket?.urun_adi}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {stokHareketler.length > 0 ? (
              stokHareketler.map((hareket) => (
                <div key={hareket.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                      hareket.hareket_tipi === 'acilis' ? 'bg-blue-500/20 text-blue-400' :
                      hareket.hareket_tipi === 'giris' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {hareket.hareket_tipi === 'acilis' ? 'Açılış Fişi' :
                       hareket.hareket_tipi === 'giris' ? 'Giriş' : 'Çıkış'}
                    </span>
                    <span className={`font-bold ${
                      hareket.hareket_tipi === 'cikis' ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {hareket.hareket_tipi === 'cikis' ? '-' : '+'}{formatInteger(hareket.miktar)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-400">{hareket.tarih}</span>
                    {hareket.aciklama && (
                      <span className="text-xs text-slate-500">{hareket.aciklama}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-slate-500">Henüz hareket yok</div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700">Kapat</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Yeni Hareket Ekleme Modal */}
      {showHareketModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">
                Stok Hareketi - {showHareketModal.urun_adi}
              </h3>
              <button onClick={() => setShowHareketModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddHareket} className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Hareket Tipi</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setYeniHareket({ ...yeniHareket, hareket_tipi: 'giris' })}
                    className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-colors ${
                      yeniHareket.hareket_tipi === 'giris'
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5" />
                    Giriş
                  </button>
                  <button
                    type="button"
                    onClick={() => setYeniHareket({ ...yeniHareket, hareket_tipi: 'cikis' })}
                    className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-colors ${
                      yeniHareket.hareket_tipi === 'cikis'
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <TrendingDown className="w-5 h-5" />
                    Çıkış
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Miktar *</Label>
                  <Input
                    type="number"
                    value={yeniHareket.miktar}
                    onChange={(e) => setYeniHareket({ ...yeniHareket, miktar: parseFloat(e.target.value) || 0 })}
                    min="0.01"
                    step="0.01"
                    required
                    className="h-12 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tarih</Label>
                  <Input
                    type="date"
                    value={yeniHareket.tarih}
                    onChange={(e) => setYeniHareket({ ...yeniHareket, tarih: e.target.value })}
                    className="h-12 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Açıklama</Label>
                <Input
                  value={yeniHareket.aciklama}
                  onChange={(e) => setYeniHareket({ ...yeniHareket, aciklama: e.target.value })}
                  placeholder="Hareket açıklaması..."
                  className="h-12 bg-slate-800 border-slate-700 text-white"
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button type="button" onClick={() => setShowHareketModal(null)} className="flex-1 h-12 bg-slate-700 hover:bg-slate-600 text-white">
                  İptal
                </Button>
                <Button type="submit" className={`flex-1 h-12 ${yeniHareket.hareket_tipi === 'giris' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}>
                  {yeniHareket.hareket_tipi === 'giris' ? 'Giriş Yap' : 'Çıkış Yap'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BimsStok;
