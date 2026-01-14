import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  FileText,
  Car,
  AlertTriangle,
  Calendar,
  Search,
  X,
  Download,
  Eye,
  PlusCircle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AracYonetimi = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [araclar, setAraclar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingArac, setEditingArac] = useState(null);
  const [ozet, setOzet] = useState(null);
  
  // Kaynak verileri
  const [aracCinsleri, setAracCinsleri] = useState([]);
  const [markalar, setMarkalar] = useState([]);
  const [modeller, setModeller] = useState([]);
  const [sirketler, setSirketler] = useState([]);
  
  // Hızlı kaynak ekleme modalı
  const [quickAddModal, setQuickAddModal] = useState({ open: false, type: '', title: '' });
  const [quickAddValue, setQuickAddValue] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    plaka: '',
    arac_cinsi: '',
    marka: '',
    model: '',
    model_yili: '',
    kayitli_sirket: '',
    muayene_tarihi: '',
    kasko_yenileme_tarihi: '',
    sigorta_yenileme_tarihi: '',
    arac_takip_id: '',
    arac_takip_hat_no: '',
    notlar: '',
    aktif: true
  });
  
  // Yükleme durumları
  const [uploadingRuhsat, setUploadingRuhsat] = useState(false);
  const [uploadingKasko, setUploadingKasko] = useState(false);
  const [uploadingSigorta, setUploadingSigorta] = useState(false);

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
      }
    } catch (error) {
      console.error('Araç listesi alınamadı:', error);
      toast.error('Araç listesi alınamadı');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOzet = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/arac-ozet`, { headers });
      if (response.ok) {
        const data = await response.json();
        setOzet(data);
      }
    } catch (error) {
      console.error('Özet alınamadı:', error);
    }
  }, []);

  const fetchKaynaklar = useCallback(async () => {
    try {
      const [cinsleriRes, markalarRes, modellerRes, sirketlerRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/arac-cinsleri`, { headers }),
        fetch(`${BACKEND_URL}/api/markalar`, { headers }),
        fetch(`${BACKEND_URL}/api/modeller`, { headers }),
        fetch(`${BACKEND_URL}/api/sirketler`, { headers })
      ]);
      
      if (cinsleriRes.ok) setAracCinsleri(await cinsleriRes.json());
      if (markalarRes.ok) setMarkalar(await markalarRes.json());
      if (modellerRes.ok) setModeller(await modellerRes.json());
      if (sirketlerRes.ok) setSirketler(await sirketlerRes.json());
    } catch (error) {
      console.error('Kaynaklar alınamadı:', error);
    }
  }, []);

  // Hızlı kaynak ekleme fonksiyonu
  const handleQuickAdd = async () => {
    if (!quickAddValue.trim()) {
      toast.error('Lütfen bir değer girin');
      return;
    }

    const endpoints = {
      'arac_cinsi': '/api/arac-cinsleri',
      'marka': '/api/markalar',
      'model': '/api/modeller',
      'sirket': '/api/sirketler'
    };

    try {
      const response = await fetch(`${BACKEND_URL}${endpoints[quickAddModal.type]}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: quickAddValue.trim() })
      });

      if (response.ok) {
        toast.success(`${quickAddModal.title} eklendi`);
        setQuickAddModal({ open: false, type: '', title: '' });
        setQuickAddValue('');
        fetchKaynaklar();
        
        // Eklenen değeri form'a otomatik seç
        const fieldMap = {
          'arac_cinsi': 'arac_cinsi',
          'marka': 'marka',
          'model': 'model',
          'sirket': 'kayitli_sirket'
        };
        setFormData(prev => ({ ...prev, [fieldMap[quickAddModal.type]]: quickAddValue.trim() }));
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ekleme başarısız');
      }
    } catch (error) {
      console.error('Kaynak ekleme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const openQuickAddModal = (type, title) => {
    setQuickAddModal({ open: true, type, title });
    setQuickAddValue('');
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchAraclar();
    fetchOzet();
    fetchKaynaklar();
  }, [user, navigate, fetchAraclar, fetchOzet, fetchKaynaklar]);

  const resetForm = () => {
    setFormData({
      plaka: '',
      arac_cinsi: '',
      marka: '',
      model: '',
      model_yili: '',
      kayitli_sirket: '',
      muayene_tarihi: '',
      kasko_yenileme_tarihi: '',
      sigorta_yenileme_tarihi: '',
      arac_takip_id: '',
      arac_takip_hat_no: '',
      notlar: '',
      aktif: true
    });
    setEditingArac(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (arac) => {
    setEditingArac(arac);
    setFormData({
      plaka: arac.plaka || '',
      arac_cinsi: arac.arac_cinsi || '',
      marka: arac.marka || '',
      model: arac.model || '',
      model_yili: arac.model_yili || '',
      kayitli_sirket: arac.kayitli_sirket || '',
      muayene_tarihi: arac.muayene_tarihi || '',
      kasko_yenileme_tarihi: arac.kasko_yenileme_tarihi || '',
      sigorta_yenileme_tarihi: arac.sigorta_yenileme_tarihi || '',
      arac_takip_id: arac.arac_takip_id || '',
      arac_takip_hat_no: arac.arac_takip_hat_no || '',
      notlar: arac.notlar || '',
      aktif: arac.aktif !== false
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.plaka) {
      toast.error('Plaka zorunludur');
      return;
    }

    try {
      const submitData = {
        ...formData,
        model_yili: formData.model_yili ? parseInt(formData.model_yili) : null
      };

      const url = editingArac 
        ? `${BACKEND_URL}/api/araclar/${editingArac.id}`
        : `${BACKEND_URL}/api/araclar`;
      
      const response = await fetch(url, {
        method: editingArac ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        toast.success(editingArac ? 'Araç güncellendi' : 'Araç eklendi');
        setShowModal(false);
        resetForm();
        fetchAraclar();
        fetchOzet();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'İşlem başarısız');
      }
    } catch (error) {
      console.error('Kayıt hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu aracı silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/araclar/${id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        toast.success('Araç silindi');
        fetchAraclar();
        fetchOzet();
      } else {
        toast.error('Silme işlemi başarısız');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleFileUpload = async (aracId, docType, file) => {
    const setUploading = {
      ruhsat: setUploadingRuhsat,
      kasko: setUploadingKasko,
      sigorta: setUploadingSigorta
    }[docType];
    
    setUploading(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch(`${BACKEND_URL}/api/araclar/${aracId}/upload/${docType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      });

      if (response.ok) {
        toast.success(`${docType.charAt(0).toUpperCase() + docType.slice(1)} dosyası yüklendi`);
        fetchAraclar();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Dosya yüklenemedi');
      }
    } catch (error) {
      console.error('Dosya yükleme hatası:', error);
      toast.error('Dosya yüklenirken bir hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (aracId, docType) => {
    if (!window.confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/araclar/${aracId}/file/${docType}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        toast.success('Dosya silindi');
        fetchAraclar();
      } else {
        toast.error('Dosya silinemedi');
      }
    } catch (error) {
      console.error('Dosya silme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const isDateApproaching = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  const isDatePassed = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return date < today;
  };

  const filteredAraclar = araclar.filter(arac => 
    arac.plaka?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    arac.marka?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    arac.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const FileUploadButton = ({ arac, docType, label, uploading }) => {
    const fileInputRef = React.useRef(null);
    const docField = `${docType}_dosya`;
    const hasFile = arac[docField];

    return (
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept=".pdf"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => {
            if (e.target.files[0]) {
              handleFileUpload(arac.id, docType, e.target.files[0]);
            }
          }}
        />
        {hasFile ? (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
              onClick={() => window.open(`${BACKEND_URL}${arac[docField]}`, '_blank')}
            >
              <Eye className="w-3 h-3 mr-1" />
              Görüntüle
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/20"
              onClick={() => handleDeleteFile(arac.id, docType)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <span className="animate-pulse">Yükleniyor...</span>
            ) : (
              <>
                <Upload className="w-3 h-3 mr-1" />
                {label}
              </>
            )}
          </Button>
        )}
      </div>
    );
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Araç Yönetimi</h1>
          <p className="text-slate-400 text-sm mt-1">Şirket araçlarını yönetin</p>
        </div>
        <Button onClick={openAddModal} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 mr-2" />
          Araç Ekle
        </Button>
      </div>

      {/* Özet Kartları */}
      {ozet && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Car className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{ozet.toplam_arac}</p>
                  <p className="text-xs text-slate-400">Toplam Araç</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${ozet.muayene_yaklasan > 0 ? 'bg-red-500/20' : 'bg-green-500/20'} rounded-lg flex items-center justify-center`}>
                  <AlertTriangle className={`w-5 h-5 ${ozet.muayene_yaklasan > 0 ? 'text-red-400' : 'text-green-400'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{ozet.muayene_yaklasan}</p>
                  <p className="text-xs text-slate-400">Muayene Yaklaşan</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${ozet.kasko_yaklasan > 0 ? 'bg-yellow-500/20' : 'bg-green-500/20'} rounded-lg flex items-center justify-center`}>
                  <Calendar className={`w-5 h-5 ${ozet.kasko_yaklasan > 0 ? 'text-yellow-400' : 'text-green-400'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{ozet.kasko_yaklasan}</p>
                  <p className="text-xs text-slate-400">Kasko Yaklaşan</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${ozet.sigorta_yaklasan > 0 ? 'bg-orange-500/20' : 'bg-green-500/20'} rounded-lg flex items-center justify-center`}>
                  <FileText className={`w-5 h-5 ${ozet.sigorta_yaklasan > 0 ? 'text-orange-400' : 'text-green-400'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{ozet.sigorta_yaklasan}</p>
                  <p className="text-xs text-slate-400">Sigorta Yaklaşan</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
          <CardTitle className="text-white">Araç Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Plaka</TableHead>
                  <TableHead className="text-slate-400">Araç Cinsi</TableHead>
                  <TableHead className="text-slate-400">Marka / Model</TableHead>
                  <TableHead className="text-slate-400">Şirket</TableHead>
                  <TableHead className="text-slate-400">Muayene</TableHead>
                  <TableHead className="text-slate-400">Kasko</TableHead>
                  <TableHead className="text-slate-400">Sigorta</TableHead>
                  <TableHead className="text-slate-400">Belgeler</TableHead>
                  <TableHead className="text-slate-400 text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAraclar.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-slate-400 py-8">
                      {searchTerm ? 'Araç bulunamadı' : 'Henüz araç eklenmemiş'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAraclar.map((arac) => (
                    <TableRow key={arac.id} className="border-slate-800">
                      <TableCell className="font-medium text-white">{arac.plaka}</TableCell>
                      <TableCell className="text-slate-300">{arac.arac_cinsi || '-'}</TableCell>
                      <TableCell className="text-slate-300">
                        {arac.marka} {arac.model} {arac.model_yili ? `(${arac.model_yili})` : ''}
                      </TableCell>
                      <TableCell className="text-slate-300">{arac.kayitli_sirket || '-'}</TableCell>
                      <TableCell>
                        {arac.muayene_tarihi ? (
                          <Badge className={
                            isDatePassed(arac.muayene_tarihi) ? 'bg-red-500/20 text-red-400' :
                            isDateApproaching(arac.muayene_tarihi) ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }>
                            {arac.muayene_tarihi}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {arac.kasko_yenileme_tarihi ? (
                          <Badge className={
                            isDatePassed(arac.kasko_yenileme_tarihi) ? 'bg-red-500/20 text-red-400' :
                            isDateApproaching(arac.kasko_yenileme_tarihi) ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }>
                            {arac.kasko_yenileme_tarihi}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {arac.sigorta_yenileme_tarihi ? (
                          <Badge className={
                            isDatePassed(arac.sigorta_yenileme_tarihi) ? 'bg-red-500/20 text-red-400' :
                            isDateApproaching(arac.sigorta_yenileme_tarihi) ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }>
                            {arac.sigorta_yenileme_tarihi}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <FileUploadButton arac={arac} docType="ruhsat" label="Ruhsat" uploading={uploadingRuhsat} />
                          <FileUploadButton arac={arac} docType="kasko" label="Kasko" uploading={uploadingKasko} />
                          <FileUploadButton arac={arac} docType="sigorta" label="Sigorta" uploading={uploadingSigorta} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(arac)}
                            className="text-slate-400 hover:text-white"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(arac.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Araç Ekleme/Düzenleme Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingArac ? 'Araç Düzenle' : 'Yeni Araç Ekle'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Plaka */}
              <div className="space-y-2">
                <Label htmlFor="plaka" className="text-slate-300">Plaka *</Label>
                <Input
                  id="plaka"
                  value={formData.plaka}
                  onChange={(e) => setFormData({...formData, plaka: e.target.value.toUpperCase()})}
                  placeholder="34 ABC 123"
                  className="bg-slate-800/50 border-slate-700"
                  required
                />
              </div>

              {/* Araç Cinsi */}
              <div className="space-y-2">
                <Label htmlFor="arac_cinsi" className="text-slate-300">Araç Cinsi</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.arac_cinsi || undefined}
                    onValueChange={(value) => setFormData({...formData, arac_cinsi: value})}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-slate-700 flex-1">
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {aracCinsleri.length === 0 ? (
                        <SelectItem value="_empty" disabled>Henüz kayıt yok</SelectItem>
                      ) : (
                        aracCinsleri.map(c => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                    onClick={() => openQuickAddModal('arac_cinsi', 'Araç Cinsi')}
                  >
                    <PlusCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Marka */}
              <div className="space-y-2">
                <Label htmlFor="marka" className="text-slate-300">Marka</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.marka || undefined}
                    onValueChange={(value) => setFormData({...formData, marka: value})}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-slate-700 flex-1">
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {markalar.length === 0 ? (
                        <SelectItem value="_empty" disabled>Henüz kayıt yok</SelectItem>
                      ) : (
                        markalar.map(m => (
                          <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                    onClick={() => openQuickAddModal('marka', 'Marka')}
                  >
                    <PlusCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Model */}
              <div className="space-y-2">
                <Label htmlFor="model" className="text-slate-300">Model</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.model || undefined}
                    onValueChange={(value) => setFormData({...formData, model: value})}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-slate-700 flex-1">
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {modeller.length === 0 ? (
                        <SelectItem value="_empty" disabled>Henüz kayıt yok</SelectItem>
                      ) : (
                        modeller.map(m => (
                          <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                    onClick={() => openQuickAddModal('model', 'Model')}
                  >
                    <PlusCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Model Yılı */}
              <div className="space-y-2">
                <Label htmlFor="model_yili" className="text-slate-300">Model Yılı</Label>
                <Input
                  id="model_yili"
                  type="number"
                  min="1990"
                  max="2030"
                  value={formData.model_yili}
                  onChange={(e) => setFormData({...formData, model_yili: e.target.value})}
                  placeholder="2024"
                  className="bg-slate-800/50 border-slate-700"
                />
              </div>

              {/* Kayıtlı Şirket */}
              <div className="space-y-2">
                <Label htmlFor="kayitli_sirket" className="text-slate-300">Kayıtlı Olduğu Şirket</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.kayitli_sirket || undefined}
                    onValueChange={(value) => setFormData({...formData, kayitli_sirket: value})}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-slate-700 flex-1">
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {sirketler.length === 0 ? (
                        <SelectItem value="_empty" disabled>Henüz kayıt yok</SelectItem>
                      ) : (
                        sirketler.map(s => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                    onClick={() => openQuickAddModal('sirket', 'Şirket')}
                  >
                    <PlusCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Muayene Tarihi */}
              <div className="space-y-2">
                <Label htmlFor="muayene_tarihi" className="text-slate-300">Muayene Tarihi</Label>
                <Input
                  id="muayene_tarihi"
                  type="date"
                  value={formData.muayene_tarihi}
                  onChange={(e) => setFormData({...formData, muayene_tarihi: e.target.value})}
                  className="bg-slate-800/50 border-slate-700"
                />
              </div>

              {/* Kasko Yenileme Tarihi */}
              <div className="space-y-2">
                <Label htmlFor="kasko_yenileme_tarihi" className="text-slate-300">Kasko Yenileme Tarihi</Label>
                <Input
                  id="kasko_yenileme_tarihi"
                  type="date"
                  value={formData.kasko_yenileme_tarihi}
                  onChange={(e) => setFormData({...formData, kasko_yenileme_tarihi: e.target.value})}
                  className="bg-slate-800/50 border-slate-700"
                />
              </div>

              {/* Sigorta Yenileme Tarihi */}
              <div className="space-y-2">
                <Label htmlFor="sigorta_yenileme_tarihi" className="text-slate-300">Sigorta Yenileme Tarihi</Label>
                <Input
                  id="sigorta_yenileme_tarihi"
                  type="date"
                  value={formData.sigorta_yenileme_tarihi}
                  onChange={(e) => setFormData({...formData, sigorta_yenileme_tarihi: e.target.value})}
                  className="bg-slate-800/50 border-slate-700"
                />
              </div>

              {/* Araç Takip ID */}
              <div className="space-y-2">
                <Label htmlFor="arac_takip_id" className="text-slate-300">Araç Takip ID No</Label>
                <Input
                  id="arac_takip_id"
                  value={formData.arac_takip_id}
                  onChange={(e) => setFormData({...formData, arac_takip_id: e.target.value})}
                  placeholder="Takip cihazı ID"
                  className="bg-slate-800/50 border-slate-700"
                />
              </div>

              {/* Araç Takip Hat No */}
              <div className="space-y-2">
                <Label htmlFor="arac_takip_hat_no" className="text-slate-300">Araç Takip Hat No</Label>
                <Input
                  id="arac_takip_hat_no"
                  value={formData.arac_takip_hat_no}
                  onChange={(e) => setFormData({...formData, arac_takip_hat_no: e.target.value})}
                  placeholder="SIM kart / Hat no"
                  className="bg-slate-800/50 border-slate-700"
                />
              </div>
            </div>

            {/* Notlar */}
            <div className="space-y-2">
              <Label htmlFor="notlar" className="text-slate-300">Notlar</Label>
              <Textarea
                id="notlar"
                value={formData.notlar}
                onChange={(e) => setFormData({...formData, notlar: e.target.value})}
                placeholder="Araç hakkında notlar..."
                className="bg-slate-800/50 border-slate-700"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                İptal
              </Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                {editingArac ? 'Güncelle' : 'Kaydet'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hızlı Kaynak Ekleme Modal */}
      <Dialog open={quickAddModal.open} onOpenChange={(open) => setQuickAddModal(prev => ({ ...prev, open }))}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Yeni {quickAddModal.title} Ekle
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quickAddValue" className="text-slate-300">{quickAddModal.title} Adı</Label>
              <Input
                id="quickAddValue"
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(e.target.value)}
                placeholder={`${quickAddModal.title} adını girin`}
                className="bg-slate-800/50 border-slate-700"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuickAdd();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setQuickAddModal({ open: false, type: '', title: '' })}
            >
              İptal
            </Button>
            <Button 
              type="button" 
              className="bg-green-500 hover:bg-green-600"
              onClick={handleQuickAdd}
            >
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hızlı Kaynak Ekleme Modal */}
      <Dialog open={quickAddModal.open} onOpenChange={(open) => setQuickAddModal(prev => ({ ...prev, open }))}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Yeni {quickAddModal.title} Ekle
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quickAddValue" className="text-slate-300">{quickAddModal.title} Adı</Label>
              <Input
                id="quickAddValue"
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(e.target.value)}
                placeholder={`${quickAddModal.title} adını girin`}
                className="bg-slate-800/50 border-slate-700"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuickAdd();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setQuickAddModal({ open: false, type: '', title: '' })}
            >
              İptal
            </Button>
            <Button 
              type="button" 
              className="bg-green-500 hover:bg-green-600"
              onClick={handleQuickAdd}
            >
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AracYonetimi;
