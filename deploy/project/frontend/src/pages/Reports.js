import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, Download, FileText, Sun, Moon, Factory, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

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
  }, [period, currentModule]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dailyRes, statsRes, todayRes, detailedRes] = await Promise.all([
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

      setDailyData(dailyRes.data.data);
      setStats(statsRes.data);
      setTodayDetails(todayRes.data);
      setDailyDetailed(detailedRes.data);
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
