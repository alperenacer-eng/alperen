import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Building,
  X,
  Save,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TeklifKaynaklar = () => {
  const { token } = useAuth();
  const [musteriler, setMusteriler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMusteri, setEditingMusteri] = useState(null);
  const [formData, setFormData] = useState({
    firma_adi: '',
    yetkili_kisi: '',
    telefon: '',
    email: '',
    adres: '',
    vergi_no: '',
    vergi_dairesi: '',
    notlar: ''
  });

  useEffect(() => {
    fetchMusteriler();
  }, []);

  const fetchMusteriler = async () => {
    try {
      const response = await fetch(`${API_URL}/api/teklif-musteriler`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMusteriler(data);
      }
    } catch (error) {
      console.error('Müşteriler yüklenirken hata:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firma_adi: '',
      yetkili_kisi: '',
      telefon: '',
      email: '',
      adres: '',
      vergi_no: '',
      vergi_dairesi: '',
      notlar: ''
    });
    setEditingMusteri(null);
  };

  const openModal = (musteri = null) => {
    if (musteri) {
      setEditingMusteri(musteri);
      setFormData({
        firma_adi: musteri.firma_adi || '',
        yetkili_kisi: musteri.yetkili_kisi || '',
        telefon: musteri.telefon || '',
        email: musteri.email || '',
        adres: musteri.adres || '',
        vergi_no: musteri.vergi_no || '',
        vergi_dairesi: musteri.vergi_dairesi || '',
        notlar: musteri.notlar || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.firma_adi.trim()) {
      toast.error('Firma adı zorunludur');
      return;
    }
    
    try {
      const url = editingMusteri
        ? `${API_URL}/api/teklif-musteriler/${editingMusteri.id}`
        : `${API_URL}/api/teklif-musteriler`;
      const method = editingMusteri ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        toast.success(editingMusteri ? 'Müşteri güncellendi' : 'Müşteri eklendi');
        fetchMusteriler();
        closeModal();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'İşlem başarısız');
      }
    } catch (error) {
      console.error('Kayıt hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu müşteriyi silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/teklif-musteriler/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Müşteri silindi');
        fetchMusteriler();
      } else {
        toast.error('Silme işlemi başarısız');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Teklif Kaynakları</h1>
          <p className="text-slate-400 text-sm">Müşteri tanımlamalarını yönetin</p>
        </div>
      </div>

      {/* Müşteriler */}
      <div className="glass-effect rounded-xl p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Müşteriler</h3>
              <p className="text-slate-400 text-sm">{musteriler.length} müşteri</p>
            </div>
          </div>
          <Button
            onClick={() => openModal()}
            className="bg-teal-500 hover:bg-teal-600"
          >
            <Plus className="w-4 h-4 mr-2" /> Müşteri Ekle
          </Button>
        </div>

        {musteriler.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {musteriler.map((musteri) => (
              <div
                key={musteri.id}
                className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-white font-medium">{musteri.firma_adi}</h4>
                    {musteri.yetkili_kisi && (
                      <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                        <Users className="w-3 h-3" /> {musteri.yetkili_kisi}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openModal(musteri)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(musteri.id)}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1 text-sm">
                  {musteri.telefon && (
                    <p className="text-slate-400 flex items-center gap-2">
                      <Phone className="w-3 h-3" /> {musteri.telefon}
                    </p>
                  )}
                  {musteri.email && (
                    <p className="text-slate-400 flex items-center gap-2">
                      <Mail className="w-3 h-3" /> {musteri.email}
                    </p>
                  )}
                  {musteri.adres && (
                    <p className="text-slate-400 flex items-center gap-2 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" /> {musteri.adres}
                    </p>
                  )}
                </div>
                
                {(musteri.vergi_no || musteri.vergi_dairesi) && (
                  <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-500">
                    {musteri.vergi_dairesi && <span>{musteri.vergi_dairesi}</span>}
                    {musteri.vergi_no && <span className="ml-2">VN: {musteri.vergi_no}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            Henüz müşteri tanımlanmamış.
            <button
              onClick={() => openModal()}
              className="block mx-auto mt-2 text-teal-500 hover:text-teal-400"
            >
              İlk müşterinizi ekleyin
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">
                {editingMusteri ? 'Müşteri Düzenle' : 'Yeni Müşteri'}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <Label className="text-slate-300">Firma Adı *</Label>
                <Input
                  value={formData.firma_adi}
                  onChange={(e) => setFormData(prev => ({ ...prev, firma_adi: e.target.value }))}
                  placeholder="Firma adı"
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
              
              <div>
                <Label className="text-slate-300">Yetkili Kişi</Label>
                <Input
                  value={formData.yetkili_kisi}
                  onChange={(e) => setFormData(prev => ({ ...prev, yetkili_kisi: e.target.value }))}
                  placeholder="Yetkili kişi adı"
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Telefon</Label>
                  <Input
                    value={formData.telefon}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefon: e.target.value }))}
                    placeholder="0555 555 55 55"
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">E-posta</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@firma.com"
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-slate-300">Adres</Label>
                <textarea
                  value={formData.adres}
                  onChange={(e) => setFormData(prev => ({ ...prev, adres: e.target.value }))}
                  placeholder="Adres"
                  rows={2}
                  className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Vergi Dairesi</Label>
                  <Input
                    value={formData.vergi_dairesi}
                    onChange={(e) => setFormData(prev => ({ ...prev, vergi_dairesi: e.target.value }))}
                    placeholder="Vergi dairesi"
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Vergi No</Label>
                  <Input
                    value={formData.vergi_no}
                    onChange={(e) => setFormData(prev => ({ ...prev, vergi_no: e.target.value }))}
                    placeholder="Vergi numarası"
                    className="mt-1 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-slate-300">Notlar</Label>
                <textarea
                  value={formData.notlar}
                  onChange={(e) => setFormData(prev => ({ ...prev, notlar: e.target.value }))}
                  placeholder="Ek notlar..."
                  rows={2}
                  className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  onClick={closeModal}
                  className="bg-slate-700 hover:bg-slate-600"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  className="bg-teal-500 hover:bg-teal-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingMusteri ? 'Güncelle' : 'Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeklifKaynaklar;
