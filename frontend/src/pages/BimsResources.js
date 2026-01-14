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
import { Plus, Trash2, ArrowLeft, Package, Building2, Grid3x3, Users, Edit, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
    sira_no: '',
    sevk_agirligi: '',
    adet_basi_cimento: '',
    paket_adet_7_boy: '',
    paket_adet_5_boy: '',
    uretim_palet_adetleri: {},
    paket_adetleri_7_boy: {},
    paket_adetleri_5_boy: {}
  });
  const [deleteProductId, setDeleteProductId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Molds
  const [molds, setMolds] = useState([]);
  const [newMold, setNewMold] = useState({ 
    mold_no: '', 
    description: '', 
    product_id: '',
    product_name: '',
    kalip_no_1: '', kalip_no_2: '', kalip_no_3: '', kalip_no_4: '', kalip_no_5: '',
    kalip_no_6: '', kalip_no_7: '', kalip_no_8: '', kalip_no_9: '', kalip_no_10: '',
    duvar_kalinlik_1: '', duvar_kalinlik_2: '', duvar_kalinlik_3: '', duvar_kalinlik_4: '', duvar_kalinlik_5: '',
    duvar_kalinlik_6: '', duvar_kalinlik_7: '', duvar_kalinlik_8: '', duvar_kalinlik_9: '', duvar_kalinlik_10: '',
    makina_cinsi_1: '', makina_cinsi_2: '', makina_cinsi_3: '', makina_cinsi_4: '', makina_cinsi_5: '',
    makina_cinsi_6: '', makina_cinsi_7: '', makina_cinsi_8: '', makina_cinsi_9: '', makina_cinsi_10: ''
  });
  const [deleteMoldId, setDeleteMoldId] = useState(null);
  const [editingMold, setEditingMold] = useState(null);
  
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
    if (!newProduct.name.trim()) {
      toast.error('Ürün adı zorunludur');
      return;
    }

    try {
      const productData = {
        ...newProduct,
        sira_no: parseInt(newProduct.sira_no) || 0,
        sevk_agirligi: parseFloat(newProduct.sevk_agirligi) || 0,
        adet_basi_cimento: parseFloat(newProduct.adet_basi_cimento) || 0,
        paket_adet_7_boy: 0,
        paket_adet_5_boy: 0,
        uretim_palet_adetleri: Object.fromEntries(
          Object.entries(newProduct.uretim_palet_adetleri).map(([k, v]) => [k, parseInt(v) || 0])
        ),
        paket_adetleri_7_boy: Object.fromEntries(
          Object.entries(newProduct.paket_adetleri_7_boy).map(([k, v]) => [k, parseInt(v) || 0])
        ),
        paket_adetleri_5_boy: Object.fromEntries(
          Object.entries(newProduct.paket_adetleri_5_boy).map(([k, v]) => [k, parseInt(v) || 0])
        )
      };
      
      if (editingProduct) {
        await axios.put(`${API_URL}/products/${editingProduct.id}`, productData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Ürün güncellendi');
        setEditingProduct(null);
      } else {
        await axios.post(`${API_URL}/products`, productData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Ürün eklendi');
      }
      
      setNewProduct({ 
        name: '', 
        unit: 'adet',
        sira_no: '',
        sevk_agirligi: '',
        adet_basi_cimento: '',
        paket_adet_7_boy: '',
        paket_adet_5_boy: '',
        uretim_palet_adetleri: {},
        paket_adetleri_7_boy: {},
        paket_adetleri_5_boy: {}
      });
      fetchProducts();
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name || '',
      unit: product.unit || 'adet',
      sira_no: product.sira_no ? String(product.sira_no) : '',
      sevk_agirligi: product.sevk_agirligi ? String(product.sevk_agirligi) : '',
      adet_basi_cimento: product.adet_basi_cimento ? String(product.adet_basi_cimento) : '',
      paket_adet_7_boy: '',
      paket_adet_5_boy: '',
      uretim_palet_adetleri: product.uretim_palet_adetleri || {},
      paket_adetleri_7_boy: product.paket_adetleri_7_boy || {},
      paket_adetleri_5_boy: product.paket_adetleri_5_boy || {}
    });
    setActiveTab('products');
  };

  const cancelEditProduct = () => {
    setEditingProduct(null);
    setNewProduct({ 
      name: '', 
      unit: 'adet',
      sira_no: '',
      sevk_agirligi: '',
      adet_basi_cimento: '',
      paket_adet_7_boy: '',
      paket_adet_5_boy: '',
      uretim_palet_adetleri: {},
      paket_adetleri_7_boy: {},
      paket_adetleri_5_boy: {}
    });
  };

  const updatePaletAdet = (deptId, value) => {
    setNewProduct(prev => ({
      ...prev,
      uretim_palet_adetleri: {
        ...prev.uretim_palet_adetleri,
        [deptId]: value
      }
    }));
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

  // Excel'e Aktar
  const exportToExcel = () => {
    if (products.length === 0) {
      toast.error('Dışarı aktarılacak ürün yok');
      return;
    }

    const exportData = products.map((product, index) => {
      const row = {
        'Sıra No': product.sira_no || index + 1,
        'Ürün Adı': product.name,
        'Birim': product.unit || 'adet',
        'Sevk Ağırlığı (kg)': product.sevk_agirligi || 0,
        'Adet Başı Çimento (kg)': product.adet_basi_cimento || 0,
        'Harcanan Hışır (kg)': product.harcanan_hisir || 0,
      };

      // İşletme bazlı değerleri ekle
      departments.forEach(dept => {
        row[`${dept.name} - Üretim Palet`] = product.uretim_palet_adetleri?.[dept.id] || 0;
        row[`${dept.name} - 7 Boy Paket`] = product.paket_adetleri_7_boy?.[dept.id] || 0;
        row[`${dept.name} - 5 Boy Paket`] = product.paket_adetleri_5_boy?.[dept.id] || 0;
      });

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ürünler');
    
    // Sütun genişliklerini ayarla
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }));
    ws['!cols'] = colWidths;

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `Bims_Urunler_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.xlsx`);
    toast.success('Excel dosyası indirildi');
  };

  // PDF'e Aktar
  const exportToPDF = () => {
    if (products.length === 0) {
      toast.error('Dışarı aktarılacak ürün yok');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4
    
    // Başlık
    doc.setFontSize(18);
    doc.text('Bims Ürün Listesi', 14, 20);
    doc.setFontSize(10);
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 28);

    // Tablo başlıkları
    const headers = [
      'Sıra',
      'Ürün Adı',
      'Sevk (kg)',
      'Çimento (kg)',
      'Hışır (kg)'
    ];

    // İşletme başlıkları ekle
    departments.forEach(dept => {
      headers.push(`${dept.name}\nPalet`);
      headers.push(`${dept.name}\n7 Boy`);
      headers.push(`${dept.name}\n5 Boy`);
    });

    // Tablo verileri
    const tableData = products.map((product, index) => {
      const row = [
        product.sira_no || index + 1,
        product.name,
        product.sevk_agirligi || 0,
        product.adet_basi_cimento || 0,
        product.harcanan_hisir || 0
      ];

      departments.forEach(dept => {
        row.push(product.uretim_palet_adetleri?.[dept.id] || 0);
        row.push(product.paket_adetleri_7_boy?.[dept.id] || 0);
        row.push(product.paket_adetleri_5_boy?.[dept.id] || 0);
      });

      return row;
    });

    // Tabloyu oluştur
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [249, 115, 22], // Orange
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 35 },
      },
    });

    doc.save(`Bims_Urunler_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.pdf`);
    toast.success('PDF dosyası indirildi');
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
    if (!newMold.mold_no.trim()) {
      toast.error('Kalıp adı zorunludur');
      return;
    }
    if (!newMold.product_id) {
      toast.error('Ürün seçimi zorunludur');
      return;
    }
    try {
      if (editingMold) {
        await axios.put(`${API_URL}/molds/${editingMold.id}`, newMold, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Kalıp güncellendi');
        setEditingMold(null);
      } else {
        await axios.post(`${API_URL}/molds`, newMold, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Kalıp eklendi');
      }
      setNewMold({ 
        mold_no: '', description: '', product_id: '', product_name: '',
        kalip_no_1: '', kalip_no_2: '', kalip_no_3: '', kalip_no_4: '', kalip_no_5: '',
        kalip_no_6: '', kalip_no_7: '', kalip_no_8: '', kalip_no_9: '', kalip_no_10: '',
        duvar_kalinlik_1: '', duvar_kalinlik_2: '', duvar_kalinlik_3: '', duvar_kalinlik_4: '', duvar_kalinlik_5: '',
        duvar_kalinlik_6: '', duvar_kalinlik_7: '', duvar_kalinlik_8: '', duvar_kalinlik_9: '', duvar_kalinlik_10: '',
        makina_cinsi_1: '', makina_cinsi_2: '', makina_cinsi_3: '', makina_cinsi_4: '', makina_cinsi_5: '',
        makina_cinsi_6: '', makina_cinsi_7: '', makina_cinsi_8: '', makina_cinsi_9: '', makina_cinsi_10: ''
      });
      fetchMolds();
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const handleEditMold = (mold) => {
    setEditingMold(mold);
    setNewMold({
      mold_no: mold.mold_no || '',
      description: mold.description || '',
      product_id: mold.product_id || '',
      product_name: mold.product_name || '',
      kalip_no_1: mold.kalip_no_1 || '', kalip_no_2: mold.kalip_no_2 || '', kalip_no_3: mold.kalip_no_3 || '',
      kalip_no_4: mold.kalip_no_4 || '', kalip_no_5: mold.kalip_no_5 || '', kalip_no_6: mold.kalip_no_6 || '',
      kalip_no_7: mold.kalip_no_7 || '', kalip_no_8: mold.kalip_no_8 || '', kalip_no_9: mold.kalip_no_9 || '',
      kalip_no_10: mold.kalip_no_10 || '',
      duvar_kalinlik_1: mold.duvar_kalinlik_1 || '', duvar_kalinlik_2: mold.duvar_kalinlik_2 || '', duvar_kalinlik_3: mold.duvar_kalinlik_3 || '',
      duvar_kalinlik_4: mold.duvar_kalinlik_4 || '', duvar_kalinlik_5: mold.duvar_kalinlik_5 || '', duvar_kalinlik_6: mold.duvar_kalinlik_6 || '',
      duvar_kalinlik_7: mold.duvar_kalinlik_7 || '', duvar_kalinlik_8: mold.duvar_kalinlik_8 || '', duvar_kalinlik_9: mold.duvar_kalinlik_9 || '',
      duvar_kalinlik_10: mold.duvar_kalinlik_10 || '',
      makina_cinsi_1: mold.makina_cinsi_1 || '', makina_cinsi_2: mold.makina_cinsi_2 || '', makina_cinsi_3: mold.makina_cinsi_3 || '',
      makina_cinsi_4: mold.makina_cinsi_4 || '', makina_cinsi_5: mold.makina_cinsi_5 || '', makina_cinsi_6: mold.makina_cinsi_6 || '',
      makina_cinsi_7: mold.makina_cinsi_7 || '', makina_cinsi_8: mold.makina_cinsi_8 || '', makina_cinsi_9: mold.makina_cinsi_9 || '',
      makina_cinsi_10: mold.makina_cinsi_10 || ''
    });
    setActiveTab('molds');
  };

  const cancelEditMold = () => {
    setEditingMold(null);
    setNewMold({ 
      mold_no: '', description: '', product_id: '', product_name: '',
      kalip_no_1: '', kalip_no_2: '', kalip_no_3: '', kalip_no_4: '', kalip_no_5: '',
      kalip_no_6: '', kalip_no_7: '', kalip_no_8: '', kalip_no_9: '', kalip_no_10: '',
      duvar_kalinlik_1: '', duvar_kalinlik_2: '', duvar_kalinlik_3: '', duvar_kalinlik_4: '', duvar_kalinlik_5: '',
      duvar_kalinlik_6: '', duvar_kalinlik_7: '', duvar_kalinlik_8: '', duvar_kalinlik_9: '', duvar_kalinlik_10: '',
      makina_cinsi_1: '', makina_cinsi_2: '', makina_cinsi_3: '', makina_cinsi_4: '', makina_cinsi_5: '',
      makina_cinsi_6: '', makina_cinsi_7: '', makina_cinsi_8: '', makina_cinsi_9: '', makina_cinsi_10: ''
    });
  };

  const handleProductSelectForMold = (productId) => {
    const product = products.find(p => p.id === productId);
    setNewMold(prev => ({
      ...prev,
      product_id: productId,
      product_name: product ? product.name : ''
    }));
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
              <h2 className="text-xl font-semibold text-white mb-6">
                {editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
              </h2>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Ürün Adı *</Label>
                    <Input
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder="Örn: Bims Blok 20x20x40"
                      required
                      className="h-12 bg-slate-950 border-slate-800 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sıra No</Label>
                    <Input
                      type="number"
                      value={newProduct.sira_no}
                      onChange={(e) => setNewProduct({ ...newProduct, sira_no: e.target.value })}
                      placeholder="1"
                      min="0"
                      className="h-12 bg-slate-950 border-slate-800 text-white text-center font-bold text-orange-400"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sevk Ağırlığı (kg)</Label>
                    <Input
                      type="number"
                      value={newProduct.sevk_agirligi}
                      onChange={(e) => setNewProduct({ ...newProduct, sevk_agirligi: e.target.value })}
                      placeholder="0"
                      step="0.01"
                      className="h-12 bg-slate-950 border-slate-800 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Adet Başı Çimento (kg)</Label>
                    <Input
                      type="number"
                      value={newProduct.adet_basi_cimento}
                      onChange={(e) => setNewProduct({ ...newProduct, adet_basi_cimento: e.target.value })}
                      placeholder="0"
                      step="0.01"
                      className="h-12 bg-slate-950 border-slate-800 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Harcanan Hışır (Otomatik)</Label>
                  <div className="h-12 px-4 bg-slate-800 border border-slate-700 rounded-md flex items-center text-teal-400 font-semibold">
                    {((parseFloat(newProduct.sevk_agirligi) || 0) - (parseFloat(newProduct.adet_basi_cimento) || 0)).toFixed(2)} kg
                  </div>
                </div>
                
                {/* İşletmelere Göre Palet ve Paket Adetleri */}
                {departments.length > 0 && (
                  <div className="space-y-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <Label className="text-teal-400 text-lg font-semibold">İşletmelere Göre Adetler</Label>
                    
                    {departments.map(dept => (
                      <div key={dept.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <h4 className="text-orange-400 font-semibold mb-3">{dept.name}</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-400">Üretim Palet</Label>
                            <Input
                              type="number"
                              value={newProduct.uretim_palet_adetleri[dept.id] || ''}
                              onChange={(e) => setNewProduct({
                                ...newProduct,
                                uretim_palet_adetleri: {...newProduct.uretim_palet_adetleri, [dept.id]: e.target.value}
                              })}
                              placeholder="0"
                              className="h-10 bg-slate-950 border-slate-700 text-white text-center"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-400">Çıkan Paket (7 Boy)</Label>
                            <Input
                              type="number"
                              value={newProduct.paket_adetleri_7_boy[dept.id] || ''}
                              onChange={(e) => setNewProduct({
                                ...newProduct,
                                paket_adetleri_7_boy: {...newProduct.paket_adetleri_7_boy, [dept.id]: e.target.value}
                              })}
                              placeholder="0"
                              className="h-10 bg-slate-950 border-slate-700 text-white text-center"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-400">Çıkan Paket (5 Boy)</Label>
                            <Input
                              type="number"
                              value={newProduct.paket_adetleri_5_boy[dept.id] || ''}
                              onChange={(e) => setNewProduct({
                                ...newProduct,
                                paket_adetleri_5_boy: {...newProduct.paket_adetleri_5_boy, [dept.id]: e.target.value}
                              })}
                              placeholder="0"
                              className="h-10 bg-slate-950 border-slate-700 text-white text-center"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  {editingProduct && (
                    <Button type="button" onClick={cancelEditProduct} className="flex-1 h-12 bg-slate-700 hover:bg-slate-600 text-white">
                      İptal
                    </Button>
                  )}
                  <Button type="submit" className={`flex-1 h-12 ${editingProduct ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} text-white`}>
                    <Plus className="w-5 h-5 mr-2" />
                    {editingProduct ? 'Güncelle' : 'Ekle'}
                  </Button>
                </div>
              </form>
            </div>

            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Ürün Listesi ({products.length})</h2>
                <div className="flex gap-2">
                  <Button onClick={exportToExcel} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                    <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
                  </Button>
                  <Button onClick={exportToPDF} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                    <FileText className="w-4 h-4 mr-1" /> PDF
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {products.length > 0 ? (
                  products.map((product) => (
                    <div key={product.id} className="p-4 bg-slate-800/30 rounded-lg border border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex-shrink-0 w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                            <span className="text-orange-400 font-bold text-lg">{product.sira_no || '-'}</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-white">{product.name}</h3>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                              <p className="text-slate-400">Sevk: <span className="text-white">{product.sevk_agirligi || 0} kg</span></p>
                              <p className="text-slate-400">Çimento: <span className="text-white">{product.adet_basi_cimento || 0} kg</span></p>
                              <p className="text-slate-400">Hışır: <span className="text-teal-400">{product.harcanan_hisir || 0} kg</span></p>
                              <p className="text-slate-400">7 Boy: <span className="text-white">{product.paket_adet_7_boy || 0}</span> | 5 Boy: <span className="text-white">{product.paket_adet_5_boy || 0}</span></p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditProduct(product)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteProductId(product.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
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
              <h2 className="text-xl font-semibold text-white mb-6">
                {editingMold ? 'Kalıp Düzenle' : 'Yeni Kalıp Ekle'}
              </h2>
              <form onSubmit={handleAddMold} className="space-y-4">
                {/* Ürün Seçimi */}
                <div className="space-y-2">
                  <Label className="text-purple-400">Ürün Seçimi *</Label>
                  <Select 
                    value={newMold.product_id} 
                    onValueChange={handleProductSelectForMold}
                  >
                    <SelectTrigger className="h-12 bg-slate-950 border-slate-800 text-white">
                      <SelectValue placeholder="Ürün seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {products.length === 0 ? (
                        <SelectItem value="_empty" disabled>Önce ürün ekleyin</SelectItem>
                      ) : (
                        products.map(product => (
                          <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Kalıp Adı */}
                <div className="space-y-2">
                  <Label>Kalıp Adı *</Label>
                  <Input
                    value={newMold.mold_no}
                    onChange={(e) => setNewMold({ ...newMold, mold_no: e.target.value })}
                    placeholder="Örn: Kalıp Set A"
                    required
                    className="h-12 bg-slate-950 border-slate-800 text-white"
                  />
                </div>

                {/* 10 Adet Kalıp Numarası, Duvar Kalınlıkları ve Makina Cinsi */}
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Label className="text-teal-400">Kalıp Numaraları</Label>
                    <Label className="text-orange-400">Duvar Kalınlıkları</Label>
                    <Label className="text-blue-400">Makina Cinsi</Label>
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <div key={num} className="grid grid-cols-3 gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-500 w-5">{num}.</span>
                          <Input
                            value={newMold[`kalip_no_${num}`] || ''}
                            onChange={(e) => setNewMold({ ...newMold, [`kalip_no_${num}`]: e.target.value })}
                            placeholder={`Kalıp ${num}`}
                            className="h-8 text-sm bg-slate-950 border-slate-800 text-white flex-1"
                          />
                        </div>
                        <Input
                          value={newMold[`duvar_kalinlik_${num}`] || ''}
                          onChange={(e) => setNewMold({ ...newMold, [`duvar_kalinlik_${num}`]: e.target.value })}
                          placeholder={`Kalınlık ${num}`}
                          className="h-8 text-sm bg-slate-950 border-slate-800 text-white"
                        />
                        <Input
                          value={newMold[`makina_cinsi_${num}`] || ''}
                          onChange={(e) => setNewMold({ ...newMold, [`makina_cinsi_${num}`]: e.target.value })}
                          placeholder={`Makina ${num}`}
                          className="h-8 text-sm bg-slate-950 border-slate-800 text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Açıklama */}
                <div className="space-y-2">
                  <Label>Açıklama (Opsiyonel)</Label>
                  <Textarea
                    value={newMold.description}
                    onChange={(e) => setNewMold({ ...newMold, description: e.target.value })}
                    placeholder="Kalıp hakkında ek bilgi..."
                    rows={2}
                    className="bg-slate-950 border-slate-800 text-white resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  {editingMold && (
                    <Button type="button" onClick={cancelEditMold} className="flex-1 h-12 bg-slate-700 hover:bg-slate-600 text-white">
                      İptal
                    </Button>
                  )}
                  <Button type="submit" className={`flex-1 h-12 ${editingMold ? 'bg-green-500 hover:bg-green-600' : 'bg-purple-500 hover:bg-purple-600'} text-white`}>
                    <Plus className="w-5 h-5 mr-2" />
                    {editingMold ? 'Güncelle' : 'Ekle'}
                  </Button>
                </div>
              </form>
            </div>

            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Kalıp Listesi ({molds.length})</h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {molds.length > 0 ? (
                  molds.map((mold) => (
                    <div key={mold.id} className="p-4 bg-slate-800/30 rounded-lg border border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-white">{mold.mold_no}</h3>
                            {mold.product_name && (
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                                {mold.product_name}
                              </span>
                            )}
                          </div>
                          {/* Kalıp Numaraları, Duvar Kalınlıkları ve Makina Cinsi */}
                          <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                            <div>
                              <span className="text-teal-400 font-medium">Kalıp No:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
                                  const kalipNo = mold[`kalip_no_${num}`];
                                  if (kalipNo) {
                                    return (
                                      <span key={num} className="px-1.5 py-0.5 bg-teal-500/20 text-teal-300 rounded">
                                        {kalipNo}
                                      </span>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            </div>
                            <div>
                              <span className="text-orange-400 font-medium">Duvar Kalınlık:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
                                  const kalinlik = mold[`duvar_kalinlik_${num}`];
                                  if (kalinlik) {
                                    return (
                                      <span key={num} className="px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded">
                                        {kalinlik}
                                      </span>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            </div>
                            <div>
                              <span className="text-blue-400 font-medium">Makina Cinsi:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
                                  const makina = mold[`makina_cinsi_${num}`];
                                  if (makina) {
                                    return (
                                      <span key={num} className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                                        {makina}
                                      </span>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            </div>
                          </div>
                          {mold.description && (
                            <p className="text-sm text-slate-400 mt-2">{mold.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditMold(mold)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteMoldId(mold.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
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
