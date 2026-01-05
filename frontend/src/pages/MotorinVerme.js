import React, { useState, useEffect, useRef } from 'react';
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
  X, 
  ChevronRight, 
  Upload, 
  FileSpreadsheet,
  Edit3,
  Check,
  AlertCircle,
  Download,
  Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MotorinVerme = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
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
  const [uploadingExcel, setUploadingExcel] = useState(false);
  
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

  useEffect(() => {
    fetchTesisler();
    fetchAraclar();
    fetchPersoneller();
  }, []);

  const fetchTesisler = async () => {
    try {
      const res = await axios.get(`${API_URL}/bosaltim-tesisleri`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTesisler(res.data);
    } catch (error) {
      console.log('Tesisler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchAraclar = async () => {
    try {
      const res = await axios.get(`${API_URL}/araclar`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAraclar(res.data);
    } catch (error) {
      console.log('Araçlar yüklenemedi');
    }
  };

  const fetchPersoneller = async () => {
    try {
      const res = await axios.get(`${API_URL}/personel`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPersoneller(res.data);
    } catch (error) {
      console.log('Personeller yüklenemedi');
    }
  };

  const handleSelectTesis = (tesis) => {
    setSelectedTesis(tesis);
    setEntryMode(null);
    setExcelData([]);
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
    }
  };

  const handleBack = () => {
    if (entryMode) {
      setEntryMode(null);
      setExcelData([]);
    } else {
      setSelectedTesis(null);
    }
  };

  // Excel dosyası okuma
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        // İlk satır başlık, geri kalanı veri
        if (data.length < 2) {
          toast.error('Excel dosyası boş veya hatalı');
          return;
        }

        const headers = data[0];
        const rows = data.slice(1).filter(row => row.length > 0 && row[0]);
        
        // Verileri parse et
        const parsedData = rows.map((row, idx) => {
          // Tarih formatını düzelt
          let tarih = row[0];
          if (typeof tarih === 'number') {
            // Excel tarih numarasını dönüştür
            const date = XLSX.SSF.parse_date_code(tarih);
            tarih = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
          } else if (tarih) {
            // String tarihi ISO formatına çevir
            const parts = String(tarih).split(/[\/\-\.]/);
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                tarih = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
              } else {
                tarih = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
            }
          }

          return {
            id: idx,
            tarih: tarih || new Date().toISOString().split('T')[0],
            arac_plaka: String(row[1] || '').toUpperCase().trim(),
            miktar_litre: parseFloat(row[2]) || 0,
            kilometre: parseFloat(row[3]) || 0,
            sofor_adi: String(row[4] || '').trim(),
            notlar: String(row[5] || '').trim(),
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

        setExcelData(parsedData);
        toast.success(`${parsedData.length} kayıt yüklendi`);
      } catch (error) {
        console.error('Excel parse error:', error);
        toast.error('Excel dosyası okunamadı');
      }
    };
    reader.readAsBinaryString(file);
    
    // Input'u sıfırla
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Excel verisini düzenle
  const handleExcelDataChange = (idx, field, value) => {
    setExcelData(prev => prev.map((item, i) => {
      if (i === idx) {
        const updated = { ...item, [field]: value };
        // Yeniden validasyon
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

  // Excel satırını sil
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

      const res = await axios.post(`${API_URL}/motorin-verme/bulk`, { records }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`${res.data.created_count} kayıt başarıyla oluşturuldu`);
      
      if (res.data.errors && res.data.errors.length > 0) {
        toast.warning(`${res.data.errors.length} kayıtta hata oluştu`);
      }
      
      setExcelData([]);
      setEntryMode(null);
    } catch (error) {
      toast.error('Kayıtlar oluşturulamadı');
    } finally {
      setUploadingExcel(false);
    }
  };

  // Örnek Excel indir
  const handleDownloadTemplate = () => {
    const template = [
      ['Tarih', 'Araç Plaka', 'Miktar (Litre)', 'Kilometre', 'Şoför Adı', 'Notlar'],
      ['2025-07-15', '34 ABC 123', 50, 125000, 'Ahmet Yılmaz', 'Not 1'],
      ['2025-07-15', '34 DEF 456', 75, 98000, 'Mehmet Demir', ''],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Motorin Verme');
    XLSX.writeFile(wb, 'motorin_verme_sablonu.xlsx');
    toast.success('Şablon indirildi');
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

      await axios.post(`${API_URL}/motorin-verme`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`${selectedTesis.name} tesisinden motorin verildi`);
      
      // Formu sıfırla
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

  return (
    <div className="animate-fade-in" data-testid="motorin-verme-page">
      <div className="mb-6">
        <button
          onClick={() => selectedTesis ? handleBack() : navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-4"
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
                ? 'Excel\'den toplu veri yükleyin' 
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
                  Kaynaklar'dan Tesis Ekle
                </Button>
              </div>
            )}
          </div>
        </>
      ) : !entryMode ? (
        // Mod Seçimi (Manuel veya Excel)
        <>
          {/* Seçili Tesis Başlığı */}
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
            {/* Manuel Giriş */}
            <button
              onClick={() => handleSelectMode('manual')}
              className="group glass-effect rounded-xl border border-slate-800 hover:border-blue-500/50 p-8 text-left transition-all hover:-translate-y-1"
            >
              <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-500/30">
                <Edit3 className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400">Manuel Giriş</h3>
              <p className="text-slate-400">Tek tek veri girişi yapın. Her araç için ayrı ayrı kayıt oluşturun.</p>
            </button>

            {/* Excel'den Yükle */}
            <button
              onClick={() => handleSelectMode('excel')}
              className="group glass-effect rounded-xl border border-slate-800 hover:border-green-500/50 p-8 text-left transition-all hover:-translate-y-1"
            >
              <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-green-500/30">
                <FileSpreadsheet className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-green-400">Excel'den Yükle</h3>
              <p className="text-slate-400">Excel dosyasından toplu veri aktarın. Hızlı ve pratik giriş yapın.</p>
            </button>
          </div>
        </>
      ) : entryMode === 'excel' ? (
        // Excel Yükleme
        <>
          {/* Seçili Tesis Başlığı */}
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

          {/* Excel Yükleme Alanı */}
          {excelData.length === 0 ? (
            <div className="glass-effect rounded-xl border border-slate-800 p-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Upload className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Excel Dosyası Yükleyin</h3>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                  Tarih, Araç Plaka, Miktar (Litre), Kilometre, Şoför Adı, Notlar sütunlarını içeren Excel dosyası yükleyin.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Excel Dosyası Seç
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadTemplate}
                    className="border-slate-700 text-slate-300"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Örnek Şablon İndir
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Excel Önizleme ve Düzenleme
            <div className="space-y-4">
              {/* Özet */}
              <div className="glass-effect rounded-xl border border-slate-800 p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-green-400" />
                    <span className="text-white font-medium">{excelData.length} satır yüklendi</span>
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
                    onClick={() => fileInputRef.current?.click()}
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
                    ref={fileInputRef}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Tablo */}
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

              {/* Kaydet Butonu */}
              <div className="flex gap-4 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setExcelData([])}
                  className="border-slate-700 text-slate-300"
                >
                  Temizle
                </Button>
                <Button
                  onClick={handleSaveExcelData}
                  disabled={uploadingExcel || validCount === 0}
                  className="bg-green-600 hover:bg-green-700"
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
          {/* Seçili Tesis Başlığı */}
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

          {/* Manuel Form */}
          <form onSubmit={handleManualSubmit} className="glass-effect rounded-xl border border-slate-800 p-6">
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

      {/* Alt Butonlar */}
      {selectedTesis && (
        <div className="mt-6 flex gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate('/motorin-liste')}
            className="border-slate-700 text-slate-400"
          >
            Kayıtları Görüntüle
          </Button>
        </div>
      )}
    </div>
  );
};

export default MotorinVerme;
