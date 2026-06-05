import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { useNavigate } from 'react-router-dom';
import { FileText, List, BarChart3, Database, Fuel, TrendingUp, TrendingDown, Truck, DollarSign } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MotorinDashboard = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    mevcut_stok: 0,
    toplam_alim: 0,
    toplam_verme: 0,
    ayki_alim: 0,
    ayki_maliyet: 0,
    ayki_verme: 0,
    bugunki_alim_sayisi: 0,
    bugunki_verme_sayisi: 0,
    tedarikci_sayisi: 0
  });
  const [recentAlimlar, setRecentAlimlar] = useState([]);
  const [recentVermeler, setRecentVermeler] = useState([]);

  useEffect(() => {
    if (!currentModule || currentModule.id !== 'motorin') {
      navigate('/');
      return;
    }
    fetchStats();
    fetchRecentRecords();
  }, [currentModule]);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/motorin-ozet`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (error) {
      console.log('Stats yüklenemedi');
    }
  };

  const fetchRecentRecords = async () => {
    try {
      const [alimRes, vermeRes] = await Promise.all([
        axios.get(`${API_URL}/motorin-alimlar`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/motorin-verme`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setRecentAlimlar(alimRes.data.slice(0, 5));
      setRecentVermeler(vermeRes.data.slice(0, 5));
    } catch (error) {
      console.log('Kayıtlar yüklenemedi');
    }
  };

  const quickActions = [
    { path: '/motorin-alim', icon: TrendingUp, label: 'Motorin Alımı', color: 'from-green-500 to-green-600', description: 'Yeni motorin alım kaydı' },
    { path: '/motorin-verme-giris', icon: TrendingDown, label: 'Araçlara Verme', color: 'from-blue-500 to-blue-600', description: 'Araçlara motorin ver' },
    { path: '/motorin-liste', icon: List, label: 'Kayıtlar', color: 'from-purple-500 to-purple-600', description: 'Tüm kayıtları görüntüle' },
    { path: '/motorin-kaynaklar', icon: Database, label: 'Kaynaklar', color: 'from-orange-500 to-orange-600', description: 'Tedarikçi yönetimi' },
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(num);
  };

  return (
    <div className="animate-fade-in" data-testid="motorin-dashboard">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">⛽ Motorin Modülü</h1>
        <p className="text-slate-400">Motorin stok, alım ve tüketim takip sistemi</p>
      </div>

      {/* Ana Stok Kartı */}
      <div className="glass-effect rounded-2xl p-6 border border-slate-800 mb-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center">
            <Fuel className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Mevcut Stok</p>
            <p className="text-4xl font-bold text-white">{formatNumber(stats.mevcut_stok)} <span className="text-lg text-slate-400">Litre</span></p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-xs text-slate-400">Toplam Alım</p>
            <p className="text-lg font-semibold text-green-400">{formatNumber(stats.toplam_alim)} L</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-xs text-slate-400">Toplam Verme</p>
            <p className="text-lg font-semibold text-blue-400">{formatNumber(stats.toplam_verme)} L</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-effect rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{formatNumber(stats.ayki_alim)} L</p>
              <p className="text-xs text-slate-400">Bu Ay Alım</p>
            </div>
          </div>
        </div>
        <div className="glass-effect rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{formatNumber(stats.ayki_verme)} L</p>
              <p className="text-xs text-slate-400">Bu Ay Tüketim</p>
            </div>
          </div>
        </div>
        <div className="glass-effect rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{formatCurrency(stats.ayki_maliyet)}</p>
              <p className="text-xs text-slate-400">Bu Ay Maliyet</p>
            </div>
          </div>
        </div>
        <div className="glass-effect rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{stats.tedarikci_sayisi}</p>
              <p className="text-xs text-slate-400">Tedarikçi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bugünkü İşlemler */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="glass-effect rounded-xl p-4 border border-green-500/30 bg-green-500/5">
          <p className="text-sm text-green-400 mb-1">Bugün Alım</p>
          <p className="text-3xl font-bold text-white">{stats.bugunki_alim_sayisi} <span className="text-sm text-slate-400">kayıt</span></p>
        </div>
        <div className="glass-effect rounded-xl p-4 border border-blue-500/30 bg-blue-500/5">
          <p className="text-sm text-blue-400 mb-1">Bugün Verme</p>
          <p className="text-3xl font-bold text-white">{stats.bugunki_verme_sayisi} <span className="text-sm text-slate-400">kayıt</span></p>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-bold text-white mb-4">Hızlı İşlemler</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="group glass-effect rounded-xl p-4 border border-slate-800 hover:border-slate-700 transition-all hover:-translate-y-1 text-left"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">{action.label}</h3>
              <p className="text-xs text-slate-400">{action.description}</p>
            </button>
          );
        })}
      </div>

      {/* Son Kayıtlar */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Son Alımlar */}
        <div className="glass-effect rounded-xl border border-slate-800 p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Son Alımlar
          </h3>
          {recentAlimlar.length > 0 ? (
            <div className="space-y-3">
              {recentAlimlar.map((alim) => (
                <div key={alim.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">{alim.tedarikci_adi || 'Tedarikçi'}</p>
                    <p className="text-xs text-slate-400">{alim.tarih}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-400">{formatNumber(alim.miktar_litre)} L</p>
                    <p className="text-xs text-slate-400">{formatCurrency(alim.toplam_tutar)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center py-4">Henüz alım kaydı yok</p>
          )}
        </div>

        {/* Son Vermeler */}
        <div className="glass-effect rounded-xl border border-slate-800 p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-blue-400" />
            Son Araç Vermeleri
          </h3>
          {recentVermeler.length > 0 ? (
            <div className="space-y-3">
              {recentVermeler.map((verme) => (
                <div key={verme.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white">{verme.arac_plaka || 'Araç'}</p>
                    <p className="text-xs text-slate-400">{verme.tarih} {verme.kilometre > 0 && `• ${formatNumber(verme.kilometre)} km`}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-blue-400">{formatNumber(verme.miktar_litre)} L</p>
                    <p className="text-xs text-slate-400">{verme.sofor_adi || verme.personel_adi || '-'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center py-4">Henüz verme kaydı yok</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MotorinDashboard;
