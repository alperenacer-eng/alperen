import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileText, List, BarChart3, Database, TrendingUp, Package } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const CimentoDashboard = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    cimentoFirmalar: 0,
    nakliyeciFirmalar: 0,
    plakalar: 0,
    soforler: 0,
    sehirler: 0,
    todayRecords: 0
  });

  useEffect(() => {
    if (!currentModule || currentModule.id !== 'cimento') {
      navigate('/');
      return;
    }
    fetchStats();
  }, [currentModule]);

  const fetchStats = async () => {
    try {
      const [cimentoRes, nakliyeciRes, plakaRes, soforRes, sehirRes, recordsRes] = await Promise.all([
        axios.get(`${API_URL}/cimento-firmalar`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/nakliyeci-firmalar`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/plakalar`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/soforler`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/sehirler`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/cimento-records`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);

      setStats({
        cimentoFirmalar: cimentoRes.data.length,
        nakliyeciFirmalar: nakliyeciRes.data.length,
        plakalar: plakaRes.data.length,
        soforler: soforRes.data.length,
        sehirler: sehirRes.data.length,
        todayRecords: recordsRes.data.length
      });
    } catch (error) {
      console.log('Stats yüklenemedi');
    }
  };

  const quickActions = [
    { path: '/cimento-entry', icon: FileText, label: 'Çimento Girişi', color: 'from-blue-500 to-blue-600', description: 'Yeni çimento kaydı oluştur' },
    { path: '/cimento-list', icon: List, label: 'Kayıtlar', color: 'from-green-500 to-green-600', description: 'Tüm kayıtları görüntüle' },
    { path: '/cimento-reports', icon: BarChart3, label: 'Raporlar', color: 'from-purple-500 to-purple-600', description: 'Detaylı raporları incele' },
    { path: '/cimento-resources', icon: Database, label: 'Kaynaklar', color: 'from-orange-500 to-orange-600', description: 'Firma, plaka, şoför yönetimi' },
  ];

  return (
    <div className="animate-fade-in" data-testid="cimento-dashboard">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">🏗️ Çimento Modülü</h1>
        <p className="text-slate-400">Çimento takip ve yönetim sistemi</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="glass-effect rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.cimentoFirmalar}</p>
              <p className="text-xs text-slate-400">Çimento Firma</p>
            </div>
          </div>
        </div>
        <div className="glass-effect rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.nakliyeciFirmalar}</p>
              <p className="text-xs text-slate-400">Nakliyeci</p>
            </div>
          </div>
        </div>
        <div className="glass-effect rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.plakalar}</p>
              <p className="text-xs text-slate-400">Plaka</p>
            </div>
          </div>
        </div>
        <div className="glass-effect rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.soforler}</p>
              <p className="text-xs text-slate-400">Şoför</p>
            </div>
          </div>
        </div>
        <div className="glass-effect rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.sehirler}</p>
              <p className="text-xs text-slate-400">Şehir</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-semibold text-white mb-4">Hızlı İşlemler</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="group glass-effect rounded-xl p-6 border border-slate-800 hover:border-slate-700 transition-all hover:-translate-y-1 text-left"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">{action.label}</h3>
              <p className="text-sm text-slate-400">{action.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CimentoDashboard;
