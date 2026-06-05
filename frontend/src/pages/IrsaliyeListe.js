import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Edit,
  X,
  Save,
  Upload,
  Download,
  Filter,
  FileSpreadsheet,
  FileType,
  File as FileIcon,
  Eye,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const ALLOWED_EXTENSIONS = ['pdf', 'xlsx', 'xls', 'jpg', 'jpeg', 'png'];

const emptyForm = {
  irsaliye_no: '',
  tarih: new Date().toISOString().slice(0, 10),
  firma_adi: '',
  tur: 'gelen',
  tutar: '',
  aciklama: '',
  dosya_adi: '',
  dosya_url: '',
  dosya_tipi: '',
};

const IrsaliyeListe = () => {
  const { token } = useAuth();
  const fileInputRef = useRef(null);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTur, setFilterTur] = useState('');
  const [dateFilter, setDateFilter] = useState({ baslangic: '', bitis: '' });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTur, dateFilter]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterTur) params.tur = filterTur;
      if (dateFilter.baslangic) params.tarih_baslangic = dateFilter.baslangic;
      if (dateFilter.bitis) params.tarih_bitis = dateFilter.bitis;
      if (searchTerm) params.search = searchTerm;

      const res = await axios.get(`${API_URL}/irsaliyeler`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setList(res.data || []);
    } catch (err) {
      toast.error('İrsaliyeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchList();
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setForm({
      irsaliye_no: item.irsaliye_no || '',
      tarih: item.tarih || '',
      firma_adi: item.firma_adi || '',
      tur: item.tur || 'gelen',
      tutar: item.tutar || '',
      aciklama: item.aciklama || '',
      dosya_adi: item.dosya_adi || '',
      dosya_url: item.dosya_url || '',
      dosya_tipi: item.dosya_tipi || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`Geçersiz dosya türü. İzin verilenler: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API_URL}/upload-file`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setForm((prev) => ({
        ...prev,
        dosya_adi: res.data.original_name || file.name,
        dosya_url: res.data.path,
        dosya_tipi: ext,
      }));
      toast.success('Dosya yüklendi');
    } catch (err) {
      toast.error('Dosya yüklenemedi');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.irsaliye_no || !form.tarih) {
      toast.error('İrsaliye No ve Tarih zorunludur');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        tutar: parseFloat(form.tutar) || 0,
      };
      if (editingId) {
        await axios.put(`${API_URL}/irsaliyeler/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('İrsaliye güncellendi');
      } else {
        await axios.post(`${API_URL}/irsaliyeler`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('İrsaliye eklendi');
      }
      closeModal();
      fetchList();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu irsaliyeyi silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/irsaliyeler/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('İrsaliye silindi');
      fetchList();
    } catch (err) {
      toast.error('Silinemedi');
    }
  };

  const downloadFile = (item) => {
    if (!item.dosya_url) {
      toast.error('Bu irsaliyede dosya yok');
      return;
    }
    const url = process.env.REACT_APP_BACKEND_URL + item.dosya_url;
    window.open(url, '_blank');
  };

  const formatTL = (n) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(n || 0);

  const fileIcon = (ext) => {
    if (!ext) return <FileIcon className="w-4 h-4" />;
    if (ext === 'pdf') return <FileType className="w-4 h-4 text-red-500" />;
    if (['xlsx', 'xls'].includes(ext))
      return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
    if (['jpg', 'jpeg', 'png'].includes(ext))
      return <FileIcon className="w-4 h-4 text-blue-500" />;
    return <FileIcon className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="space-y-6" data-testid="irsaliye-liste-page">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-rose-500" />
            İrsaliye Listesi
          </h1>
          <p className="text-gray-500 mt-1">
            İrsaliye dosyalarınızı (PDF / Excel / Resim) yükleyin ve yönetin
          </p>
        </div>
        <button
          onClick={openCreateModal}
          data-testid="yeni-irsaliye-button"
          className="flex items-center gap-2 px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Yeni İrsaliye
        </button>
      </div>

      {/* Filtreler */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <Label className="text-xs text-gray-500 mb-1 block">Arama</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="İrsaliye no, firma, açıklama..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Tür</Label>
            <select
              value={filterTur}
              onChange={(e) => setFilterTur(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm bg-white"
              data-testid="filter-tur"
            >
              <option value="">Tümü</option>
              <option value="gelen">Gelen</option>
              <option value="giden">Giden</option>
            </select>
          </div>
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Başlangıç</Label>
            <Input
              type="date"
              value={dateFilter.baslangic}
              onChange={(e) =>
                setDateFilter({ ...dateFilter, baslangic: e.target.value })
              }
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Bitiş</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateFilter.bitis}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, bitis: e.target.value })
                }
              />
              <Button
                type="submit"
                className="bg-gray-800 hover:bg-gray-900 text-white"
                title="Filtrele/Ara"
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Yükleniyor...</div>
        ) : list.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>İrsaliye bulunamadı</p>
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              İlk İrsaliyeyi Ekle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">İrsaliye No</th>
                  <th className="px-4 py-3 text-left font-semibold">Tarih</th>
                  <th className="px-4 py-3 text-left font-semibold">Firma</th>
                  <th className="px-4 py-3 text-left font-semibold">Tür</th>
                  <th className="px-4 py-3 text-right font-semibold">Tutar</th>
                  <th className="px-4 py-3 text-left font-semibold">Dosya</th>
                  <th className="px-4 py-3 text-center font-semibold">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.irsaliye_no}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.tarih}</td>
                    <td className="px-4 py-3 text-gray-600">{item.firma_adi || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.tur === 'gelen'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {item.tur === 'gelen' ? 'Gelen' : 'Giden'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatTL(item.tutar)}
                    </td>
                    <td className="px-4 py-3">
                      {item.dosya_url ? (
                        <button
                          onClick={() => downloadFile(item)}
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                          title="Dosyayı görüntüle/indir"
                        >
                          {fileIcon(item.dosya_tipi)}
                          <span className="text-xs truncate max-w-[150px]">
                            {item.dosya_adi || 'Dosya'}
                          </span>
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Dosya yok</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {item.dosya_url && (
                          <button
                            onClick={() => downloadFile(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Görüntüle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="Düzenle"
                          data-testid={`edit-${item.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Sil"
                          data-testid={`delete-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'İrsaliyeyi Düzenle' : 'Yeni İrsaliye Ekle'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="irsaliye_no">
                    İrsaliye No <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="irsaliye_no"
                    type="text"
                    placeholder="IRS-2025-0001"
                    value={form.irsaliye_no}
                    onChange={(e) =>
                      setForm({ ...form, irsaliye_no: e.target.value })
                    }
                    data-testid="input-irsaliye-no"
                  />
                </div>
                <div>
                  <Label htmlFor="tarih">
                    Tarih <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="tarih"
                    type="date"
                    value={form.tarih}
                    onChange={(e) => setForm({ ...form, tarih: e.target.value })}
                    data-testid="input-tarih"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firma_adi">Firma / Müşteri / Tedarikçi</Label>
                  <Input
                    id="firma_adi"
                    type="text"
                    placeholder="Firma adı"
                    value={form.firma_adi}
                    onChange={(e) =>
                      setForm({ ...form, firma_adi: e.target.value })
                    }
                    data-testid="input-firma"
                  />
                </div>
                <div>
                  <Label htmlFor="tur">Tür</Label>
                  <select
                    id="tur"
                    value={form.tur}
                    onChange={(e) => setForm({ ...form, tur: e.target.value })}
                    className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm bg-white"
                    data-testid="input-tur"
                  >
                    <option value="gelen">Gelen (Alış)</option>
                    <option value="giden">Giden (Satış)</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="tutar">Tutar (₺)</Label>
                <Input
                  id="tutar"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.tutar}
                  onChange={(e) => setForm({ ...form, tutar: e.target.value })}
                  data-testid="input-tutar"
                />
              </div>

              <div>
                <Label htmlFor="aciklama">Açıklama</Label>
                <textarea
                  id="aciklama"
                  rows={3}
                  placeholder="Notlar..."
                  value={form.aciklama}
                  onChange={(e) =>
                    setForm({ ...form, aciklama: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                  data-testid="input-aciklama"
                />
              </div>

              {/* Dosya yükleme */}
              <div>
                <Label>Dosya (PDF / Excel / Resim)</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4">
                  {form.dosya_url ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {fileIcon(form.dosya_tipi)}
                        <div>
                          <p className="font-medium text-sm text-gray-900">
                            {form.dosya_adi}
                          </p>
                          <p className="text-xs text-gray-500 uppercase">
                            {form.dosya_tipi}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const url =
                              process.env.REACT_APP_BACKEND_URL + form.dosya_url;
                            window.open(url, '_blank');
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Görüntüle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              dosya_adi: '',
                              dosya_url: '',
                              dosya_tipi: '',
                            })
                          }
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Kaldır"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 mb-3">
                        PDF, Excel (.xlsx, .xls) veya resim (JPG/PNG) yükleyin
                      </p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
                        className="hidden"
                        data-testid="file-input"
                      />
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="bg-rose-500 hover:bg-rose-600 text-white"
                      >
                        {uploading ? (
                          'Yükleniyor...'
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Dosya Seç
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <Button
                onClick={closeModal}
                variant="outline"
                disabled={saving}
                data-testid="cancel-button"
              >
                İptal
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-rose-500 hover:bg-rose-600 text-white"
                data-testid="save-button"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IrsaliyeListe;
