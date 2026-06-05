import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Trash2, Search, Edit } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const CimentoList = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    if (!currentModule || currentModule.id !== 'cimento') {
      navigate('/');
      return;
    }
    fetchRecords();
  }, [currentModule]);

  const fetchRecords = async () => {
    try {
      const response = await axios.get(`${API_URL}/cimento-records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(response.data);
    } catch (error) {
      toast.error('Kayıtlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/cimento-records/${deleteId}`, {
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

  const filteredRecords = records.filter(record =>
    record.cimento_firma_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.nakliyeci_firma_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.plaka?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.sofor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Çimento Kayıtları</h1>
            <p className="text-slate-400">Tüm çimento kayıtlarını görüntüleyin</p>
          </div>
          <Button
            onClick={() => navigate('/cimento-entry')}
            className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 h-12 px-6"
          >
            <Plus className="w-5 h-5 mr-2" />
            Yeni Kayıt
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Ara... (firma, plaka, şoför)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 bg-slate-900 border-slate-800 text-white"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block glass-effect rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="text-left py-4 px-6 text-slate-400 font-medium">Tarih</th>
              <th className="text-left py-4 px-6 text-slate-400 font-medium">Çimento Firma</th>
              <th className="text-left py-4 px-6 text-slate-400 font-medium">Nakliyeci</th>
              <th className="text-left py-4 px-6 text-slate-400 font-medium">Plaka</th>
              <th className="text-left py-4 px-6 text-slate-400 font-medium">Şoför</th>
              <th className="text-right py-4 px-6 text-slate-400 font-medium">Miktar</th>
              <th className="text-right py-4 px-6 text-slate-400 font-medium">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record) => (
                <tr key={record.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                  <td className="py-4 px-6 text-white">
                    {record.tarih ? format(new Date(record.tarih), 'dd MMM yyyy', { locale: tr }) : '-'}
                  </td>
                  <td className="py-4 px-6 text-white font-medium">{record.cimento_firma_name || '-'}</td>
                  <td className="py-4 px-6 text-slate-300">{record.nakliyeci_firma_name || '-'}</td>
                  <td className="py-4 px-6">
                    <span className="font-mono bg-slate-800 px-2 py-1 rounded text-white">{record.plaka || '-'}</span>
                  </td>
                  <td className="py-4 px-6 text-slate-300">{record.sofor_name || '-'}</td>
                  <td className="py-4 px-6 text-right">
                    <span className="font-mono font-bold text-blue-400">{record.miktar}</span>
                    <span className="text-slate-400 ml-1">{record.birim}</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/cimento-entry?edit=${record.id}`)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(record.id)}
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
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz çimento kaydı yok'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {filteredRecords.length > 0 ? (
          filteredRecords.map((record) => (
            <div key={record.id} className="glass-effect rounded-xl p-5 border border-slate-800">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{record.cimento_firma_name || '-'}</h3>
                  <p className="text-sm text-slate-400">
                    {record.tarih ? format(new Date(record.tarih), 'dd MMM yyyy', { locale: tr }) : '-'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/cimento-entry?edit=${record.id}`)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(record.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {record.nakliyeci_firma_name && (
                  <p className="text-slate-400">Nakliyeci: <span className="text-white">{record.nakliyeci_firma_name}</span></p>
                )}
                {record.plaka && (
                  <p className="text-slate-400">Plaka: <span className="text-white font-mono">{record.plaka}</span></p>
                )}
                {record.sofor_name && (
                  <p className="text-slate-400">Şoför: <span className="text-white">{record.sofor_name}</span></p>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800">
                <span className="text-2xl font-bold font-mono text-blue-400">{record.miktar}</span>
                <span className="text-slate-400 ml-1">{record.birim}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-slate-500">
            {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz çimento kaydı yok'}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Kaydı Sil</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Bu çimento kaydını silmek istediğinize emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700">İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CimentoList;
