import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Factory,
  TrendingUp,
  Calendar,
  Wrench,
  FileText,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const todayIso = () => new Date().toISOString().split('T')[0];
const daysAgoIso = (d) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString().split('T')[0];
};

const shiftLabel = (s) => (s === 'gece' ? '🌙 Gece' : '🌞 Gündüz');

const CATEGORY_COLORS = {
  Elektrik: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  Mekanik: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  'Kalıp/Palet': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  Kalıp: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  Palet: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  'Karma/Çimento': 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  Çimento: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  Karma: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  'Bant/Presleyici': 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  Bant: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  Diğer: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
};
const catColor = (name) =>
  CATEGORY_COLORS[name] || 'bg-teal-500/20 text-teal-300 border-teal-500/40';

const BreakdownDashboard = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState(daysAgoIso(30));
  const [endDate, setEndDate] = useState(todayIso());

  const fetchAnalysis = useCallback(async (withAi = true) => {
    if (withAi) setAiLoading(true);
    else setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/breakdown-analysis`, {
        params: {
          start_date: startDate,
          end_date: endDate,
          module: currentModule?.id || 'bims',
          use_ai: withAi,
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
      if (withAi && res.data.ai_error) {
        toast.warning('AI özet üretilemedi: ' + res.data.ai_error);
      } else if (withAi && res.data.ai_used) {
        toast.success('AI destekli yönetici özeti hazır');
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Arıza analizi alınamadı');
    } finally {
      setLoading(false);
      setAiLoading(false);
    }
  }, [startDate, endDate, currentModule, token]);

  useEffect(() => {
    if (!currentModule) {
      navigate('/');
      return;
    }
    // İlk açılışta AI olmadan hızlı yükle
    fetchAnalysis(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuickRange = (days) => {
    setEndDate(todayIso());
    setStartDate(daysAgoIso(days));
  };

  return (
    <div className="animate-fade-in" data-testid="breakdown-dashboard-page">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
            Arıza Analizi
            <span className="text-sm font-normal text-slate-400 ml-2">(Yönetici Özeti)</span>
          </h1>
          <p className="text-slate-400">
            Üretim kayıtlarındaki arıza notlarını işletme bazlı yorumlar, en sık karşılaşılan
            sorunları gösterir. Her sabah kontrol için idealdir.
          </p>
        </div>
      </div>

      {/* Filtre alanı */}
      <div className="glass-effect rounded-xl p-4 md:p-6 border border-slate-800 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="space-y-2">
            <Label className="text-slate-300">Başlangıç Tarihi</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11 bg-slate-950 border-slate-800 text-white"
              data-testid="start-date-input"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Bitiş Tarihi</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-11 bg-slate-950 border-slate-800 text-white"
              data-testid="end-date-input"
            />
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button variant="outline" size="sm" onClick={() => handleQuickRange(7)} className="border-slate-700">
              Son 7 gün
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickRange(30)} className="border-slate-700">
              Son 30 gün
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickRange(90)} className="border-slate-700">
              Son 90 gün
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAnalysis(false)}
              disabled={loading || aiLoading}
              className="border-slate-700"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Yenile
            </Button>
          </div>
          <Button
            onClick={() => fetchAnalysis(true)}
            disabled={aiLoading || loading}
            className="h-11 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
            data-testid="ai-analyze-btn"
          >
            <Sparkles className={`w-4 h-4 mr-2 ${aiLoading ? 'animate-pulse' : ''}`} />
            {aiLoading ? 'AI Yorumluyor...' : 'AI ile Yorumla'}
          </Button>
        </div>
      </div>

      {/* Özet metrikler */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-effect rounded-xl p-5 border border-slate-800">
            <div className="text-slate-400 text-sm mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Dönem
            </div>
            <div className="text-lg font-bold text-white">{data.date_range?.days} gün</div>
            <div className="text-xs text-slate-500">
              {data.date_range?.start} → {data.date_range?.end}
            </div>
          </div>
          <div className="glass-effect rounded-xl p-5 border border-slate-800">
            <div className="text-slate-400 text-sm mb-1 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Üretim Kaydı
            </div>
            <div className="text-2xl font-bold text-white">{data.total_records}</div>
            <div className="text-xs text-slate-500">incelenen</div>
          </div>
          <div className="glass-effect rounded-xl p-5 border border-slate-800">
            <div className="text-slate-400 text-sm mb-1 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" /> Arıza Notu
            </div>
            <div className="text-2xl font-bold text-amber-400">{data.total_breakdowns}</div>
            <div className="text-xs text-slate-500">toplam</div>
          </div>
          <div className="glass-effect rounded-xl p-5 border border-slate-800">
            <div className="text-slate-400 text-sm mb-1 flex items-center gap-2">
              <Factory className="w-4 h-4 text-teal-400" /> İşletme
            </div>
            <div className="text-2xl font-bold text-teal-400">{data.distinct_departments}</div>
            <div className="text-xs text-slate-500">arıza yaşandı</div>
          </div>
        </div>
      )}

      {/* Yönetici Özeti (AI) */}
      {data?.executive_summary ? (
        <div className="glass-effect rounded-xl p-6 border-2 border-purple-500/40 bg-gradient-to-br from-purple-900/20 to-pink-900/10 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <Sparkles className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-white">Yönetici Özeti</h2>
              <p className="text-purple-300 text-xs">AI destekli · sabah kontrolü için</p>
            </div>
          </div>
          <p
            className="text-slate-100 text-base leading-relaxed whitespace-pre-line"
            data-testid="executive-summary"
          >
            {data.executive_summary}
          </p>
          {data.top_issues_overall && data.top_issues_overall.length > 0 && (
            <div className="mt-5 pt-5 border-t border-purple-500/20">
              <div className="text-purple-300 text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> En Sık Karşılaşılan Arıza Kategorileri
              </div>
              <div className="flex flex-wrap gap-2">
                {data.top_issues_overall.map((it, i) => (
                  <div
                    key={i}
                    className={`px-3 py-1.5 rounded-lg border text-sm ${catColor(it.kategori)}`}
                    title={it.aciklama || ''}
                  >
                    <span className="font-semibold">{it.kategori}</span>
                    <span className="ml-2 opacity-70">×{it.adet}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        data && (
          <div className="glass-effect rounded-xl p-6 border border-slate-800 mb-6 flex items-center gap-4">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <div className="flex-1">
              <div className="text-white font-semibold">AI destekli yönetici özeti üretmek için</div>
              <div className="text-slate-400 text-sm">
                Yukarıdaki <b>&ldquo;AI ile Yorumla&rdquo;</b> butonuna basın. AI, arıza notlarını
                kategorileyerek işletme bazlı yönetici özeti çıkarır (~5-10 sn).
              </div>
            </div>
          </div>
        )
      )}

      {/* İşletme bazlı analiz */}
      {data?.per_department && data.per_department.length > 0 && (
        <div className="space-y-4 mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Factory className="w-6 h-6 text-teal-400" />
            İşletme Bazlı Arıza Detayı
          </h2>
          {data.per_department.map((d) => (
            <div
              key={d.department_id}
              className="glass-effect rounded-xl p-5 border border-slate-800"
              data-testid={`dept-card-${d.department_id}`}
            >
              <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {d.department_name}
                    <span className="text-amber-400 text-lg">×{d.total_breakdowns}</span>
                  </h3>
                  {d.ai_one_liner && (
                    <p className="text-purple-300 text-sm mt-1 italic">💡 {d.ai_one_liner}</p>
                  )}
                </div>
              </div>

              {/* AI kategoriler */}
              {d.ai_kategoriler && d.ai_kategoriler.length > 0 && (
                <div className="mb-4">
                  <div className="text-slate-400 text-xs uppercase font-semibold mb-2">
                    AI ile Kategorize Edilen Arızalar
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {d.ai_kategoriler.map((k, i) => (
                      <div
                        key={i}
                        className={`px-3 py-2 rounded-lg border text-sm ${catColor(k.kategori)}`}
                        title={k.aciklama || ''}
                      >
                        <span className="font-semibold">{k.kategori}</span>
                        <span className="ml-2 opacity-70">×{k.adet}</span>
                        {k.aciklama && (
                          <div className="text-xs opacity-80 mt-0.5">{k.aciklama}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Anahtar kelimeler */}
              {d.top_keywords && d.top_keywords.length > 0 && (
                <div className="mb-4">
                  <div className="text-slate-400 text-xs uppercase font-semibold mb-2">
                    Sık Geçen Kelimeler
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {d.top_keywords.slice(0, 12).map((k, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs border border-slate-700"
                      >
                        {k.kelime} <span className="opacity-60">×{k.adet}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Örnek arıza kayıtları */}
              {d.ornekler && d.ornekler.length > 0 && (
                <details className="mt-3">
                  <summary className="text-slate-400 text-sm cursor-pointer hover:text-white select-none">
                    Örnek arıza notlarını göster ({d.ornekler.length})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {d.ornekler.map((o, i) => (
                      <div
                        key={i}
                        className="text-sm p-3 bg-slate-950/60 border border-slate-800 rounded-lg"
                      >
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-1">
                          <span>{o.tarih}</span>
                          <span>·</span>
                          <span>{shiftLabel(o.vardiya)}</span>
                          {o.operator && (
                            <>
                              <span>·</span>
                              <span>Op: {o.operator}</span>
                            </>
                          )}
                          {o.urun && (
                            <>
                              <span>·</span>
                              <span>Ürün: {o.urun}</span>
                            </>
                          )}
                        </div>
                        <div className="text-slate-200 whitespace-pre-line">{o.metin}</div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Boş durum */}
      {data && data.total_breakdowns === 0 && (
        <div className="glass-effect rounded-xl p-10 border border-slate-800 text-center">
          <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <div className="text-slate-300 text-lg font-semibold">
            Bu dönemde arıza kaydı bulunmuyor
          </div>
          <div className="text-slate-500 text-sm mt-1">
            Üretim kayıtlarındaki Arıza 1/2/3 alanlarına veri girildikçe bu ekranda görünecek.
          </div>
        </div>
      )}

      {/* Son arızalar tablosu */}
      {data?.recent_breakdowns && data.recent_breakdowns.length > 0 && (
        <div className="glass-effect rounded-xl p-5 border border-slate-800 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" /> Son Arıza Notları
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left py-2 px-2">Tarih</th>
                  <th className="text-left py-2 px-2">İşletme</th>
                  <th className="text-left py-2 px-2">Vardiya</th>
                  <th className="text-left py-2 px-2">Operatör</th>
                  <th className="text-left py-2 px-2">Arıza</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_breakdowns.map((r, i) => (
                  <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                    <td className="py-2 px-2 text-slate-300 whitespace-nowrap">{r.tarih}</td>
                    <td className="py-2 px-2 text-teal-300">{r.isletme}</td>
                    <td className="py-2 px-2 text-slate-300">{shiftLabel(r.vardiya)}</td>
                    <td className="py-2 px-2 text-slate-400">{r.operator || '-'}</td>
                    <td className="py-2 px-2 text-slate-100">{r.metin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BreakdownDashboard;
