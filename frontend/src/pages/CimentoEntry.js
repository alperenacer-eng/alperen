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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit, Save, X, FileSpreadsheet, ArrowLeft, PlusCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "0,00";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const emptyRecord = {
  yukleme_tarihi: "",
  bosaltim_tarihi: "",
  irsaliye_no: "",
  fatura_no: "",
  vade_tarihi: "",
  giris_miktari: 0,
  kantar_kg_miktari: 0,
  birim_fiyat: 0,
  giris_kdv_orani: 20,
  nakliye_birim_fiyat: 0,
  nakliye_kdv_orani: 20,
  nakliye_tevkifat_orani: 0,
  plaka: "",
  nakliye_firmasi: "",
  sofor: "",
  sehir: "",
  cimento_alinan_firma: "",
  cimento_cinsi: "",
  bosaltim_isletmesi: "",
};

const CimentoEntry = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  
  const [records, setRecords] = useState([]);
  const [ozet, setOzet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRecord, setNewRecord] = useState(emptyRecord);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  
  // Kaynaklar
  const [plakalar, setPlakalar] = useState([]);
  const [nakliyeciFirmalar, setNakliyeciFirmalar] = useState([]);
  const [soforler, setSoforler] = useState([]);
  const [sehirler, setSehirler] = useState([]);
  const [cimentoFirmalar, setCimentoFirmalar] = useState([]);
  const [cimentoCinsleri, setCimentoCinsleri] = useState([]);
  const [cimentoIsletmeler, setCimentoIsletmeler] = useState([]);
  
  // Hızlı kaynak ekleme modalı
  const [quickAddModal, setQuickAddModal] = useState({ open: false, type: '', title: '' });
  const [quickAddValue, setQuickAddValue] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const fetchRecords = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/cimento-giris`, { headers });
      setRecords(response.data);
    } catch (e) {
      console.error(e);
      toast.error("Kayıtlar yüklenirken hata oluştu");
    }
  }, [token]);

  const fetchOzet = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/cimento-giris-ozet`, { headers });
      setOzet(response.data);
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  const fetchKaynaklar = useCallback(async () => {
    const authHeaders = { Authorization: `Bearer ${token}` };
    try {
      const [plakaRes, nakliyeciRes, soforRes, sehirRes, cimentoRes, cinsRes, isletmeRes] = await Promise.all([
        axios.get(`${API_URL}/plakalar`, { headers: authHeaders }),
        axios.get(`${API_URL}/nakliyeci-firmalar`, { headers: authHeaders }),
        axios.get(`${API_URL}/soforler`, { headers: authHeaders }),
        axios.get(`${API_URL}/sehirler`, { headers: authHeaders }),
        axios.get(`${API_URL}/cimento-firmalar`, { headers: authHeaders }),
        axios.get(`${API_URL}/cimento-cinsleri`, { headers: authHeaders }),
        axios.get(`${API_URL}/cimento-isletmeler`, { headers: authHeaders }),
      ]);
      setPlakalar(plakaRes.data);
      setNakliyeciFirmalar(nakliyeciRes.data);
      setSoforler(soforRes.data);
      setSehirler(sehirRes.data);
      setCimentoFirmalar(cimentoRes.data);
      setCimentoCinsleri(cinsRes.data);
      setCimentoIsletmeler(isletmeRes.data);
    } catch (e) {
      console.error('Kaynaklar yüklenirken hata:', e);
    }
  }, [token]);

  // Hızlı kaynak ekleme fonksiyonu
  const handleQuickAdd = async () => {
    if (!quickAddValue.trim()) {
      toast.error('Lütfen bir değer girin');
      return;
    }

    const endpoints = {
      'plaka': '/plakalar',
      'nakliyeci': '/nakliyeci-firmalar',
      'sofor': '/soforler',
      'sehir': '/sehirler',
      'cimento_firma': '/cimento-firmalar',
      'cimento_cins': '/cimento-cinsleri'
    };

    const fieldMap = {
      'plaka': 'plaka',
      'nakliyeci': 'name',
      'sofor': 'name',
      'sehir': 'name',
      'cimento_firma': 'name',
      'cimento_cins': 'name'
    };

    try {
      const body = quickAddModal.type === 'plaka' 
        ? { plaka: quickAddValue.trim() } 
        : { name: quickAddValue.trim() };
        
      const response = await axios.post(`${API_URL}${endpoints[quickAddModal.type]}`, body, { headers });

      if (response.data) {
        toast.success(`${quickAddModal.title} eklendi`);
        setQuickAddModal({ open: false, type: '', title: '' });
        setQuickAddValue('');
        fetchKaynaklar();
        
        // Eklenen değeri form'a otomatik seç
        const formFieldMap = {
          'plaka': 'plaka',
          'nakliyeci': 'nakliye_firmasi',
          'sofor': 'sofor',
          'sehir': 'sehir',
          'cimento_firma': 'cimento_alinan_firma',
          'cimento_cins': 'cimento_cinsi'
        };
        setNewRecord(prev => ({ ...prev, [formFieldMap[quickAddModal.type]]: quickAddValue.trim() }));
      }
    } catch (error) {
      console.error('Kaynak ekleme hatası:', error);
      toast.error('Ekleme başarısız');
    }
  };

  const openQuickAddModal = (type, title) => {
    setQuickAddModal({ open: true, type, title });
    setQuickAddValue('');
  };

  useEffect(() => {
    if (!currentModule || currentModule.id !== 'cimento') {
      navigate('/');
      return;
    }
    
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRecords(), fetchOzet(), fetchKaynaklar()]);
      setLoading(false);
    };
    loadData();
  }, [currentModule, fetchRecords, fetchOzet, fetchKaynaklar]);

  const handleAddRecord = async () => {
    if (!newRecord.plaka) {
      toast.error("Lütfen plaka seçin");
      return;
    }
    if (!newRecord.nakliye_firmasi) {
      toast.error("Lütfen nakliye firması seçin");
      return;
    }
    if (!newRecord.sofor) {
      toast.error("Lütfen şoför seçin");
      return;
    }
    if (!newRecord.sehir) {
      toast.error("Lütfen şehir seçin");
      return;
    }
    if (!newRecord.cimento_alinan_firma) {
      toast.error("Lütfen çimento alınan firma seçin");
      return;
    }
    if (!newRecord.cimento_cinsi) {
      toast.error("Lütfen çimento cinsi seçin");
      return;
    }
    if (!newRecord.bosaltim_isletmesi) {
      toast.error("Lütfen boşaltım işletmesi seçin");
      return;
    }

    try {
      await axios.post(`${API_URL}/cimento-giris`, newRecord, { headers });
      toast.success("Kayıt başarıyla eklendi");
      setNewRecord(emptyRecord);
      setIsAddDialogOpen(false);
      fetchRecords();
      fetchOzet();
    } catch (e) {
      console.error(e);
      toast.error("Kayıt eklenirken hata oluştu");
    }
  };

  const handleDeleteRecord = async (id) => {
    try {
      await axios.delete(`${API_URL}/cimento-giris/${id}`, { headers });
      toast.success("Kayıt silindi");
      setDeleteConfirm({ open: false, id: null });
      fetchRecords();
      fetchOzet();
    } catch (e) {
      console.error(e);
      toast.error("Kayıt silinirken hata oluştu");
    }
  };

  const startEdit = (record) => {
    setEditingId(record.id);
    setEditData({
      yukleme_tarihi: record.yukleme_tarihi,
      bosaltim_tarihi: record.bosaltim_tarihi,
      irsaliye_no: record.irsaliye_no,
      fatura_no: record.fatura_no,
      vade_tarihi: record.vade_tarihi,
      giris_miktari: record.giris_miktari,
      kantar_kg_miktari: record.kantar_kg_miktari,
      birim_fiyat: record.birim_fiyat,
      giris_kdv_orani: record.giris_kdv_orani,
      nakliye_birim_fiyat: record.nakliye_birim_fiyat,
      nakliye_kdv_orani: record.nakliye_kdv_orani,
      nakliye_tevkifat_orani: record.nakliye_tevkifat_orani,
      plaka: record.plaka,
      nakliye_firmasi: record.nakliye_firmasi,
      sofor: record.sofor,
      sehir: record.sehir,
      cimento_alinan_firma: record.cimento_alinan_firma,
      cimento_cinsi: record.cimento_cinsi || "",
      bosaltim_isletmesi: record.bosaltim_isletmesi || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async (id) => {
    try {
      await axios.put(`${API_URL}/cimento-giris/${id}`, editData, { headers });
      toast.success("Kayıt güncellendi");
      setEditingId(null);
      setEditData({});
      fetchRecords();
      fetchOzet();
    } catch (e) {
      console.error(e);
      toast.error("Kayıt güncellenirken hata oluştu");
    }
  };

  const columnHeaders = [
    { key: "plaka", label: "Plaka", type: "select", source: plakalar, sourceKey: "plaka", editable: true },
    { key: "nakliye_firmasi", label: "Nakliye Firması", type: "select", source: nakliyeciFirmalar, sourceKey: "name", editable: true },
    { key: "sofor", label: "Şoför", type: "select", source: soforler, sourceKey: "name", editable: true },
    { key: "sehir", label: "Şehir", type: "select", source: sehirler, sourceKey: "name", editable: true },
    { key: "cimento_alinan_firma", label: "Çimento Firma", type: "select", source: cimentoFirmalar, sourceKey: "name", editable: true },
    { key: "cimento_cinsi", label: "Çimento Cinsi", type: "select", source: cimentoCinsleri, sourceKey: "name", editable: true },
    { key: "bosaltim_isletmesi", label: "Boşaltım İşletmesi", type: "select", source: cimentoIsletmeler, sourceKey: "name", editable: true },
    { key: "yukleme_tarihi", label: "Yükleme Tarihi", type: "date", editable: true },
    { key: "bosaltim_tarihi", label: "Boşaltım Tarihi", type: "date", editable: true },
    { key: "irsaliye_no", label: "İrsaliye No", type: "text", editable: true },
    { key: "fatura_no", label: "Fatura No", type: "text", editable: true },
    { key: "vade_tarihi", label: "Vade Tarihi", type: "date", editable: true },
    { key: "giris_miktari", label: "Giriş Miktarı", type: "number", editable: true },
    { key: "kantar_kg_miktari", label: "Kantar KG", type: "number", editable: true },
    { key: "aradaki_fark", label: "Aradaki Fark", type: "calculated", editable: false },
    { key: "birim_fiyat", label: "Birim Fiyat", type: "currency", editable: true },
    { key: "giris_tutari", label: "Giriş Tutarı", type: "currency", editable: false },
    { key: "giris_kdv_orani", label: "Giriş KDV %", type: "number", editable: true },
    { key: "giris_kdv_tutari", label: "Giriş KDV Tutarı", type: "currency", editable: false },
    { key: "giris_kdv_dahil_toplam", label: "Giriş KDV Dahil", type: "currency", editable: false },
    { key: "nakliye_birim_fiyat", label: "Nakliye B.Fiyat", type: "currency", editable: true },
    { key: "nakliye_matrahi", label: "Nakliye Matrahı", type: "currency", editable: false },
    { key: "nakliye_kdv_orani", label: "Nakliye KDV %", type: "number", editable: true },
    { key: "nakliye_kdv_tutari", label: "Nakliye KDV Tutarı", type: "currency", editable: false },
    { key: "nakliye_t1", label: "Nakliye T1", type: "currency", editable: false },
    { key: "nakliye_t2", label: "Nakliye T2", type: "currency", editable: false },
    { key: "nakliye_tevkifat_orani", label: "Tevkifat %", type: "number", editable: true },
    { key: "nakliye_genel_toplam", label: "Nakliye G.Toplam", type: "currency", editable: false },
    { key: "urun_nakliye_matrah", label: "Ü-N Matrah", type: "currency", editable: false },
    { key: "urun_nakliye_kdv_toplam", label: "Ü-N KDV Toplam", type: "currency", editable: false },
    { key: "urun_nakliye_tevkifat_toplam", label: "Ü-N Tevkifat", type: "currency", editable: false },
    { key: "urun_nakliye_genel_toplam", label: "Ü-N Genel Toplam", type: "currency", editable: false },
  ];

  const renderCell = (record, column) => {
    const value = record[column.key];

    if (editingId === record.id && column.editable) {
      if (column.type === "select") {
        return (
          <Select
            value={editData[column.key] || ""}
            onValueChange={(val) => setEditData({ ...editData, [column.key]: val })}
          >
            <SelectTrigger className="w-28 h-8 text-xs bg-slate-800 border-slate-600 text-white">
              <SelectValue placeholder="Seçin" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {(column.source || []).map((item) => (
                <SelectItem key={item.id} value={item[column.sourceKey]}>
                  {item[column.sourceKey]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      if (column.type === "date") {
        return (
          <Input
            type="date"
            value={editData[column.key] || ""}
            onChange={(e) => setEditData({ ...editData, [column.key]: e.target.value })}
            className="w-32 h-8 text-xs bg-slate-800 border-slate-600 text-white"
          />
        );
      }
      if (column.type === "number" || column.type === "currency") {
        return (
          <Input
            type="number"
            step="0.01"
            value={editData[column.key] || 0}
            onChange={(e) => setEditData({ ...editData, [column.key]: parseFloat(e.target.value) || 0 })}
            className="w-24 h-8 text-xs bg-slate-800 border-slate-600 text-white"
          />
        );
      }
      return (
        <Input
          type="text"
          value={editData[column.key] || ""}
          onChange={(e) => setEditData({ ...editData, [column.key]: e.target.value })}
          className="w-28 h-8 text-xs bg-slate-800 border-slate-600 text-white"
        />
      );
    }

    // Select alanları için özel renklendirme
    if (column.type === "select") {
      return <span className="text-yellow-300 font-medium">{value || "-"}</span>;
    }
    if (column.type === "currency" || column.type === "calculated") {
      return <span className="font-mono text-right block text-green-400">{formatCurrency(value)}</span>;
    }
    if (column.type === "number") {
      return <span className="font-mono text-right block text-blue-300">{value}</span>;
    }
    if (column.type === "date") {
      return <span className="text-cyan-300">{value || "-"}</span>;
    }
    return <span className="text-white">{value || "-"}</span>;
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
            <h1 className="text-3xl font-bold text-white mb-2">Çimento Veri Girişi</h1>
            <p className="text-slate-400">Excel benzeri tablo ile veri girişi yapın</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" /> Yeni Kayıt Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle>Yeni Çimento Girişi Ekle</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-4 py-4">
                {/* Kaynak alanları */}
                <div>
                  <label className="text-sm font-medium text-yellow-400">Plaka *</label>
                  <div className="flex gap-2">
                    <Select value={newRecord.plaka} onValueChange={(val) => setNewRecord({ ...newRecord, plaka: val })}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 flex-1 text-yellow-300">
                        <SelectValue placeholder="Plaka seçin" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {plakalar.map((item) => (
                          <SelectItem key={item.id} value={item.plaka} className="text-white">{item.plaka}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="icon" variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/20" onClick={() => openQuickAddModal('plaka', 'Plaka')}>
                      <PlusCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-yellow-400">Nakliye Firması *</label>
                  <div className="flex gap-2">
                    <Select value={newRecord.nakliye_firmasi} onValueChange={(val) => setNewRecord({ ...newRecord, nakliye_firmasi: val })}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 flex-1 text-yellow-300">
                        <SelectValue placeholder="Firma seçin" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {nakliyeciFirmalar.map((item) => (
                          <SelectItem key={item.id} value={item.name} className="text-white">{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="icon" variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/20" onClick={() => openQuickAddModal('nakliyeci', 'Nakliye Firması')}>
                      <PlusCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-yellow-400">Şoför *</label>
                  <div className="flex gap-2">
                    <Select value={newRecord.sofor} onValueChange={(val) => setNewRecord({ ...newRecord, sofor: val })}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 flex-1 text-yellow-300">
                        <SelectValue placeholder="Şoför seçin" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {soforler.map((item) => (
                          <SelectItem key={item.id} value={item.name} className="text-white">{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="icon" variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/20" onClick={() => openQuickAddModal('sofor', 'Şoför')}>
                      <PlusCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-yellow-400">Şehir *</label>
                  <div className="flex gap-2">
                    <Select value={newRecord.sehir} onValueChange={(val) => setNewRecord({ ...newRecord, sehir: val })}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 flex-1 text-yellow-300">
                        <SelectValue placeholder="Şehir seçin" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {sehirler.map((item) => (
                          <SelectItem key={item.id} value={item.name} className="text-white">{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="icon" variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/20" onClick={() => openQuickAddModal('sehir', 'Şehir')}>
                      <PlusCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-yellow-400">Çimento Alınan Firma *</label>
                  <div className="flex gap-2">
                    <Select value={newRecord.cimento_alinan_firma} onValueChange={(val) => setNewRecord({ ...newRecord, cimento_alinan_firma: val })}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 flex-1 text-yellow-300">
                        <SelectValue placeholder="Firma seçin" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {cimentoFirmalar.map((item) => (
                          <SelectItem key={item.id} value={item.name} className="text-white">{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="icon" variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/20" onClick={() => openQuickAddModal('cimento_firma', 'Çimento Firması')}>
                      <PlusCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-yellow-400">Çimento Cinsi *</label>
                  <div className="flex gap-2">
                    <Select value={newRecord.cimento_cinsi} onValueChange={(val) => setNewRecord({ ...newRecord, cimento_cinsi: val })}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 flex-1 text-yellow-300">
                        <SelectValue placeholder="Cins seçin" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {cimentoCinsleri.map((item) => (
                          <SelectItem key={item.id} value={item.name} className="text-white">{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="icon" variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/20" onClick={() => openQuickAddModal('cimento_cins', 'Çimento Cinsi')}>
                      <PlusCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-cyan-400">Boşaltım İşletmesi *</label>
                  <Select value={newRecord.bosaltim_isletmesi} onValueChange={(val) => setNewRecord({ ...newRecord, bosaltim_isletmesi: val })}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-cyan-300">
                      <SelectValue placeholder="İşletme seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {cimentoIsletmeler.map((item) => (
                        <SelectItem key={item.id} value={item.name} className="text-white">{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="border-t border-slate-700 col-span-3 pt-2 mt-2"></div>
                <div>
                  <label className="text-sm font-medium text-slate-300">Yükleme Tarihi</label>
                  <Input type="date" value={newRecord.yukleme_tarihi} onChange={(e) => setNewRecord({ ...newRecord, yukleme_tarihi: e.target.value })} className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300">Boşaltım Tarihi</label>
                  <Input type="date" value={newRecord.bosaltim_tarihi} onChange={(e) => setNewRecord({ ...newRecord, bosaltim_tarihi: e.target.value })} className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300">Vade Tarihi</label>
                  <Input type="date" value={newRecord.vade_tarihi} onChange={(e) => setNewRecord({ ...newRecord, vade_tarihi: e.target.value })} className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300">İrsaliye No</label>
                  <Input type="text" value={newRecord.irsaliye_no} onChange={(e) => setNewRecord({ ...newRecord, irsaliye_no: e.target.value })} className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300">Fatura No</label>
                  <Input type="text" value={newRecord.fatura_no} onChange={(e) => setNewRecord({ ...newRecord, fatura_no: e.target.value })} className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div>
                  <label className="text-sm font-medium text-green-400">Giriş Miktarı (KG)</label>
                  <Input type="number" step="0.01" value={newRecord.giris_miktari} onChange={(e) => setNewRecord({ ...newRecord, giris_miktari: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div>
                  <label className="text-sm font-medium text-green-400">Kantar KG Miktarı</label>
                  <Input type="number" step="0.01" value={newRecord.kantar_kg_miktari} onChange={(e) => setNewRecord({ ...newRecord, kantar_kg_miktari: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div>
                  <label className="text-sm font-medium text-green-400">Birim Fiyat (₺)</label>
                  <Input type="number" step="0.01" value={newRecord.birim_fiyat} onChange={(e) => setNewRecord({ ...newRecord, birim_fiyat: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div>
                  <label className="text-sm font-medium text-blue-400">Giriş KDV Oranı (%)</label>
                  <Input type="number" step="1" value={newRecord.giris_kdv_orani} onChange={(e) => setNewRecord({ ...newRecord, giris_kdv_orani: parseFloat(e.target.value) || 0 })} className="bg-slate-800 border-slate-600 text-white" />
                </div>
                <div>
                  <label className="text-sm font-medium">Nakliye Birim Fiyat (₺)</label>
                  <Input type="number" step="0.01" value={newRecord.nakliye_birim_fiyat} onChange={(e) => setNewRecord({ ...newRecord, nakliye_birim_fiyat: parseFloat(e.target.value) || 0 })} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <label className="text-sm font-medium">Nakliye KDV Oranı (%)</label>
                  <Input type="number" step="1" value={newRecord.nakliye_kdv_orani} onChange={(e) => setNewRecord({ ...newRecord, nakliye_kdv_orani: parseFloat(e.target.value) || 0 })} className="bg-slate-950 border-slate-700" />
                </div>
                <div>
                  <label className="text-sm font-medium">Nakliye Tevkifat Oranı (%)</label>
                  <Input type="number" step="1" value={newRecord.nakliye_tevkifat_orani} onChange={(e) => setNewRecord({ ...newRecord, nakliye_tevkifat_orani: parseFloat(e.target.value) || 0 })} className="bg-slate-950 border-slate-700" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-slate-700">İptal</Button>
                <Button onClick={handleAddRecord} className="bg-orange-500 hover:bg-orange-600">
                  <Save className="w-4 h-4 mr-2" /> Kaydet
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      {ozet && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <Card className="glass-effect border-slate-800">
            <CardContent className="p-3">
              <p className="text-xs text-slate-400">Kayıt Sayısı</p>
              <p className="text-xl font-bold text-orange-500">{ozet.kayit_sayisi}</p>
            </CardContent>
          </Card>
          <Card className="glass-effect border-slate-800">
            <CardContent className="p-3">
              <p className="text-xs text-slate-400">Toplam Giriş</p>
              <p className="text-lg font-bold text-green-500">{formatCurrency(ozet.toplam_giris_miktari)} KG</p>
            </CardContent>
          </Card>
          <Card className="glass-effect border-slate-800">
            <CardContent className="p-3">
              <p className="text-xs text-slate-400">Toplam Fark</p>
              <p className="text-lg font-bold text-yellow-500">{formatCurrency(ozet.toplam_fark)} KG</p>
            </CardContent>
          </Card>
          <Card className="glass-effect border-slate-800">
            <CardContent className="p-3">
              <p className="text-xs text-slate-400">Giriş Tutarı</p>
              <p className="text-lg font-bold text-blue-500">₺{formatCurrency(ozet.toplam_giris_tutari)}</p>
            </CardContent>
          </Card>
          <Card className="glass-effect border-slate-800">
            <CardContent className="p-3">
              <p className="text-xs text-slate-400">Nakliye Toplam</p>
              <p className="text-lg font-bold text-purple-500">₺{formatCurrency(ozet.toplam_nakliye_genel)}</p>
            </CardContent>
          </Card>
          <Card className="glass-effect border-slate-800">
            <CardContent className="p-3">
              <p className="text-xs text-slate-400">Toplam KDV</p>
              <p className="text-lg font-bold text-red-500">₺{formatCurrency(ozet.toplam_urun_nakliye_kdv)}</p>
            </CardContent>
          </Card>
          <Card className="glass-effect border-slate-800">
            <CardContent className="p-3">
              <p className="text-xs text-slate-400">Genel Toplam</p>
              <p className="text-lg font-bold text-emerald-500">₺{formatCurrency(ozet.toplam_urun_nakliye_genel)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Table */}
      <Card className="glass-effect border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-lg flex items-center gap-2 text-white">
            <FileSpreadsheet className="w-5 h-5" />
            Çimento Giriş Kayıtları
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              Henüz kayıt bulunmuyor. "Yeni Kayıt Ekle" butonuna tıklayarak başlayın.
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="min-w-max">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 bg-slate-900/50">
                      <TableHead className="sticky left-0 bg-slate-900 z-10 w-20 text-slate-300">İşlem</TableHead>
                      {columnHeaders.map((col) => (
                        <TableHead
                          key={col.key}
                          className={`text-xs font-semibold whitespace-nowrap px-2 text-slate-300 ${
                            col.type === "select" ? "bg-orange-900/20" : col.editable ? "bg-blue-900/20" : "bg-slate-900/30"
                          }`}
                        >
                          {col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record, index) => (
                      <TableRow
                        key={record.id}
                        className={`border-slate-700 ${
                          index % 2 === 0 ? "bg-slate-800/40" : "bg-slate-800/70"
                        } hover:bg-slate-700/50 transition-colors`}
                      >
                        <TableCell className="sticky left-0 bg-slate-900 z-10 border-r border-slate-700">
                          <div className="flex gap-1">
                            {editingId === record.id ? (
                              <>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500 hover:text-green-400 hover:bg-green-900/30" onClick={() => saveEdit(record.id)}>
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-300 hover:bg-slate-700" onClick={cancelEdit}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-500 hover:text-blue-400 hover:bg-blue-900/30" onClick={() => startEdit(record)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-900/30" onClick={() => setDeleteConfirm({ open: true, id: record.id })}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                        {columnHeaders.map((col) => (
                          <TableCell
                            key={col.key}
                            className={`text-xs px-3 py-2 whitespace-nowrap border-r border-slate-700/50 ${
                              col.type === "select" ? "bg-slate-800/30" : ""
                            }`}
                          >
                            {renderCell(record, col)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Hızlı Kaynak Ekleme Modal */}
      <Dialog open={quickAddModal.open} onOpenChange={(open) => setQuickAddModal(prev => ({ ...prev, open }))}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Yeni {quickAddModal.title} Ekle
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">{quickAddModal.title} {quickAddModal.type === 'plaka' ? '' : 'Adı'}</label>
              <Input
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(quickAddModal.type === 'plaka' ? e.target.value.toUpperCase() : e.target.value)}
                placeholder={`${quickAddModal.title} ${quickAddModal.type === 'plaka' ? '(örn: 34 ABC 123)' : 'adını girin'}`}
                className="bg-slate-800/50 border-slate-700"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuickAdd();
                  }
                }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setQuickAddModal({ open: false, type: '', title: '' })}
            >
              İptal
            </Button>
            <Button 
              type="button" 
              className="bg-green-500 hover:bg-green-600"
              onClick={handleQuickAdd}
            >
              Ekle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Silme Onay Modalı */}
      <Dialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open, id: null })}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Kaydı Sil</DialogTitle>
          </DialogHeader>
          <p className="text-slate-300 py-4">Bu kaydı silmek istediğinizden emin misiniz?</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm({ open: false, id: null })}>
              İptal
            </Button>
            <Button className="bg-red-500 hover:bg-red-600" onClick={() => handleDeleteRecord(deleteConfirm.id)}>
              Sil
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CimentoEntry;
