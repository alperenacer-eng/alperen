import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Users, Clock, Calendar, DollarSign, UserPlus, ClipboardList, FileText, ArrowRight } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const PersonelDashboard = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  const [ozet, setOzet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [personeller, setPersoneller] = useState([]);
  const [bekleyenIzinler, setBekleyenIzinler] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const [ozetRes, personelRes, izinRes] = await Promise.all([
        axios.get(`${API_URL}/personel-ozet`, { headers }),
        axios.get(`${API_URL}/personeller`, { headers }),
        axios.get(`${API_URL}/izinler`, { headers }),
      ]);
      setOzet(ozetRes.data);
      setPersoneller(personelRes.data.slice(0, 5));
      setBekleyenIzinler(izinRes.data.filter(i => i.durum === 'Beklemede').slice(0, 5));
    } catch (e) {
      console.error(e);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!currentModule || currentModule.id !== 'personel') {
      navigate('/');
      return;
    }
    fetchData();
  }, [currentModule, fetchData, navigate]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Personel Yönetimi</h1>
        <p className="text-slate-400">Personel, puantaj, izin ve maaş bordrosu yönetimi</p>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-effect border-slate-800 hover:border-blue-500/50 transition-colors cursor-pointer" onClick={() => navigate('/personel-listesi')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Toplam Personel</p>
                <p className="text-3xl font-bold text-blue-500">{ozet?.toplam_personel || 0}</p>
              </div>
              <Users className="w-12 h-12 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-slate-800 hover:border-green-500/50 transition-colors cursor-pointer" onClick={() => navigate('/puantaj')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Bugün Giriş Yapan</p>
                <p className="text-3xl font-bold text-green-500">{ozet?.bugun_giris_yapan || 0}</p>
              </div>
              <Clock className="w-12 h-12 text-green-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-slate-800 hover:border-yellow-500/50 transition-colors cursor-pointer" onClick={() => navigate('/izin-yonetimi')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Bekleyen İzin Talepleri</p>
                <p className="text-3xl font-bold text-yellow-500">{ozet?.bekleyen_izin_talepleri || 0}</p>
              </div>
              <Calendar className="w-12 h-12 text-yellow-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-slate-800 hover:border-purple-500/50 transition-colors cursor-pointer" onClick={() => navigate('/maas-bordrosu')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Toplam Maaş Gideri</p>
                <p className="text-2xl font-bold text-purple-500">{formatCurrency(ozet?.toplam_maas_gideri)}</p>
              </div>
              <DollarSign className="w-12 h-12 text-purple-500/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hızlı İşlemler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button onClick={() => navigate('/personel-ekle')} className="h-16 bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-3">
          <UserPlus className="w-6 h-6" />
          <span className="text-lg">Yeni Personel Ekle</span>
        </Button>
        <Button onClick={() => navigate('/puantaj')} className="h-16 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-3">
          <Clock className="w-6 h-6" />
          <span className="text-lg">Puantaj Girişi</span>
        </Button>
        <Button onClick={() => navigate('/izin-yonetimi')} className="h-16 bg-yellow-600 hover:bg-yellow-700 flex items-center justify-center gap-3">
          <Calendar className="w-6 h-6" />
          <span className="text-lg">İzin Yönetimi</span>
        </Button>
        <Button onClick={() => navigate('/maas-bordrosu')} className="h-16 bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-3">
          <FileText className="w-6 h-6" />
          <span className="text-lg">Maaş Bordrosu</span>
        </Button>
      </div>

      {/* Alt Kartlar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Son Eklenen Personeller */}
        <Card className="glass-effect border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Son Eklenen Personeller
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/personel-listesi')} className="text-slate-400 hover:text-white">
                Tümünü Gör <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {personeller.length > 0 ? (
              <div className="space-y-3">
                {personeller.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                    <div>
                      <p className="font-medium text-white">{p.ad_soyad}</p>
                      <p className="text-sm text-slate-400">{p.pozisyon} - {p.departman}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${p.aktif ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {p.aktif ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-4">Henüz personel eklenmedi</p>
            )}
          </CardContent>
        </Card>

        {/* Bekleyen İzin Talepleri */}
        <Card className="glass-effect border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Bekleyen İzin Talepleri
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/izin-yonetimi')} className="text-slate-400 hover:text-white">
                Tümünü Gör <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {bekleyenIzinler.length > 0 ? (
              <div className="space-y-3">
                {bekleyenIzinler.map((izin) => (
                  <div key={izin.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                    <div>
                      <p className="font-medium text-white">{izin.personel_adi}</p>
                      <p className="text-sm text-slate-400">{izin.izin_turu} - {izin.gun_sayisi} gün</p>
                      <p className="text-xs text-slate-500">{izin.baslangic_tarihi} - {izin.bitis_tarihi}</p>
                    </div>
                    <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400">
                      Beklemede
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-4">Bekleyen izin talebi yok</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PersonelDashboard;
