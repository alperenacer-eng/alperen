import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Truck } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MotorinVerme = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [araclar, setAraclar] = useState([]);
  const [personeller, setPersoneller] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    tarih: new Date().toISOString().split('T')[0],
    arac_id: '',
    arac_plaka: '',
    arac_bilgi: '',
    miktar_litre: '',
    kilometre: '',
    sofor_id: '',
    sofor_adi: '',
    personel_id: '',
    personel_adi: '',
    notlar: ''
  });

  useEffect(() => {
    fetchAraclar();
    fetchPersoneller();
  }, []);

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

  const fetchPersoneller = async () => {
    try {
      const res = await axios.get(`${API_URL}/personel`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPersoneller(res.data);
    } catch (error) {
      console.log('Personeller yüklenemedi');
    }
  };

  const handleAracChange = (e) => {
    const aracId = e.target.value;
    const arac = araclar.find(a => a.id === aracId);
    setFormData({
      ...formData,
      arac_id: aracId,
      arac_plaka: arac ? arac.plaka : '',
      arac_bilgi: arac ? `${arac.marka || ''} ${arac.model || ''} - ${arac.arac_cinsi || ''}`.trim() : ''
    });
  };

  const handlePersonelChange = (e) => {
    const personelId = e.target.value;
    const personel = personeller.find(p => p.id === personelId);
    setFormData({
      ...formData,
      personel_id: personelId,
      personel_adi: personel ? `${personel.ad} ${personel.soyad}` : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.tarih || !formData.arac_id || !formData.miktar_litre) {
      toast.error('Tarih, araç ve miktar zorunludur');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        miktar_litre: parseFloat(formData.miktar_litre),
        kilometre: formData.kilometre ? parseFloat(formData.kilometre) : 0
      };

      await axios.post(`${API_URL}/motorin-verme`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Motorin verme kaydı oluşturuldu');
      navigate('/motorin-liste');
    } catch (error) {
      toast.error('Kayıt oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" data-testid="motorin-verme-page">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Araçlara Motorin Verme</h1>
            <p className="text-slate-400">Araca motorin verin ve kaydedin</p>
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

          {/* Araç */}
          <div>
            <Label className="text-slate-300">Araç *</Label>
            <select
              value={formData.arac_id}
              onChange={handleAracChange}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1"
              required
            >
              <option value="">Araç Seçin</option>
              {araclar.map(a => (
                <option key={a.id} value={a.id}>
                  {a.plaka} - {a.marka} {a.model} ({a.arac_cinsi})
                </option>
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
              placeholder="Örn: 50"
              required
            />
          </div>

          {/* Kilometre */}
          <div>
            <Label className="text-slate-300">Kilometre</Label>
            <Input
              type="number"
              value={formData.kilometre}
              onChange={(e) => setFormData({ ...formData, kilometre: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white mt-1"
              placeholder="Araç kilometresi"
            />
          </div>

          {/* Personel/Şoför */}
          <div>
            <Label className="text-slate-300">Personel / Şoför</Label>
            <select
              value={formData.personel_id}
              onChange={handlePersonelChange}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1"
            >
              <option value="">Personel Seçin</option>
              {personeller.map(p => (
                <option key={p.id} value={p.id}>
                  {p.ad} {p.soyad}
                </option>
              ))}
            </select>
          </div>

          {/* Manuel Şoför Adı */}
          <div>
            <Label className="text-slate-300">Şoför Adı (Manuel)</Label>
            <Input
              type="text"
              value={formData.sofor_adi}
              onChange={(e) => setFormData({ ...formData, sofor_adi: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white mt-1"
              placeholder="Listede yoksa manuel girin"
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

        {/* Seçili Araç Bilgisi */}
        {formData.arac_id && (
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="text-blue-400 font-semibold mb-2">Seçili Araç</h3>
            <p className="text-white font-medium">{formData.arac_plaka}</p>
            <p className="text-slate-400 text-sm">{formData.arac_bilgi}</p>
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
            className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MotorinVerme;
