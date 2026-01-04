import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Search,
  Save,
  AlertTriangle,
  CheckCircle,
  Clock,
  Car,
  Upload,
  FileText,
  Eye,
  X,
  Trash2,
  RefreshCw,
  History,
  Edit
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const MuayeneTakip = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [araclar, setAraclar] = useState([]);
  const [muayeneGecmisi, setMuayeneGecmisi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editedData, setEditedData] = useState({});
  const [saving, setSaving] = useState({});
  const [uploading, setUploading] = useState({});
  const fileInputRefs = useRef({});
  const [activeTab, setActiveTab] = useState('takip');
  
  // Muayene Yenileme Modal
  const [showYenileModal, setShowYenileModal] = useState(false);
  const [selectedArac, setSelectedArac] = useState(null);
  const [yenileForm, setYenileForm] = useState({
    yeni_ilk_muayene_tarihi: '',
    yeni_son_muayene_tarihi: '',
    notlar: ''
  });
  const [yenilemeLoading, setYenilemeLoading] = useState(false);

  // Düzenleme Modal (Muayene Takip Listesi)
  const [showDuzeltModal, setShowDuzeltModal] = useState(false);
  const [duzeltArac, setDuzeltArac] = useState(null);
  const [duzeltForm, setDuzeltForm] = useState({
    ilk_muayene_tarihi: '',
    son_muayene_tarihi: ''
  });
  const [duzeltLoading, setDuzeltLoading] = useState(false);

  // Düzenleme Modal (Geçmiş)
  const [showGecmisDuzeltModal, setShowGecmisDuzeltModal] = useState(false);
  const [duzeltGecmis, setDuzeltGecmis] = useState(null);
  const [gecmisDuzeltForm, setGecmisDuzeltForm] = useState({
    ilk_muayene_tarihi: '',
    son_muayene_tarihi: '',
    notlar: ''
  });
  const [gecmisDuzeltLoading, setGecmisDuzeltLoading] = useState(false);

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

  const fetchMuayeneGecmisi = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/muayene-gecmisi`, { headers });
      if (response.ok) {
        const data = await response.json();
        setMuayeneGecmisi(data);
      }
    } catch (error) {
      console.error('Muayene geçmişi alınamadı:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchAraclar();
    fetchMuayeneGecmisi();
  }, [user, navigate, fetchAraclar, fetchMuayeneGecmisi]);

  const openYenileModal = (arac) => {
    setSelectedArac(arac);
    setYenileForm({
      yeni_ilk_muayene_tarihi: '',
      yeni_son_muayene_tarihi: '',
      notlar: ''
    });
    setShowYenileModal(true);
  };

  const handleMuayeneYenile = async () => {
    if (!yenileForm.yeni_ilk_muayene_tarihi || !yenileForm.yeni_son_muayene_tarihi) {
      toast.error('Lütfen yeni muayene tarihlerini girin');
      return;
    }

    setYenilemeLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/araclar/${selectedArac.id}/muayene-yenile`, {
        method: 'POST',
        headers,
        body: JSON.stringify(yenileForm)
      });

      if (response.ok) {
        toast.success('Muayene yenilendi ve geçmişe kaydedildi');
        setShowYenileModal(false);
        fetchAraclar();
        fetchMuayeneGecmisi();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'İşlem başarısız');
      }
    } catch (error) {
      console.error('Yenileme hatası:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setYenilemeLoading(false);
    }
  };

  const handleDeleteGecmis = async (id) => {
    if (!window.confirm('Bu geçmiş kaydını silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/muayene-gecmisi/${id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        toast.success('Geçmiş kaydı silindi');
        fetchMuayeneGecmisi();
      } else {
        toast.error('Silme işlemi başarısız');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  // Muayene Takip Listesi Düzelt Modal
  const openDuzeltModal = (arac) => {
    setDuzeltArac(arac);
    setDuzeltForm({
      ilk_muayene_tarihi: arac.ilk_muayene_tarihi || '',
      son_muayene_tarihi: arac.son_muayene_tarihi || ''
    });
    setShowDuzeltModal(true);
  };

  const handleDuzelt = async () => {
    setDuzeltLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/araclar/${duzeltArac.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(duzeltForm)
      });

      if (response.ok) {
        toast.success('Muayene tarihleri düzeltildi');
        setShowDuzeltModal(false);
        fetchAraclar();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Düzeltme başarısız');
      }
    } catch (error) {
      console.error('Düzeltme hatası:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setDuzeltLoading(false);
    }
  };

  // Geçmiş Düzelt Modal
  const openGecmisDuzeltModal = (gecmis) => {
    setDuzeltGecmis(gecmis);
    setGecmisDuzeltForm({
      ilk_muayene_tarihi: gecmis.ilk_muayene_tarihi || '',
      son_muayene_tarihi: gecmis.son_muayene_tarihi || '',
      notlar: gecmis.notlar || ''
    });
    setShowGecmisDuzeltModal(true);
  };

  const handleGecmisDuzelt = async () => {
    setGecmisDuzeltLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/muayene-gecmisi/${duzeltGecmis.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(gecmisDuzeltForm)
      });

      if (response.ok) {
        toast.success('Geçmiş kaydı düzeltildi');
        setShowGecmisDuzeltModal(false);
        fetchMuayeneGecmisi();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Düzeltme başarısız');
      }
    } catch (error) {
      console.error('Düzeltme hatası:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setGecmisDuzeltLoading(false);
    }
  };

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

  const handleFileUpload = async (aracId, file) => {
    setUploading(prev => ({ ...prev, [aracId]: true }));
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${BACKEND_URL}/api/araclar/${aracId}/upload/muayene-evrak`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        toast.success('Evrak yüklendi');
        fetchAraclar();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Evrak yüklenemedi');
      }
    } catch (error) {
      console.error('Yükleme hatası:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setUploading(prev => ({ ...prev, [aracId]: false }));
    }
  };

  const handleDeleteFile = async (aracId) => {
    if (!window.confirm('Bu evrakı silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/araclar/${aracId}/file/muayene-evrak`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        toast.success('Evrak silindi');
        fetchAraclar();
      } else {
        toast.error('Evrak silinemedi');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Bir hata oluştu');
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

  const getFileExtension = (path) => {
    if (!path) return '';
    const parts = path.split('.');
    return parts[parts.length - 1].toUpperCase();
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
                  <TableHead className="text-slate-400">Evrak</TableHead>
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
                    <TableCell colSpan={7} className="text-center text-slate-400 py-8">
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
                        <TableCell>
                          <input
                            type="file"
                            ref={el => fileInputRefs.current[arac.id] = el}
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files[0]) {
                                handleFileUpload(arac.id, e.target.files[0]);
                              }
                            }}
                          />
                          {arac.muayene_evrak ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                                onClick={() => window.open(`${BACKEND_URL}${arac.muayene_evrak}`, '_blank')}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                {getFileExtension(arac.muayene_evrak)}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/20"
                                onClick={() => handleDeleteFile(arac.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={uploading[arac.id]}
                              onClick={() => fileInputRefs.current[arac.id]?.click()}
                            >
                              {uploading[arac.id] ? (
                                <span className="animate-pulse">Yükleniyor...</span>
                              ) : (
                                <>
                                  <Upload className="w-3 h-3 mr-1" />
                                  Yükle
                                </>
                              )}
                            </Button>
                          )}
                        </TableCell>
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
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSave(arac.id)}
                              disabled={saving[arac.id]}
                              className="bg-orange-500 hover:bg-orange-600"
                            >
                              {saving[arac.id] ? (
                                <span className="animate-pulse">...</span>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-1" />
                                  Kaydet
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openYenileModal(arac)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Muayene Yapıldı
                            </Button>
                          </div>
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

      {/* Geçmiş Muayeneler Sekmesi */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <History className="w-5 h-5" />
            Geçmiş Tarihli Muayeneler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Plaka</TableHead>
                  <TableHead className="text-slate-400">İlk Muayene Tarihi</TableHead>
                  <TableHead className="text-slate-400">Son Muayene Tarihi</TableHead>
                  <TableHead className="text-slate-400">Notlar</TableHead>
                  <TableHead className="text-slate-400">Kayıt Tarihi</TableHead>
                  <TableHead className="text-slate-400 text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {muayeneGecmisi.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                      Henüz geçmiş muayene kaydı yok
                    </TableCell>
                  </TableRow>
                ) : (
                  muayeneGecmisi.map((gecmis) => (
                    <TableRow key={gecmis.id} className="border-slate-800">
                      <TableCell className="font-medium text-white">{gecmis.plaka}</TableCell>
                      <TableCell className="text-slate-300">{gecmis.ilk_muayene_tarihi || '-'}</TableCell>
                      <TableCell className="text-slate-300">{gecmis.son_muayene_tarihi || '-'}</TableCell>
                      <TableCell className="text-slate-400 max-w-xs truncate">{gecmis.notlar || '-'}</TableCell>
                      <TableCell className="text-slate-400">
                        {gecmis.created_at ? new Date(gecmis.created_at).toLocaleDateString('tr-TR') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteGecmis(gecmis.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Muayene Yenileme Modal */}
      <Dialog open={showYenileModal} onOpenChange={setShowYenileModal}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-green-400" />
              Muayene Yenileme - {selectedArac?.plaka}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Mevcut Tarihler Bilgisi */}
            {(selectedArac?.ilk_muayene_tarihi || selectedArac?.son_muayene_tarihi) && (
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <p className="text-sm text-slate-400 mb-2">Mevcut Muayene Tarihleri (Geçmişe kaydedilecek):</p>
                <div className="flex gap-4 text-sm">
                  <span className="text-slate-300">
                    <strong>İlk:</strong> {selectedArac?.ilk_muayene_tarihi || '-'}
                  </span>
                  <span className="text-slate-300">
                    <strong>Son:</strong> {selectedArac?.son_muayene_tarihi || '-'}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-slate-300">Yeni İlk Muayene Tarihi *</Label>
              <Input
                type="date"
                value={yenileForm.yeni_ilk_muayene_tarihi}
                onChange={(e) => setYenileForm({...yenileForm, yeni_ilk_muayene_tarihi: e.target.value})}
                className="bg-slate-800/50 border-slate-700"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Yeni Son Muayene Tarihi *</Label>
              <Input
                type="date"
                value={yenileForm.yeni_son_muayene_tarihi}
                onChange={(e) => setYenileForm({...yenileForm, yeni_son_muayene_tarihi: e.target.value})}
                className="bg-slate-800/50 border-slate-700"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Notlar (Opsiyonel)</Label>
              <Textarea
                value={yenileForm.notlar}
                onChange={(e) => setYenileForm({...yenileForm, notlar: e.target.value})}
                placeholder="Muayene hakkında not ekleyin..."
                className="bg-slate-800/50 border-slate-700"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowYenileModal(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleMuayeneYenile} 
              disabled={yenilemeLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {yenilemeLoading ? (
                <span className="animate-pulse">Kaydediliyor...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Muayene Yenile
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MuayeneTakip;
