import React, { useState, useEffect, useMemo } from 'react';
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
import { Search, Trash2, Edit, Plus, Settings2, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';
const STORAGE_KEY = 'bims_kayit_visible_columns';

// Sütun tanımları — id, başlık, varsayılan görünür
const COLUMNS = [
  { id: 'production_date', label: 'Tarih',          default: true,  width: 'w-24' },
  { id: 'department_name', label: 'İşletme',        default: true,  width: 'w-32' },
  { id: 'shift_type',      label: 'Vardiya',        default: true,  width: 'w-24' },
  { id: 'shift_number',    label: 'Vardiya No',     default: false, width: 'w-20' },
  { id: 'operator_name',   label: 'Operatör',       default: true,  width: 'w-32' },
  { id: 'worked_hours',    label: 'Çal. Saat',      default: false, width: 'w-20' },
  { id: 'required_hours',  label: 'Ger. Saat',      default: false, width: 'w-20' },
  { id: 'product_name',    label: 'Ürün',           default: true,  width: 'w-40' },
  { id: 'mold_no',         label: 'Kalıp No',       default: false, width: 'w-20' },
  { id: 'strip_used',      label: 'Şerit',          default: false, width: 'w-20' },
  { id: 'pallet_count',    label: 'Ür. Palet',      default: false, width: 'w-20' },
  { id: 'waste',           label: 'Fire',           default: false, width: 'w-16' },
  { id: 'pieces_per_pallet', label: 'Palet Adet',   default: false, width: 'w-20' },
  { id: 'quantity',        label: 'Top. Üretim',    default: true,  width: 'w-24' },
  { id: 'mix_count',       label: 'Karma',          default: false, width: 'w-16' },
  { id: 'cement_in_mix',   label: 'Karm. Çimt.',    default: false, width: 'w-20' },
  { id: 'machine_cement',  label: 'Mak. Çimt.',     default: false, width: 'w-20' },
  { id: 'toplam_7_boy',    label: '7 Boy Top.',     default: false, width: 'w-20' },
  { id: 'toplam_5_boy',    label: '5 Boy Top.',     default: false, width: 'w-20' },
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

const loadVisible = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultVisible();
    const parsed = JSON.parse(raw);
    const result = defaultVisible();
    // Kayıtlı tercihleri uygula (yeni sütunlar varsayılan değerini korur)
    COLUMNS.forEach(c => {
      if (typeof parsed[c.id] === 'boolean') result[c.id] = parsed[c.id];
    });
    return result;
  } catch {
    return defaultVisible();
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

const cellValue = (record, colId) => {
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
    if (!searchQuery) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(r =>
      (r.product_name || '').toLowerCase().includes(q) ||
      (r.user_name || '').toLowerCase().includes(q) ||
      (r.operator_name || '').toLowerCase().includes(q) ||
      (r.department_name || '').toLowerCase().includes(q) ||
      (r.mold_no || '').toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

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
    toast.success('Sütunlar varsayılana sıfırlandı');
  };

  const selectAll = () => {
    const all = {};
    COLUMNS.forEach(c => { all[c.id] = true; });
    setVisibleCols(all);
  };

  const visibleColList = COLUMNS.filter(c => visibleCols[c.id]);
  const visibleCount = visibleColList.length;

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
                  <div className="grid grid-cols-1 gap-1">
                    {COLUMNS.map(col => (
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
          </div>
        </div>
      </div>

      {/* Tablo */}
      <div className="hidden md:block glass-effect rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="records-table">
            <thead className="bg-slate-900/70 border-b border-slate-800 sticky top-0">
              <tr>
                {visibleColList.map(col => (
                  <th
                    key={col.id}
                    className={`px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap ${col.width}`}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap w-24">
                  İşlemler
                </th>
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
