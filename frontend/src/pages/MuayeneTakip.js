import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Search,
  Save,
  AlertTriangle,
  CheckCircle,
  Clock,
  Car
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const MuayeneTakip = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [araclar, setAraclar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editedData, setEditedData] = useState({});
  const [saving, setSaving] = useState({});

  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const fetchAraclar = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/araclar`, { headers });
      if (response.ok) {
        const data = await response.json();
        setAraclar(data);
        // Initialize edited data
        const initialData = {};
        data.forEach(arac => {
          initialData[arac.id] = {
            ilk_muayene_tarihi: arac.ilk_muayene_tarihi || '',
            son_muayene_tarihi: arac.son_muayene_tarihi || ''
          };
        });
        setEditedData(initialData);
      }
    } catch (error) {
      console.error('Araç listesi alınamadı:', error);
      toast.error('Araç listesi alınamadı');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchAraclar();
  }, [user, navigate, fetchAraclar]);

  const handleDateChange = (aracId, field, value) => {
    setEditedData(prev => ({
      ...prev,
      [aracId]: {
        ...prev[aracId],
        [field]: value
      }
    }));
  };

  const handleSave = async (aracId) => {
    setSaving(prev => ({ ...prev, [aracId]: true }));
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/araclar/${aracId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editedData[aracId])
      });

      if (response.ok) {
        toast.success('Muayene tarihleri güncellendi');
        fetchAraclar();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Güncelleme başarısız');
      }
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(prev => ({ ...prev, [aracId]: false }));
    }
  };

  const getMuayeneStatus = (sonMuayeneTarihi) => {
    if (!sonMuayeneTarihi) return { status: 'unknown', label: 'Belirsiz', color: 'bg-slate-500/20 text-slate-400' };
    
    const today = new Date();
    const muayeneDate = new Date(sonMuayeneTarihi);
    const diffDays = Math.ceil((muayeneDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'expired', label: 'Süresi Geçmiş', color: 'bg-red-500/20 text-red-400', icon: AlertTriangle };
    } else if (diffDays <= 30) {
      return { status: 'warning', label: `${diffDays} gün kaldı`, color: 'bg-yellow-500/20 text-yellow-400', icon: Clock };
    } else {
      return { status: 'ok', label: 'Geçerli', color: 'bg-green-500/20 text-green-400', icon: CheckCircle };
    }
  };

  const filteredAraclar = araclar.filter(arac => 
    arac.plaka?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    arac.marka?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    arac.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Özet istatistikler
  const stats = {
    total: araclar.length,
    expired: araclar.filter(a => {
      const status = getMuayeneStatus(a.son_muayene_tarihi || editedData[a.id]?.son_muayene_tarihi);
      return status.status === 'expired';
    }).length,
    warning: araclar.filter(a => {
      const status = getMuayeneStatus(a.son_muayene_tarihi || editedData[a.id]?.son_muayene_tarihi);
      return status.status === 'warning';
    }).length,
    ok: araclar.filter(a => {
      const status = getMuayeneStatus(a.son_muayene_tarihi || editedData[a.id]?.son_muayene_tarihi);
      return status.status === 'ok';
    }).length
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
      <div>
        <h1 className="text-2xl font-bold text-white">Muayene Takip</h1>
        <p className="text-slate-400 text-sm mt-1">Araç muayene tarihlerini takip edin</p>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-slate-400">Toplam Araç</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.expired}</p>
                <p className="text-xs text-slate-400">Süresi Geçmiş</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.warning}</p>
                <p className="text-xs text-slate-400">30 Gün İçinde</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.ok}</p>
                <p className="text-xs text-slate-400">Geçerli</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Arama */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Plaka, marka veya model ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700"
            />
          </div>
        </CardContent>
      </Card>

      {/* Araç Listesi */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Muayene Takip Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Plaka</TableHead>
                  <TableHead className="text-slate-400">Araç Bilgisi</TableHead>
                  <TableHead className="text-slate-400">İlk Muayene Tarihi</TableHead>
                  <TableHead className="text-slate-400">Son Muayene Tarihi</TableHead>
                  <TableHead className="text-slate-400">Durum</TableHead>
                  <TableHead className="text-slate-400 text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAraclar.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                      {searchTerm ? 'Araç bulunamadı' : 'Henüz araç eklenmemiş'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAraclar.map((arac) => {
                    const muayeneStatus = getMuayeneStatus(editedData[arac.id]?.son_muayene_tarihi || arac.son_muayene_tarihi);
                    const StatusIcon = muayeneStatus.icon;
                    
                    return (
                      <TableRow key={arac.id} className="border-slate-800">
                        <TableCell className="font-medium text-white">{arac.plaka}</TableCell>
                        <TableCell className="text-slate-300">
                          <div>
                            <span className="font-medium">{arac.marka} {arac.model}</span>
                            {arac.model_yili && <span className="text-slate-500 ml-1">({arac.model_yili})</span>}
                          </div>
                          {arac.arac_cinsi && <div className="text-xs text-slate-500">{arac.arac_cinsi}</div>}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={editedData[arac.id]?.ilk_muayene_tarihi || ''}
                            onChange={(e) => handleDateChange(arac.id, 'ilk_muayene_tarihi', e.target.value)}
                            className="bg-slate-800/50 border-slate-700 w-40"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={editedData[arac.id]?.son_muayene_tarihi || ''}
                            onChange={(e) => handleDateChange(arac.id, 'son_muayene_tarihi', e.target.value)}
                            className="bg-slate-800/50 border-slate-700 w-40"
                          />
                        </TableCell>
                        <TableCell>
                          <Badge className={`${muayeneStatus.color} flex items-center gap-1 w-fit`}>
                            {StatusIcon && <StatusIcon className="w-3 h-3" />}
                            {muayeneStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleSave(arac.id)}
                            disabled={saving[arac.id]}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            {saving[arac.id] ? (
                              <span className="animate-pulse">Kaydediliyor...</span>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-1" />
                                Kaydet
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MuayeneTakip;
