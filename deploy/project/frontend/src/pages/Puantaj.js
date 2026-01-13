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
import { Plus, Trash2, ArrowLeft, Clock, Calendar } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Puantaj = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  
  const [puantajlar, setPuantajlar] = useState([]);
  const [personeller, setPersoneller] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
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
      setPersoneller(response.data.filter(p => p.aktif));
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

      {/* Tarih Seçimi ve Özet */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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

      {/* Yeni Kayıt Formu */}
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

      {/* Tablo */}
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
