import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SortableTable } from '@/components/SortableTable';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, ArrowLeft, FileText, Check, DollarSign, Pencil, Trash2, Calculator, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const emptyBordro = (yil, ay) => ({
  personel_id: '',
  personel_adi: '',
  yil,
  ay,
  brut_maas: 0,
  fazla_mesai_ucreti: 0,
  pazar_ucreti: 0,
  resmi_tatil_ucreti: 0,
  fazla_mesai_saat: 0,
  pazar_gun: 0,
  resmi_tatil_gun: 0,
  ikramiye: 0,
  kesintiler: 0,
  // Durum bazlı ek ücret toplamı + breakdown
  durum_ek_ucret_toplam: 0,
  durum_ek_kalemleri: null,
});

// Backend'den dönen durum_ek_kalemleri'yi insan dostu hale çevirmek için etiket eşleme
const DURUM_EK_LABEL = {
  izinli: 'İzinli',
  raporlu: 'Raporlu',
  hafta_tatili: 'Hafta Tatili',
  resmi_tatil: 'Resmi Tatil',
  bayram_tatili: 'Bayram Tatili',
  izinsiz_gelmedi: 'İzinsiz Gelmedi',
  olum_izni: 'Ölüm İzni',
  dogum_izni: 'Doğum İzni',
};

// "Olağan dışı çarpan 0" uyarısı: bu durumlar yasal olarak 1.0 olmalı, 0 ise dikkat
const BEKLENEN_CARPAN_1 = new Set(['izinli', 'hafta_tatili', 'resmi_tatil', 'bayram_tatili']);

// Bordro modal uyarı paneli — hesap sonrası kullanılır
const BordroUyariBaneri = ({ kalemler }) => {
  if (!kalemler) return null;
  const uyarilar = [];
  Object.entries(kalemler).forEach(([k, v]) => {
    if ((v.gun || 0) > 0 && (v.carpan || 0) === 0 && BEKLENEN_CARPAN_1.has(k)) {
      uyarilar.push(`"${DURUM_EK_LABEL[k]}" için ${v.gun} gün var ama çarpan 0; ücret yansıtılmadı. Personel kartından çarpanı kontrol edin.`);
    }
  });
  return (
    <div className="rounded-md border border-blue-700/50 bg-blue-900/15 p-3 text-xs space-y-2" data-testid="bordro-uyari-banner">
      <div className="flex items-start gap-2 text-blue-300">
        <span>💡</span>
        <div>
          <strong>Bilgi:</strong> "Bayram Çalıştı" çarpanı bordroda kullanılmaz; R. Tatil Çalıştı Çarpanı'na göre hesaplanır (çift ödeme önlenir).
        </div>
      </div>
      {uyarilar.map((u, i) => (
        <div key={i} className="flex items-start gap-2 text-amber-300 border-t border-blue-700/30 pt-2">
          <span>⚠️</span>
          <div>{u}</div>
        </div>
      ))}
    </div>
  );
};

const MaasBordrosu = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();

  const [bordrolar, setBordrolar] = useState([]);
  const [yillikBordrolar, setYillikBordrolar] = useState([]);  // yıl boyu trend için
  const [personeller, setPersoneller] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBordro, setEditingBordro] = useState(null);
  const [selectedYil, setSelectedYil] = useState(new Date().getFullYear());
  const [selectedAy, setSelectedAy] = useState(new Date().getMonth() + 1);
  const [hesaplaLoading, setHesaplaLoading] = useState(false);

  const [newBordro, setNewBordro] = useState(emptyBordro(new Date().getFullYear(), new Date().getMonth() + 1));

  const headers = { Authorization: `Bearer ${token}` };

  const aylar = [
    { value: 1, label: 'Ocak' },
    { value: 2, label: 'Şubat' },
    { value: 3, label: 'Mart' },
    { value: 4, label: 'Nisan' },
    { value: 5, label: 'Mayıs' },
    { value: 6, label: 'Haziran' },
    { value: 7, label: 'Temmuz' },
    { value: 8, label: 'Ağustos' },
    { value: 9, label: 'Eylül' },
    { value: 10, label: 'Ekim' },
    { value: 11, label: 'Kasım' },
    { value: 12, label: 'Aralık' },
  ];

  const fetchBordrolar = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/maas-bordrolari?yil=${selectedYil}&ay=${selectedAy}`, { headers });
      setBordrolar(response.data);
    } catch (e) {
      console.error(e);
      toast.error('Bordrolar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedYil, selectedAy]);

  // Yıllık (12 ay) bordroları çek — trend grafiği için
  const fetchYillikBordrolar = useCallback(async () => {
    try {
      const resp = await axios.get(`${API_URL}/maas-bordrolari?yil=${selectedYil}`, { headers });
      setYillikBordrolar(resp.data || []);
    } catch (e) {
      console.error(e);
      setYillikBordrolar([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedYil]);

  const fetchPersoneller = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/personeller`, { headers });
      setPersoneller(response.data.filter(p => p.aktif));
    } catch (e) {
      console.error(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!currentModule || currentModule.id !== 'personel') {
      navigate('/');
      return;
    }
    fetchBordrolar();
    fetchYillikBordrolar();
    fetchPersoneller();
  }, [currentModule, fetchBordrolar, fetchYillikBordrolar, fetchPersoneller, navigate]);

  // Puantajdan ücret kalemlerini hesapla
  const hesaplaPuantajdan = async (personel_id, yil, ay) => {
    if (!personel_id) return null;
    try {
      setHesaplaLoading(true);
      const resp = await axios.post(`${API_URL}/maas-bordrolari/hesapla`, {
        personel_id, yil, ay,
      }, { headers });
      return resp.data;
    } catch (e) {
      console.error(e);
      toast.error('Puantajdan hesaplama başarısız');
      return null;
    } finally {
      setHesaplaLoading(false);
    }
  };

  const handlePersonelSelect = async (personelId) => {
    const personel = personeller.find(p => p.id === personelId);
    const base = {
      ...newBordro,
      personel_id: personelId,
      personel_adi: personel?.ad_soyad || '',
      brut_maas: personel?.maas || 0,
    };
    setNewBordro(base);
    // Otomatik puantajdan hesapla
    const hesap = await hesaplaPuantajdan(personelId, base.yil, base.ay);
    if (hesap) {
      setNewBordro(prev => ({
        ...prev,
        brut_maas: hesap.brut_maas || prev.brut_maas,
        fazla_mesai_ucreti: hesap.fazla_mesai_ucreti || 0,
        pazar_ucreti: hesap.pazar_ucreti || 0,
        resmi_tatil_ucreti: hesap.resmi_tatil_ucreti || 0,
        fazla_mesai_saat: hesap.fazla_mesai_saat || 0,
        pazar_gun: hesap.pazar_gun || 0,
        resmi_tatil_gun: hesap.resmi_tatil_gun || 0,
        durum_ek_ucret_toplam: hesap.durum_ek_ucret_toplam || 0,
        durum_ek_kalemleri: hesap.durum_ek_kalemleri || null,
      }));
      const eski3 = (hesap.fazla_mesai_ucreti || 0) + (hesap.pazar_ucreti || 0) + (hesap.resmi_tatil_ucreti || 0);
      const yeniEk = hesap.durum_ek_ucret_toplam || 0;
      if (eski3 + yeniEk > 0) {
        toast.success(
          `Hesaplandı: F.Mesai ${hesap.fazla_mesai_saat}sa, Pazar ${hesap.pazar_gun}g, R.Tatil Çal. ${hesap.resmi_tatil_gun}g, Durum Ek: ₺${yeniEk.toLocaleString('tr-TR')}`
        );
      } else {
        toast.info('Seçili dönemde ek ücret kalemi bulunamadı');
      }
    }
  };

  // Yıl/Ay değiştiğinde yeni bordro açıksa otomatik yeniden hesapla
  const handleNewBordroYilAyChange = async (changes) => {
    const updated = { ...newBordro, ...changes };
    setNewBordro(updated);
    if (updated.personel_id) {
      const hesap = await hesaplaPuantajdan(updated.personel_id, updated.yil, updated.ay);
      if (hesap) {
        setNewBordro(prev => ({
          ...prev,
          ...changes,
          fazla_mesai_ucreti: hesap.fazla_mesai_ucreti || 0,
          pazar_ucreti: hesap.pazar_ucreti || 0,
          resmi_tatil_ucreti: hesap.resmi_tatil_ucreti || 0,
          fazla_mesai_saat: hesap.fazla_mesai_saat || 0,
          pazar_gun: hesap.pazar_gun || 0,
          resmi_tatil_gun: hesap.resmi_tatil_gun || 0,
          durum_ek_ucret_toplam: hesap.durum_ek_ucret_toplam || 0,
          durum_ek_kalemleri: hesap.durum_ek_kalemleri || null,
        }));
      }
    }
  };

  const handleAddBordro = async () => {
    if (!newBordro.personel_id) {
      toast.error('Personel seçiniz');
      return;
    }
    try {
      const payload = {
        ...newBordro,
        durum_detay_json: newBordro.durum_ek_kalemleri ? JSON.stringify(newBordro.durum_ek_kalemleri) : '',
      };
      await axios.post(`${API_URL}/maas-bordrolari`, payload, { headers });
      toast.success('Bordro oluşturuldu');
      setNewBordro(emptyBordro(selectedYil, selectedAy));
      setIsAddDialogOpen(false);
      fetchBordrolar();
      fetchYillikBordrolar();
    } catch (e) {
      console.error(e);
      toast.error('Bordro oluşturulurken hata oluştu');
    }
  };

  const handleOdendi = async (id) => {
    try {
      await axios.put(`${API_URL}/maas-bordrolari/${id}/odendi`, {}, { headers });
      toast.success('Ödeme kaydedildi');
      fetchBordrolar();
      fetchYillikBordrolar();
    } catch (e) {
      console.error(e);
      toast.error('İşlem başarısız');
    }
  };

  const handleEditBordro = (bordro) => {
    // DB'den gelen durum_detay_json'u parse edip kalemleri kullanılabilir hale getir
    let durum_ek_kalemleri = null;
    try {
      if (bordro.durum_detay_json) durum_ek_kalemleri = JSON.parse(bordro.durum_detay_json);
    } catch (e) {
      durum_ek_kalemleri = null;
    }
    setEditingBordro({ ...bordro, durum_ek_kalemleri });
    setIsEditDialogOpen(true);
  };

  // Düzenleme ekranında: Puantajdan yeniden hesapla butonu
  const handleEditHesaplaPuantaj = async () => {
    if (!editingBordro) return;
    const hesap = await hesaplaPuantajdan(editingBordro.personel_id, editingBordro.yil, editingBordro.ay);
    if (hesap) {
      setEditingBordro(prev => ({
        ...prev,
        fazla_mesai_ucreti: hesap.fazla_mesai_ucreti || 0,
        pazar_ucreti: hesap.pazar_ucreti || 0,
        resmi_tatil_ucreti: hesap.resmi_tatil_ucreti || 0,
        fazla_mesai_saat: hesap.fazla_mesai_saat || 0,
        pazar_gun: hesap.pazar_gun || 0,
        resmi_tatil_gun: hesap.resmi_tatil_gun || 0,
        durum_ek_ucret_toplam: hesap.durum_ek_ucret_toplam || 0,
        durum_ek_kalemleri: hesap.durum_ek_kalemleri || null,
      }));
      const yeniEk = hesap.durum_ek_ucret_toplam || 0;
      toast.success(
        `F.Mesai ${hesap.fazla_mesai_saat}sa, Pazar ${hesap.pazar_gun}g, R.Tatil Çal. ${hesap.resmi_tatil_gun}g, Durum Ek: ₺${yeniEk.toLocaleString('tr-TR')}`
      );
    }
  };

  const handleUpdateBordro = async () => {
    if (!editingBordro) return;
    try {
      const payload = {
        personel_id: editingBordro.personel_id,
        personel_adi: editingBordro.personel_adi,
        yil: editingBordro.yil,
        ay: editingBordro.ay,
        brut_maas: parseFloat(editingBordro.brut_maas) || 0,
        fazla_mesai_ucreti: parseFloat(editingBordro.fazla_mesai_ucreti) || 0,
        pazar_ucreti: parseFloat(editingBordro.pazar_ucreti) || 0,
        resmi_tatil_ucreti: parseFloat(editingBordro.resmi_tatil_ucreti) || 0,
        fazla_mesai_saat: parseFloat(editingBordro.fazla_mesai_saat) || 0,
        pazar_gun: parseInt(editingBordro.pazar_gun) || 0,
        resmi_tatil_gun: parseInt(editingBordro.resmi_tatil_gun) || 0,
        ikramiye: parseFloat(editingBordro.ikramiye) || 0,
        kesintiler: parseFloat(editingBordro.kesintiler) || 0,
        odendi: !!editingBordro.odendi,
        odeme_tarihi: editingBordro.odeme_tarihi || '',
        durum_ek_ucret_toplam: parseFloat(editingBordro.durum_ek_ucret_toplam) || 0,
        durum_detay_json: editingBordro.durum_ek_kalemleri
          ? JSON.stringify(editingBordro.durum_ek_kalemleri)
          : (editingBordro.durum_detay_json || ''),
      };
      await axios.put(`${API_URL}/maas-bordrolari/${editingBordro.id}`, payload, { headers });
      toast.success('Bordro güncellendi');
      setIsEditDialogOpen(false);
      setEditingBordro(null);
      fetchBordrolar();
      fetchYillikBordrolar();
    } catch (e) {
      console.error(e);
      toast.error('Güncelleme başarısız');
    }
  };

  const handleDeleteBordro = async (id) => {
    if (window.confirm('Bu bordroyu silmek istediğinize emin misiniz?')) {
      try {
        await axios.delete(`${API_URL}/maas-bordrolari/${id}`, { headers });
        toast.success('Bordro silindi');
        fetchBordrolar();
      } catch (e) {
        console.error(e);
        toast.error('Silme işlemi başarısız');
      }
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);
  };

  const toplamlar = bordrolar.reduce((acc, b) => ({
    brut: acc.brut + (b.brut_maas || 0),
    net: acc.net + (b.net_maas || 0),
    toplam: acc.toplam + (b.toplam_odeme || 0),
    durum_ek: acc.durum_ek + (b.durum_ek_ucret_toplam || 0),
  }), { brut: 0, net: 0, toplam: 0, durum_ek: 0 });

  // Aylık özet: tüm personel için her durumun toplam ücreti ve gün sayısı
  // (Her bordronun durum_detay_json'undan toplulaştırılır)
  const aylikDurumOzeti = (() => {
    const acc = {};
    bordrolar.forEach(b => {
      if (!b.durum_detay_json) return;
      try {
        const detay = JSON.parse(b.durum_detay_json);
        Object.entries(detay).forEach(([k, v]) => {
          if (!acc[k]) acc[k] = { gun: 0, ucret: 0 };
          acc[k].gun += v.gun || 0;
          acc[k].ucret += v.ucret || 0;
        });
      } catch (_) { /* yok say */ }
    });
    return acc;
  })();

  // Yıllık trend: seçili yıl boyu 12 ay için durum ek ücret toplamları + diğer kalemler
  const yillikTrendData = (() => {
    const ayKisalt = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const rows = ayKisalt.map((label, idx) => ({
      ay: label,
      ayNo: idx + 1,
      durum_ek: 0,
      fazla_mesai: 0,
      pazar: 0,
      resmi_tatil: 0,
      toplam: 0,
    }));
    yillikBordrolar.forEach(b => {
      const i = (b.ay || 1) - 1;
      if (i < 0 || i > 11) return;
      rows[i].durum_ek += b.durum_ek_ucret_toplam || 0;
      rows[i].fazla_mesai += b.fazla_mesai_ucreti || 0;
      rows[i].pazar += b.pazar_ucreti || 0;
      rows[i].resmi_tatil += b.resmi_tatil_ucreti || 0;
      rows[i].toplam += b.toplam_odeme || 0;
    });
    return rows;
  })();
  const yillikVarMi = yillikTrendData.some(r => r.durum_ek + r.fazla_mesai + r.pazar + r.resmi_tatil > 0);

  // Excel export — Bordrolar + Durum Ek Detayı sheet'leri
  const exportToExcel = () => {
    try {
      const ayLabel = aylar.find(a => a.value === selectedAy)?.label || '';
      // Sheet 1: Bordro listesi (durum_ek_ucret_toplam dahil)
      const bordroRows = bordrolar.map(b => ({
        'Personel': b.personel_adi || '',
        'Brüt Maaş': Number((b.brut_maas || 0).toFixed(2)),
        'SGK İşçi': Number((b.sgk_isci || 0).toFixed(2)),
        'Gelir Vergisi': Number((b.gelir_vergisi || 0).toFixed(2)),
        'Damga Vergisi': Number((b.damga_vergisi || 0).toFixed(2)),
        'Net Maaş': Number((b.net_maas || 0).toFixed(2)),
        'F.Mesai Saat': Number((b.fazla_mesai_saat || 0).toFixed(2)),
        'F.Mesai Ücreti': Number((b.fazla_mesai_ucreti || 0).toFixed(2)),
        'Pazar Gün': b.pazar_gun || 0,
        'Pazar Ücreti': Number((b.pazar_ucreti || 0).toFixed(2)),
        'R.Tatil Gün': b.resmi_tatil_gun || 0,
        'R.Tatil Ücreti': Number((b.resmi_tatil_ucreti || 0).toFixed(2)),
        'Durum Ek Toplam': Number((b.durum_ek_ucret_toplam || 0).toFixed(2)),
        'İkramiye': Number((b.ikramiye || 0).toFixed(2)),
        'Kesintiler': Number((b.kesintiler || 0).toFixed(2)),
        'Toplam Ödeme': Number((b.toplam_odeme || 0).toFixed(2)),
        'Durum': b.odendi ? 'Ödendi' : 'Bekliyor',
      }));
      const wsBordro = XLSX.utils.json_to_sheet(bordroRows);

      // Sheet 2: Durum Ek Detayı — her bordro için 7 durum × (gün, çarpan, ücret)
      const detayHeader = [
        'Personel',
        ...Object.keys(DURUM_EK_LABEL).flatMap(k => [
          `${DURUM_EK_LABEL[k]} Gün`,
          `${DURUM_EK_LABEL[k]} Çarpan`,
          `${DURUM_EK_LABEL[k]} Ücret`,
        ]),
        'Toplam Durum Ek Ücret',
      ];
      const detayRows = bordrolar.map(b => {
        let detay = {};
        try { if (b.durum_detay_json) detay = JSON.parse(b.durum_detay_json); } catch (_) {}
        const row = [b.personel_adi || ''];
        Object.keys(DURUM_EK_LABEL).forEach(k => {
          const v = detay[k] || { gun: 0, carpan: 0, ucret: 0 };
          row.push(v.gun || 0);
          row.push(v.carpan || 0);
          row.push(Number((v.ucret || 0).toFixed(2)));
        });
        row.push(Number((b.durum_ek_ucret_toplam || 0).toFixed(2)));
        return row;
      });
      const wsDetay = XLSX.utils.aoa_to_sheet([detayHeader, ...detayRows]);

      // Sheet 3: Aylık Özet (tüm personel toplamı per durum)
      const ozetRows = Object.entries(aylikDurumOzeti).map(([k, v]) => ({
        'Durum': DURUM_EK_LABEL[k] || k,
        'Toplam Gün': v.gun,
        'Toplam Ücret (₺)': Number((v.ucret || 0).toFixed(2)),
      }));
      const wsOzet = XLSX.utils.json_to_sheet(ozetRows);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsBordro, 'Bordrolar');
      XLSX.utils.book_append_sheet(wb, wsDetay, 'Durum Ek Detayı');
      XLSX.utils.book_append_sheet(wb, wsOzet, 'Aylık Durum Özeti');
      XLSX.writeFile(wb, `bordro_${selectedYil}_${String(selectedAy).padStart(2, '0')}_${ayLabel.toLowerCase()}.xlsx`);
      toast.success('Excel raporu indirildi');
    } catch (e) {
      console.error(e);
      toast.error('Excel oluşturulurken hata oluştu');
    }
  };

  // PDF export — yazdırılabilir HTML
  const exportToPDF = () => {
    const ayLabel = aylar.find(a => a.value === selectedAy)?.label || '';
    const fmt = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n || 0);
    const ozetSatirlari = Object.entries(aylikDurumOzeti)
      .filter(([_, v]) => (v.gun || 0) > 0)
      .map(([k, v]) => `<tr><td>${DURUM_EK_LABEL[k] || k}</td><td style="text-align:center">${v.gun}</td><td style="text-align:right">${fmt(v.ucret)}</td></tr>`).join('');

    const bordroSatirlari = bordrolar.map(b => {
      let detay = {};
      try { if (b.durum_detay_json) detay = JSON.parse(b.durum_detay_json); } catch (_) {}
      const detayParcalari = Object.entries(detay)
        .filter(([_, v]) => (v.ucret || 0) > 0)
        .map(([k, v]) => `${DURUM_EK_LABEL[k] || k}: ${v.gun}g×${v.carpan}=${fmt(v.ucret)}`)
        .join(' • ') || '-';
      return `
        <tr>
          <td>${b.personel_adi || ''}</td>
          <td style="text-align:right">${fmt(b.brut_maas)}</td>
          <td style="text-align:right">${fmt(b.net_maas)}</td>
          <td style="text-align:right">${fmt(b.fazla_mesai_ucreti)}</td>
          <td style="text-align:right">${fmt(b.pazar_ucreti)}</td>
          <td style="text-align:right">${fmt(b.resmi_tatil_ucreti)}</td>
          <td style="text-align:right; color:#b45309; font-weight:600">${fmt(b.durum_ek_ucret_toplam)}</td>
          <td style="text-align:right; font-weight:700">${fmt(b.toplam_odeme)}</td>
        </tr>
        <tr><td colspan="8" style="font-size:11px; color:#666; background:#fafafa; padding:4px 8px"><em>Durum Ek Detayı:</em> ${detayParcalari}</td></tr>`;
    }).join('');

    const html = `
      <!DOCTYPE html><html><head><title>Maaş Bordrosu - ${ayLabel} ${selectedYil}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
        h1{border-bottom:2px solid #333;padding-bottom:8px}
        h2{margin-top:24px;color:#444}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border:1px solid #ddd;padding:6px 8px}
        th{background:#f5f5f5}
      </style></head><body>
        <h1>Maaş Bordrosu Raporu — ${ayLabel} ${selectedYil}</h1>
        <p><strong>Toplam Bordro:</strong> ${bordrolar.length} | <strong>Toplam Brüt:</strong> ${fmt(toplamlar.brut)} | <strong>Toplam Net:</strong> ${fmt(toplamlar.net)} | <strong>Durum Ek Toplam:</strong> ${fmt(toplamlar.durum_ek)} | <strong>Toplam Ödeme:</strong> ${fmt(toplamlar.toplam)}</p>

        <h2>Aylık Durum Özeti (Tüm Personel)</h2>
        ${ozetSatirlari ? `<table><thead><tr><th>Durum</th><th>Toplam Gün</th><th>Toplam Ücret</th></tr></thead><tbody>${ozetSatirlari}</tbody></table>` : '<p><em>Bu dönemde durum ek ücret kaydı bulunmuyor.</em></p>'}

        <h2>Bordro Detayları</h2>
        <table>
          <thead><tr>
            <th>Personel</th><th>Brüt</th><th>Net</th><th>F.Mesai</th><th>Pazar</th><th>R.Tatil</th><th>Durum Ek</th><th>Toplam</th>
          </tr></thead>
          <tbody>${bordroSatirlari}</tbody>
        </table>
      </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.print();
    toast.success('PDF raporu hazırlandı');
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Geri
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Maaş Bordrosu</h1>
            <p className="text-slate-400">Aylık maaş hesaplama ve bordro yönetimi (Puantajdan otomatik fazla mesai / pazar / resmi tatil)</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportToExcel} variant="outline" className="border-green-600 text-green-400 hover:bg-green-600/20" data-testid="export-excel-btn">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
            </Button>
            <Button onClick={exportToPDF} variant="outline" className="border-red-600 text-red-400 hover:bg-red-600/20" data-testid="export-pdf-btn">
              <FileText className="w-4 h-4 mr-2" /> PDF
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={(o) => { setIsAddDialogOpen(o); if (!o) setNewBordro(emptyBordro(selectedYil, selectedAy)); }}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" /> Yeni Bordro Oluştur
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Yeni Maaş Bordrosu</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Personel</Label>
                  <Select value={newBordro.personel_id} onValueChange={handlePersonelSelect}>
                    <SelectTrigger className="bg-slate-950 border-slate-700">
                      <SelectValue placeholder="Personel seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {personeller.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.ad_soyad} - {formatCurrency(p.maas)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Yıl</Label>
                    <Select value={String(newBordro.yil)} onValueChange={(v) => handleNewBordroYilAyChange({ yil: parseInt(v) })}>
                      <SelectTrigger className="bg-slate-950 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        {[2024, 2025, 2026].map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ay</Label>
                    <Select value={String(newBordro.ay)} onValueChange={(v) => handleNewBordroYilAyChange({ ay: parseInt(v) })}>
                      <SelectTrigger className="bg-slate-950 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        {aylar.map(a => (
                          <SelectItem key={a.value} value={String(a.value)}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Brüt Maaş (₺)</Label>
                  <Input
                    type="number"
                    value={newBordro.brut_maas}
                    onChange={(e) => setNewBordro({ ...newBordro, brut_maas: parseFloat(e.target.value) || 0 })}
                    className="bg-slate-950 border-slate-700"
                  />
                </div>

                {/* Puantajdan otomatik hesaplanan kalemler */}
                <div className="rounded-md border border-purple-700/50 bg-purple-900/10 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                      <Calculator className="w-4 h-4" />
                      Puantajdan Hesaplanan Kalemler
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-purple-700 text-purple-300 hover:bg-purple-900/20"
                      disabled={!newBordro.personel_id || hesaplaLoading}
                      onClick={async () => {
                        const hesap = await hesaplaPuantajdan(newBordro.personel_id, newBordro.yil, newBordro.ay);
                        if (hesap) {
                          setNewBordro(prev => ({
                            ...prev,
                            fazla_mesai_ucreti: hesap.fazla_mesai_ucreti || 0,
                            pazar_ucreti: hesap.pazar_ucreti || 0,
                            resmi_tatil_ucreti: hesap.resmi_tatil_ucreti || 0,
                            fazla_mesai_saat: hesap.fazla_mesai_saat || 0,
                            pazar_gun: hesap.pazar_gun || 0,
                            resmi_tatil_gun: hesap.resmi_tatil_gun || 0,
                          }));
                          toast.success('Yeniden hesaplandı');
                        }
                      }}
                    >
                      {hesaplaLoading ? 'Hesaplanıyor...' : 'Yeniden Hesapla'}
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-slate-400">F. Mesai Saat</Label>
                      <Input
                        type="number"
                        value={newBordro.fazla_mesai_saat}
                        onChange={(e) => setNewBordro({ ...newBordro, fazla_mesai_saat: parseFloat(e.target.value) || 0 })}
                        className="bg-slate-950 border-slate-700"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Pazar Gün</Label>
                      <Input
                        type="number"
                        value={newBordro.pazar_gun}
                        onChange={(e) => setNewBordro({ ...newBordro, pazar_gun: parseInt(e.target.value) || 0 })}
                        className="bg-slate-950 border-slate-700"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">R. Tatil Gün</Label>
                      <Input
                        type="number"
                        value={newBordro.resmi_tatil_gun}
                        onChange={(e) => setNewBordro({ ...newBordro, resmi_tatil_gun: parseInt(e.target.value) || 0 })}
                        className="bg-slate-950 border-slate-700"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">F. Mesai Ücreti (₺)</Label>
                      <Input
                        type="number"
                        value={newBordro.fazla_mesai_ucreti}
                        onChange={(e) => setNewBordro({ ...newBordro, fazla_mesai_ucreti: parseFloat(e.target.value) || 0 })}
                        className="bg-slate-950 border-slate-700"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">Pazar Ücreti (₺)</Label>
                      <Input
                        type="number"
                        value={newBordro.pazar_ucreti}
                        onChange={(e) => setNewBordro({ ...newBordro, pazar_ucreti: parseFloat(e.target.value) || 0 })}
                        className="bg-slate-950 border-slate-700"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400">R. Tatil Ücreti (₺)</Label>
                      <Input
                        type="number"
                        value={newBordro.resmi_tatil_ucreti}
                        onChange={(e) => setNewBordro({ ...newBordro, resmi_tatil_ucreti: parseFloat(e.target.value) || 0 })}
                        className="bg-slate-950 border-slate-700"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Formül: F.Mesai = ⌈(Maaş/30/8) × Çarpan × Saat⌉, Pazar/Tatil = ⌈(Maaş/30) × Çarpan × Gün⌉ (yukarı yuvarlanmış)
                  </p>
                </div>

                {/* Durum Bazlı Ek Ücretler — yeni durum çarpanlarıyla hesaplanır */}
                {newBordro.durum_ek_kalemleri && (
                  <>
                    <BordroUyariBaneri kalemler={newBordro.durum_ek_kalemleri} />
                    <div className="rounded-md border border-amber-700/50 bg-amber-900/10 p-3" data-testid="new-durum-ek-panel">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                        📊 Durum Bazlı Ek Ücretler
                      </div>
                      <div className="text-sm font-bold text-amber-400">
                        Toplam: ₺{(newBordro.durum_ek_ucret_toplam || 0).toLocaleString('tr-TR')}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {Object.entries(newBordro.durum_ek_kalemleri).map(([key, val]) => (
                        <div key={key} className={`p-2 rounded border ${val.ucret > 0 ? 'border-amber-700/40 bg-slate-900/50' : 'border-slate-800 bg-slate-900/20 opacity-50'}`}>
                          <div className="text-slate-400">{DURUM_EK_LABEL[key] || key}</div>
                          <div className="text-white font-medium">
                            {val.gun}g × {val.carpan}
                          </div>
                          <div className={`font-semibold ${val.ucret > 0 ? 'text-green-400' : 'text-slate-600'}`}>
                            ₺{(val.ucret || 0).toLocaleString('tr-TR')}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Her durum için ⌈Günlük Hak Ediş × Çarpan × Gün Sayısı⌉ formülüyle hesaplanır. Bayram Çalıştı zaten "R. Tatil Ücreti"ne dahildir.
                    </p>
                  </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>İkramiye (₺)</Label>
                    <Input
                      type="number"
                      value={newBordro.ikramiye}
                      onChange={(e) => setNewBordro({ ...newBordro, ikramiye: parseFloat(e.target.value) || 0 })}
                      className="bg-slate-950 border-slate-700"
                    />
                  </div>
                  <div>
                    <Label>Kesintiler (₺)</Label>
                    <Input
                      type="number"
                      value={newBordro.kesintiler}
                      onChange={(e) => setNewBordro({ ...newBordro, kesintiler: parseFloat(e.target.value) || 0 })}
                      className="bg-slate-950 border-slate-700"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-slate-700">İptal</Button>
                <Button onClick={handleAddBordro} className="bg-purple-600 hover:bg-purple-700">Oluştur</Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      {/* Filtre ve Özet */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <Label className="text-slate-400 text-sm">Yıl</Label>
            <Select value={String(selectedYil)} onValueChange={(v) => setSelectedYil(parseInt(v))}>
              <SelectTrigger className="bg-slate-950 border-slate-700 mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {[2024, 2025, 2026].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <Label className="text-slate-400 text-sm">Ay</Label>
            <Select value={String(selectedAy)} onValueChange={(v) => setSelectedAy(parseInt(v))}>
              <SelectTrigger className="bg-slate-950 border-slate-700 mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {aylar.map(a => (
                  <SelectItem key={a.value} value={String(a.value)}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Toplam Brüt</p>
            <p className="text-xl font-bold text-blue-500">{formatCurrency(toplamlar.brut)}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Toplam Net</p>
            <p className="text-xl font-bold text-green-500">{formatCurrency(toplamlar.net)}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Toplam Ödeme</p>
            <p className="text-xl font-bold text-purple-500">{formatCurrency(toplamlar.toplam)}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect border-amber-800/50" data-testid="durum-ek-toplam-card">
          <CardContent className="p-4">
            <p className="text-sm text-slate-400">Durum Ek Ücret Toplamı</p>
            <p className="text-xl font-bold text-amber-400">{formatCurrency(toplamlar.durum_ek)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Tüm personelin toplam ek kalemleri</p>
          </CardContent>
        </Card>
      </div>

      {/* Aylık Durum Özeti — tüm personelin bu ay toplam ek ücretleri */}
      {Object.values(aylikDurumOzeti).some(v => v.gun > 0) && (
        <Card className="glass-effect border-amber-800/50 mb-6" data-testid="aylik-durum-ozet-card">
          <CardHeader className="border-b border-slate-800 pb-3">
            <CardTitle className="text-base text-amber-300 flex items-center gap-2">
              📊 {aylar.find(a => a.value === selectedAy)?.label} {selectedYil} — Aylık Durum Ek Ücret Özeti
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {Object.entries(aylikDurumOzeti).map(([k, v]) => (
                <div key={k} className={`p-3 rounded border ${v.gun > 0 ? 'border-amber-700/40 bg-slate-900/50' : 'border-slate-800 bg-slate-900/20 opacity-50'}`}>
                  <div className="text-xs text-slate-400">{DURUM_EK_LABEL[k] || k}</div>
                  <div className="text-sm text-white font-medium">{v.gun} gün</div>
                  <div className={`text-sm font-semibold ${v.gun > 0 ? 'text-green-400' : 'text-slate-600'}`}>
                    {formatCurrency(v.ucret)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Yıllık Trend Grafiği — durum ek + fazla mesai + pazar + R.tatil */}
      {yillikVarMi && (
        <Card className="glass-effect border-slate-800 mb-6" data-testid="yillik-trend-card">
          <CardHeader className="border-b border-slate-800 pb-3">
            <CardTitle className="text-base text-white flex items-center gap-2">
              📈 {selectedYil} Yıllık Ek Ücret Trendi (Aylara Göre)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={yillikTrendData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="ay" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <RechartsTooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 12 }}
                  formatter={(v, n) => [formatCurrency(v), n]}
                  cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="durum_ek" name="Durum Ek" fill="#f59e0b" stackId="ek" />
                <Bar dataKey="fazla_mesai" name="Fazla Mesai" fill="#3b82f6" stackId="ek" />
                <Bar dataKey="pazar" name="Pazar" fill="#06b6d4" stackId="ek" />
                <Bar dataKey="resmi_tatil" name="R. Tatil" fill="#fb923c" stackId="ek" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-slate-500 mt-2 text-center">
              Yığılmış sütun grafik — her ay için 4 kalemin toplam katkısı
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tablo */}
      <Card className="glass-effect border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {aylar.find(a => a.value === selectedAy)?.label} {selectedYil} Bordroları
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
          ) : bordrolar.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Bu dönem için bordro bulunmuyor</div>
          ) : (
            <ScrollArea className="w-full">
              <SortableTable
                storageKey="maas-bordrosu-cols"
                data={bordrolar}
                rowKey={(b) => b.id}
                emptyText="Bu dönem için bordro bulunmuyor"
                columns={[
                  { key: 'personel', label: 'Personel', headCls: 'text-slate-300',
                    renderCell: (b) => <TableCell key="personel" className="font-medium text-white">{b.personel_adi}</TableCell> },
                  { key: 'brut', label: 'Brüt Maaş', headCls: 'text-slate-300',
                    renderCell: (b) => <TableCell key="brut" className="text-slate-300">{formatCurrency(b.brut_maas)}</TableCell> },
                  { key: 'sgk', label: 'SGK İşçi', headCls: 'text-slate-300',
                    renderCell: (b) => <TableCell key="sgk" className="text-red-400">-{formatCurrency(b.sgk_isci)}</TableCell> },
                  { key: 'gv', label: 'Gelir V.', headCls: 'text-slate-300',
                    renderCell: (b) => <TableCell key="gv" className="text-red-400">-{formatCurrency(b.gelir_vergisi)}</TableCell> },
                  { key: 'net', label: 'Net Maaş', headCls: 'text-slate-300',
                    renderCell: (b) => <TableCell key="net" className="text-green-400">{formatCurrency(b.net_maas)}</TableCell> },
                  { key: 'fm', label: 'F.Mesai', headCls: 'text-slate-300',
                    renderCell: (b) => <TableCell key="fm" className="text-blue-400" title={`${b.fazla_mesai_saat || 0} saat`}>+{formatCurrency(b.fazla_mesai_ucreti)}</TableCell> },
                  { key: 'pazar', label: 'Pazar', headCls: 'text-slate-300',
                    renderCell: (b) => <TableCell key="pazar" className="text-cyan-400" title={`${b.pazar_gun || 0} gün`}>+{formatCurrency(b.pazar_ucreti)}</TableCell> },
                  { key: 'rtatil', label: 'R.Tatil', headCls: 'text-slate-300',
                    renderCell: (b) => <TableCell key="rtatil" className="text-orange-400" title={`${b.resmi_tatil_gun || 0} gün`}>+{formatCurrency(b.resmi_tatil_ucreti)}</TableCell> },
                  { key: 'durumek', label: 'Durum Ek',
                    headCls: 'text-amber-300', headTitle: 'Durum bazlı ek ücretler toplamı (izinli/raporlu/tatil vs.)',
                    renderCell: (b) => {
                      let tip = 'Detay yok';
                      try {
                        const d = b.durum_detay_json ? JSON.parse(b.durum_detay_json) : null;
                        if (d) {
                          tip = Object.entries(d)
                            .filter(([_, v]) => (v.ucret || 0) > 0)
                            .map(([k, v]) => `${DURUM_EK_LABEL[k] || k}: ${v.gun}g × ${v.carpan} = ₺${v.ucret}`)
                            .join('\n') || 'Ek ücret yok';
                        }
                      } catch (_) { /* yoksay */ }
                      return (
                        <TableCell key="durumek" className="text-amber-400" title={tip}>
                          {(b.durum_ek_ucret_toplam || 0) > 0 ? '+' : ''}{formatCurrency(b.durum_ek_ucret_toplam || 0)}
                        </TableCell>
                      );
                    } },
                  { key: 'toplam', label: 'Toplam', headCls: 'text-slate-300',
                    renderCell: (b) => <TableCell key="toplam" className="text-purple-400 font-bold">{formatCurrency(b.toplam_odeme)}</TableCell> },
                  { key: 'durum', label: 'Durum', headCls: 'text-slate-300',
                    renderCell: (b) => (
                      <TableCell key="durum">
                        <span className={`px-2 py-1 rounded text-xs ${b.odendi ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {b.odendi ? 'Ödendi' : 'Bekliyor'}
                        </span>
                      </TableCell>
                    ) },
                  { key: 'islem', label: 'İşlem', headCls: 'text-slate-300',
                    renderCell: (b) => (
                      <TableCell key="islem">
                        <div className="flex gap-1">
                          {!b.odendi && (
                            <Button size="sm" variant="ghost" className="text-green-500 hover:text-green-400" onClick={() => handleOdendi(b.id)}>
                              <DollarSign className="w-4 h-4 mr-1" /> Öde
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:text-blue-400" onClick={() => handleEditBordro(b)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-400" onClick={() => handleDeleteBordro(b.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    ) },
                ]}
              />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Bordro Düzenleme Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Bordro Düzenle</DialogTitle>
          </DialogHeader>
          {editingBordro && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Personel</Label>
                <Input value={editingBordro.personel_adi} disabled className="bg-slate-950 border-slate-700 mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Brüt Maaş (₺)</Label>
                  <Input
                    type="number"
                    value={editingBordro.brut_maas}
                    onChange={(e) => setEditingBordro({ ...editingBordro, brut_maas: e.target.value })}
                    className="bg-slate-950 border-slate-700 mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-purple-700 text-purple-300 hover:bg-purple-900/20 w-full"
                    disabled={hesaplaLoading}
                    onClick={handleEditHesaplaPuantaj}
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    {hesaplaLoading ? 'Hesaplanıyor...' : 'Puantajdan Hesapla'}
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-purple-700/50 bg-purple-900/10 p-3">
                <div className="text-sm font-semibold text-purple-300 mb-2">Mesai Kalemleri</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-slate-400">F. Mesai Saat</Label>
                    <Input
                      type="number"
                      value={editingBordro.fazla_mesai_saat || 0}
                      onChange={(e) => setEditingBordro({ ...editingBordro, fazla_mesai_saat: e.target.value })}
                      className="bg-slate-950 border-slate-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Pazar Gün</Label>
                    <Input
                      type="number"
                      value={editingBordro.pazar_gun || 0}
                      onChange={(e) => setEditingBordro({ ...editingBordro, pazar_gun: e.target.value })}
                      className="bg-slate-950 border-slate-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">R. Tatil Gün</Label>
                    <Input
                      type="number"
                      value={editingBordro.resmi_tatil_gun || 0}
                      onChange={(e) => setEditingBordro({ ...editingBordro, resmi_tatil_gun: e.target.value })}
                      className="bg-slate-950 border-slate-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">F. Mesai Ücreti (₺)</Label>
                    <Input
                      type="number"
                      value={editingBordro.fazla_mesai_ucreti || 0}
                      onChange={(e) => setEditingBordro({ ...editingBordro, fazla_mesai_ucreti: e.target.value })}
                      className="bg-slate-950 border-slate-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Pazar Ücreti (₺)</Label>
                    <Input
                      type="number"
                      value={editingBordro.pazar_ucreti || 0}
                      onChange={(e) => setEditingBordro({ ...editingBordro, pazar_ucreti: e.target.value })}
                      className="bg-slate-950 border-slate-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">R. Tatil Ücreti (₺)</Label>
                    <Input
                      type="number"
                      value={editingBordro.resmi_tatil_ucreti || 0}
                      onChange={(e) => setEditingBordro({ ...editingBordro, resmi_tatil_ucreti: e.target.value })}
                      className="bg-slate-950 border-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Durum Bazlı Ek Ücretler (Düzenle modal) */}
              {editingBordro.durum_ek_kalemleri && (
                <>
                  <BordroUyariBaneri kalemler={editingBordro.durum_ek_kalemleri} />
                  <div className="rounded-md border border-amber-700/50 bg-amber-900/10 p-3" data-testid="edit-durum-ek-panel">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                      📊 Durum Bazlı Ek Ücretler
                    </div>
                    <div className="text-sm font-bold text-amber-400">
                      Toplam: ₺{(editingBordro.durum_ek_ucret_toplam || 0).toLocaleString('tr-TR')}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {Object.entries(editingBordro.durum_ek_kalemleri).map(([key, val]) => (
                      <div key={key} className={`p-2 rounded border ${val.ucret > 0 ? 'border-amber-700/40 bg-slate-900/50' : 'border-slate-800 bg-slate-900/20 opacity-50'}`}>
                        <div className="text-slate-400">{DURUM_EK_LABEL[key] || key}</div>
                        <div className="text-white font-medium">
                          {val.gun}g × {val.carpan}
                        </div>
                        <div className={`font-semibold ${val.ucret > 0 ? 'text-green-400' : 'text-slate-600'}`}>
                          ₺{(val.ucret || 0).toLocaleString('tr-TR')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">İkramiye (₺)</Label>
                  <Input
                    type="number"
                    value={editingBordro.ikramiye || 0}
                    onChange={(e) => setEditingBordro({ ...editingBordro, ikramiye: e.target.value })}
                    className="bg-slate-950 border-slate-700 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Kesintiler (₺)</Label>
                  <Input
                    type="number"
                    value={editingBordro.kesintiler || 0}
                    onChange={(e) => setEditingBordro({ ...editingBordro, kesintiler: e.target.value })}
                    className="bg-slate-950 border-slate-700 mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-slate-700">İptal</Button>
                <Button onClick={handleUpdateBordro} className="bg-green-600 hover:bg-green-700">Güncelle</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaasBordrosu;
