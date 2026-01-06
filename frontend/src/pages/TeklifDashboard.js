import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  FileText,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  ArrowRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TeklifDashboard = () => {
  const { token } = useAuth();
  const [ozet, setOzet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOzet();
  }, []);

  const fetchOzet = async () => {
    try {
      const response = await fetch(`${API_URL}/api/teklif-ozet`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOzet(data);
      }
    } catch (error) {
      console.error('Özet yüklenirken hata:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);
  };

  const getDurumBadge = (durum) => {
    const durumlar = {
      taslak: { label: 'Taslak', color: 'bg-slate-500' },
      gonderildi: { label: 'Gönderildi', color: 'bg-blue-500' },
      beklemede: { label: 'Beklemede', color: 'bg-yellow-500' },
      kabul_edildi: { label: 'Kabul Edildi', color: 'bg-green-500' },
      reddedildi: { label: 'Reddedildi', color: 'bg-red-500' },
      iptal: { label: 'İptal', color: 'bg-gray-500' }
    };
    const d = durumlar[durum] || { label: durum, color: 'bg-slate-500' };
    return <span className={`px-2 py-1 rounded text-xs text-white ${d.color}`}>{d.label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Teklif Yönetimi</h1>
          <p className="text-slate-400 mt-1">Satış tekliflerinizi yönetin</p>
        </div>
        <Link
          to="/teklif-olustur"
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Yeni Teklif
        </Link>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Toplam Teklif</p>
              <p className="text-3xl font-bold text-white mt-1">{ozet?.toplam_teklif || 0}</p>
            </div>
            <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-teal-500" />
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Beklemede</p>
              <p className="text-3xl font-bold text-yellow-500 mt-1">{(ozet?.gonderildi || 0) + (ozet?.beklemede || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Kabul Edilen</p>
              <p className="text-3xl font-bold text-green-500 mt-1">{ozet?.kabul_edildi || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Müşteri Sayısı</p>
              <p className="text-3xl font-bold text-white mt-1">{ozet?.musteri_sayisi || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Aylık Özet */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <h3 className="text-lg font-semibold text-white mb-4">Bu Ay</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Teklif Sayısı</span>
              <span className="text-white font-semibold">{ozet?.ayki_teklif_sayisi || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Toplam Tutar</span>
              <span className="text-teal-500 font-semibold">{formatCurrency(ozet?.ayki_toplam_tutar)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Kabul Edilen Tutar</span>
              <span className="text-green-500 font-semibold">{formatCurrency(ozet?.kabul_toplam_tutar)}</span>
            </div>
          </div>
        </div>

        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <h3 className="text-lg font-semibold text-white mb-4">Durum Dağılımı</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Taslak</span>
              <span className="px-2 py-1 bg-slate-500 text-white text-xs rounded">{ozet?.taslak || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Gönderildi</span>
              <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded">{ozet?.gonderildi || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Beklemede</span>
              <span className="px-2 py-1 bg-yellow-500 text-white text-xs rounded">{ozet?.beklemede || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Kabul Edildi</span>
              <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">{ozet?.kabul_edildi || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Reddedildi</span>
              <span className="px-2 py-1 bg-red-500 text-white text-xs rounded">{ozet?.reddedildi || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Son Teklifler */}
      <div className="glass-effect rounded-xl p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Son Teklifler</h3>
          <Link to="/teklif-liste" className="text-teal-500 hover:text-teal-400 flex items-center gap-1 text-sm">
            Tümünü Gör <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {ozet?.son_teklifler?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-slate-400 text-sm border-b border-slate-800">
                  <th className="text-left py-3 px-2">Teklif No</th>
                  <th className="text-left py-3 px-2">Müşteri</th>
                  <th className="text-left py-3 px-2">Tarih</th>
                  <th className="text-right py-3 px-2">Tutar</th>
                  <th className="text-center py-3 px-2">Durum</th>
                </tr>
              </thead>
              <tbody>
                {ozet.son_teklifler.map((teklif) => (
                  <tr key={teklif.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-3 px-2">
                      <Link to={`/teklif-detay/${teklif.id}`} className="text-teal-500 hover:text-teal-400">
                        {teklif.teklif_no}
                      </Link>
                    </td>
                    <td className="py-3 px-2 text-white">{teklif.musteri_adi}</td>
                    <td className="py-3 px-2 text-slate-400">{teklif.teklif_tarihi}</td>
                    <td className="py-3 px-2 text-right text-white">{formatCurrency(teklif.genel_toplam)}</td>
                    <td className="py-3 px-2 text-center">{getDurumBadge(teklif.durum)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            Henüz teklif bulunmuyor.
            <Link to="/teklif-olustur" className="block mt-2 text-teal-500 hover:text-teal-400">
              İlk teklifinizi oluşturun
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeklifDashboard;
