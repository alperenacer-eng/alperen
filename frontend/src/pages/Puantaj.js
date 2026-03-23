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
  Plus, Trash2, ArrowLeft, Clock, Calendar, Users, Save, 
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('toplu'); // 'toplu' veya 'tekil'
  
  // Toplu giriş için state
  const [topluKayitlar, setTopluKayitlar] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Tekil giriş için state
  const [newPuantaj, setNewPuantaj] = useState({
    personel_id: '',
    personel_adi: '',
    tarih: new Date().toISOString().split('T')[0],
    giris_saati: '',
    cikis_saati: '',
  });

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
      
      // Toplu kayıtları hazırla
      initializeTopluKayitlar(aktifPersoneller);
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  const initializeTopluKayitlar = (personelList) => {
    const kayitlar = personelList.map(p => ({
      personel_id: p.id,
      personel_adi: p.ad_soyad,
      departman: p.departman || '-',
      secili: false,
      durum: 'geldi',
      giris_saati: '08:00',
      cikis_saati: '17:00',
      notlar: ''
    }));
    setTopluKayitlar(kayitlar);
  };

  useEffect(() => {
    if (!currentModule || currentModule.id !== 'personel') {
      navigate('/');
      return;
    }
    fetchPuantajlar();
    fetchPersoneller();
  }, [currentModule, fetchPuantajlar, fetchPersoneller, navigate]);

  // Mevcut puantajları toplu kayıtlara yükle
  useEffect(() => {
    if (personeller.length > 0 && puantajlar.length > 0) {
      const gunlukPuantajlar = puantajlar.filter(p => p.tarih === selectedDate);
      
      setTopluKayitlar(prev => prev.map(kayit => {
        const mevcutPuantaj = gunlukPuantajlar.find(p => p.personel_id === kayit.personel_id);
        if (mevcutPuantaj) {
          return {
            ...kayit,
            giris_saati: mevcutPuantaj.giris_saati || '08:00',
            cikis_saati: mevcutPuantaj.cikis_saati || '17:00',
            durum: mevcutPuantaj.giris_saati ? 'geldi' : 'gelmedi',
            notlar: mevcutPuantaj.notlar || ''
          };
        }
        return {
          ...kayit,
          giris_saati: '08:00',
          cikis_saati: '17:00',
          durum: 'geldi',
          notlar: ''
        };
      }));
    }
  }, [selectedDate, puantajlar, personeller]);

  const handleTopluKayitChange = (index, field, value) => {
    setTopluKayitlar(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    setTopluKayitlar(prev => prev.map(k => ({ ...k, secili: checked })));
  };

  const handleTopluKaydet = async () => {
    const seciliKayitlar = topluKayitlar.filter(k => k.secili);
    
    if (seciliKayitlar.length === 0) {
      toast.error('Lütfen en az bir personel seçin');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tarih: selectedDate,
        kayitlar: seciliKayitlar.map(k => ({
          personel_id: k.personel_id,
          personel_adi: k.personel_adi,
          giris_saati: k.durum === 'geldi' ? k.giris_saati : '',
          cikis_saati: k.durum === 'geldi' ? k.cikis_saati : '',
          durum: k.durum,
          notlar: k.notlar
        }))
      };

      await axios.post(`${API_URL}/puantaj/toplu`, payload, { headers });
      toast.success(`${seciliKayitlar.length} personel için puantaj kaydedildi`);
      
      // Kayıtları yenile
      await fetchPuantajlar();
      
      // Seçimleri temizle
      setTopluKayitlar(prev => prev.map(k => ({ ...k, secili: false })));
      setSelectAll(false);
    } catch (e) {
      console.error(e);
      toast.error('Puantaj kaydedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPuantaj = async () => {
    if (!newPuantaj.personel_id) {
      toast.error('Personel seçiniz');
      return;
    }
    if (!newPuantaj.giris_saati) {
      toast.error('Giriş saati giriniz');
      return;
    }
    try {
      await axios.post(`${API_URL}/puantaj`, newPuantaj, { headers });
      toast.success('Puantaj kaydı eklendi');
      setNewPuantaj({
        personel_id: '',
        personel_adi: '',
        tarih: selectedDate,
        giris_saati: '',
        cikis_saati: '',
      });
      fetchPuantajlar();
    } catch (e) {
      console.error(e);
      toast.error('Puantaj kaydı eklenirken hata oluştu');
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

  const handlePersonelSelect = (personelId) => {
    const personel = personeller.find(p => p.id === personelId);
    setNewPuantaj({
      ...newPuantaj,
      personel_id: personelId,
      personel_adi: personel?.ad_soyad || '',
      tarih: selectedDate,
    });
  };

  const filteredPuantajlar = puantajlar.filter(p => p.tarih === selectedDate);

  const toplam = filteredPuantajlar.reduce((acc, p) => ({
    mesai: acc.mesai + (p.mesai_suresi || 0),
    fazla: acc.fazla + (p.fazla_mesai || 0),
  }), { mesai: 0, fazla: 0 });

  const seciliSayisi = topluKayitlar.filter(k => k.secili).length;

  const getDurumBadge = (durum) => {
    switch (durum) {
      case 'geldi':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">Geldi</span>;
      case 'gelmedi':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">Gelmedi</span>;
      case 'izinli':
        return <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">İzinli</span>;
      case 'raporlu':
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">Raporlu</span>;
      default:
        return null;
    }
  };

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
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'toplu' ? 'default' : 'outline'}
              onClick={() => setViewMode('toplu')}
              className={viewMode === 'toplu' ? 'bg-orange-600 hover:bg-orange-700' : 'border-slate-700'}
            >
              <Users className="w-4 h-4 mr-2" />
              Toplu Giriş
            </Button>
            <Button
              variant={viewMode === 'tekil' ? 'default' : 'outline'}
              onClick={() => setViewMode('tekil')}
              className={viewMode === 'tekil' ? 'bg-orange-600 hover:bg-orange-700' : 'border-slate-700'}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tekil Giriş
            </Button>
          </div>
        </div>
      </div>

      {/* Tarih Seçimi ve Özet */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <Label className="text-slate-400 text-sm">Tarih Seçin</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-950 border-slate-700 mt-2"
            />
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Toplam Personel</p>
            <p className="text-2xl font-bold text-white">{personeller.length} Kişi</p>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Giriş Yapan</p>
            <p className="text-2xl font-bold text-green-500">{filteredPuantajlar.length} Kişi</p>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Toplam Mesai</p>
            <p className="text-2xl font-bold text-blue-500">{toplam.mesai.toFixed(1)} Saat</p>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Fazla Mesai</p>
            <p className="text-2xl font-bold text-orange-500">{toplam.fazla.toFixed(1)} Saat</p>
          </CardContent>
        </Card>
      </div>

      {viewMode === 'toplu' ? (
        /* Toplu Giriş Modu */
        <Card className="glass-effect border-slate-800 mb-6">
          <CardHeader className="border-b border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Toplu Puantaj Girişi - {selectedDate}
              </CardTitle>
              <div className="flex items-center gap-4">
                <span className="text-slate-400 text-sm">
                  {seciliSayisi} personel seçili
                </span>
                <Button 
                  onClick={handleTopluKaydet} 
                  disabled={saving || seciliSayisi === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Kaydediliyor...' : 'Seçilenleri Kaydet'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
            ) : personeller.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                Kayıtlı personel bulunmuyor. Önce personel ekleyin.
              </div>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 bg-slate-900/50">
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectAll}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="text-slate-300">Personel</TableHead>
                      <TableHead className="text-slate-300">Departman</TableHead>
                      <TableHead className="text-slate-300 w-32">Durum</TableHead>
                      <TableHead className="text-slate-300 w-32">Giriş</TableHead>
                      <TableHead className="text-slate-300 w-32">Çıkış</TableHead>
                      <TableHead className="text-slate-300">Mesai</TableHead>
                      <TableHead className="text-slate-300 w-48">Not</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topluKayitlar.map((kayit, idx) => {
                      // Mesai hesapla
                      let mesai = 0;
                      let fazlaMesai = 0;
                      if (kayit.durum === 'geldi' && kayit.giris_saati && kayit.cikis_saati) {
                        try {
                          const [gH, gM] = kayit.giris_saati.split(':').map(Number);
                          const [cH, cM] = kayit.cikis_saati.split(':').map(Number);
                          mesai = ((cH * 60 + cM) - (gH * 60 + gM)) / 60;
                          fazlaMesai = Math.max(0, mesai - 8);
                        } catch (e) {}
                      }

                      return (
                        <TableRow 
                          key={kayit.personel_id} 
                          className={`border-slate-800 ${kayit.secili ? 'bg-orange-900/20' : idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'}`}
                        >
                          <TableCell>
                            <Checkbox 
                              checked={kayit.secili}
                              onCheckedChange={(checked) => handleTopluKayitChange(idx, 'secili', checked)}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-white">{kayit.personel_adi}</TableCell>
                          <TableCell className="text-slate-400">{kayit.departman}</TableCell>
                          <TableCell>
                            <Select 
                              value={kayit.durum} 
                              onValueChange={(value) => handleTopluKayitChange(idx, 'durum', value)}
                            >
                              <SelectTrigger className="bg-slate-950 border-slate-700 h-8">
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
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={kayit.giris_saati}
                              onChange={(e) => handleTopluKayitChange(idx, 'giris_saati', e.target.value)}
                              disabled={kayit.durum !== 'geldi'}
                              className="bg-slate-950 border-slate-700 h-8 w-28"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={kayit.cikis_saati}
                              onChange={(e) => handleTopluKayitChange(idx, 'cikis_saati', e.target.value)}
                              disabled={kayit.durum !== 'geldi'}
                              className="bg-slate-950 border-slate-700 h-8 w-28"
                            />
                          </TableCell>
                          <TableCell>
                            {kayit.durum === 'geldi' ? (
                              <div className="text-sm">
                                <span className="text-blue-400">{mesai.toFixed(1)}s</span>
                                {fazlaMesai > 0 && (
                                  <span className="text-orange-400 ml-2">(+{fazlaMesai.toFixed(1)})</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              placeholder="Not..."
                              value={kayit.notlar}
                              onChange={(e) => handleTopluKayitChange(idx, 'notlar', e.target.value)}
                              className="bg-slate-950 border-slate-700 h-8"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Tekil Giriş Modu */
        <Card className="glass-effect border-slate-800 mb-6">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Yeni Giriş/Çıkış Kaydı
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div>
                <Label>Personel</Label>
                <Select value={newPuantaj.personel_id} onValueChange={handlePersonelSelect}>
                  <SelectTrigger className="bg-slate-950 border-slate-700">
                    <SelectValue placeholder="Personel seçin" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {personeller.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.ad_soyad}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Giriş Saati</Label>
                <Input
                  type="time"
                  value={newPuantaj.giris_saati}
                  onChange={(e) => setNewPuantaj({...newPuantaj, giris_saati: e.target.value})}
                  className="bg-slate-950 border-slate-700"
                />
              </div>
              <div>
                <Label>Çıkış Saati</Label>
                <Input
                  type="time"
                  value={newPuantaj.cikis_saati}
                  onChange={(e) => setNewPuantaj({...newPuantaj, cikis_saati: e.target.value})}
                  className="bg-slate-950 border-slate-700"
                />
              </div>
              <div className="md:col-span-2">
                <Button onClick={handleAddPuantaj} className="w-full bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" /> Kaydet
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Günlük Kayıtlar Tablosu */}
      <Card className="glass-effect border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {selectedDate} Tarihli Kayıtlar
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
          ) : filteredPuantajlar.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Bu tarihte kayıt bulunmuyor</div>
          ) : (
            <ScrollArea>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 bg-slate-900/50">
                    <TableHead className="text-slate-300">Personel</TableHead>
                    <TableHead className="text-slate-300">Giriş Saati</TableHead>
                    <TableHead className="text-slate-300">Çıkış Saati</TableHead>
                    <TableHead className="text-slate-300">Mesai (Saat)</TableHead>
                    <TableHead className="text-slate-300">Fazla Mesai</TableHead>
                    <TableHead className="text-slate-300">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPuantajlar.map((p, idx) => (
                    <TableRow key={p.id} className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'}`}>
                      <TableCell className="font-medium text-white">{p.personel_adi}</TableCell>
                      <TableCell className="text-green-400">{p.giris_saati || '-'}</TableCell>
                      <TableCell className="text-red-400">{p.cikis_saati || '-'}</TableCell>
                      <TableCell className="text-blue-400">{p.mesai_suresi?.toFixed(1) || '-'}</TableCell>
                      <TableCell className="text-orange-400">{p.fazla_mesai?.toFixed(1) || '0'}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => handleDeletePuantaj(p.id)}>
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
