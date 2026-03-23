import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Trash2, ArrowLeft, Clock, Calendar, Users, Save, 
  CheckCircle2, XCircle, AlertCircle, FileText 
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Puantaj = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  
  const [puantajlar, setPuantajlar] = useState([]);
  const [personeller, setPersoneller] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Üst form bilgileri
  const [formData, setFormData] = useState({
    tarih: new Date().toISOString().split('T')[0],
    durum: 'geldi',
    giris_saati: '08:00',
    cikis_saati: '17:00',
    fazla_mesai: '0',
    notlar: ''
  });
  
  // Personel seçimleri
  const [seciliPersoneller, setSeciliPersoneller] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchPuantajlar = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/puantaj`, { headers });
      setPuantajlar(response.data);
    } catch (e) {
      console.error(e);
      toast.error('Puantaj kayıtları yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchPersoneller = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/personeller`, { headers });
      const aktifPersoneller = response.data.filter(p => p.aktif);
      setPersoneller(aktifPersoneller);
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  useEffect(() => {
    if (!currentModule || currentModule.id !== 'personel') {
      navigate('/');
      return;
    }
    fetchPuantajlar();
    fetchPersoneller();
  }, [currentModule, fetchPuantajlar, fetchPersoneller, navigate]);

  // O gün için puantajı olmayan personelleri filtrele
  const filteredPuantajlar = puantajlar.filter(p => p.tarih === formData.tarih);
  const kayitliPersonelIds = filteredPuantajlar.map(p => p.personel_id);
  const kayitSizPersoneller = personeller.filter(p => !kayitliPersonelIds.includes(p.id));

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSeciliPersoneller(kayitSizPersoneller.map(p => p.id));
    } else {
      setSeciliPersoneller([]);
    }
  };

  const handlePersonelSelect = (personelId, checked) => {
    if (checked) {
      setSeciliPersoneller(prev => [...prev, personelId]);
    } else {
      setSeciliPersoneller(prev => prev.filter(id => id !== personelId));
      setSelectAll(false);
    }
  };

  useEffect(() => {
    if (kayitSizPersoneller.length > 0 && seciliPersoneller.length === kayitSizPersoneller.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [seciliPersoneller, kayitSizPersoneller]);

  useEffect(() => {
    setSeciliPersoneller([]);
    setSelectAll(false);
  }, [formData.tarih]);

  const handleTopluKaydet = async () => {
    if (seciliPersoneller.length === 0) {
      toast.error('Lütfen en az bir personel seçin');
      return;
    }

    setSaving(true);
    try {
      const fazlaMesai = parseFloat(formData.fazla_mesai) || 0;
      
      const kayitlar = seciliPersoneller.map(personelId => {
        const personel = personeller.find(p => p.id === personelId);
        return {
          personel_id: personelId,
          personel_adi: personel?.ad_soyad || '',
          giris_saati: formData.durum === 'geldi' ? formData.giris_saati : '',
          cikis_saati: formData.durum === 'geldi' ? formData.cikis_saati : '',
          durum: formData.durum,
          notlar: formData.notlar,
          mesai_suresi: 0,
          fazla_mesai: fazlaMesai
        };
      });

      const payload = {
        tarih: formData.tarih,
        kayitlar
      };

      await axios.post(`${API_URL}/puantaj/toplu`, payload, { headers });
      toast.success(`${seciliPersoneller.length} personel için puantaj kaydedildi`);
      
      await fetchPuantajlar();
      setSeciliPersoneller([]);
      setSelectAll(false);
    } catch (e) {
      console.error(e);
      toast.error('Puantaj kaydedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePuantaj = async (id) => {
    if (window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
      try {
        await axios.delete(`${API_URL}/puantaj/${id}`, { headers });
        toast.success('Puantaj kaydı silindi');
        fetchPuantajlar();
      } catch (e) {
        console.error(e);
        toast.error('Silme işlemi başarısız');
      }
    }
  };

  const toplam = filteredPuantajlar.reduce((acc, p) => ({
    fazla: acc.fazla + (p.fazla_mesai || 0),
  }), { fazla: 0 });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Geri
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Puantaj - Giriş/Çıkış Takibi</h1>
            <p className="text-slate-400">Günlük personel giriş çıkış ve mesai takibi</p>
          </div>
        </div>
      </div>

      {/* Özet İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Seçili Tarih</p>
            <p className="text-lg font-bold text-white">{formData.tarih}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Toplam Personel</p>
            <p className="text-2xl font-bold text-white">{personeller.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Kayıt Girilen</p>
            <p className="text-2xl font-bold text-green-500">{filteredPuantajlar.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Kayıt Girilmemiş</p>
            <p className="text-2xl font-bold text-red-500">{kayitSizPersoneller.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Toplam Fazla Mesai</p>
            <p className="text-2xl font-bold text-orange-500">{toplam.fazla.toFixed(1)} Saat</p>
          </CardContent>
        </Card>
      </div>

      {/* Üst Form - Toplu Giriş Bilgileri */}
      <Card className="glass-effect border-slate-800 mb-6">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Toplu Puantaj Girişi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4 items-end">
            <div>
              <Label className="text-slate-300">Tarih</Label>
              <Input
                type="date"
                value={formData.tarih}
                onChange={(e) => setFormData({...formData, tarih: e.target.value})}
                className="bg-slate-950 border-slate-700 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300">Durum</Label>
              <Select 
                value={formData.durum} 
                onValueChange={(value) => setFormData({...formData, durum: value})}
              >
                <SelectTrigger className="bg-slate-950 border-slate-700 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="geldi">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Geldi
                    </span>
                  </SelectItem>
                  <SelectItem value="gelmedi">
                    <span className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" /> Gelmedi
                    </span>
                  </SelectItem>
                  <SelectItem value="izinli">
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" /> İzinli
                    </span>
                  </SelectItem>
                  <SelectItem value="raporlu">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500" /> Raporlu
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Giriş Saati</Label>
              <Input
                type="time"
                value={formData.giris_saati}
                onChange={(e) => setFormData({...formData, giris_saati: e.target.value})}
                disabled={formData.durum !== 'geldi'}
                className="bg-slate-950 border-slate-700 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300">Çıkış Saati</Label>
              <Input
                type="time"
                value={formData.cikis_saati}
                onChange={(e) => setFormData({...formData, cikis_saati: e.target.value})}
                disabled={formData.durum !== 'geldi'}
                className="bg-slate-950 border-slate-700 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300">Fazla Mesai (Saat)</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={formData.fazla_mesai}
                onChange={(e) => setFormData({...formData, fazla_mesai: e.target.value})}
                disabled={formData.durum !== 'geldi'}
                className="bg-slate-950 border-slate-700 mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-slate-300">Not (Opsiyonel)</Label>
              <Input
                type="text"
                placeholder="Not ekleyin..."
                value={formData.notlar}
                onChange={(e) => setFormData({...formData, notlar: e.target.value})}
                className="bg-slate-950 border-slate-700 mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alt Kısım - Kayıt Girilmemiş Personel Listesi */}
      <Card className="glass-effect border-slate-800 mb-6">
        <CardHeader className="border-b border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Kayıt Girilmemiş Personeller
              <span className="text-sm font-normal text-slate-400 ml-2">
                ({kayitSizPersoneller.length} kişi kaldı)
              </span>
            </CardTitle>
            <div className="flex items-center gap-4">
              <span className="text-slate-400 text-sm">
                {seciliPersoneller.length} / {kayitSizPersoneller.length} seçili
              </span>
              <Button 
                onClick={handleTopluKaydet} 
                disabled={saving || seciliPersoneller.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Kaydediliyor...' : `Seçilenlere Uygula (${seciliPersoneller.length})`}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
          ) : kayitSizPersoneller.length === 0 ? (
            <div className="p-8 text-center text-green-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">Tüm personellerin kaydı girilmiş!</p>
              <p className="text-slate-400 text-sm mt-1">Bu tarih için tüm personeller puantaj kaydı mevcut.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 bg-slate-900/50">
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-slate-300">Personel Adı</TableHead>
                    <TableHead className="text-slate-300">Departman</TableHead>
                    <TableHead className="text-slate-300">Pozisyon</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kayitSizPersoneller.map((personel, idx) => {
                    const isSelected = seciliPersoneller.includes(personel.id);
                    
                    return (
                      <TableRow 
                        key={personel.id} 
                        className={`border-slate-800 cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-orange-900/30 hover:bg-orange-900/40' 
                            : idx % 2 === 0 
                              ? 'bg-slate-900/30 hover:bg-slate-800/50' 
                              : 'bg-slate-900/50 hover:bg-slate-800/50'
                        }`}
                        onClick={() => handlePersonelSelect(personel.id, !isSelected)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={(checked) => handlePersonelSelect(personel.id, checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-white">{personel.ad_soyad}</TableCell>
                        <TableCell className="text-slate-400">{personel.departman || '-'}</TableCell>
                        <TableCell className="text-slate-400">{personel.pozisyon || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Günlük Kayıtlar Tablosu */}
      <Card className="glass-effect border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {formData.tarih} Tarihli Kayıtlar ({filteredPuantajlar.length} kişi)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
          ) : filteredPuantajlar.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Bu tarihte henüz kayıt bulunmuyor</div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 bg-slate-900/50">
                    <TableHead className="text-slate-300">Personel</TableHead>
                    <TableHead className="text-slate-300">Giriş</TableHead>
                    <TableHead className="text-slate-300">Çıkış</TableHead>
                    <TableHead className="text-slate-300">Fazla Mesai</TableHead>
                    <TableHead className="text-slate-300">Not</TableHead>
                    <TableHead className="text-slate-300 w-16">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPuantajlar.map((p, idx) => (
                    <TableRow key={p.id} className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'}`}>
                      <TableCell className="font-medium text-white">{p.personel_adi}</TableCell>
                      <TableCell className="text-green-400">{p.giris_saati || '-'}</TableCell>
                      <TableCell className="text-red-400">{p.cikis_saati || '-'}</TableCell>
                      <TableCell className="text-orange-400">{p.fazla_mesai?.toFixed(1) || '0'}</TableCell>
                      <TableCell className="text-slate-400 text-sm">{p.notlar || '-'}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDeletePuantaj(p.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Puantaj;
