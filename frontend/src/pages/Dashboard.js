import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, TrendingUp, Calendar, Clock, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Dashboard = () => {
  const { token } = useAuth();
  const { currentModule, clearModule } = useModule();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentModule) {
      navigate('/');
      return;
    }
    // Çimento modülüne özel sayfaya yönlendir
    if (currentModule.id === 'cimento') {
      navigate('/cimento');
      return;
    }
    fetchData();
  }, [currentModule]);

  const fetchData = async () => {
    try {
      const [statsRes, dailyRes] = await Promise.all([
        axios.get(`${API_URL}/reports/stats?module=${currentModule.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/reports/daily?days=7&module=${currentModule.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setStats(statsRes.data);
      setDailyData(dailyRes.data.data);
    } catch (error) {
      toast.error('İstatistikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  if (!currentModule) {
    return null;
  }

  // Ayarlar modülü için direkt settings sayfasına yönlendir
  if (currentModule.id === 'ayarlar') {
    navigate('/settings', { replace: true });
    return null;
  }

  // Only Bims module has full functionality for now
  if (currentModule.id !== 'bims') {
    return (
      <div className="animate-fade-in" data-testid="dashboard-page">
        <div className="glass-effect rounded-xl p-12 border border-slate-800 text-center">
          <div className={`inline-flex w-24 h-24 bg-gradient-to-br ${currentModule.color} rounded-3xl items-center justify-center text-5xl mb-6 shadow-2xl`}>
            {currentModule.icon}
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">{currentModule.name}</h1>
          <p className="text-xl text-slate-400 mb-8">{currentModule.description}</p>
          <div className="max-w-md mx-auto bg-slate-800/30 rounded-xl p-6 border border-slate-700">
            <p className="text-slate-300 text-lg">Bu modül için özellikler hazırlanıyor...</p>
            <p className="text-slate-500 text-sm mt-2">Yakında eklenecek</p>
          </div>
          <button
            onClick={() => {
              clearModule();
              navigate('/');
            }}
            className="mt-8 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all"
          >
            ← Modül Seçimine Dön
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Bugünkü Üretim',
      value: stats?.today_production || 0,
      icon: Clock,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
      border: 'border-green-400/20',
      testId: 'stat-today-production'
    },
    {
      title: 'Haftalık Üretim',
      value: stats?.week_production || 0,
      icon: Calendar,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      border: 'border-blue-400/20',
      testId: 'stat-week-production'
    },
    {
      title: 'Aylık Üretim',
      value: stats?.month_production || 0,
      icon: TrendingUp,
      color: 'text-orange-400',
      bg: 'bg-orange-400/10',
      border: 'border-orange-400/20',
      testId: 'stat-month-production'
    },
    {
      title: 'Toplam Kayıt',
      value: stats?.total_records || 0,
      icon: Package,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      border: 'border-purple-400/20',
      testId: 'stat-total-records'
    },
  ];

  return (
    <div className="animate-fade-in" data-testid="dashboard-page">
      {/* Hero Section */}
      <div className="glass-effect rounded-xl p-8 border border-slate-800 mb-8 bg-gradient-to-br from-slate-900/50 to-slate-950/50">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <button
              onClick={() => {
                clearModule();
                navigate('/');
              }}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Modül Değiştir
            </button>
            <div className="flex items-center gap-4 mb-3">
              <div className={`w-14 h-14 bg-gradient-to-br ${currentModule.color} rounded-xl flex items-center justify-center text-2xl shadow-lg`}>
                {currentModule.icon}
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white">
                  {currentModule.name}
                </h1>
                <p className="text-lg text-slate-400">{currentModule.description}</p>
              </div>
            </div>
            <p className="text-sm text-slate-500">Bugün: {format(new Date(), 'dd MMMM yyyy, EEEE', { locale: tr })}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/production-entry')}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-lg shadow-orange-500/20 transition-all active:scale-95"
            >
              + Hızlı Kayıt
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              data-testid={stat.testId}
              className="stat-card glass-effect rounded-xl p-6 border border-slate-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.bg} ${stat.border} border rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-slate-400 mb-1">{stat.title}</h3>
              <p className={`text-3xl font-bold font-mono ${stat.color}`}>
                {stat.value.toLocaleString('tr-TR')}
              </p>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="glass-effect rounded-xl p-6 border border-slate-800 mb-8">
        <h2 className="text-xl font-semibold text-white mb-6">Son 7 Gün Üretim Grafiği</h2>
        <ResponsiveContainer width="100%" height={300}>
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
            <Bar dataKey="quantity" fill="#f97316" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Records */}
      <div className="glass-effect rounded-xl p-6 border border-slate-800">
        <h2 className="text-xl font-semibold text-white mb-6">Son Kayıtlar</h2>
        <div className="space-y-3">
          {stats?.recent_records?.length > 0 ? (
            stats.recent_records.map((record, index) => (
              <div
                key={record.id}
                data-testid={`recent-record-${index}`}
                className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-800 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">{record.product_name}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="font-mono">{record.quantity} {record.unit}</span>
                    <span>•</span>
                    <span>{record.user_name}</span>
                    {record.shift && (
                      <>
                        <span>•</span>
                        <span>{record.shift}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-slate-500">
                  {format(new Date(record.created_at), 'dd MMM HH:mm', { locale: tr })}
                </div>
              </div>
            ))
          ) : (
            <div data-testid="no-records" className="text-center py-8 text-slate-500">
              Henüz kayıt bulunmuyor
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;