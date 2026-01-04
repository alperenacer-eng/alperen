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
import { Plus, Trash2, Edit, Search, ArrowLeft, Eye, UserPlus } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const emptyPersonel = {
  ad_soyad: '',
  tc_kimlik: '',
  telefon: '',
  email: '',
  adres: '',
  dogum_tarihi: '',
  ise_giris_tarihi: '',
  departman: '',
  pozisyon: '',
  maas: 0,
  banka: '',
  iban: '',
  sgk_no: '',
  ehliyet_sinifi: '',
  kan_grubu: '',
  acil_durum_kisi: '',
  acil_durum_telefon: '',
  notlar: '',
  aktif: true,
};

const PersonelListesi = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  
  const [personeller, setPersoneller] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedPersonel, setSelectedPersonel] = useState(null);
  const [newPersonel, setNewPersonel] = useState(emptyPersonel);
  const [departmanlar, setDepartmanlar] = useState([]);
  const [pozisyonlar, setPozisyonlar] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchPersoneller = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/personeller`, { headers });
      setPersoneller(response.data);
    } catch (e) {
      console.error(e);
      toast.error('Personeller yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchKaynaklar = useCallback(async () => {
    try {
      const [depRes, pozRes] = await Promise.all([
        axios.get(`${API_URL}/personel-departmanlar`, { headers }),
        axios.get(`${API_URL}/pozisyonlar`, { headers }),
      ]);
      setDepartmanlar(depRes.data);
      setPozisyonlar(pozRes.data);
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  useEffect(() => {
    if (!currentModule || currentModule.id !== 'personel') {
      navigate('/');
      return;
    }
    fetchPersoneller();
    fetchKaynaklar();
  }, [currentModule, fetchPersoneller, fetchKaynaklar, navigate]);

  const handleAddPersonel = async () => {
    if (!newPersonel.ad_soyad.trim()) {
      toast.error('Ad Soyad zorunludur');
      return;
    }
    try {
      await axios.post(`${API_URL}/personeller`, newPersonel, { headers });
      toast.success('Personel eklendi');
      setNewPersonel(emptyPersonel);
      setIsAddDialogOpen(false);
      fetchPersoneller();
    } catch (e) {
      console.error(e);
      toast.error('Personel eklenirken hata oluştu');
    }
  };

  const handleDeletePersonel = async (id) => {
    if (window.confirm('Bu personeli silmek istediğinize emin misiniz?')) {
      try {
        await axios.delete(`${API_URL}/personeller/${id}`, { headers });
        toast.success('Personel silindi');
        fetchPersoneller();
      } catch (e) {
        console.error(e);
        toast.error('Personel silinirken hata oluştu');
      }
    }
  };

  const filteredPersoneller = personeller.filter(p =>
    p.ad_soyad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.departman?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.pozisyon?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);
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
            <h1 className="text-3xl font-bold text-white mb-2">Personel Listesi</h1>
            <p className="text-slate-400">Toplam {personeller.length} personel</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="w-4 h-4 mr-2" /> Yeni Personel Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle>Yeni Personel Ekle</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-4 py-4">
                <div className="col-span-3 border-b border-slate-700 pb-2 mb-2">
                  <h3 className="text-sm font-semibold text-blue-400">Kişisel Bilgiler</h3>
                </div>
                <div>
                  <Label className="text-red-400">Ad Soyad *</Label>
                  <Input value={newPersonel.ad_soyad} onChange={(e) => setNewPersonel({...newPersonel, ad_soyad: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>TC Kimlik No</Label>
                  <Input value={newPersonel.tc_kimlik} onChange={(e) => setNewPersonel({...newPersonel, tc_kimlik: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>Doğum Tarihi</Label>
                  <Input type="date" value={newPersonel.dogum_tarihi} onChange={(e) => setNewPersonel({...newPersonel, dogum_tarihi: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input value={newPersonel.telefon} onChange={(e) => setNewPersonel({...newPersonel, telefon: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>E-posta</Label>
                  <Input type="email" value={newPersonel.email} onChange={(e) => setNewPersonel({...newPersonel, email: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>Kan Grubu</Label>
                  <Select value={newPersonel.kan_grubu} onValueChange={(v) => setNewPersonel({...newPersonel, kan_grubu: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'].map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label>Adres</Label>
                  <Textarea value={newPersonel.adres} onChange={(e) => setNewPersonel({...newPersonel, adres: e.target.value})} className="bg-slate-950 border-slate-700" rows={2} />
                </div>

                <div className="col-span-3 border-b border-slate-700 pb-2 mb-2 mt-4">
                  <h3 className="text-sm font-semibold text-green-400">İş Bilgileri</h3>
                </div>
                <div>
                  <Label>İşe Giriş Tarihi</Label>
                  <Input type="date" value={newPersonel.ise_giris_tarihi} onChange={(e) => setNewPersonel({...newPersonel, ise_giris_tarihi: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>Departman</Label>
                  <Select value={newPersonel.departman} onValueChange={(v) => setNewPersonel({...newPersonel, departman: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {departmanlar.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pozisyon</Label>
                  <Select value={newPersonel.pozisyon} onValueChange={(v) => setNewPersonel({...newPersonel, pozisyon: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {pozisyonlar.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ehliyet Sınıfı</Label>
                  <Select value={newPersonel.ehliyet_sinifi} onValueChange={(v) => setNewPersonel({...newPersonel, ehliyet_sinifi: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {['Yok', 'B', 'C', 'D', 'E', 'SRC'].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>SGK No</Label>
                  <Input value={newPersonel.sgk_no} onChange={(e) => setNewPersonel({...newPersonel, sgk_no: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>

                <div className="col-span-3 border-b border-slate-700 pb-2 mb-2 mt-4">
                  <h3 className="text-sm font-semibold text-purple-400">Maaş & Banka Bilgileri</h3>
                </div>
                <div>
                  <Label>Maaş (₺)</Label>
                  <Input type="number" value={newPersonel.maas} onChange={(e) => setNewPersonel({...newPersonel, maas: parseFloat(e.target.value) || 0})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>Banka</Label>
                  <Input value={newPersonel.banka} onChange={(e) => setNewPersonel({...newPersonel, banka: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>IBAN</Label>
                  <Input value={newPersonel.iban} onChange={(e) => setNewPersonel({...newPersonel, iban: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>

                <div className="col-span-3 border-b border-slate-700 pb-2 mb-2 mt-4">
                  <h3 className="text-sm font-semibold text-orange-400">Acil Durum İletişim</h3>
                </div>
                <div>
                  <Label>Acil Durum Kişisi</Label>
                  <Input value={newPersonel.acil_durum_kisi} onChange={(e) => setNewPersonel({...newPersonel, acil_durum_kisi: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>Acil Durum Telefonu</Label>
                  <Input value={newPersonel.acil_durum_telefon} onChange={(e) => setNewPersonel({...newPersonel, acil_durum_telefon: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <Label>Notlar</Label>
                  <Input value={newPersonel.notlar} onChange={(e) => setNewPersonel({...newPersonel, notlar: e.target.value})} className="bg-slate-950 border-slate-700" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-slate-700">İptal</Button>
                <Button onClick={handleAddPersonel} className="bg-blue-600 hover:bg-blue-700">Kaydet</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Arama */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Ad, departman veya pozisyon ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-700 text-white"
          />
        </div>
      </div>

      {/* Tablo */}
      <Card className="glass-effect border-slate-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
          ) : filteredPersoneller.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Personel bulunamadı</div>
          ) : (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 bg-slate-900/50">
                    <TableHead className="text-slate-300">Ad Soyad</TableHead>
                    <TableHead className="text-slate-300">Departman</TableHead>
                    <TableHead className="text-slate-300">Pozisyon</TableHead>
                    <TableHead className="text-slate-300">Telefon</TableHead>
                    <TableHead className="text-slate-300">İşe Giriş</TableHead>
                    <TableHead className="text-slate-300">Maaş</TableHead>
                    <TableHead className="text-slate-300">Durum</TableHead>
                    <TableHead className="text-slate-300">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPersoneller.map((p, idx) => (
                    <TableRow key={p.id} className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'} hover:bg-slate-800/50`}>
                      <TableCell className="font-medium text-white">{p.ad_soyad}</TableCell>
                      <TableCell className="text-slate-300">{p.departman || '-'}</TableCell>
                      <TableCell className="text-slate-300">{p.pozisyon || '-'}</TableCell>
                      <TableCell className="text-slate-300">{p.telefon || '-'}</TableCell>
                      <TableCell className="text-slate-300">{p.ise_giris_tarihi || '-'}</TableCell>
                      <TableCell className="text-slate-300">{formatCurrency(p.maas)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${p.aktif ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {p.aktif ? 'Aktif' : 'Pasif'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:text-blue-400" onClick={() => { setSelectedPersonel(p); setIsViewDialogOpen(true); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-400" onClick={() => handleDeletePersonel(p.id)}>
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

      {/* Detay Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Personel Detayı</DialogTitle>
          </DialogHeader>
          {selectedPersonel && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-slate-400">Ad Soyad:</span> <span className="text-white ml-2">{selectedPersonel.ad_soyad}</span></div>
              <div><span className="text-slate-400">TC Kimlik:</span> <span className="text-white ml-2">{selectedPersonel.tc_kimlik || '-'}</span></div>
              <div><span className="text-slate-400">Telefon:</span> <span className="text-white ml-2">{selectedPersonel.telefon || '-'}</span></div>
              <div><span className="text-slate-400">E-posta:</span> <span className="text-white ml-2">{selectedPersonel.email || '-'}</span></div>
              <div><span className="text-slate-400">Departman:</span> <span className="text-white ml-2">{selectedPersonel.departman || '-'}</span></div>
              <div><span className="text-slate-400">Pozisyon:</span> <span className="text-white ml-2">{selectedPersonel.pozisyon || '-'}</span></div>
              <div><span className="text-slate-400">Maaş:</span> <span className="text-white ml-2">{formatCurrency(selectedPersonel.maas)}</span></div>
              <div><span className="text-slate-400">SGK No:</span> <span className="text-white ml-2">{selectedPersonel.sgk_no || '-'}</span></div>
              <div><span className="text-slate-400">İşe Giriş:</span> <span className="text-white ml-2">{selectedPersonel.ise_giris_tarihi || '-'}</span></div>
              <div><span className="text-slate-400">Kan Grubu:</span> <span className="text-white ml-2">{selectedPersonel.kan_grubu || '-'}</span></div>
              <div><span className="text-slate-400">Yıllık İzin:</span> <span className="text-white ml-2">{selectedPersonel.kalan_izin || 14} gün kaldı</span></div>
              <div><span className="text-slate-400">IBAN:</span> <span className="text-white ml-2">{selectedPersonel.iban || '-'}</span></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PersonelListesi;
