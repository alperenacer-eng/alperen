import React, { useState, useEffect, useRef, useCallback } from 'react';
import useFormDraft from '../hooks/useFormDraft';
import DraftBanner from '../components/DraftBanner';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Save,
  Truck,
  Factory,
  Fuel,
  ChevronRight,
  Upload,
  FileSpreadsheet,
  Edit3,
  Check,
  AlertCircle,
  Download,
  Trash2,
  Eye,
  Pencil,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Excel başlık eş anlamlıları - kullanıcı Excel'inde farklı yazımlar olabilir
const HEADER_SYNONYMS = {
  tarih: ['tarih', 'date', 'tarihi', 'gun', 'gün'],
  arac_plaka: ['plaka', 'arac plaka', 'araç plaka', 'araç plakası', 'arac plakasi', 'arac', 'araç'],
  miktar_litre: ['miktar', 'litre', 'miktar litre', 'miktar (litre)', 'miktar litresi', 'lt', 'motorin', 'motorin litre', 'motorin (lt)'],
  kilometre: ['km', 'kilometre', 'kilometre (km)', 'arac km', 'araç km'],
  sofor_adi: ['sofor', 'şoför', 'sofor adi', 'şoför adı', 'sofor adı', 'şoför adi', 'surucu', 'sürücü', 'personel', 'personel adı'],
  notlar: ['not', 'notlar', 'aciklama', 'açıklama', 'aciklamalar', 'açıklamalar']
};

const normalizeHeader = (h) => String(h || '').toLowerCase().trim().replace(/[._\-]+/g, ' ').replace(/\s+/g, ' ');

const buildHeaderMap = (headers) => {
  const map = {};
  headers.forEach((h, idx) => {
    const norm = normalizeHeader(h);
    Object.keys(HEADER_SYNONYMS).forEach((key) => {
      if (map[key] !== undefined) return;
      if (HEADER_SYNONYMS[key].some(syn => norm === syn || norm.includes(syn))) {
        map[key] = idx;
      }
    });
  });
  return map;
};

const parseTarih = (val) => {
  if (val === null || val === undefined || val === '') return new Date().toISOString().split('T')[0];
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  const s = String(val).trim();
  // ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  const parts = s.split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    return `${parts[2].padStart(4, '20')}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return new Date().toISOString().split('T')[0];
};

const parseSayi = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  // Turkish format: '1.234,56' (comma is decimal). Strip thousands dots only when comma is present.
  if (s.includes(',')) {
    const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  // Otherwise dot is the decimal separator (e.g. '250.5') or pure integer.
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const MotorinVerme = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const reuploadInputRef = useRef(null);

  const [tesisler, setTesisler] = useState([]);
  const [araclar, setAraclar] = useState([]);
  const [personeller, setPersoneller] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Seçili tesis ve mod
  const [selectedTesis, setSelectedTesis] = useState(null);
  const [entryMode, setEntryMode] = useState(null); // 'manual' veya 'excel'

  // Excel verileri
  const [excelData, setExcelData] = useState([]);
  const [excelFile, setExcelFile] = useState({ name: '', base64: '' });
  const [uploadingExcel, setUploadingExcel] = useState(false);

  // Yüklenmiş Excel listesi
  const [uploads, setUploads] = useState([]);

  // Kayıtları görüntüleme modal
  const [recordsModal, setRecordsModal] = useState({ open: false, upload: null, records: [], loading: false });
  const [editRecordModal, setEditRecordModal] = useState({ open: false, record: null });

  // Manuel form
  const [formData, setFormData] = useState({
    tarih: new Date().toISOString().split('T')[0],
    bosaltim_tesisi: '',
    arac_id: '',
    arac_plaka: '',
    arac_bilgi: '',
    miktar_litre: '',
    kilometre: '',
    sofor_id: '',
    sofor_adi: '',
    personel_id: '',
    personel_adi: '',
    notlar: ''
  });

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchTesisler();
    fetchAraclar();
    fetchPersoneller();
  }, []);

  // 📄 TASLAK: otomatik kaydet + geri yükle + focus'ta dropdown yenile
  const { draftSavedAt, draftRestored, clearDraft } = useFormDraft(
    'motorin_verme_manuel_draft_v1',
    formData,
    setFormData,
    {
      enabled: true,
      hasContent: (fd) => !!(
        fd.bosaltim_tesisi || fd.arac_id || fd.arac_plaka || fd.miktar_litre ||
        fd.sofor_adi || fd.personel_adi || fd.notlar
      ),
      onFocusRefresh: () => {
        fetchTesisler();
        fetchAraclar();
        fetchPersoneller();
      },
    }
  );

  const fetchUploads = useCallback(async (tesisAdi) => {
    if (!tesisAdi) return;
    try {
      const res = await axios.get(`${API_URL}/motorin-verme-uploads`, {
        ...authHeaders,
        params: { tesis_adi: tesisAdi }
      });
      setUploads(res.data || []);
    } catch (e) {
      console.log('Yüklemeler alınamadı', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (selectedTesis && entryMode === 'excel') {
      fetchUploads(selectedTesis.name);
    }
  }, [selectedTesis, entryMode, fetchUploads]);

  const fetchTesisler = async () => {
    try {
      const res = await axios.get(`${API_URL}/bosaltim-tesisleri`, authHeaders);
      setTesisler(res.data);
    } catch (error) {
      console.log('Tesisler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchAraclar = async () => {
    try {
      const res = await axios.get(`${API_URL}/araclar`, authHeaders);
      setAraclar(res.data);
    } catch (error) {
      console.log('Araçlar yüklenemedi');
    }
  };

  const fetchPersoneller = async () => {
    try {
      const res = await axios.get(`${API_URL}/personeller`, authHeaders);
      setPersoneller(res.data);
    } catch (error) {
      console.log('Personeller yüklenemedi');
    }
  };

  const handleSelectTesis = (tesis) => {
    setSelectedTesis(tesis);
    setEntryMode(null);
    setExcelData([]);
    setExcelFile({ name: '', base64: '' });
    setFormData({
      ...formData,
      bosaltim_tesisi: tesis.name,
      tarih: new Date().toISOString().split('T')[0],
      arac_id: '',
      arac_plaka: '',
      arac_bilgi: '',
      miktar_litre: '',
      kilometre: '',
      sofor_id: '',
      sofor_adi: '',
      personel_id: '',
      personel_adi: '',
      notlar: ''
    });
  };

  const handleSelectMode = (mode) => {
    setEntryMode(mode);
    if (mode === 'excel') {
      setExcelData([]);
      setExcelFile({ name: '', base64: '' });
    }
  };

  const handleBack = () => {
    if (entryMode) {
      setEntryMode(null);
      setExcelData([]);
      setExcelFile({ name: '', base64: '' });
    } else {
      setSelectedTesis(null);
    }
  };

  // Excel dosyası okuma - başlık eşleme ile
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

        if (data.length < 2) {
          toast.error('Excel dosyası boş veya hatalı');
          return;
        }

        // Başlık satırını bul - ilk dolu satır
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(5, data.length); i++) {
          if (data[i] && data[i].some(c => c && String(c).trim() !== '')) {
            headerRowIdx = i;
            break;
          }
        }

        const headers = data[headerRowIdx];
        const headerMap = buildHeaderMap(headers);

        // En azından plaka veya miktar başlığını bulamadıysak hata ver
        if (headerMap.arac_plaka === undefined && headerMap.miktar_litre === undefined) {
          toast.error('Excel başlıkları tanınamadı. Şablonu indirip kullanın.');
          return;
        }

        const dataRows = data.slice(headerRowIdx + 1).filter(row =>
          row && row.length > 0 && row.some(c => c !== null && c !== undefined && String(c).trim() !== '')
        );

        const parsedData = dataRows.map((row, idx) => {
          const get = (key) => headerMap[key] !== undefined ? row[headerMap[key]] : '';
          return {
            id: idx,
            tarih: parseTarih(get('tarih')),
            arac_plaka: String(get('arac_plaka') || '').toUpperCase().replace(/\s+/g, ' ').trim(),
            miktar_litre: parseSayi(get('miktar_litre')),
            kilometre: parseSayi(get('kilometre')),
            sofor_adi: String(get('sofor_adi') || '').trim(),
            notlar: String(get('notlar') || '').trim(),
            isValid: true,
            error: ''
          };
        });

        // Validasyon
        parsedData.forEach(item => {
          if (!item.arac_plaka) {
            item.isValid = false;
            item.error = 'Plaka boş';
          } else if (!item.miktar_litre || item.miktar_litre <= 0) {
            item.isValid = false;
            item.error = 'Miktar geçersiz';
          }
        });

        // Base64'e çevir (file objesi tekrar okunmalı binary olarak)
        const fr2 = new FileReader();
        fr2.onload = (ev2) => {
          const b64 = ev2.target.result.split(',')[1] || '';
          setExcelFile({ name: file.name, base64: b64 });
        };
        fr2.readAsDataURL(file);

        setExcelData(parsedData);
        toast.success(`${parsedData.length} satır okundu (${parsedData.filter(d => d.isValid).length} geçerli)`);
      } catch (error) {
        console.error('Excel parse error:', error);
        toast.error('Excel dosyası okunamadı');
      }
    };
    reader.readAsBinaryString(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (reuploadInputRef.current) reuploadInputRef.current.value = '';
  };

  // Excel verisini düzenle (inline)
  const handleExcelDataChange = (idx, field, value) => {
    setExcelData(prev => prev.map((item, i) => {
      if (i === idx) {
        const updated = { ...item, [field]: value };
        if (!updated.arac_plaka) {
          updated.isValid = false;
          updated.error = 'Plaka boş';
        } else if (!updated.miktar_litre || updated.miktar_litre <= 0) {
          updated.isValid = false;
          updated.error = 'Miktar geçersiz';
        } else {
          updated.isValid = true;
          updated.error = '';
        }
        return updated;
      }
      return item;
    }));
  };

  const handleRemoveExcelRow = (idx) => {
    setExcelData(prev => prev.filter((_, i) => i !== idx));
  };

  // Excel verilerini kaydet
  const handleSaveExcelData = async () => {
    const validData = excelData.filter(item => item.isValid);

    if (validData.length === 0) {
      toast.error('Kaydedilecek geçerli veri yok');
      return;
    }

    setUploadingExcel(true);
    try {
      const records = validData.map(item => ({
        tarih: item.tarih,
        bosaltim_tesisi: selectedTesis.name,
        arac_plaka: item.arac_plaka,
        miktar_litre: item.miktar_litre,
        kilometre: item.kilometre,
        sofor_adi: item.sofor_adi,
        notlar: item.notlar
      }));

      const res = await axios.post(`${API_URL}/motorin-verme/bulk`, {
        records,
        dosya_adi: excelFile.name || `motorin_verme_${new Date().toISOString().split('T')[0]}.xlsx`,
        file_data: excelFile.base64 || '',
        tesis_adi: selectedTesis.name
      }, authHeaders);

      toast.success(`${res.data.created_count} kayıt başarıyla oluşturuldu`);
      if (res.data.errors && res.data.errors.length > 0) {
        toast.warning(`${res.data.errors.length} kayıtta hata oluştu`);
      }

      setExcelData([]);
      setExcelFile({ name: '', base64: '' });
      fetchUploads(selectedTesis.name);
    } catch (error) {
      console.error(error);
      toast.error('Kayıtlar oluşturulamadı');
    } finally {
      setUploadingExcel(false);
    }
  };

  // Örnek şablon indir
  const handleDownloadTemplate = () => {
    const template = [
      ['Tarih', 'Araç Plaka', 'Miktar (Litre)', 'Kilometre', 'Şoför Adı', 'Notlar'],
      ['2025-07-15', '34 ABC 123', 50, 125000, 'Ahmet Yılmaz', 'Not 1'],
      ['2025-07-15', '34 DEF 456', 75, 98000, 'Mehmet Demir', '']
    ];
    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Motorin Verme');
    XLSX.writeFile(wb, 'motorin_verme_sablonu.xlsx');
    toast.success('Şablon indirildi');
  };

  // Yüklenmiş Excel dosyasını indir
  const handleDownloadUpload = async (upload) => {
    try {
      const res = await axios.get(`${API_URL}/motorin-verme-uploads/${upload.id}/download`, authHeaders);
      const { dosya_adi, file_data } = res.data;
      if (!file_data) {
        toast.error('Dosya verisi bulunamadı');
        return;
      }
      // base64 to blob
      const byteChars = atob(file_data);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = dosya_adi || 'excel.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('İndirilemedi');
    }
  };

  // Yüklemeyi sil
  const handleDeleteUpload = async (upload) => {
    if (!window.confirm(`"${upload.dosya_adi}" dosyasını ve bağlı ${upload.satir_sayisi} kaydı silmek istediğinize emin misiniz?`)) return;
    try {
      await axios.delete(`${API_URL}/motorin-verme-uploads/${upload.id}?delete_records=true`, authHeaders);
      toast.success('Yükleme silindi');
      fetchUploads(selectedTesis.name);
    } catch (e) {
      toast.error('Silinemedi');
    }
  };

  // Yüklemenin kayıtlarını görüntüle
  const handleViewRecords = async (upload) => {
    setRecordsModal({ open: true, upload, records: [], loading: true });
    try {
      const res = await axios.get(`${API_URL}/motorin-verme-uploads/${upload.id}/records`, authHeaders);
      setRecordsModal({ open: true, upload, records: res.data || [], loading: false });
    } catch (e) {
      toast.error('Kayıtlar yüklenemedi');
      setRecordsModal({ open: false, upload: null, records: [], loading: false });
    }
  };

  const refreshRecordsModal = async () => {
    if (!recordsModal.upload) return;
    try {
      const res = await axios.get(`${API_URL}/motorin-verme-uploads/${recordsModal.upload.id}/records`, authHeaders);
      setRecordsModal(prev => ({ ...prev, records: res.data || [] }));
    } catch (e) {
      // ignore
    }
  };

  // Inline kayıt güncelle (modal içinde tek alan)
  const handleInlineUpdateRecord = async (recId, field, value) => {
    setRecordsModal(prev => ({
      ...prev,
      records: prev.records.map(r => r.id === recId ? { ...r, [field]: value, _dirty: true } : r)
    }));
  };

  const handleSaveInlineRecord = async (rec) => {
    try {
      const payload = {
        tarih: rec.tarih,
        bosaltim_tesisi: rec.bosaltim_tesisi || '',
        arac_id: rec.arac_id || '',
        arac_plaka: rec.arac_plaka || '',
        arac_bilgi: rec.arac_bilgi || '',
        miktar_litre: parseFloat(rec.miktar_litre) || 0,
        kilometre: parseFloat(rec.kilometre) || 0,
        sofor_id: rec.sofor_id || '',
        sofor_adi: rec.sofor_adi || '',
        personel_id: rec.personel_id || '',
        personel_adi: rec.personel_adi || '',
        notlar: rec.notlar || ''
      };
      // arac_id boşsa plakadan bul
      if (!payload.arac_id && payload.arac_plaka) {
        const found = araclar.find(a => (a.plaka || '').toUpperCase().replace(/\s+/g, '') === payload.arac_plaka.toUpperCase().replace(/\s+/g, ''));
        if (found) payload.arac_id = found.id;
      }
      if (!payload.arac_id) {
        toast.error('Plaka sistemde tanımlı değil');
        return;
      }
      await axios.put(`${API_URL}/motorin-verme/${rec.id}`, payload, authHeaders);
      toast.success('Kayıt güncellendi');
      refreshRecordsModal();
    } catch (e) {
      toast.error('Güncellenemedi');
    }
  };

  const handleDeleteRecord = async (rec) => {
    if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/motorin-verme/${rec.id}`, authHeaders);
      toast.success('Kayıt silindi');
      refreshRecordsModal();
      if (selectedTesis) fetchUploads(selectedTesis.name);
    } catch (e) {
      toast.error('Silinemedi');
    }
  };

  const handleOpenEditModal = (rec) => {
    setEditRecordModal({
      open: true,
      record: {
        ...rec,
        miktar_litre: rec.miktar_litre?.toString() || '0',
        kilometre: rec.kilometre?.toString() || '0'
      }
    });
  };

  const handleSaveEditModal = async () => {
    const rec = editRecordModal.record;
    if (!rec) return;
    try {
      // arac_id boşsa plakadan bul
      let arac_id = rec.arac_id || '';
      let arac_bilgi = rec.arac_bilgi || '';
      if (!arac_id && rec.arac_plaka) {
        const found = araclar.find(a => (a.plaka || '').toUpperCase().replace(/\s+/g, '') === (rec.arac_plaka || '').toUpperCase().replace(/\s+/g, ''));
        if (found) {
          arac_id = found.id;
          arac_bilgi = `${found.marka || ''} ${found.model || ''} - ${found.arac_cinsi || ''}`.trim();
        }
      }
      if (!arac_id) {
        toast.error('Plaka sistemde tanımlı değil');
        return;
      }
      const payload = {
        tarih: rec.tarih,
        bosaltim_tesisi: rec.bosaltim_tesisi || '',
        arac_id,
        arac_plaka: (rec.arac_plaka || '').toUpperCase(),
        arac_bilgi,
        miktar_litre: parseFloat(rec.miktar_litre) || 0,
        kilometre: parseFloat(rec.kilometre) || 0,
        sofor_id: rec.sofor_id || '',
        sofor_adi: rec.sofor_adi || '',
        personel_id: rec.personel_id || '',
        personel_adi: rec.personel_adi || '',
        notlar: rec.notlar || ''
      };
      await axios.put(`${API_URL}/motorin-verme/${rec.id}`, payload, authHeaders);
      toast.success('Kayıt güncellendi');
      setEditRecordModal({ open: false, record: null });
      refreshRecordsModal();
    } catch (e) {
      toast.error('Güncellenemedi');
    }
  };

  // Manuel form işlemleri
  const handleAracChange = (e) => {
    const aracId = e.target.value;
    const arac = araclar.find(a => a.id === aracId);
    setFormData({
      ...formData,
      arac_id: aracId,
      arac_plaka: arac ? arac.plaka : '',
      arac_bilgi: arac ? `${arac.marka || ''} ${arac.model || ''} - ${arac.arac_cinsi || ''}`.trim() : ''
    });
  };

  const handlePersonelChange = (e) => {
    const personelId = e.target.value;
    const personel = personeller.find(p => p.id === personelId);
    setFormData({
      ...formData,
      personel_id: personelId,
      personel_adi: personel ? `${personel.ad} ${personel.soyad}` : ''
    });
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();

    if (!formData.arac_id || !formData.miktar_litre) {
      toast.error('Araç ve miktar zorunludur');
      return;
    }

    setSaving(true);
    try {
      const submitData = {
        ...formData,
        miktar_litre: parseFloat(formData.miktar_litre) || 0,
        kilometre: formData.kilometre ? parseFloat(formData.kilometre) : 0
      };

      await axios.post(`${API_URL}/motorin-verme`, submitData, authHeaders);
      toast.success(`${selectedTesis.name} tesisinden motorin verildi`);
      try { localStorage.removeItem('motorin_verme_manuel_draft_v1'); } catch (e) {}

      setFormData({
        ...formData,
        arac_id: '',
        arac_plaka: '',
        arac_bilgi: '',
        miktar_litre: '',
        kilometre: '',
        sofor_id: '',
        sofor_adi: '',
        personel_id: '',
        personel_adi: '',
        notlar: ''
      });
    } catch (error) {
      toast.error('Kayıt oluşturulamadı');
    } finally {
      setSaving(false);
    }
  };

  const validCount = excelData.filter(d => d.isValid).length;
  const invalidCount = excelData.filter(d => !d.isValid).length;

  const formatDateDisplay = (iso) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="animate-fade-in" data-testid="motorin-verme-page">
      <div className="mb-6">
        <button
          onClick={() => selectedTesis ? handleBack() : navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-4"
          data-testid="motorin-verme-back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          {selectedTesis && entryMode ? 'Mod Seçimine Dön' : selectedTesis ? 'Tesis Seçimine Dön' : 'Geri'}
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Araçlara Motorin Verme</h1>
            <p className="text-slate-400">
              {selectedTesis && entryMode === 'excel'
                ? "Excel'den toplu veri yükleyin"
                : selectedTesis && entryMode === 'manual'
                  ? 'Manuel veri girişi yapın'
                  : selectedTesis
                    ? 'Giriş yöntemini seçin'
                    : 'Tesis seçin'}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-slate-400 mt-4">Yükleniyor...</p>
        </div>
      ) : !selectedTesis ? (
        // Tesis Seçimi
        <>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Boşaltım Tesisi Seçin</h2>
            {tesisler.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tesisler.map((tesis) => (
                  <button
                    key={tesis.id}
                    onClick={() => handleSelectTesis(tesis)}
                    data-testid={`tesis-card-${tesis.id}`}
                    className="group glass-effect rounded-xl border border-slate-800 hover:border-cyan-500/50 p-6 text-left transition-all hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                          <Factory className="w-7 h-7 text-cyan-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400">
                            {tesis.name}
                          </h3>
                          {tesis.adres && (
                            <p className="text-sm text-slate-400 mt-1">{tesis.adres}</p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 glass-effect rounded-xl border border-slate-800">
                <Factory className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">Henüz boşaltım tesisi eklenmemiş</p>
                <Button onClick={() => navigate('/motorin-kaynaklar')} className="bg-cyan-600 hover:bg-cyan-700">
                  Kaynaklar&apos;dan Tesis Ekle
                </Button>
              </div>
            )}
          </div>
        </>
      ) : !entryMode ? (
        // Mod Seçimi (Manuel veya Excel)
        <>
          <div className="glass-effect rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <Factory className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-cyan-400">Seçili Tesis</p>
                <h2 className="text-xl font-bold text-white">{selectedTesis.name}</h2>
              </div>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-white mb-4">Giriş Yöntemi Seçin</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => handleSelectMode('manual')}
              data-testid="mode-manual-btn"
              className="group glass-effect rounded-xl border border-slate-800 hover:border-blue-500/50 p-8 text-left transition-all hover:-translate-y-1"
            >
              <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-500/30">
                <Edit3 className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400">Manuel Giriş</h3>
              <p className="text-slate-400">Tek tek veri girişi yapın. Her araç için ayrı ayrı kayıt oluşturun.</p>
            </button>

            <button
              onClick={() => handleSelectMode('excel')}
              data-testid="mode-excel-btn"
              className="group glass-effect rounded-xl border border-slate-800 hover:border-green-500/50 p-8 text-left transition-all hover:-translate-y-1"
            >
              <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-green-500/30">
                <FileSpreadsheet className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-green-400">Excel&apos;den Yükle</h3>
              <p className="text-slate-400">Excel dosyasından toplu veri aktarın. Yüklediğiniz dosyaları görüntüleyin, düzenleyin ve silin.</p>
            </button>
          </div>
        </>
      ) : entryMode === 'excel' ? (
        // Excel Yükleme
        <>
          <div className="glass-effect rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                  <Factory className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-cyan-400">Seçili Tesis</p>
                  <h2 className="text-xl font-bold text-white">{selectedTesis.name}</h2>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium">
                Excel Modu
              </span>
            </div>
          </div>

          {excelData.length === 0 ? (
            <>
              <div className="glass-effect rounded-xl border border-slate-800 p-8 mb-6">
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Upload className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Excel Dosyası Yükleyin</h3>
                  <p className="text-slate-400 mb-6 max-w-md mx-auto">
                    Beklenen sütunlar: <span className="text-white">Tarih, Araç Plaka, Miktar (Litre), Kilometre, Şoför Adı, Notlar</span>.
                    Sütun sırası önemli değildir; başlık adlarına göre eşleme yapılır.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      ref={fileInputRef}
                      className="hidden"
                      data-testid="excel-file-input"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="excel-file-select-btn"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Excel Dosyası Seç
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownloadTemplate}
                      className="border-slate-700 text-slate-300"
                      data-testid="excel-template-download-btn"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Örnek Şablon İndir
                    </Button>
                  </div>
                </div>
              </div>

              {/* Yüklenmiş Excel Dosyaları */}
              <div className="glass-effect rounded-xl border border-slate-800 p-6" data-testid="uploads-section">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                  Yüklenmiş Excel Dosyaları
                  <span className="text-sm text-slate-400 font-normal">({uploads.length})</span>
                </h3>
                {uploads.length === 0 ? (
                  <p className="text-slate-400 text-sm">Bu tesise henüz Excel yüklemesi yapılmamış.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-800/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Dosya Adı</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Yükleme Tarihi</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Yükleyen</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Satır</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {uploads.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-800/30" data-testid={`upload-row-${u.id}`}>
                            <td className="px-4 py-3 text-white text-sm">{u.dosya_adi}</td>
                            <td className="px-4 py-3 text-slate-300 text-sm">{formatDateDisplay(u.created_at)}</td>
                            <td className="px-4 py-3 text-slate-300 text-sm">{u.created_by_name}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">{u.satir_sayisi}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-700 text-slate-300 h-8"
                                  onClick={() => handleViewRecords(u)}
                                  data-testid={`upload-view-${u.id}`}
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" />
                                  Kayıtlar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-700 text-slate-300 h-8"
                                  onClick={() => handleDownloadUpload(u)}
                                  data-testid={`upload-download-${u.id}`}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8"
                                  onClick={() => handleDeleteUpload(u)}
                                  data-testid={`upload-delete-${u.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Excel Önizleme ve Düzenleme
            <div className="space-y-4">
              <div className="glass-effect rounded-xl border border-slate-800 p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-green-400" />
                    <span className="text-white font-medium">{excelFile.name || 'excel.xlsx'}</span>
                    <span className="text-slate-400 text-sm">- {excelData.length} satır</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">{validCount} geçerli</span>
                  </div>
                  {invalidCount > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-red-400">{invalidCount} hatalı</span>
                    </div>
                  )}
                  <div className="flex-1"></div>
                  <Button
                    variant="outline"
                    onClick={() => reuploadInputRef.current?.click()}
                    className="border-slate-700 text-slate-300"
                    size="sm"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Yeni Dosya
                  </Button>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    ref={reuploadInputRef}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="glass-effect rounded-xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Durum</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Tarih</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Araç Plaka</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Miktar (L)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">KM</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Şoför</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Notlar</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {excelData.map((row, idx) => (
                        <tr key={idx} className={!row.isValid ? 'bg-red-500/5' : ''}>
                          <td className="px-4 py-3">
                            {row.isValid ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-4 h-4 text-red-400" />
                                <span className="text-xs text-red-400">{row.error}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="date"
                              value={row.tarih}
                              onChange={(e) => handleExcelDataChange(idx, 'tarih', e.target.value)}
                              className="bg-slate-800 border-slate-700 text-white text-sm h-8 w-32"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              value={row.arac_plaka}
                              onChange={(e) => handleExcelDataChange(idx, 'arac_plaka', e.target.value.toUpperCase())}
                              className="bg-slate-800 border-slate-700 text-white text-sm h-8 w-28 uppercase"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={row.miktar_litre}
                              onChange={(e) => handleExcelDataChange(idx, 'miktar_litre', parseFloat(e.target.value) || 0)}
                              className="bg-slate-800 border-slate-700 text-white text-sm h-8 w-20"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={row.kilometre}
                              onChange={(e) => handleExcelDataChange(idx, 'kilometre', parseFloat(e.target.value) || 0)}
                              className="bg-slate-800 border-slate-700 text-white text-sm h-8 w-24"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              value={row.sofor_adi}
                              onChange={(e) => handleExcelDataChange(idx, 'sofor_adi', e.target.value)}
                              className="bg-slate-800 border-slate-700 text-white text-sm h-8 w-28"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              value={row.notlar}
                              onChange={(e) => handleExcelDataChange(idx, 'notlar', e.target.value)}
                              className="bg-slate-800 border-slate-700 text-white text-sm h-8 w-32"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveExcelRow(idx)}
                              className="text-slate-400 hover:text-red-400 h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-4 justify-end">
                <Button
                  variant="outline"
                  onClick={() => { setExcelData([]); setExcelFile({ name: '', base64: '' }); }}
                  className="border-slate-700 text-slate-300"
                >
                  Temizle
                </Button>
                <Button
                  onClick={handleSaveExcelData}
                  disabled={uploadingExcel || validCount === 0}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="excel-save-btn"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {uploadingExcel ? 'Kaydediliyor...' : `${validCount} Kaydı Oluştur`}
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        // Manuel Giriş Formu
        <>
          <div className="glass-effect rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                  <Factory className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-cyan-400">Seçili Tesis</p>
                  <h2 className="text-xl font-bold text-white">{selectedTesis.name}</h2>
                </div>
              </div>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium">
                Manuel Mod
              </span>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="glass-effect rounded-xl border border-slate-800 p-6">
            <div className="mb-4">
              <DraftBanner
                draftSavedAt={draftSavedAt}
                draftRestored={draftRestored}
                onClear={clearDraft}
              />
            </div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Fuel className="w-5 h-5 text-blue-400" />
              Motorin Verme Bilgileri
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-slate-300">Tarih *</Label>
                <Input
                  type="date"
                  value={formData.tarih}
                  onChange={(e) => setFormData({ ...formData, tarih: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  required
                />
              </div>

              <div>
                <Label className="text-slate-300">Araç *</Label>
                <select
                  value={formData.arac_id}
                  onChange={handleAracChange}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1"
                  required
                >
                  <option value="">Araç Seçin</option>
                  {araclar.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.plaka} - {a.marka} {a.model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-slate-300">Miktar (Litre) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.miktar_litre}
                  onChange={(e) => setFormData({ ...formData, miktar_litre: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="Örn: 50"
                  required
                />
              </div>

              <div>
                <Label className="text-slate-300">Kilometre</Label>
                <Input
                  type="number"
                  value={formData.kilometre}
                  onChange={(e) => setFormData({ ...formData, kilometre: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="Araç kilometresi"
                />
              </div>

              <div>
                <Label className="text-slate-300">Personel / Şoför</Label>
                <select
                  value={formData.personel_id}
                  onChange={handlePersonelChange}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1"
                >
                  <option value="">Personel Seçin</option>
                  {personeller.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.ad} {p.soyad}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-slate-300">Şoför Adı (Manuel)</Label>
                <Input
                  type="text"
                  value={formData.sofor_adi}
                  onChange={(e) => setFormData({ ...formData, sofor_adi: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="Listede yoksa manuel girin"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-slate-300">Notlar</Label>
                <textarea
                  value={formData.notlar}
                  onChange={(e) => setFormData({ ...formData, notlar: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1 min-h-[80px]"
                  placeholder="Ek notlar..."
                />
              </div>
            </div>

            {formData.arac_id && (
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h4 className="text-blue-400 font-semibold mb-2">Seçili Araç</h4>
                <p className="text-white font-medium">{formData.arac_plaka}</p>
                <p className="text-slate-400 text-sm">{formData.arac_bilgi}</p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="border-slate-700 text-slate-300"
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Kaydediliyor...' : 'Kaydet ve Devam Et'}
              </Button>
            </div>
          </form>
        </>
      )}

      {selectedTesis && (
        <div className="mt-6 flex gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate('/motorin-liste')}
            className="border-slate-700 text-slate-400"
          >
            Tüm Kayıtları Görüntüle
          </Button>
        </div>
      )}

      {/* Kayıtlar Modal */}
      {recordsModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="records-modal">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-white">{recordsModal.upload?.dosya_adi}</h3>
                <p className="text-sm text-slate-400">{recordsModal.records.length} kayıt</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRecordsModal({ open: false, upload: null, records: [], loading: false })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {recordsModal.loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : recordsModal.records.length === 0 ? (
                <p className="text-slate-400 text-center py-8">Bu yüklemeye ait kayıt bulunamadı.</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-800/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase">Tarih</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase">Plaka</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase">Miktar (L)</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase">KM</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase">Şoför</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase">Notlar</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-slate-400 uppercase">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {recordsModal.records.map((rec) => (
                      <tr key={rec.id} className={rec._dirty ? 'bg-amber-500/5' : ''}>
                        <td className="px-3 py-2">
                          <Input
                            type="date"
                            value={rec.tarih || ''}
                            onChange={(e) => handleInlineUpdateRecord(rec.id, 'tarih', e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white text-sm h-8 w-36"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={rec.arac_plaka || ''}
                            onChange={(e) => handleInlineUpdateRecord(rec.id, 'arac_plaka', e.target.value.toUpperCase())}
                            className="bg-slate-800 border-slate-700 text-white text-sm h-8 w-28"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={rec.miktar_litre || 0}
                            onChange={(e) => handleInlineUpdateRecord(rec.id, 'miktar_litre', parseFloat(e.target.value) || 0)}
                            className="bg-slate-800 border-slate-700 text-white text-sm h-8 w-20"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={rec.kilometre || 0}
                            onChange={(e) => handleInlineUpdateRecord(rec.id, 'kilometre', parseFloat(e.target.value) || 0)}
                            className="bg-slate-800 border-slate-700 text-white text-sm h-8 w-24"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={rec.sofor_adi || ''}
                            onChange={(e) => handleInlineUpdateRecord(rec.id, 'sofor_adi', e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white text-sm h-8 w-32"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={rec.notlar || ''}
                            onChange={(e) => handleInlineUpdateRecord(rec.id, 'notlar', e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white text-sm h-8 w-36"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            {rec._dirty && (
                              <Button
                                size="sm"
                                onClick={() => handleSaveInlineRecord(rec)}
                                className="bg-green-600 hover:bg-green-700 h-8"
                                data-testid={`record-save-${rec.id}`}
                              >
                                <Save className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditModal(rec)}
                              className="border-slate-700 text-slate-300 h-8"
                              data-testid={`record-edit-${rec.id}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteRecord(rec)}
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8"
                              data-testid={`record-delete-${rec.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Düzenle Modal (Detaylı) */}
      {editRecordModal.open && editRecordModal.record && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4" data-testid="edit-record-modal">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Kayıt Düzenle</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditRecordModal({ open: false, record: null })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Tarih</Label>
                <Input
                  type="date"
                  value={editRecordModal.record.tarih || ''}
                  onChange={(e) => setEditRecordModal(prev => ({ ...prev, record: { ...prev.record, tarih: e.target.value } }))}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300">Araç Plaka</Label>
                <Input
                  value={editRecordModal.record.arac_plaka || ''}
                  onChange={(e) => setEditRecordModal(prev => ({ ...prev, record: { ...prev.record, arac_plaka: e.target.value.toUpperCase() } }))}
                  className="bg-slate-800 border-slate-700 text-white mt-1 uppercase"
                />
              </div>
              <div>
                <Label className="text-slate-300">Miktar (Litre)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editRecordModal.record.miktar_litre || ''}
                  onChange={(e) => setEditRecordModal(prev => ({ ...prev, record: { ...prev.record, miktar_litre: e.target.value } }))}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300">Kilometre</Label>
                <Input
                  type="number"
                  value={editRecordModal.record.kilometre || ''}
                  onChange={(e) => setEditRecordModal(prev => ({ ...prev, record: { ...prev.record, kilometre: e.target.value } }))}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300">Şoför Adı</Label>
                <Input
                  value={editRecordModal.record.sofor_adi || ''}
                  onChange={(e) => setEditRecordModal(prev => ({ ...prev, record: { ...prev.record, sofor_adi: e.target.value } }))}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300">Boşaltım Tesisi</Label>
                <Input
                  value={editRecordModal.record.bosaltim_tesisi || ''}
                  onChange={(e) => setEditRecordModal(prev => ({ ...prev, record: { ...prev.record, bosaltim_tesisi: e.target.value } }))}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-slate-300">Notlar</Label>
                <textarea
                  value={editRecordModal.record.notlar || ''}
                  onChange={(e) => setEditRecordModal(prev => ({ ...prev, record: { ...prev.record, notlar: e.target.value } }))}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1 min-h-[80px]"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-700">
              <Button
                variant="outline"
                onClick={() => setEditRecordModal({ open: false, record: null })}
                className="border-slate-700 text-slate-300"
              >
                İptal
              </Button>
              <Button
                onClick={handleSaveEditModal}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="edit-modal-save-btn"
              >
                <Save className="w-4 h-4 mr-2" />
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MotorinVerme;
