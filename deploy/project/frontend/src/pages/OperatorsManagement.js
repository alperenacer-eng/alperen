import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft, Users } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const OperatorsManagement = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newOperator, setNewOperator] = useState({ name: '', employee_id: '' });
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    try {
      const response = await axios.get(`${API_URL}/operators`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOperators(response.data);
    } catch (error) {
      toast.error('Operatörler yüklenemedi');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newOperator.name.trim()) return;

    setLoading(true);
    try {
      await axios.post(`${API_URL}/operators`, newOperator, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Operatör eklendi');
      setNewOperator({ name: '', employee_id: '' });
      fetchOperators();
    } catch (error) {
      toast.error('Operatör eklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/operators/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Operatör silindi');
      fetchOperators();
    } catch (error) {
      toast.error('Operatör silinemedi');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="animate-fade-in" data-testid="operators-management-page">
      <div className="mb-8">
        <button onClick={() => navigate('/settings')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Ayarlara Dön
        </button>
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-8 h-8 text-purple-500" />
          <h1 className="text-3xl md:text-4xl font-bold text-white">Operatör Yönetimi</h1>
        </div>
        <p className="text-slate-400">Operatör listesini oluşturun ve yönetin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <h2 className="text-xl font-semibold text-white mb-6">Yeni Operatör Ekle</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="operator-name" className="text-slate-300">Operatör Adı</Label>
              <Input
                id="operator-name"
                value={newOperator.name}
                onChange={(e) => setNewOperator({ ...newOperator, name: e.target.value })}
                placeholder="Örn: Ahmet Yılmaz"
                data-testid="operator-name-input"
                required
                className="h-12 bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-id" className="text-slate-300">Personel No (Opsiyonel)</Label>
              <Input
                id="employee-id"
                value={newOperator.employee_id}
                onChange={(e) => setNewOperator({ ...newOperator, employee_id: e.target.value })}
                placeholder="Örn: 12345"
                data-testid="employee-id-input"
                className="h-12 bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <Button type="submit" disabled={loading} data-testid="add-operator-button" className="w-full h-12 bg-purple-500 hover:bg-purple-600 text-white">
              <Plus className="w-5 h-5 mr-2" />
              Ekle
            </Button>
          </form>
        </div>

        <div className="glass-effect rounded-xl p-6 border border-slate-800">
          <h2 className="text-xl font-semibold text-white mb-6">Operatör Listesi ({operators.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {operators.length > 0 ? (
              operators.map((operator, index) => (
                <div key={operator.id} data-testid={`operator-item-${index}`} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <div>
                    <h3 className="font-semibold text-white">{operator.name}</h3>
                    {operator.employee_id && (
                      <p className="text-sm text-slate-400">Personel No: {operator.employee_id}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(operator.id)} data-testid={`delete-operator-${index}`} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500" data-testid="no-operators">Henüz operatör eklenmedi</div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Bu operatörü silmek istediğinize emin misiniz?</AlertDialogDescription>
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

export default OperatorsManagement;