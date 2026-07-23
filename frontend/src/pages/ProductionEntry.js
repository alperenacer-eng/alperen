import React, { useState, useEffect } from 'react';
import useFormDraft from '../hooks/useFormDraft';
import DraftBanner from '../components/DraftBanner';
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
import { Save, ArrowLeft, Calculator, Clock, Camera, Upload, Loader2, X } from 'lucide-react';
import { formatNumber, formatInteger, formatDecimal } from '@/utils/formatNumber';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Saat'i dakikaya çevirme fonksiyonu
// Kabul edilen formatlar:
//   - Tam saat: "8" -> 480 dk
//   - HH.MM (saat.dakika, dakika 00-59): "5.30" -> 5*60+30 = 330 dk
//   - Ondalık (dakika kısmı 60-99 ise): "5.75" -> 5.75 saat -> 345 dk
// Tek haneli ondalık ("5.3") veya 3+ haneli ondalık geçersizdir.
const hoursToMinutes = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const str = String(value).trim();
  if (!str) return 0;

  // Tam saat (nokta yok)
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10) * 60;
  }

  // "X.YY" - tam 2 haneli ondalık zorunlu
  const match = str.match(/^(\d+)\.(\d{2})$/);
  if (!match) return 0;

  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (isNaN(h) || isNaN(m)) return 0;

  if (m >= 0 && m <= 59) {
    // HH.MM formatı: 5.30 = 5 saat 30 dakika
    return h * 60 + m;
  }
  // 60-99: ondalık saat olarak yorumla (örn: 5.75 = 5.75 saat)
  return Math.round(parseFloat(str) * 60);
};

// Saat formatı doğrulama
// Geçerli: "8", "8.00", "5.30", "5.45", "5.75"
// Geçersiz: "5.3", "5.5", "5.", ".30", "abc"
const isValidHourFormat = (value) => {
  if (value === '' || value === null || value === undefined) return false;
  const str = String(value).trim();
  if (!str) return false;
  if (/^\d+$/.test(str)) return true;
  if (!/^\d+\.\d{2}$/.test(str)) return false;
  const m = parseInt(str.split('.')[1], 10);
  return m >= 0 && m <= 99;
};

// HH.MM (veya ondalık) string -> ondalık saat (backend için)
const hourStringToDecimalHours = (value) => {
  const minutes = hoursToMinutes(value);
  return minutes / 60;
};

// Backend'den gelen ondalık saat -> HH.MM görüntüleme string'i
const decimalHoursToHourString = (decimal) => {
  if (decimal === null || decimal === undefined || decimal === '') return '';
  const num = parseFloat(decimal);
  if (isNaN(num)) return '';
  const totalMin = Math.round(num * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}.${String(m).padStart(2, '0')}`;
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
  const [kalipNoListesi, setKalipNoListesi] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [existingRecords, setExistingRecords] = useState([]);
  const [duplicateRecord, setDuplicateRecord] = useState(null);
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
    // Çıkan Paket - 5 satır
    cikan_paket_1: { urun_id: '', urun_adi: '', paket_7_boy: '', paket_5_boy: '', birim_7_boy: 0, birim_5_boy: 0, onceki_yil_kalan: '' },
    cikan_paket_2: { urun_id: '', urun_adi: '', paket_7_boy: '', paket_5_boy: '', birim_7_boy: 0, birim_5_boy: 0, onceki_yil_kalan: '' },
    cikan_paket_3: { urun_id: '', urun_adi: '', paket_7_boy: '', paket_5_boy: '', birim_7_boy: 0, birim_5_boy: 0, onceki_yil_kalan: '' },
    cikan_paket_4: { urun_id: '', urun_adi: '', paket_7_boy: '', paket_5_boy: '', birim_7_boy: 0, birim_5_boy: 0, onceki_yil_kalan: '' },
    cikan_paket_5: { urun_id: '', urun_adi: '', paket_7_boy: '', paket_5_boy: '', birim_7_boy: 0, birim_5_boy: 0, onceki_yil_kalan: '' },
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
    toplam_7_boy: 0,
    toplam_5_boy: 0,
    genel_toplam_paket: 0
  });

  const [isEditMode, setIsEditMode] = useState(false);

  // 📷 Fotoğraftan veri çıkarma state'leri
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [photoLightboxOpen, setPhotoLightboxOpen] = useState(false);

  // 📄 TASLAK OTOMATİK KAYIT
  const DRAFT_KEY = 'bims_uretim_giris_draft_v1';

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

  // 📄 TASLAK: otomatik kaydet + geri yükle + focus'ta dropdown yenile
  const { draftSavedAt, draftRestored, clearDraft } = useFormDraft(
    DRAFT_KEY,
    formData,
    setFormData,
    {
      enabled: !editId && !isEditMode,
      hasContent: (fd) => !!(
        fd.department_id || fd.product_id || fd.operator_id || fd.mold_no ||
        fd.pallet_count || fd.strip_used || fd.notes || fd.worked_hours ||
        fd.waste || fd.mix_count || fd.machine_cement || fd.breakdown_1
      ),
      onFocusRefresh: () => fetchData(),
    }
  );

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
        worked_hours: record.worked_hours ? decimalHoursToHourString(record.worked_hours) : '',
        required_hours: record.required_hours ? decimalHoursToHourString(record.required_hours) : '',
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
        breakdown_3: record.breakdown_3 || '',
        // Çıkan paket verileri - JSON string ise parse et
        cikan_paket_1: typeof record.cikan_paket_1 === 'string' ? JSON.parse(record.cikan_paket_1 || '{}') : (record.cikan_paket_1 || { urun_id: '', urun_adi: '', miktar: '', paket_7_boy: 0, paket_5_boy: 0 }),
        cikan_paket_2: typeof record.cikan_paket_2 === 'string' ? JSON.parse(record.cikan_paket_2 || '{}') : (record.cikan_paket_2 || { urun_id: '', urun_adi: '', miktar: '', paket_7_boy: 0, paket_5_boy: 0 }),
        cikan_paket_3: typeof record.cikan_paket_3 === 'string' ? JSON.parse(record.cikan_paket_3 || '{}') : (record.cikan_paket_3 || { urun_id: '', urun_adi: '', miktar: '', paket_7_boy: 0, paket_5_boy: 0 }),
        cikan_paket_4: typeof record.cikan_paket_4 === 'string' ? JSON.parse(record.cikan_paket_4 || '{}') : (record.cikan_paket_4 || { urun_id: '', urun_adi: '', miktar: '', paket_7_boy: 0, paket_5_boy: 0 }),
        cikan_paket_5: typeof record.cikan_paket_5 === 'string' ? JSON.parse(record.cikan_paket_5 || '{}') : (record.cikan_paket_5 || { urun_id: '', urun_adi: '', miktar: '', paket_7_boy: 0, paket_5_boy: 0 }),
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
    formData.required_hours,
    formData.cikan_paket_1,
    formData.cikan_paket_2,
    formData.cikan_paket_3,
    formData.cikan_paket_4,
    formData.cikan_paket_5
  ]);

  // Aynı Tarih + İşletme + Vardiya Türü kombinasyonu için uyarı kontrolü
  useEffect(() => {
    if (!formData.production_date || !formData.department_id || !formData.shift_type) {
      setDuplicateRecord(null);
      return;
    }
    const match = existingRecords.find(r => {
      if (isEditMode && editId && String(r.id) === String(editId)) return false;
      return (
        r.production_date === formData.production_date &&
        String(r.department_id) === String(formData.department_id) &&
        (r.shift_type || 'gunduz') === formData.shift_type
      );
    });
    setDuplicateRecord(prev => {
      // Yeni bir mükerrer tespit edildiğinde toast uyarısı göster (aynı ID tekrar tetiklenmesin)
      if (match && (!prev || prev.id !== match.id)) {
        const shiftLabel = formData.shift_type === 'gece' ? 'GECE 🌙' : 'GÜNDÜZ 🌞';
        const deptName = departments.find(d => String(d.id) === String(formData.department_id))?.name || '';
        toast.warning(
          `⚠️ Dikkat! ${formData.production_date} tarihinde "${deptName}" işletmesinde ${shiftLabel} vardiyası için zaten kayıt var.`,
          { duration: 6000 }
        );
      }
      return match || null;
    });
  }, [formData.production_date, formData.department_id, formData.shift_type, existingRecords, isEditMode, editId, departments]);

  const calculateValues = () => {
    const producedPallets = parseFloat(formData.produced_pallets) || 0;
    const waste = parseFloat(formData.waste) || 0;
    const piecesPerPallet = parseFloat(formData.pieces_per_pallet) || 0;
    const mixCount = parseFloat(formData.mix_count) || 0;
    const cementPerMix = parseFloat(formData.cement_per_mix) || 0;
    const machineCement = parseFloat(formData.machine_cement) || 0;
    const workedMinutes = hoursToMinutes(formData.worked_hours);
    const requiredMinutes = hoursToMinutes(formData.required_hours);
    const workedHours = workedMinutes / 60;
    const requiredHours = requiredMinutes / 60;

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
    const lostTimeMinutes = requiredMinutes - workedMinutes;
    const lostTimeHours = lostTimeMinutes / 60;

    // Çıkan Paket Toplamları - Paket adeti × Birim adet = Toplam
    let toplam7Boy = 0;
    let toplam5Boy = 0;
    
    for (let i = 1; i <= 5; i++) {
      const paket = formData[`cikan_paket_${i}`];
      if (paket) {
        const paket7Adet = parseInt(paket.paket_7_boy) || 0;
        const paket5Adet = parseInt(paket.paket_5_boy) || 0;
        const birim7 = parseInt(paket.birim_7_boy) || 0;
        const birim5 = parseInt(paket.birim_5_boy) || 0;
        toplam7Boy += paket7Adet * birim7;
        toplam5Boy += paket5Adet * birim5;
      }
    }

    setCalculations({
      net_production_pallets: netProductionPallets,
      total_production: totalProduction,
      total_cement_used: totalCementUsed,
      cement_difference: cementDifference,
      cement_per_piece: cementPerPiece,
      lost_time_hours: lostTimeHours,
      lost_time_minutes: lostTimeMinutes,
      worked_minutes: workedMinutes,
      required_minutes: requiredMinutes,
      toplam_7_boy: toplam7Boy,
      toplam_5_boy: toplam5Boy,
      genel_toplam_paket: toplam7Boy + toplam5Boy
    });
  };

  const fetchData = async () => {
    try {
      const [productsRes, departmentsRes, operatorsRes, moldsRes, existingRes] = await Promise.all([
        axios.get(`${API_URL}/products`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/departments`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/operators`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/molds`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/production?limit=1000&module=${currentModule?.id || 'bims'}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setProducts(productsRes.data);
      setDepartments(departmentsRes.data);
      setOperators(operatorsRes.data);
      setMolds(moldsRes.data);
      setExistingRecords(Array.isArray(existingRes.data) ? existingRes.data : (existingRes.data?.records || []));
      
      // Tüm kalıp numaralarını çıkar ve sırala
      const allKalipNos = [];
      moldsRes.data.forEach(mold => {
        for (let i = 1; i <= 10; i++) {
          const kalipNo = mold[`kalip_no_${i}`];
          if (kalipNo && kalipNo.trim() !== '') {
            allKalipNos.push(kalipNo);
          }
        }
      });
      // Sayısal sıralama yap
      allKalipNos.sort((a, b) => {
        const numA = parseInt(a) || 0;
        const numB = parseInt(b) || 0;
        return numA - numB;
      });
      setKalipNoListesi([...new Set(allKalipNos)]); // Tekrarları kaldır
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    }
  };

  // Seçili ürüne ait kalıp numaralarını getir
  const getKalipNoListesiByProduct = (productId) => {
    if (!productId) return [];
    
    // Bu ürüne ait kalıpları bul
    const productMolds = molds.filter(mold => mold.product_id === productId);
    
    // Kalıp numaralarını çıkar
    const kalipNos = [];
    productMolds.forEach(mold => {
      for (let i = 1; i <= 10; i++) {
        const kalipNo = mold[`kalip_no_${i}`];
        if (kalipNo && kalipNo.trim() !== '') {
          kalipNos.push(kalipNo);
        }
      }
    });
    
    // Sayısal sıralama yap ve tekrarları kaldır
    const uniqueKalipNos = [...new Set(kalipNos)];
    uniqueKalipNos.sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });
    
    return uniqueKalipNos;
  };

  // 📷 FOTOĞRAFTAN VERİ ÇIKARMA
  const normalizeText = (s) => {
    if (!s) return '';
    return String(s)
      .toLocaleLowerCase('tr-TR')
      .replace(/[İıI]/g, 'i')
      .replace(/[şŞ]/g, 's')
      .replace(/[ğĞ]/g, 'g')
      .replace(/[üÜ]/g, 'u')
      .replace(/[öÖ]/g, 'o')
      .replace(/[çÇ]/g, 'c')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  const findBestMatch = (list, target, keyName = 'name') => {
    if (!list || !list.length || !target) return null;
    const t = normalizeText(target);
    if (!t) return null;
    // Tam eşleşme
    let match = list.find(item => normalizeText(item[keyName]) === t);
    if (match) return match;
    // Contains eşleşmesi
    match = list.find(item => {
      const n = normalizeText(item[keyName]);
      return n.includes(t) || t.includes(n);
    });
    return match || null;
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen bir resim dosyası seçin');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoUrl('');
    setExtractedData(null);
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview('');
    setPhotoUrl('');
    setExtractedData(null);
  };

  const handleAnalyzePhoto = async () => {
    if (!photoFile) {
      toast.error('Önce bir fotoğraf seçin');
      return;
    }
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append('file', photoFile);
      const res = await axios.post(`${API_URL}/uretim/foto-analiz`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000,
      });
      const { photo_url, extracted } = res.data || {};
      setPhotoUrl(photo_url || '');
      setExtractedData(extracted || null);

      if (!extracted || typeof extracted !== 'object') {
        toast.error('Fotoğraftan veri çıkarılamadı');
        return;
      }
      applyExtractedToForm(extracted);
      toast.success('Fotoğraf analiz edildi — form alanları dolduruldu, lütfen kontrol edin');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Analiz başarısız');
    } finally {
      setAnalyzing(false);
    }
  };

  const applyExtractedToForm = (data) => {
    setFormData(prev => {
      const next = { ...prev };

      // 🔒 SABİT KURALLAR (kullanıcı isteği — fotoğraftaki değerden bağımsız):
      //    - Çalışılan Saat her zaman "8.45"
      //    - Çalışılan Vardiya her zaman "1"
      next.worked_hours = '8.45';
      next.shift_number = '1';

      // Yardımcı: el yazısındaki nokta/virgüller basamak ayracı olarak yazıldığı için kaldırılır
      //   (örn: makinadaki çimento "21.562" → 21562)
      const stripSeparators = (v) => {
        if (v === undefined || v === null || v === '') return '';
        return String(v).replace(/[.,\s]/g, '');
      };

      // Tarih
      if (data.tarih && /^\d{4}-\d{2}-\d{2}$/.test(data.tarih)) {
        next.production_date = data.tarih;
      }

      // Vardiya
      if (data.vardiya) {
        const v = String(data.vardiya).toLowerCase();
        if (v.includes('gec')) next.shift_type = 'gece';
        else next.shift_type = 'gunduz';
      }

      // Çalışılan saat sabittir (yukarıda "8.45" atandı, fotoğraftaki değer yok sayılır)

      // İşletme — önce backend'in matched değerine bak (AI + fuzzy sonucu)
      if (data._matched_department && data._matched_department.id) {
        next.department_id = String(data._matched_department.id);
        next.department_name = data._matched_department.name;
      } else if (data.isletme !== undefined && data.isletme !== null && String(data.isletme).trim() !== '') {
        const targetStr = String(data.isletme).trim();
        let dept = null;
        const digitMatch = targetStr.match(/\d+/);
        if (digitMatch) {
          const digit = digitMatch[0];
          dept = departments.find(d => {
            const nn = String(d.name || '').match(/\d+/);
            return nn && nn[0] === digit;
          });
        }
        if (!dept) dept = findBestMatch(departments, targetStr, 'name');
        if (dept) {
          next.department_id = String(dept.id);
          next.department_name = dept.name;
        }
      }

      // Ürün Cinsi — backend matched > frontend fuzzy
      if (data._matched_product && data._matched_product.id) {
        next.product_id = String(data._matched_product.id);
        next.product_name = data._matched_product.name;
      } else if (data.urun_cinsi) {
        const t = String(data.urun_cinsi);
        const numMatch = t.match(/(\d+)/);
        const hasSW = /sw/i.test(t);
        let product = null;
        if (numMatch) {
          const num = numMatch[1];
          product = products.find(p => {
            const n = String(p.name || '');
            const pn = n.match(/\d+/);
            if (!pn || pn[0] !== num) return false;
            const nHasSW = /sw/i.test(n);
            return nHasSW === hasSW;
          });
        }
        if (!product) product = findBestMatch(products, t, 'name');
        if (product) {
          next.product_id = String(product.id);
          next.product_name = product.name;
          if (product.unit) next.unit = product.unit;
        }
      }

      // Operatör — backend matched > frontend fuzzy
      if (data._matched_operator && data._matched_operator.id) {
        next.operator_id = String(data._matched_operator.id);
        next.operator_name = data._matched_operator.name;
      } else if (data.operator) {
        const targetOp = String(data.operator).trim();
        const targetNorm = normalizeText(targetOp);
        let op = operators.find(o => normalizeText(o.name).startsWith(targetNorm));
        if (!op) op = findBestMatch(operators, targetOp, 'name');
        if (op) {
          next.operator_id = String(op.id);
          next.operator_name = op.name;
        } else {
          next.operator_name = targetOp;
        }
      }

      // Kalıp No — backend matched > raw
      if (data._matched_mold && data._matched_mold.kalip_no) {
        next.mold_no = String(data._matched_mold.kalip_no);
      } else if (data.kalip_no !== undefined && data.kalip_no !== null) {
        next.mold_no = String(data.kalip_no).replace(/[^0-9.]/g, '');
      }

      // Kullanılan Şerit
      if (data.kullanilan_serit !== undefined && data.kullanilan_serit !== null) {
        next.strip_used = String(data.kullanilan_serit);
      }

      // Palet
      if (data.palet !== undefined && data.palet !== null) {
        next.produced_pallets = String(data.palet);
      }
      // Fire
      if (data.fire !== undefined && data.fire !== null) {
        next.waste = String(data.fire);
      }
      // Palet Adeti
      if (data.palet_adeti !== undefined && data.palet_adeti !== null) {
        next.pieces_per_pallet = String(data.palet_adeti);
      }

      // Karma
      if (data.karma_sayisi !== undefined && data.karma_sayisi !== null) {
        next.mix_count = String(data.karma_sayisi);
      }
      // Çimento miktarları — el yazısındaki nokta/virgül basamak ayracı, kaldırılır
      if (data.karmadaki_cimento_miktari !== undefined && data.karmadaki_cimento_miktari !== null) {
        next.cement_per_mix = stripSeparators(data.karmadaki_cimento_miktari);
      }
      if (data.makinadaki_cimento_miktari !== undefined && data.makinadaki_cimento_miktari !== null) {
        next.machine_cement = stripSeparators(data.makinadaki_cimento_miktari);
      }

      // Çıkan Paketler (max 5 slot) — backend'in her satır için matched product'ı varsa onu kullan
      if (Array.isArray(data.cikan_paketler)) {
        data.cikan_paketler.slice(0, 5).forEach((p, idx) => {
          const slotKey = `cikan_paket_${idx + 1}`;
          let productMatch = null;
          if (p._matched_product && p._matched_product.id) {
            productMatch = { id: p._matched_product.id, name: p._matched_product.name };
          } else {
            productMatch = findBestMatch(products, p.urun_cinsi, 'name');
          }
          const boy = String(p.boy || '').toLowerCase();
          const is7 = boy.includes('7');
          const is5 = boy.includes('5');
          const cikanAdet = p.cikan_paket_adeti !== undefined && p.cikan_paket_adeti !== null ? String(p.cikan_paket_adeti) : '';
          const paketAdet = p.paket_adeti !== undefined && p.paket_adeti !== null ? String(p.paket_adeti) : '';
          next[slotKey] = {
            urun_id: productMatch ? String(productMatch.id) : '',
            urun_adi: productMatch ? productMatch.name : (p.urun_cinsi || ''),
            paket_7_boy: is7 || (!is5 && cikanAdet) ? cikanAdet : '',
            paket_5_boy: is5 ? cikanAdet : '',
            birim_7_boy: is7 || (!is5) ? (parseInt(paketAdet) || 0) : 0,
            birim_5_boy: is5 ? (parseInt(paketAdet) || 0) : 0,
            onceki_yil_kalan: '',
          };
        });
      }

      // Bakım / arızalar → breakdown_1/2/3
      if (Array.isArray(data.bakim_aciklamalari)) {
        const arr = data.bakim_aciklamalari.filter(Boolean).slice(0, 3);
        next.breakdown_1 = arr[0] || '';
        next.breakdown_2 = arr[1] || '';
        next.breakdown_3 = arr[2] || '';
      }

      // Personel bilgisi → notes'a ekle
      if (Array.isArray(data.personel) && data.personel.length) {
        const gelenler = data.personel.filter(p => p && p.geldi).map(p => p.isim).filter(Boolean);
        if (gelenler.length) {
          const line = `Personel (geldi): ${gelenler.join(', ')}`;
          next.notes = next.notes ? `${next.notes}\n${line}` : line;
        }
      }

      return next;
    });
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
          // Ürün değiştiğinde kalıp seçimini sıfırla
          updated.mold_no = '';
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
        // İşletme değişince tüm çıkan paket satırlarının BİRİM adetlerini güncelle
        for (let i = 1; i <= 5; i++) {
          const paketKey = `cikan_paket_${i}`;
          const paket = prev[paketKey];
          if (paket && paket.urun_id) {
            const product = products.find(p => p.id === paket.urun_id);
            if (product) {
              updated[paketKey] = {
                ...paket,
                birim_7_boy: product.paket_adetleri_7_boy?.[value] || 0,
                birim_5_boy: product.paket_adetleri_5_boy?.[value] || 0
              };
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

  // Çıkan paket satırı güncelleme
  const handleCikanPaketChange = (rowIndex, field, value) => {
    setFormData(prev => {
      const paketKey = `cikan_paket_${rowIndex}`;
      const currentPaket = prev[paketKey] || { urun_id: '', urun_adi: '', paket_7_boy: '', paket_5_boy: '', birim_7_boy: 0, birim_5_boy: 0 };
      
      let updatedPaket = { ...currentPaket, [field]: value };
      
      // Ürün seçildiğinde BİRİM paket adetlerini getir (kaynaklardan)
      if (field === 'urun_id') {
        const product = products.find(p => p.id === value);
        if (product) {
          updatedPaket.urun_adi = product.name;
          // İşletme seçiliyse birim paket adetlerini getir
          if (prev.department_id) {
            updatedPaket.birim_7_boy = product.paket_adetleri_7_boy?.[prev.department_id] || 0;
            updatedPaket.birim_5_boy = product.paket_adetleri_5_boy?.[prev.department_id] || 0;
          }
        } else {
          updatedPaket.urun_adi = '';
          updatedPaket.birim_7_boy = 0;
          updatedPaket.birim_5_boy = 0;
        }
      }
      
      return { ...prev, [paketKey]: updatedPaket };
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

    // Saat formatı kontrolü (HH.MM - tam 2 haneli ondalık zorunlu)
    if (formData.worked_hours && !isValidHourFormat(formData.worked_hours)) {
      errors.worked_hours = 'Saat formatı hatalı! HH.MM (örn: 8.30 = 8 saat 30 dakika)';
    }
    if (formData.required_hours && !isValidHourFormat(formData.required_hours)) {
      errors.required_hours = 'Saat formatı hatalı! HH.MM (örn: 8.00 = 8 saat)';
    }

    // Kullanılan Şerit sadece rakam olabilir
    if (formData.strip_used !== '' && formData.strip_used !== null && formData.strip_used !== undefined) {
      const s = String(formData.strip_used).trim();
      if (s !== '' && !/^\d+([.,]\d+)?$/.test(s)) {
        errors.strip_used = 'Kullanılan Şerit sadece rakam olmalı (örn: 3 veya 3.5)';
      }
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

    // Aynı Tarih + İşletme + Vardiya Türü kombinasyonu varsa onay iste
    if (duplicateRecord) {
      const shiftLabel = formData.shift_type === 'gece' ? 'GECE' : 'GÜNDÜZ';
      const deptLabel = formData.department_name || duplicateRecord.department_name || '';
      const dateLabel = formData.production_date;
      const ok = window.confirm(
        `⚠️ DİKKAT!\n\n${dateLabel} tarihinde "${deptLabel}" işletmesinde ${shiftLabel} vardiyası için zaten bir üretim kaydı bulunmaktadır.\n\nAynı vardiyaya ikinci bir kayıt eklemek istediğinize emin misiniz?`
      );
      if (!ok) {
        toast.warning('Kayıt iptal edildi. Farklı bir işletme veya vardiya seçin.');
        return;
      }
    }

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        quantity: Math.round(calculations.total_production),
        worked_hours: formData.worked_hours ? hourStringToDecimalHours(formData.worked_hours) : null,
        required_hours: formData.required_hours ? hourStringToDecimalHours(formData.required_hours) : null,
        pallet_count: parseInt(formData.produced_pallets) || null,
        pallet_quantity: parseInt(formData.produced_pallets) || null,
        waste: parseInt(formData.waste) || null,
        pieces_per_pallet: parseInt(formData.pieces_per_pallet) || null,
        mix_count: parseInt(formData.mix_count) || null,
        cement_in_mix: parseFloat(formData.cement_per_mix) || null,
        machine_cement: parseFloat(formData.machine_cement) || null,
        // Çıkan paket verileri - JSON olarak kaydet
        cikan_paket_1: JSON.stringify(formData.cikan_paket_1),
        cikan_paket_2: JSON.stringify(formData.cikan_paket_2),
        cikan_paket_3: JSON.stringify(formData.cikan_paket_3),
        cikan_paket_4: JSON.stringify(formData.cikan_paket_4),
        cikan_paket_5: JSON.stringify(formData.cikan_paket_5),
        toplam_7_boy: calculations.toplam_7_boy,
        toplam_5_boy: calculations.toplam_5_boy,
        photo_url: photoUrl || null,
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

      // ✅ Taslağı temizle (başarılı kayıt sonrası)
      try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}

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

          {/* 📄 TASLAK DURUM BİLDİRİMİ */}
          <DraftBanner
            draftSavedAt={draftSavedAt}
            draftRestored={draftRestored}
            onClear={clearDraft}
            visible={!isEditMode}
          />

          {/* 📷 FOTOĞRAFTAN OTOMATİK DOLDURMA */}
          <div
            data-testid="photo-fill-section"
            className="rounded-lg border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-4 md:p-5"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <h3 className="text-lg font-semibold text-emerald-300 flex items-center gap-2 mb-1">
                  <Camera className="w-5 h-5" />
                  Fotoğraftan Otomatik Doldur
                </h3>
                <p className="text-emerald-100/80 text-sm">
                  Üretim Takip Raporu fotoğrafını yükleyin, AI (Gemini Vision) form alanlarını otomatik doldursun.
                  Kaydetmeden önce lütfen değerleri kontrol edin.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <label
                  htmlFor="uretim-foto-input"
                  data-testid="photo-picker-label"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium border border-slate-600 transition"
                >
                  <Upload className="w-4 h-4" />
                  {photoFile ? 'Değiştir' : 'Fotoğraf Seç'}
                </label>
                <input
                  id="uretim-foto-input"
                  data-testid="photo-picker-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />

                <Button
                  type="button"
                  data-testid="analyze-photo-btn"
                  onClick={handleAnalyzePhoto}
                  disabled={!photoFile || analyzing}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {analyzing ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Analiz ediliyor…</>
                  ) : (
                    <><Camera className="w-4 h-4 mr-2" />Analiz Et &amp; Doldur</>
                  )}
                </Button>

                {photoFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    data-testid="clear-photo-btn"
                    onClick={clearPhoto}
                    className="text-red-300 hover:text-red-200 hover:bg-red-500/10"
                  >
                    <X className="w-4 h-4 mr-1" />Temizle
                  </Button>
                )}
              </div>
            </div>

            {photoPreview && (
              <div className="mt-4 flex items-start gap-4 flex-wrap">
                <img
                  data-testid="photo-preview"
                  src={photoPreview}
                  alt="Yüklenen üretim fotoğrafı"
                  onClick={() => setPhotoLightboxOpen(true)}
                  className="max-h-48 rounded-md border border-slate-700 shadow-lg cursor-zoom-in hover:opacity-90 transition"
                  title="Büyütmek için tıklayın"
                />
                {extractedData && (
                  <div className="flex-1 min-w-[240px] text-sm text-emerald-100/90 bg-slate-900/50 rounded-md p-3 border border-emerald-500/20">
                    <div className="font-semibold text-emerald-300 mb-1">✅ Çıkarılan veriler:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                      {extractedData.tarih && <div>📅 Tarih: <b>{extractedData.tarih}</b></div>}
                      {extractedData.isletme !== undefined && <div>🏭 İşletme: <b>{String(extractedData.isletme)}</b></div>}
                      {extractedData.vardiya && <div>🕐 Vardiya: <b>{extractedData.vardiya}</b></div>}
                      {extractedData.calisilan_saat && <div>⏱️ Çalışılan: <b>{extractedData.calisilan_saat}</b></div>}
                      {extractedData.urun_cinsi && <div>📦 Ürün: <b>{extractedData.urun_cinsi}</b></div>}
                      {extractedData.kalip_no && <div>🔧 Kalıp No: <b>{extractedData.kalip_no}</b></div>}
                      {extractedData.operator && <div>👷 Operatör: <b>{extractedData.operator}</b></div>}
                      {extractedData.palet !== undefined && <div>📦 Palet: <b>{extractedData.palet}</b></div>}
                      {extractedData.fire !== undefined && <div>🗑️ Fire: <b>{extractedData.fire}</b></div>}
                      {extractedData.net_uretim !== undefined && <div>✔️ Net Üretim: <b>{extractedData.net_uretim}</b></div>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Aynı vardiya için mükerrer kayıt uyarısı */}
          {duplicateRecord && (
            <div
              data-testid="duplicate-shift-warning"
              className="rounded-lg border-2 border-amber-500 bg-amber-500/10 p-4 flex items-start gap-3 animate-pulse"
            >
              <div className="text-3xl leading-none">⚠️</div>
              <div className="flex-1">
                <div className="text-amber-300 font-bold text-lg mb-1">
                  Dikkat! Bu vardiya için zaten kayıt var
                </div>
                <div className="text-amber-100 text-sm leading-relaxed">
                  <strong>{formData.production_date}</strong> tarihinde{' '}
                  <strong>&ldquo;{formData.department_name || duplicateRecord.department_name || '—'}&rdquo;</strong> işletmesinde{' '}
                  <strong className="uppercase">
                    {formData.shift_type === 'gece' ? '🌙 GECE' : '🌞 GÜNDÜZ'} vardiyası
                  </strong>{' '}
                  için zaten bir üretim kaydı bulunmaktadır.
                  {duplicateRecord.operator_name && (
                    <> Operatör: <strong>{duplicateRecord.operator_name}</strong>.</>
                  )}
                  <br />
                  Yanlışlıkla aynı vardiyaya ikinci bir kayıt eklemediğinizden emin olun. Farklı bir işletme
                  veya vardiya türü seçebilir ya da mevcut kaydı düzenleyebilirsiniz.
                </div>
              </div>
            </div>
          )}

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
                <Label>Çalışılan Saat * <span className="text-slate-500 text-xs">(HH.MM, örn: 8.30 = 8 saat 30 dk)</span></Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={formData.worked_hours}
                      onChange={(e) => handleChange('worked_hours', e.target.value)}
                      placeholder="8.30"
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
                <Label>Çalışılması Gereken Saat * <span className="text-slate-500 text-xs">(HH.MM, örn: 8.00 = 8 saat)</span></Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={formData.required_hours}
                      onChange={(e) => handleChange('required_hours', e.target.value)}
                      placeholder="8.00"
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
                <Select 
                  value={formData.mold_no} 
                  onValueChange={(value) => handleChange('mold_no', value)}
                  disabled={!formData.product_id}
                >
                  <SelectTrigger className={`h-12 bg-white border-gray-300 text-gray-900 ${validationErrors.mold_no ? 'border-red-500' : ''} ${!formData.product_id ? 'opacity-50' : ''}`}>
                    <SelectValue placeholder={formData.product_id ? "Kalıp No seçin" : "Önce ürün seçin"} />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900 max-h-60">
                    {getKalipNoListesiByProduct(formData.product_id).length > 0 ? (
                      getKalipNoListesiByProduct(formData.product_id).map((kalipNo) => (
                        <SelectItem key={kalipNo} value={kalipNo}>{kalipNo}</SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-gray-500">Bu ürüne ait kalıp numarası bulunamadı</div>
                    )}
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
              <Label>Kullanılan Şerit * <span className="text-xs text-slate-500 font-normal">(sadece rakam)</span></Label>
              <Input
                type="text"
                inputMode="decimal"
                value={formData.strip_used}
                onChange={(e) => {
                  // Sadece rakam ve tek bir nokta/virgül kabul et
                  const v = e.target.value.replace(/[^\d.,]/g, '').replace(/([.,].*)[.,]/g, '$1');
                  handleChange('strip_used', v);
                }}
                placeholder="Örn: 3 veya 3.5"
                data-testid="strip-used-input"
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
                  {formatInteger(calculations.net_production_pallets)}
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
                  {formatInteger(calculations.total_production)}
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
                  {formatDecimal(calculations.total_cement_used, 1)}
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
                  {formatDecimal(calculations.cement_difference, 1)}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Adet Başı Harcanan (kg)</Label>
                <div className="h-12 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center px-4 font-mono text-purple-400 font-semibold">
                  <Calculator className="w-4 h-4 mr-2" />
                  {formatDecimal(calculations.cement_per_piece, 3)}
                </div>
              </div>
            </div>
          </div>

          {/* Çıkan Paket Bilgileri - 5 Satır */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 pb-2 border-b border-slate-700">📦 Çıkan Paket</h2>
            <p className="text-sm text-slate-400 mb-4">Ürün seçin, paket adetlerini girin. Birim adetler otomatik gelir ve toplam hesaplanır.</p>
            
            {/* Başlık Satırı */}
            <div className="grid grid-cols-11 gap-3 mb-3 px-2">
              <div className="col-span-1 text-xs text-slate-500 font-medium">#</div>
              <div className="col-span-2 text-xs text-slate-500 font-medium">Ürün</div>
              <div className="col-span-1 text-xs text-cyan-400 font-medium text-center">7 Boy Paket</div>
              <div className="col-span-1 text-xs text-slate-500 font-medium text-center">Birim Adet</div>
              <div className="col-span-1 text-xs text-amber-400 font-medium text-center">5 Boy Paket</div>
              <div className="col-span-1 text-xs text-slate-500 font-medium text-center">Birim Adet</div>
              <div className="col-span-1 text-xs text-emerald-400 font-medium text-center">7 Boy Top.</div>
              <div className="col-span-1 text-xs text-purple-400 font-medium text-center">5 Boy Top.</div>
              <div className="col-span-1 text-xs text-cyan-300 font-medium text-center">Toplam Adet</div>
              <div className="col-span-1 text-xs text-orange-300 font-medium text-center">Önc. Yıl Kalan</div>
            </div>
            
            {/* 5 Satır */}
            {[1, 2, 3, 4, 5].map((rowIndex) => {
              const paket = formData[`cikan_paket_${rowIndex}`] || { urun_id: '', urun_adi: '', paket_7_boy: '', paket_5_boy: '', birim_7_boy: 0, birim_5_boy: 0 };
              const paket7Adet = parseInt(paket.paket_7_boy) || 0;
              const paket5Adet = parseInt(paket.paket_5_boy) || 0;
              const birim7 = parseInt(paket.birim_7_boy) || 0;
              const birim5 = parseInt(paket.birim_5_boy) || 0;
              const toplam7 = paket7Adet * birim7;
              const toplam5 = paket5Adet * birim5;
              
              return (
                <div key={rowIndex} className="grid grid-cols-11 gap-3 mb-3 items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                  {/* Satır Numarası */}
                  <div className="col-span-1">
                    <span className="text-slate-500 font-mono text-lg">{rowIndex}</span>
                  </div>
                  
                  {/* Ürün Seçimi */}
                  <div className="col-span-2">
                    <Select value={paket.urun_id} onValueChange={(value) => handleCikanPaketChange(rowIndex, 'urun_id', value)}>
                      <SelectTrigger className="h-12 bg-slate-950 border-slate-800 text-white">
                        <SelectValue placeholder="Ürün seçin" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-60">
                        {products.length > 0 ? (
                          products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                          ))
                        ) : (
                          <div className="p-4 text-sm text-slate-500">Henüz ürün eklenmemiş</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* 7 Boy Paket Adeti Girişi */}
                  <div className="col-span-1">
                    <Input
                      type="number"
                      value={paket.paket_7_boy || ''}
                      onChange={(e) => handleCikanPaketChange(rowIndex, 'paket_7_boy', e.target.value)}
                      placeholder="0"
                      className="h-12 bg-cyan-500/10 border-2 border-cyan-500/40 text-cyan-400 font-mono text-center text-lg font-bold"
                    />
                  </div>
                  
                  {/* 7 Boy Birim Adet (Otomatik) */}
                  <div className="col-span-1">
                    <div className="h-12 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center justify-center font-mono text-slate-400">
                      ×{birim7}
                    </div>
                  </div>
                  
                  {/* 5 Boy Paket Adeti Girişi */}
                  <div className="col-span-1">
                    <Input
                      type="number"
                      value={paket.paket_5_boy || ''}
                      onChange={(e) => handleCikanPaketChange(rowIndex, 'paket_5_boy', e.target.value)}
                      placeholder="0"
                      className="h-12 bg-amber-500/10 border-2 border-amber-500/40 text-amber-400 font-mono text-center text-lg font-bold"
                    />
                  </div>
                  
                  {/* 5 Boy Birim Adet (Otomatik) */}
                  <div className="col-span-1">
                    <div className="h-12 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center justify-center font-mono text-slate-400">
                      ×{birim5}
                    </div>
                  </div>
                  
                  {/* 7 Boy Toplam */}
                  <div className="col-span-1">
                    <div className="h-12 bg-emerald-500/20 border border-emerald-500/40 rounded-lg flex items-center justify-center font-mono text-emerald-400 font-bold text-lg">
                      {formatInteger(toplam7)}
                    </div>
                  </div>
                  
                  {/* 5 Boy Toplam */}
                  <div className="col-span-1">
                    <div className="h-12 bg-purple-500/20 border border-purple-500/40 rounded-lg flex items-center justify-center font-mono text-purple-400 font-bold text-lg">
                      {formatInteger(toplam5)}
                    </div>
                  </div>

                  {/* Satır Toplam Adet (7 Boy Top. + 5 Boy Top.) */}
                  <div className="col-span-1">
                    <div className="h-12 bg-cyan-500/20 border-2 border-cyan-500/50 rounded-lg flex items-center justify-center font-mono text-cyan-300 font-bold text-lg">
                      {formatInteger(toplam7 + toplam5)}
                    </div>
                  </div>

                  {/* Önceki Yıldan İçerde Kalan */}
                  <div className="col-span-1">
                    <Input
                      type="number"
                      value={paket.onceki_yil_kalan || ''}
                      onChange={(e) => handleCikanPaketChange(rowIndex, 'onceki_yil_kalan', e.target.value)}
                      placeholder="0"
                      className="h-12 bg-orange-500/10 border-2 border-orange-500/40 text-orange-300 font-mono text-center text-lg font-bold"
                    />
                  </div>
                </div>
              );
            })}
            
            {/* Genel Toplam Satırı */}
            <div className="grid grid-cols-11 gap-3 mt-4 p-4 bg-gradient-to-r from-emerald-900/30 to-purple-900/30 rounded-xl border border-slate-700">
              <div className="col-span-1"></div>
              <div className="col-span-2"></div>
              <div className="col-span-1"></div>
              <div className="col-span-1"></div>
              <div className="col-span-1"></div>
              <div className="col-span-1 flex items-center justify-end">
                <span className="text-slate-300 text-sm font-medium">TOPLAM:</span>
              </div>
              <div className="col-span-1">
                <div className="h-14 bg-emerald-500/20 border-2 border-emerald-500/50 rounded-lg flex flex-col items-center justify-center">
                  <span className="font-mono text-emerald-400 text-2xl font-bold">{formatInteger(calculations.toplam_7_boy)}</span>
                  <span className="text-emerald-400/70 text-xs">7 Boy</span>
                </div>
              </div>
              <div className="col-span-1">
                <div className="h-14 bg-purple-500/20 border-2 border-purple-500/50 rounded-lg flex flex-col items-center justify-center">
                  <span className="font-mono text-purple-400 text-2xl font-bold">{formatInteger(calculations.toplam_5_boy)}</span>
                  <span className="text-purple-400/70 text-xs">5 Boy</span>
                </div>
              </div>
              <div className="col-span-1">
                <div className="h-14 bg-cyan-500/20 border-2 border-cyan-500/50 rounded-lg flex flex-col items-center justify-center">
                  <span className="font-mono text-cyan-300 text-2xl font-bold">{formatInteger(calculations.genel_toplam_paket)}</span>
                  <span className="text-cyan-300/70 text-xs">Toplam</span>
                </div>
              </div>
              <div className="col-span-1"></div>
            </div>
            
            {/* Genel Toplam */}
            <div className="mt-4 flex justify-end">
              <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/40 p-4 rounded-xl border border-cyan-500/30">
                <span className="text-slate-400 text-sm mr-4">GENEL TOPLAM:</span>
                <span className="font-mono text-cyan-400 text-3xl font-bold">{formatInteger(calculations.genel_toplam_paket)}</span>
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

      {/* 🔍 Fotoğraf Büyütme Modal (Lightbox) */}
      {photoLightboxOpen && photoPreview && (
        <div
          data-testid="photo-lightbox"
          onClick={() => setPhotoLightboxOpen(false)}
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setPhotoLightboxOpen(false); }}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            title="Kapat (Esc)"
            aria-label="Kapat"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={photoPreview}
            alt="Yüklenen üretim fotoğrafı (büyütülmüş)"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] max-w-[95vw] object-contain rounded-lg shadow-2xl border border-slate-700 cursor-default"
          />
        </div>
      )}
    </div>
  );
};

export default ProductionEntry;
// Build timestamp: 1768647717
