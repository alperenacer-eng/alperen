import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Fuel } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MotorinAlim = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tedarikciler, setTedarikciler] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    tarih: new Date().toISOString().split('T')[0],
    tedarikci_id: '',
    tedarikci_adi: '',
    miktar_litre: '',
    birim_fiyat: '',
    toplam_tutar: '',
    fatura_no: '',
    irsaliye_no: '',
    odeme_durumu: 'beklemede',
    vade_tarihi: '',
    notlar: ''
  });

  useEffect(() => {
    fetchTedarikciler();
  }, []);

  useEffect(() => {
    // Otomatik toplam hesaplama
    const miktar = parseFloat(formData.miktar_litre) || 0;
    const birim = parseFloat(formData.birim_fiyat) || 0;
    setFormData(prev => ({
      ...prev,
      toplam_tutar: (miktar * birim).toFixed(2)
    }));
  }, [formData.miktar_litre, formData.birim_fiyat]);

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

  const handleTedarikciChange = (e) => {
    const tedarikciId = e.target.value;
    const tedarikci = tedarikciler.find(t => t.id === tedarikciId);
    setFormData({
      ...formData,
      tedarikci_id: tedarikciId,
      tedarikci_adi: tedarikci ? tedarikci.name : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.tarih || !formData.miktar_litre || !formData.birim_fiyat) {
      toast.error('Tarih, miktar ve birim fiyat zorunludur');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        miktar_litre: parseFloat(formData.miktar_litre),
        birim_fiyat: parseFloat(formData.birim_fiyat),
        toplam_tutar: parseFloat(formData.toplam_tutar)
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

      <form onSubmit={handleSubmit} className="glass-effect rounded-xl border border-slate-800 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <Label className="text-slate-300">Tedarikçi</Label>
            <select
              value={formData.tedarikci_id}
              onChange={handleTedarikciChange}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1"
            >
              <option value="">Tedarikçi Seçin</option>
              {tedarikciler.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Miktar */}
          <div>
            <Label className="text-slate-300">Miktar (Litre) *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.miktar_litre}
              onChange={(e) => setFormData({ ...formData, miktar_litre: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white mt-1"
              placeholder="Örn: 1000"
              required
            />
          </div>

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
              className="bg-slate-800 border-slate-700 text-white mt-1 font-semibold"
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

          {/* Vade Tarihi */}
          {formData.odeme_durumu === 'vadeli' && (
            <div>
              <Label className="text-slate-300">Vade Tarihi</Label>
              <Input
                type="date"
                value={formData.vade_tarihi}
                onChange={(e) => setFormData({ ...formData, vade_tarihi: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
          )}

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

        {/* Özet Kartı */}
        {formData.miktar_litre && formData.birim_fiyat && (
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <h3 className="text-green-400 font-semibold mb-2">Alım Özeti</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{parseFloat(formData.miktar_litre).toLocaleString('tr-TR')} L</p>
                <p className="text-xs text-slate-400">Miktar</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">₺{parseFloat(formData.birim_fiyat).toFixed(2)}</p>
                <p className="text-xs text-slate-400">Birim Fiyat</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">₺{parseFloat(formData.toplam_tutar).toLocaleString('tr-TR')}</p>
                <p className="text-xs text-slate-400">Toplam</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
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
    </div>
  );
};

export default MotorinAlim;
