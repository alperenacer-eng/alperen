import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft, Package, Building2, Grid3x3, Users, Boxes, Edit, History } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const BimsResources = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('stok');
  
  // Departments
  const [departments, setDepartments] = useState([]);
  const [newDepartment, setNewDepartment] = useState('');
  const [deleteDeptId, setDeleteDeptId] = useState(null);
  
  // Products
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', unit: 'adet' });
  const [deleteProductId, setDeleteProductId] = useState(null);
  
  // Molds
  const [molds, setMolds] = useState([]);
  const [newMold, setNewMold] = useState({ mold_no: '', description: '' });
  const [deleteMoldId, setDeleteMoldId] = useState(null);
  
  // Operators
  const [operators, setOperators] = useState([]);
  const [newOperator, setNewOperator] = useState({ name: '', employee_id: '' });
  const [deleteOperatorId, setDeleteOperatorId] = useState(null);
  
  // Stok
  const [stokUrunler, setStokUrunler] = useState([]);
  const [newStokUrun, setNewStokUrun] = useState({
    urun_adi: '',
    birim: 'adet',
    aciklama: '',
    acilis_miktari: 0,
    acilis_tarihi: new Date().toISOString().split('T')[0]
  });
  const [deleteStokId, setDeleteStokId] = useState(null);
  const [editingStok, setEditingStok] = useState(null);
  const [showStokHareket, setShowStokHareket] = useState(null);
  const [stokHareketler, setStokHareketler] = useState([]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    fetchDepartments();
    fetchProducts();
    fetchMolds();
    fetchOperators();
    fetchStokUrunler();
  };

  // Departments
  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API_URL}/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(response.data);
    } catch (error) {
      toast.error('İşletmeler yüklenemedi');
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartment.trim()) return;
    try {
      await axios.post(`${API_URL}/departments`, { name: newDepartment }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('İşletme eklendi');
      setNewDepartment('');
      fetchDepartments();
    } catch (error) {
      toast.error('İşletme eklenemedi');
    }
  };

  const handleDeleteDepartment = async () => {
    try {
      await axios.delete(`${API_URL}/departments/${deleteDeptId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('İşletme silindi');
      fetchDepartments();
    } catch (error) {
      toast.error('İşletme silinemedi');
    } finally {
      setDeleteDeptId(null);
    }
  };

  // Products
  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      toast.error('Ürünler yüklenemedi');
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name.trim()) return;
    try {
      await axios.post(`${API_URL}/products`, newProduct, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ürün eklendi');
      setNewProduct({ name: '', unit: 'adet' });
      fetchProducts();
    } catch (error) {
      toast.error('Ürün eklenemedi');
    }
  };

  const handleDeleteProduct = async () => {
    try {
      await axios.delete(`${API_URL}/products/${deleteProductId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ürün silindi');
      fetchProducts();
    } catch (error) {
      toast.error('Ürün silinemedi');
    } finally {
      setDeleteProductId(null);
    }
  };

  // Molds
  const fetchMolds = async () => {
    try {
      const response = await axios.get(`${API_URL}/molds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMolds(response.data);
    } catch (error) {
      toast.error('Kalıplar yüklenemedi');
    }
  };

  const handleAddMold = async (e) => {
    e.preventDefault();
    if (!newMold.mold_no.trim()) return;
    try {
      await axios.post(`${API_URL}/molds`, newMold, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kalıp eklendi');
      setNewMold({ mold_no: '', description: '' });
      fetchMolds();
    } catch (error) {
      toast.error('Kalıp eklenemedi');
    }
  };

  const handleDeleteMold = async () => {
    try {
      await axios.delete(`${API_URL}/molds/${deleteMoldId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kalıp silindi');
      fetchMolds();
    } catch (error) {
      toast.error('Kalıp silinemedi');
    } finally {
      setDeleteMoldId(null);
    }
  };

  // Operators
  const fetchOperators = async () => {
    try {
      const response = await axios.get(`${API_URL}/operators`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOperators(response.data);
    } catch (error) {
      toast.error('Operatörler yüklenemedi');
    }
  };

  const handleAddOperator = async (e) => {
    e.preventDefault();
    if (!newOperator.name.trim()) return;
    try {
      await axios.post(`${API_URL}/operators`, newOperator, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Operatör eklendi');
      setNewOperator({ name: '', employee_id: '' });
      fetchOperators();
    } catch (error) {
      toast.error('Operatör eklenemedi');
    }
  };

  const handleDeleteOperator = async () => {
    try {
      await axios.delete(`${API_URL}/operators/${deleteOperatorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Operatör silindi');
      fetchOperators();
    } catch (error) {
      toast.error('Operatör silinemedi');
    } finally {
      setDeleteOperatorId(null);
    }
  };

  // Stok Ürünleri
  const fetchStokUrunler = async () => {
    try {
      const response = await axios.get(`${API_URL}/bims-stok-urunler`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStokUrunler(response.data);
    } catch (error) {
      console.error('Stok ürünleri yüklenemedi:', error);
    }
  };

  const handleAddStokUrun = async (e) => {
    e.preventDefault();
    if (!newStokUrun.urun_adi.trim()) return;
    
    try {
      if (editingStok) {
        await axios.put(`${API_URL}/bims-stok-urunler/${editingStok.id}`, newStokUrun, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Stok ürünü güncellendi');
        setEditingStok(null);
      } else {
        await axios.post(`${API_URL}/bims-stok-urunler`, newStokUrun, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Stok ürünü eklendi');
      }
      setNewStokUrun({
        urun_adi: '',
        birim: 'adet',
        aciklama: '',
        acilis_miktari: 0,
        acilis_tarihi: new Date().toISOString().split('T')[0]
      });
      fetchStokUrunler();
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const handleEditStok = (urun) => {
    setEditingStok(urun);
    setNewStokUrun({
      urun_adi: urun.urun_adi,
      birim: urun.birim,
      aciklama: urun.aciklama || '',
      acilis_miktari: urun.acilis_miktari || 0,
      acilis_tarihi: urun.acilis_tarihi || new Date().toISOString().split('T')[0]
    });
  };

  const handleDeleteStok = async () => {
    try {
      await axios.delete(`${API_URL}/bims-stok-urunler/${deleteStokId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Stok ürünü silindi');
      fetchStokUrunler();
    } catch (error) {
      toast.error('Silme başarısız');
    } finally {
      setDeleteStokId(null);
    }
  };

  const fetchStokHareketler = async (urunId) => {
    try {
      const response = await axios.get(`${API_URL}/bims-stok-hareketler?urun_id=${urunId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStokHareketler(response.data);
    } catch (error) {
      console.error('Hareketler yüklenemedi:', error);
    }
  };

  const handleShowHareketler = async (urun) => {
    setShowStokHareket(urun);
    await fetchStokHareketler(urun.id);
  };

  const cancelEdit = () => {
    setEditingStok(null);
    setNewStokUrun({
      urun_adi: '',
      birim: 'adet',
      aciklama: '',
      acilis_miktari: 0,
      acilis_tarihi: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="animate-fade-in" data-testid="bims-resources-page">
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Geri
        </button>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Bims Kaynaklar</h1>
        <p className="text-slate-400">Stok, işletmeler, ürünler ve kalıpları yönetin</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-slate-900 border border-slate-800 mb-6">
          <TabsTrigger value="stok" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
            <Boxes className="w-4 h-4 mr-2" />
            Stok
          </TabsTrigger>
          <TabsTrigger value="departments" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
            <Building2 className="w-4 h-4 mr-2" />
            İşletmeler
          </TabsTrigger>
          <TabsTrigger value="products" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <Package className="w-4 h-4 mr-2" />
            Ürünler
          </TabsTrigger>
          <TabsTrigger value="molds" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            <Grid3x3 className="w-4 h-4 mr-2" />
            Kalıp No
          </TabsTrigger>
          <TabsTrigger value="operators" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" />
            Operatörler
          </TabsTrigger>
        </TabsList>

        {/* Stok Tab */}
        <TabsContent value="stok">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">
                {editingStok ? 'Stok Ürünü Düzenle' : 'Yeni Stok Ürünü Ekle'}
              </h2>
              <form onSubmit={handleAddStokUrun} className="space-y-4">
                <div className="space-y-2">
                  <Label>Ürün Adı *</Label>
                  <Input
                    value={newStokUrun.urun_adi}
                    onChange={(e) => setNewStokUrun({ ...newStokUrun, urun_adi: e.target.value })}
                    placeholder="Örn: Bims Blok 20x20x40"
                    required
                    className="h-12 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Birim</Label>
                    <Select 
                      value={newStokUrun.birim} 
                      onValueChange={(value) => setNewStokUrun({ ...newStokUrun, birim: value })}
                    >
                      <SelectTrigger className="h-12 bg-slate-950 border-slate-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="adet">Adet</SelectItem>
                        <SelectItem value="palet">Palet</SelectItem>
                        <SelectItem value="m2">m²</SelectItem>
                        <SelectItem value="m3">m³</SelectItem>
                        <SelectItem value="kg">Kg</SelectItem>
                        <SelectItem value="ton">Ton</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Açılış Miktarı</Label>
                    <Input
                      type="number"
                      value={newStokUrun.acilis_miktari}
                      onChange={(e) => setNewStokUrun({ ...newStokUrun, acilis_miktari: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className="h-12 bg-slate-950 border-slate-800 text-white"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Açılış Tarihi</Label>
                  <Input
                    type="date"
                    value={newStokUrun.acilis_tarihi}
                    onChange={(e) => setNewStokUrun({ ...newStokUrun, acilis_tarihi: e.target.value })}
                    className="h-12 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Açıklama</Label>
                  <Textarea
                    value={newStokUrun.aciklama}
                    onChange={(e) => setNewStokUrun({ ...newStokUrun, aciklama: e.target.value })}
                    placeholder="Ürün hakkında notlar..."
                    rows={2}
                    className="bg-slate-950 border-slate-800 text-white resize-none"
                  />
                </div>
                
                <div className="flex gap-2">
                  {editingStok && (
                    <Button type="button" onClick={cancelEdit} className="flex-1 h-12 bg-slate-700 hover:bg-slate-600 text-white">
                      İptal
                    </Button>
                  )}
                  <Button type="submit" className={`flex-1 h-12 ${editingStok ? 'bg-blue-500 hover:bg-blue-600' : 'bg-teal-500 hover:bg-teal-600'} text-white`}>
                    <Plus className="w-5 h-5 mr-2" />
                    {editingStok ? 'Güncelle' : 'Ekle'}
                  </Button>
                </div>
              </form>
            </div>

            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Stok Listesi ({stokUrunler.length})</h2>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {stokUrunler.length > 0 ? (
                  stokUrunler.map((urun) => (
                    <div key={urun.id} className="p-4 bg-slate-800/30 rounded-lg border border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{urun.urun_adi}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-slate-400">Birim: {urun.birim}</span>
                            <span className={`text-sm font-medium ${(urun.mevcut_stok || 0) > 0 ? 'text-teal-400' : 'text-red-400'}`}>
                              Stok: {urun.mevcut_stok || 0} {urun.birim}
                            </span>
                          </div>
                          {urun.aciklama && (
                            <p className="text-xs text-slate-500 mt-1">{urun.aciklama}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleShowHareketler(urun)} 
                            className="text-slate-400 hover:text-white hover:bg-slate-700"
                            title="Hareketler"
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditStok(urun)} 
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                            title="Düzenle"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setDeleteStokId(urun.id)} 
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    Henüz stok ürünü eklenmedi
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Yeni İşletme Ekle</h2>
              <form onSubmit={handleAddDepartment} className="space-y-4">
                <div className="space-y-2">
                  <Label>İşletme/Bölüm Adı</Label>
                  <Input
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="Örn: Fabrika 1, Atölye 2"
                    required
                    className="h-12 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <Button type="submit" className="w-full h-12 bg-green-500 hover:bg-green-600 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Ekle
                </Button>
              </form>
            </div>

            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">İşletme Listesi ({departments.length})</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {departments.length > 0 ? (
                  departments.map((dept) => (
                    <div key={dept.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <h3 className="font-semibold text-white">{dept.name}</h3>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteDeptId(dept.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">Henüz işletme eklenmedi</div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Yeni Ürün Ekle</h2>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="space-y-2">
                  <Label>Ürün Adı</Label>
                  <Input
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="Örn: Bims Blok 20x20x40"
                    required
                    className="h-12 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Varsayılan Birim</Label>
                  <Select value={newProduct.unit} onValueChange={(value) => setNewProduct({ ...newProduct, unit: value })}>
                    <SelectTrigger className="h-12 bg-slate-950 border-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="adet">Adet</SelectItem>
                      <SelectItem value="m2">Metrekare (m²)</SelectItem>
                      <SelectItem value="m3">Metreküp (m³)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Ekle
                </Button>
              </form>
            </div>

            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Ürün Listesi ({products.length})</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {products.length > 0 ? (
                  products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <div>
                        <h3 className="font-semibold text-white">{product.name}</h3>
                        <p className="text-sm text-slate-400">Birim: {product.unit}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteProductId(product.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">Henüz ürün eklenmedi</div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Molds Tab */}
        <TabsContent value="molds">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Yeni Kalıp Ekle</h2>
              <form onSubmit={handleAddMold} className="space-y-4">
                <div className="space-y-2">
                  <Label>Kalıp No</Label>
                  <Input
                    value={newMold.mold_no}
                    onChange={(e) => setNewMold({ ...newMold, mold_no: e.target.value })}
                    placeholder="Örn: K-001, K-002"
                    required
                    className="h-12 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Açıklama (Opsiyonel)</Label>
                  <Textarea
                    value={newMold.description}
                    onChange={(e) => setNewMold({ ...newMold, description: e.target.value })}
                    placeholder="Kalıp hakkında ek bilgi..."
                    rows={3}
                    className="bg-slate-950 border-slate-800 text-white resize-none"
                  />
                </div>
                <Button type="submit" className="w-full h-12 bg-purple-500 hover:bg-purple-600 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Ekle
                </Button>
              </form>
            </div>

            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Kalıp Listesi ({molds.length})</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {molds.length > 0 ? (
                  molds.map((mold) => (
                    <div key={mold.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <div>
                        <h3 className="font-semibold text-white">{mold.mold_no}</h3>
                        {mold.description && (
                          <p className="text-sm text-slate-400">{mold.description}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteMoldId(mold.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">Henüz kalıp eklenmedi</div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Operators Tab */}
        <TabsContent value="operators">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Yeni Operatör Ekle</h2>
              <form onSubmit={handleAddOperator} className="space-y-4">
                <div className="space-y-2">
                  <Label>Operatör Adı</Label>
                  <Input
                    value={newOperator.name}
                    onChange={(e) => setNewOperator({ ...newOperator, name: e.target.value })}
                    placeholder="Örn: Ahmet Yılmaz"
                    required
                    className="h-12 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Personel No (Opsiyonel)</Label>
                  <Input
                    value={newOperator.employee_id}
                    onChange={(e) => setNewOperator({ ...newOperator, employee_id: e.target.value })}
                    placeholder="Örn: 12345"
                    className="h-12 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <Button type="submit" className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Ekle
                </Button>
              </form>
            </div>

            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Operatör Listesi ({operators.length})</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {operators.length > 0 ? (
                  operators.map((operator) => (
                    <div key={operator.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <div>
                        <h3 className="font-semibold text-white">{operator.name}</h3>
                        {operator.employee_id && (
                          <p className="text-sm text-slate-400">Personel No: {operator.employee_id}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteOperatorId(operator.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">Henüz operatör eklenmedi</div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Dialogs */}
      <AlertDialog open={!!deleteDeptId} onOpenChange={() => setDeleteDeptId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Bu işletmeyi silmek istediğinize emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700">İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDepartment} className="bg-red-500 hover:bg-red-600 text-white">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Bu ürünü silmek istediğinize emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700">İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-red-500 hover:bg-red-600 text-white">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteMoldId} onOpenChange={() => setDeleteMoldId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Bu kalıbı silmek istediğinize emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700">İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMold} className="bg-red-500 hover:bg-red-600 text-white">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteOperatorId} onOpenChange={() => setDeleteOperatorId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Bu operatörü silmek istediğinize emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700">İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOperator} className="bg-red-500 hover:bg-red-600 text-white">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteStokId} onOpenChange={() => setDeleteStokId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Bu stok ürününü silmek istediğinize emin misiniz? Tüm hareketleri de silinecektir.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700">İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStok} className="bg-red-500 hover:bg-red-600 text-white">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stok Hareketleri Modal */}
      <AlertDialog open={!!showStokHareket} onOpenChange={() => setShowStokHareket(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-teal-400" />
              Stok Hareketleri - {showStokHareket?.urun_adi}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {stokHareketler.length > 0 ? (
              stokHareketler.map((hareket) => (
                <div key={hareket.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      hareket.hareket_tipi === 'acilis' ? 'text-blue-400' :
                      hareket.hareket_tipi === 'giris' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {hareket.hareket_tipi === 'acilis' ? 'Açılış Fişi' :
                       hareket.hareket_tipi === 'giris' ? 'Giriş' : 'Çıkış'}
                    </span>
                    <span className="text-white font-medium">
                      {hareket.hareket_tipi === 'cikis' ? '-' : '+'}{hareket.miktar}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400">{hareket.tarih}</span>
                    {hareket.aciklama && (
                      <span className="text-xs text-slate-500">{hareket.aciklama}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-slate-500">Henüz hareket yok</div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700">Kapat</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BimsResources;
