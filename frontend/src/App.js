import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, Trash2, Edit, Save, X, FileSpreadsheet } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Para formatı
const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "0,00";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Tarih formatı
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return dateStr;
};

const emptyRecord = {
  yukleme_tarihi: "",
  bosaltim_tarihi: "",
  irsaliye_no: "",
  fatura_no: "",
  vade_tarihi: "",
  giris_miktari: 0,
  kantar_kg_miktari: 0,
  birim_fiyat: 0,
  giris_kdv_orani: 20,
  nakliye_birim_fiyat: 0,
  nakliye_kdv_orani: 20,
  nakliye_tevkifat_orani: 0,
};

function App() {
  const [records, setRecords] = useState([]);
  const [ozet, setOzet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRecord, setNewRecord] = useState(emptyRecord);

  const fetchRecords = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/cimento-giris`);
      setRecords(response.data);
    } catch (e) {
      console.error(e);
      toast.error("Kayıtlar yüklenirken hata oluştu");
    }
  }, []);

  const fetchOzet = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/cimento-giris-ozet`);
      setOzet(response.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchRecords();
      await fetchOzet();
      setLoading(false);
    };
    loadData();
  }, [fetchRecords, fetchOzet]);

  const handleAddRecord = async () => {
    try {
      await axios.post(`${API}/cimento-giris`, newRecord);
      toast.success("Kayıt başarıyla eklendi");
      setNewRecord(emptyRecord);
      setIsAddDialogOpen(false);
      fetchRecords();
      fetchOzet();
    } catch (e) {
      console.error(e);
      toast.error("Kayıt eklenirken hata oluştu");
    }
  };

  const handleDeleteRecord = async (id) => {
    if (window.confirm("Bu kaydı silmek istediğinizden emin misiniz?")) {
      try {
        await axios.delete(`${API}/cimento-giris/${id}`);
        toast.success("Kayıt silindi");
        fetchRecords();
        fetchOzet();
      } catch (e) {
        console.error(e);
        toast.error("Kayıt silinirken hata oluştu");
      }
    }
  };

  const startEdit = (record) => {
    setEditingId(record.id);
    setEditData({
      yukleme_tarihi: record.yukleme_tarihi,
      bosaltim_tarihi: record.bosaltim_tarihi,
      irsaliye_no: record.irsaliye_no,
      fatura_no: record.fatura_no,
      vade_tarihi: record.vade_tarihi,
      giris_miktari: record.giris_miktari,
      kantar_kg_miktari: record.kantar_kg_miktari,
      birim_fiyat: record.birim_fiyat,
      giris_kdv_orani: record.giris_kdv_orani,
      nakliye_birim_fiyat: record.nakliye_birim_fiyat,
      nakliye_kdv_orani: record.nakliye_kdv_orani,
      nakliye_tevkifat_orani: record.nakliye_tevkifat_orani,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async (id) => {
    try {
      await axios.put(`${API}/cimento-giris/${id}`, editData);
      toast.success("Kayıt güncellendi");
      setEditingId(null);
      setEditData({});
      fetchRecords();
      fetchOzet();
    } catch (e) {
      console.error(e);
      toast.error("Kayıt güncellenirken hata oluştu");
    }
  };

  const columnHeaders = [
    { key: "yukleme_tarihi", label: "Yükleme Tarihi", type: "date", editable: true },
    { key: "bosaltim_tarihi", label: "Boşaltım Tarihi", type: "date", editable: true },
    { key: "irsaliye_no", label: "İrsaliye No", type: "text", editable: true },
    { key: "fatura_no", label: "Fatura No", type: "text", editable: true },
    { key: "vade_tarihi", label: "Vade Tarihi", type: "date", editable: true },
    { key: "giris_miktari", label: "Giriş Miktarı", type: "number", editable: true },
    { key: "kantar_kg_miktari", label: "Kantar KG", type: "number", editable: true },
    { key: "aradaki_fark", label: "Aradaki Fark", type: "calculated", editable: false },
    { key: "birim_fiyat", label: "Birim Fiyat", type: "currency", editable: true },
    { key: "giris_tutari", label: "Giriş Tutarı", type: "currency", editable: false },
    { key: "giris_kdv_orani", label: "Giriş KDV %", type: "number", editable: true },
    { key: "giris_kdv_tutari", label: "Giriş KDV Tutarı", type: "currency", editable: false },
    { key: "giris_kdv_dahil_toplam", label: "Giriş KDV Dahil", type: "currency", editable: false },
    { key: "nakliye_birim_fiyat", label: "Nakliye B.Fiyat", type: "currency", editable: true },
    { key: "nakliye_matrahi", label: "Nakliye Matrahı", type: "currency", editable: false },
    { key: "nakliye_kdv_orani", label: "Nakliye KDV %", type: "number", editable: true },
    { key: "nakliye_kdv_tutari", label: "Nakliye KDV Tutarı", type: "currency", editable: false },
    { key: "nakliye_t1", label: "Nakliye T1", type: "currency", editable: false },
    { key: "nakliye_t2", label: "Nakliye T2", type: "currency", editable: false },
    { key: "nakliye_tevkifat_orani", label: "Tevkifat %", type: "number", editable: true },
    { key: "nakliye_genel_toplam", label: "Nakliye G.Toplam", type: "currency", editable: false },
    { key: "urun_nakliye_matrah", label: "Ü-N Matrah", type: "currency", editable: false },
    { key: "urun_nakliye_kdv_toplam", label: "Ü-N KDV Toplam", type: "currency", editable: false },
    { key: "urun_nakliye_tevkifat_toplam", label: "Ü-N Tevkifat", type: "currency", editable: false },
    { key: "urun_nakliye_genel_toplam", label: "Ü-N Genel Toplam", type: "currency", editable: false },
  ];

  const renderCell = (record, column) => {
    const value = record[column.key];
    
    if (editingId === record.id && column.editable) {
      if (column.type === "date") {
        return (
          <Input
            type="date"
            value={editData[column.key] || ""}
            onChange={(e) =>
              setEditData({ ...editData, [column.key]: e.target.value })
            }
            className="w-32 h-8 text-xs"
          />
        );
      } else if (column.type === "number" || column.type === "currency") {
        return (
          <Input
            type="number"
            step="0.01"
            value={editData[column.key] || 0}
            onChange={(e) =>
              setEditData({ ...editData, [column.key]: parseFloat(e.target.value) || 0 })
            }
            className="w-24 h-8 text-xs"
          />
        );
      } else {
        return (
          <Input
            type="text"
            value={editData[column.key] || ""}
            onChange={(e) =>
              setEditData({ ...editData, [column.key]: e.target.value })
            }
            className="w-28 h-8 text-xs"
          />
        );
      }
    }

    if (column.type === "currency" || column.type === "calculated") {
      return <span className="font-mono text-right block">{formatCurrency(value)}</span>;
    }
    if (column.type === "date") {
      return formatDate(value);
    }
    if (column.type === "number") {
      return <span className="font-mono text-right block">{value}</span>;
    }
    return value;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Çimento Giriş Takip Sistemi</h1>
                <p className="text-blue-200 text-sm">Veri Giriş ve Takip Paneli</p>
              </div>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700" data-testid="add-record-btn">
                  <Plus className="w-4 h-4 mr-2" /> Yeni Kayıt Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Yeni Çimento Girişi Ekle</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Yükleme Tarihi</label>
                    <Input
                      type="date"
                      value={newRecord.yukleme_tarihi}
                      onChange={(e) => setNewRecord({ ...newRecord, yukleme_tarihi: e.target.value })}
                      data-testid="input-yukleme-tarihi"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Boşaltım Tarihi</label>
                    <Input
                      type="date"
                      value={newRecord.bosaltim_tarihi}
                      onChange={(e) => setNewRecord({ ...newRecord, bosaltim_tarihi: e.target.value })}
                      data-testid="input-bosaltim-tarihi"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Vade Tarihi</label>
                    <Input
                      type="date"
                      value={newRecord.vade_tarihi}
                      onChange={(e) => setNewRecord({ ...newRecord, vade_tarihi: e.target.value })}
                      data-testid="input-vade-tarihi"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">İrsaliye No</label>
                    <Input
                      type="text"
                      value={newRecord.irsaliye_no}
                      onChange={(e) => setNewRecord({ ...newRecord, irsaliye_no: e.target.value })}
                      data-testid="input-irsaliye-no"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Fatura No</label>
                    <Input
                      type="text"
                      value={newRecord.fatura_no}
                      onChange={(e) => setNewRecord({ ...newRecord, fatura_no: e.target.value })}
                      data-testid="input-fatura-no"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Giriş Miktarı (KG)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newRecord.giris_miktari}
                      onChange={(e) => setNewRecord({ ...newRecord, giris_miktari: parseFloat(e.target.value) || 0 })}
                      data-testid="input-giris-miktari"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Kantar KG Miktarı</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newRecord.kantar_kg_miktari}
                      onChange={(e) => setNewRecord({ ...newRecord, kantar_kg_miktari: parseFloat(e.target.value) || 0 })}
                      data-testid="input-kantar-kg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Birim Fiyat (₺)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newRecord.birim_fiyat}
                      onChange={(e) => setNewRecord({ ...newRecord, birim_fiyat: parseFloat(e.target.value) || 0 })}
                      data-testid="input-birim-fiyat"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Giriş KDV Oranı (%)</label>
                    <Input
                      type="number"
                      step="1"
                      value={newRecord.giris_kdv_orani}
                      onChange={(e) => setNewRecord({ ...newRecord, giris_kdv_orani: parseFloat(e.target.value) || 0 })}
                      data-testid="input-giris-kdv-orani"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nakliye Birim Fiyat (₺)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newRecord.nakliye_birim_fiyat}
                      onChange={(e) => setNewRecord({ ...newRecord, nakliye_birim_fiyat: parseFloat(e.target.value) || 0 })}
                      data-testid="input-nakliye-birim-fiyat"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nakliye KDV Oranı (%)</label>
                    <Input
                      type="number"
                      step="1"
                      value={newRecord.nakliye_kdv_orani}
                      onChange={(e) => setNewRecord({ ...newRecord, nakliye_kdv_orani: parseFloat(e.target.value) || 0 })}
                      data-testid="input-nakliye-kdv-orani"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nakliye Tevkifat Oranı (%)</label>
                    <Input
                      type="number"
                      step="1"
                      value={newRecord.nakliye_tevkifat_orani}
                      onChange={(e) => setNewRecord({ ...newRecord, nakliye_tevkifat_orani: parseFloat(e.target.value) || 0 })}
                      data-testid="input-nakliye-tevkifat-orani"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button onClick={handleAddRecord} className="bg-green-600 hover:bg-green-700" data-testid="save-new-record-btn">
                    <Save className="w-4 h-4 mr-2" /> Kaydet
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      {ozet && (
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Card className="bg-white shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500">Kayıt Sayısı</p>
                <p className="text-xl font-bold text-blue-700">{ozet.kayit_sayisi}</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500">Toplam Giriş</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(ozet.toplam_giris_miktari)} KG</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500">Toplam Fark</p>
                <p className="text-lg font-bold text-orange-600">{formatCurrency(ozet.toplam_fark)} KG</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500">Giriş Tutarı</p>
                <p className="text-lg font-bold text-blue-600">₺{formatCurrency(ozet.toplam_giris_tutari)}</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500">Nakliye Toplam</p>
                <p className="text-lg font-bold text-purple-600">₺{formatCurrency(ozet.toplam_nakliye_genel)}</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500">Toplam KDV</p>
                <p className="text-lg font-bold text-red-600">₺{formatCurrency(ozet.toplam_urun_nakliye_kdv)}</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500">Genel Toplam</p>
                <p className="text-lg font-bold text-emerald-700">₺{formatCurrency(ozet.toplam_urun_nakliye_genel)}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="container mx-auto px-4 py-4">
        <Card className="shadow-lg">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Çimento Giriş Kayıtları
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Henüz kayıt bulunmuyor. "Yeni Kayıt Ekle" butonuna tıklayarak başlayın.
              </div>
            ) : (
              <ScrollArea className="w-full">
                <div className="min-w-max">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead className="sticky left-0 bg-gray-100 z-10 w-20">İşlem</TableHead>
                        {columnHeaders.map((col) => (
                          <TableHead
                            key={col.key}
                            className={`text-xs font-semibold whitespace-nowrap px-2 ${
                              col.editable ? "bg-blue-50" : "bg-gray-50"
                            }`}
                          >
                            {col.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record, index) => (
                        <TableRow
                          key={record.id}
                          className={`${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          } hover:bg-blue-50 transition-colors`}
                        >
                          <TableCell className="sticky left-0 bg-inherit z-10">
                            <div className="flex gap-1">
                              {editingId === record.id ? (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                                    onClick={() => saveEdit(record.id)}
                                    data-testid={`save-edit-btn-${record.id}`}
                                  >
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                                    onClick={cancelEdit}
                                    data-testid={`cancel-edit-btn-${record.id}`}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                                    onClick={() => startEdit(record)}
                                    data-testid={`edit-btn-${record.id}`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100"
                                    onClick={() => handleDeleteRecord(record.id)}
                                    data-testid={`delete-btn-${record.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                          {columnHeaders.map((col) => (
                            <TableCell
                              key={col.key}
                              className={`text-xs px-2 py-1 whitespace-nowrap ${
                                col.editable ? "" : "bg-gray-50/50"
                              }`}
                            >
                              {renderCell(record, col)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-sm">
          <p>Çimento Giriş Takip Sistemi © 2025</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
