import React, { useState, useEffect } from 'react';
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
import { Search, Trash2, Edit, Plus, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const ProductionList = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);

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
  }, [currentModule]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = records.filter(record =>
        record.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.user_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRecords(filtered);
    } else {
      setFilteredRecords(records);
    }
  }, [searchQuery, records]);

  const fetchRecords = async () => {
    try {
      const response = await axios.get(`${API_URL}/production?limit=100&module=${currentModule.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(response.data);
      setFilteredRecords(response.data);
    } catch (error) {
      toast.error('Kayıtlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="production-list-page">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Üretim Kayıtları</h1>
            <p className="text-slate-400">Tüm üretim kayıtlarını görüntüleyin ve yönetin</p>
          </div>
          <Button
            onClick={() => navigate('/production-entry')}
            data-testid="add-record-button"
            className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 h-12 px-6"
          >
            <Plus className="w-5 h-5 mr-2" />
            Yeni Kayıt
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ürün adı veya çalışan adı ile ara..."
            data-testid="search-input"
            className="pl-12 h-12 bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block glass-effect rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="records-table">
            <thead className="bg-slate-900/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Ürün
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Miktar
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  İşletme
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Operatör
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Vardiya
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
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
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{record.product_name}</div>
                      {record.notes && (
                        <div className="text-sm text-slate-500 mt-1">{record.notes}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-orange-400 font-semibold">
                        {record.quantity} {record.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {record.department_name || <span className="text-slate-600">-</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {record.operator_name || <span className="text-slate-600">-</span>}
                    </td>
                    <td className="px-6 py-4">
                      {record.shift ? (
                        <span className="px-3 py-1 bg-blue-400/10 text-blue-400 rounded-full text-sm font-medium capitalize">
                          {record.shift}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(record.created_at), 'dd MMM yyyy, HH:mm', { locale: tr })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/production-entry?edit=${record.id}`)}
                          data-testid={`edit-button-${index}`}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(record.id)}
                          data-testid={`delete-button-${index}`}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500" data-testid="no-records">
                    {searchQuery ? 'Arama sonuçları bulunamadı' : 'Henüz kayıt bulunmuyor'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {filteredRecords.length > 0 ? (
          filteredRecords.map((record, index) => (
            <div
              key={record.id}
              data-testid={`mobile-record-${index}`}
              className="glass-effect rounded-xl p-5 border border-slate-800"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-lg mb-1">{record.product_name}</h3>
                  <p className="text-sm text-slate-400">{record.user_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/production-entry?edit=${record.id}`)}
                    data-testid={`mobile-edit-${index}`}
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                  >
                    <Edit className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(record.id)}
                    data-testid={`mobile-delete-${index}`}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Miktar:</span>
                  <span className="font-mono text-orange-400 font-semibold">
                    {record.quantity} {record.unit}
                  </span>
                </div>
                {record.department_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">İşletme:</span>
                    <span className="text-sm text-slate-300">{record.department_name}</span>
                  </div>
                )}
                {record.operator_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Operatör:</span>
                    <span className="text-sm text-slate-300">{record.operator_name}</span>
                  </div>
                )}
                {record.shift && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Vardiya:</span>
                    <span className="px-3 py-1 bg-blue-400/10 text-blue-400 rounded-full text-sm font-medium capitalize">
                      {record.shift}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Tarih:</span>
                  <span className="text-sm text-slate-400">
                    {format(new Date(record.created_at), 'dd MMM yyyy, HH:mm', { locale: tr })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Kaydeden:</span>
                  <span className="text-sm text-slate-400">{record.user_name}</span>
                </div>
                {record.notes && (
                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-sm text-slate-500">Not: {record.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="glass-effect rounded-xl p-12 border border-slate-800 text-center text-slate-500" data-testid="mobile-no-records">
            {searchQuery ? 'Arama sonuçları bulunamadı' : 'Henüz kayıt bulunmuyor'}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
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