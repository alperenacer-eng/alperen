import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft, Building2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const DepartmentsManagement = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newDepartment, setNewDepartment] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API_URL}/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(response.data);
    } catch (error) {
      toast.error('İşletmeler yüklenemedi');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newDepartment.trim()) return;

    setLoading(true);
    try {
      await axios.post(`${API_URL}/departments`, { name: newDepartment }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('İşletme eklendi');
      setNewDepartment('');
      fetchDepartments();
    } catch (error) {
      toast.error('İşletme eklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/departments/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('İşletme silindi');
      fetchDepartments();
    } catch (error) {
      toast.error('İşletme silinemedi');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="animate-fade-in" data-testid="departments-management-page">
      <div className="mb-8">
        <button onClick={() => navigate('/settings')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Ayarlara Dön
        </button>
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="w-8 h-8 text-green-500" />
          <h1 className="text-3xl md:text-4xl font-bold text-white">İşletme Yönetimi</h1>
        </div>
        <p className="text-slate-400">İşletme ve bölüm listesini oluşturun</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <h2 className="text-xl font-semibold text-white mb-6">Yeni İşletme Ekle</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="department-name" className="text-slate-300">İşletme/Bölüm Adı</Label>
              <Input
                id="department-name"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="Örn: Fabrika 1, Atölye 2, Depo A"
                data-testid="department-name-input"
                required
                className="h-12 bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <Button type="submit" disabled={loading} data-testid="add-department-button" className="w-full h-12 bg-green-500 hover:bg-green-600 text-white">
              <Plus className="w-5 h-5 mr-2" />
              Ekle
            </Button>
          </form>
        </div>

        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <h2 className="text-xl font-semibold text-white mb-6">İşletme Listesi ({departments.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {departments.length > 0 ? (
              departments.map((dept, index) => (
                <div key={dept.id} data-testid={`department-item-${index}`} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <h3 className="font-semibold text-white">{dept.name}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(dept.id)} data-testid={`delete-department-${index}`} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500" data-testid="no-departments">Henüz işletme eklenmedi</div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Bu işletmeyi silmek istediğinize emin misiniz?</AlertDialogDescription>
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

export default DepartmentsManagement;