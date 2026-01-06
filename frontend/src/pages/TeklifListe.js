import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Send,
  CheckCircle,
  XCircle,
  MoreVertical
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TeklifListe = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [teklifler, setTeklifler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [durumFilter, setDurumFilter] = useState('');
  const [selectedTeklif, setSelectedTeklif] = useState(null);

  useEffect(() => {
    fetchTeklifler();
  }, [durumFilter]);

  const fetchTeklifler = async () => {
    try {
      let url = `${API_URL}/api/teklifler`;
      if (durumFilter) {
        url += `?durum=${durumFilter}`;
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTeklifler(data);
      }
    } catch (error) {
      console.error('Teklifler yüklenirken hata:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu teklifi silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/teklifler/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Teklif silindi');
        fetchTeklifler();
      } else {
        toast.error('Silme işlemi başarısız');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleDurumChange = async (id, yeniDurum) => {
    try {
      const response = await fetch(`${API_URL}/api/teklifler/${id}/durum?durum=${yeniDurum}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Durum güncellendi');
        fetchTeklifler();
        setSelectedTeklif(null);
      } else {
        toast.error('Güncelleme başarısız');
      }
    } catch (error) {
      console.error('Durum güncelleme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);
  };

  const getDurumBadge = (durum) => {
    const durumlar = {
      taslak: { label: 'Taslak', color: 'bg-slate-500', textColor: 'text-slate-100' },
      gonderildi: { label: 'Gönderildi', color: 'bg-blue-500', textColor: 'text-blue-100' },
      beklemede: { label: 'Beklemede', color: 'bg-yellow-500', textColor: 'text-yellow-100' },
      kabul_edildi: { label: 'Kabul Edildi', color: 'bg-green-500', textColor: 'text-green-100' },
      reddedildi: { label: 'Reddedildi', color: 'bg-red-500', textColor: 'text-red-100' },
      iptal: { label: 'İptal', color: 'bg-gray-500', textColor: 'text-gray-100' }
    };
    const d = durumlar[durum] || { label: durum, color: 'bg-slate-500', textColor: 'text-slate-100' };
    return <span className={`px-2 py-1 rounded text-xs ${d.color} ${d.textColor}`}>{d.label}</span>;
  };

  const filteredTeklifler = teklifler.filter(t =>
    t.teklif_no?.toLowerCase().includes(search.toLowerCase()) ||
    t.musteri_adi?.toLowerCase().includes(search.toLowerCase()) ||
    t.konu?.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-white">Teklif Listesi</h1>
          <p className="text-slate-400 text-sm">Tüm tekliflerinizi görüntüleyin</p>
        </div>
        <Link
          to="/teklif-olustur"
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Yeni Teklif
        </Link>
      </div>

      {/* Filtreler */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Teklif no, müşteri veya konu ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white"
          />
        </div>
        
        <select
          value={durumFilter}
          onChange={(e) => setDurumFilter(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
        >
          <option value="">Tüm Durumlar</option>
          <option value="taslak">Taslak</option>
          <option value="gonderildi">Gönderildi</option>
          <option value="beklemede">Beklemede</option>
          <option value="kabul_edildi">Kabul Edildi</option>
          <option value="reddedildi">Reddedildi</option>
          <option value="iptal">İptal</option>
        </select>
      </div>

      {/* Tablo */}
      <div className="glass-effect rounded-xl border border-slate-800 overflow-hidden">
        {filteredTeklifler.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="text-left py-4 px-4 text-slate-400 font-medium">Teklif No</th>
                  <th className="text-left py-4 px-4 text-slate-400 font-medium">Müşteri</th>
                  <th className="text-left py-4 px-4 text-slate-400 font-medium">Konu</th>
                  <th className="text-left py-4 px-4 text-slate-400 font-medium">Tarih</th>
                  <th className="text-right py-4 px-4 text-slate-400 font-medium">Tutar</th>
                  <th className="text-center py-4 px-4 text-slate-400 font-medium">Durum</th>
                  <th className="text-center py-4 px-4 text-slate-400 font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeklifler.map((teklif) => (
                  <tr key={teklif.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="py-4 px-4">
                      <span className="text-teal-500 font-medium">{teklif.teklif_no}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-white">{teklif.musteri_adi}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-slate-300 max-w-xs truncate">{teklif.konu || '-'}</div>
                    </td>
                    <td className="py-4 px-4 text-slate-400">{teklif.teklif_tarihi}</td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-white font-medium">{formatCurrency(teklif.genel_toplam)}</span>
                    </td>
                    <td className="py-4 px-4 text-center">{getDurumBadge(teklif.durum)}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/teklif-duzenle/${teklif.id}`)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <div className="relative">
                          <button
                            onClick={() => setSelectedTeklif(selectedTeklif === teklif.id ? null : teklif.id)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                            title="Durum Değiştir"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {selectedTeklif === teklif.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
                              <div className="py-1">
                                {teklif.durum !== 'gonderildi' && (
                                  <button
                                    onClick={() => handleDurumChange(teklif.id, 'gonderildi')}
                                    className="w-full px-4 py-2 text-left text-sm text-blue-400 hover:bg-slate-700 flex items-center gap-2"
                                  >
                                    <Send className="w-4 h-4" /> Gönderildi
                                  </button>
                                )}
                                {teklif.durum !== 'beklemede' && (
                                  <button
                                    onClick={() => handleDurumChange(teklif.id, 'beklemede')}
                                    className="w-full px-4 py-2 text-left text-sm text-yellow-400 hover:bg-slate-700 flex items-center gap-2"
                                  >
                                    <Eye className="w-4 h-4" /> Beklemede
                                  </button>
                                )}
                                {teklif.durum !== 'kabul_edildi' && (
                                  <button
                                    onClick={() => handleDurumChange(teklif.id, 'kabul_edildi')}
                                    className="w-full px-4 py-2 text-left text-sm text-green-400 hover:bg-slate-700 flex items-center gap-2"
                                  >
                                    <CheckCircle className="w-4 h-4" /> Kabul Edildi
                                  </button>
                                )}
                                {teklif.durum !== 'reddedildi' && (
                                  <button
                                    onClick={() => handleDurumChange(teklif.id, 'reddedildi')}
                                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                                  >
                                    <XCircle className="w-4 h-4" /> Reddedildi
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleDelete(teklif.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-2">Henüz teklif bulunmuyor</div>
            <Link to="/teklif-olustur" className="text-teal-500 hover:text-teal-400">
              İlk teklifinizi oluşturun
            </Link>
          </div>
        )}
      </div>

      {/* Dropdown kapatma overlay */}
      {selectedTeklif && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setSelectedTeklif(null)}
        />
      )}
    </div>
  );
};

export default TeklifListe;
