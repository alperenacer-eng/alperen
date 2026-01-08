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
import { Plus, Trash2, ArrowLeft, Package, Building2, Grid3x3, Users } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const BimsResources = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('departments');
  
  // Departments
  const [departments, setDepartments] = useState([]);
  const [newDepartment, setNewDepartment] = useState('');
  const [deleteDeptId, setDeleteDeptId] = useState(null);
  
  // Products
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    unit: 'adet',
    sevk_agirligi: 0,
    adet_basi_cimento: 0,
    paket_adet_7_boy: 0,
    paket_adet_5_boy: 0
  });
  const [deleteProductId, setDeleteProductId] = useState(null);
  
  // Molds
  const [molds, setMolds] = useState([]);
  const [newMold, setNewMold] = useState({ mold_no: '', description: '' });
  const [deleteMoldId, setDeleteMoldId] = useState(null);
  
  // Operators
  const [operators, setOperators] = useState([]);
  const [newOperator, setNewOperator] = useState({ name: '', employee_id: '' });
  const [deleteOperatorId, setDeleteOperatorId] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    fetchDepartments();
    fetchProducts();
    fetchMolds();
    fetchOperators();
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
      setNewProduct({ 
        name: '', 
        unit: 'adet',
        sevk_agirligi: 0,
        adet_basi_cimento: 0,
        paket_adet_7_boy: 0,
        paket_adet_5_boy: 0
      });
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

  return (
    <div className="animate-fade-in" data-testid="bims-resources-page">
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Geri
        </button>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Bims Kaynaklar</h1>
        <p className="text-slate-400">İşletmeler, ürünler ve kalıpları yönetin</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-900 border border-slate-800 mb-6">
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
    </div>
  );
};

export default BimsResources;
