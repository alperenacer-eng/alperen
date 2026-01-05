import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit, Building2, Phone, Mail, MapPin, X, Save, Factory } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MotorinKaynaklar = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('tedarikciler');
  
  // Tedarikçiler State
  const [tedarikciler, setTedarikciler] = useState([]);
  const [loadingTedarikciler, setLoadingTedarikciler] = useState(true);
  const [showTedarikciModal, setShowTedarikciModal] = useState(false);
  const [editingTedarikciId, setEditingTedarikciId] = useState(null);
  const [tedarikciForm, setTedarikciForm] = useState({
    name: '',
    yetkili_kisi: '',
    telefon: '',
    email: '',
    adres: '',
    vergi_no: '',
    notlar: ''
  });

  // Boşaltım Tesisleri State
  const [tesisler, setTesisler] = useState([]);
  const [loadingTesisler, setLoadingTesisler] = useState(true);
  const [showTesisModal, setShowTesisModal] = useState(false);
  const [editingTesisId, setEditingTesisId] = useState(null);
  const [tesisForm, setTesisForm] = useState({
    name: '',
    adres: '',
    notlar: ''
  });

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTedarikciler();
    fetchTesisler();
  }, []);

  // Tedarikçi İşlemleri
  const fetchTedarikciler = async () => {
    try {
      const res = await axios.get(`${API_URL}/motorin-tedarikciler`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTedarikciler(res.data);
    } catch (error) {
      toast.error('Tedarikçiler yüklenemedi');
    } finally {
      setLoadingTedarikciler(false);
    }
  };

  const resetTedarikciForm = () => {
    setTedarikciForm({
      name: '',
      yetkili_kisi: '',
      telefon: '',
      email: '',
      adres: '',
      vergi_no: '',
      notlar: ''
    });
    setEditingTedarikciId(null);
  };

  const handleTedarikciSubmit = async (e) => {
    e.preventDefault();
    if (!tedarikciForm.name.trim()) {
      toast.error('Firma adı zorunludur');
      return;
    }

    try {
      if (editingTedarikciId) {
        await axios.put(`${API_URL}/motorin-tedarikciler/${editingTedarikciId}`, tedarikciForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Tedarikçi güncellendi');
      } else {
        await axios.post(`${API_URL}/motorin-tedarikciler`, tedarikciForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Tedarikçi eklendi');
      }
      fetchTedarikciler();
      setShowTedarikciModal(false);
      resetTedarikciForm();
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const handleEditTedarikci = (tedarikci) => {
    setTedarikciForm({
      name: tedarikci.name || '',
      yetkili_kisi: tedarikci.yetkili_kisi || '',
      telefon: tedarikci.telefon || '',
      email: tedarikci.email || '',
      adres: tedarikci.adres || '',
      vergi_no: tedarikci.vergi_no || '',
      notlar: tedarikci.notlar || ''
    });
    setEditingTedarikciId(tedarikci.id);
    setShowTedarikciModal(true);
  };

  const handleDeleteTedarikci = async (id) => {
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

  // Boşaltım Tesisi İşlemleri
  const fetchTesisler = async () => {
    try {
      const res = await axios.get(`${API_URL}/bosaltim-tesisleri`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTesisler(res.data);
    } catch (error) {
      toast.error('Tesisler yüklenemedi');
    } finally {
      setLoadingTesisler(false);
    }
  };

  const resetTesisForm = () => {
    setTesisForm({
      name: '',
      adres: '',
      notlar: ''
    });
    setEditingTesisId(null);
  };

  const handleTesisSubmit = async (e) => {
    e.preventDefault();
    if (!tesisForm.name.trim()) {
      toast.error('Tesis adı zorunludur');
      return;
    }

    try {
      if (editingTesisId) {
        await axios.put(`${API_URL}/bosaltim-tesisleri/${editingTesisId}`, tesisForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Tesis güncellendi');
      } else {
        await axios.post(`${API_URL}/bosaltim-tesisleri`, tesisForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Tesis eklendi');
      }
      fetchTesisler();
      setShowTesisModal(false);
      resetTesisForm();
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const handleEditTesis = (tesis) => {
    setTesisForm({
      name: tesis.name || '',
      adres: tesis.adres || '',
      notlar: tesis.notlar || ''
    });
    setEditingTesisId(tesis.id);
    setShowTesisModal(true);
  };

  const handleDeleteTesis = async (id) => {
    if (!window.confirm('Bu tesisi silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/bosaltim-tesisleri/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Tesis silindi');
      fetchTesisler();
    } catch (error) {
      toast.error('Silinemedi');
    }
  };

  const filteredTedarikciler = tedarikciler.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.yetkili_kisi || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTesisler = tesisler.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.adres || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in" data-testid="motorin-kaynaklar-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Motorin Kaynakları</h1>
          <p className="text-slate-400">Tedarikçi firmaları ve boşaltım tesislerini yönetin</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('tedarikciler')}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === 'tedarikciler'
              ? 'bg-orange-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Tedarikçiler ({tedarikciler.length})
        </button>
        <button
          onClick={() => setActiveTab('tesisler')}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === 'tesisler'
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Factory className="w-4 h-4" />
          Boşaltım Tesisleri ({tesisler.length})
        </button>
      </div>

      {/* Arama ve Ekleme */}
      <div className="glass-effect rounded-xl border border-slate-800 p-4 mb-6 flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-800 border-slate-700 text-white flex-1"
        />
        {activeTab === 'tedarikciler' ? (
          <Button
            onClick={() => {
              resetTedarikciForm();
              setShowTedarikciModal(true);
            }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Tedarikçi
          </Button>
        ) : (
          <Button
            onClick={() => {
              resetTesisForm();
              setShowTesisModal(true);
            }}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Tesis
          </Button>
        )}
      </div>

      {/* Tedarikçiler Tab */}
      {activeTab === 'tedarikciler' && (
        loadingTedarikciler ? (
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
                        onClick={() => handleEditTedarikci(tedarikci)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-slate-400 hover:text-red-400"
                        onClick={() => handleDeleteTedarikci(tedarikci.id)}
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
                    resetTedarikciForm();
                    setShowTedarikciModal(true);
                  }}
                  className="mt-4 bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  İlk Tedarikçiyi Ekle
                </Button>
              </div>
            )}
          </div>
        )
      )}

      {/* Boşaltım Tesisleri Tab */}
      {activeTab === 'tesisler' && (
        loadingTesisler ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTesisler.length > 0 ? (
              filteredTesisler.map((tesis) => (
                <div key={tesis.id} className="glass-effect rounded-xl border border-slate-800 p-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Factory className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{tesis.name}</h3>
                        {tesis.adres && (
                          <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {tesis.adres}
                          </p>
                        )}
                        {tesis.notlar && (
                          <p className="text-xs text-slate-500 mt-1">{tesis.notlar}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-slate-400 hover:text-blue-400"
                        onClick={() => handleEditTesis(tesis)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-slate-400 hover:text-red-400"
                        onClick={() => handleDeleteTesis(tesis.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 glass-effect rounded-xl border border-slate-800">
                <Factory className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Henüz boşaltım tesisi eklenmemiş</p>
                <Button
                  onClick={() => {
                    resetTesisForm();
                    setShowTesisModal(true);
                  }}
                  className="mt-4 bg-cyan-600 hover:bg-cyan-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  İlk Tesisi Ekle
                </Button>
              </div>
            )}
          </div>
        )
      )}

      {/* Tedarikçi Modal */}
      {showTedarikciModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">
                {editingTedarikciId ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi'}
              </h2>
              <button
                onClick={() => { setShowTedarikciModal(false); resetTedarikciForm(); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTedarikciSubmit} className="p-4 space-y-4">
              <div>
                <Label className="text-slate-300">Firma Adı *</Label>
                <Input
                  value={tedarikciForm.name}
                  onChange={(e) => setTedarikciForm({ ...tedarikciForm, name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="Firma adı"
                  required
                />
              </div>

              <div>
                <Label className="text-slate-300">Yetkili Kişi</Label>
                <Input
                  value={tedarikciForm.yetkili_kisi}
                  onChange={(e) => setTedarikciForm({ ...tedarikciForm, yetkili_kisi: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="Yetkili kişi adı"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Telefon</Label>
                  <Input
                    value={tedarikciForm.telefon}
                    onChange={(e) => setTedarikciForm({ ...tedarikciForm, telefon: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    placeholder="0XXX XXX XX XX"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">E-posta</Label>
                  <Input
                    type="email"
                    value={tedarikciForm.email}
                    onChange={(e) => setTedarikciForm({ ...tedarikciForm, email: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white mt-1"
                    placeholder="email@firma.com"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Vergi No</Label>
                <Input
                  value={tedarikciForm.vergi_no}
                  onChange={(e) => setTedarikciForm({ ...tedarikciForm, vergi_no: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="Vergi numarası"
                />
              </div>

              <div>
                <Label className="text-slate-300">Adres</Label>
                <textarea
                  value={tedarikciForm.adres}
                  onChange={(e) => setTedarikciForm({ ...tedarikciForm, adres: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1 min-h-[60px]"
                  placeholder="Adres"
                />
              </div>

              <div>
                <Label className="text-slate-300">Notlar</Label>
                <textarea
                  value={tedarikciForm.notlar}
                  onChange={(e) => setTedarikciForm({ ...tedarikciForm, notlar: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1 min-h-[60px]"
                  placeholder="Ek notlar"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowTedarikciModal(false); resetTedarikciForm(); }}
                  className="border-slate-700 text-slate-300 flex-1"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingTedarikciId ? 'Güncelle' : 'Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Boşaltım Tesisi Modal */}
      {showTesisModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">
                {editingTesisId ? 'Tesis Düzenle' : 'Yeni Boşaltım Tesisi'}
              </h2>
              <button
                onClick={() => { setShowTesisModal(false); resetTesisForm(); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTesisSubmit} className="p-4 space-y-4">
              <div>
                <Label className="text-slate-300">Tesis Adı *</Label>
                <Input
                  value={tesisForm.name}
                  onChange={(e) => setTesisForm({ ...tesisForm, name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  placeholder="Tesis adı"
                  required
                />
              </div>

              <div>
                <Label className="text-slate-300">Adres</Label>
                <textarea
                  value={tesisForm.adres}
                  onChange={(e) => setTesisForm({ ...tesisForm, adres: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1 min-h-[60px]"
                  placeholder="Tesis adresi"
                />
              </div>

              <div>
                <Label className="text-slate-300">Notlar</Label>
                <textarea
                  value={tesisForm.notlar}
                  onChange={(e) => setTesisForm({ ...tesisForm, notlar: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 mt-1 min-h-[60px]"
                  placeholder="Ek notlar"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowTesisModal(false); resetTesisForm(); }}
                  className="border-slate-700 text-slate-300 flex-1"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-700 flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingTesisId ? 'Güncelle' : 'Kaydet'}
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
