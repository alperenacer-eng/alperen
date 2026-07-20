import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, Download, FileText, Sun, Moon, Factory, Package, ChevronDown, ChevronUp, CalendarDays, FileSpreadsheet, CalendarRange } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import * as XLSX from 'xlsx';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const AY_ADLARI = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const fmtTR = (n) => (Number(n) || 0).toLocaleString('tr-TR');

const Reports = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  const [dailyData, setDailyData] = useState([]);
  const [dailyDetailed, setDailyDetailed] = useState(null);
  const [stats, setStats] = useState(null);
  const [todayDetails, setTodayDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);
  const [expandedDays, setExpandedDays] = useState({});

  // Yıl/Ay seçimi state
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [monthlyData, setMonthlyData] = useState(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // Sekme (Ay Bazlı / Yıl Bazlı / Ürün Bazlı) ve Yıl Bazlı Rapor state
  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly' | 'yearly' | 'product'
  const [yearlySelectedYear, setYearlySelectedYear] = useState(now.getFullYear());
  const [yearlyData, setYearlyData] = useState(null);
  const [yearlyLoading, setYearlyLoading] = useState(false);

  // Ürün Bazlı Rapor state
  const [productData, setProductData] = useState(null);
  const [productLoading, setProductLoading] = useState(false);

  useEffect(() => {
    if (!currentModule) {
      navigate('/');
      return;
    }
    if (currentModule.id !== 'bims') {
      navigate('/dashboard');
      return;
    }
    fetchData();
    fetchMonthly(selectedYear, selectedMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, currentModule]);

  const fetchMonthly = async (year, month) => {
    setMonthlyLoading(true);
    try {
      const res = await axios.get(`${API_URL}/reports/monthly?year=${year}&month=${month}&module=${currentModule.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMonthlyData(res.data);
    } catch (error) {
      toast.error('Aylık rapor yüklenemedi');
      setMonthlyData(null);
    } finally {
      setMonthlyLoading(false);
    }
  };

  const handleYearChange = (y) => {
    setSelectedYear(y);
    fetchMonthly(y, selectedMonth);
  };

  const handleMonthChange = (m) => {
    setSelectedMonth(m);
    fetchMonthly(selectedYear, m);
  };

  const fetchYearly = async (year) => {
    setYearlyLoading(true);
    try {
      const res = await axios.get(`${API_URL}/reports/yearly?year=${year}&module=${currentModule.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setYearlyData(res.data);
    } catch (error) {
      toast.error('Yıllık rapor yüklenemedi');
      setYearlyData(null);
    } finally {
      setYearlyLoading(false);
    }
  };

  const handleYearlyYearChange = (y) => {
    setYearlySelectedYear(y);
    fetchYearly(y);
  };

  const fetchProductBased = async () => {
    setProductLoading(true);
    try {
      const res = await axios.get(`${API_URL}/reports/product-based?module=${currentModule.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProductData(res.data);
    } catch (error) {
      toast.error('Ürün bazlı rapor yüklenemedi');
      setProductData(null);
    } finally {
      setProductLoading(false);
    }
  };

  // Yıl / Ürün Bazlı sekmelerine ilk geçişte veri çek
  useEffect(() => {
    if (!currentModule) return;
    if (activeTab === 'yearly' && !yearlyData && !yearlyLoading) {
      fetchYearly(yearlySelectedYear);
    }
    if (activeTab === 'product' && !productData && !productLoading) {
      fetchProductBased();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentModule]);

  const yearOptions = (() => {
    const cy = now.getFullYear();
    const arr = [];
    for (let y = cy + 1; y >= cy - 5; y--) arr.push(y);
    return arr;
  })();

  const fetchData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        axios.get(`${API_URL}/reports/daily?days=${period}&module=${currentModule.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/reports/stats?module=${currentModule.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/reports/today-details?module=${currentModule.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/reports/daily-detailed?days=${period}&module=${currentModule.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const [dailyRes, statsRes, todayRes, detailedRes] = results;
      if (dailyRes.status === 'fulfilled') setDailyData(dailyRes.value.data.data);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (todayRes.status === 'fulfilled') setTodayDetails(todayRes.value.data);
      if (detailedRes.status === 'fulfilled') setDailyDetailed(detailedRes.value.data);

      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed === results.length) {
        toast.error('Raporlar yüklenemedi');
      } else if (failed > 0) {
        console.warn(`${failed} rapor isteği başarısız oldu`);
      }
    } catch (error) {
      toast.error('Raporlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const toggleDayExpand = (date) => {
    setExpandedDays(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  const exportToCSV = () => {
    if (!dailyDetailed) return;
    
    const rows = [['Tarih', 'İşletme', 'Ürün', 'Vardiya', 'Adet', 'Net Palet']];
    
    dailyDetailed.data.forEach(day => {
      day.records.forEach(record => {
        rows.push([
          format(new Date(day.date), 'dd/MM/yyyy', { locale: tr }),
          record.department_name,
          record.product_name,
          record.shift_type === 'gunduz' ? 'Gündüz' : 'Gece',
          record.quantity,
          record.net_pallets
        ]);
      });
    });

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `uretim-raporu-detayli-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Detaylı rapor indirildi');
  };

  // Ürün bazlı raporu Excel'e aktar
  const exportProductReportToExcel = () => {
    if (!monthlyData || !monthlyData.by_product || monthlyData.by_product.length === 0) {
      toast.error('Aktarılacak veri yok');
      return;
    }
    const headers = [
      'Ürün',
      'Adet',
      'Net Palet',
      'Çalışılan Vardiya',
      'Şerit',
      'Yapılan Karma',
      'Harcanan Çimento',
      'Makina Çimento',
    ];
    const rows = monthlyData.by_product.map(p => [
      p.product_name || '-',
      Number(p.quantity || 0),
      Number(p.net_pallets || 0),
      Number(p.records || 0),
      Number(p.strip_used || 0),
      Number(p.mix_count || 0),
      Number(p.cement_used || 0),
      Number(p.machine_cement || 0),
    ]);
    // Genel toplam satırı
    const totalsRow = [
      'GENEL TOPLAM',
      monthlyData.by_product.reduce((s, p) => s + (p.quantity || 0), 0),
      monthlyData.by_product.reduce((s, p) => s + (p.net_pallets || 0), 0),
      monthlyData.by_product.reduce((s, p) => s + (p.records || 0), 0),
      monthlyData.by_product.reduce((s, p) => s + (p.strip_used || 0), 0),
      monthlyData.by_product.reduce((s, p) => s + (p.mix_count || 0), 0),
      monthlyData.by_product.reduce((s, p) => s + (p.cement_used || 0), 0),
      monthlyData.by_product.reduce((s, p) => s + (p.machine_cement || 0), 0),
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, totalsRow]);
    ws['!cols'] = [
      { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
      { wch: 10 }, { wch: 16 }, { wch: 18 }, { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    const sheetName = `${AY_ADLARI[selectedMonth - 1]} ${selectedYear}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    const fname = `uretim-urun-bazli-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(wb, fname);
    toast.success('Excel dosyası indirildi');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="reports-page">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Raporlar</h1>
            <p className="text-slate-400">Detaylı üretim analizi ve istatistikler (Üretim Tarihi Bazlı)</p>
          </div>
          <Button
            onClick={exportToCSV}
            data-testid="export-button"
            className="bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 h-12 px-6"
          >
            <Download className="w-5 h-5 mr-2" />
            CSV İndir
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {[7, 14, 30].map((days) => (
            <Button
              key={days}
              onClick={() => setPeriod(days)}
              data-testid={`period-${days}-button`}
              variant={period === days ? 'default' : 'outline'}
              className={period === days
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }
            >
              Son {days} Gün
            </Button>
          ))}
        </div>
      </div>

      {/* Sekme Butonları */}
      <div className="flex gap-2 mb-4" data-testid="report-tabs">
        <button
          onClick={() => setActiveTab('monthly')}
          data-testid="tab-monthly"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'monthly'
              ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Ay Bazlı Rapor
        </button>
        <button
          onClick={() => setActiveTab('yearly')}
          data-testid="tab-yearly"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'yearly'
              ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          Yıl Bazlı Rapor
        </button>
        <button
          onClick={() => setActiveTab('product')}
          data-testid="tab-product"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'product'
              ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          <Package className="w-4 h-4" />
          Ürün Bazlı Rapor
        </button>
      </div>

      {/* AY BAZLI RAPOR - YIL / AY FİLTRESİ */}
      {activeTab === 'monthly' && (
      <div className="glass-effect rounded-xl p-6 border border-cyan-500/30 bg-cyan-500/5 mb-8" data-testid="monthly-panel">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-400/20 border border-cyan-400/30 rounded-lg flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Ay Bazlı Rapor</h2>
              <p className="text-sm text-slate-400">Yıl ve ay seçin, dönem üretim toplamı otomatik gelir</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-400">Yıl:</label>
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              data-testid="year-select"
              className="bg-slate-900 border border-slate-700 text-white rounded-md px-3 py-2 h-10 focus:outline-none focus:border-cyan-500"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <label className="text-sm text-slate-400 ml-2">Ay:</label>
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(parseInt(e.target.value))}
              data-testid="month-select"
              className="bg-slate-900 border border-slate-700 text-white rounded-md px-3 py-2 h-10 focus:outline-none focus:border-cyan-500"
            >
              {AY_ADLARI.map((ad, i) => (
                <option key={i+1} value={i+1}>{ad}</option>
              ))}
            </select>
          </div>
        </div>

        {monthlyLoading ? (
          <div className="text-center py-8 text-slate-400">Yükleniyor...</div>
        ) : monthlyData && monthlyData.totals ? (
          <>
            <p className="text-cyan-400 text-sm mb-4 font-medium">
              {AY_ADLARI[selectedMonth-1]} {selectedYear}
            </p>

            {/* Toplam Kartları */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
              <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-800">
                <p className="text-xs text-slate-400 mb-1">Toplam Üretim</p>
                <p className="text-2xl font-bold font-mono text-orange-400">{fmtTR(monthlyData.totals.total_quantity)}</p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-800">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Sun className="w-3 h-3" /> Gündüz</p>
                <p className="text-2xl font-bold font-mono text-yellow-400">{fmtTR(monthlyData.totals.gunduz_quantity)}</p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-800">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Moon className="w-3 h-3" /> Gece</p>
                <p className="text-2xl font-bold font-mono text-blue-400">{fmtTR(monthlyData.totals.gece_quantity)}</p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-800">
                <p className="text-xs text-slate-400 mb-1">Net Palet</p>
                <p className="text-2xl font-bold font-mono text-purple-400">{fmtTR(monthlyData.totals.total_net_pallets)}</p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-4 border border-cyan-500/30 bg-cyan-500/5">
                <p className="text-xs text-slate-400 mb-1">Çalışılan Vardiya</p>
                <p className="text-2xl font-bold font-mono text-cyan-400">{fmtTR(monthlyData.totals.total_records)}</p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-4 border border-emerald-500/30 bg-emerald-500/5">
                <p className="text-xs text-slate-400 mb-1">Vardiya Başı Palet</p>
                <p className="text-2xl font-bold font-mono text-emerald-400">
                  {monthlyData.totals.total_records > 0
                    ? (monthlyData.totals.total_net_pallets / monthlyData.totals.total_records).toLocaleString('tr-TR', { maximumFractionDigits: 2 })
                    : '0'}
                </p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-800">
                <p className="text-xs text-slate-400 mb-1">Üretilen Palet</p>
                <p className="text-lg font-bold font-mono text-green-400">{fmtTR(monthlyData.totals.total_pallets)}</p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-800">
                <p className="text-xs text-slate-400 mb-1">Fire</p>
                <p className="text-lg font-bold font-mono text-red-400">{fmtTR(monthlyData.totals.total_waste)}</p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-800">
                <p className="text-xs text-slate-400 mb-1">Harcanan Çimento</p>
                <p className="text-lg font-bold font-mono text-amber-400">{fmtTR(monthlyData.totals.total_cement_used)}</p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-800">
                <p className="text-xs text-slate-400 mb-1">Mak. Çimento</p>
                <p className="text-lg font-bold font-mono text-amber-300">{fmtTR(monthlyData.totals.total_machine_cement)}</p>
              </div>
            </div>

            {/* Ürün Bazlı + İşletme Bazlı */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-800">
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-400" />
                    Ürün Bazlı Toplamlar
                  </h3>
                  <Button
                    onClick={exportProductReportToExcel}
                    data-testid="export-product-excel-button"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 text-xs"
                    disabled={!monthlyData?.by_product?.length}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                    Excel&apos;e Aktar
                  </Button>
                </div>
                {monthlyData.by_product && monthlyData.by_product.length > 0 ? (
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="product-report-table">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 text-xs">
                        <th className="text-left py-2 px-2">Ürün</th>
                        <th className="text-right py-2 px-2">Adet</th>
                        <th className="text-right py-2 px-2">Net Palet</th>
                        <th className="text-right py-2 px-2">Çal. Vardiya</th>
                        <th className="text-right py-2 px-2">Şerit</th>
                        <th className="text-right py-2 px-2">Karma</th>
                        <th className="text-right py-2 px-2">Harc. Çimento</th>
                        <th className="text-right py-2 px-2">Mak. Çimento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.by_product.map((p, idx) => (
                        <tr key={idx} className="border-b border-slate-800/50">
                          <td className="py-2 px-2 text-white whitespace-nowrap">{p.product_name}</td>
                          <td className="py-2 px-2 text-right font-mono text-orange-400">{fmtTR(p.quantity)}</td>
                          <td className="py-2 px-2 text-right font-mono text-purple-400">{fmtTR(p.net_pallets)}</td>
                          <td className="py-2 px-2 text-right font-mono text-cyan-400">{fmtTR(p.records)}</td>
                          <td className="py-2 px-2 text-right font-mono text-pink-400">
                            {Number(p.strip_used || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-blue-400">{fmtTR(p.mix_count)}</td>
                          <td className="py-2 px-2 text-right font-mono text-amber-400">{fmtTR(p.cement_used)}</td>
                          <td className="py-2 px-2 text-right font-mono text-amber-300">{fmtTR(p.machine_cement)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-cyan-500/40 bg-slate-800/40">
                        <td className="py-2 px-2 text-white font-bold">GENEL TOPLAM</td>
                        <td className="py-2 px-2 text-right font-mono text-orange-400 font-bold">
                          {fmtTR(monthlyData.by_product.reduce((s, p) => s + (p.quantity || 0), 0))}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-purple-400 font-bold">
                          {fmtTR(monthlyData.by_product.reduce((s, p) => s + (p.net_pallets || 0), 0))}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-cyan-400 font-bold">
                          {fmtTR(monthlyData.by_product.reduce((s, p) => s + (p.records || 0), 0))}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-pink-400 font-bold">
                          {monthlyData.by_product.reduce((s, p) => s + (p.strip_used || 0), 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-blue-400 font-bold">
                          {fmtTR(monthlyData.by_product.reduce((s, p) => s + (p.mix_count || 0), 0))}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-amber-400 font-bold">
                          {fmtTR(monthlyData.by_product.reduce((s, p) => s + (p.cement_used || 0), 0))}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-amber-300 font-bold">
                          {fmtTR(monthlyData.by_product.reduce((s, p) => s + (p.machine_cement || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Veri yok</p>
                )}
              </div>

              <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-800">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Factory className="w-4 h-4 text-cyan-400" />
                  İşletme Bazlı Toplamlar
                </h3>
                {monthlyData.by_department && monthlyData.by_department.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 text-xs">
                        <th className="text-left py-2">İşletme</th>
                        <th className="text-right py-2">Adet</th>
                        <th className="text-right py-2">Net Palet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.by_department.map((d, idx) => (
                        <tr key={idx} className="border-b border-slate-800/50">
                          <td className="py-2 text-white">{d.department_name}</td>
                          <td className="py-2 text-right font-mono text-orange-400">{fmtTR(d.quantity)}</td>
                          <td className="py-2 text-right font-mono text-purple-400">{fmtTR(d.net_pallets)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-cyan-500/40 bg-slate-800/40">
                        <td className="py-2 text-white font-bold">GENEL TOPLAM</td>
                        <td className="py-2 text-right font-mono text-orange-400 font-bold">
                          {fmtTR(monthlyData.by_department.reduce((s, d) => s + (d.quantity || 0), 0))}
                        </td>
                        <td className="py-2 text-right font-mono text-purple-400 font-bold">
                          {fmtTR(monthlyData.by_department.reduce((s, d) => s + (d.net_pallets || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <p className="text-slate-500 text-sm">Veri yok</p>
                )}
              </div>
            </div>

            {/* Operatör bazlı - Vardiya Toplamları */}
            {monthlyData.by_operator && monthlyData.by_operator.length > 0 && (
              <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-800 mt-4" data-testid="operator-table">
                <h3 className="text-sm font-semibold text-white mb-3">Çalışan Vardiya Toplamları</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 text-xs">
                        <th className="text-left py-2 px-2">Operatör</th>
                        <th className="text-right py-2 px-2">
                          <span className="inline-flex items-center gap-1 text-yellow-400">
                            <Sun className="w-3 h-3" /> Gündüz V.
                          </span>
                        </th>
                        <th className="text-right py-2 px-2">
                          <span className="inline-flex items-center gap-1 text-blue-400">
                            <Moon className="w-3 h-3" /> Gece V.
                          </span>
                        </th>
                        <th className="text-right py-2 px-2 text-yellow-400">Gündüz Adet</th>
                        <th className="text-right py-2 px-2 text-blue-400">Gece Adet</th>
                        <th className="text-right py-2 px-2">Toplam Adet</th>
                        <th className="text-right py-2 px-2">Net Palet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.by_operator.map((o, idx) => (
                        <tr key={idx} className="border-b border-slate-800/50">
                          <td className="py-2 px-2 text-white">{o.operator_name}</td>
                          <td className="py-2 px-2 text-right font-mono text-yellow-400">{o.gunduz_count || 0}</td>
                          <td className="py-2 px-2 text-right font-mono text-blue-400">{o.gece_count || 0}</td>
                          <td className="py-2 px-2 text-right font-mono text-yellow-300">{fmtTR(o.gunduz_quantity || 0)}</td>
                          <td className="py-2 px-2 text-right font-mono text-blue-300">{fmtTR(o.gece_quantity || 0)}</td>
                          <td className="py-2 px-2 text-right font-mono text-orange-400 font-semibold">{fmtTR(o.quantity)}</td>
                          <td className="py-2 px-2 text-right font-mono text-purple-400">{fmtTR(o.net_pallets)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-cyan-500/40 bg-slate-800/40">
                        <td className="py-2 px-2 text-white font-bold">GENEL TOPLAM</td>
                        <td className="py-2 px-2 text-right font-mono text-yellow-400 font-bold">
                          {monthlyData.by_operator.reduce((s, o) => s + (o.gunduz_count || 0), 0)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-blue-400 font-bold">
                          {monthlyData.by_operator.reduce((s, o) => s + (o.gece_count || 0), 0)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-yellow-300 font-bold">
                          {fmtTR(monthlyData.by_operator.reduce((s, o) => s + (o.gunduz_quantity || 0), 0))}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-blue-300 font-bold">
                          {fmtTR(monthlyData.by_operator.reduce((s, o) => s + (o.gece_quantity || 0), 0))}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-orange-400 font-bold">
                          {fmtTR(monthlyData.by_operator.reduce((s, o) => s + (o.quantity || 0), 0))}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-purple-400 font-bold">
                          {fmtTR(monthlyData.by_operator.reduce((s, o) => s + (o.net_pallets || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-slate-500">Bu dönem için veri bulunmuyor</div>
        )}
      </div>
      )}

      {/* YIL BAZLI RAPOR */}
      {activeTab === 'yearly' && (
      <div className="glass-effect rounded-xl p-6 border border-purple-500/30 bg-purple-500/5 mb-8" data-testid="yearly-panel">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-400/20 border border-purple-400/30 rounded-lg flex items-center justify-center">
              <CalendarRange className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Yıl Bazlı Rapor</h2>
              <p className="text-sm text-slate-400">Seçilen yıl için aylık üretim toplamları</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-400">Yıl:</label>
            <select
              value={yearlySelectedYear}
              onChange={(e) => handleYearlyYearChange(parseInt(e.target.value))}
              data-testid="yearly-year-select"
              className="bg-slate-900 border border-slate-700 text-white rounded-md px-3 py-2 h-10 focus:outline-none focus:border-purple-500"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {yearlyLoading ? (
          <div className="text-center py-8 text-slate-400">Yükleniyor...</div>
        ) : yearlyData && yearlyData.months ? (
          <>
            <p className="text-purple-400 text-sm mb-4 font-medium">
              {yearlyData.year} Yılı Aylık Toplamları
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="yearly-report-table">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs">
                    <th className="text-left py-3 px-3">Ay</th>
                    <th className="text-right py-3 px-3">Üretilen Net Palet</th>
                    <th className="text-right py-3 px-3">Çalışılan Vardiya</th>
                    <th className="text-right py-3 px-3">Harcanan Çimento</th>
                    <th className="text-right py-3 px-3">Vardiya Başı</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyData.months.map((m) => (
                    <tr key={m.month} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-3 px-3 text-white font-medium">{m.month_name}</td>
                      <td className="py-3 px-3 text-right font-mono text-purple-400">{fmtTR(m.total_net_pallets)}</td>
                      <td className="py-3 px-3 text-right font-mono text-cyan-400">{fmtTR(m.total_records)}</td>
                      <td className="py-3 px-3 text-right font-mono text-amber-400">{fmtTR(m.total_cement_used)}</td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-400">
                        {m.total_records > 0
                          ? (m.total_net_pallets / m.total_records).toLocaleString('tr-TR', { maximumFractionDigits: 2 })
                          : '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-purple-500/40 bg-slate-800/40">
                    <td className="py-3 px-3 text-white font-bold text-base">GENEL TOPLAM</td>
                    <td className="py-3 px-3 text-right font-mono text-purple-400 font-bold text-base">
                      {fmtTR(yearlyData.totals.total_net_pallets)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-cyan-400 font-bold text-base">
                      {fmtTR(yearlyData.totals.total_records)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-400 font-bold text-base">
                      {fmtTR(yearlyData.totals.total_cement_used)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 font-bold text-base">
                      {yearlyData.totals.total_records > 0
                        ? (yearlyData.totals.total_net_pallets / yearlyData.totals.total_records).toLocaleString('tr-TR', { maximumFractionDigits: 2 })
                        : '0'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-slate-500">Bu yıl için veri bulunmuyor</div>
        )}
      </div>
      )}

      {/* ÜRÜN BAZLI RAPOR */}
      {activeTab === 'product' && (
      <div className="glass-effect rounded-xl p-6 border border-orange-500/30 bg-orange-500/5 mb-8" data-testid="product-panel">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-400/20 border border-orange-400/30 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Ürün Bazlı Rapor</h2>
              <p className="text-sm text-slate-400">Ürün bazlı üretim ve üretimden çıkan toplamları — İçeride Kalan otomatik hesaplanır</p>
            </div>
          </div>
        </div>

        {productLoading ? (
          <div className="text-center py-8 text-slate-400">Yükleniyor...</div>
        ) : productData && productData.products && productData.products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="product-based-table">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs">
                  <th className="text-left py-3 px-3">Ürün</th>
                  <th className="text-right py-3 px-3">Üretilen Adet</th>
                  <th className="text-right py-3 px-3">Önceki Yıldan Kalan</th>
                  <th className="text-right py-3 px-3">Çıkan Adet</th>
                  <th className="text-right py-3 px-3">İçeride Kalan</th>
                </tr>
              </thead>
              <tbody>
                {productData.products.map((p, idx) => {
                  const kalan = Number(p.icerde_kalan || 0);
                  const kalanColor = kalan < 0 ? 'text-red-400' : kalan === 0 ? 'text-slate-300' : 'text-emerald-400';
                  return (
                    <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-3 px-3 text-white font-medium">{p.product_name}</td>
                      <td className="py-3 px-3 text-right font-mono text-orange-400">{fmtTR(p.uretilen)}</td>
                      <td className="py-3 px-3 text-right font-mono text-amber-300">{fmtTR(p.onceki_yil_kalan || 0)}</td>
                      <td className="py-3 px-3 text-right font-mono text-blue-400">{fmtTR(p.cikan)}</td>
                      <td className={`py-3 px-3 text-right font-mono font-semibold ${kalanColor}`}>{fmtTR(kalan)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-orange-500/40 bg-slate-800/40">
                  <td className="py-3 px-3 text-white font-bold text-base">GENEL TOPLAM</td>
                  <td className="py-3 px-3 text-right font-mono text-orange-400 font-bold text-base">
                    {fmtTR(productData.totals.total_uretilen)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-300 font-bold text-base">
                    {fmtTR(productData.totals.total_onceki_yil_kalan || 0)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-blue-400 font-bold text-base">
                    {fmtTR(productData.totals.total_cikan)}
                  </td>
                  <td className={`py-3 px-3 text-right font-mono font-bold text-base ${
                    Number(productData.totals.total_icerde_kalan) < 0 ? 'text-red-400'
                    : Number(productData.totals.total_icerde_kalan) === 0 ? 'text-slate-300'
                    : 'text-emerald-400'
                  }`}>
                    {fmtTR(productData.totals.total_icerde_kalan)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">Veri bulunmuyor</div>
        )}
      </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-400/10 border border-green-400/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Bugünkü Üretim</p>
              <p className="text-2xl font-bold font-mono text-green-400">
                {stats?.today_production?.toLocaleString('tr-TR') || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-400/10 border border-blue-400/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Haftalık Üretim</p>
              <p className="text-2xl font-bold font-mono text-blue-400">
                {stats?.week_production?.toLocaleString('tr-TR') || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-orange-400/10 border border-orange-400/20 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Toplam Kayıt</p>
              <p className="text-2xl font-bold font-mono text-orange-400">
                {stats?.total_records?.toLocaleString('tr-TR') || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gün Gün Detaylı Üretim Verileri */}
      <div className="glass-effect rounded-xl p-6 border border-slate-800 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-400/10 border border-indigo-400/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Gün Gün Üretim Verileri</h2>
              <p className="text-sm text-slate-400">Son {period} günlük detaylı üretim tablosu</p>
            </div>
          </div>
        </div>

        {dailyDetailed && dailyDetailed.data && dailyDetailed.data.length > 0 ? (
          <div className="space-y-4">
            {dailyDetailed.data.map((day) => (
              <div key={day.date} className="border border-slate-700 rounded-xl overflow-hidden">
                {/* Gün Başlığı - Tıklanabilir */}
                <div 
                  onClick={() => toggleDayExpand(day.date)}
                  className="bg-slate-800/50 p-4 cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">
                          {format(new Date(day.date), 'dd', { locale: tr })}
                        </p>
                        <p className="text-sm text-slate-400">
                          {format(new Date(day.date), 'MMM', { locale: tr })}
                        </p>
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {format(new Date(day.date), 'EEEE', { locale: tr })}
                        </p>
                        <p className="text-sm text-slate-500">
                          {day.records.length} kayıt
                        </p>
                      </div>
                    </div>
                    
                    {/* Günlük Özet */}
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Sun className="w-4 h-4" />
                          <span className="font-mono font-semibold">{day.totals.gunduz_quantity.toLocaleString('tr-TR')}</span>
                        </div>
                        <p className="text-xs text-slate-500">Gündüz</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-blue-400">
                          <Moon className="w-4 h-4" />
                          <span className="font-mono font-semibold">{day.totals.gece_quantity.toLocaleString('tr-TR')}</span>
                        </div>
                        <p className="text-xs text-slate-500">Gece</p>
                      </div>
                      <div className="text-center border-l border-slate-600 pl-4">
                        <p className="font-mono font-bold text-orange-400 text-lg">
                          {day.totals.total_quantity.toLocaleString('tr-TR')}
                        </p>
                        <p className="text-xs text-slate-500">Toplam Adet</p>
                      </div>
                      <div className="text-center">
                        <p className="font-mono font-bold text-purple-400 text-lg">
                          {day.totals.total_net_pallets.toLocaleString('tr-TR')}
                        </p>
                        <p className="text-xs text-slate-500">Net Palet</p>
                      </div>
                      <div className="text-slate-400">
                        {expandedDays[day.date] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detay Tablosu - Açılır/Kapanır */}
                {expandedDays[day.date] && (
                  <div className="p-4 bg-slate-900/50">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-2 px-3 text-slate-400 text-sm font-medium">
                            <div className="flex items-center gap-1">
                              <Factory className="w-4 h-4" />
                              İşletme
                            </div>
                          </th>
                          <th className="text-left py-2 px-3 text-slate-400 text-sm font-medium">
                            <div className="flex items-center gap-1">
                              <Package className="w-4 h-4" />
                              Ürün
                            </div>
                          </th>
                          <th className="text-center py-2 px-3 text-slate-400 text-sm font-medium">Vardiya</th>
                          <th className="text-right py-2 px-3 text-slate-400 text-sm font-medium">Adet</th>
                          <th className="text-right py-2 px-3 text-slate-400 text-sm font-medium">Net Palet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.records.map((record, idx) => (
                          <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/30">
                            <td className="py-2 px-3 text-white">{record.department_name}</td>
                            <td className="py-2 px-3 text-slate-300">{record.product_name}</td>
                            <td className="py-2 px-3 text-center">
                              {record.shift_type === 'gunduz' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-xs">
                                  <Sun className="w-3 h-3" />
                                  Gündüz
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs">
                                  <Moon className="w-3 h-3" />
                                  Gece
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-orange-400 font-semibold">
                              {record.quantity.toLocaleString('tr-TR')}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-purple-400 font-semibold">
                              {record.net_pallets.toLocaleString('tr-TR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-800/30">
                          <td colSpan={3} className="py-2 px-3 text-white font-semibold">Gün Toplamı</td>
                          <td className="py-2 px-3 text-right font-mono text-orange-400 font-bold">
                            {day.totals.total_quantity.toLocaleString('tr-TR')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-purple-400 font-bold">
                            {day.totals.total_net_pallets.toLocaleString('tr-TR')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            ))}

            {/* Genel Toplam */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-600">
              <h3 className="text-lg font-semibold text-white mb-4">
                📊 Genel Toplam ({dailyDetailed.grand_totals.total_days} Gün)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="text-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <Sun className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <p className="text-xl font-bold font-mono text-yellow-400">
                    {dailyDetailed.grand_totals.gunduz_quantity.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-xs text-slate-400">Gündüz Adet</p>
                </div>
                <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <Moon className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <p className="text-xl font-bold font-mono text-blue-400">
                    {dailyDetailed.grand_totals.gece_quantity.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-xs text-slate-400">Gece Adet</p>
                </div>
                <div className="text-center p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                  <Package className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                  <p className="text-xl font-bold font-mono text-orange-400">
                    {dailyDetailed.grand_totals.total_quantity.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-xs text-slate-400">Toplam Adet</p>
                </div>
                <div className="text-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <Sun className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <p className="text-xl font-bold font-mono text-yellow-400">
                    {dailyDetailed.grand_totals.gunduz_net_pallets.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-xs text-slate-400">Gündüz Palet</p>
                </div>
                <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <Moon className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <p className="text-xl font-bold font-mono text-blue-400">
                    {dailyDetailed.grand_totals.gece_net_pallets.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-xs text-slate-400">Gece Palet</p>
                </div>
                <div className="text-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <Package className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                  <p className="text-xl font-bold font-mono text-purple-400">
                    {dailyDetailed.grand_totals.total_net_pallets.toLocaleString('tr-TR')}
                  </p>
                  <p className="text-xs text-slate-400">Toplam Palet</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            Bu dönem için veri bulunmuyor
          </div>
        )}
      </div>

      {/* Line Chart */}
      <div className="glass-effect rounded-xl p-6 border border-slate-800 mb-8">
        <h2 className="text-xl font-semibold text-white mb-6">Üretim Trendi</h2>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8' }}
              tickFormatter={(value) => format(new Date(value), 'dd MMM', { locale: tr })}
            />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f8fafc'
              }}
              labelFormatter={(value) => format(new Date(value), 'dd MMMM yyyy', { locale: tr })}
            />
            <Legend wrapperStyle={{ color: '#94a3b8' }} />
            <Line
              type="monotone"
              dataKey="quantity"
              name="Üretim (Adet)"
              stroke="#f97316"
              strokeWidth={3}
              dot={{ fill: '#f97316', r: 5 }}
              activeDot={{ r: 7 }}
            />
            <Line
              type="monotone"
              dataKey="net_pallets"
              name="Net Palet"
              stroke="#a855f7"
              strokeWidth={3}
              dot={{ fill: '#a855f7', r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart */}
      <div className="glass-effect rounded-xl p-6 border border-slate-800">
        <h2 className="text-xl font-semibold text-white mb-6">Günlük Üretim Karşılaştırması</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8' }}
              tickFormatter={(value) => format(new Date(value), 'dd MMM', { locale: tr })}
            />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f8fafc'
              }}
              labelFormatter={(value) => format(new Date(value), 'dd MMMM yyyy', { locale: tr })}
            />
            <Legend wrapperStyle={{ color: '#94a3b8' }} />
            <Bar dataKey="quantity" name="Üretim (Adet)" fill="#f97316" radius={[8, 8, 0, 0]} />
            <Bar dataKey="net_pallets" name="Net Palet" fill="#a855f7" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Reports;
