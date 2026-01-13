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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, ArrowLeft, Calendar, Check, X } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const IzinYonetimi = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  
  const [izinler, setIzinler] = useState([]);
  const [personeller, setPersoneller] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const [newIzin, setNewIzin] = useState({
    personel_id: '',
    personel_adi: '',
    izin_turu: '',
    baslangic_tarihi: '',
    bitis_tarihi: '',
    gun_sayisi: 1,
    aciklama: '',
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchIzinler = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/izinler`, { headers });
      setIzinler(response.data);
    } catch (e) {
      console.error(e);
      toast.error('İzin kayıtları yüklenirken hata oluştu');
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
    fetchIzinler();
    fetchPersoneller();
  }, [currentModule, fetchIzinler, fetchPersoneller, navigate]);

  const handleAddIzin = async () => {
    if (!newIzin.personel_id || !newIzin.izin_turu || !newIzin.baslangic_tarihi || !newIzin.bitis_tarihi) {
      toast.error('Tüm alanları doldurun');
      return;
    }
    try {
      await axios.post(`${API_URL}/izinler`, newIzin, { headers });
      toast.success('İzin talebi oluşturuldu');
      setNewIzin({
        personel_id: '',
        personel_adi: '',
        izin_turu: '',
        baslangic_tarihi: '',
        bitis_tarihi: '',
        gun_sayisi: 1,
        aciklama: '',
      });
      setIsAddDialogOpen(false);
      fetchIzinler();
    } catch (e) {
      console.error(e);
      toast.error('İzin talebi oluşturulurken hata oluştu');
    }
  };

  const handleOnaylaRed = async (id, durum) => {
    try {
      await axios.put(`${API_URL}/izinler/${id}/onayla?durum=${durum}`, {}, { headers });
      toast.success(durum === 'Onaylandı' ? 'İzin onaylandı' : 'İzin reddedildi');
      fetchIzinler();
    } catch (e) {
      console.error(e);
      toast.error('İşlem başarısız');
    }
  };

  const handleDeleteIzin = async (id) => {
    if (window.confirm('Bu izin kaydını silmek istediğinize emin misiniz?')) {
      try {
        await axios.delete(`${API_URL}/izinler/${id}`, { headers });
        toast.success('İzin kaydı silindi');
        fetchIzinler();
      } catch (e) {
        console.error(e);
        toast.error('Silme işlemi başarısız');
      }
    }
  };

  const handlePersonelSelect = (personelId) => {
    const personel = personeller.find(p => p.id === personelId);
    setNewIzin({
      ...newIzin,
      personel_id: personelId,
      personel_adi: personel?.ad_soyad || '',
    });
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const bekleyenler = izinler.filter(i => i.durum === 'Beklemede');
  const onaylananlar = izinler.filter(i => i.durum === 'Onaylandı');
  const reddedilenler = izinler.filter(i => i.durum === 'Reddedildi');

  const izinTurleri = ['Yıllık', 'Mazeret', 'Hastalık', 'Ücretsiz', 'Evlilik', 'Doğum', 'Ölüm'];

  const getDurumBadge = (durum) => {
    switch (durum) {
      case 'Beklemede': return 'bg-yellow-500/20 text-yellow-400';
      case 'Onaylandı': return 'bg-green-500/20 text-green-400';
      case 'Reddedildi': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
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
            <h1 className="text-3xl font-bold text-white mb-2">İzin Yönetimi</h1>
            <p className="text-slate-400">Personel izin talepleri ve onay işlemleri</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-yellow-600 hover:bg-yellow-700">
                <Plus className="w-4 h-4 mr-2" /> Yeni İzin Talebi
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle>Yeni İzin Talebi</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Personel</Label>
                  <Select value={newIzin.personel_id} onValueChange={handlePersonelSelect}>
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
                  <Label>İzin Türü</Label>
                  <Select value={newIzin.izin_turu} onValueChange={(v) => setNewIzin({...newIzin, izin_turu: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700">
                      <SelectValue placeholder="İzin türü seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {izinTurleri.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Başlangıç Tarihi</Label>
                    <Input
                      type="date"
                      value={newIzin.baslangic_tarihi}
                      onChange={(e) => {
                        const days = calculateDays(e.target.value, newIzin.bitis_tarihi);
                        setNewIzin({...newIzin, baslangic_tarihi: e.target.value, gun_sayisi: days});
                      }}
                      className="bg-slate-950 border-slate-700"
                    />
                  </div>
                  <div>
                    <Label>Bitiş Tarihi</Label>
                    <Input
                      type="date"
                      value={newIzin.bitis_tarihi}
                      onChange={(e) => {
                        const days = calculateDays(newIzin.baslangic_tarihi, e.target.value);
                        setNewIzin({...newIzin, bitis_tarihi: e.target.value, gun_sayisi: days});
                      }}
                      className="bg-slate-950 border-slate-700"
                    />
                  </div>
                </div>
                <div>
                  <Label>Toplam Gün: <span className="text-yellow-400 font-bold">{newIzin.gun_sayisi}</span></Label>
                </div>
                <div>
                  <Label>Açıklama</Label>
                  <Textarea
                    value={newIzin.aciklama}
                    onChange={(e) => setNewIzin({...newIzin, aciklama: e.target.value})}
                    className="bg-slate-950 border-slate-700"
                    placeholder="İzin sebebi..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-slate-700">İptal</Button>
                <Button onClick={handleAddIzin} className="bg-yellow-600 hover:bg-yellow-700">Talep Oluştur</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="glass-effect border-slate-800 border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Bekleyen</p>
            <p className="text-2xl font-bold text-yellow-500">{bekleyenler.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800 border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Onaylanan</p>
            <p className="text-2xl font-bold text-green-500">{onaylananlar.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800 border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Reddedilen</p>
            <p className="text-2xl font-bold text-red-500">{reddedilenler.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tablo */}
      <Card className="glass-effect border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            İzin Talepleri
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
          ) : izinler.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Henüz izin talebi bulunmuyor</div>
          ) : (
            <ScrollArea>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 bg-slate-900/50">
                    <TableHead className="text-slate-300">Personel</TableHead>
                    <TableHead className="text-slate-300">İzin Türü</TableHead>
                    <TableHead className="text-slate-300">Başlangıç</TableHead>
                    <TableHead className="text-slate-300">Bitiş</TableHead>
                    <TableHead className="text-slate-300">Gün</TableHead>
                    <TableHead className="text-slate-300">Durum</TableHead>
                    <TableHead className="text-slate-300">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {izinler.map((izin, idx) => (
                    <TableRow key={izin.id} className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'}`}>
                      <TableCell className="font-medium text-white">{izin.personel_adi}</TableCell>
                      <TableCell className="text-slate-300">{izin.izin_turu}</TableCell>
                      <TableCell className="text-slate-300">{izin.baslangic_tarihi}</TableCell>
                      <TableCell className="text-slate-300">{izin.bitis_tarihi}</TableCell>
                      <TableCell className="text-slate-300">{izin.gun_sayisi}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${getDurumBadge(izin.durum)}`}>
                          {izin.durum}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {izin.durum === 'Beklemede' && (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:text-green-400" onClick={() => handleOnaylaRed(izin.id, 'Onaylandı')}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-400" onClick={() => handleOnaylaRed(izin.id, 'Reddedildi')}>
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-slate-400" onClick={() => handleDeleteIzin(izin.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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

export default IzinYonetimi;
