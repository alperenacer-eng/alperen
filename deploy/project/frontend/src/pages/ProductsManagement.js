import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft, Package } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const ProductsManagement = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', unit: 'adet' });
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

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

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newProduct.name.trim()) return;

    setLoading(true);
    try {
      await axios.post(`${API_URL}/products`, newProduct, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ürün eklendi');
      setNewProduct({ name: '', unit: 'adet' });
      fetchProducts();
    } catch (error) {
      toast.error('Ürün eklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/products/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ürün silindi');
      fetchProducts();
    } catch (error) {
      toast.error('Ürün silinemedi');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="animate-fade-in" data-testid="products-management-page">
      <div className="mb-8">
        <button onClick={() => navigate('/settings')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Ayarlara Dön
        </button>
        <div className="flex items-center gap-3 mb-2">
          <Package className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl md:text-4xl font-bold text-white">Ürün Yönetimi</h1>
        </div>
        <p className="text-slate-400">Ürün listesini oluşturun ve yönetin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <h2 className="text-xl font-semibold text-white mb-6">Yeni Ürün Ekle</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-name" className="text-slate-300">Ürün Adı</Label>
              <Input
                id="product-name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="Örn: Parça A, Ürün X"
                data-testid="product-name-input"
                required
                className="h-12 bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-unit" className="text-slate-300">Varsayılan Birim</Label>
              <Select value={newProduct.unit} onValueChange={(value) => setNewProduct({ ...newProduct, unit: value })}>
                <SelectTrigger data-testid="product-unit-select" className="h-12 bg-slate-950 border-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="adet">Adet</SelectItem>
                  <SelectItem value="kg">Kilogram (kg)</SelectItem>
                  <SelectItem value="ton">Ton</SelectItem>
                  <SelectItem value="litre">Litre</SelectItem>
                  <SelectItem value="m">Metre (m)</SelectItem>
                  <SelectItem value="m2">Metrekare (m²)</SelectItem>
                  <SelectItem value="m3">Metreküp (m³)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading} data-testid="add-product-button" className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white">
              <Plus className="w-5 h-5 mr-2" />
              Ekle
            </Button>
          </form>
        </div>

        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <h2 className="text-xl font-semibold text-white mb-6">Ürün Listesi ({products.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {products.length > 0 ? (
              products.map((product, index) => (
                <div key={product.id} data-testid={`product-item-${index}`} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <div>
                    <h3 className="font-semibold text-white">{product.name}</h3>
                    <p className="text-sm text-slate-400">Birim: {product.unit}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(product.id)} data-testid={`delete-product-${index}`} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500" data-testid="no-products">Henüz ürün eklenmedi</div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Bu ürünü silmek istediğinize emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700">İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductsManagement;