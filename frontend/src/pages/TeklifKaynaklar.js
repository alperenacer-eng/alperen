import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Building,
  X,
  Save,
  Phone,
  Mail,
  MapPin,
  Package,
  DollarSign
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TeklifKaynaklar = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('musteriler');
  
  // Müşteriler
  const [musteriler, setMusteriler] = useState([]);
  const [loadingMusteriler, setLoadingMusteriler] = useState(true);
  const [showMusteriModal, setShowMusteriModal] = useState(false);
  const [editingMusteri, setEditingMusteri] = useState(null);
  const [musteriForm, setMusteriForm] = useState({
    firma_adi: '',
    yetkili_kisi: '',
    telefon: '',
    email: '',
    adres: '',
    vergi_no: '',
    vergi_dairesi: '',
    notlar: ''
  });

  // Ürünler
  const [urunler, setUrunler] = useState([]);
  const [loadingUrunler, setLoadingUrunler] = useState(true);
  const [showUrunModal, setShowUrunModal] = useState(false);
  const [editingUrun, setEditingUrun] = useState(null);
  const [urunForm, setUrunForm] = useState({
    urun_adi: '',
    aciklama: '',
    birim: 'adet',
    birim_fiyat: 0,
    kdv_orani: 20,
    aktif: true
  });

  useEffect(() => {
    fetchMusteriler();
    fetchUrunler();
  }, []);

  // ============ MÜŞTERİ İŞLEMLERİ ============
  const fetchMusteriler = async () => {
    try {
      const response = await fetch(`${API_URL}/api/teklif-musteriler`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMusteriler(data);
      }
    } catch (error) {
      console.error('Müşteriler yüklenirken hata:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoadingMusteriler(false);
    }
  };

  const resetMusteriForm = () => {
    setMusteriForm({
      firma_adi: '',
      yetkili_kisi: '',
      telefon: '',
      email: '',
      adres: '',
      vergi_no: '',
      vergi_dairesi: '',
      notlar: ''
    });
    setEditingMusteri(null);
  };

  const openMusteriModal = (musteri = null) => {
    if (musteri) {
      setEditingMusteri(musteri);
      setMusteriForm({
        firma_adi: musteri.firma_adi || '',
        yetkili_kisi: musteri.yetkili_kisi || '',
        telefon: musteri.telefon || '',
        email: musteri.email || '',
        adres: musteri.adres || '',
        vergi_no: musteri.vergi_no || '',
        vergi_dairesi: musteri.vergi_dairesi || '',
        notlar: musteri.notlar || ''
      });
    } else {
      resetMusteriForm();
    }
    setShowMusteriModal(true);
  };

  const handleMusteriSubmit = async (e) => {
    e.preventDefault();
    
    if (!musteriForm.firma_adi.trim()) {
      toast.error('Firma adı zorunludur');
      return;
    }
    
    try {
      const url = editingMusteri
        ? `${API_URL}/api/teklif-musteriler/${editingMusteri.id}`
        : `${API_URL}/api/teklif-musteriler`;
      const method = editingMusteri ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(musteriForm)
      });
      
      if (response.ok) {
        toast.success(editingMusteri ? 'Müşteri güncellendi' : 'Müşteri eklendi');
        fetchMusteriler();
        setShowMusteriModal(false);
        resetMusteriForm();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'İşlem başarısız');
      }
    } catch (error) {
      console.error('Kayıt hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleMusteriDelete = async (id) => {
    if (!window.confirm('Bu müşteriyi silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/teklif-musteriler/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Müşteri silindi');
        fetchMusteriler();
      } else {
        toast.error('Silme işlemi başarısız');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  // ============ ÜRÜN İŞLEMLERİ ============
  const fetchUrunler = async () => {
    try {
      const response = await fetch(`${API_URL}/api/teklif-urunler`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUrunler(data);
      }
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error);
    } finally {
      setLoadingUrunler(false);
    }
  };

  const resetUrunForm = () => {
    setUrunForm({
      urun_adi: '',
      aciklama: '',
      birim: 'adet',
      birim_fiyat: 0,
      kdv_orani: 20,
      aktif: true
    });
    setEditingUrun(null);
  };

  const openUrunModal = (urun = null) => {
    if (urun) {
      setEditingUrun(urun);
      setUrunForm({
        urun_adi: urun.urun_adi || '',
        aciklama: urun.aciklama || '',
        birim: urun.birim || 'adet',
        birim_fiyat: urun.birim_fiyat || 0,
        kdv_orani: urun.kdv_orani || 20,
        aktif: urun.aktif !== false
      });
    } else {
      resetUrunForm();
    }
    setShowUrunModal(true);
  };

  const handleUrunSubmit = async (e) => {
    e.preventDefault();
    
    if (!urunForm.urun_adi.trim()) {
      toast.error('Ürün adı zorunludur');
      return;
    }
    
    try {
      const url = editingUrun
        ? `${API_URL}/api/teklif-urunler/${editingUrun.id}`
        : `${API_URL}/api/teklif-urunler`;
      const method = editingUrun ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(urunForm)
      });
      
      if (response.ok) {
        toast.success(editingUrun ? 'Ürün güncellendi' : 'Ürün eklendi');
        fetchUrunler();
        setShowUrunModal(false);
        resetUrunForm();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'İşlem başarısız');
      }
    } catch (error) {
      console.error('Kayıt hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleUrunDelete = async (id) => {
    if (!window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/teklif-urunler/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Ürün silindi');
        fetchUrunler();
      } else {
        toast.error('Silme işlemi başarısız');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);
  };

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold text-white">Teklif Kaynakları</h1>
        <p className="text-slate-400 text-sm">Müşteri ve ürün tanımlamalarını yönetin</p>
      </div>

      {/* Tab Menüsü */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('musteriler')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'musteriler'
              ? 'bg-teal-500/20 text-teal-500 border-b-2 border-teal-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building className="w-4 h-4" />
          Müşteriler ({musteriler.length})
        </button>
        <button
          onClick={() => setActiveTab('urunler')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'urunler'
              ? 'bg-teal-500/20 text-teal-500 border-b-2 border-teal-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          Ürünler ({urunler.length})
        </button>
      </div>

      {/* Müşteriler Tab */}
      {activeTab === 'musteriler' && (
        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Müşteriler</h3>
                <p className="text-slate-400 text-sm">{musteriler.length} müşteri</p>
              </div>
            </div>
            <Button
              onClick={() => openMusteriModal()}
              className="bg-teal-500 hover:bg-teal-600"
            >
              <Plus className="w-4 h-4 mr-2" /> Müşteri Ekle
            </Button>
          </div>

          {loadingMusteriler ? (
            <div className="text-center py-8 text-slate-400">Yükleniyor...</div>
          ) : musteriler.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {musteriler.map((musteri) => (
                <div
                  key={musteri.id}
                  className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-medium">{musteri.firma_adi}</h4>
                      {musteri.yetkili_kisi && (
                        <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                          <Users className="w-3 h-3" /> {musteri.yetkili_kisi}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openMusteriModal(musteri)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMusteriDelete(musteri.id)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    {musteri.telefon && (
                      <p className="text-slate-400 flex items-center gap-2">
                        <Phone className="w-3 h-3" /> {musteri.telefon}
                      </p>
                    )}
                    {musteri.email && (
                      <p className="text-slate-400 flex items-center gap-2">
                        <Mail className="w-3 h-3" /> {musteri.email}
                      </p>
                    )}
                    {musteri.adres && (
                      <p className="text-slate-400 flex items-center gap-2 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" /> {musteri.adres}
                      </p>
                    )}
                  </div>
                  
                  {(musteri.vergi_no || musteri.vergi_dairesi) && (
                    <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-500">
                      {musteri.vergi_dairesi && <span>{musteri.vergi_dairesi}</span>}
                      {musteri.vergi_no && <span className="ml-2">VN: {musteri.vergi_no}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              Henüz müşteri tanımlanmamış.
              <button
                onClick={() => openMusteriModal()}
                className="block mx-auto mt-2 text-teal-500 hover:text-teal-400"
              >
                İlk müşterinizi ekleyin
              </button>
            </div>
          )}
        </div>
      )}

      {/* Ürünler Tab */}
      {activeTab === 'urunler' && (
        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Ürünler</h3>
                <p className="text-slate-400 text-sm">{urunler.length} ürün</p>
              </div>
            </div>
            <Button
              onClick={() => openUrunModal()}
              className="bg-teal-500 hover:bg-teal-600"
            >
              <Plus className="w-4 h-4 mr-2" /> Ürün Ekle
            </Button>
          </div>

          {loadingUrunler ? (
            <div className="text-center py-8 text-slate-400">Yükleniyor...</div>
          ) : urunler.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-slate-400 text-sm border-b border-slate-700">
                    <th className="text-left py-3 px-2">Ürün Adı</th>
                    <th className="text-left py-3 px-2">Açıklama</th>
                    <th className="text-center py-3 px-2">Birim</th>
                    <th className="text-right py-3 px-2">Birim Fiyat</th>
                    <th className="text-center py-3 px-2">KDV %</th>
                    <th className="text-center py-3 px-2">Durum</th>
                    <th className="text-center py-3 px-2">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {urunler.map((urun) => (
                    <tr key={urun.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-3 px-2">
                        <span className="text-white font-medium">{urun.urun_adi}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-slate-400 text-sm">{urun.aciklama || '-'}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded">{urun.birim}</span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="text-teal-500 font-medium">{formatCurrency(urun.birim_fiyat)}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="text-slate-400">%{urun.kdv_orani}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2 py-1 text-xs rounded ${urun.aktif !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {urun.aktif !== false ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openUrunModal(urun)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUrunDelete(urun.id)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              Henüz ürün tanımlanmamış.
              <button
                onClick={() => openUrunModal()}
                className="block mx-auto mt-2 text-teal-500 hover:text-teal-400"
              >
                İlk ürününüzü ekleyin
              </button>
            </div>
          )}
        </div>
      )}

      {/* Müşteri Modal */}
      {showMusteriModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">
                {editingMusteri ? 'Müşteri Düzenle' : 'Yeni Müşteri'}
              </h3>
              <button
                onClick={() => { setShowMusteriModal(false); resetMusteriForm(); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleMusteriSubmit} className="p-4 space-y-4">
              <div>
                <Label className="text-slate-300">Firma Adı *</Label>
                <Input
                  value={musteriForm.firma_adi}
                  onChange={(e) => setMusteriForm(prev => ({ ...prev, firma_adi: e.target.value }))}
                  placeholder="Firma adı"
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
              
              <div>
                <Label className="text-slate-300">Yetkili Kişi</Label>
                <Input
                  value={musteriForm.yetkili_kisi}
                  onChange={(e) => setMusteriForm(prev => ({ ...prev, yetkili_kisi: e.target.value }))}
                  placeholder="Yetkili kişi adı"
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Telefon</Label>
                  <Input
                    value={musteriForm.telefon}
                    onChange={(e) => setMusteriForm(prev => ({ ...prev, telefon: e.target.value }))}
                    placeholder="0555 555 55 55"
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">E-posta</Label>
                  <Input
                    type="email"
                    value={musteriForm.email}
                    onChange={(e) => setMusteriForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@firma.com"
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-slate-300">Adres</Label>
                <textarea
                  value={musteriForm.adres}
                  onChange={(e) => setMusteriForm(prev => ({ ...prev, adres: e.target.value }))}
                  placeholder="Adres"
                  rows={2}
                  className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Vergi Dairesi</Label>
                  <Input
                    value={musteriForm.vergi_dairesi}
                    onChange={(e) => setMusteriForm(prev => ({ ...prev, vergi_dairesi: e.target.value }))}
                    placeholder="Vergi dairesi"
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Vergi No</Label>
                  <Input
                    value={musteriForm.vergi_no}
                    onChange={(e) => setMusteriForm(prev => ({ ...prev, vergi_no: e.target.value }))}
                    placeholder="Vergi numarası"
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-slate-300">Notlar</Label>
                <textarea
                  value={musteriForm.notlar}
                  onChange={(e) => setMusteriForm(prev => ({ ...prev, notlar: e.target.value }))}
                  placeholder="Ek notlar..."
                  rows={2}
                  className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => { setShowMusteriModal(false); resetMusteriForm(); }}
                  className="bg-slate-700 hover:bg-slate-600"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  className="bg-teal-500 hover:bg-teal-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingMusteri ? 'Güncelle' : 'Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ürün Modal */}
      {showUrunModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">
                {editingUrun ? 'Ürün Düzenle' : 'Yeni Ürün'}
              </h3>
              <button
                onClick={() => { setShowUrunModal(false); resetUrunForm(); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUrunSubmit} className="p-4 space-y-4">
              <div>
                <Label className="text-slate-300">Ürün Adı *</Label>
                <Input
                  value={urunForm.urun_adi}
                  onChange={(e) => setUrunForm(prev => ({ ...prev, urun_adi: e.target.value }))}
                  placeholder="Ürün/Hizmet adı"
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
              
              <div>
                <Label className="text-slate-300">Açıklama</Label>
                <Input
                  value={urunForm.aciklama}
                  onChange={(e) => setUrunForm(prev => ({ ...prev, aciklama: e.target.value }))}
                  placeholder="Ürün açıklaması"
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Birim</Label>
                  <select
                    value={urunForm.birim}
                    onChange={(e) => setUrunForm(prev => ({ ...prev, birim: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                  >
                    <option value="adet">Adet</option>
                    <option value="kg">Kg</option>
                    <option value="ton">Ton</option>
                    <option value="m2">m²</option>
                    <option value="m3">m³</option>
                    <option value="metre">Metre</option>
                    <option value="saat">Saat</option>
                    <option value="gun">Gün</option>
                    <option value="ay">Ay</option>
                    <option value="paket">Paket</option>
                  </select>
                </div>
                <div>
                  <Label className="text-slate-300">Birim Fiyat (₺)</Label>
                  <Input
                    type="number"
                    value={urunForm.birim_fiyat}
                    onChange={(e) => setUrunForm(prev => ({ ...prev, birim_fiyat: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">KDV Oranı</Label>
                  <select
                    value={urunForm.kdv_orani}
                    onChange={(e) => setUrunForm(prev => ({ ...prev, kdv_orani: parseFloat(e.target.value) }))}
                    className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                  >
                    <option value="0">%0</option>
                    <option value="1">%1</option>
                    <option value="10">%10</option>
                    <option value="20">%20</option>
                  </select>
                </div>
                <div>
                  <Label className="text-slate-300">Durum</Label>
                  <select
                    value={urunForm.aktif ? 'true' : 'false'}
                    onChange={(e) => setUrunForm(prev => ({ ...prev, aktif: e.target.value === 'true' }))}
                    className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Pasif</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => { setShowUrunModal(false); resetUrunForm(); }}
                  className="bg-slate-700 hover:bg-slate-600"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  className="bg-teal-500 hover:bg-teal-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingUrun ? 'Güncelle' : 'Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeklifKaynaklar;
