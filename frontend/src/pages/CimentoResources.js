import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft, Building2, Truck, Car, User, MapPin, Package } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const CimentoResources = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('cimento-firmalar');
  
  // Çimento Firmaları
  const [cimentoFirmalar, setCimentoFirmalar] = useState([]);
  const [newCimentoFirma, setNewCimentoFirma] = useState({ name: '', contact_person: '', phone: '', address: '', notes: '' });
  const [deleteCimentoFirmaId, setDeleteCimentoFirmaId] = useState(null);
  
  // Nakliyeci Firmaları
  const [nakliyeciFirmalar, setNakliyeciFirmalar] = useState([]);
  const [newNakliyeciFirma, setNewNakliyeciFirma] = useState({ name: '', contact_person: '', phone: '', address: '', notes: '' });
  const [deleteNakliyeciFirmaId, setDeleteNakliyeciFirmaId] = useState(null);
  
  // Plakalar
  const [plakalar, setPlakalar] = useState([]);
  const [newPlaka, setNewPlaka] = useState({ plaka: '', vehicle_type: '', nakliyeci_id: '', notes: '' });
  const [deletePlakaId, setDeletePlakaId] = useState(null);
  
  // Şoförler
  const [soforler, setSoforler] = useState([]);
  const [newSofor, setNewSofor] = useState({ name: '', phone: '', license_no: '', nakliyeci_id: '', notes: '' });
  const [deleteSoforId, setDeleteSoforId] = useState(null);
  
  // Şehirler
  const [sehirler, setSehirler] = useState([]);
  const [newSehir, setNewSehir] = useState({ name: '', code: '' });
  const [deleteSehirId, setDeleteSehirId] = useState(null);

  // Çimento Cinsleri
  const [cimentoCinsleri, setCimentoCinsleri] = useState([]);
  const [newCimentoCinsi, setNewCimentoCinsi] = useState({ name: '', description: '' });
  const [deleteCimentoCinsiId, setDeleteCimentoCinsiId] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    fetchCimentoFirmalar();
    fetchNakliyeciFirmalar();
    fetchPlakalar();
    fetchSoforler();
    fetchSehirler();
  };

  // Çimento Firmaları
  const fetchCimentoFirmalar = async () => {
    try {
      const response = await axios.get(`${API_URL}/cimento-firmalar`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCimentoFirmalar(response.data);
    } catch (error) {
      toast.error('Çimento firmaları yüklenemedi');
    }
  };

  const handleAddCimentoFirma = async (e) => {
    e.preventDefault();
    if (!newCimentoFirma.name.trim()) return;
    try {
      await axios.post(`${API_URL}/cimento-firmalar`, newCimentoFirma, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Çimento firması eklendi');
      setNewCimentoFirma({ name: '', contact_person: '', phone: '', address: '', notes: '' });
      fetchCimentoFirmalar();
    } catch (error) {
      toast.error('Çimento firması eklenemedi');
    }
  };

  const handleDeleteCimentoFirma = async () => {
    try {
      await axios.delete(`${API_URL}/cimento-firmalar/${deleteCimentoFirmaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Çimento firması silindi');
      fetchCimentoFirmalar();
    } catch (error) {
      toast.error('Çimento firması silinemedi');
    } finally {
      setDeleteCimentoFirmaId(null);
    }
  };

  // Nakliyeci Firmaları
  const fetchNakliyeciFirmalar = async () => {
    try {
      const response = await axios.get(`${API_URL}/nakliyeci-firmalar`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNakliyeciFirmalar(response.data);
    } catch (error) {
      toast.error('Nakliyeci firmaları yüklenemedi');
    }
  };

  const handleAddNakliyeciFirma = async (e) => {
    e.preventDefault();
    if (!newNakliyeciFirma.name.trim()) return;
    try {
      await axios.post(`${API_URL}/nakliyeci-firmalar`, newNakliyeciFirma, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Nakliyeci firması eklendi');
      setNewNakliyeciFirma({ name: '', contact_person: '', phone: '', address: '', notes: '' });
      fetchNakliyeciFirmalar();
    } catch (error) {
      toast.error('Nakliyeci firması eklenemedi');
    }
  };

  const handleDeleteNakliyeciFirma = async () => {
    try {
      await axios.delete(`${API_URL}/nakliyeci-firmalar/${deleteNakliyeciFirmaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Nakliyeci firması silindi');
      fetchNakliyeciFirmalar();
    } catch (error) {
      toast.error('Nakliyeci firması silinemedi');
    } finally {
      setDeleteNakliyeciFirmaId(null);
    }
  };

  // Plakalar
  const fetchPlakalar = async () => {
    try {
      const response = await axios.get(`${API_URL}/plakalar`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlakalar(response.data);
    } catch (error) {
      toast.error('Plakalar yüklenemedi');
    }
  };

  const handleAddPlaka = async (e) => {
    e.preventDefault();
    if (!newPlaka.plaka.trim()) return;
    try {
      const selectedNakliyeci = nakliyeciFirmalar.find(n => n.id === newPlaka.nakliyeci_id);
      const plakaData = {
        ...newPlaka,
        nakliyeci_name: selectedNakliyeci?.name || ''
      };
      await axios.post(`${API_URL}/plakalar`, plakaData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Plaka eklendi');
      setNewPlaka({ plaka: '', vehicle_type: '', nakliyeci_id: '', notes: '' });
      fetchPlakalar();
    } catch (error) {
      toast.error('Plaka eklenemedi');
    }
  };

  const handleDeletePlaka = async () => {
    try {
      await axios.delete(`${API_URL}/plakalar/${deletePlakaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Plaka silindi');
      fetchPlakalar();
    } catch (error) {
      toast.error('Plaka silinemedi');
    } finally {
      setDeletePlakaId(null);
    }
  };

  // Şoförler
  const fetchSoforler = async () => {
    try {
      const response = await axios.get(`${API_URL}/soforler`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSoforler(response.data);
    } catch (error) {
      toast.error('Şoförler yüklenemedi');
    }
  };

  const handleAddSofor = async (e) => {
    e.preventDefault();
    if (!newSofor.name.trim()) return;
    try {
      const selectedNakliyeci = nakliyeciFirmalar.find(n => n.id === newSofor.nakliyeci_id);
      const soforData = {
        ...newSofor,
        nakliyeci_name: selectedNakliyeci?.name || ''
      };
      await axios.post(`${API_URL}/soforler`, soforData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Şoför eklendi');
      setNewSofor({ name: '', phone: '', license_no: '', nakliyeci_id: '', notes: '' });
      fetchSoforler();
    } catch (error) {
      toast.error('Şoför eklenemedi');
    }
  };

  const handleDeleteSofor = async () => {
    try {
      await axios.delete(`${API_URL}/soforler/${deleteSoforId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Şoför silindi');
      fetchSoforler();
    } catch (error) {
      toast.error('Şoför silinemedi');
    } finally {
      setDeleteSoforId(null);
    }
  };

  // Şehirler
  const fetchSehirler = async () => {
    try {
      const response = await axios.get(`${API_URL}/sehirler`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSehirler(response.data);
    } catch (error) {
      toast.error('Şehirler yüklenemedi');
    }
  };

  const handleAddSehir = async (e) => {
    e.preventDefault();
    if (!newSehir.name.trim()) return;
    try {
      await axios.post(`${API_URL}/sehirler`, newSehir, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Şehir eklendi');
      setNewSehir({ name: '', code: '' });
      fetchSehirler();
    } catch (error) {
      toast.error('Şehir eklenemedi');
    }
  };

  const handleDeleteSehir = async () => {
    try {
      await axios.delete(`${API_URL}/sehirler/${deleteSehirId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Şehir silindi');
      fetchSehirler();
    } catch (error) {
      toast.error('Şehir silinemedi');
    } finally {
      setDeleteSehirId(null);
    }
  };

  return (
    <div className="animate-fade-in" data-testid="cimento-resources-page">
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Geri
        </button>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Çimento Kaynaklar</h1>
        <p className="text-slate-400">Çimento firmaları, nakliyeciler, plakalar, şoförler ve şehirleri yönetin</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-slate-900 border border-slate-800 mb-6">
          <TabsTrigger value="cimento-firmalar" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <Building2 className="w-4 h-4 mr-2" />
            Çimento Firmaları
          </TabsTrigger>
          <TabsTrigger value="nakliyeci-firmalar" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
            <Truck className="w-4 h-4 mr-2" />
            Nakliyeciler
          </TabsTrigger>
          <TabsTrigger value="plakalar" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            <Car className="w-4 h-4 mr-2" />
            Plakalar
          </TabsTrigger>
          <TabsTrigger value="soforler" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <User className="w-4 h-4 mr-2" />
            Şoförler
          </TabsTrigger>
          <TabsTrigger value="sehirler" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
            <MapPin className="w-4 h-4 mr-2" />
            Şehirler
          </TabsTrigger>
        </TabsList>

        {/* Çimento Firmaları Tab */}
        <TabsContent value="cimento-firmalar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Yeni Çimento Firması Ekle</h2>
              <form onSubmit={handleAddCimentoFirma} className="space-y-4">
                <div className="space-y-2">
                  <Label>Firma Adı</Label>
                  <Input
                    value={newCimentoFirma.name}
                    onChange={(e) => setNewCimentoFirma({ ...newCimentoFirma, name: e.target.value })}
                    placeholder="Örn: ABC Çimento A.Ş."
                    required
                    className="h-12 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Yetkili Kişi (Opsiyonel)</Label>
                  <Input
                    value={newCimentoFirma.contact_person}
                    onChange={(e) => setNewCimentoFirma({ ...newCimentoFirma, contact_person: e.target.value })}
                    placeholder="Yetkili kişi adı"
                    className="h-12 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon (Opsiyonel)</Label>
                  <Input
                    value={newCimentoFirma.phone}
                    onChange={(e) => setNewCimentoFirma({ ...newCimentoFirma, phone: e.target.value })}
                    placeholder="0532 XXX XX XX"
                    className="h-12 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adres (Opsiyonel)</Label>
                  <Textarea
                    value={newCimentoFirma.address}
                    onChange={(e) => setNewCimentoFirma({ ...newCimentoFirma, address: e.target.value })}
                    placeholder="Firma adresi"
                    rows={2}
                    className="bg-slate-950 border-slate-800 text-white resize-none"
                  />
                </div>
                <Button type="submit" className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Ekle
                </Button>
              </form>
            </div>

            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Çimento Firmaları Listesi ({cimentoFirmalar.length})</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cimentoFirmalar.length > 0 ? (
                  cimentoFirmalar.map((firma) => (
                    <div key={firma.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <div>
                        <h3 className="font-semibold text-white">{firma.name}</h3>
                        {firma.contact_person && <p className="text-sm text-slate-400">Yetkili: {firma.contact_person}</p>}
                        {firma.phone && <p className="text-sm text-slate-400">Tel: {firma.phone}</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteCimentoFirmaId(firma.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">Henüz çimento firması eklenmedi</div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Nakliyeci Firmaları Tab */}
        <TabsContent value="nakliyeci-firmalar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Yeni Nakliyeci Firma Ekle</h2>
              <form onSubmit={handleAddNakliyeciFirma} className="space-y-4">
                <div className="space-y-2">
                  <Label>Firma Adı</Label>
                  <Input
                    value={newNakliyeciFirma.name}
                    onChange={(e) => setNewNakliyeciFirma({ ...newNakliyeciFirma, name: e.target.value })}
                    placeholder="Örn: XYZ Nakliyat"
                    required
                    className="h-12 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Yetkili Kişi (Opsiyonel)</Label>
                  <Input
                    value={newNakliyeciFirma.contact_person}
                    onChange={(e) => setNewNakliyeciFirma({ ...newNakliyeciFirma, contact_person: e.target.value })}
                    placeholder="Yetkili kişi adı"
                    className="h-12 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon (Opsiyonel)</Label>
                  <Input
                    value={newNakliyeciFirma.phone}
                    onChange={(e) => setNewNakliyeciFirma({ ...newNakliyeciFirma, phone: e.target.value })}
                    placeholder="0532 XXX XX XX"
                    className="h-12 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adres (Opsiyonel)</Label>
                  <Textarea
                    value={newNakliyeciFirma.address}
                    onChange={(e) => setNewNakliyeciFirma({ ...newNakliyeciFirma, address: e.target.value })}
                    placeholder="Firma adresi"
                    rows={2}
                    className="bg-slate-950 border-slate-800 text-white resize-none"
                  />
                </div>
                <Button type="submit" className="w-full h-12 bg-green-500 hover:bg-green-600 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Ekle
                </Button>
              </form>
            </div>

            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Nakliyeci Firmaları Listesi ({nakliyeciFirmalar.length})</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {nakliyeciFirmalar.length > 0 ? (
                  nakliyeciFirmalar.map((firma) => (
                    <div key={firma.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <div>
                        <h3 className="font-semibold text-white">{firma.name}</h3>
                        {firma.contact_person && <p className="text-sm text-slate-400">Yetkili: {firma.contact_person}</p>}
                        {firma.phone && <p className="text-sm text-slate-400">Tel: {firma.phone}</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteNakliyeciFirmaId(firma.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">Henüz nakliyeci firması eklenmedi</div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Plakalar Tab */}
        <TabsContent value="plakalar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Yeni Plaka Ekle</h2>
              <form onSubmit={handleAddPlaka} className="space-y-4">
                <div className="space-y-2">
                  <Label>Plaka</Label>
                  <Input
                    value={newPlaka.plaka}
                    onChange={(e) => setNewPlaka({ ...newPlaka, plaka: e.target.value.toUpperCase() })}
                    placeholder="34 ABC 123"
                    required
                    className="h-12 bg-slate-950 border-slate-800 text-white font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Araç Tipi (Opsiyonel)</Label>
                  <Select value={newPlaka.vehicle_type} onValueChange={(value) => setNewPlaka({ ...newPlaka, vehicle_type: value })}>
                    <SelectTrigger className="h-12 bg-slate-950 border-slate-800 text-white">
                      <SelectValue placeholder="Araç tipi seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="tir">TIR</SelectItem>
                      <SelectItem value="kamyon">Kamyon</SelectItem>
                      <SelectItem value="dorse">Dorse</SelectItem>
                      <SelectItem value="tanker">Tanker</SelectItem>
                      <SelectItem value="diger">Diğer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nakliyeci Firma (Opsiyonel)</Label>
                  <Select value={newPlaka.nakliyeci_id} onValueChange={(value) => setNewPlaka({ ...newPlaka, nakliyeci_id: value })}>
                    <SelectTrigger className="h-12 bg-slate-950 border-slate-800 text-white">
                      <SelectValue placeholder="Nakliyeci seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {nakliyeciFirmalar.map((n) => (
                        <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full h-12 bg-purple-500 hover:bg-purple-600 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Ekle
                </Button>
              </form>
            </div>

            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Plaka Listesi ({plakalar.length})</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {plakalar.length > 0 ? (
                  plakalar.map((plaka) => (
                    <div key={plaka.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <div>
                        <h3 className="font-semibold text-white font-mono">{plaka.plaka}</h3>
                        {plaka.vehicle_type && <p className="text-sm text-slate-400 capitalize">Tip: {plaka.vehicle_type}</p>}
                        {plaka.nakliyeci_name && <p className="text-sm text-slate-400">Nakliyeci: {plaka.nakliyeci_name}</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setDeletePlakaId(plaka.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">Henüz plaka eklenmedi</div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Şoförler Tab */}
        <TabsContent value="soforler">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Yeni Şoför Ekle</h2>
              <form onSubmit={handleAddSofor} className="space-y-4">
                <div className="space-y-2">
                  <Label>Şoför Adı</Label>
                  <Input
                    value={newSofor.name}
                    onChange={(e) => setNewSofor({ ...newSofor, name: e.target.value })}
                    placeholder="Ad Soyad"
                    required
                    className="h-12 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon (Opsiyonel)</Label>
                  <Input
                    value={newSofor.phone}
                    onChange={(e) => setNewSofor({ ...newSofor, phone: e.target.value })}
                    placeholder="0532 XXX XX XX"
                    className="h-12 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ehliyet No (Opsiyonel)</Label>
                  <Input
                    value={newSofor.license_no}
                    onChange={(e) => setNewSofor({ ...newSofor, license_no: e.target.value })}
                    placeholder="Ehliyet numarası"
                    className="h-12 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nakliyeci Firma (Opsiyonel)</Label>
                  <Select value={newSofor.nakliyeci_id} onValueChange={(value) => setNewSofor({ ...newSofor, nakliyeci_id: value })}>
                    <SelectTrigger className="h-12 bg-slate-950 border-slate-800 text-white">
                      <SelectValue placeholder="Nakliyeci seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {nakliyeciFirmalar.map((n) => (
                        <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Ekle
                </Button>
              </form>
            </div>

            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Şoför Listesi ({soforler.length})</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {soforler.length > 0 ? (
                  soforler.map((sofor) => (
                    <div key={sofor.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <div>
                        <h3 className="font-semibold text-white">{sofor.name}</h3>
                        {sofor.phone && <p className="text-sm text-slate-400">Tel: {sofor.phone}</p>}
                        {sofor.license_no && <p className="text-sm text-slate-400">Ehliyet: {sofor.license_no}</p>}
                        {sofor.nakliyeci_name && <p className="text-sm text-slate-400">Nakliyeci: {sofor.nakliyeci_name}</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteSoforId(sofor.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">Henüz şoför eklenmedi</div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Şehirler Tab */}
        <TabsContent value="sehirler">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Yeni Şehir Ekle</h2>
              <form onSubmit={handleAddSehir} className="space-y-4">
                <div className="space-y-2">
                  <Label>Şehir Adı</Label>
                  <Input
                    value={newSehir.name}
                    onChange={(e) => setNewSehir({ ...newSehir, name: e.target.value })}
                    placeholder="Örn: İstanbul"
                    required
                    className="h-12 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plaka Kodu (Opsiyonel)</Label>
                  <Input
                    value={newSehir.code}
                    onChange={(e) => setNewSehir({ ...newSehir, code: e.target.value })}
                    placeholder="34"
                    maxLength={2}
                    className="h-12 bg-slate-950 border-slate-800 text-white font-mono"
                  />
                </div>
                <Button type="submit" className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Ekle
                </Button>
              </form>
            </div>

            <div className="glass-effect rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-semibold text-white mb-6">Şehir Listesi ({sehirler.length})</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sehirler.length > 0 ? (
                  sehirler.map((sehir) => (
                    <div key={sehir.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded">{sehir.code || '--'}</span>
                        <h3 className="font-semibold text-white">{sehir.name}</h3>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteSehirId(sehir.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">Henüz şehir eklenmedi</div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Dialogs */}
      <AlertDialog open={!!deleteCimentoFirmaId} onOpenChange={() => setDeleteCimentoFirmaId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Bu çimento firmasını silmek istediğinize emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700">İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCimentoFirma} className="bg-red-500 hover:bg-red-600 text-white">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteNakliyeciFirmaId} onOpenChange={() => setDeleteNakliyeciFirmaId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Bu nakliyeci firmasını silmek istediğinize emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700">İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNakliyeciFirma} className="bg-red-500 hover:bg-red-600 text-white">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePlakaId} onOpenChange={() => setDeletePlakaId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Bu plakayı silmek istediğinize emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700">İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlaka} className="bg-red-500 hover:bg-red-600 text-white">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSoforId} onOpenChange={() => setDeleteSoforId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Bu şoförü silmek istediğinize emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700">İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSofor} className="bg-red-500 hover:bg-red-600 text-white">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSehirId} onOpenChange={() => setDeleteSehirId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Bu şehri silmek istediğinize emin misiniz?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700">İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSehir} className="bg-red-500 hover:bg-red-600 text-white">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CimentoResources;
