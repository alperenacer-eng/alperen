import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  FileText,
  TrendingDown,
  TrendingUp,
  Calendar,
  Plus,
  Eye,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const IrsaliyeDashboard = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentModule) {
      navigate('/');
      return;
    }
    fetchStats();
  }, [currentModule]);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/irsaliye-ozet`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);
    } catch (err) {
      toast.error('İrsaliye özeti yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const formatTL = (n) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(n || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="irsaliye-dashboard">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">📄</span>
            İrsaliye Yönetimi
          </h1>
          <p className="text-gray-500 mt-1">
            İrsaliye dosyalarınızı yükleyin, arşivleyin ve yönetin
          </p>
        </div>
        <button
          onClick={() => navigate('/irsaliye-liste')}
          data-testid="dashboard-yeni-irsaliye-button"
          className="flex items-center gap-2 px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Yeni İrsaliye
        </button>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 bg-rose-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-rose-600" />
            </div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Toplam</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.toplam || 0}</div>
          <div className="text-sm text-gray-500 mt-1">İrsaliye</div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Gelen</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.gelen || 0}</div>
          <div className="text-sm text-gray-500 mt-1">
            {formatTL(stats?.toplam_gelen_tutar)}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Giden</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.giden || 0}</div>
          <div className="text-sm text-gray-500 mt-1">
            {formatTL(stats?.toplam_giden_tutar)}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Bu Ay</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.ayki_adet || 0}</div>
          <div className="text-sm text-gray-500 mt-1">{formatTL(stats?.ayki_tutar)}</div>
        </div>
      </div>

      {/* Son İrsaliyeler */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Son İrsaliyeler</h2>
          <button
            onClick={() => navigate('/irsaliye-liste')}
            className="text-sm text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
          >
            <Eye className="w-4 h-4" />
            Tümünü Gör
          </button>
        </div>

        {stats?.son_irsaliyeler && stats.son_irsaliyeler.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">İrsaliye No</th>
                  <th className="px-4 py-3 text-left font-semibold">Tarih</th>
                  <th className="px-4 py-3 text-left font-semibold">Firma</th>
                  <th className="px-4 py-3 text-left font-semibold">Tür</th>
                  <th className="px-4 py-3 text-right font-semibold">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.son_irsaliyeler.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {i.irsaliye_no}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{i.tarih}</td>
                    <td className="px-4 py-3 text-gray-600">{i.firma_adi || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          i.tur === 'gelen'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {i.tur === 'gelen' ? 'Gelen' : 'Giden'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatTL(i.tutar)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>Henüz irsaliye eklenmemiş</p>
            <button
              onClick={() => navigate('/irsaliye-liste')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              İlk İrsaliyeyi Ekle
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IrsaliyeDashboard;
