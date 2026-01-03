import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, ArrowLeft } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const CimentoEntry = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Kaynak verileri
  const [cimentoFirmalar, setCimentoFirmalar] = useState([]);
  const [nakliyeciFirmalar, setNakliyeciFirmalar] = useState([]);
  const [plakalar, setPlakalar] = useState([]);
  const [soforler, setSoforler] = useState([]);
  const [sehirler, setSehirler] = useState([]);

  const [formData, setFormData] = useState({
    tarih: new Date().toISOString().split('T')[0],
    cimento_firma_id: '',
    cimento_firma_name: '',
    nakliyeci_firma_id: '',
    nakliyeci_firma_name: '',
    plaka_id: '',
    plaka: '',
    sofor_id: '',
    sofor_name: '',
    sehir_id: '',
    sehir_name: '',
    miktar: '',
    birim: 'ton',
    fiyat: '',
    notes: ''
  });

  useEffect(() => {
    if (!currentModule || currentModule.id !== 'cimento') {
      navigate('/');
      return;
    }
    fetchResources();
  }, [currentModule]);

  const fetchResources = async () => {
    try {
      const [cimentoRes, nakliyeciRes, plakaRes, soforRes, sehirRes] = await Promise.all([
        axios.get(`${API_URL}/cimento-firmalar`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/nakliyeci-firmalar`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/plakalar`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/soforler`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/sehirler`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setCimentoFirmalar(cimentoRes.data);
      setNakliyeciFirmalar(nakliyeciRes.data);
      setPlakalar(plakaRes.data);
      setSoforler(soforRes.data);
      setSehirler(sehirRes.data);
    } catch (error) {
      toast.error('Kaynaklar yüklenemedi');
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // İlişkili isimleri de güncelle
      if (field === 'cimento_firma_id') {
        const firma = cimentoFirmalar.find(f => f.id === value);
        updated.cimento_firma_name = firma?.name || '';
      }
      if (field === 'nakliyeci_firma_id') {
        const firma = nakliyeciFirmalar.find(f => f.id === value);
        updated.nakliyeci_firma_name = firma?.name || '';
      }
      if (field === 'plaka_id') {
        const p = plakalar.find(p => p.id === value);
        updated.plaka = p?.plaka || '';
      }
      if (field === 'sofor_id') {
        const s = soforler.find(s => s.id === value);
        updated.sofor_name = s?.name || '';
      }
      if (field === 'sehir_id') {
        const s = sehirler.find(s => s.id === value);
        updated.sehir_name = s?.name || '';
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.cimento_firma_id || !formData.miktar) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/cimento-records`, {
        ...formData,
        miktar: parseFloat(formData.miktar),
        fiyat: formData.fiyat ? parseFloat(formData.fiyat) : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Çimento kaydı oluşturuldu');
      navigate('/cimento-list');
    } catch (error) {
      toast.error('Kayıt oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Geri
        </button>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Çimento Girişi</h1>
        <p className="text-slate-400">Yeni çimento kaydı oluşturun</p>
      </div>

      <div className="glass-effect rounded-xl p-6 md:p-8 border border-slate-800">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Tarih */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Tarih *</Label>
              <Input
                type="date"
                value={formData.tarih}
                onChange={(e) => handleChange('tarih', e.target.value)}
                required
                className="h-12 bg-slate-950 border-slate-800 text-white"
              />
            </div>
          </div>

          {/* Çimento Firma */}
          <div className="space-y-2">
            <Label>Çimento Alınan Firma *</Label>
            <Select value={formData.cimento_firma_id} onValueChange={(value) => handleChange('cimento_firma_id', value)}>
              <SelectTrigger className="h-12 bg-slate-950 border-slate-800 text-white">
                <SelectValue placeholder="Firma seçin" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-white">
                {cimentoFirmalar.map((firma) => (
                  <SelectItem key={firma.id} value={firma.id}>{firma.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nakliyeci ve Plaka */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Nakliyeci Firma</Label>
              <Select value={formData.nakliyeci_firma_id} onValueChange={(value) => handleChange('nakliyeci_firma_id', value)}>
                <SelectTrigger className="h-12 bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="Nakliyeci seçin" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {nakliyeciFirmalar.map((firma) => (
                    <SelectItem key={firma.id} value={firma.id}>{firma.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Plaka</Label>
              <Select value={formData.plaka_id} onValueChange={(value) => handleChange('plaka_id', value)}>
                <SelectTrigger className="h-12 bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="Plaka seçin" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {plakalar.map((plaka) => (
                    <SelectItem key={plaka.id} value={plaka.id}>{plaka.plaka}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Şoför ve Şehir */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Şoför</Label>
              <Select value={formData.sofor_id} onValueChange={(value) => handleChange('sofor_id', value)}>
                <SelectTrigger className="h-12 bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="Şoför seçin" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {soforler.map((sofor) => (
                    <SelectItem key={sofor.id} value={sofor.id}>{sofor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Şehir</Label>
              <Select value={formData.sehir_id} onValueChange={(value) => handleChange('sehir_id', value)}>
                <SelectTrigger className="h-12 bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="Şehir seçin" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {sehirler.map((sehir) => (
                    <SelectItem key={sehir.id} value={sehir.id}>{sehir.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Miktar ve Fiyat */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Miktar *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.miktar}
                onChange={(e) => handleChange('miktar', e.target.value)}
                placeholder="0"
                required
                className="h-12 bg-slate-950 border-slate-800 text-white font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>Birim</Label>
              <Select value={formData.birim} onValueChange={(value) => handleChange('birim', value)}>
                <SelectTrigger className="h-12 bg-slate-950 border-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="ton">Ton</SelectItem>
                  <SelectItem value="kg">Kilogram</SelectItem>
                  <SelectItem value="torba">Torba</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fiyat (₺)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.fiyat}
                onChange={(e) => handleChange('fiyat', e.target.value)}
                placeholder="0.00"
                className="h-12 bg-slate-950 border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          {/* Notlar */}
          <div className="space-y-2">
            <Label>Notlar</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Ek bilgi veya notlar..."
              rows={3}
              className="bg-slate-950 border-slate-800 text-white resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              onClick={() => navigate(-1)}
              variant="outline"
              className="flex-1 h-12 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow-lg shadow-blue-500/20"
            >
              <Save className="w-5 h-5 mr-2" />
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CimentoEntry;
