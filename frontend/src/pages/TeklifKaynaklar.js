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
  Grid3X3
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

  // BIMS Ürünleri
  const [bimsUrunler, setBimsUrunler] = useState([]);
  const [loadingBims, setLoadingBims] = useState(true);
  const [showBimsModal, setShowBimsModal] = useState(false);
  const [editingBims, setEditingBims] = useState(null);
  const [bimsForm, setBimsForm] = useState({
    urun_adi: '',
    birim: 'adet',
    birim_fiyat: 0,
    aciklama: ''
  });

  // Parke Ürünleri
  const [parkeUrunler, setParkeUrunler] = useState([]);
  const [loadingParke, setLoadingParke] = useState(true);
  const [showParkeModal, setShowParkeModal] = useState(false);
  const [editingParke, setEditingParke] = useState(null);
  const [parkeForm, setParkeForm] = useState({
    urun_adi: '',
    birim: 'm²',
    birim_fiyat: 0,
    ebat: '',
    renk: '',
    aciklama: ''
  });

  useEffect(() => {
    fetchMusteriler();
    fetchBimsUrunler();
    fetchParkeUrunler();
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

  // ============ BIMS ÜRÜN İŞLEMLERİ ============
  const fetchBimsUrunler = async () => {
    try {
      const response = await fetch(`${API_URL}/api/bims-urunler`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBimsUrunler(data);
      }
    } catch (error) {
      console.error('BIMS ürünleri yüklenirken hata:', error);
    } finally {
      setLoadingBims(false);
    }
  };

  const resetBimsForm = () => {
    setBimsForm({
      urun_adi: '',
      birim: 'adet',
      birim_fiyat: 0,
      aciklama: ''
    });
    setEditingBims(null);
  };

  const openBimsModal = (urun = null) => {
    if (urun) {
      setEditingBims(urun);
      setBimsForm({
        urun_adi: urun.urun_adi || '',
        birim: urun.birim || 'adet',
        birim_fiyat: urun.birim_fiyat || 0,
        aciklama: urun.aciklama || ''
      });
    } else {
      resetBimsForm();
    }
    setShowBimsModal(true);
  };

  const handleBimsSubmit = async (e) => {
    e.preventDefault();
    
    if (!bimsForm.urun_adi.trim()) {
      toast.error('Ürün adı zorunludur');
      return;
    }
    
    try {
      const url = editingBims
        ? `${API_URL}/api/bims-urunler/${editingBims.id}`
        : `${API_URL}/api/bims-urunler`;
      const method = editingBims ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bimsForm)
      });
      
      if (response.ok) {
        toast.success(editingBims ? 'BIMS ürün güncellendi' : 'BIMS ürün eklendi');
        fetchBimsUrunler();
        setShowBimsModal(false);
        resetBimsForm();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'İşlem başarısız');
      }
    } catch (error) {
      console.error('Kayıt hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleBimsDelete = async (id) => {
    if (!window.confirm('Bu BIMS ürünü silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/bims-urunler/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('BIMS ürün silindi');
        fetchBimsUrunler();
      } else {
        toast.error('Silme işlemi başarısız');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  // ============ PARKE ÜRÜN İŞLEMLERİ ============
  const fetchParkeUrunler = async () => {
    try {
      const response = await fetch(`${API_URL}/api/parke-urunler`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setParkeUrunler(data);
      }
    } catch (error) {
      console.error('Parke ürünleri yüklenirken hata:', error);
    } finally {
      setLoadingParke(false);
    }
  };

  const resetParkeForm = () => {
    setParkeForm({
      urun_adi: '',
      birim: 'm²',
      birim_fiyat: 0,
      ebat: '',
      renk: '',
      aciklama: ''
    });
    setEditingParke(null);
  };

  const openParkeModal = (urun = null) => {
    if (urun) {
      setEditingParke(urun);
      setParkeForm({
        urun_adi: urun.urun_adi || '',
        birim: urun.birim || 'm²',
        birim_fiyat: urun.birim_fiyat || 0,
        ebat: urun.ebat || '',
        renk: urun.renk || '',
        aciklama: urun.aciklama || ''
      });
    } else {
      resetParkeForm();
    }
    setShowParkeModal(true);
  };

  const handleParkeSubmit = async (e) => {
    e.preventDefault();
    
    if (!parkeForm.urun_adi.trim()) {
      toast.error('Ürün adı zorunludur');
      return;
    }
    
    try {
      const url = editingParke
        ? `${API_URL}/api/parke-urunler/${editingParke.id}`
        : `${API_URL}/api/parke-urunler`;
      const method = editingParke ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(parkeForm)
      });
      
      if (response.ok) {
        toast.success(editingParke ? 'Parke ürün güncellendi' : 'Parke ürün eklendi');
        fetchParkeUrunler();
        setShowParkeModal(false);
        resetParkeForm();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'İşlem başarısız');
      }
    } catch (error) {
      console.error('Kayıt hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleParkeDelete = async (id) => {
    if (!window.confirm('Bu Parke ürünü silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/parke-urunler/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Parke ürün silindi');
        fetchParkeUrunler();
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
              ? 'bg-purple-500/20 text-purple-400 border-b-2 border-purple-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building className="w-4 h-4" />
          Müşteriler ({musteriler.length})
        </button>
        <button
          onClick={() => setActiveTab('bims')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'bims'
              ? 'bg-teal-500/20 text-teal-400 border-b-2 border-teal-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          BIMS Ürünleri ({bimsUrunler.length})
        </button>
        <button
          onClick={() => setActiveTab('parke')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'parke'
              ? 'bg-orange-500/20 text-orange-400 border-b-2 border-orange-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
          Parke Ürünleri ({parkeUrunler.length})
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
              className="bg-purple-500 hover:bg-purple-600"
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
                className="block mx-auto mt-2 text-purple-500 hover:text-purple-400"
              >
                İlk müşterinizi ekleyin
              </button>
            </div>
          )}
        </div>
      )}

      {/* BIMS Ürünleri Tab */}
      {activeTab === 'bims' && (
        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-teal-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">BIMS Ürünleri</h3>
                <p className="text-slate-400 text-sm">{bimsUrunler.length} ürün</p>
              </div>
            </div>
            <Button
              onClick={() => openBimsModal()}
              className="bg-teal-500 hover:bg-teal-600"
            >
              <Plus className="w-4 h-4 mr-2" /> BIMS Ürün Ekle
            </Button>
          </div>

          {loadingBims ? (
            <div className="text-center py-8 text-slate-400">Yükleniyor...</div>
          ) : bimsUrunler.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-slate-400 text-sm border-b border-slate-700">
                    <th className="text-left py-3 px-2">Ürün Adı</th>
                    <th className="text-left py-3 px-2">Açıklama</th>
                    <th className="text-center py-3 px-2">Birim</th>
                    <th className="text-right py-3 px-2">Birim Fiyat</th>
                    <th className="text-center py-3 px-2">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {bimsUrunler.map((urun) => (
                    <tr key={urun.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-3 px-2">
                        <span className="text-white font-medium">{urun.urun_adi}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-slate-400 text-sm">{urun.aciklama || '-'}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="px-2 py-1 bg-teal-500/20 text-teal-400 text-xs rounded">{urun.birim}</span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="text-teal-500 font-medium">{formatCurrency(urun.birim_fiyat)}</span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openBimsModal(urun)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleBimsDelete(urun.id)}
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
              Henüz BIMS ürünü tanımlanmamış.
              <button
                onClick={() => openBimsModal()}
                className="block mx-auto mt-2 text-teal-500 hover:text-teal-400"
              >
                İlk BIMS ürününüzü ekleyin
              </button>
            </div>
          )}
        </div>
      )}

      {/* Parke Ürünleri Tab */}
      {activeTab === 'parke' && (
        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Grid3X3 className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Parke Ürünleri</h3>
                <p className="text-slate-400 text-sm">{parkeUrunler.length} ürün</p>
              </div>
            </div>
            <Button
              onClick={() => openParkeModal()}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="w-4 h-4 mr-2" /> Parke Ürün Ekle
            </Button>
          </div>

          {loadingParke ? (
            <div className="text-center py-8 text-slate-400">Yükleniyor...</div>
          ) : parkeUrunler.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-slate-400 text-sm border-b border-slate-700">
                    <th className="text-left py-3 px-2">Ürün Adı</th>
                    <th className="text-left py-3 px-2">Ebat</th>
                    <th className="text-left py-3 px-2">Renk</th>
                    <th className="text-center py-3 px-2">Birim</th>
                    <th className="text-right py-3 px-2">Birim Fiyat</th>
                    <th className="text-center py-3 px-2">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {parkeUrunler.map((urun) => (
                    <tr key={urun.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-3 px-2">
                        <span className="text-white font-medium">{urun.urun_adi}</span>
                        {urun.aciklama && (
                          <p className="text-slate-500 text-xs mt-0.5">{urun.aciklama}</p>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-slate-300">{urun.ebat || '-'}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-slate-300">{urun.renk || '-'}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">{urun.birim}</span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="text-orange-500 font-medium">{formatCurrency(urun.birim_fiyat)}</span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openParkeModal(urun)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleParkeDelete(urun.id)}
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
              Henüz Parke ürünü tanımlanmamış.
              <button
                onClick={() => openParkeModal()}
                className="block mx-auto mt-2 text-orange-500 hover:text-orange-400"
              >
                İlk Parke ürününüzü ekleyin
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
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingMusteri ? 'Güncelle' : 'Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BIMS Ürün Modal */}
      {showBimsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-500" />
                {editingBims ? 'BIMS Ürün Düzenle' : 'Yeni BIMS Ürün'}
              </h3>
              <button
                onClick={() => { setShowBimsModal(false); resetBimsForm(); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleBimsSubmit} className="p-4 space-y-4">
              <div>
                <Label className="text-slate-300">Ürün Adı *</Label>
                <Input
                  value={bimsForm.urun_adi}
                  onChange={(e) => setBimsForm(prev => ({ ...prev, urun_adi: e.target.value }))}
                  placeholder="BIMS ürün adı"
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Birim</Label>
                  <select
                    value={bimsForm.birim}
                    onChange={(e) => setBimsForm(prev => ({ ...prev, birim: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                  >
                    <option value="adet">Adet</option>
                    <option value="kg">Kg</option>
                    <option value="ton">Ton</option>
                    <option value="m2">m²</option>
                    <option value="m3">m³</option>
                    <option value="metre">Metre</option>
                    <option value="paket">Paket</option>
                  </select>
                </div>
                <div>
                  <Label className="text-slate-300">Birim Fiyat (₺)</Label>
                  <Input
                    type="number"
                    value={bimsForm.birim_fiyat}
                    onChange={(e) => setBimsForm(prev => ({ ...prev, birim_fiyat: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-slate-300">Açıklama</Label>
                <textarea
                  value={bimsForm.aciklama}
                  onChange={(e) => setBimsForm(prev => ({ ...prev, aciklama: e.target.value }))}
                  placeholder="Ürün açıklaması..."
                  rows={2}
                  className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => { setShowBimsModal(false); resetBimsForm(); }}
                  className="bg-slate-700 hover:bg-slate-600"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  className="bg-teal-500 hover:bg-teal-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingBims ? 'Güncelle' : 'Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Parke Ürün Modal */}
      {showParkeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-orange-500" />
                {editingParke ? 'Parke Ürün Düzenle' : 'Yeni Parke Ürün'}
              </h3>
              <button
                onClick={() => { setShowParkeModal(false); resetParkeForm(); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleParkeSubmit} className="p-4 space-y-4">
              <div>
                <Label className="text-slate-300">Ürün Adı *</Label>
                <Input
                  value={parkeForm.urun_adi}
                  onChange={(e) => setParkeForm(prev => ({ ...prev, urun_adi: e.target.value }))}
                  placeholder="Parke ürün adı"
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Ebat</Label>
                  <Input
                    value={parkeForm.ebat}
                    onChange={(e) => setParkeForm(prev => ({ ...prev, ebat: e.target.value }))}
                    placeholder="Örn: 40x40"
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Renk</Label>
                  <Input
                    value={parkeForm.renk}
                    onChange={(e) => setParkeForm(prev => ({ ...prev, renk: e.target.value }))}
                    placeholder="Örn: Gri"
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Birim</Label>
                  <select
                    value={parkeForm.birim}
                    onChange={(e) => setParkeForm(prev => ({ ...prev, birim: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                  >
                    <option value="m²">m²</option>
                    <option value="adet">Adet</option>
                    <option value="paket">Paket</option>
                  </select>
                </div>
                <div>
                  <Label className="text-slate-300">Birim Fiyat (₺)</Label>
                  <Input
                    type="number"
                    value={parkeForm.birim_fiyat}
                    onChange={(e) => setParkeForm(prev => ({ ...prev, birim_fiyat: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-slate-300">Açıklama</Label>
                <textarea
                  value={parkeForm.aciklama}
                  onChange={(e) => setParkeForm(prev => ({ ...prev, aciklama: e.target.value }))}
                  placeholder="Ürün açıklaması..."
                  rows={2}
                  className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => { setShowParkeModal(false); resetParkeForm(); }}
                  className="bg-slate-700 hover:bg-slate-600"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingParke ? 'Güncelle' : 'Kaydet'}
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
