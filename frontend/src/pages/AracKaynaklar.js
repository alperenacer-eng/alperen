import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Car,
  Tag,
  Layers,
  Building2,
  Search
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AracKaynaklar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('arac-cinsleri');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data states
  const [aracCinsleri, setAracCinsleri] = useState([]);
  const [markalar, setMarkalar] = useState([]);
  const [modeller, setModeller] = useState([]);
  const [sirketler, setSirketler] = useState([]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});

  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const fetchAllData = useCallback(async () => {
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
      console.error('Veri alınamadı:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchAllData();
  }, [user, navigate, fetchAllData]);

  const openAddModal = (type) => {
    setModalType(type);
    setFormData({ name: '', marka: '', vergi_no: '', adres: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('İsim zorunludur');
      return;
    }

    const endpoints = {
      'arac-cinsi': '/api/arac-cinsleri',
      'marka': '/api/markalar',
      'model': '/api/modeller',
      'sirket': '/api/sirketler'
    };

    try {
      const response = await fetch(`${BACKEND_URL}${endpoints[modalType]}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Kayıt eklendi');
        setShowModal(false);
        fetchAllData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'İşlem başarısız');
      }
    } catch (error) {
      console.error('Kayıt hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;

    const endpoints = {
      'arac-cinsleri': '/api/arac-cinsleri',
      'markalar': '/api/markalar',
      'modeller': '/api/modeller',
      'sirketler': '/api/sirketler'
    };

    try {
      const response = await fetch(`${BACKEND_URL}${endpoints[type]}/${id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        toast.success('Kayıt silindi');
        fetchAllData();
      } else {
        toast.error('Silme işlemi başarısız');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const filterData = (data) => {
    if (!searchTerm) return data;
    return data.filter(item => 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.marka?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getModalTitle = () => {
    const titles = {
      'arac-cinsi': 'Araç Cinsi Ekle',
      'marka': 'Marka Ekle',
      'model': 'Model Ekle',
      'sirket': 'Şirket Ekle'
    };
    return titles[modalType] || 'Ekle';
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
        <h1 className="text-2xl font-bold text-white">Araç Kaynakları</h1>
        <p className="text-slate-400 text-sm mt-1">Araç tanımlamalarını yönetin</p>
      </div>

      {/* Arama */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-900/50 border border-slate-800">
          <TabsTrigger value="arac-cinsleri" className="data-[state=active]:bg-orange-500">
            <Car className="w-4 h-4 mr-2" />
            Araç Cinsi
          </TabsTrigger>
          <TabsTrigger value="markalar" className="data-[state=active]:bg-orange-500">
            <Tag className="w-4 h-4 mr-2" />
            Marka
          </TabsTrigger>
          <TabsTrigger value="modeller" className="data-[state=active]:bg-orange-500">
            <Layers className="w-4 h-4 mr-2" />
            Model
          </TabsTrigger>
          <TabsTrigger value="sirketler" className="data-[state=active]:bg-orange-500">
            <Building2 className="w-4 h-4 mr-2" />
            Şirket
          </TabsTrigger>
        </TabsList>

        {/* Araç Cinsleri */}
        <TabsContent value="arac-cinsleri">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Araç Cinsleri</CardTitle>
              <Button onClick={() => openAddModal('arac-cinsi')} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Ekle
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Araç Cinsi</TableHead>
                    <TableHead className="text-slate-400">Eklenme Tarihi</TableHead>
                    <TableHead className="text-slate-400 text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(aracCinsleri).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-slate-400 py-8">
                        Henüz araç cinsi eklenmemiş
                      </TableCell>
                    </TableRow>
                  ) : (
                    filterData(aracCinsleri).map((item) => (
                      <TableRow key={item.id} className="border-slate-800">
                        <TableCell className="font-medium text-white">{item.name}</TableCell>
                        <TableCell className="text-slate-400">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('tr-TR') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete('arac-cinsleri', item.id)}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Markalar */}
        <TabsContent value="markalar">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Markalar</CardTitle>
              <Button onClick={() => openAddModal('marka')} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Ekle
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Marka</TableHead>
                    <TableHead className="text-slate-400">Eklenme Tarihi</TableHead>
                    <TableHead className="text-slate-400 text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(markalar).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-slate-400 py-8">
                        Henüz marka eklenmemiş
                      </TableCell>
                    </TableRow>
                  ) : (
                    filterData(markalar).map((item) => (
                      <TableRow key={item.id} className="border-slate-800">
                        <TableCell className="font-medium text-white">{item.name}</TableCell>
                        <TableCell className="text-slate-400">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('tr-TR') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete('markalar', item.id)}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modeller */}
        <TabsContent value="modeller">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Modeller</CardTitle>
              <Button onClick={() => openAddModal('model')} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Ekle
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Model</TableHead>
                    <TableHead className="text-slate-400">Marka</TableHead>
                    <TableHead className="text-slate-400">Eklenme Tarihi</TableHead>
                    <TableHead className="text-slate-400 text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(modeller).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                        Henüz model eklenmemiş
                      </TableCell>
                    </TableRow>
                  ) : (
                    filterData(modeller).map((item) => (
                      <TableRow key={item.id} className="border-slate-800">
                        <TableCell className="font-medium text-white">{item.name}</TableCell>
                        <TableCell className="text-slate-300">{item.marka || '-'}</TableCell>
                        <TableCell className="text-slate-400">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('tr-TR') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete('modeller', item.id)}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Şirketler */}
        <TabsContent value="sirketler">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Kayıtlı Şirketler</CardTitle>
              <Button onClick={() => openAddModal('sirket')} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Ekle
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Şirket Adı</TableHead>
                    <TableHead className="text-slate-400">Vergi No</TableHead>
                    <TableHead className="text-slate-400">Adres</TableHead>
                    <TableHead className="text-slate-400">Eklenme Tarihi</TableHead>
                    <TableHead className="text-slate-400 text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterData(sirketler).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                        Henüz şirket eklenmemiş
                      </TableCell>
                    </TableRow>
                  ) : (
                    filterData(sirketler).map((item) => (
                      <TableRow key={item.id} className="border-slate-800">
                        <TableCell className="font-medium text-white">{item.name}</TableCell>
                        <TableCell className="text-slate-300">{item.vergi_no || '-'}</TableCell>
                        <TableCell className="text-slate-300">{item.adres || '-'}</TableCell>
                        <TableCell className="text-slate-400">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('tr-TR') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete('sirketler', item.id)}
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ekleme Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">{getModalTitle()}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">
                {modalType === 'arac-cinsi' ? 'Araç Cinsi' : 
                 modalType === 'marka' ? 'Marka Adı' :
                 modalType === 'model' ? 'Model Adı' : 'Şirket Adı'} *
              </Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder={
                  modalType === 'arac-cinsi' ? 'Örn: Kamyon, Kamyonet, Binek...' : 
                  modalType === 'marka' ? 'Örn: Mercedes, Ford, Volvo...' :
                  modalType === 'model' ? 'Örn: Actros, Transit, FH16...' : 
                  'Örn: Acerler Bims A.Ş.'
                }
                className="bg-slate-800/50 border-slate-700"
                required
              />
            </div>

            {/* Model için marka seçimi */}
            {modalType === 'model' && (
              <div className="space-y-2">
                <Label htmlFor="marka" className="text-slate-300">Marka (Opsiyonel)</Label>
                <Select
                  value={formData.marka || ''}
                  onValueChange={(value) => setFormData({...formData, marka: value})}
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-700">
                    <SelectValue placeholder="Marka seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {markalar.map(m => (
                      <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Şirket için ek alanlar */}
            {modalType === 'sirket' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="vergi_no" className="text-slate-300">Vergi No (Opsiyonel)</Label>
                  <Input
                    id="vergi_no"
                    value={formData.vergi_no || ''}
                    onChange={(e) => setFormData({...formData, vergi_no: e.target.value})}
                    placeholder="1234567890"
                    className="bg-slate-800/50 border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adres" className="text-slate-300">Adres (Opsiyonel)</Label>
                  <Input
                    id="adres"
                    value={formData.adres || ''}
                    onChange={(e) => setFormData({...formData, adres: e.target.value})}
                    placeholder="Şirket adresi"
                    className="bg-slate-800/50 border-slate-700"
                  />
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                İptal
              </Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                Kaydet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AracKaynaklar;
