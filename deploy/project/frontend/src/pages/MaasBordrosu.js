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
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, ArrowLeft, FileText, Check, DollarSign } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MaasBordrosu = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  
  const [bordrolar, setBordrolar] = useState([]);
  const [personeller, setPersoneller] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedYil, setSelectedYil] = useState(new Date().getFullYear());
  const [selectedAy, setSelectedAy] = useState(new Date().getMonth() + 1);
  
  const [newBordro, setNewBordro] = useState({
    personel_id: '',
    personel_adi: '',
    yil: new Date().getFullYear(),
    ay: new Date().getMonth() + 1,
    brut_maas: 0,
    fazla_mesai_ucreti: 0,
    ikramiye: 0,
    kesintiler: 0,
  });

  const headers = { Authorization: `Bearer ${token}` };

  const aylar = [
    { value: 1, label: 'Ocak' },
    { value: 2, label: 'Şubat' },
    { value: 3, label: 'Mart' },
    { value: 4, label: 'Nisan' },
    { value: 5, label: 'Mayıs' },
    { value: 6, label: 'Haziran' },
    { value: 7, label: 'Temmuz' },
    { value: 8, label: 'Ağustos' },
    { value: 9, label: 'Eylül' },
    { value: 10, label: 'Ekim' },
    { value: 11, label: 'Kasım' },
    { value: 12, label: 'Aralık' },
  ];

  const fetchBordrolar = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/maas-bordrolari?yil=${selectedYil}&ay=${selectedAy}`, { headers });
      setBordrolar(response.data);
    } catch (e) {
      console.error(e);
      toast.error('Bordrolar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [token, selectedYil, selectedAy]);

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
    fetchBordrolar();
    fetchPersoneller();
  }, [currentModule, fetchBordrolar, fetchPersoneller, navigate]);

  const handlePersonelSelect = (personelId) => {
    const personel = personeller.find(p => p.id === personelId);
    setNewBordro({
      ...newBordro,
      personel_id: personelId,
      personel_adi: personel?.ad_soyad || '',
      brut_maas: personel?.maas || 0,
    });
  };

  const handleAddBordro = async () => {
    if (!newBordro.personel_id) {
      toast.error('Personel seçiniz');
      return;
    }
    try {
      await axios.post(`${API_URL}/maas-bordrolari`, newBordro, { headers });
      toast.success('Bordro oluşturuldu');
      setNewBordro({
        personel_id: '',
        personel_adi: '',
        yil: selectedYil,
        ay: selectedAy,
        brut_maas: 0,
        fazla_mesai_ucreti: 0,
        ikramiye: 0,
        kesintiler: 0,
      });
      setIsAddDialogOpen(false);
      fetchBordrolar();
    } catch (e) {
      console.error(e);
      toast.error('Bordro oluşturulurken hata oluştu');
    }
  };

  const handleOdendi = async (id) => {
    try {
      await axios.put(`${API_URL}/maas-bordrolari/${id}/odendi`, {}, { headers });
      toast.success('Ödeme kaydedildi');
      fetchBordrolar();
    } catch (e) {
      console.error(e);
      toast.error('İşlem başarısız');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);
  };

  const toplamlar = bordrolar.reduce((acc, b) => ({
    brut: acc.brut + (b.brut_maas || 0),
    net: acc.net + (b.net_maas || 0),
    toplam: acc.toplam + (b.toplam_odeme || 0),
  }), { brut: 0, net: 0, toplam: 0 });

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
            <h1 className="text-3xl font-bold text-white mb-2">Maaş Bordrosu</h1>
            <p className="text-slate-400">Aylık maaş hesaplama ve bordro yönetimi</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" /> Yeni Bordro Oluştur
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle>Yeni Maaş Bordrosu</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Personel</Label>
                  <Select value={newBordro.personel_id} onValueChange={handlePersonelSelect}>
                    <SelectTrigger className="bg-slate-950 border-slate-700">
                      <SelectValue placeholder="Personel seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {personeller.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.ad_soyad} - {formatCurrency(p.maas)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Yıl</Label>
                    <Select value={String(newBordro.yil)} onValueChange={(v) => setNewBordro({...newBordro, yil: parseInt(v)})}>
                      <SelectTrigger className="bg-slate-950 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        {[2024, 2025, 2026].map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ay</Label>
                    <Select value={String(newBordro.ay)} onValueChange={(v) => setNewBordro({...newBordro, ay: parseInt(v)})}>
                      <SelectTrigger className="bg-slate-950 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        {aylar.map(a => (
                          <SelectItem key={a.value} value={String(a.value)}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Brüt Maaş (₺)</Label>
                  <Input
                    type="number"
                    value={newBordro.brut_maas}
                    onChange={(e) => setNewBordro({...newBordro, brut_maas: parseFloat(e.target.value) || 0})}
                    className="bg-slate-950 border-slate-700"
                  />
                </div>
                <div>
                  <Label>Fazla Mesai Ücreti (₺)</Label>
                  <Input
                    type="number"
                    value={newBordro.fazla_mesai_ucreti}
                    onChange={(e) => setNewBordro({...newBordro, fazla_mesai_ucreti: parseFloat(e.target.value) || 0})}
                    className="bg-slate-950 border-slate-700"
                  />
                </div>
                <div>
                  <Label>İkramiye (₺)</Label>
                  <Input
                    type="number"
                    value={newBordro.ikramiye}
                    onChange={(e) => setNewBordro({...newBordro, ikramiye: parseFloat(e.target.value) || 0})}
                    className="bg-slate-950 border-slate-700"
                  />
                </div>
                <div>
                  <Label>Kesintiler (₺)</Label>
                  <Input
                    type="number"
                    value={newBordro.kesintiler}
                    onChange={(e) => setNewBordro({...newBordro, kesintiler: parseFloat(e.target.value) || 0})}
                    className="bg-slate-950 border-slate-700"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-slate-700">İptal</Button>
                <Button onClick={handleAddBordro} className="bg-purple-600 hover:bg-purple-700">Oluştur</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtre ve Özet */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <Label className="text-slate-400 text-sm">Yıl</Label>
            <Select value={String(selectedYil)} onValueChange={(v) => setSelectedYil(parseInt(v))}>
              <SelectTrigger className="bg-slate-950 border-slate-700 mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {[2024, 2025, 2026].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <Label className="text-slate-400 text-sm">Ay</Label>
            <Select value={String(selectedAy)} onValueChange={(v) => setSelectedAy(parseInt(v))}>
              <SelectTrigger className="bg-slate-950 border-slate-700 mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {aylar.map(a => (
                  <SelectItem key={a.value} value={String(a.value)}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Toplam Brüt</p>
            <p className="text-xl font-bold text-blue-500">{formatCurrency(toplamlar.brut)}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Toplam Net</p>
            <p className="text-xl font-bold text-green-500">{formatCurrency(toplamlar.net)}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Toplam Ödeme</p>
            <p className="text-xl font-bold text-purple-500">{formatCurrency(toplamlar.toplam)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tablo */}
      <Card className="glass-effect border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {aylar.find(a => a.value === selectedAy)?.label} {selectedYil} Bordroları
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
          ) : bordrolar.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Bu dönem için bordro bulunmuyor</div>
          ) : (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 bg-slate-900/50">
                    <TableHead className="text-slate-300">Personel</TableHead>
                    <TableHead className="text-slate-300">Brüt Maaş</TableHead>
                    <TableHead className="text-slate-300">SGK İşçi</TableHead>
                    <TableHead className="text-slate-300">Gelir V.</TableHead>
                    <TableHead className="text-slate-300">Net Maaş</TableHead>
                    <TableHead className="text-slate-300">F.Mesai</TableHead>
                    <TableHead className="text-slate-300">Toplam</TableHead>
                    <TableHead className="text-slate-300">Durum</TableHead>
                    <TableHead className="text-slate-300">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bordrolar.map((b, idx) => (
                    <TableRow key={b.id} className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'}`}>
                      <TableCell className="font-medium text-white">{b.personel_adi}</TableCell>
                      <TableCell className="text-slate-300">{formatCurrency(b.brut_maas)}</TableCell>
                      <TableCell className="text-red-400">-{formatCurrency(b.sgk_isci)}</TableCell>
                      <TableCell className="text-red-400">-{formatCurrency(b.gelir_vergisi)}</TableCell>
                      <TableCell className="text-green-400">{formatCurrency(b.net_maas)}</TableCell>
                      <TableCell className="text-blue-400">+{formatCurrency(b.fazla_mesai_ucreti)}</TableCell>
                      <TableCell className="text-purple-400 font-bold">{formatCurrency(b.toplam_odeme)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${b.odendi ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {b.odendi ? 'Ödendi' : 'Bekliyor'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {!b.odendi && (
                          <Button size="sm" variant="ghost" className="text-green-500 hover:text-green-400" onClick={() => handleOdendi(b.id)}>
                            <DollarSign className="w-4 h-4 mr-1" /> Öde
                          </Button>
                        )}
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

export default MaasBordrosu;
