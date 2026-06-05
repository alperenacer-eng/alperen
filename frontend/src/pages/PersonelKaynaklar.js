import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTable } from '@/components/SortableTable';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Plus, Edit, Trash2, Building2, Search, Save } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const PersonelKaynaklar = () => {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [departmanlar, setDepartmanlar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', aciklama: '' });

  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchDepartmanlar();
  }, []);

  const fetchDepartmanlar = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/personel-departmanlar`, { headers });
      setDepartmanlar(res.data);
    } catch (e) {
      toast.error('Departmanlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', aciklama: '' });
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (d) => {
    setEditingId(d.id);
    setForm({ name: d.name || '', aciklama: d.aciklama || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Departman adı zorunludur');
      return;
    }
    try {
      if (editingId) {
        await axios.put(`${API_URL}/personel-departmanlar/${editingId}`, form, { headers });
        toast.success('Departman güncellendi');
      } else {
        await axios.post(`${API_URL}/personel-departmanlar`, form, { headers });
        toast.success('Departman eklendi');
      }
      setShowModal(false);
      resetForm();
      fetchDepartmanlar();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Kayıt sırasında hata oluştu');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`${API_URL}/personel-departmanlar/${deleteId}`, { headers });
      toast.success('Departman silindi');
      setDeleteId(null);
      fetchDepartmanlar();
    } catch (e) {
      toast.error('Silme işlemi başarısız');
    }
  };

  const filtered = departmanlar.filter(
    (d) =>
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.aciklama?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Personel Kaynakları</h1>
          <p className="text-slate-400 mt-1">Departman tanımlarını buradan yönetin</p>
        </div>
      </div>

      <Card className="glass-effect border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              Departmanlar ({filtered.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Departman ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-slate-900 border-slate-700 text-white w-64"
                />
              </div>
              <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Departman
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center text-slate-400 py-8">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-slate-500 py-12">
              <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Henüz departman eklenmedi.</p>
              <p className="text-sm mt-1">"Yeni Departman" butonuyla ekleyebilirsiniz.</p>
            </div>
          ) : (
            <SortableTable
              storageKey="personel-kaynaklar-departman-cols"
              data={filtered}
              rowKey={(d) => d.id}
              rowClassName={() => 'border-slate-800 hover:bg-slate-800/30'}
              headerRowClassName="border-slate-800 hover:bg-slate-800/30"
              emptyText="Departman bulunamadı"
              columns={[
                { key: 'ad', label: 'Departman Adı', headCls: 'text-slate-300',
                  renderCell: (d) => <TableCell key="ad" className="text-white font-medium">{d.name}</TableCell> },
                { key: 'aciklama', label: 'Açıklama', headCls: 'text-slate-300',
                  renderCell: (d) => <TableCell key="aciklama" className="text-slate-300">{d.aciklama || '-'}</TableCell> },
                { key: 'islem', label: 'İşlemler', headCls: 'text-slate-300 text-right',
                  renderCell: (d) => (
                    <TableCell key="islem" className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(d)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteId(d.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  ) },
              ]}
            />
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={(o) => { if (!o) { setShowModal(false); resetForm(); } }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Departman Düzenle' : 'Yeni Departman Ekle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="dep-name">Departman Adı *</Label>
              <Input
                id="dep-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Örn. Üretim, Muhasebe, Lojistik..."
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dep-aciklama">Açıklama</Label>
              <Textarea
                id="dep-aciklama"
                value={form.aciklama}
                onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                placeholder="Departman hakkında not (opsiyonel)"
                className="bg-slate-800 border-slate-700 text-white mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-300">
              İptal
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {editingId ? 'Güncelle' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Departmanı silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Bu işlem geri alınamaz. Departman silinecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              İptal
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PersonelKaynaklar;
