import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ArrowLeft, Download, Filter, FileSpreadsheet, Building, Truck, Calendar, Package, TrendingUp, TrendingDown, Warehouse } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "0,00";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined || value === "") return "0";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

const CimentoReports = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState('stok');

  // Stok raporu verileri
  const [stokRaporu, setStokRaporu] = useState(null);
  const [stokLoading, setStokLoading] = useState(false);

  const [filters, setFilters] = useState({
    baslangicTarihi: '',
    bitisTarihi: '',
    isletme: '',
    firma: '',
    plaka: '',
  });

  const [isletmeler, setIsletmeler] = useState([]);
  const [firmalar, setFirmalar] = useState([]);
  const [plakalar, setPlakalar] = useState([]);

  const [summary, setSummary] = useState({
    toplamKayit: 0,
    toplamGiris: 0,
    toplamFark: 0,
    toplamTutar: 0,
    toplamNakliye: 0,
    genelToplam: 0,
  });

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/cimento-giris`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(response.data);
      setFilteredRecords(response.data);
      calculateSummary(response.data);
    } catch (e) {
      console.error(e);
      toast.error("Kayıtlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchKaynaklar = useCallback(async () => {
    try {
      const [isletmeRes, firmaRes, plakaRes] = await Promise.all([
        axios.get(`${API_URL}/cimento-isletmeler`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/cimento-firmalar`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/plakalar`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setIsletmeler(isletmeRes.data);
      setFirmalar(firmaRes.data);
      setPlakalar(plakaRes.data);
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  const fetchStokRaporu = useCallback(async () => {
    try {
      setStokLoading(true);
      const params = new URLSearchParams();
      if (filters.baslangicTarihi) params.append('baslangic_tarihi', filters.baslangicTarihi);
      if (filters.bitisTarihi) params.append('bitis_tarihi', filters.bitisTarihi);
      
      const response = await axios.get(`${API_URL}/cimento-stok-raporu?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStokRaporu(response.data);
    } catch (e) {
      console.error(e);
      toast.error("Stok raporu yüklenemedi");
    } finally {
      setStokLoading(false);
    }
  }, [token, filters.baslangicTarihi, filters.bitisTarihi]);

  useEffect(() => {
    fetchRecords();
    fetchKaynaklar();
    fetchStokRaporu();
  }, [fetchRecords, fetchKaynaklar, fetchStokRaporu]);

  const calculateSummary = (data) => {
    const sum = data.reduce((acc, record) => ({
      toplamKayit: acc.toplamKayit + 1,
      toplamGiris: acc.toplamGiris + (record.giris_miktari || 0),
      toplamFark: acc.toplamFark + (record.aradaki_fark || 0),
      toplamTutar: acc.toplamTutar + (record.giris_kdv_dahil_toplam || 0),
      toplamNakliye: acc.toplamNakliye + (record.nakliye_genel_toplam || 0),
      genelToplam: acc.genelToplam + (record.urun_nakliye_genel_toplam || 0),
    }), { toplamKayit: 0, toplamGiris: 0, toplamFark: 0, toplamTutar: 0, toplamNakliye: 0, genelToplam: 0 });
    setSummary(sum);
  };

  const applyFilters = () => {
    let filtered = [...records];
    if (filters.baslangicTarihi) filtered = filtered.filter(r => r.bosaltim_tarihi >= filters.baslangicTarihi);
    if (filters.bitisTarihi) filtered = filtered.filter(r => r.bosaltim_tarihi <= filters.bitisTarihi);
    if (filters.isletme) filtered = filtered.filter(r => r.bosaltim_isletmesi === filters.isletme);
    if (filters.firma) filtered = filtered.filter(r => r.cimento_alinan_firma === filters.firma);
    if (filters.plaka) filtered = filtered.filter(r => r.plaka === filters.plaka);
    setFilteredRecords(filtered);
    calculateSummary(filtered);
    
    // Stok raporunu da yeniden çek
    fetchStokRaporu();
    
    toast.success(`${filtered.length} kayıt bulundu`);
  };

  const clearFilters = () => {
    setFilters({ baslangicTarihi: '', bitisTarihi: '', isletme: '', firma: '', plaka: '' });
    setFilteredRecords(records);
    calculateSummary(records);
    fetchStokRaporu();
  };

  const exportToExcel = () => {
    if (activeReport === 'stok' && stokRaporu) {
      // Stok raporu için Excel
      const exportData = stokRaporu.isletme_ozet.map(item => ({
        'İşletme': item.isletme_adi,
        'Açılış Stok (KG)': item.acilis_stok_kg,
        'Açılış Stok (TON)': item.acilis_stok_ton,
        'Gelen (KG)': item.gelen_kg,
        'Gelen (TON)': item.gelen_ton,
        'Harcanan (KG)': item.harcanan_kg,
        'Harcanan (TON)': item.harcanan_ton,
        'Mevcut Stok (KG)': item.mevcut_stok_kg,
        'Mevcut Stok (TON)': item.mevcut_stok_ton,
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Stok Raporu');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(data, `Cimento_Stok_Raporu_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.xlsx`);
    } else {
      // Diğer raporlar için Excel
      const exportData = filteredRecords.map(record => ({
        'Boşaltım Tarihi': formatDate(record.bosaltim_tarihi),
        'Plaka': record.plaka,
        'Şoför': record.sofor,
        'Çimento Firma': record.cimento_alinan_firma,
        'Boşaltım İşletmesi': record.bosaltim_isletmesi,
        'Giriş TON': record.giris_miktari,
        'Kantar TON': record.kantar_kg_miktari,
        'Fark TON': record.aradaki_fark,
        'KDV Dahil': record.giris_kdv_dahil_toplam,
        'Nakliye Toplam': record.nakliye_genel_toplam,
        'Genel Toplam': record.urun_nakliye_genel_toplam,
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Çimento Rapor');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(data, `Cimento_Rapor_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.xlsx`);
    }
    toast.success('Excel indirildi');
  };

  const getIsletmeSummary = () => {
    const sum = {};
    filteredRecords.forEach(r => {
      const key = r.bosaltim_isletmesi || 'Belirtilmemiş';
      if (!sum[key]) sum[key] = { kayit: 0, giris: 0, tutar: 0 };
      sum[key].kayit++;
      sum[key].giris += r.giris_miktari || 0;
      sum[key].tutar += r.urun_nakliye_genel_toplam || 0;
    });
    return Object.entries(sum).map(([k, v]) => ({ isletme: k, ...v }));
  };

  const getFirmaSummary = () => {
    const sum = {};
    filteredRecords.forEach(r => {
      const key = r.cimento_alinan_firma || 'Belirtilmemiş';
      if (!sum[key]) sum[key] = { kayit: 0, giris: 0, tutar: 0 };
      sum[key].kayit++;
      sum[key].giris += r.giris_miktari || 0;
      sum[key].tutar += r.urun_nakliye_genel_toplam || 0;
    });
    return Object.entries(sum).map(([k, v]) => ({ firma: k, ...v }));
  };

  const getPlakaSummary = () => {
    const sum = {};
    filteredRecords.forEach(r => {
      const key = r.plaka || 'Belirtilmemiş';
      if (!sum[key]) sum[key] = { kayit: 0, giris: 0, nakliye: 0 };
      sum[key].kayit++;
      sum[key].giris += r.giris_miktari || 0;
      sum[key].nakliye += r.nakliye_genel_toplam || 0;
    });
    return Object.entries(sum).map(([k, v]) => ({ plaka: k, ...v }));
  };

  // İşletme bazlı stok durumuna göre renk belirleme
  const getStokColor = (mevcutTon) => {
    if (mevcutTon <= 10) return 'text-red-500';
    if (mevcutTon <= 30) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Geri
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Çimento Raporları</h1>
            <p className="text-slate-400">Detaylı analiz ve stok takibi</p>
          </div>
          <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" /> Excel'e Aktar
          </Button>
        </div>
      </div>

      {/* Filtreler */}
      <Card className="glass-effect border-slate-800 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5 text-orange-500" /> Filtreler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label className="text-slate-400 text-xs">Başlangıç Tarihi</Label>
              <Input type="date" value={filters.baslangicTarihi} onChange={(e) => setFilters({ ...filters, baslangicTarihi: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Bitiş Tarihi</Label>
              <Input type="date" value={filters.bitisTarihi} onChange={(e) => setFilters({ ...filters, bitisTarihi: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">İşletme</Label>
              <Select value={filters.isletme} onValueChange={(val) => setFilters({ ...filters, isletme: val === 'all' ? '' : val })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Tümü" /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">Tümü</SelectItem>
                  {isletmeler.map(i => <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Çimento Firma</Label>
              <Select value={filters.firma} onValueChange={(val) => setFilters({ ...filters, firma: val === 'all' ? '' : val })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Tümü" /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">Tümü</SelectItem>
                  {firmalar.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Plaka</Label>
              <Select value={filters.plaka} onValueChange={(val) => setFilters({ ...filters, plaka: val === 'all' ? '' : val })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue placeholder="Tümü" /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">Tümü</SelectItem>
                  {plakalar.map(p => <SelectItem key={p.id} value={p.plaka}>{p.plaka}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} className="bg-orange-500 hover:bg-orange-600 flex-1">Filtrele</Button>
              <Button onClick={clearFilters} variant="outline" className="border-slate-700">Temizle</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rapor Sekmeleri */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button onClick={() => setActiveReport('stok')} className={activeReport === 'stok' ? 'bg-orange-500' : 'bg-slate-700 hover:bg-slate-600'}>
          <Warehouse className="w-4 h-4 mr-2" /> İşletme Stok Durumu
        </Button>
        <Button onClick={() => setActiveReport('tarih')} className={activeReport === 'tarih' ? 'bg-orange-500' : 'bg-slate-700 hover:bg-slate-600'}>
          <Calendar className="w-4 h-4 mr-2" /> Detaylı Liste
        </Button>
        <Button onClick={() => setActiveReport('isletme')} className={activeReport === 'isletme' ? 'bg-orange-500' : 'bg-slate-700 hover:bg-slate-600'}>
          <Building className="w-4 h-4 mr-2" /> Giriş Özeti
        </Button>
        <Button onClick={() => setActiveReport('firma')} className={activeReport === 'firma' ? 'bg-orange-500' : 'bg-slate-700 hover:bg-slate-600'}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Firma Bazında
        </Button>
        <Button onClick={() => setActiveReport('plaka')} className={activeReport === 'plaka' ? 'bg-orange-500' : 'bg-slate-700 hover:bg-slate-600'}>
          <Truck className="w-4 h-4 mr-2" /> Plaka Bazında
        </Button>
      </div>

      {/* Stok Raporu */}
      {activeReport === 'stok' && (
        <>
          {/* Toplam Özet Kartları */}
          {stokRaporu && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="glass-effect border-slate-800 bg-gradient-to-br from-blue-900/50 to-blue-800/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Package className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Açılış Stoku</p>
                      <p className="text-xl font-bold text-blue-400">{formatNumber(stokRaporu.toplam_ozet.toplam_acilis_ton)} TON</p>
                      <p className="text-xs text-slate-500">{formatNumber(stokRaporu.toplam_ozet.toplam_acilis_kg, 0)} KG</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect border-slate-800 bg-gradient-to-br from-green-900/50 to-green-800/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Toplam Gelen</p>
                      <p className="text-xl font-bold text-green-400">{formatNumber(stokRaporu.toplam_ozet.toplam_gelen_ton)} TON</p>
                      <p className="text-xs text-slate-500">{formatNumber(stokRaporu.toplam_ozet.toplam_gelen_kg, 0)} KG</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect border-slate-800 bg-gradient-to-br from-red-900/50 to-red-800/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <TrendingDown className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Toplam Harcanan</p>
                      <p className="text-xl font-bold text-red-400">{formatNumber(stokRaporu.toplam_ozet.toplam_harcanan_ton)} TON</p>
                      <p className="text-xs text-slate-500">{formatNumber(stokRaporu.toplam_ozet.toplam_harcanan_kg, 0)} KG</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect border-slate-800 bg-gradient-to-br from-orange-900/50 to-orange-800/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <Warehouse className="w-6 h-6 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Mevcut Stok</p>
                      <p className="text-xl font-bold text-orange-400">{formatNumber(stokRaporu.toplam_ozet.toplam_mevcut_ton)} TON</p>
                      <p className="text-xs text-slate-500">{formatNumber(stokRaporu.toplam_ozet.toplam_mevcut_kg, 0)} KG</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* İşletme Bazlı Stok Kartları */}
          {stokRaporu && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {stokRaporu.isletme_ozet.map((isletme) => (
                <Card key={isletme.id} className="glass-effect border-slate-800 hover:border-orange-500/50 transition-all">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="text-white flex items-center gap-2">
                        <Building className="w-5 h-5 text-orange-500" />
                        {isletme.isletme_adi}
                      </span>
                      <span className={`text-2xl font-bold ${getStokColor(isletme.mevcut_stok_ton)}`}>
                        {formatNumber(isletme.mevcut_stok_ton)} TON
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-700">
                        <span className="text-slate-400 text-sm">Açılış Stoku</span>
                        <span className="text-blue-400 font-medium">{formatNumber(isletme.acilis_stok_ton)} TON</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-700">
                        <span className="text-slate-400 text-sm flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-green-500" /> Gelen
                        </span>
                        <span className="text-green-400 font-medium">+{formatNumber(isletme.gelen_ton)} TON</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-700">
                        <span className="text-slate-400 text-sm flex items-center gap-1">
                          <TrendingDown className="w-3 h-3 text-red-500" /> Harcanan
                        </span>
                        <span className="text-red-400 font-medium">-{formatNumber(isletme.harcanan_ton)} TON</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-white text-sm font-medium">Mevcut Stok</span>
                        <div className="text-right">
                          <span className={`text-lg font-bold ${getStokColor(isletme.mevcut_stok_ton)}`}>
                            {formatNumber(isletme.mevcut_stok_ton)} TON
                          </span>
                          <p className="text-xs text-slate-500">{formatNumber(isletme.mevcut_stok_kg, 0)} KG</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Detaylı Stok Tablosu */}
          <Card className="glass-effect border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-orange-500" />
                İşletme Bazlı Stok Detayı
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stokLoading ? (
                <div className="text-center py-10 text-slate-400">Yükleniyor...</div>
              ) : stokRaporu ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-400">İşletme</TableHead>
                        <TableHead className="text-slate-400 text-right">Açılış (KG)</TableHead>
                        <TableHead className="text-slate-400 text-right">Açılış (TON)</TableHead>
                        <TableHead className="text-slate-400 text-right">Gelen (KG)</TableHead>
                        <TableHead className="text-slate-400 text-right">Gelen (TON)</TableHead>
                        <TableHead className="text-slate-400 text-right">Harcanan (KG)</TableHead>
                        <TableHead className="text-slate-400 text-right">Harcanan (TON)</TableHead>
                        <TableHead className="text-slate-400 text-right">Mevcut (KG)</TableHead>
                        <TableHead className="text-slate-400 text-right">Mevcut (TON)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stokRaporu.isletme_ozet.map((item, i) => (
                        <TableRow key={item.id} className={`border-slate-800 ${i % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/50'}`}>
                          <TableCell className="text-orange-300 font-medium">{item.isletme_adi}</TableCell>
                          <TableCell className="text-right text-blue-300">{formatNumber(item.acilis_stok_kg, 0)}</TableCell>
                          <TableCell className="text-right text-blue-400">{formatNumber(item.acilis_stok_ton)}</TableCell>
                          <TableCell className="text-right text-green-300">{formatNumber(item.gelen_kg, 0)}</TableCell>
                          <TableCell className="text-right text-green-400">{formatNumber(item.gelen_ton)}</TableCell>
                          <TableCell className="text-right text-red-300">{formatNumber(item.harcanan_kg, 0)}</TableCell>
                          <TableCell className="text-right text-red-400">{formatNumber(item.harcanan_ton)}</TableCell>
                          <TableCell className="text-right text-yellow-300">{formatNumber(item.mevcut_stok_kg, 0)}</TableCell>
                          <TableCell className={`text-right font-bold ${getStokColor(item.mevcut_stok_ton)}`}>
                            {formatNumber(item.mevcut_stok_ton)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Toplam Satırı */}
                      <TableRow className="border-slate-700 bg-slate-900/80 font-bold">
                        <TableCell className="text-white">TOPLAM</TableCell>
                        <TableCell className="text-right text-blue-300">{formatNumber(stokRaporu.toplam_ozet.toplam_acilis_kg, 0)}</TableCell>
                        <TableCell className="text-right text-blue-400">{formatNumber(stokRaporu.toplam_ozet.toplam_acilis_ton)}</TableCell>
                        <TableCell className="text-right text-green-300">{formatNumber(stokRaporu.toplam_ozet.toplam_gelen_kg, 0)}</TableCell>
                        <TableCell className="text-right text-green-400">{formatNumber(stokRaporu.toplam_ozet.toplam_gelen_ton)}</TableCell>
                        <TableCell className="text-right text-red-300">{formatNumber(stokRaporu.toplam_ozet.toplam_harcanan_kg, 0)}</TableCell>
                        <TableCell className="text-right text-red-400">{formatNumber(stokRaporu.toplam_ozet.toplam_harcanan_ton)}</TableCell>
                        <TableCell className="text-right text-yellow-300">{formatNumber(stokRaporu.toplam_ozet.toplam_mevcut_kg, 0)}</TableCell>
                        <TableCell className="text-right text-orange-400">{formatNumber(stokRaporu.toplam_ozet.toplam_mevcut_ton)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400">Veri bulunamadı</div>
              )}
            </CardContent>
          </Card>

          {/* Günlük Hareketler */}
          {stokRaporu && (stokRaporu.gunluk_giris.length > 0 || stokRaporu.gunluk_harcanan.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Günlük Giriş */}
              {stokRaporu.gunluk_giris.length > 0 && (
                <Card className="glass-effect border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      Günlük Gelen Çimento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-64">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700">
                            <TableHead className="text-slate-400">Tarih</TableHead>
                            <TableHead className="text-slate-400">İşletme</TableHead>
                            <TableHead className="text-slate-400 text-right">Miktar (TON)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stokRaporu.gunluk_giris.map((item, i) => (
                            <TableRow key={i} className="border-slate-800">
                              <TableCell className="text-cyan-300">{formatDate(item.tarih)}</TableCell>
                              <TableCell className="text-white">{item.isletme}</TableCell>
                              <TableCell className="text-right text-green-400">+{formatNumber(item.miktar_ton)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Günlük Harcanan */}
              {stokRaporu.gunluk_harcanan.length > 0 && (
                <Card className="glass-effect border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-red-500" />
                      Günlük Harcanan Çimento (Üretim)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-64">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700">
                            <TableHead className="text-slate-400">Tarih</TableHead>
                            <TableHead className="text-slate-400">İşletme</TableHead>
                            <TableHead className="text-slate-400 text-right">Miktar (KG)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stokRaporu.gunluk_harcanan.map((item, i) => (
                            <TableRow key={i} className="border-slate-800">
                              <TableCell className="text-cyan-300">{formatDate(item.tarih)}</TableCell>
                              <TableCell className="text-white">{item.isletme}</TableCell>
                              <TableCell className="text-right text-red-400">-{formatNumber(item.miktar_kg, 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Diğer Rapor Sekmeleri */}
      {activeReport !== 'stok' && (
        <>
          {/* Özet Kartları */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <Card className="glass-effect border-slate-800"><CardContent className="p-3"><p className="text-xs text-slate-400">Kayıt Sayısı</p><p className="text-xl font-bold text-orange-500">{summary.toplamKayit}</p></CardContent></Card>
            <Card className="glass-effect border-slate-800"><CardContent className="p-3"><p className="text-xs text-slate-400">Toplam Giriş</p><p className="text-lg font-bold text-green-500">{summary.toplamGiris.toFixed(2)} TON</p></CardContent></Card>
            <Card className="glass-effect border-slate-800"><CardContent className="p-3"><p className="text-xs text-slate-400">Toplam Fark</p><p className="text-lg font-bold text-yellow-500">{summary.toplamFark.toFixed(2)} TON</p></CardContent></Card>
            <Card className="glass-effect border-slate-800"><CardContent className="p-3"><p className="text-xs text-slate-400">Ürün Tutarı</p><p className="text-lg font-bold text-blue-500">₺{formatCurrency(summary.toplamTutar)}</p></CardContent></Card>
            <Card className="glass-effect border-slate-800"><CardContent className="p-3"><p className="text-xs text-slate-400">Nakliye Tutarı</p><p className="text-lg font-bold text-purple-500">₺{formatCurrency(summary.toplamNakliye)}</p></CardContent></Card>
            <Card className="glass-effect border-slate-800"><CardContent className="p-3"><p className="text-xs text-slate-400">Genel Toplam</p><p className="text-lg font-bold text-emerald-500">₺{formatCurrency(summary.genelToplam)}</p></CardContent></Card>
          </div>

          <Card className="glass-effect border-slate-800">
            <CardContent className="p-4">
              {loading ? <div className="text-center py-10 text-slate-400">Yükleniyor...</div> : (
                <>
                  {activeReport === 'tarih' && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader><TableRow className="border-slate-700">
                          <TableHead className="text-slate-400">Tarih</TableHead>
                          <TableHead className="text-slate-400">Plaka</TableHead>
                          <TableHead className="text-slate-400">Firma</TableHead>
                          <TableHead className="text-slate-400">İşletme</TableHead>
                          <TableHead className="text-slate-400 text-right">Giriş TON</TableHead>
                          <TableHead className="text-slate-400 text-right">Fark TON</TableHead>
                          <TableHead className="text-slate-400 text-right">Ürün Tutarı</TableHead>
                          <TableHead className="text-slate-400 text-right">Nakliye</TableHead>
                          <TableHead className="text-slate-400 text-right">Genel Toplam</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {filteredRecords.map((r, i) => (
                            <TableRow key={r.id} className={`border-slate-800 ${i % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/50'}`}>
                              <TableCell className="text-cyan-300">{formatDate(r.bosaltim_tarihi)}</TableCell>
                              <TableCell className="text-yellow-300">{r.plaka}</TableCell>
                              <TableCell className="text-white">{r.cimento_alinan_firma}</TableCell>
                              <TableCell className="text-purple-300">{r.bosaltim_isletmesi}</TableCell>
                              <TableCell className="text-right text-green-400">{r.giris_miktari?.toFixed(2)}</TableCell>
                              <TableCell className="text-right text-yellow-400">{r.aradaki_fark?.toFixed(2)}</TableCell>
                              <TableCell className="text-right text-blue-400">₺{formatCurrency(r.giris_kdv_dahil_toplam)}</TableCell>
                              <TableCell className="text-right text-purple-400">₺{formatCurrency(r.nakliye_genel_toplam)}</TableCell>
                              <TableCell className="text-right text-emerald-400 font-bold">₺{formatCurrency(r.urun_nakliye_genel_toplam)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {activeReport === 'isletme' && (
                    <Table>
                      <TableHeader><TableRow className="border-slate-700">
                        <TableHead className="text-slate-400">İşletme</TableHead>
                        <TableHead className="text-slate-400 text-right">Kayıt</TableHead>
                        <TableHead className="text-slate-400 text-right">Toplam Giriş (TON)</TableHead>
                        <TableHead className="text-slate-400 text-right">Toplam Tutar</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {getIsletmeSummary().map((r, i) => (
                          <TableRow key={r.isletme} className={`border-slate-800 ${i % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/50'}`}>
                            <TableCell className="text-purple-300 font-medium">{r.isletme}</TableCell>
                            <TableCell className="text-right text-orange-400">{r.kayit}</TableCell>
                            <TableCell className="text-right text-green-400">{r.giris.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-emerald-400 font-bold">₺{formatCurrency(r.tutar)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {activeReport === 'firma' && (
                    <Table>
                      <TableHeader><TableRow className="border-slate-700">
                        <TableHead className="text-slate-400">Çimento Firması</TableHead>
                        <TableHead className="text-slate-400 text-right">Kayıt</TableHead>
                        <TableHead className="text-slate-400 text-right">Toplam Giriş (TON)</TableHead>
                        <TableHead className="text-slate-400 text-right">Toplam Tutar</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {getFirmaSummary().map((r, i) => (
                          <TableRow key={r.firma} className={`border-slate-800 ${i % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/50'}`}>
                            <TableCell className="text-yellow-300 font-medium">{r.firma}</TableCell>
                            <TableCell className="text-right text-orange-400">{r.kayit}</TableCell>
                            <TableCell className="text-right text-green-400">{r.giris.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-emerald-400 font-bold">₺{formatCurrency(r.tutar)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {activeReport === 'plaka' && (
                    <Table>
                      <TableHeader><TableRow className="border-slate-700">
                        <TableHead className="text-slate-400">Plaka</TableHead>
                        <TableHead className="text-slate-400 text-right">Sefer</TableHead>
                        <TableHead className="text-slate-400 text-right">Toplam Taşıma (TON)</TableHead>
                        <TableHead className="text-slate-400 text-right">Toplam Nakliye</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {getPlakaSummary().map((r, i) => (
                          <TableRow key={r.plaka} className={`border-slate-800 ${i % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/50'}`}>
                            <TableCell className="text-cyan-300 font-medium">{r.plaka}</TableCell>
                            <TableCell className="text-right text-orange-400">{r.kayit}</TableCell>
                            <TableCell className="text-right text-green-400">{r.giris.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-purple-400 font-bold">₺{formatCurrency(r.nakliye)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default CimentoReports;
