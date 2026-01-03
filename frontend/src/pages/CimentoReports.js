import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, Download, FileText } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const CimentoReports = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);

  useEffect(() => {
    if (!currentModule || currentModule.id !== 'cimento') {
      navigate('/');
      return;
    }
    fetchRecords();
  }, [currentModule, period]);

  const fetchRecords = async () => {
    try {
      const response = await axios.get(`${API_URL}/cimento-records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(response.data);
    } catch (error) {
      toast.error('Kayıtlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Günlük verileri hesapla
  const getDailyData = () => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - period);

    const dailyMap = {};
    
    records.forEach(record => {
      const date = record.tarih || record.created_at?.split('T')[0];
      if (date && new Date(date) >= startDate) {
        if (!dailyMap[date]) {
          dailyMap[date] = { date, miktar: 0, count: 0 };
        }
        dailyMap[date].miktar += record.miktar || 0;
        dailyMap[date].count += 1;
      }
    });

    return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  };

  const dailyData = getDailyData();

  // Toplam istatistikler
  const totalMiktar = records.reduce((sum, r) => sum + (r.miktar || 0), 0);
  const todayMiktar = records
    .filter(r => r.tarih === new Date().toISOString().split('T')[0])
    .reduce((sum, r) => sum + (r.miktar || 0), 0);
  const weekMiktar = dailyData.reduce((sum, d) => sum + d.miktar, 0);

  const exportToCSV = () => {
    const rows = [['Tarih', 'Çimento Firma', 'Nakliyeci', 'Plaka', 'Şoför', 'Miktar', 'Birim']];
    records.forEach(r => {
      rows.push([
        r.tarih || '',
        r.cimento_firma_name || '',
        r.nakliyeci_firma_name || '',
        r.plaka || '',
        r.sofor_name || '',
        r.miktar || 0,
        r.birim || ''
      ]);
    });

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cimento-rapor-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Rapor indirildi');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Çimento Raporları</h1>
            <p className="text-slate-400">Detaylı çimento analizi ve istatistikler</p>
          </div>
          <Button
            onClick={exportToCSV}
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
              variant={period === days ? 'default' : 'outline'}
              className={period === days
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }
            >
              Son {days} Gün
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-400/10 border border-green-400/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Bugünkü Miktar</p>
              <p className="text-2xl font-bold font-mono text-green-400">{todayMiktar.toFixed(2)} ton</p>
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-400/10 border border-blue-400/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Son {period} Gün</p>
              <p className="text-2xl font-bold font-mono text-blue-400">{weekMiktar.toFixed(2)} ton</p>
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
              <p className="text-2xl font-bold font-mono text-orange-400">{records.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {dailyData.length > 0 ? (
        <>
          <div className="glass-effect rounded-xl p-6 border border-slate-800 mb-8">
            <h2 className="text-xl font-semibold text-white mb-6">Günlük Çimento Miktarı</h2>
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
                <Legend />
                <Line
                  type="monotone"
                  dataKey="miktar"
                  name="Miktar (ton)"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-effect rounded-xl p-6 border border-slate-800">
            <h2 className="text-xl font-semibold text-white mb-6">Günlük Karşılaştırma</h2>
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
                <Legend />
                <Bar dataKey="miktar" name="Miktar (ton)" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="glass-effect rounded-xl p-12 border border-slate-800 text-center">
          <p className="text-slate-500">Bu dönem için veri bulunmuyor</p>
        </div>
      )}
    </div>
  );
};

export default CimentoReports;
