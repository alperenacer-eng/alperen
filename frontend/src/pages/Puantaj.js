import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useCustomDurumlar } from '@/context/CustomDurumlarContext';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useColumnOrder } from '@/hooks/useColumnOrder';
import { DraggableTableHead } from '@/components/DraggableTableHead';
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
  Home, Flag, PartyPopper, Ban, Search, X, Sun, User, CalendarDays, Wand2, Heart, Baby
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Puantaj durum tanımları (yerleşik durumlar — custom durumlar bunlara eklenir)
const BASE_DURUM_OPTIONS = [
  { value: 'geldi', label: 'Geldi', icon: CheckCircle2, color: 'text-green-500', badgeClass: 'bg-green-500/20 text-green-400 border-green-500/40' },
  { value: 'izinli', label: 'İzinli', icon: FileText, color: 'text-blue-500', badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  { value: 'raporlu', label: 'Raporlu', icon: AlertCircle, color: 'text-yellow-500', badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
  { value: 'hafta_tatili', label: 'Hafta Tatili', icon: Home, color: 'text-purple-500', badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  { value: 'resmi_tatil', label: 'Resmi Tatil', icon: Flag, color: 'text-orange-500', badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  { value: 'bayram_tatili', label: 'Bayram Tatili', icon: PartyPopper, color: 'text-pink-500', badgeClass: 'bg-pink-500/20 text-pink-400 border-pink-500/40' },
  { value: 'izinsiz_gelmedi', label: 'İzinsiz Gelmedi', icon: Ban, color: 'text-rose-600', badgeClass: 'bg-rose-600/20 text-rose-400 border-rose-600/40' },
  { value: 'olum_izni', label: 'Ölüm İzni', icon: Heart, color: 'text-gray-400', badgeClass: 'bg-gray-500/20 text-gray-300 border-gray-500/40' },
  { value: 'dogum_izni', label: 'Doğum İzni', icon: Baby, color: 'text-teal-400', badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
  { value: 'pazar_calismasi', label: 'Pazar Çalışması', icon: Sun, color: 'text-cyan-500', badgeClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' },
  { value: 'resmi_tatil_calisti', label: 'Resmi Tatil Çalıştı', icon: Flag, color: 'text-amber-500', badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  { value: 'bayram_calisti', label: 'Bayram Çalıştı', icon: PartyPopper, color: 'text-fuchsia-500', badgeClass: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40' },
];

// Custom durumu DURUM_OPTIONS biçimine çevirir
const mapCustomToOption = (c) => ({
  value: c.value,
  label: c.label,
  icon: Wand2,  // custom durumlar için generic icon
  color: c.color_class || 'text-amber-400',
  badgeClass: c.badge_class || 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  isCustom: true,
  tip: c.tip,
  def_carpan: c.def_carpan,
});

// Özel Durum Yönetimi Diyaloğu
const CustomDurumYonetimDialog = ({ durumlar = [], onAdd, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [tip, setTip] = useState('gunluk');
  const [carpan, setCarpan] = useState('1.0');
  const [saving, setSaving] = useState(false);

  const handleEkle = async () => {
    if (!label.trim()) { toast.error('Durum adı boş olamaz'); return; }
    const c = parseFloat(carpan);
    if (isNaN(c) || c < 0) { toast.error('Geçerli bir çarpan girin'); return; }
    setSaving(true);
    try {
      await onAdd({ label: label.trim(), tip, def_carpan: c });
      toast.success(`"${label}" durumu eklendi`);
      setLabel(''); setTip('gunluk'); setCarpan('1.0');
    } catch (err) {
      console.error(err);
      toast.error('Eklenemedi: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (d) => {
    try {
      await onUpdate(d.id, { is_active: d.is_active ? 0 : 1 });
      toast.success(d.is_active ? `"${d.label}" pasifleştirildi` : `"${d.label}" aktifleştirildi`);
    } catch (err) {
      toast.error('Güncellenemedi');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-amber-700/60 text-amber-300 hover:bg-amber-600/10" data-testid="custom-durum-yonet-btn">
          <Wand2 className="w-4 h-4 mr-2" />
          Durum Yönet
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-amber-400" />
            Özel Puantaj Durumu Yönetimi
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Yeni Durum Ekle */}
          <div className="p-4 bg-slate-800/60 rounded-lg space-y-3 border border-slate-700">
            <h4 className="text-sm font-semibold text-amber-300">Yeni Özel Durum Ekle</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input
                placeholder="Durum Adı (örn. Eğitim İzni)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="bg-slate-950 border-slate-700 md:col-span-1"
                data-testid="custom-durum-label-input"
              />
              <select
                value={tip}
                onChange={(e) => setTip(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200"
                data-testid="custom-durum-tip-select"
              >
                <option value="gunluk">Günlük (gün başına çarpan)</option>
                <option value="saatlik">Saatlik (saat başına çarpan)</option>
              </select>
              <Input
                type="number"
                step="0.1"
                placeholder="Çarpan (örn. 1.0)"
                value={carpan}
                onChange={(e) => setCarpan(e.target.value)}
                className="bg-slate-950 border-slate-700"
                data-testid="custom-durum-carpan-input"
              />
            </div>
            <Button
              onClick={handleEkle}
              disabled={saving}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              data-testid="custom-durum-ekle-btn"
            >
              <Plus className="w-4 h-4 mr-1" />
              {saving ? 'Kaydediliyor...' : 'Ekle'}
            </Button>
            <p className="text-[11px] text-slate-500">
              Renk otomatik atanır. Yeni durum hemen Puantaj, Belirleme, Raporlama ve Bordro modüllerinde kullanılabilir olur.
            </p>
          </div>

          {/* Mevcut Özel Durumlar */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-2">
              Mevcut Özel Durumlar ({durumlar.length})
            </h4>
            <div className="space-y-2 max-h-72 overflow-y-auto" data-testid="custom-durum-liste">
              {durumlar.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">Henüz özel durum eklenmemiş</p>
              ) : durumlar.map(d => (
                <div
                  key={d.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${d.is_active ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-900/40 border-slate-800 opacity-60'}`}
                  data-testid={`custom-durum-row-${d.id}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${d.color_class?.replace('text-', 'bg-') || 'bg-amber-400'}`} />
                    <div className="flex-1">
                      <div className={`font-semibold ${d.color_class || 'text-amber-400'}`}>{d.label}</div>
                      <div className="text-xs text-slate-500">
                        {d.tip === 'saatlik' ? 'Saatlik' : 'Günlük'} · Çarpan: {d.def_carpan}
                        {!d.is_active && <span className="ml-2 text-rose-400">(Pasif)</span>}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(d)}
                    className={d.is_active ? 'border-rose-700 text-rose-300 hover:bg-rose-600/10' : 'border-emerald-700 text-emerald-300 hover:bg-emerald-600/10'}
                    data-testid={`custom-durum-toggle-${d.id}`}
                  >
                    {d.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Puantaj = () => {
  const { token } = useAuth();
  const { activeCustomDurumlar, addDurum: addCustomDurum, updateDurum: updateCustomDurum, customDurumlar } = useCustomDurumlar();
  // Merged DURUM_OPTIONS: yerleşik + aktif custom durumlar
  const DURUM_OPTIONS = React.useMemo(() => [
    ...BASE_DURUM_OPTIONS,
    ...activeCustomDurumlar.map(mapCustomToOption),
  ], [activeCustomDurumlar]);
  const getDurumInfo = (val) => DURUM_OPTIONS.find(d => d.value === val) || DURUM_OPTIONS[0];
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

  // Aktif sekme
  const [activeTab, setActiveTab] = useState('gunluk');

  // === Toplu Puantaj (Bireysel) Sekmesi State'leri ===
  const [topluPersonelId, setTopluPersonelId] = useState('');
  const [topluBaslangic, setTopluBaslangic] = useState(new Date().toISOString().split('T')[0]);
  const [topluBitis, setTopluBitis] = useState(new Date().toISOString().split('T')[0]);
  const [topluSkipSundays, setTopluSkipSundays] = useState(false);
  const [topluPersonelSearch, setTopluPersonelSearch] = useState('');
  // Şablon (varsayılan) değerler - "Tüm günlere uygula" için
  const [topluTemplate, setTopluTemplate] = useState({
    durum: 'geldi',
    giris_saati: '08:00',
    cikis_saati: '17:00',
    fazla_mesai: '0',
    tesis_id: '',
    notlar: ''
  });
  // Her tarih için ayrı satır verileri
  const [topluRows, setTopluRows] = useState({}); // { 'YYYY-MM-DD': { durum, giris_saati, cikis_saati, fazla_mesai, tesis_id, notlar } }
  const [topluSaving, setTopluSaving] = useState(false);
  // Takvimden seçilen tarihler (Set)
  const [selectedCalendarDates, setSelectedCalendarDates] = useState(new Set());

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
      let toplamAtlanan = 0;
      const atlananDetay = [];
      for (const tarih of dateList) {
        const payload = { tarih, kayitlar, overwrite: false };
        const resp = await axios.post(`${API_URL}/puantaj/toplu`, payload, { headers });
        const resData = resp?.data || {};
        toplamKayit += (resData.created_count || 0) + (resData.updated_count || 0);
        toplamAtlanan += (resData.skipped_count || 0);
        if (Array.isArray(resData.skipped)) {
          resData.skipped.forEach(s => atlananDetay.push(`${s.personel_adi} (${s.tarih})`));
        }
      }

      if (toplamAtlanan > 0) {
        const ornekler = atlananDetay.slice(0, 5).join(', ');
        const digerleri = atlananDetay.length > 5 ? ` ve ${atlananDetay.length - 5} diğer` : '';
        toast.warning(`${toplamAtlanan} mükerrer kayıt atlandı: ${ornekler}${digerleri}. Değiştirmek için mevcut kaydı düzenleyin.`, { duration: 6000 });
      }
      if (toplamKayit > 0) {
        if (dateList.length === 1) {
          toast.success(`${toplamKayit} personel için puantaj kaydedildi`);
        } else {
          toast.success(`${dateList.length} gün üzerinde ${toplamKayit} kayıt işlendi`);
        }
      } else if (toplamAtlanan > 0) {
        toast.error('Yeni kayıt oluşturulmadı — seçili personellerin bu tarihte zaten kaydı var.');
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
        overwrite: true, // düzenleme: mevcut kaydı güncelle
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

  // ======================================================
  // TOPLU PUANTAJ (Bireysel) - Helper'lar ve Effect'ler
  // ======================================================

  // Tarih aralığındaki günleri liste olarak döner (toplu tab için)
  const topluDates = React.useMemo(() => {
    const dates = [];
    if (!topluBaslangic || !topluBitis) return dates;
    const start = new Date(topluBaslangic + 'T00:00:00');
    const end = new Date(topluBitis + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return dates;
    const cur = new Date(start);
    while (cur <= end) {
      if (!topluSkipSundays || cur.getDay() !== 0) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
      }
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }, [topluBaslangic, topluBitis, topluSkipSundays]);

  // Türkçe gün adı
  const getGunAdi = (dateStr) => {
    const gunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const d = new Date(dateStr + 'T00:00:00');
    return gunler[d.getDay()];
  };

  // Personel arama filtresi (toplu sekme)
  const filteredTopluPersoneller = React.useMemo(() => {
    const q = normalizeText(topluPersonelSearch.trim());
    if (!q) return personeller;
    return personeller.filter(p =>
      normalizeText(p.ad_soyad).includes(q) ||
      normalizeText(p.departman).includes(q) ||
      normalizeText(p.pozisyon).includes(q)
    );
  }, [personeller, topluPersonelSearch]);

  // Personel veya tarih değiştiğinde - mevcut puantaj kayıtlarını yükle ve satırları başlat
  useEffect(() => {
    if (!topluPersonelId || topluDates.length === 0) {
      setTopluRows({});
      return;
    }
    const newRows = {};
    topluDates.forEach(d => {
      const existing = puantajlar.find(p => p.personel_id === topluPersonelId && p.tarih === d);
      if (existing) {
        newRows[d] = {
          durum: existing.durum || 'geldi',
          giris_saati: existing.giris_saati || '',
          cikis_saati: existing.cikis_saati || '',
          fazla_mesai: (existing.fazla_mesai ?? 0).toString(),
          tesis_id: existing.tesis_id || '',
          notlar: existing.notlar || '',
          mevcut: true
        };
      } else {
        newRows[d] = {
          durum: '',
          giris_saati: '',
          cikis_saati: '',
          fazla_mesai: '0',
          tesis_id: '',
          notlar: '',
          mevcut: false
        };
      }
    });
    setTopluRows(newRows);
  }, [topluPersonelId, topluDates, puantajlar]);

  // Tek bir satırı güncelle
  const updateTopluRow = (date, field, value) => {
    setTopluRows(prev => ({
      ...prev,
      [date]: { ...(prev[date] || {}), [field]: value }
    }));
  };

  // Şablonu tüm günlere uygula
  const applyTemplateToAll = () => {
    if (topluDates.length === 0) {
      toast.error('Önce tarih aralığını seçin');
      return;
    }
    setTopluRows(prev => {
      const next = { ...prev };
      topluDates.forEach(d => {
        next[d] = {
          ...(next[d] || {}),
          durum: topluTemplate.durum,
          giris_saati: topluTemplate.durum === 'geldi' ? topluTemplate.giris_saati : '',
          cikis_saati: topluTemplate.durum === 'geldi' ? topluTemplate.cikis_saati : '',
          fazla_mesai: topluTemplate.durum === 'geldi' ? topluTemplate.fazla_mesai : '0',
          tesis_id: topluTemplate.tesis_id,
          notlar: topluTemplate.notlar
        };
      });
      return next;
    });
    toast.success(`Şablon ${topluDates.length} güne uygulandı`);
  };

  // Şablonu sadece takvimden seçilen günlere uygula + DİREKT KAYDET
  const applyTemplateToSelected = async () => {
    if (!topluPersonelId) {
      toast.error('Önce personel seçin');
      return;
    }
    if (selectedCalendarDates.size === 0) {
      toast.error('Önce takvimden gün seçin');
      return;
    }
    const personel = personeller.find(p => p.id === topluPersonelId);
    if (!personel) {
      toast.error('Personel bulunamadı');
      return;
    }
    const list = Array.from(selectedCalendarDates);
    const secilenTesis = tesisler.find(t => t.id === topluTemplate.tesis_id);
    const fazlaMesai = parseFloat(topluTemplate.fazla_mesai) || 0;

    // 1) UI'daki satırları güncelle
    setTopluRows(prev => {
      const next = { ...prev };
      list.forEach(d => {
        next[d] = {
          ...(next[d] || {}),
          durum: topluTemplate.durum,
          giris_saati: topluTemplate.durum === 'geldi' ? topluTemplate.giris_saati : '',
          cikis_saati: topluTemplate.durum === 'geldi' ? topluTemplate.cikis_saati : '',
          fazla_mesai: topluTemplate.durum === 'geldi' ? topluTemplate.fazla_mesai : '0',
          tesis_id: topluTemplate.tesis_id,
          notlar: topluTemplate.notlar
        };
      });
      return next;
    });

    // 2) Veritabanına kaydet
    setTopluSaving(true);
    try {
      let toplamAtlanan = 0;
      const atlananGunler = [];
      for (const tarih of list) {
        const payload = {
          tarih,
          overwrite: false,
          kayitlar: [{
            personel_id: topluPersonelId,
            personel_adi: personel.ad_soyad,
            giris_saati: topluTemplate.durum === 'geldi' ? topluTemplate.giris_saati : '',
            cikis_saati: topluTemplate.durum === 'geldi' ? topluTemplate.cikis_saati : '',
            durum: topluTemplate.durum,
            notlar: topluTemplate.notlar || '',
            mesai_suresi: 0,
            fazla_mesai: topluTemplate.durum === 'geldi' ? fazlaMesai : 0,
            tesis_id: topluTemplate.tesis_id || '',
            tesis_adi: secilenTesis?.tesis_adi || ''
          }]
        };
        const resp = await axios.post(`${API_URL}/puantaj/toplu`, payload, { headers });
        if ((resp?.data?.skipped_count || 0) > 0) {
          toplamAtlanan += resp.data.skipped_count;
          atlananGunler.push(tarih);
        }
      }
      const kaydedilen = list.length - toplamAtlanan;
      if (toplamAtlanan > 0) {
        toast.warning(`${toplamAtlanan} gün mükerrer olduğu için atlandı (${atlananGunler.slice(0, 5).join(', ')}${atlananGunler.length > 5 ? '...' : ''}). Değiştirmek için mevcut kaydı düzenleyin.`, { duration: 6000 });
      }
      if (kaydedilen > 0) {
        toast.success(`${kaydedilen} gün kaydedildi (raporlamaya yansıdı)`);
      } else if (toplamAtlanan > 0) {
        toast.error('Yeni kayıt oluşturulmadı — seçili günlerin tümünde zaten kayıt var.');
      }
      await fetchPuantajlar();
      setSelectedCalendarDates(new Set());
    } catch (e) {
      console.error(e);
      toast.error('Kayıt sırasında hata oluştu');
    } finally {
      setTopluSaving(false);
    }
  };

  // Sadece boş günlere uygula
  const applyTemplateToEmpty = () => {
    if (topluDates.length === 0) {
      toast.error('Önce tarih aralığını seçin');
      return;
    }
    let count = 0;
    setTopluRows(prev => {
      const next = { ...prev };
      topluDates.forEach(d => {
        const row = next[d] || {};
        if (!row.durum) {
          count++;
          next[d] = {
            ...row,
            durum: topluTemplate.durum,
            giris_saati: topluTemplate.durum === 'geldi' ? topluTemplate.giris_saati : '',
            cikis_saati: topluTemplate.durum === 'geldi' ? topluTemplate.cikis_saati : '',
            fazla_mesai: topluTemplate.durum === 'geldi' ? topluTemplate.fazla_mesai : '0',
            tesis_id: topluTemplate.tesis_id,
            notlar: topluTemplate.notlar
          };
        }
      });
      return next;
    });
    if (count > 0) toast.success(`${count} boş güne şablon uygulandı`);
    else toast.info('Boş gün bulunamadı');
  };

  // Takvimden gün seçimini toggle et (artık şablon UYGULAMIYOR, sadece seçim yapıyor)
  const toggleCalendarDate = (date) => {
    setSelectedCalendarDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  // Tüm günleri seç / seçimi temizle
  const selectAllCalendarDates = () => {
    setSelectedCalendarDates(new Set(topluDates));
  };
  const clearCalendarSelection = () => {
    setSelectedCalendarDates(new Set());
  };

  // Tarih aralığı / personel değişince seçimi temizle
  useEffect(() => {
    setSelectedCalendarDates(new Set());
  }, [topluPersonelId, topluBaslangic, topluBitis, topluSkipSundays]);

  // Tek bir güne şablonu uygula (artık takvim direkt uygulamıyor; manuel kullanım için tutuluyor)
  // eslint-disable-next-line no-unused-vars
  const applyTemplateToDate = (date) => {
    setTopluRows(prev => {
      const existing = prev[date] || {};
      return {
        ...prev,
        [date]: {
          ...existing,
          durum: topluTemplate.durum,
          giris_saati: topluTemplate.durum === 'geldi' ? topluTemplate.giris_saati : '',
          cikis_saati: topluTemplate.durum === 'geldi' ? topluTemplate.cikis_saati : '',
          fazla_mesai: topluTemplate.durum === 'geldi' ? topluTemplate.fazla_mesai : '0',
          tesis_id: topluTemplate.tesis_id,
          notlar: topluTemplate.notlar
        }
      };
    });
  };

  // Takvim grid - haftalara böl (Pazartesi başlangıçlı)
  const calendarWeeks = React.useMemo(() => {
    if (topluDates.length === 0) return [];
    const first = new Date(topluDates[0] + 'T00:00:00');
    const last = new Date(topluDates[topluDates.length - 1] + 'T00:00:00');
    // Pazartesi başlangıçlı haftaya hizala
    const startDow = (first.getDay() + 6) % 7; // 0=Pzt, 6=Pzr
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startDow);
    const endDow = (last.getDay() + 6) % 7;
    const gridEnd = new Date(last);
    gridEnd.setDate(last.getDate() + (6 - endDow));

    const weeks = [];
    let cur = new Date(gridStart);
    const dateSet = new Set(topluDates);
    while (cur <= gridEnd) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        week.push({
          dateStr,
          dayNum: cur.getDate(),
          monthIdx: cur.getMonth(),
          inRange: dateSet.has(dateStr),
          isSunday: cur.getDay() === 0
        });
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [topluDates]);

  // Satırı temizle
  const clearTopluRow = (date) => {
    setTopluRows(prev => ({
      ...prev,
      [date]: { durum: '', giris_saati: '', cikis_saati: '', fazla_mesai: '0', tesis_id: '', notlar: '', mevcut: prev[date]?.mevcut }
    }));
  };

  // Toplu kaydet
  const handleTopluBireyselKaydet = async () => {
    if (!topluPersonelId) {
      toast.error('Lütfen bir personel seçin');
      return;
    }
    if (topluDates.length === 0) {
      toast.error('Geçerli tarih aralığı seçin');
      return;
    }
    const personel = personeller.find(p => p.id === topluPersonelId);
    if (!personel) {
      toast.error('Personel bulunamadı');
      return;
    }

    // Sadece durum'u dolu olan günleri kaydet
    const kaydedilecekTarihler = topluDates.filter(d => {
      const r = topluRows[d];
      return r && r.durum;
    });

    if (kaydedilecekTarihler.length === 0) {
      toast.error('Kaydedilecek veri yok. Lütfen en az bir günün durumunu doldurun.');
      return;
    }

    setTopluSaving(true);
    try {
      let toplamAtlanan = 0;
      const atlananGunler = [];
      let kaydedilen = 0;
      for (const tarih of kaydedilecekTarihler) {
        const r = topluRows[tarih];
        const secilenTesis = tesisler.find(t => t.id === r.tesis_id);
        const payload = {
          tarih,
          overwrite: false,
          kayitlar: [{
            personel_id: topluPersonelId,
            personel_adi: personel.ad_soyad,
            giris_saati: r.durum === 'geldi' ? (r.giris_saati || '') : '',
            cikis_saati: r.durum === 'geldi' ? (r.cikis_saati || '') : '',
            durum: r.durum,
            notlar: r.notlar || '',
            mesai_suresi: 0,
            fazla_mesai: parseFloat(r.fazla_mesai) || 0,
            tesis_id: r.tesis_id || '',
            tesis_adi: secilenTesis?.tesis_adi || ''
          }]
        };
        const resp = await axios.post(`${API_URL}/puantaj/toplu`, payload, { headers });
        const skippedCount = resp?.data?.skipped_count || 0;
        if (skippedCount > 0) {
          toplamAtlanan += skippedCount;
          atlananGunler.push(tarih);
        } else {
          kaydedilen += 1;
        }
      }
      if (toplamAtlanan > 0) {
        toast.warning(`${toplamAtlanan} gün mükerrer olduğu için atlandı (${atlananGunler.slice(0, 5).join(', ')}${atlananGunler.length > 5 ? '...' : ''}). Değiştirmek için mevcut kaydı düzenleyin.`, { duration: 6000 });
      }
      if (kaydedilen > 0) {
        toast.success(`${personel.ad_soyad} için ${kaydedilen} gün kaydedildi`);
      } else if (toplamAtlanan > 0) {
        toast.error('Yeni kayıt oluşturulmadı — seçili günlerin tümünde zaten kayıt var.');
      }
      await fetchPuantajlar();
    } catch (e) {
      console.error(e);
      toast.error('Toplu kayıt sırasında hata oluştu');
    } finally {
      setTopluSaving(false);
    }
  };

  // Sürüklenebilir sütun sırası — Puantaj iç tabloları
  const puantajKayitSizOrder = useColumnOrder('puantaj-kayit-siz-cols', ['ad', 'dep', 'poz']);
  const puantajKayitliOrder = useColumnOrder('puantaj-kayitli-cols', ['ad', 'durum', 'giris', 'cikis', 'fm', 'tesis', 'not', 'islem']);
  const topluPuantajOrder = useColumnOrder('puantaj-toplu-tarih-cols', ['tarih', 'durum', 'giris', 'cikis', 'fm', 'tesis', 'not', 'islem']);

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
          <div className="flex gap-2">
          <CustomDurumYonetimDialog
            durumlar={customDurumlar}
            onAdd={addCustomDurum}
            onUpdate={updateCustomDurum}
          />
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
      </div>

      {/* SEKMELER */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList data-testid="puantaj-tabs" className="bg-slate-900/60 border border-slate-800 p-1 h-auto inline-flex">
          <TabsTrigger
            value="gunluk"
            data-testid="tab-gunluk"
            className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-slate-300 px-4 py-2"
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Günlük Toplu Giriş
          </TabsTrigger>
          <TabsTrigger
            value="toplu"
            data-testid="tab-toplu"
            className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-slate-300 px-4 py-2"
          >
            <User className="w-4 h-4 mr-2" />
            Toplu Puantaj
          </TabsTrigger>
        </TabsList>

        {/* === SEKME 1: Günlük Toplu Giriş (Mevcut) === */}
        <TabsContent value="gunluk" className="mt-4">

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
              {(() => {
                const ksCols = [
                  { key: 'ad', label: 'Personel Adı', cellRender: (p) => <TableCell key="ad" className="font-medium text-white">{p.ad_soyad}</TableCell> },
                  { key: 'dep', label: 'Departman', cellRender: (p) => <TableCell key="dep" className="text-slate-400">{p.departman || '-'}</TableCell> },
                  { key: 'poz', label: 'Pozisyon', cellRender: (p) => <TableCell key="poz" className="text-slate-400">{p.pozisyon || '-'}</TableCell> },
                ];
                const orderedKs = puantajKayitSizOrder.order.map(k => ksCols.find(c => c.key === k)).filter(Boolean);
                return (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-950">
                  <TableRow className="border-slate-800 bg-slate-900/95 backdrop-blur">
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    {orderedKs.map(col => (
                      <DraggableTableHead key={col.key} colKey={col.key} onReorder={puantajKayitSizOrder.reorder} className="text-slate-300">
                        {col.label}
                      </DraggableTableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedKayitSiz.map((grup) => (
                    <React.Fragment key={`ks-${grup.departman}`}>
                      <TableRow className="border-slate-800 bg-blue-900/20 hover:bg-blue-900/30">
                        <TableCell colSpan={orderedKs.length + 1} className="py-2">
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
                            {orderedKs.map(col => (
                              <React.Fragment key={col.key}>{col.cellRender(personel)}</React.Fragment>
                            ))}
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
                );
              })()}
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
              {(() => {
                const klCols = [
                  { key: 'ad', label: 'Personel', cellRender: (p) => <TableCell key="ad" className="font-medium text-white">{p.personel_adi}</TableCell> },
                  { key: 'durum', label: 'Durum', cellRender: (p) => {
                    const durumInfo = getDurumInfo(p.durum || 'geldi');
                    const DurumIcon = durumInfo.icon;
                    return (
                      <TableCell key="durum">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${durumInfo.badgeClass}`}>
                          <DurumIcon className="w-3.5 h-3.5" />
                          {durumInfo.label}
                        </span>
                      </TableCell>
                    );
                  }},
                  { key: 'giris', label: 'Giriş', cellRender: (p) => <TableCell key="giris" className="text-green-400">{p.giris_saati || '-'}</TableCell> },
                  { key: 'cikis', label: 'Çıkış', cellRender: (p) => <TableCell key="cikis" className="text-red-400">{p.cikis_saati || '-'}</TableCell> },
                  { key: 'fm', label: 'Fazla Mesai', cellRender: (p) => <TableCell key="fm" className="text-orange-400">{p.fazla_mesai?.toFixed(1) || '0'}</TableCell> },
                  { key: 'tesis', label: 'Tesis', cellRender: (p) => <TableCell key="tesis" className="text-blue-400">{p.tesis_adi || '-'}</TableCell> },
                  { key: 'not', label: 'Not', cellRender: (p) => <TableCell key="not" className="text-slate-400 text-sm">{p.notlar || '-'}</TableCell> },
                  { key: 'islem', label: 'İşlem', cellRender: (p) => (
                    <TableCell key="islem">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10" onClick={() => handleEditPuantaj(p)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDeletePuantaj(p.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )},
                ];
                const orderedKl = puantajKayitliOrder.order.map(k => klCols.find(c => c.key === k)).filter(Boolean);
                return (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-950">
                  <TableRow className="border-slate-800 bg-slate-900/95 backdrop-blur">
                    {orderedKl.map(col => (
                      <DraggableTableHead key={col.key} colKey={col.key} onReorder={puantajKayitliOrder.reorder} className="text-slate-300">
                        {col.label}
                      </DraggableTableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedKayitli.map((grup) => (
                    <React.Fragment key={`kl-${grup.departman}`}>
                      <TableRow className="border-slate-800 bg-blue-900/20 hover:bg-blue-900/30">
                        <TableCell colSpan={orderedKl.length} className="py-2">
                          <div className="flex items-center gap-2 text-sm font-semibold text-blue-300">
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
                            <span className="uppercase tracking-wide">{grup.departman}</span>
                            <span className="text-slate-400 font-normal">({grup.items.length} kişi)</span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {grup.items.map((p, idx) => (
                        <TableRow key={p.id} className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'}`}>
                          {orderedKl.map(col => (
                            <React.Fragment key={col.key}>{col.cellRender(p)}</React.Fragment>
                          ))}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

        </TabsContent>

        {/* === SEKME 2: Toplu Puantaj (Bireysel) === */}
        <TabsContent value="toplu" className="mt-4 space-y-6">

          {/* Üst Filtre - Personel & Tarih */}
          <Card className="glass-effect border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Toplu Puantaj - Bireysel Hızlı Giriş
              </CardTitle>
              <p className="text-slate-400 text-sm">
                Tek bir personel seçin, tarih aralığı belirleyin ve her gün için hızlıca puantaj girin.
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-slate-300">Personel</Label>
                  <Select
                    value={topluPersonelId || ""}
                    onValueChange={(v) => setTopluPersonelId(v)}
                  >
                    <SelectTrigger data-testid="toplu-personel-select" className="bg-slate-950 border-slate-700 mt-1">
                      <SelectValue placeholder="Personel seçin..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 max-h-80">
                      <div className="p-2 sticky top-0 bg-slate-900 border-b border-slate-800">
                        <Input
                          placeholder="Personel ara..."
                          value={topluPersonelSearch}
                          onChange={(e) => setTopluPersonelSearch(e.target.value)}
                          className="bg-slate-950 border-slate-700 h-8 text-sm"
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                      {filteredTopluPersoneller.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 text-sm">Personel bulunamadı</div>
                      ) : filteredTopluPersoneller.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex flex-col">
                            <span className="text-white">{p.ad_soyad}</span>
                            <span className="text-xs text-slate-400">{p.departman || '-'} · {p.pozisyon || '-'}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Başlangıç Tarihi</Label>
                  <Input
                    data-testid="toplu-baslangic"
                    type="date"
                    value={topluBaslangic}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTopluBaslangic(v);
                      if (topluBitis && topluBitis < v) setTopluBitis(v);
                    }}
                    className="bg-slate-950 border-slate-700 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Bitiş Tarihi</Label>
                  <Input
                    data-testid="toplu-bitis"
                    type="date"
                    value={topluBitis}
                    min={topluBaslangic}
                    onChange={(e) => setTopluBitis(e.target.value)}
                    className="bg-slate-950 border-slate-700 mt-1"
                  />
                </div>
              </div>

              {/* Bilgi şeridi */}
              <div className="flex items-center justify-between flex-wrap gap-3 p-3 rounded-md bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-300">
                    {topluPersonelId ? (
                      <>
                        <span className="text-orange-300 font-semibold">
                          {personeller.find(p => p.id === topluPersonelId)?.ad_soyad || '-'}
                        </span>
                        <span className="text-slate-400"> için </span>
                      </>
                    ) : (
                      <span className="text-slate-400">Personel seçilmedi · </span>
                    )}
                    <span className="text-blue-300 font-semibold">{topluBaslangic}</span>
                    <span className="text-slate-500"> → </span>
                    <span className="text-blue-300 font-semibold">{topluBitis}</span>
                    <span className="text-slate-400"> · </span>
                    <span className="text-white font-semibold">{topluDates.length}</span>
                    <span className="text-slate-400"> gün</span>
                    {topluSkipSundays && <span className="text-amber-400 ml-1">(Pazarlar hariç)</span>}
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-300">
                  <Checkbox
                    data-testid="toplu-skip-sundays"
                    checked={topluSkipSundays}
                    onCheckedChange={(c) => setTopluSkipSundays(!!c)}
                  />
                  Pazar günlerini atla
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Şablon - Varsayılan Değerler */}
          <Card className="glass-effect border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-orange-400" />
                Şablon (Tüm Günlere Hızlı Uygula)
              </CardTitle>
              <p className="text-slate-400 text-xs">
                Aşağıdaki değerleri doldurup butonlardan birine basarak günlere uygulayabilirsiniz.
              </p>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-7 gap-3 items-end">
                <div>
                  <Label className="text-slate-300 text-xs">Durum</Label>
                  <Select
                    value={topluTemplate.durum}
                    onValueChange={(v) => setTopluTemplate({ ...topluTemplate, durum: v })}
                  >
                    <SelectTrigger className="bg-slate-950 border-slate-700 mt-1 h-9">
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
                  <Label className="text-slate-300 text-xs">Giriş</Label>
                  <Input
                    type="time"
                    value={topluTemplate.giris_saati}
                    onChange={(e) => setTopluTemplate({ ...topluTemplate, giris_saati: e.target.value })}
                    disabled={topluTemplate.durum !== 'geldi'}
                    className="bg-slate-950 border-slate-700 mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-xs">Çıkış</Label>
                  <Input
                    type="time"
                    value={topluTemplate.cikis_saati}
                    onChange={(e) => setTopluTemplate({ ...topluTemplate, cikis_saati: e.target.value })}
                    disabled={topluTemplate.durum !== 'geldi'}
                    className="bg-slate-950 border-slate-700 mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-xs">Fazla Mesai</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={topluTemplate.fazla_mesai}
                    onChange={(e) => setTopluTemplate({ ...topluTemplate, fazla_mesai: e.target.value })}
                    disabled={topluTemplate.durum !== 'geldi'}
                    className="bg-slate-950 border-slate-700 mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-xs">Tesis</Label>
                  <Select
                    value={topluTemplate.tesis_id || "none"}
                    onValueChange={(v) => setTopluTemplate({ ...topluTemplate, tesis_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="bg-slate-950 border-slate-700 mt-1 h-9">
                      <SelectValue placeholder="Tesis" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="none">Seçiniz</SelectItem>
                      {tesisler.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.tesis_adi}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300 text-xs">Not</Label>
                  <Input
                    type="text"
                    value={topluTemplate.notlar}
                    onChange={(e) => setTopluTemplate({ ...topluTemplate, notlar: e.target.value })}
                    placeholder="Opsiyonel"
                    className="bg-slate-950 border-slate-700 mt-1 h-9"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    data-testid="apply-template-selected"
                    onClick={applyTemplateToSelected}
                    disabled={selectedCalendarDates.size === 0 || topluSaving}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 h-9 disabled:opacity-40"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    {topluSaving ? 'Kaydediliyor...' : `Uygula & Kaydet (${selectedCalendarDates.size})`}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      data-testid="apply-template-all"
                      onClick={applyTemplateToAll}
                      disabled={topluDates.length === 0}
                      size="sm"
                      variant="outline"
                      className="border-slate-700 text-slate-300 hover:text-white h-9 flex-1"
                    >
                      Tümüne
                    </Button>
                    <Button
                      data-testid="apply-template-empty"
                      onClick={applyTemplateToEmpty}
                      disabled={topluDates.length === 0}
                      size="sm"
                      variant="outline"
                      className="border-slate-700 text-slate-300 hover:text-white h-9 flex-1"
                    >
                      Boşlara
                    </Button>
                  </div>
                </div>
              </div>

              {/* TAKVIM - Tarih aralığındaki günler */}
              {topluDates.length > 0 && (
                <div className="mt-5 border-t border-slate-800 pt-5">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-orange-400" />
                      Takvimden Gün Seç
                      <span className="text-xs font-normal text-slate-400">
                        (Günleri seçin → "Uygula & Kaydet" ile direkt raporlamaya aktarılır)
                      </span>
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-orange-300 font-semibold">
                        {selectedCalendarDates.size} seçili
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={selectAllCalendarDates}
                        className="h-7 px-2 text-xs border-slate-700 text-slate-300 hover:text-white"
                      >
                        Tümünü Seç
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={clearCalendarSelection}
                        disabled={selectedCalendarDates.size === 0}
                        className="h-7 px-2 text-xs border-slate-700 text-slate-300 hover:text-white"
                      >
                        Seçimi Temizle
                      </Button>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700"></span>Boş
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-orange-500/40 border-2 border-orange-400"></span>Seçili
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-green-500/30 border border-green-500/60"></span>Doldurulmuş
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/60"></span>Mevcut Kayıt
                    </span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
                    {/* Gün başlıkları */}
                    <div className="grid grid-cols-7 gap-1.5 mb-2">
                      {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((g, i) => (
                        <div
                          key={g}
                          className={`text-center text-xs font-semibold py-1 ${i === 6 ? 'text-purple-300' : 'text-slate-400'}`}
                        >
                          {g}
                        </div>
                      ))}
                    </div>
                    {/* Hafta satırları */}
                    <div className="space-y-1.5">
                      {calendarWeeks.map((week, wi) => (
                        <div key={wi} className="grid grid-cols-7 gap-1.5">
                          {week.map((cell, ci) => {
                            if (!cell.inRange) {
                              return (
                                <div
                                  key={ci}
                                  className="h-16 rounded-md border border-dashed border-slate-800/50 bg-slate-900/30 opacity-40"
                                />
                              );
                            }
                            const row = topluRows[cell.dateStr] || {};
                            const hasData = !!row.durum;
                            const isSelected = selectedCalendarDates.has(cell.dateStr);
                            const durumInfo = hasData ? getDurumInfo(row.durum) : null;
                            const DurumIcon = durumInfo?.icon;
                            const isMevcut = row.mevcut;

                            // Sınıf seçimi: Seçili durumu öncelik
                            let cellClass = '';
                            if (isSelected) {
                              cellClass = 'bg-orange-500/30 border-2 border-orange-400 hover:bg-orange-500/40 shadow-md shadow-orange-500/20';
                            } else if (hasData) {
                              cellClass = isMevcut
                                ? 'bg-amber-500/20 border-amber-500/60 hover:bg-amber-500/30'
                                : 'bg-green-500/20 border-green-500/60 hover:bg-green-500/30';
                            } else if (cell.isSunday) {
                              cellClass = 'bg-purple-900/20 border-purple-800/40 hover:bg-purple-800/30';
                            } else {
                              cellClass = 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/60';
                            }

                            return (
                              <button
                                type="button"
                                key={ci}
                                data-testid={`calendar-cell-${cell.dateStr}`}
                                onClick={() => toggleCalendarDate(cell.dateStr)}
                                className={`relative h-16 rounded-md border text-left p-1.5 transition-all hover:scale-[1.03] hover:shadow-lg active:scale-95 ${cellClass}`}
                                title={`${cell.dateStr} — ${hasData ? durumInfo.label : 'Boş'} · ${isSelected ? 'Seçili (tıklayarak kaldır)' : 'Tıklayarak seç'}`}
                              >
                                <div className={`text-xs font-bold ${cell.isSunday && !hasData && !isSelected ? 'text-purple-300' : 'text-white'}`}>
                                  {cell.dayNum}
                                </div>
                                {isSelected && (
                                  <div className="absolute top-1 right-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-300" />
                                  </div>
                                )}
                                {hasData && DurumIcon && !isSelected && (
                                  <div className="absolute bottom-1 right-1.5 flex items-center gap-0.5">
                                    <DurumIcon className={`w-3.5 h-3.5 ${durumInfo.color}`} />
                                  </div>
                                )}
                                {hasData && row.giris_saati && (
                                  <div className="absolute bottom-1 left-1.5 text-[10px] font-medium text-slate-200 leading-none">
                                    {row.giris_saati}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Günler - Alt alta sıralı satırlar */}
          <Card className="glass-effect border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  Günlük Kayıtlar
                  <span className="text-sm font-normal text-slate-400 ml-2">
                    ({topluDates.length} gün listeleniyor)
                  </span>
                </CardTitle>
                <Button
                  data-testid="toplu-kaydet-btn"
                  onClick={handleTopluBireyselKaydet}
                  disabled={topluSaving || !topluPersonelId || topluDates.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {topluSaving ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!topluPersonelId ? (
                <div className="p-12 text-center text-slate-400">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">Lütfen önce bir personel seçin</p>
                  <p className="text-sm mt-1">Yukarıdaki listeden personel seçtiğinizde günler burada listelenecek.</p>
                </div>
              ) : topluDates.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">Geçerli tarih aralığı seçin</p>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                  {(() => {
                    const tpCols = [
                      { key: 'tarih', label: 'Tarih', headCls: 'text-slate-300 w-44',
                        cellRender: (d, row, isWeekend) => (
                          <TableCell key="tarih" className="font-medium">
                            <div className="flex flex-col">
                              <span className={`${isWeekend ? 'text-purple-300' : 'text-white'}`}>{d}</span>
                              <span className="text-xs text-slate-400">
                                {getGunAdi(d)}
                                {row.mevcut && <span className="ml-2 text-amber-400">· Mevcut kayıt</span>}
                              </span>
                            </div>
                          </TableCell>
                        )},
                      { key: 'durum', label: 'Durum', headCls: 'text-slate-300 w-44',
                        cellRender: (d, row) => (
                          <TableCell key="durum">
                            <Select value={row.durum || "none"} onValueChange={(v) => updateTopluRow(d, 'durum', v === "none" ? "" : v)}>
                              <SelectTrigger className="bg-slate-950 border-slate-700 h-8 text-xs">
                                <SelectValue placeholder="Seçiniz" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-700">
                                <SelectItem value="none">— Boş —</SelectItem>
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
                          </TableCell>
                        )},
                      { key: 'giris', label: 'Giriş', headCls: 'text-slate-300 w-28',
                        cellRender: (d, row, _w, durumDisabled) => (
                          <TableCell key="giris">
                            <Input type="time" value={row.giris_saati || ''} onChange={(e) => updateTopluRow(d, 'giris_saati', e.target.value)} disabled={durumDisabled} className="bg-slate-950 border-slate-700 h-8 text-xs" />
                          </TableCell>
                        )},
                      { key: 'cikis', label: 'Çıkış', headCls: 'text-slate-300 w-28',
                        cellRender: (d, row, _w, durumDisabled) => (
                          <TableCell key="cikis">
                            <Input type="time" value={row.cikis_saati || ''} onChange={(e) => updateTopluRow(d, 'cikis_saati', e.target.value)} disabled={durumDisabled} className="bg-slate-950 border-slate-700 h-8 text-xs" />
                          </TableCell>
                        )},
                      { key: 'fm', label: 'Fazla Mesai', headCls: 'text-slate-300 w-28',
                        cellRender: (d, row, _w, durumDisabled) => (
                          <TableCell key="fm">
                            <Input type="number" step="0.5" min="0" max="24" value={row.fazla_mesai ?? '0'} onChange={(e) => updateTopluRow(d, 'fazla_mesai', e.target.value)} disabled={durumDisabled} className="bg-slate-950 border-slate-700 h-8 text-xs" />
                          </TableCell>
                        )},
                      { key: 'tesis', label: 'Tesis', headCls: 'text-slate-300 w-40',
                        cellRender: (d, row) => (
                          <TableCell key="tesis">
                            <Select value={row.tesis_id || "none"} onValueChange={(v) => updateTopluRow(d, 'tesis_id', v === "none" ? "" : v)}>
                              <SelectTrigger className="bg-slate-950 border-slate-700 h-8 text-xs">
                                <SelectValue placeholder="Tesis" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-700">
                                <SelectItem value="none">Seçiniz</SelectItem>
                                {tesisler.map(t => (
                                  <SelectItem key={t.id} value={t.id}>{t.tesis_adi}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )},
                      { key: 'not', label: 'Not', headCls: 'text-slate-300',
                        cellRender: (d, row) => (
                          <TableCell key="not">
                            <Input type="text" value={row.notlar || ''} onChange={(e) => updateTopluRow(d, 'notlar', e.target.value)} placeholder="Not..." className="bg-slate-950 border-slate-700 h-8 text-xs" />
                          </TableCell>
                        )},
                      { key: 'islem', label: 'İşlem', headCls: 'text-slate-300 w-16',
                        cellRender: (d) => (
                          <TableCell key="islem">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-400" onClick={() => clearTopluRow(d)} title="Satırı temizle">
                              <X className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        )},
                    ];
                    const orderedTp = topluPuantajOrder.order.map(k => tpCols.find(c => c.key === k)).filter(Boolean);
                    return (
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-slate-950">
                      <TableRow className="border-slate-800 bg-slate-900/95 backdrop-blur">
                        {orderedTp.map(col => (
                          <DraggableTableHead key={col.key} colKey={col.key} onReorder={topluPuantajOrder.reorder} className={col.headCls}>
                            {col.label}
                          </DraggableTableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topluDates.map((d, idx) => {
                        const row = topluRows[d] || {};
                        const isWeekend = new Date(d + 'T00:00:00').getDay() === 0;
                        const durumDisabled = row.durum !== 'geldi';
                        return (
                          <TableRow
                            key={d}
                            data-testid={`toplu-row-${d}`}
                            className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'} ${isWeekend ? 'bg-purple-900/10' : ''}`}
                          >
                            {orderedTp.map(col => (
                              <React.Fragment key={col.key}>{col.cellRender(d, row, isWeekend, durumDisabled)}</React.Fragment>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>

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
