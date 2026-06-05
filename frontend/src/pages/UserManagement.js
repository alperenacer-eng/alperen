import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, ArrowLeft, Shield, Users as UsersIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MODULES = [
  { id: 'bims', name: 'Bims Üretim', icon: '📦' },
  { id: 'parke', name: 'Parke Üretim', icon: '🪵' },
  { id: 'araclar', name: 'Araçlar', icon: '🚗' },
  { id: 'personel', name: 'Personel', icon: '👥' },
];

const UserManagement = () => {
  const { token, user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    permissions: ['bims']
  });

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/admin/users`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kullanıcı oluşturuldu');
      setShowCreateDialog(false);
      setFormData({ name: '', email: '', password: '', role: 'user', permissions: ['bims'] });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kullanıcı oluşturulamadı');
    }
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`${API_URL}/admin/users/${editUser.id}`, {
        name: editUser.name,
        role: editUser.role,
        permissions: editUser.permissions
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kullanıcı güncellendi');
      setEditUser(null);
      fetchUsers();
    } catch (error) {
      toast.error('Kullanıcı güncellenemedi');
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/admin/users/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kullanıcı silindi');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kullanıcı silinemedi');
    } finally {
      setDeleteId(null);
    }
  };

  const togglePermission = (userId, moduleId, isEdit = false) => {
    if (isEdit) {
      setEditUser(prev => {
        const permissions = prev.permissions.includes(moduleId)
          ? prev.permissions.filter(p => p !== moduleId)
          : [...prev.permissions, moduleId];
        return { ...prev, permissions };
      });
    } else {
      setFormData(prev => {
        const permissions = prev.permissions.includes(moduleId)
          ? prev.permissions.filter(p => p !== moduleId)
          : [...prev.permissions, moduleId];
        return { ...prev, permissions };
      });
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
    <div className="animate-fade-in" data-testid="user-management-page">
      <div className="mb-8">
        <button onClick={() => navigate('/settings')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Ayarlara Dön
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl md:text-4xl font-bold text-white">Kullanıcı Yönetimi</h1>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} data-testid="create-user-button" className="bg-red-500 hover:bg-red-600 text-white">
            <Plus className="w-5 h-5 mr-2" />
            Kullanıcı Ekle
          </Button>
        </div>
        <p className="text-slate-400">Kullanıcıları yönetin ve modül izinlerini belirleyin</p>
      </div>

      {/* Users List */}
      <div className="glass-effect rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Kullanıcı</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Modül İzinleri</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((user, index) => (
                <tr key={user.id} data-testid={`user-row-${index}`} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-semibold text-white">{user.name}</div>
                      <div className="text-sm text-slate-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      user.role === 'admin' ? 'bg-red-400/10 text-red-400' : 'bg-blue-400/10 text-blue-400'
                    }`}>
                      {user.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      {user.permissions?.map(perm => {
                        const module = MODULES.find(m => m.id === perm);
                        return module ? (
                          <span key={perm} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">
                            {module.icon} {module.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditUser(user)} data-testid={`edit-user-${index}`} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {user.id !== currentUser?.id && (
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(user.id)} data-testid={`delete-user-${index}`} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Yeni Kullanıcı Oluştur</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Ad Soyad</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="bg-slate-950 border-slate-800 text-white" />
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required className="bg-slate-950 border-slate-800 text-white" />
            </div>
            <div className="space-y-2">
              <Label>Şifre</Label>
              <Input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required className="bg-slate-950 border-slate-800 text-white" />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="user">Kullanıcı</SelectItem>
                  <SelectItem value="admin">Yönetici</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modül İzinleri</Label>
              <div className="space-y-2">
                {MODULES.map(module => (
                  <div key={module.id} className="flex items-center space-x-2">
                    <Checkbox id={`create-${module.id}`} checked={formData.permissions.includes(module.id)} onCheckedChange={() => togglePermission(null, module.id)} />
                    <label htmlFor={`create-${module.id}`} className="text-sm text-slate-300 cursor-pointer">
                      {module.icon} {module.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700">İptal</Button>
              <Button type="submit" className="bg-red-500 hover:bg-red-600 text-white">Oluştur</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Ad Soyad</Label>
                <Input value={editUser.name} onChange={(e) => setEditUser({...editUser, name: e.target.value})} className="bg-slate-950 border-slate-800 text-white" />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={editUser.role} onValueChange={(value) => setEditUser({...editUser, role: value})}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="user">Kullanıcı</SelectItem>
                    <SelectItem value="admin">Yönetici</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Modül İzinleri</Label>
                <div className="space-y-2">
                  {MODULES.map(module => (
                    <div key={module.id} className="flex items-center space-x-2">
                      <Checkbox id={`edit-${module.id}`} checked={editUser.permissions?.includes(module.id)} onCheckedChange={() => togglePermission(editUser.id, module.id, true)} />
                      <label htmlFor={`edit-${module.id}`} className="text-sm text-slate-300 cursor-pointer">
                        {module.icon} {module.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditUser(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700">İptal</Button>
                <Button onClick={handleUpdate} className="bg-blue-500 hover:bg-blue-600 text-white">Kaydet</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Bu kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
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

export default UserManagement;