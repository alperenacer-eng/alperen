import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Truck, 
  Calendar,
  Download,
  Fuel
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MotorinRaporlar = () => {
  const { token } = useAuth();
  const [aracTuketim, setAracTuketim] = useState([]);
  const [ozet, setOzet] = useState({});
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({
    baslangic: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    bitis: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tuketimRes, ozetRes] = await Promise.all([
        axios.get(`${API_URL}/motorin-arac-tuketim`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            baslangic_tarihi: dateFilter.baslangic,
            bitis_tarihi: dateFilter.bitis
          }
        }),
        axios.get(`${API_URL}/motorin-ozet`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setAracTuketim(tuketimRes.data);
      setOzet(ozetRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(num);
  };

  const toplamTuketim = aracTuketim.reduce((acc, a) => acc + a.toplam_litre, 0);

  return (
    <div className="animate-fade-in" data-testid="motorin-raporlar-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Motorin Raporları</h1>
          <p className="text-slate-400">Tüketim analizleri ve detaylı raporlar</p>
        </div>
      </div>

      {/* Tarih Filtresi */}
      <div className="glass-effect rounded-xl border border-slate-800 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm text-slate-400 mb-1 block">Başlangıç Tarihi</label>
            <Input
              type="date"
              value={dateFilter.baslangic}
              onChange={(e) => setDateFilter({ ...dateFilter, baslangic: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm text-slate-400 mb-1 block">Bitiş Tarihi</label>
            <Input
              type="date"
              value={dateFilter.bitis}
              onChange={(e) => setDateFilter({ ...dateFilter, bitis: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <Button
            onClick={fetchData}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Filtrele
          </Button>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-effect rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Fuel className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{formatNumber(ozet.mevcut_stok || 0)} L</p>
              <p className="text-xs text-slate-400">Mevcut Stok</p>
            </div>
          </div>
        </div>
        <div className="glass-effect rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{formatNumber(ozet.ayki_alim || 0)} L</p>
              <p className="text-xs text-slate-400">Bu Ay Alım</p>
            </div>
          </div>
        </div>
        <div className="glass-effect rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{formatNumber(ozet.ayki_verme || 0)} L</p>
              <p className="text-xs text-slate-400">Bu Ay Tüketim</p>
            </div>
          </div>
        </div>
        <div className="glass-effect rounded-xl p-4 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{formatCurrency(ozet.ayki_maliyet || 0)}</p>
              <p className="text-xs text-slate-400">Bu Ay Maliyet</p>
            </div>
          </div>
        </div>
      </div>

      {/* Araç Bazlı Tüketim */}
      <div className="glass-effect rounded-xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-400" />
            Araç Bazlı Tüketim Raporu
          </h2>
          <span className="text-sm text-slate-400">
            Seçili dönem: {dateFilter.baslangic} - {dateFilter.bitis}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : aracTuketim.length > 0 ? (
          <>
            {/* Toplam Özet */}
            <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-white">{aracTuketim.length}</p>
                  <p className="text-xs text-slate-400">Araç Sayısı</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{formatNumber(toplamTuketim)} L</p>
                  <p className="text-xs text-slate-400">Toplam Tüketim</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{aracTuketim.reduce((acc, a) => acc + a.kayit_sayisi, 0)}</p>
                  <p className="text-xs text-slate-400">Toplam Kayıt</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">
                    {formatNumber(toplamTuketim / aracTuketim.length)} L
                  </p>
                  <p className="text-xs text-slate-400">Ort. Araç Tüketimi</p>
                </div>
              </div>
            </div>

            {/* Araç Listesi */}
            <div className="space-y-3">
              {aracTuketim.map((arac, index) => {
                const yuzde = (arac.toplam_litre / toplamTuketim) * 100;
                return (
                  <div key={arac.arac_id || index} className="bg-slate-800/30 rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center font-bold text-blue-400">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{arac.arac_plaka || 'Bilinmeyen'}</p>
                          <p className="text-sm text-slate-400">{arac.arac_bilgi || '-'}</p>
                          <div className="flex gap-4 mt-1 text-xs text-slate-500">
                            <span>{arac.kayit_sayisi} kayıt</span>
                            {arac.ortalama_tuketim > 0 && (
                              <span className="text-green-400">Ort: {arac.ortalama_tuketim} L/100km</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-bold text-blue-400">{formatNumber(arac.toplam_litre)} L</p>
                          <p className="text-sm text-slate-400">%{yuzde.toFixed(1)}</p>
                        </div>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                          style={{ width: `${yuzde}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Truck className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Seçili dönemde tüketim kaydı bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MotorinRaporlar;
