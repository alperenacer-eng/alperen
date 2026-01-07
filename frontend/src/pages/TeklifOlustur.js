import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Save,
  Plus,
  Trash2,
  ArrowLeft,
  Calculator,
  Search,
  Package,
  Grid3X3
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TeklifOlustur = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);

  // Sekme durumu - URL'den veya varsayılan
  const initialTuru = searchParams.get('turu') || 'bims';
  const [teklifTuru, setTeklifTuru] = useState(initialTuru);

  const [musteriler, setMusteriler] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [showMusteriSelect, setShowMusteriSelect] = useState(false);
  const [showUrunSelect, setShowUrunSelect] = useState(null); // Hangi kalem için ürün seçiliyor
  const [musteriSearch, setMusteriSearch] = useState('');
  const [urunSearch, setUrunSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    teklif_turu: initialTuru,
    musteri_id: '',
    musteri_adi: '',
    musteri_adres: '',
    musteri_vergi_no: '',
    musteri_vergi_dairesi: '',
    teklif_tarihi: new Date().toISOString().split('T')[0],
    gecerlilik_tarihi: '',
    konu: '',
    kalemler: [{
      urun_hizmet: '',
      aciklama: '',
      miktar: 1,
      birim: 'adet',
      birim_fiyat: 0,
      kdv_orani: 20,
      iskonto_orani: 0,
      toplam: 0
    }],
    ara_toplam: 0,
    toplam_iskonto: 0,
    toplam_kdv: 0,
    genel_toplam: 0,
    para_birimi: 'TRY',
    odeme_kosullari: '',
    teslim_suresi: '',
    notlar: '',
    durum: 'taslak'
  });

  useEffect(() => {
    fetchMusteriler();
    fetchUrunler();
    if (isEdit) {
      fetchTeklif();
    }
  }, [id]);

  useEffect(() => {
    // Teklif türü değiştiğinde ürünleri yeniden yükle
    fetchUrunler();
    setFormData(prev => ({ ...prev, teklif_turu: teklifTuru }));
  }, [teklifTuru]);

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
    }
  };

  const fetchUrunler = async () => {
    try {
      const endpoint = teklifTuru === 'bims' ? 'bims-urunler' : 'parke-urunler';
      const response = await fetch(`${API_URL}/api/${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUrunler(data);
      }
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error);
    }
  };

  const fetchTeklif = async () => {
    try {
      const response = await fetch(`${API_URL}/api/teklifler/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFormData(data);
        setTeklifTuru(data.teklif_turu || 'bims');
      }
    } catch (error) {
      console.error('Teklif yüklenirken hata:', error);
      toast.error('Teklif yüklenirken hata oluştu');
    }
  };

  const selectMusteri = (musteri) => {
    setFormData(prev => ({
      ...prev,
      musteri_id: musteri.id,
      musteri_adi: musteri.firma_adi,
      musteri_adres: musteri.adres || '',
      musteri_vergi_no: musteri.vergi_no || '',
      musteri_vergi_dairesi: musteri.vergi_dairesi || ''
    }));
    setShowMusteriSelect(false);
    setMusteriSearch('');
  };

  const selectUrun = (index, urun) => {
    setFormData(prev => {
      const newKalemler = [...prev.kalemler];
      newKalemler[index] = {
        ...newKalemler[index],
        urun_hizmet: urun.urun_adi,
        aciklama: urun.aciklama || (urun.ebat ? `${urun.ebat} ${urun.renk || ''}`.trim() : ''),
        birim: urun.birim,
        birim_fiyat: urun.birim_fiyat
      };
      
      // Toplam hesapla
      const kalem = newKalemler[index];
      const subtotal = kalem.miktar * kalem.birim_fiyat;
      const iskonto = subtotal * (kalem.iskonto_orani / 100);
      const afterIskonto = subtotal - iskonto;
      const kdv = afterIskonto * (kalem.kdv_orani / 100);
      newKalemler[index].toplam = afterIskonto + kdv;
      
      return { ...prev, kalemler: newKalemler };
    });
    setShowUrunSelect(null);
    setUrunSearch('');
    setTimeout(calculateTotals, 0);
  };

  const addKalem = () => {
    setFormData(prev => ({
      ...prev,
      kalemler: [...prev.kalemler, {
        urun_hizmet: '',
        aciklama: '',
        miktar: 1,
        birim: teklifTuru === 'parke' ? 'm²' : 'adet',
        birim_fiyat: 0,
        kdv_orani: 20,
        iskonto_orani: 0,
        toplam: 0
      }]
    }));
  };

  const removeKalem = (index) => {
    if (formData.kalemler.length === 1) {
      toast.error('En az bir kalem olmalıdır');
      return;
    }
    setFormData(prev => ({
      ...prev,
      kalemler: prev.kalemler.filter((_, i) => i !== index)
    }));
    setTimeout(calculateTotals, 0);
  };

  const updateKalem = (index, field, value) => {
    setFormData(prev => {
      const newKalemler = [...prev.kalemler];
      newKalemler[index] = { ...newKalemler[index], [field]: value };
      
      // Kalem toplamını hesapla
      const kalem = newKalemler[index];
      const subtotal = kalem.miktar * kalem.birim_fiyat;
      const iskonto = subtotal * (kalem.iskonto_orani / 100);
      const afterIskonto = subtotal - iskonto;
      const kdv = afterIskonto * (kalem.kdv_orani / 100);
      newKalemler[index].toplam = afterIskonto + kdv;
      
      return { ...prev, kalemler: newKalemler };
    });
    setTimeout(calculateTotals, 0);
  };

  const calculateTotals = () => {
    setFormData(prev => {
      let ara_toplam = 0;
      let toplam_iskonto = 0;
      let toplam_kdv = 0;
      
      prev.kalemler.forEach(kalem => {
        const subtotal = kalem.miktar * kalem.birim_fiyat;
        const iskonto = subtotal * (kalem.iskonto_orani / 100);
        const afterIskonto = subtotal - iskonto;
        const kdv = afterIskonto * (kalem.kdv_orani / 100);
        
        ara_toplam += subtotal;
        toplam_iskonto += iskonto;
        toplam_kdv += kdv;
      });
      
      const genel_toplam = ara_toplam - toplam_iskonto + toplam_kdv;
      
      return {
        ...prev,
        ara_toplam: Math.round(ara_toplam * 100) / 100,
        toplam_iskonto: Math.round(toplam_iskonto * 100) / 100,
        toplam_kdv: Math.round(toplam_kdv * 100) / 100,
        genel_toplam: Math.round(genel_toplam * 100) / 100
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.musteri_adi) {
      toast.error('Müşteri seçiniz');
      return;
    }
    
    if (!formData.kalemler.some(k => k.urun_hizmet)) {
      toast.error('En az bir kalem giriniz');
      return;
    }
    
    setLoading(true);
    try {
      const url = isEdit ? `${API_URL}/api/teklifler/${id}` : `${API_URL}/api/teklifler`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...formData, teklif_turu: teklifTuru })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(isEdit ? 'Teklif güncellendi' : `Teklif oluşturuldu: ${data.teklif_no}`);
        navigate('/teklif-liste');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'İşlem başarısız');
      }
    } catch (error) {
      console.error('Kayıt hatası:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);
  };

  const filteredMusteriler = musteriler.filter(m =>
    m.firma_adi.toLowerCase().includes(musteriSearch.toLowerCase())
  );

  const filteredUrunler = urunler.filter(u =>
    u.urun_adi.toLowerCase().includes(urunSearch.toLowerCase())
  );

  // Sekme değiştiğinde formu sıfırla (sadece yeni teklif için)
  const handleTuruChange = (yeniTuru) => {
    if (!isEdit && teklifTuru !== yeniTuru) {
      setTeklifTuru(yeniTuru);
      setFormData(prev => ({
        ...prev,
        teklif_turu: yeniTuru,
        kalemler: [{
          urun_hizmet: '',
          aciklama: '',
          miktar: 1,
          birim: yeniTuru === 'parke' ? 'm²' : 'adet',
          birim_fiyat: 0,
          kdv_orani: 20,
          iskonto_orani: 0,
          toplam: 0
        }],
        ara_toplam: 0,
        toplam_iskonto: 0,
        toplam_kdv: 0,
        genel_toplam: 0
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEdit ? 'Teklif Düzenle' : 'Yeni Teklif Oluştur'}
          </h1>
          <p className="text-slate-400 text-sm">Teklif bilgilerini doldurun</p>
        </div>
      </div>

      {/* BIMS / Parke Sekmeleri */}
      {!isEdit && (
        <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => handleTuruChange('bims')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              teklifTuru === 'bims'
                ? 'bg-teal-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Package className="w-5 h-5" />
            BIMS Teklif
          </button>
          <button
            type="button"
            onClick={() => handleTuruChange('parke')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              teklifTuru === 'parke'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Grid3X3 className="w-5 h-5" />
            Parke Teklif
          </button>
        </div>
      )}

      {/* Edit modunda teklif türünü göster */}
      {isEdit && (
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
          teklifTuru === 'bims' ? 'bg-teal-500/20 text-teal-400' : 'bg-orange-500/20 text-orange-400'
        }`}>
          {teklifTuru === 'bims' ? <Package className="w-5 h-5" /> : <Grid3X3 className="w-5 h-5" />}
          <span className="font-medium">{teklifTuru === 'bims' ? 'BIMS Teklif' : 'Parke Teklif'}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Müşteri Bilgileri */}
        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <h3 className="text-lg font-semibold text-white mb-4">Müşteri Bilgileri</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Label className="text-slate-300">Müşteri *</Label>
              <div
                onClick={() => setShowMusteriSelect(true)}
                className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white cursor-pointer flex items-center justify-between"
              >
                <span>{formData.musteri_adi || 'Müşteri seçin...'}</span>
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              
              {showMusteriSelect && (
                <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-auto">
                  <div className="p-2 border-b border-slate-700">
                    <Input
                      placeholder="Müşteri ara..."
                      value={musteriSearch}
                      onChange={(e) => setMusteriSearch(e.target.value)}
                      className="bg-slate-700 border-slate-600"
                      autoFocus
                    />
                  </div>
                  {filteredMusteriler.length > 0 ? (
                    filteredMusteriler.map(musteri => (
                      <div
                        key={musteri.id}
                        onClick={() => selectMusteri(musteri)}
                        className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50"
                      >
                        <div className="text-white font-medium">{musteri.firma_adi}</div>
                        <div className="text-slate-400 text-sm">{musteri.yetkili_kisi}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-slate-400 text-center">Müşteri bulunamadı</div>
                  )}
                  <div
                    onClick={() => {
                      setShowMusteriSelect(false);
                      navigate('/teklif-kaynaklar');
                    }}
                    className="p-3 hover:bg-slate-700 cursor-pointer text-teal-500 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Yeni Müşteri Ekle
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label className="text-slate-300">Konu</Label>
              <Input
                value={formData.konu}
                onChange={(e) => setFormData(prev => ({ ...prev, konu: e.target.value }))}
                placeholder="Teklif konusu"
                className="mt-1 bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">Teklif Tarihi *</Label>
              <Input
                type="date"
                value={formData.teklif_tarihi}
                onChange={(e) => setFormData(prev => ({ ...prev, teklif_tarihi: e.target.value }))}
                className="mt-1 bg-slate-800 border-slate-700 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-slate-300">Geçerlilik Tarihi</Label>
              <Input
                type="date"
                value={formData.gecerlilik_tarihi}
                onChange={(e) => setFormData(prev => ({ ...prev, gecerlilik_tarihi: e.target.value }))}
                className="mt-1 bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
        </div>

        {/* Teklif Kalemleri */}
        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Teklif Kalemleri</h3>
            <Button
              type="button"
              onClick={addKalem}
              className={teklifTuru === 'bims' ? 'bg-teal-500 hover:bg-teal-600' : 'bg-orange-500 hover:bg-orange-600'}
            >
              <Plus className="w-4 h-4 mr-2" /> Kalem Ekle
            </Button>
          </div>

          <div className="space-y-4">
            {formData.kalemler.map((kalem, index) => (
              <div key={index} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="md:col-span-2 relative">
                    <Label className="text-slate-400 text-xs">Ürün/Hizmet *</Label>
                    <div
                      onClick={() => setShowUrunSelect(index)}
                      className="mt-1 w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white cursor-pointer flex items-center justify-between"
                    >
                      <span className={kalem.urun_hizmet ? 'text-white' : 'text-slate-400'}>
                        {kalem.urun_hizmet || 'Ürün seçin veya yazın...'}
                      </span>
                      <Search className="w-4 h-4 text-slate-400" />
                    </div>
                    
                    {showUrunSelect === index && (
                      <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-auto">
                        <div className="p-2 border-b border-slate-700">
                          <Input
                            placeholder="Ürün ara veya yeni girin..."
                            value={urunSearch}
                            onChange={(e) => {
                              setUrunSearch(e.target.value);
                              updateKalem(index, 'urun_hizmet', e.target.value);
                            }}
                            className="bg-slate-700 border-slate-600"
                            autoFocus
                          />
                        </div>
                        {filteredUrunler.length > 0 ? (
                          filteredUrunler.map(urun => (
                            <div
                              key={urun.id}
                              onClick={() => selectUrun(index, urun)}
                              className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50"
                            >
                              <div className="text-white font-medium">{urun.urun_adi}</div>
                              <div className="text-slate-400 text-sm flex justify-between">
                                <span>{urun.birim}</span>
                                <span>{formatCurrency(urun.birim_fiyat)}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-slate-400 text-center">
                            {urunSearch ? 'Ürün bulunamadı - manuel giriş yapabilirsiniz' : 'Ürün listesi boş'}
                          </div>
                        )}
                        <div
                          onClick={() => {
                            setShowUrunSelect(null);
                            setUrunSearch('');
                          }}
                          className="p-3 hover:bg-slate-700 cursor-pointer text-slate-400 text-center"
                        >
                          Kapat
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-slate-400 text-xs">Miktar</Label>
                    <Input
                      type="number"
                      value={kalem.miktar}
                      onChange={(e) => updateKalem(index, 'miktar', parseFloat(e.target.value) || 0)}
                      className="mt-1 bg-slate-700 border-slate-600 text-white"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-slate-400 text-xs">Birim</Label>
                    <select
                      value={kalem.birim}
                      onChange={(e) => updateKalem(index, 'birim', e.target.value)}
                      className="mt-1 w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
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
                    </select>
                  </div>
                  
                  <div>
                    <Label className="text-slate-400 text-xs">Birim Fiyat</Label>
                    <Input
                      type="number"
                      value={kalem.birim_fiyat}
                      onChange={(e) => updateKalem(index, 'birim_fiyat', parseFloat(e.target.value) || 0)}
                      className="mt-1 bg-slate-700 border-slate-600 text-white"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeKalem(index)}
                      className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
                  <div>
                    <Label className="text-slate-400 text-xs">Açıklama</Label>
                    <Input
                      value={kalem.aciklama}
                      onChange={(e) => updateKalem(index, 'aciklama', e.target.value)}
                      placeholder="Açıklama"
                      className="mt-1 bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-slate-400 text-xs">KDV %</Label>
                    <select
                      value={kalem.kdv_orani}
                      onChange={(e) => updateKalem(index, 'kdv_orani', parseFloat(e.target.value))}
                      className="mt-1 w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                    >
                      <option value="0">%0</option>
                      <option value="1">%1</option>
                      <option value="10">%10</option>
                      <option value="20">%20</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label className="text-slate-400 text-xs">İskonto %</Label>
                    <Input
                      type="number"
                      value={kalem.iskonto_orani}
                      onChange={(e) => updateKalem(index, 'iskonto_orani', parseFloat(e.target.value) || 0)}
                      className="mt-1 bg-slate-700 border-slate-600 text-white"
                      min="0"
                      max="100"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-slate-400 text-xs">Toplam</Label>
                    <div className={`mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md font-semibold ${
                      teklifTuru === 'bims' ? 'text-teal-500' : 'text-orange-500'
                    }`}>
                      {formatCurrency(kalem.toplam)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Toplamlar */}
        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className={`w-5 h-5 ${teklifTuru === 'bims' ? 'text-teal-500' : 'text-orange-500'}`} />
            <h3 className="text-lg font-semibold text-white">Toplamlar</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Ödeme Koşulları</Label>
                <Input
                  value={formData.odeme_kosullari}
                  onChange={(e) => setFormData(prev => ({ ...prev, odeme_kosullari: e.target.value }))}
                  placeholder="Örn: %50 peşin, %50 teslimatta"
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                />
              </div>
              
              <div>
                <Label className="text-slate-300">Teslim Süresi</Label>
                <Input
                  value={formData.teslim_suresi}
                  onChange={(e) => setFormData(prev => ({ ...prev, teslim_suresi: e.target.value }))}
                  placeholder="Örn: 15 iş günü"
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                />
              </div>
              
              <div>
                <Label className="text-slate-300">Notlar</Label>
                <textarea
                  value={formData.notlar}
                  onChange={(e) => setFormData(prev => ({ ...prev, notlar: e.target.value }))}
                  placeholder="Ek notlar..."
                  rows={3}
                  className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                />
              </div>
            </div>
            
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-slate-400">
                <span>Ara Toplam</span>
                <span>{formatCurrency(formData.ara_toplam)}</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>Toplam İskonto</span>
                <span>-{formatCurrency(formData.toplam_iskonto)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Toplam KDV</span>
                <span>{formatCurrency(formData.toplam_kdv)}</span>
              </div>
              <div className="border-t border-slate-700 pt-3">
                <div className="flex justify-between text-xl font-bold">
                  <span className="text-white">Genel Toplam</span>
                  <span className={teklifTuru === 'bims' ? 'text-teal-500' : 'text-orange-500'}>
                    {formatCurrency(formData.genel_toplam)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kaydet */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            onClick={() => navigate(-1)}
            className="bg-slate-700 hover:bg-slate-600"
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className={teklifTuru === 'bims' ? 'bg-teal-500 hover:bg-teal-600' : 'bg-orange-500 hover:bg-orange-600'}
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Kaydediliyor...' : (isEdit ? 'Güncelle' : 'Kaydet')}
          </Button>
        </div>
      </form>

      {/* Müşteri seçim overlay kapatma */}
      {showMusteriSelect && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMusteriSelect(false)}
        />
      )}
      
      {/* Ürün seçim overlay kapatma */}
      {showUrunSelect !== null && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowUrunSelect(null);
            setUrunSearch('');
          }}
        />
      )}
    </div>
  );
};

export default TeklifOlustur;
