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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Trash2, ArrowLeft, Clock, Calendar, Users, Save, 
  CheckCircle2, XCircle, AlertCircle, FileText, Building2, Plus, Pencil,
  Home, Flag, PartyPopper, Ban, Search, X, Sun
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Puantaj durum tanımları
const DURUM_OPTIONS = [
  { value: 'geldi', label: 'Geldi', icon: CheckCircle2, color: 'text-green-500', badgeClass: 'bg-green-500/20 text-green-400 border-green-500/40' },
  { value: 'gelmedi', label: 'Gelmedi', icon: XCircle, color: 'text-red-500', badgeClass: 'bg-red-500/20 text-red-400 border-red-500/40' },
  { value: 'izinli', label: 'İzinli', icon: FileText, color: 'text-blue-500', badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  { value: 'raporlu', label: 'Raporlu', icon: AlertCircle, color: 'text-yellow-500', badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
  { value: 'hafta_tatili', label: 'Hafta Tatili', icon: Home, color: 'text-purple-500', badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  { value: 'resmi_tatil', label: 'Resmi Tatil', icon: Flag, color: 'text-orange-500', badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  { value: 'bayram_tatili', label: 'Bayram Tatili', icon: PartyPopper, color: 'text-pink-500', badgeClass: 'bg-pink-500/20 text-pink-400 border-pink-500/40' },
  { value: 'izinsiz_gelmedi', label: 'İzinsiz Gelmedi', icon: Ban, color: 'text-rose-600', badgeClass: 'bg-rose-600/20 text-rose-400 border-rose-600/40' },
  { value: 'pazar_calismasi', label: 'Pazar Çalışması', icon: Sun, color: 'text-cyan-500', badgeClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' },
  { value: 'resmi_tatil_calisti', label: 'Resmi Tatil Çalıştı', icon: Flag, color: 'text-amber-500', badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  { value: 'bayram_calisti', label: 'Bayram Çalıştı', icon: PartyPopper, color: 'text-fuchsia-500', badgeClass: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40' },
];

const getDurumInfo = (val) => DURUM_OPTIONS.find(d => d.value === val) || DURUM_OPTIONS[0];

const Puantaj = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  
  const [puantajlar, setPuantajlar] = useState([]);
  const [personeller, setPersoneller] = useState([]);
  const [tesisler, setTesisler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Tesis yönetimi
  const [tesisDialogOpen, setTesisDialogOpen] = useState(false);
  const [yeniTesis, setYeniTesis] = useState({ tesis_adi: '', adres: '' });
  const [editingTesis, setEditingTesis] = useState(null);
  
  // Puantaj düzenleme
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPuantaj, setEditingPuantaj] = useState(null);
  
  // Üst form bilgileri
  const [formData, setFormData] = useState({
    tarih: new Date().toISOString().split('T')[0],
    tarih_bitis: new Date().toISOString().split('T')[0],
    durum: 'geldi',
    giris_saati: '08:00',
    cikis_saati: '17:00',
    fazla_mesai: '0',
    tesis_id: '',
    notlar: ''
  });

  // Pazar günlerini atla seçeneği (hafta tatili için)
  const [skipSundays, setSkipSundays] = useState(false);
  
  // Personel seçimleri
  const [seciliPersoneller, setSeciliPersoneller] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // İsim arama filtreleri
  const [searchKayitSiz, setSearchKayitSiz] = useState('');
  const [searchKayitli, setSearchKayitli] = useState('');

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

  const fetchTesisler = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/tesisler`, { headers });
      setTesisler(response.data.filter(t => t.aktif));
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
    fetchTesisler();
  }, [currentModule, fetchPuantajlar, fetchPersoneller, fetchTesisler, navigate]);

  // Tesis Yönetimi Fonksiyonları
  const handleAddTesis = async () => {
    if (!yeniTesis.tesis_adi.trim()) {
      toast.error('Tesis adı gerekli');
      return;
    }
    try {
      await axios.post(`${API_URL}/tesisler`, yeniTesis, { headers });
      toast.success('Tesis eklendi');
      setYeniTesis({ tesis_adi: '', adres: '' });
      fetchTesisler();
    } catch (e) {
      toast.error('Tesis eklenirken hata oluştu');
    }
  };

  const handleUpdateTesis = async () => {
    if (!editingTesis || !editingTesis.tesis_adi.trim()) {
      toast.error('Tesis adı gerekli');
      return;
    }
    try {
      await axios.put(`${API_URL}/tesisler/${editingTesis.id}`, editingTesis, { headers });
      toast.success('Tesis güncellendi');
      setEditingTesis(null);
      fetchTesisler();
    } catch (e) {
      toast.error('Tesis güncellenirken hata oluştu');
    }
  };

  const handleDeleteTesis = async (id) => {
    if (window.confirm('Bu tesisi silmek istediğinize emin misiniz?')) {
      try {
        await axios.delete(`${API_URL}/tesisler/${id}`, { headers });
        toast.success('Tesis silindi');
        fetchTesisler();
      } catch (e) {
        toast.error('Tesis silinirken hata oluştu');
      }
    }
  };

  // O gün için puantajı olmayan personelleri filtrele
  // Tarih aralığı seçildiyse, başlangıç gününe kayıt OLAN personelleri dahil etmiyoruz
  // ama kullanıcı tüm personele uygulamak isterse "Tüm personeli göster" seçeneği ile geçiş yapabilir
  const filteredPuantajlar = puantajlar.filter(p => p.tarih === formData.tarih);
  const kayitliPersonelIds = filteredPuantajlar.map(p => p.personel_id);
  const isDateRange = (formData.tarih_bitis && formData.tarih_bitis !== formData.tarih);
  // Tarih aralığı varsa tüm aktif personeli göster, yoksa sadece o gün kaydı olmayanları göster
  const kayitSizPersoneller = isDateRange
    ? personeller
    : personeller.filter(p => !kayitliPersonelIds.includes(p.id));

  // Türkçe karakter duyarsız normalizasyon
  const normalizeText = (s) => (s || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/i̇/g, 'i')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');

  // İsim aramasına göre filtrelenmiş listeler
  const searchKayitSizNorm = normalizeText(searchKayitSiz.trim());
  const filteredKayitSizPersoneller = searchKayitSizNorm
    ? kayitSizPersoneller.filter(p =>
        normalizeText(p.ad_soyad).includes(searchKayitSizNorm) ||
        normalizeText(p.departman).includes(searchKayitSizNorm) ||
        normalizeText(p.pozisyon).includes(searchKayitSizNorm)
      )
    : kayitSizPersoneller;

  const searchKayitliNorm = normalizeText(searchKayitli.trim());
  const filteredKayitliPuantajlar = searchKayitliNorm
    ? filteredPuantajlar.filter(p => {
        const dep = personeller.find(per => per.id === p.personel_id)?.departman || '';
        return (
          normalizeText(p.personel_adi).includes(searchKayitliNorm) ||
          normalizeText(dep).includes(searchKayitliNorm) ||
          normalizeText(p.notlar).includes(searchKayitliNorm)
        );
      })
    : filteredPuantajlar;

  // Departmana göre gruplama helper
  const groupByDepartman = (items, depAccessor) => {
    const groups = {};
    items.forEach(item => {
      const dep = depAccessor(item);
      const key = (dep && String(dep).trim()) ? dep : 'Belirtilmemiş';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    const keys = Object.keys(groups).sort((a, b) => {
      if (a === 'Belirtilmemiş') return 1;
      if (b === 'Belirtilmemiş') return -1;
      return a.localeCompare(b, 'tr');
    });
    return keys.map(k => ({ departman: k, items: groups[k] }));
  };

  // Personel id -> departman lookup map
  const personelDepartmanMap = React.useMemo(() => {
    const m = {};
    personeller.forEach(p => { m[p.id] = p.departman || ''; });
    return m;
  }, [personeller]);

  const groupedKayitSiz = React.useMemo(
    () => groupByDepartman(filteredKayitSizPersoneller, (p) => p.departman),
    [filteredKayitSizPersoneller]
  );

  const groupedKayitli = React.useMemo(
    () => groupByDepartman(filteredKayitliPuantajlar, (p) => personelDepartmanMap[p.personel_id] || ''),
    [filteredKayitliPuantajlar, personelDepartmanMap]
  );

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
  }, [formData.tarih, formData.tarih_bitis]);

  // Tarih aralığındaki tüm günleri döner (YYYY-MM-DD formatında)
  const getDatesInRange = (startStr, endStr) => {
    const dates = [];
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
    const cur = new Date(start);
    while (cur <= end) {
      // Pazar günlerini atla seçeneği aktifse
      if (!skipSundays || cur.getDay() !== 0) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
      }
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  const handleTopluKaydet = async () => {
    if (seciliPersoneller.length === 0) {
      toast.error('Lütfen en az bir personel seçin');
      return;
    }

    const baslangic = formData.tarih;
    const bitis = formData.tarih_bitis || formData.tarih;
    if (bitis < baslangic) {
      toast.error('Bitiş tarihi başlangıç tarihinden önce olamaz');
      return;
    }

    const dateList = getDatesInRange(baslangic, bitis);
    if (dateList.length === 0) {
      toast.error('Seçilen tarih aralığında uygulanacak gün bulunamadı');
      return;
    }

    setSaving(true);
    try {
      const fazlaMesai = parseFloat(formData.fazla_mesai) || 0;
      const secilenTesis = tesisler.find(t => t.id === formData.tesis_id);

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
          fazla_mesai: fazlaMesai,
          tesis_id: formData.tesis_id,
          tesis_adi: secilenTesis?.tesis_adi || ''
        };
      });

      // Her tarih için ayrı toplu istek gönder
      let toplamKayit = 0;
      for (const tarih of dateList) {
        const payload = { tarih, kayitlar };
        await axios.post(`${API_URL}/puantaj/toplu`, payload, { headers });
        toplamKayit += kayitlar.length;
      }

      if (dateList.length === 1) {
        toast.success(`${seciliPersoneller.length} personel için puantaj kaydedildi`);
      } else {
        toast.success(`${dateList.length} gün × ${seciliPersoneller.length} personel = ${toplamKayit} kayıt işlendi`);
      }

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

  // Puantaj düzenleme
  const handleEditPuantaj = (puantaj) => {
    setEditingPuantaj({
      ...puantaj,
      fazla_mesai: puantaj.fazla_mesai?.toString() || '0'
    });
    setEditDialogOpen(true);
  };

  const handleUpdatePuantaj = async () => {
    if (!editingPuantaj) return;
    
    try {
      const secilenTesis = tesisler.find(t => t.id === editingPuantaj.tesis_id);
      const payload = {
        tarih: editingPuantaj.tarih,
        kayitlar: [{
          personel_id: editingPuantaj.personel_id,
          personel_adi: editingPuantaj.personel_adi,
          giris_saati: editingPuantaj.giris_saati || '',
          cikis_saati: editingPuantaj.cikis_saati || '',
          durum: editingPuantaj.durum || 'geldi',
          notlar: editingPuantaj.notlar || '',
          mesai_suresi: 0,
          fazla_mesai: parseFloat(editingPuantaj.fazla_mesai) || 0,
          tesis_id: editingPuantaj.tesis_id || '',
          tesis_adi: secilenTesis?.tesis_adi || editingPuantaj.tesis_adi || ''
        }]
      };
      
      await axios.post(`${API_URL}/puantaj/toplu`, payload, { headers });
      toast.success('Puantaj kaydı güncellendi');
      setEditDialogOpen(false);
      setEditingPuantaj(null);
      fetchPuantajlar();
    } catch (e) {
      console.error(e);
      toast.error('Güncelleme başarısız');
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
          {/* Tesis Yönetimi Dialog */}
          <Dialog open={tesisDialogOpen} onOpenChange={setTesisDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-slate-700">
                <Building2 className="w-4 h-4 mr-2" />
                Tesis Yönetimi
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white">Tesis Yönetimi</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Yeni Tesis Ekle */}
                <div className="p-4 bg-slate-800 rounded-lg space-y-3">
                  <h4 className="text-sm font-medium text-slate-300">Yeni Tesis Ekle</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Tesis Adı"
                      value={yeniTesis.tesis_adi}
                      onChange={(e) => setYeniTesis({...yeniTesis, tesis_adi: e.target.value})}
                      className="bg-slate-950 border-slate-700"
                    />
                    <Input
                      placeholder="Adres (Opsiyonel)"
                      value={yeniTesis.adres}
                      onChange={(e) => setYeniTesis({...yeniTesis, adres: e.target.value})}
                      className="bg-slate-950 border-slate-700"
                    />
                  </div>
                  <Button onClick={handleAddTesis} size="sm" className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-1" /> Ekle
                  </Button>
                </div>
                
                {/* Mevcut Tesisler */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {tesisler.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">Henüz tesis eklenmemiş</p>
                  ) : (
                    tesisler.map(tesis => (
                      <div key={tesis.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                        {editingTesis?.id === tesis.id ? (
                          <div className="flex-1 flex gap-2 mr-2">
                            <Input
                              value={editingTesis.tesis_adi}
                              onChange={(e) => setEditingTesis({...editingTesis, tesis_adi: e.target.value})}
                              className="bg-slate-950 border-slate-700 h-8"
                            />
                            <Button onClick={handleUpdateTesis} size="sm" className="bg-green-600 h-8">Kaydet</Button>
                            <Button onClick={() => setEditingTesis(null)} size="sm" variant="ghost" className="h-8">İptal</Button>
                          </div>
                        ) : (
                          <>
                            <div>
                              <p className="text-white font-medium">{tesis.tesis_adi}</p>
                              {tesis.adres && <p className="text-slate-400 text-xs">{tesis.adres}</p>}
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-blue-400"
                                onClick={() => setEditingTesis(tesis)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-red-400"
                                onClick={() => handleDeleteTesis(tesis.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Özet İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Seçili Tarih{isDateRange ? ' Aralığı' : ''}</p>
            <p className="text-lg font-bold text-white">
              {isDateRange
                ? `${formData.tarih} → ${formData.tarih_bitis}`
                : formData.tarih}
            </p>
            {isDateRange && (
              <p className="text-xs text-blue-400 mt-1">
                {getDatesInRange(formData.tarih, formData.tarih_bitis).length} gün
              </p>
            )}
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
          <div className="grid grid-cols-2 md:grid-cols-9 gap-4 items-end">
            <div>
              <Label className="text-slate-300">Başlangıç Tarihi</Label>
              <Input
                type="date"
                value={formData.tarih}
                onChange={(e) => {
                  const yeniBaslangic = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    tarih: yeniBaslangic,
                    // Bitiş tarihi başlangıçtan önce ise otomatik eşitle
                    tarih_bitis: (prev.tarih_bitis && prev.tarih_bitis >= yeniBaslangic) ? prev.tarih_bitis : yeniBaslangic
                  }));
                }}
                className="bg-slate-950 border-slate-700 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300">Bitiş Tarihi</Label>
              <Input
                type="date"
                value={formData.tarih_bitis || formData.tarih}
                min={formData.tarih}
                onChange={(e) => setFormData({...formData, tarih_bitis: e.target.value})}
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
                  {DURUM_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${opt.color}`} /> {opt.label}
                        </span>
                      </SelectItem>
                    );
                  })}
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
            <div>
              <Label className="text-slate-300">Tesis</Label>
              <Select 
                value={formData.tesis_id || "none"} 
                onValueChange={(value) => setFormData({...formData, tesis_id: value === "none" ? "" : value})}
              >
                <SelectTrigger className="bg-slate-950 border-slate-700 mt-1">
                  <SelectValue placeholder="Tesis seçin" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="none">Seçiniz</SelectItem>
                  {tesisler.map(tesis => (
                    <SelectItem key={tesis.id} value={tesis.id}>
                      <span className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-400" /> {tesis.tesis_adi}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {/* Tarih aralığı bilgi şeridi */}
          {(() => {
            const baslangic = formData.tarih;
            const bitis = formData.tarih_bitis || formData.tarih;
            const dateList = getDatesInRange(baslangic, bitis);
            const totalDays = dateList.length;
            const isRange = baslangic !== bitis;
            return (
              <div className="mt-4 flex items-center justify-between flex-wrap gap-3 p-3 rounded-md bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-300">
                    {isRange ? (
                      <>
                        <span className="text-blue-300 font-semibold">{baslangic}</span>
                        <span className="text-slate-500"> → </span>
                        <span className="text-blue-300 font-semibold">{bitis}</span>
                        <span className="text-slate-400"> arasında </span>
                        <span className="text-white font-semibold">{totalDays}</span>
                        <span className="text-slate-400"> gün</span>
                        {skipSundays && <span className="text-amber-400 ml-1">(Pazarlar hariç)</span>}
                      </>
                    ) : (
                      <>
                        <span className="text-blue-300 font-semibold">{baslangic}</span>
                        <span className="text-slate-400"> tarihine </span>
                        <span className="text-white font-semibold">1</span>
                        <span className="text-slate-400"> gün</span>
                      </>
                    )}
                    {seciliPersoneller.length > 0 && (
                      <>
                        <span className="text-slate-500"> × </span>
                        <span className="text-white font-semibold">{seciliPersoneller.length}</span>
                        <span className="text-slate-400"> personel </span>
                        <span className="text-slate-500"> = </span>
                        <span className="text-green-400 font-semibold">{totalDays * seciliPersoneller.length}</span>
                        <span className="text-slate-400"> kayıt</span>
                      </>
                    )}
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-300">
                  <Checkbox
                    checked={skipSundays}
                    onCheckedChange={(c) => setSkipSundays(!!c)}
                  />
                  Pazar günlerini atla
                </label>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Alt Kısım - Kayıt Girilmemiş Personel Listesi */}
      <Card className="glass-effect border-slate-800 mb-6">
        <CardHeader className="border-b border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              {isDateRange ? 'Personel Seçimi (Tarih Aralığı)' : 'Kayıt Girilmemiş Personeller'}
              <span className="text-sm font-normal text-slate-400 ml-2">
                ({filteredKayitSizPersoneller.length}/{kayitSizPersoneller.length} kişi)
              </span>
            </CardTitle>
            <div className="flex items-center gap-4 flex-wrap">
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
          {/* İsim Arama */}
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="İsim, departman veya pozisyon ara..."
              value={searchKayitSiz}
              onChange={(e) => setSearchKayitSiz(e.target.value)}
              className="bg-slate-950 border-slate-700 pl-10 pr-10 text-white placeholder:text-slate-500"
            />
            {searchKayitSiz && (
              <button
                type="button"
                onClick={() => setSearchKayitSiz('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Aramayı temizle"
              >
                <X className="w-4 h-4" />
              </button>
            )}
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
          ) : filteredKayitSizPersoneller.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">"{searchKayitSiz}" ile eşleşen personel bulunamadı</p>
              <p className="text-sm mt-1">Aramayı değiştirin veya temizleyin.</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-950">
                  <TableRow className="border-slate-800 bg-slate-900/95 backdrop-blur">
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
                  {groupedKayitSiz.map((grup) => (
                    <React.Fragment key={`ks-${grup.departman}`}>
                      <TableRow className="border-slate-800 bg-blue-900/20 hover:bg-blue-900/30">
                        <TableCell colSpan={4} className="py-2">
                          <div className="flex items-center gap-2 text-sm font-semibold text-blue-300">
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
                            <span className="uppercase tracking-wide">{grup.departman}</span>
                            <span className="text-slate-400 font-normal">({grup.items.length} kişi)</span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {grup.items.map((personel, idx) => {
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
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Günlük Kayıtlar Tablosu */}
      <Card className="glass-effect border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {formData.tarih} Tarihli Kayıtlar
              <span className="text-sm font-normal text-slate-400 ml-2">
                ({filteredKayitliPuantajlar.length}/{filteredPuantajlar.length} kişi)
              </span>
            </CardTitle>
          </div>
          {/* İsim Arama */}
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="İsim, departman veya not ara..."
              value={searchKayitli}
              onChange={(e) => setSearchKayitli(e.target.value)}
              className="bg-slate-950 border-slate-700 pl-10 pr-10 text-white placeholder:text-slate-500"
            />
            {searchKayitli && (
              <button
                type="button"
                onClick={() => setSearchKayitli('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Aramayı temizle"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
          ) : filteredPuantajlar.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Bu tarihte henüz kayıt bulunmuyor</div>
          ) : filteredKayitliPuantajlar.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">"{searchKayitli}" ile eşleşen kayıt bulunamadı</p>
              <p className="text-sm mt-1">Aramayı değiştirin veya temizleyin.</p>
            </div>
          ) : (
            <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-950">
                  <TableRow className="border-slate-800 bg-slate-900/95 backdrop-blur">
                    <TableHead className="text-slate-300">Personel</TableHead>
                    <TableHead className="text-slate-300">Durum</TableHead>
                    <TableHead className="text-slate-300">Giriş</TableHead>
                    <TableHead className="text-slate-300">Çıkış</TableHead>
                    <TableHead className="text-slate-300">Fazla Mesai</TableHead>
                    <TableHead className="text-slate-300">Tesis</TableHead>
                    <TableHead className="text-slate-300">Not</TableHead>
                    <TableHead className="text-slate-300 w-16">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedKayitli.map((grup) => (
                    <React.Fragment key={`kl-${grup.departman}`}>
                      <TableRow className="border-slate-800 bg-blue-900/20 hover:bg-blue-900/30">
                        <TableCell colSpan={8} className="py-2">
                          <div className="flex items-center gap-2 text-sm font-semibold text-blue-300">
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
                            <span className="uppercase tracking-wide">{grup.departman}</span>
                            <span className="text-slate-400 font-normal">({grup.items.length} kişi)</span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {grup.items.map((p, idx) => {
                        const durumInfo = getDurumInfo(p.durum || 'geldi');
                        const DurumIcon = durumInfo.icon;
                        return (
                          <TableRow key={p.id} className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'}`}>
                            <TableCell className="font-medium text-white">{p.personel_adi}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${durumInfo.badgeClass}`}>
                                <DurumIcon className="w-3.5 h-3.5" />
                                {durumInfo.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-green-400">{p.giris_saati || '-'}</TableCell>
                            <TableCell className="text-red-400">{p.cikis_saati || '-'}</TableCell>
                            <TableCell className="text-orange-400">{p.fazla_mesai?.toFixed(1) || '0'}</TableCell>
                            <TableCell className="text-blue-400">{p.tesis_adi || '-'}</TableCell>
                            <TableCell className="text-slate-400 text-sm">{p.notlar || '-'}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10" onClick={() => handleEditPuantaj(p)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDeletePuantaj(p.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Puantaj Düzenleme Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Puantaj Düzenle</DialogTitle>
          </DialogHeader>
          {editingPuantaj && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Personel</Label>
                <Input value={editingPuantaj.personel_adi} disabled className="bg-slate-950 border-slate-700 mt-1" />
              </div>
              <div>
                <Label className="text-slate-300">Durum</Label>
                <Select
                  value={editingPuantaj.durum || 'geldi'}
                  onValueChange={(value) => setEditingPuantaj({...editingPuantaj, durum: value})}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-700 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {DURUM_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${opt.color}`} /> {opt.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Giriş Saati</Label>
                  <Input
                    type="time"
                    value={editingPuantaj.giris_saati || ''}
                    onChange={(e) => setEditingPuantaj({...editingPuantaj, giris_saati: e.target.value})}
                    className="bg-slate-950 border-slate-700 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Çıkış Saati</Label>
                  <Input
                    type="time"
                    value={editingPuantaj.cikis_saati || ''}
                    onChange={(e) => setEditingPuantaj({...editingPuantaj, cikis_saati: e.target.value})}
                    className="bg-slate-950 border-slate-700 mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Fazla Mesai (Saat)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editingPuantaj.fazla_mesai}
                    onChange={(e) => setEditingPuantaj({...editingPuantaj, fazla_mesai: e.target.value})}
                    className="bg-slate-950 border-slate-700 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Tesis</Label>
                  <Select 
                    value={editingPuantaj.tesis_id || "none"} 
                    onValueChange={(value) => setEditingPuantaj({...editingPuantaj, tesis_id: value === "none" ? "" : value})}
                  >
                    <SelectTrigger className="bg-slate-950 border-slate-700 mt-1">
                      <SelectValue placeholder="Tesis seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="none">Seçiniz</SelectItem>
                      {tesisler.map(tesis => (
                        <SelectItem key={tesis.id} value={tesis.id}>{tesis.tesis_adi}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Not</Label>
                <Input
                  value={editingPuantaj.notlar || ''}
                  onChange={(e) => setEditingPuantaj({...editingPuantaj, notlar: e.target.value})}
                  placeholder="Not ekleyin..."
                  className="bg-slate-950 border-slate-700 mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="border-slate-700">
                  İptal
                </Button>
                <Button onClick={handleUpdatePuantaj} className="bg-green-600 hover:bg-green-700">
                  Kaydet
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Puantaj;
