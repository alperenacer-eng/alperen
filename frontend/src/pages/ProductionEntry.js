import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, ArrowLeft, Calculator, Clock } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Saat'i dakikaya çevirme fonksiyonu
const hoursToMinutes = (hours) => {
  const h = parseFloat(hours) || 0;
  return Math.round(h * 60);
};

// Saat formatı doğrulama (nokta içermeli)
const isValidHourFormat = (value) => {
  if (!value) return false;
  return value.includes('.') && !isNaN(parseFloat(value));
};

const ProductionEntry = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [products, setProducts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [operators, setOperators] = useState([]);
  const [molds, setMolds] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    // Temel alanlar
    product_id: '',
    product_name: '',
    unit: 'adet',
    department_id: '',
    department_name: '',
    operator_id: '',
    operator_name: '',
    notes: '',
    module: currentModule?.id || 'bims',
    // Bims özel alanlar
    production_date: new Date().toISOString().split('T')[0],
    shift_type: 'gunduz',
    shift_number: '',
    worked_hours: '',
    required_hours: '',
    mold_no: '',
    strip_used: '',
    // Üretim verileri
    produced_pallets: '',
    waste: '',
    pieces_per_pallet: '',
    // Karma verileri
    mix_count: '',
    cement_per_mix: '',
    machine_cement: '',
    // Çıkan Paket
    paket_7_boy: '',
    paket_5_boy: '',
    // Arızalar (opsiyonel)
    breakdown_1: '',
    breakdown_2: '',
    breakdown_3: ''
  });

  // Otomatik hesaplamalar
  const [calculations, setCalculations] = useState({
    net_production_pallets: 0,
    total_production: 0,
    total_cement_used: 0,
    cement_difference: 0,
    cement_per_piece: 0,
    lost_time_hours: 0,
    lost_time_minutes: 0,
    worked_minutes: 0,
    required_minutes: 0,
    toplam_paket: 0
  });

  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (!currentModule) {
      navigate('/');
      return;
    }
    if (currentModule.id !== 'bims') {
      navigate('/dashboard');
      return;
    }
    setFormData(prev => ({ ...prev, module: currentModule.id }));
    fetchData();
  }, [currentModule]);

  // Düzenleme modu için kayıt verilerini getir
  useEffect(() => {
    if (editId && token) {
      fetchRecordForEdit();
    }
  }, [editId, token]);

  const fetchRecordForEdit = async () => {
    setLoadingData(true);
    try {
      const response = await axios.get(`${API_URL}/production/${editId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const record = response.data;
      
      setIsEditMode(true);
      setFormData({
        product_id: record.product_id || '',
        product_name: record.product_name || '',
        unit: record.unit || 'adet',
        department_id: record.department_id || '',
        department_name: record.department_name || '',
        operator_id: record.operator_id || '',
        operator_name: record.operator_name || '',
        notes: record.notes || '',
        module: record.module || 'bims',
        production_date: record.production_date || new Date().toISOString().split('T')[0],
        shift_type: record.shift_type || 'gunduz',
        shift_number: record.shift_number || '',
        worked_hours: record.worked_hours ? String(record.worked_hours) : '',
        required_hours: record.required_hours ? String(record.required_hours) : '',
        mold_no: record.mold_no || '',
        strip_used: record.strip_used || '',
        produced_pallets: record.pallet_count ? String(record.pallet_count) : '',
        waste: record.waste ? String(record.waste) : '',
        pieces_per_pallet: record.pieces_per_pallet ? String(record.pieces_per_pallet) : '',
        mix_count: record.mix_count ? String(record.mix_count) : '',
        cement_per_mix: record.cement_in_mix ? String(record.cement_in_mix) : '',
        machine_cement: record.machine_cement ? String(record.machine_cement) : '',
        breakdown_1: record.breakdown_1 || '',
        breakdown_2: record.breakdown_2 || '',
        breakdown_3: record.breakdown_3 || ''
      });
      
      toast.success('Kayıt verileri yüklendi');
    } catch (error) {
      toast.error('Kayıt verileri yüklenemedi');
      navigate('/production-list');
    } finally {
      setLoadingData(false);
    }
  };

  // Hesaplamaları güncelle
  useEffect(() => {
    calculateValues();
  }, [
    formData.produced_pallets,
    formData.waste,
    formData.pieces_per_pallet,
    formData.mix_count,
    formData.cement_per_mix,
    formData.machine_cement,
    formData.worked_hours,
    formData.required_hours
  ]);

  const calculateValues = () => {
    const producedPallets = parseFloat(formData.produced_pallets) || 0;
    const waste = parseFloat(formData.waste) || 0;
    const piecesPerPallet = parseFloat(formData.pieces_per_pallet) || 0;
    const mixCount = parseFloat(formData.mix_count) || 0;
    const cementPerMix = parseFloat(formData.cement_per_mix) || 0;
    const machineCement = parseFloat(formData.machine_cement) || 0;
    const workedHours = parseFloat(formData.worked_hours) || 0;
    const requiredHours = parseFloat(formData.required_hours) || 0;

    // Net Üretim Paleti = Üretilen Palet - Fire
    const netProductionPallets = producedPallets - waste;

    // Toplam Üretim = Net Üretim Paleti × Paletteki Adet
    const totalProduction = netProductionPallets * piecesPerPallet;

    // Harcanan Çimento = Karma Sayısı × Karmadaki Çimento
    const totalCementUsed = mixCount * cementPerMix;

    // Aradaki Fark = Harcanan Çimento - Makina Harcanan
    const cementDifference = totalCementUsed - machineCement;

    // Adet Başı Harcanan = Harcanan Çimento / Toplam Üretim
    const cementPerPiece = totalProduction > 0 ? totalCementUsed / totalProduction : 0;

    // Kayıp Zaman = Çalışılması Gereken - Çalışılan
    const lostTimeHours = requiredHours - workedHours;

    setCalculations({
      net_production_pallets: netProductionPallets,
      total_production: totalProduction,
      total_cement_used: totalCementUsed,
      cement_difference: cementDifference,
      cement_per_piece: cementPerPiece,
      lost_time_hours: lostTimeHours,
      lost_time_minutes: hoursToMinutes(lostTimeHours),
      worked_minutes: hoursToMinutes(workedHours),
      required_minutes: hoursToMinutes(requiredHours)
    });
  };

  const fetchData = async () => {
    try {
      const [productsRes, departmentsRes, operatorsRes, moldsRes] = await Promise.all([
        axios.get(`${API_URL}/products`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/departments`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/operators`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/molds`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setProducts(productsRes.data);
      setDepartments(departmentsRes.data);
      setOperators(operatorsRes.data);
      setMolds(moldsRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    }
  };

  const handleChange = (field, value) => {
    // Validation error'ı temizle
    setValidationErrors(prev => ({ ...prev, [field]: null }));
    
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      if (field === 'product_id') {
        const product = products.find(p => p.id === value);
        if (product) {
          updated.product_name = product.name;
          updated.unit = product.unit;
          // İşletme seçiliyse palet adetini getir
          if (prev.department_id && product.uretim_palet_adetleri) {
            const paletAdet = product.uretim_palet_adetleri[prev.department_id];
            if (paletAdet) {
              updated.pieces_per_pallet = String(paletAdet);
            }
          }
        }
      }
      if (field === 'department_id') {
        const dept = departments.find(d => d.id === value);
        updated.department_name = dept ? dept.name : '';
        // Ürün seçiliyse palet adetini getir
        if (prev.product_id) {
          const product = products.find(p => p.id === prev.product_id);
          if (product && product.uretim_palet_adetleri) {
            const paletAdet = product.uretim_palet_adetleri[value];
            if (paletAdet) {
              updated.pieces_per_pallet = String(paletAdet);
            }
          }
        }
      }
      if (field === 'operator_id') {
        const op = operators.find(o => o.id === value);
        updated.operator_name = op ? op.name : '';
      }
      
      return updated;
    });
  };

  // Form doğrulama
  const validateForm = () => {
    const errors = {};
    
    // Zorunlu alanlar (Arızalar hariç)
    const requiredFields = {
      production_date: 'Tarih',
      department_id: 'İşletme',
      shift_type: 'Vardiya Türü',
      shift_number: 'Çalışılan Vardiya',
      operator_id: 'Operatör',
      worked_hours: 'Çalışılan Saat',
      required_hours: 'Çalışılması Gereken Saat',
      product_id: 'Ürün',
      mold_no: 'Kalıp No',
      strip_used: 'Kullanılan Şerit',
      produced_pallets: 'Üretilen Palet',
      waste: 'Fire',
      pieces_per_pallet: 'Paletteki Adet',
      mix_count: 'Karma Sayısı',
      cement_per_mix: 'Karmadaki Çimento',
      machine_cement: 'Makina Harcanan'
    };

    // Boş alan kontrolü
    Object.entries(requiredFields).forEach(([field, label]) => {
      if (!formData[field] || formData[field] === '') {
        errors[field] = `${label} alanı zorunludur`;
      }
    });

    // Saat formatı kontrolü (nokta zorunlu)
    if (formData.worked_hours && !isValidHourFormat(formData.worked_hours)) {
      errors.worked_hours = 'Saat formatı hatalı! Nokta kullanın (örn: 8.5)';
    }
    if (formData.required_hours && !isValidHourFormat(formData.required_hours)) {
      errors.required_hours = 'Saat formatı hatalı! Nokta kullanın (örn: 8.0)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form doğrulama
    if (!validateForm()) {
      toast.error('Lütfen tüm zorunlu alanları doldurun!');
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        quantity: Math.round(calculations.total_production),
        worked_hours: parseFloat(formData.worked_hours) || null,
        required_hours: parseFloat(formData.required_hours) || null,
        pallet_count: parseInt(formData.produced_pallets) || null,
        pallet_quantity: parseInt(formData.produced_pallets) || null,
        waste: parseInt(formData.waste) || null,
        pieces_per_pallet: parseInt(formData.pieces_per_pallet) || null,
        mix_count: parseInt(formData.mix_count) || null,
        cement_in_mix: parseFloat(formData.cement_per_mix) || null,
        machine_cement: parseFloat(formData.machine_cement) || null,
      };

      if (isEditMode && editId) {
        // Düzenleme modu - mevcut kaydı güncelle (PUT)
        await axios.put(`${API_URL}/production/${editId}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Kayıt başarıyla güncellendi!');
      } else {
        // Yeni kayıt modu (POST)
        await axios.post(`${API_URL}/production`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Üretim kaydı başarıyla oluşturuldu!');
      }
      
      navigate('/production-list');
    } catch (error) {
      toast.error(error.response?.data?.detail || (isEditMode ? 'Kayıt güncellenemedi' : 'Kayıt oluşturulamadı'));
    } finally {
      setLoading(false);
    }
  };

  // Hata gösterme komponenti
  const FieldError = ({ field }) => {
    if (!validationErrors[field]) return null;
    return <p className="text-red-400 text-sm mt-1">{validationErrors[field]}</p>;
  };

  // Yükleniyor durumu
  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Kayıt verileri yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="production-entry-page">
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Geri
        </button>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          {isEditMode ? '✏️ Kayıt Düzenleme' : 'Bims Üretim Girişi'}
        </h1>
        <p className="text-slate-400">
          {isEditMode ? 'Mevcut kaydı düzenleyin ve kaydedin' : 'Yeni üretim kaydı oluşturun'}
        </p>
      </div>

      <div className="glass-effect rounded-xl p-6 md:p-8 border border-slate-800">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Temel Bilgiler */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 pb-2 border-b border-slate-700">📋 Temel Bilgiler</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Tarih *</Label>
                <Input
                  type="date"
                  value={formData.production_date}
                  onChange={(e) => handleChange('production_date', e.target.value)}
                  className={`h-12 bg-slate-950 border-slate-800 text-white ${validationErrors.production_date ? 'border-red-500' : ''}`}
                />
                <FieldError field="production_date" />
              </div>

              <div className="space-y-2">
                <Label>İşletme *</Label>
                <Select value={formData.department_id} onValueChange={(value) => handleChange('department_id', value)}>
                  <SelectTrigger className={`h-12 bg-slate-950 border-slate-800 text-white ${validationErrors.department_id ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="İşletme seçin" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError field="department_id" />
              </div>

              <div className="space-y-2">
                <Label>Vardiya Türü *</Label>
                <Select value={formData.shift_type} onValueChange={(value) => handleChange('shift_type', value)}>
                  <SelectTrigger className={`h-12 bg-slate-950 border-slate-800 text-white ${validationErrors.shift_type ? 'border-red-500' : ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="gunduz">🌞 Gündüz</SelectItem>
                    <SelectItem value="gece">🌙 Gece</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError field="shift_type" />
              </div>

              <div className="space-y-2">
                <Label>Çalışılan Vardiya *</Label>
                <Input
                  type="text"
                  value={formData.shift_number}
                  onChange={(e) => handleChange('shift_number', e.target.value)}
                  placeholder="Vardiya numarası girin"
                  className={`h-12 bg-slate-950 border-slate-800 text-white font-mono ${validationErrors.shift_number ? 'border-red-500' : ''}`}
                />
                <FieldError field="shift_number" />
              </div>

              <div className="space-y-2">
                <Label>Operatör *</Label>
                <Select value={formData.operator_id} onValueChange={(value) => handleChange('operator_id', value)}>
                  <SelectTrigger className={`h-12 bg-slate-950 border-slate-800 text-white ${validationErrors.operator_id ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Operatör seçin" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    {operators.map((op) => (
                      <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError field="operator_id" />
              </div>

              {/* Boş alan için grid hizalama */}
              <div></div>

              {/* Çalışılan Saat */}
              <div className="space-y-2">
                <Label>Çalışılan Saat * <span className="text-slate-500 text-xs">(örn: 8.5)</span></Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={formData.worked_hours}
                      onChange={(e) => handleChange('worked_hours', e.target.value)}
                      placeholder="8.5"
                      className={`h-12 bg-slate-950 border-slate-800 text-white font-mono ${validationErrors.worked_hours ? 'border-red-500' : ''}`}
                    />
                  </div>
                  <div className="w-32 h-12 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-center gap-1 font-mono text-cyan-400">
                    <Clock className="w-4 h-4" />
                    {calculations.worked_minutes} dk
                  </div>
                </div>
                <FieldError field="worked_hours" />
              </div>

              {/* Çalışılması Gereken Saat */}
              <div className="space-y-2">
                <Label>Çalışılması Gereken Saat * <span className="text-slate-500 text-xs">(örn: 8.0)</span></Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={formData.required_hours}
                      onChange={(e) => handleChange('required_hours', e.target.value)}
                      placeholder="8.0"
                      className={`h-12 bg-slate-950 border-slate-800 text-white font-mono ${validationErrors.required_hours ? 'border-red-500' : ''}`}
                    />
                  </div>
                  <div className="w-32 h-12 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-center gap-1 font-mono text-cyan-400">
                    <Clock className="w-4 h-4" />
                    {calculations.required_minutes} dk
                  </div>
                </div>
                <FieldError field="required_hours" />
              </div>

              {/* Kayıp Zaman - Otomatik Hesaplama */}
              <div className="space-y-2 md:col-span-2">
                <Label>⏱️ Kayıp Zaman (Otomatik Hesaplama)</Label>
                <div className="flex gap-4">
                  <div className={`flex-1 h-14 rounded-lg flex items-center justify-center gap-2 font-mono text-lg font-bold ${
                    calculations.lost_time_hours > 0 
                      ? 'bg-red-500/10 border border-red-500/30 text-red-400' 
                      : calculations.lost_time_hours < 0 
                        ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                        : 'bg-slate-800/50 border border-slate-700 text-slate-400'
                  }`}>
                    <Calculator className="w-5 h-5" />
                    {calculations.lost_time_hours.toFixed(2)} saat
                  </div>
                  <div className={`flex-1 h-14 rounded-lg flex items-center justify-center gap-2 font-mono text-lg font-bold ${
                    calculations.lost_time_minutes > 0 
                      ? 'bg-red-500/10 border border-red-500/30 text-red-400' 
                      : calculations.lost_time_minutes < 0 
                        ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                        : 'bg-slate-800/50 border border-slate-700 text-slate-400'
                  }`}>
                    <Clock className="w-5 h-5" />
                    {calculations.lost_time_minutes} dakika
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {calculations.lost_time_hours > 0 
                    ? '⚠️ Kayıp zaman var - Çalışılması gereken süreden daha az çalışıldı' 
                    : calculations.lost_time_hours < 0 
                      ? '✅ Fazla mesai yapıldı' 
                      : 'Tam süre çalışıldı'}
                </p>
              </div>
            </div>
          </div>

          {/* Ürün Bilgileri */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 pb-2 border-b border-slate-700">📦 Ürün Bilgileri</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Ürün *</Label>
                <Select value={formData.product_id} onValueChange={(value) => handleChange('product_id', value)}>
                  <SelectTrigger className={`h-12 bg-slate-950 border-slate-800 text-white ${validationErrors.product_id ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Ürün seçin" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    {products.length > 0 ? (
                      products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-slate-500">Henüz ürün eklenmemiş</div>
                    )}
                  </SelectContent>
                </Select>
                <FieldError field="product_id" />
              </div>

              <div className="space-y-2">
                <Label>Kalıp No *</Label>
                <Select value={formData.mold_no} onValueChange={(value) => handleChange('mold_no', value)}>
                  <SelectTrigger className={`h-12 bg-slate-950 border-slate-800 text-white ${validationErrors.mold_no ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Kalıp seçin" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    {molds.map((mold) => (
                      <SelectItem key={mold.id} value={mold.mold_no}>{mold.mold_no}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError field="mold_no" />
              </div>
            </div>
          </div>

          {/* Kullanılan Şerit */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 pb-2 border-b border-slate-700">🎞️ Şerit Bilgisi</h2>
            <div className="space-y-2">
              <Label>Kullanılan Şerit *</Label>
              <Input
                value={formData.strip_used}
                onChange={(e) => handleChange('strip_used', e.target.value)}
                placeholder="Şerit tipi/numarası"
                className={`h-12 bg-slate-950 border-slate-800 text-white ${validationErrors.strip_used ? 'border-red-500' : ''}`}
              />
              <FieldError field="strip_used" />
            </div>
          </div>

          {/* Üretim Detayları */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 pb-2 border-b border-slate-700">🏭 Üretim Detayları</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Üretilen Palet *</Label>
                <Input
                  type="number"
                  value={formData.produced_pallets}
                  onChange={(e) => handleChange('produced_pallets', e.target.value)}
                  placeholder="0"
                  className={`h-12 bg-slate-950 border-slate-800 text-white font-mono ${validationErrors.produced_pallets ? 'border-red-500' : ''}`}
                />
                <FieldError field="produced_pallets" />
              </div>

              <div className="space-y-2">
                <Label>Fire *</Label>
                <Input
                  type="number"
                  value={formData.waste}
                  onChange={(e) => handleChange('waste', e.target.value)}
                  placeholder="0"
                  className={`h-12 bg-slate-950 border-slate-800 text-white font-mono ${validationErrors.waste ? 'border-red-500' : ''}`}
                />
                <FieldError field="waste" />
              </div>

              <div className="space-y-2">
                <Label>Net Üretim Paleti</Label>
                <div className="h-12 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center px-4 font-mono text-green-400 font-semibold">
                  <Calculator className="w-4 h-4 mr-2" />
                  {calculations.net_production_pallets}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Paletteki Adet *</Label>
                <Input
                  type="number"
                  value={formData.pieces_per_pallet}
                  onChange={(e) => handleChange('pieces_per_pallet', e.target.value)}
                  placeholder="0"
                  className={`h-12 bg-slate-950 border-slate-800 text-white font-mono ${validationErrors.pieces_per_pallet ? 'border-red-500' : ''}`}
                />
                <FieldError field="pieces_per_pallet" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Toplam Üretim (Adet)</Label>
                <div className="h-12 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center px-4 font-mono text-orange-400 font-bold text-lg">
                  <Calculator className="w-5 h-5 mr-2" />
                  {calculations.total_production.toLocaleString('tr-TR')}
                </div>
              </div>
            </div>
          </div>

          {/* Karma Bilgileri */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 pb-2 border-b border-slate-700">🧪 Karma ve Çimento Bilgileri</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Karma Sayısı *</Label>
                <Input
                  type="number"
                  value={formData.mix_count}
                  onChange={(e) => handleChange('mix_count', e.target.value)}
                  placeholder="0"
                  className={`h-12 bg-slate-950 border-slate-800 text-white font-mono ${validationErrors.mix_count ? 'border-red-500' : ''}`}
                />
                <FieldError field="mix_count" />
              </div>

              <div className="space-y-2">
                <Label>Karmadaki Çimento (kg) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.cement_per_mix}
                  onChange={(e) => handleChange('cement_per_mix', e.target.value)}
                  placeholder="0"
                  className={`h-12 bg-slate-950 border-slate-800 text-white font-mono ${validationErrors.cement_per_mix ? 'border-red-500' : ''}`}
                />
                <FieldError field="cement_per_mix" />
              </div>

              <div className="space-y-2">
                <Label>Harcanan Çimento (kg)</Label>
                <div className="h-12 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center px-4 font-mono text-blue-400 font-semibold">
                  <Calculator className="w-4 h-4 mr-2" />
                  {calculations.total_cement_used.toFixed(1)}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Makina Harcanan (kg) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.machine_cement}
                  onChange={(e) => handleChange('machine_cement', e.target.value)}
                  placeholder="0"
                  className={`h-12 bg-slate-950 border-slate-800 text-white font-mono ${validationErrors.machine_cement ? 'border-red-500' : ''}`}
                />
                <FieldError field="machine_cement" />
              </div>

              <div className="space-y-2">
                <Label>Aradaki Fark (kg)</Label>
                <div className={`h-12 rounded-lg flex items-center px-4 font-mono font-semibold ${
                  calculations.cement_difference >= 0 
                    ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400' 
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  <Calculator className="w-4 h-4 mr-2" />
                  {calculations.cement_difference.toFixed(1)}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Adet Başı Harcanan (kg)</Label>
                <div className="h-12 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center px-4 font-mono text-purple-400 font-semibold">
                  <Calculator className="w-4 h-4 mr-2" />
                  {calculations.cement_per_piece.toFixed(3)}
                </div>
              </div>
            </div>
          </div>

          {/* Arızalar - Opsiyonel */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 pb-2 border-b border-slate-700">⚠️ Arızalar <span className="text-sm font-normal text-slate-500">(Opsiyonel)</span></h2>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Arıza 1</Label>
                <Input
                  value={formData.breakdown_1}
                  onChange={(e) => handleChange('breakdown_1', e.target.value)}
                  placeholder="Arıza açıklaması (opsiyonel)"
                  className="h-12 bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label>Arıza 2</Label>
                <Input
                  value={formData.breakdown_2}
                  onChange={(e) => handleChange('breakdown_2', e.target.value)}
                  placeholder="Arıza açıklaması (opsiyonel)"
                  className="h-12 bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label>Arıza 3</Label>
                <Input
                  value={formData.breakdown_3}
                  onChange={(e) => handleChange('breakdown_3', e.target.value)}
                  placeholder="Arıza açıklaması (opsiyonel)"
                  className="h-12 bg-slate-950 border-slate-800 text-white"
                />
              </div>
            </div>
          </div>

          {/* Notlar - Opsiyonel */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 pb-2 border-b border-slate-700">📝 Notlar <span className="text-sm font-normal text-slate-500">(Opsiyonel)</span></h2>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Ek bilgi veya notlar..."
              rows={4}
              className="bg-slate-950 border-slate-800 text-white resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              onClick={() => navigate(-1)}
              variant="outline"
              className="flex-1 h-12 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              data-testid="save-button"
              className={`flex-1 h-12 text-white font-semibold shadow-lg transition-all active:scale-95 ${
                isEditMode 
                  ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20' 
                  : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
              }`}
            >
              <Save className="w-5 h-5 mr-2" />
              {loading 
                ? (isEditMode ? 'Güncelleniyor...' : 'Kaydediliyor...') 
                : (isEditMode ? 'Güncelle' : 'Kaydet')
              }
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductionEntry;
