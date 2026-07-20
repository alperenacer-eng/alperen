import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Trash2, Edit, Plus, Settings2, RotateCcw, FileSpreadsheet, FileText, GripVertical, Filter, X, Calendar, Bookmark, Save } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';
const STORAGE_KEY = 'bims_kayit_visible_columns';
const ORDER_KEY = 'bims_kayit_column_order';
const PRESETS_KEY = 'bims_kayit_filter_presets';

// Sütun tanımları — id, başlık, varsayılan görünür
const COLUMNS = [
  { id: 'production_date', label: 'Tarih',          default: true,  width: 'w-24' },
  { id: 'department_name', label: 'İşletme',        default: true,  width: 'w-32' },
  { id: 'shift_type',      label: 'Vardiya',        default: true,  width: 'w-24' },
  { id: 'shift_number',    label: 'Vardiya No',     default: false, width: 'w-20' },
  { id: 'operator_name',   label: 'Operatör',       default: true,  width: 'w-32' },
  { id: 'worked_hours',    label: 'Çal. Saat',      default: false, width: 'w-20' },
  { id: 'required_hours',  label: 'Ger. Saat',      default: false, width: 'w-20' },
  { id: 'kayip_zaman',     label: 'Kayıp Zaman',    default: false, width: 'w-24', computed: true },
  { id: 'product_name',    label: 'Ürün',           default: true,  width: 'w-40' },
  { id: 'mold_no',         label: 'Kalıp No',       default: false, width: 'w-20' },
  { id: 'strip_used',      label: 'Şerit',          default: false, width: 'w-20' },
  { id: 'pallet_count',    label: 'Ür. Palet',      default: false, width: 'w-20' },
  { id: 'waste',           label: 'Fire',           default: false, width: 'w-16' },
  { id: 'net_palet',       label: 'Net Palet',      default: false, width: 'w-20', computed: true },
  { id: 'pieces_per_pallet', label: 'Palet Adet',   default: false, width: 'w-20' },
  { id: 'quantity',        label: 'Top. Üretim',    default: true,  width: 'w-24' },
  { id: 'mix_count',       label: 'Karma',          default: false, width: 'w-16' },
  { id: 'cement_in_mix',   label: 'Karm. Çimt.',    default: false, width: 'w-20' },
  { id: 'harcanan_cimento',label: 'Harc. Çimt.',    default: false, width: 'w-20', computed: true },
  { id: 'machine_cement',  label: 'Mak. Çimt.',     default: false, width: 'w-20' },
  { id: 'cimento_fark',    label: 'Çimt. Fark',     default: false, width: 'w-20', computed: true },
  { id: 'adet_basi_cimt',  label: 'Adet Başı Çimt.',default: false, width: 'w-24', computed: true },
  // Çıkan Paket 1
  { id: 'paket_1_urun',    label: 'Çıkan Paket 1 - Ürün',        default: false, width: 'w-40' },
  { id: 'paket_1_toplam',  label: 'Çıkan Paket 1 - Toplam Adet', default: false, width: 'w-28', computed: true },
  // Çıkan Paket 2
  { id: 'paket_2_urun',    label: 'Çıkan Paket 2 - Ürün',        default: false, width: 'w-40' },
  { id: 'paket_2_toplam',  label: 'Çıkan Paket 2 - Toplam Adet', default: false, width: 'w-28', computed: true },
  // Çıkan Paket 3
  { id: 'paket_3_urun',    label: 'Çıkan Paket 3 - Ürün',        default: false, width: 'w-40' },
  { id: 'paket_3_toplam',  label: 'Çıkan Paket 3 - Toplam Adet', default: false, width: 'w-28', computed: true },
  // Çıkan Paket 4
  { id: 'paket_4_urun',    label: 'Çıkan Paket 4 - Ürün',        default: false, width: 'w-40' },
  { id: 'paket_4_toplam',  label: 'Çıkan Paket 4 - Toplam Adet', default: false, width: 'w-28', computed: true },
  // Çıkan Paket 5
  { id: 'paket_5_urun',    label: 'Çıkan Paket 5 - Ürün',        default: false, width: 'w-40' },
  { id: 'paket_5_toplam',  label: 'Çıkan Paket 5 - Toplam Adet', default: false, width: 'w-28', computed: true },
  // Toplam paket
  { id: 'toplam_7_boy',    label: '7 Boy Top.',     default: false, width: 'w-20' },
  { id: 'toplam_5_boy',    label: '5 Boy Top.',     default: false, width: 'w-20' },
  { id: 'genel_toplam',    label: 'Genel Top.',     default: false, width: 'w-20', computed: true },
  // Arıza/Not/Kaydeden
  { id: 'breakdown_1',     label: 'Arıza 1',        default: false, width: 'w-32' },
  { id: 'breakdown_2',     label: 'Arıza 2',        default: false, width: 'w-32' },
  { id: 'breakdown_3',     label: 'Arıza 3',        default: false, width: 'w-32' },
  { id: 'notes',           label: 'Not',            default: false, width: 'w-40' },
  { id: 'user_name',       label: 'Kaydeden',       default: false, width: 'w-28' },
];

const defaultVisible = () => {
  const obj = {};
  COLUMNS.forEach(c => { obj[c.id] = c.default; });
  return obj;
};

const defaultOrder = () => COLUMNS.map(c => c.id);

const loadVisible = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultVisible();
    const parsed = JSON.parse(raw);
    const result = defaultVisible();
    COLUMNS.forEach(c => {
      if (typeof parsed[c.id] === 'boolean') result[c.id] = parsed[c.id];
    });
    return result;
  } catch {
    return defaultVisible();
  }
};

const loadOrder = () => {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (!raw) return defaultOrder();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultOrder();
    const valid = parsed.filter(id => COLUMNS.find(c => c.id === id));
    // Yeni eklenen sütunlar (henüz kaydedilmemiş) sona eklenir
    const missing = COLUMNS.filter(c => !valid.includes(c.id)).map(c => c.id);
    return [...valid, ...missing];
  } catch {
    return defaultOrder();
  }
};

const fmtShortDate = (val) => {
  if (!val) return '-';
  try {
    return format(new Date(val), 'dd.MM.yyyy');
  } catch {
    return String(val).substring(0, 10);
  }
};

const fmtNum = (val) => {
  if (val === null || val === undefined || val === '') return '-';
  const n = Number(val);
  if (isNaN(n)) return '-';
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(n);
};

const fmtHour = (val) => {
  if (val === null || val === undefined || val === '') return '-';
  const num = parseFloat(val);
  if (isNaN(num)) return '-';
  const h = Math.floor(num);
  const m = Math.round((num - h) * 60);
  return `${h}.${String(m).padStart(2, '0')}`;
};

// JSON string'i veya obje formundaki cikan_paket'i ayrıştır
const parsePaket = (record, n) => {
  const raw = record[`cikan_paket_${n}`];
  if (!raw) return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
};

const cellValue = (record, colId) => {
  // Çıkan paket sütunları (paket_N_xxx)
  const paketMatch = colId.match(/^paket_(\d)_(urun|7boy|5boy|7top|5top|toplam)$/);
  if (paketMatch) {
    const n = paketMatch[1];
    const part = paketMatch[2];
    const p = parsePaket(record, n);
    if (!p) return '-';
    if (part === 'urun') return p.urun_adi || '-';
    if (part === '7boy') return fmtNum(p.paket_7_boy);
    if (part === '5boy') return fmtNum(p.paket_5_boy);
    if (part === '7top') {
      const adet = parseInt(p.paket_7_boy) || 0;
      const birim = parseInt(p.birim_7_boy) || 0;
      return adet * birim ? fmtNum(adet * birim) : '-';
    }
    if (part === '5top') {
      const adet = parseInt(p.paket_5_boy) || 0;
      const birim = parseInt(p.birim_5_boy) || 0;
      return adet * birim ? fmtNum(adet * birim) : '-';
    }
    if (part === 'toplam') {
      const adet7 = parseInt(p.paket_7_boy) || 0;
      const birim7 = parseInt(p.birim_7_boy) || 0;
      const adet5 = parseInt(p.paket_5_boy) || 0;
      const birim5 = parseInt(p.birim_5_boy) || 0;
      const total = (adet7 * birim7) + (adet5 * birim5);
      return total ? fmtNum(total) : '-';
    }
  }

  // Hesaplanan sütunlar
  if (colId === 'net_palet') {
    const p = parseFloat(record.pallet_count) || 0;
    const w = parseFloat(record.waste) || 0;
    return fmtNum(p - w);
  }
  if (colId === 'harcanan_cimento') {
    const m = parseFloat(record.mix_count) || 0;
    const c = parseFloat(record.cement_in_mix) || 0;
    return fmtNum(m * c);
  }
  if (colId === 'cimento_fark') {
    const harcanan = (parseFloat(record.mix_count) || 0) * (parseFloat(record.cement_in_mix) || 0);
    const mk = parseFloat(record.machine_cement) || 0;
    return fmtNum(harcanan - mk);
  }
  if (colId === 'adet_basi_cimt') {
    const harcanan = (parseFloat(record.mix_count) || 0) * (parseFloat(record.cement_in_mix) || 0);
    const q = parseFloat(record.quantity) || 0;
    return q > 0 ? fmtNum(harcanan / q) : '-';
  }
  if (colId === 'kayip_zaman') {
    const req = parseFloat(record.required_hours) || 0;
    const wrk = parseFloat(record.worked_hours) || 0;
    return fmtHour(req - wrk);
  }
  if (colId === 'genel_toplam') {
    const t7 = parseFloat(record.toplam_7_boy) || 0;
    const t5 = parseFloat(record.toplam_5_boy) || 0;
    return fmtNum(t7 + t5);
  }

  const v = record[colId];
  switch (colId) {
    case 'production_date':
      return fmtShortDate(v || record.created_at);
    case 'shift_type':
      return v === 'gunduz' ? 'Gündüz' : v === 'gece' ? 'Gece' : (v || '-');
    case 'worked_hours':
    case 'required_hours':
      return fmtHour(v);
    case 'quantity':
    case 'pallet_count':
    case 'waste':
    case 'pieces_per_pallet':
    case 'mix_count':
    case 'cement_in_mix':
    case 'machine_cement':
    case 'toplam_7_boy':
    case 'toplam_5_boy':
      return fmtNum(v);
    default:
      return v || '-';
  }
};

const ProductionList = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [visibleCols, setVisibleCols] = useState(loadVisible);
  const [columnOrder, setColumnOrder] = useState(loadOrder);
  const [columnFilters, setColumnFilters] = useState({}); // { colId: 'arama' }
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [exportAllCols, setExportAllCols] = useState(false); // false: sadece görünür, true: tüm sütunlar
  const [presets, setPresets] = useState(() => {
    try {
      const raw = localStorage.getItem(PRESETS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [presetName, setPresetName] = useState('');
  const dragColId = useRef(null);
  const dragOverColId = useRef(null);
  const topScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);
  const tableRef = useRef(null);
  const [tableWidth, setTableWidth] = useState(0);
  const syncingFrom = useRef(null); // 'top' | 'bottom' | null

  // Tablo genişliği değiştikçe üst scrollbar'ın iç div genişliğini güncelle
  useEffect(() => {
    const updateWidth = () => {
      if (tableRef.current) {
        setTableWidth(tableRef.current.scrollWidth);
      }
    };
    updateWidth();
    // Görünür sütun listesi değişince yeniden hesapla
    const t = setTimeout(updateWidth, 50);
    window.addEventListener('resize', updateWidth);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updateWidth);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const handleTopScroll = () => {
    if (syncingFrom.current === 'bottom') return;
    syncingFrom.current = 'top';
    if (bottomScrollRef.current && topScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => { syncingFrom.current = null; });
  };

  const handleBottomScroll = () => {
    if (syncingFrom.current === 'top') return;
    syncingFrom.current = 'bottom';
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => { syncingFrom.current = null; });
  };

  useEffect(() => {
    if (!currentModule) {
      navigate('/');
      return;
    }
    if (currentModule.id !== 'bims') {
      navigate('/dashboard');
      return;
    }
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentModule]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
    } catch {
      // ignore
    }
  }, [visibleCols]);

  useEffect(() => {
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(columnOrder));
    } catch {
      // ignore
    }
  }, [columnOrder]);

  useEffect(() => {
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    } catch {
      // ignore
    }
  }, [presets]);

  const savePreset = () => {
    const name = (presetName || '').trim();
    if (!name) {
      toast.error('Önce filtre adı yazın');
      return;
    }
    const hasAnyFilter = dateStart || dateEnd || Object.values(columnFilters).some(v => v && String(v).trim() !== '') || searchQuery;
    if (!hasAnyFilter) {
      toast.error('Kaydedilecek aktif filtre yok');
      return;
    }
    setPresets(prev => {
      const filtered = prev.filter(p => p.name !== name);
      return [...filtered, { name, searchQuery, dateStart, dateEnd, columnFilters: { ...columnFilters } }];
    });
    setPresetName('');
    toast.success(`"${name}" filtresi kaydedildi`);
  };

  const loadPreset = (preset) => {
    setSearchQuery(preset.searchQuery || '');
    setDateStart(preset.dateStart || '');
    setDateEnd(preset.dateEnd || '');
    setColumnFilters(preset.columnFilters || {});
    toast.success(`"${preset.name}" yüklendi`);
  };

  const deletePreset = (name) => {
    setPresets(prev => prev.filter(p => p.name !== name));
    toast.success(`"${name}" silindi`);
  };

  const fetchRecords = async () => {
    try {
      const response = await axios.get(`${API_URL}/production?limit=500&module=${currentModule.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(response.data);
    } catch (error) {
      toast.error('Kayıtlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    const q = searchQuery ? searchQuery.toLowerCase() : '';
    const activeColFilters = Object.entries(columnFilters).filter(([, v]) => v && String(v).trim() !== '');

    return records.filter(r => {
      // Genel arama
      if (q) {
        const matchesSearch =
          (r.product_name || '').toLowerCase().includes(q) ||
          (r.user_name || '').toLowerCase().includes(q) ||
          (r.operator_name || '').toLowerCase().includes(q) ||
          (r.department_name || '').toLowerCase().includes(q) ||
          (r.mold_no || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Tarih aralığı filtresi
      if (dateStart || dateEnd) {
        const d = (r.production_date || r.created_at || '').substring(0, 10);
        if (!d) return false;
        if (dateStart && d < dateStart) return false;
        if (dateEnd && d > dateEnd) return false;
      }

      // Sütun bazlı filtreler
      for (const [colId, val] of activeColFilters) {
        const cell = String(cellValue(r, colId) ?? '').toLowerCase();
        if (!cell.includes(String(val).toLowerCase())) return false;
      }

      return true;
    });
  }, [records, searchQuery, dateStart, dateEnd, columnFilters]);

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/production/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kayıt silindi');
      fetchRecords();
    } catch (error) {
      toast.error('Kayıt silinemedi');
    } finally {
      setDeleteId(null);
    }
  };

  const toggleColumn = (colId) => {
    setVisibleCols(prev => ({ ...prev, [colId]: !prev[colId] }));
  };

  const resetColumns = () => {
    setVisibleCols(defaultVisible());
    setColumnOrder(defaultOrder());
    toast.success('Sütunlar varsayılana sıfırlandı');
  };

  const selectAll = () => {
    const all = {};
    COLUMNS.forEach(c => { all[c.id] = true; });
    setVisibleCols(all);
  };

  // Sürükle-bırak ile sütun sıralama (HTML5 native)
  const handleDragStart = (colId) => (e) => {
    dragColId.current = colId;
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', colId); } catch { /* ignore */ }
  };
  const handleDragOver = (colId) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverColId.current = colId;
  };
  const handleDrop = (targetColId) => (e) => {
    e.preventDefault();
    const sourceId = dragColId.current;
    dragColId.current = null;
    dragOverColId.current = null;
    if (!sourceId || sourceId === targetColId) return;
    setColumnOrder(prev => {
      const next = prev.filter(id => id !== sourceId);
      const targetIdx = next.indexOf(targetColId);
      if (targetIdx === -1) return prev;
      next.splice(targetIdx, 0, sourceId);
      return next;
    });
    toast.success('Sütun sırası güncellendi');
  };
  const handleDragEnd = () => {
    dragColId.current = null;
    dragOverColId.current = null;
  };

  // Sıralı + görünür sütun listesi
  const orderedColumns = useMemo(() => {
    return columnOrder
      .map(id => COLUMNS.find(c => c.id === id))
      .filter(Boolean);
  }, [columnOrder]);

  const visibleColList = orderedColumns.filter(c => visibleCols[c.id]);
  const visibleCount = visibleColList.length;

  // Dışa aktarmada kullanılacak sütun listesi (görünür sıralama korunur, gerekirse tüm sütunlar)
  const getExportCols = () => {
    if (exportAllCols) {
      return columnOrder
        .map(id => COLUMNS.find(c => c.id === id))
        .filter(Boolean);
    }
    return visibleColList;
  };

  // Excel'e aktar
  const exportToExcel = () => {
    if (filteredRecords.length === 0) {
      toast.error('Aktarılacak veri yok');
      return;
    }
    const cols = getExportCols();
    const headers = cols.map(c => c.label);
    const rows = filteredRecords.map(rec =>
      cols.map(c => {
        const val = cellValue(rec, c.id);
        return val === '-' ? '' : val;
      })
    );
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = cols.map(c => ({ wch: Math.max(c.label.length, 12) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bims Kayitlar');
    const fname = `bims_kayitlar_${exportAllCols ? 'tum_sutunlar_' : ''}${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    XLSX.writeFile(wb, fname);
    toast.success(`Excel indirildi (${cols.length} sütun, ${filteredRecords.length} kayıt)`);
  };

  // PDF'e aktar
  const exportToPDF = () => {
    if (filteredRecords.length === 0) {
      toast.error('Aktarılacak veri yok');
      return;
    }
    const cols = getExportCols();
    const orientation = cols.length > 8 ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
    doc.setFontSize(14);
    doc.text('Bims Üretim Kayıtları', 40, 30);
    doc.setFontSize(9);
    doc.text(`Tarih: ${format(new Date(), 'dd.MM.yyyy HH:mm')} • ${filteredRecords.length} kayıt • ${cols.length} sütun`, 40, 46);
    const headers = cols.map(c => c.label);
    const rows = filteredRecords.map(rec =>
      cols.map(c => {
        const val = cellValue(rec, c.id);
        return val === '-' ? '' : String(val);
      })
    );
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 60,
      styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 20, right: 20 }
    });
    const fname = `bims_kayitlar_${exportAllCols ? 'tum_sutunlar_' : ''}${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
    doc.save(fname);
    toast.success(`PDF indirildi (${cols.length} sütun, ${filteredRecords.length} kayıt)`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="production-list-page">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Üretim Kayıtları</h1>
            <p className="text-slate-400 text-sm">Tüm Bims üretim kayıtları — sütunları kişiselleştirebilirsiniz</p>
          </div>
          <Button
            onClick={() => navigate('/production-entry')}
            data-testid="add-record-button"
            className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 h-11"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Kayıt
          </Button>
        </div>

        {/* Ayarlanabilir Üst Panel */}
        <div className="glass-effect rounded-xl border border-slate-800 p-4 mb-4" data-testid="config-panel">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ürün, operatör, işletme veya kalıp ile ara..."
                data-testid="search-input"
                className="pl-9 h-10 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-500"
              />
            </div>

            {/* Tarih aralığı filtreleri */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                <Input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  data-testid="date-start-input"
                  title="Başlangıç tarihi"
                  className="pl-8 h-10 w-[150px] bg-slate-950/50 border-slate-800 text-white text-xs"
                />
              </div>
              <span className="text-slate-500 text-sm">→</span>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                <Input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  data-testid="date-end-input"
                  title="Bitiş tarihi"
                  className="pl-8 h-10 w-[150px] bg-slate-950/50 border-slate-800 text-white text-xs"
                />
              </div>
              {(dateStart || dateEnd || Object.values(columnFilters).some(v => v && String(v).trim() !== '')) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setDateStart(''); setDateEnd(''); setColumnFilters({}); }}
                  data-testid="clear-filters-btn"
                  title="Filtreleri temizle"
                  className="h-10 text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-400 px-2">
              <span className="font-mono text-orange-400">{filteredRecords.length}</span>
              <span>/ {records.length} kayıt</span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-cyan-400">{visibleCount}</span>
              <span>/ {COLUMNS.length} sütun</span>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 h-10"
                  data-testid="columns-config-btn"
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  Sütunlar
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-80 bg-slate-900 border-slate-700 text-white max-h-[70vh] overflow-y-auto"
                data-testid="columns-config-popover"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                    <span className="font-semibold text-sm">Görünür Sütunlar</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={selectAll}
                        className="h-7 text-xs text-cyan-400 hover:bg-slate-800"
                        data-testid="select-all-cols-btn"
                      >
                        Tümünü Aç
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={resetColumns}
                        className="h-7 text-xs text-slate-400 hover:bg-slate-800"
                        data-testid="reset-cols-btn"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Sıfırla
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 px-1 pb-1">💡 Tabloda sütun başlıklarını sürükleyerek sıralamayı değiştirebilirsiniz.</p>
                  <div className="grid grid-cols-1 gap-1">
                    {orderedColumns.map(col => (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 cursor-pointer text-sm"
                        data-testid={`col-toggle-${col.id}`}
                      >
                        <Checkbox
                          checked={!!visibleCols[col.id]}
                          onCheckedChange={() => toggleColumn(col.id)}
                          className="border-slate-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                        />
                        <span className="flex-1 text-slate-300">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              onClick={exportToExcel}
              className="border-green-500/40 text-green-400 hover:bg-green-500/10 h-10"
              data-testid="export-excel-btn"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>

            <Button
              variant="outline"
              onClick={exportToPDF}
              className="border-red-500/40 text-red-400 hover:bg-red-500/10 h-10"
              data-testid="export-pdf-btn"
            >
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>

          {/* İhracat & Kayıtlı Filtreler Satırı */}
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-800">
            <label
              className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none"
              data-testid="export-all-cols-toggle"
            >
              <Checkbox
                checked={exportAllCols}
                onCheckedChange={(v) => setExportAllCols(!!v)}
                className="border-slate-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
              />
              <span>Dışa aktarımda <span className="text-orange-400 font-semibold">tüm sütunlar</span> ({COLUMNS.length}) — filtreler korunur</span>
            </label>

            <div className="flex-1" />

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 h-9"
                  data-testid="presets-btn"
                >
                  <Bookmark className="w-4 h-4 mr-2" />
                  Kayıtlı Filtreler
                  {presets.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold">{presets.length}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-96 bg-slate-900 border-slate-700 text-white max-h-[70vh] overflow-y-auto"
                data-testid="presets-popover"
              >
                <div className="space-y-3">
                  <div className="border-b border-slate-700 pb-2">
                    <span className="font-semibold text-sm">Kayıtlı Filtreler</span>
                    <p className="text-xs text-slate-500 mt-1">Aktif filtre kombinasyonunu isimle kaydedip sonra tek tıkla yükleyin.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') savePreset(); }}
                      placeholder="Filtre adı (örn. Gece Vardiyası Ocak)"
                      data-testid="preset-name-input"
                      className="h-9 text-xs bg-slate-950/50 border-slate-800 text-white"
                    />
                    <Button
                      size="sm"
                      onClick={savePreset}
                      data-testid="save-preset-btn"
                      className="bg-orange-500 hover:bg-orange-600 text-white h-9 shrink-0"
                    >
                      <Save className="w-3.5 h-3.5 mr-1" />
                      Kaydet
                    </Button>
                  </div>

                  {presets.length === 0 ? (
                    <div className="text-center text-xs text-slate-500 py-4">Henüz kayıtlı filtre yok</div>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {presets.map(p => {
                        const active = Object.values(p.columnFilters || {}).filter(v => v && String(v).trim() !== '').length;
                        return (
                          <div
                            key={p.name}
                            className="flex items-center gap-2 px-2 py-2 rounded hover:bg-slate-800 group"
                            data-testid={`preset-row-${p.name}`}
                          >
                            <button
                              onClick={() => loadPreset(p)}
                              className="flex-1 text-left text-sm text-slate-200 hover:text-orange-400"
                              data-testid={`load-preset-${p.name}`}
                            >
                              <div className="font-medium">{p.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {p.dateStart || p.dateEnd ? `📅 ${p.dateStart || '...'} → ${p.dateEnd || '...'} ` : ''}
                                {p.searchQuery ? `🔍 "${p.searchQuery}" ` : ''}
                                {active > 0 ? `• ${active} sütun filtresi` : ''}
                              </div>
                            </button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deletePreset(p.name)}
                              data-testid={`delete-preset-${p.name}`}
                              className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Tablo */}
      <div className="hidden md:block glass-effect rounded-xl border border-slate-800 overflow-hidden">
        {/* ÜST SCROLLBAR — tablo ile senkron */}
        <div
          ref={topScrollRef}
          onScroll={handleTopScroll}
          className="overflow-x-auto overflow-y-hidden border-b border-slate-800 bg-slate-900/50"
          data-testid="top-scrollbar"
          style={{ height: 14 }}
        >
          <div style={{ width: tableWidth || '100%', height: 1 }} />
        </div>
        <div
          ref={bottomScrollRef}
          onScroll={handleBottomScroll}
          className="overflow-x-auto"
        >
          <table ref={tableRef} className="w-full text-sm" data-testid="records-table">
            <thead className="bg-slate-900/70 border-b border-slate-800 sticky top-0">
              <tr>
                {visibleColList.map(col => (
                  <th
                    key={col.id}
                    draggable
                    onDragStart={handleDragStart(col.id)}
                    onDragOver={handleDragOver(col.id)}
                    onDrop={handleDrop(col.id)}
                    onDragEnd={handleDragEnd}
                    title="Sürükleyerek taşıyın"
                    data-testid={`col-header-${col.id}`}
                    className={`px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap ${col.width} cursor-move select-none hover:bg-slate-800 transition-colors`}
                  >
                    <div className="flex items-center gap-1">
                      <GripVertical className="w-3 h-3 text-slate-600 group-hover:text-slate-400" />
                      {col.label}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap w-24">
                  İşlemler
                </th>
              </tr>
              {/* Sütun bazlı filtre satırı */}
              <tr className="bg-slate-900/40 border-t border-slate-800">
                {visibleColList.map(col => (
                  <th key={`filter-${col.id}`} className="px-2 py-1.5">
                    <Input
                      value={columnFilters[col.id] || ''}
                      onChange={(e) => setColumnFilters(prev => ({ ...prev, [col.id]: e.target.value }))}
                      placeholder="Filtre..."
                      data-testid={`col-filter-${col.id}`}
                      className="h-7 text-xs bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 font-normal normal-case tracking-normal"
                    />
                  </th>
                ))}
                <th className="px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record, index) => (
                  <tr
                    key={record.id}
                    data-testid={`record-row-${index}`}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    {visibleColList.map(col => (
                      <td
                        key={col.id}
                        className="px-3 py-2 text-slate-300 whitespace-nowrap font-mono text-xs"
                        title={String(record[col.id] ?? '')}
                      >
                        {cellValue(record, col.id)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/production-entry?edit=${record.id}`)}
                          data-testid={`edit-button-${index}`}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 h-7 w-7 p-0"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(record.id)}
                          data-testid={`delete-button-${index}`}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-7 w-7 p-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={visibleCount + 1} className="px-6 py-12 text-center text-slate-500" data-testid="no-records">
                    {searchQuery ? 'Arama sonuçları bulunamadı' : 'Henüz kayıt bulunmuyor'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Kart Görünümü */}
      <div className="md:hidden space-y-3">
        {filteredRecords.length > 0 ? (
          filteredRecords.map((record, index) => (
            <div
              key={record.id}
              data-testid={`mobile-record-${index}`}
              className="glass-effect rounded-xl p-4 border border-slate-800"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-base mb-0.5 truncate">{record.product_name || 'Ürün -'}</h3>
                  <p className="text-xs text-slate-500">{fmtShortDate(record.production_date || record.created_at)} • {record.department_name || '-'}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/production-entry?edit=${record.id}`)}
                    className="text-blue-400 h-8 w-8 p-0"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(record.id)}
                    className="text-red-400 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                {visibleColList.filter(c => !['product_name', 'production_date', 'department_name'].includes(c.id)).map(col => (
                  <div key={col.id} className="flex items-center justify-between">
                    <span className="text-slate-500">{col.label}:</span>
                    <span className="text-slate-300 font-mono ml-1 truncate">{cellValue(record, col.id)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="glass-effect rounded-xl p-12 border border-slate-800 text-center text-slate-500">
            {searchQuery ? 'Arama sonuçları bulunamadı' : 'Henüz kayıt bulunmuyor'}
          </div>
        )}
      </div>

      {/* Silme Onayı */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Bu kaydı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-testid="cancel-delete"
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            >
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              data-testid="confirm-delete"
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductionList;
