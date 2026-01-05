import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit, Building2, Phone, Mail, MapPin, X, Save } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MotorinKaynaklar = () => {
  const { token } = useAuth();
  const [tedarikciler, setTedarikciler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    yetkili_kisi: '',
    telefon: '',
    email: '',
    adres: '',
    vergi_no: '',
    notlar: ''
  });

  useEffect(() => {
    fetchTedarikciler();
  }, []);

  const fetchTedarikciler = async () => {
    try {
      const res = await axios.get(`${API_URL}/motorin-tedarikciler`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTedarikciler(res.data);
    } catch (error) {
      toast.error('Tedarikçiler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      yetkili_kisi: '',
      telefon: '',
      email: '',
      adres: '',
      vergi_no: '',
      notlar: ''
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Firma adı zorunludur');
      return;
    }

    try {
      if (editingId) {
        await axios.put(`${API_URL}/motorin-tedarikciler/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Tedarikçi güncellendi');
      } else {
        await axios.post(`${API_URL}/motorin-tedarikciler`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Tedarikçi eklendi');
      }
      
      fetchTedarikciler();
      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const handleEdit = (tedarikci) => {
    setFormData({
      name: tedarikci.name || '',
      yetkili_kisi: tedarikci.yetkili_kisi || '',
      telefon: tedarikci.telefon || '',
      email: tedarikci.email || '',
      adres: tedarikci.adres || '',
      vergi_no: tedarikci.vergi_no || '',
      notlar: tedarikci.notlar || ''
    });
    setEditingId(tedarikci.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu tedarikçiyi silmek istediğinize emin misiniz?')) return;
    
    try {
      await axios.delete(`${API_URL}/motorin-tedarikciler/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Tedarikçi silindi');
      fetchTedarikciler();
    } catch (error) {
      toast.error('Silinemedi');
    }
  };

  const filteredTedarikciler = tedarikciler.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.yetkili_kisi || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in" data-testid="motorin-kaynaklar-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Motorin Kaynakları</h1>
          <p className="text-slate-400">Tedarikçi firmalarını yönetin</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yeni Tedarikçi
        </Button>
      </div>

      {/* Arama */}
      <div className="glass-effect rounded-xl border border-slate-800 p-4 mb-6">
        <Input
          placeholder="Tedarikçi ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-800 border-slate-700 text-white"
        />
      </div>

      {/* Tedarikçi Listesi */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTedarikciler.length > 0 ? (
            filteredTedarikciler.map((tedarikci) => (
              <div key={tedarikci.id} className="glass-effect rounded-xl border border-slate-800 p-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{tedarikci.name}</h3>
                      {tedarikci.yetkili_kisi && (
                        <p className="text-sm text-slate-400">Yetkili: {tedarikci.yetkili_kisi}</p>
                      )}
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
                        {tedarikci.telefon && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {tedarikci.telefon}
                          </span>
                        )}
                        {tedarikci.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {tedarikci.email}
                          </span>
                        )}
                        {tedarikci.vergi_no && (
                          <span>VKN: {tedarikci.vergi_no}</span>
                        )}
                      </div>
                      {tedarikci.adres && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {tedarikci.adres}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-slate-400 hover:text-blue-400"
                      onClick={() => handleEdit(tedarikci)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-slate-400 hover:text-red-400"
                      onClick={() => handleDelete(tedarikci.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 glass-effect rounded-xl border border-slate-800">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Henüz tedarikçi eklenmemiş</p>
              <Button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="mt-4 bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                İlk Tedarikçiyi Ekle
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <Label className="text-slate-300">Firma Adı *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="Firma adı"
                  required
                />
              </div>

              <div>
                <Label className="text-slate-300">Yetkili Kişi</Label>
                <Input
                  value={formData.yetkili_kisi}
                  onChange={(e) => setFormData({ ...formData, yetkili_kisi: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="Yetkili kişi adı"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Telefon</Label>
                  <Input
                    value={formData.telefon}
                    onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    placeholder="0XXX XXX XX XX"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">E-posta</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    placeholder="email@firma.com"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Vergi No</Label>
                <Input
                  value={formData.vergi_no}
                  onChange={(e) => setFormData({ ...formData, vergi_no: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="Vergi numarası"
                />
              </div>

              <div>
                <Label className="text-slate-300">Adres</Label>
                <textarea
                  value={formData.adres}
                  onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1 min-h-[60px]"
                  placeholder="Adres"
                />
              </div>

              <div>
                <Label className="text-slate-300">Notlar</Label>
                <textarea
                  value={formData.notlar}
                  onChange={(e) => setFormData({ ...formData, notlar: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1 min-h-[60px]"
                  placeholder="Ek notlar"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="border-slate-700 text-slate-300 flex-1"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingId ? 'Güncelle' : 'Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MotorinKaynaklar;
