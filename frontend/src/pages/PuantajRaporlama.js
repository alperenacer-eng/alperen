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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, Calendar, Users, Clock, FileSpreadsheet, FileText,
  TrendingUp, CalendarDays, User, Building2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const PuantajRaporlama = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  
  const [puantajlar, setPuantajlar] = useState([]);
  const [personeller, setPersoneller] = useState([]);
  const [tesisler, setTesisler] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tarih aralığı
  const [periodType, setPeriodType] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const headers = { Authorization: `Bearer ${token}` };

  const getDateRange = useCallback(() => {
    const today = new Date();
    let start, end;
    
    switch (periodType) {
      case 'daily':
        start = new Date(today);
        end = new Date(today);
        break;
      case 'weekly':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay() + 1);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'monthly':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'custom':
        start = startDate ? new Date(startDate) : new Date(today.getFullYear(), today.getMonth(), 1);
        end = endDate ? new Date(endDate) : new Date();
        break;
      default:
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date();
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }, [periodType, startDate, endDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [puantajRes, personelRes, tesisRes] = await Promise.all([
        axios.get(`${API_URL}/puantaj`, { headers }),
        axios.get(`${API_URL}/personeller`, { headers }),
        axios.get(`${API_URL}/tesisler`, { headers })
      ]);
      setPuantajlar(puantajRes.data);
      setPersoneller(personelRes.data.filter(p => p.aktif));
      setTesisler(tesisRes.data);
    } catch (e) {
      console.error(e);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!currentModule || currentModule.id !== 'personel') {
      navigate('/');
      return;
    }
    fetchData();
    
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, [currentModule, fetchData, navigate]);

  const { start, end } = getDateRange();
  const filteredPuantajlar = puantajlar.filter(p => {
    return p.tarih >= start && p.tarih <= end;
  });

  // Özet İstatistikler
  const stats = {
    toplamKayit: filteredPuantajlar.length,
    toplamFazlaMesai: filteredPuantajlar.reduce((sum, p) => sum + (p.fazla_mesai || 0), 0),
    benzersizGunSayisi: [...new Set(filteredPuantajlar.map(p => p.tarih))].length,
    benzersizPersonelSayisi: [...new Set(filteredPuantajlar.map(p => p.personel_id))].length,
    benzersizTesisSayisi: [...new Set(filteredPuantajlar.map(p => p.tesis_adi).filter(Boolean))].length
  };

  // Personel Bazlı Rapor (tesis bilgisiyle)
  const personelRaporu = personeller.map(personel => {
    const personelPuantajlari = filteredPuantajlar.filter(p => p.personel_id === personel.id);
    const calisilanTesisler = [...new Set(personelPuantajlari.map(p => p.tesis_adi).filter(Boolean))];
    return {
      id: personel.id,
      ad_soyad: personel.ad_soyad,
      departman: personel.departman || '-',
      calismaGunu: personelPuantajlari.length,
      toplamFazlaMesai: personelPuantajlari.reduce((sum, p) => sum + (p.fazla_mesai || 0), 0),
      tesisler: calisilanTesisler
    };
  }).filter(p => p.calismaGunu > 0).sort((a, b) => b.calismaGunu - a.calismaGunu);

  // Tesis Bazlı Rapor
  const tesisRaporu = (() => {
    const tesisMap = {};
    filteredPuantajlar.forEach(p => {
      const tesisAdi = p.tesis_adi || 'Belirtilmemiş';
      if (!tesisMap[tesisAdi]) {
        tesisMap[tesisAdi] = {
          tesis_adi: tesisAdi,
          kayitSayisi: 0,
          personeller: new Set(),
          toplamFazlaMesai: 0
        };
      }
      tesisMap[tesisAdi].kayitSayisi++;
      tesisMap[tesisAdi].personeller.add(p.personel_adi);
      tesisMap[tesisAdi].toplamFazlaMesai += (p.fazla_mesai || 0);
    });
    return Object.values(tesisMap).map(t => ({
      ...t,
      personelSayisi: t.personeller.size,
      personelListesi: [...t.personeller]
    })).sort((a, b) => b.kayitSayisi - a.kayitSayisi);
  })();

  // Gün Bazlı Rapor
  const gunler = [...new Set(filteredPuantajlar.map(p => p.tarih))].sort();
  const gunRaporu = gunler.map(tarih => {
    const gunPuantajlari = filteredPuantajlar.filter(p => p.tarih === tarih);
    return {
      tarih,
      personelSayisi: gunPuantajlari.length,
      toplamFazlaMesai: gunPuantajlari.reduce((sum, p) => sum + (p.fazla_mesai || 0), 0)
    };
  });

  // Excel Export
  const exportToExcel = () => {
    let csv = 'PERSONEL BAZLI RAPOR\n';
    csv += 'Personel Adı,Departman,Çalışma Günü,Toplam Fazla Mesai,Çalıştığı Tesisler\n';
    personelRaporu.forEach(p => {
      csv += `"${p.ad_soyad}","${p.departman}",${p.calismaGunu},${p.toplamFazlaMesai.toFixed(1)},"${p.tesisler.join(', ') || '-'}"\n`;
    });
    
    csv += '\n\nTESİS BAZLI RAPOR\n';
    csv += 'Tesis Adı,Kayıt Sayısı,Personel Sayısı,Toplam Fazla Mesai,Personeller\n';
    tesisRaporu.forEach(t => {
      csv += `"${t.tesis_adi}",${t.kayitSayisi},${t.personelSayisi},${t.toplamFazlaMesai.toFixed(1)},"${t.personelListesi.join(', ')}"\n`;
    });
    
    csv += '\n\nGÜN BAZLI RAPOR\n';
    csv += 'Tarih,Personel Sayısı,Toplam Fazla Mesai\n';
    gunRaporu.forEach(g => {
      csv += `${g.tarih},${g.personelSayisi},${g.toplamFazlaMesai.toFixed(1)}\n`;
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `puantaj_raporu_${start}_${end}.csv`;
    link.click();
    toast.success('Excel raporu indirildi');
  };

  // PDF Export
  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Puantaj Raporu</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          h2 { color: #666; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          tr:nth-child(even) { background-color: #fafafa; }
          .stats { display: flex; gap: 15px; margin: 20px 0; flex-wrap: wrap; }
          .stat-box { background: #f5f5f5; padding: 12px; border-radius: 8px; min-width: 120px; }
          .stat-value { font-size: 20px; font-weight: bold; color: #333; }
          .stat-label { color: #666; font-size: 11px; }
          .header-info { color: #666; margin-bottom: 20px; }
          .tesis-list { font-size: 11px; color: #666; }
        </style>
      </head>
      <body>
        <h1>Puantaj Raporu</h1>
        <div class="header-info">
          <strong>Tarih Aralığı:</strong> ${start} - ${end}
        </div>
        
        <div class="stats">
          <div class="stat-box">
            <div class="stat-value">${stats.toplamKayit}</div>
            <div class="stat-label">Toplam Kayıt</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${stats.benzersizPersonelSayisi}</div>
            <div class="stat-label">Personel Sayısı</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${stats.benzersizTesisSayisi}</div>
            <div class="stat-label">Tesis Sayısı</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${stats.benzersizGunSayisi}</div>
            <div class="stat-label">Gün Sayısı</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${stats.toplamFazlaMesai.toFixed(1)}</div>
            <div class="stat-label">Toplam Fazla Mesai (Saat)</div>
          </div>
        </div>

        <h2>Personel Bazlı Rapor</h2>
        <table>
          <thead>
            <tr>
              <th>Personel Adı</th>
              <th>Departman</th>
              <th>Çalışma Günü</th>
              <th>Fazla Mesai</th>
              <th>Çalıştığı Tesisler</th>
            </tr>
          </thead>
          <tbody>
            ${personelRaporu.map(p => `
              <tr>
                <td>${p.ad_soyad}</td>
                <td>${p.departman}</td>
                <td>${p.calismaGunu}</td>
                <td>${p.toplamFazlaMesai.toFixed(1)} saat</td>
                <td class="tesis-list">${p.tesisler.join(', ') || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Tesis Bazlı Rapor</h2>
        <table>
          <thead>
            <tr>
              <th>Tesis Adı</th>
              <th>Kayıt Sayısı</th>
              <th>Personel Sayısı</th>
              <th>Fazla Mesai</th>
              <th>Çalışan Personeller</th>
            </tr>
          </thead>
          <tbody>
            ${tesisRaporu.map(t => `
              <tr>
                <td>${t.tesis_adi}</td>
                <td>${t.kayitSayisi}</td>
                <td>${t.personelSayisi}</td>
                <td>${t.toplamFazlaMesai.toFixed(1)} saat</td>
                <td class="tesis-list">${t.personelListesi.join(', ')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Gün Bazlı Rapor</h2>
        <table>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Gün</th>
              <th>Personel Sayısı</th>
              <th>Fazla Mesai</th>
            </tr>
          </thead>
          <tbody>
            ${gunRaporu.map(g => {
              const date = new Date(g.tarih);
              const gunAdi = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][date.getDay()];
              return `
                <tr>
                  <td>${g.tarih}</td>
                  <td>${gunAdi}</td>
                  <td>${g.personelSayisi}</td>
                  <td>${g.toplamFazlaMesai.toFixed(1)} saat</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
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
            <h1 className="text-3xl font-bold text-white mb-2">Puantaj Raporlama</h1>
            <p className="text-slate-400">Personel çalışma ve mesai raporları</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToExcel} variant="outline" className="border-green-600 text-green-400 hover:bg-green-600/20">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button onClick={exportToPDF} variant="outline" className="border-red-600 text-red-400 hover:bg-red-600/20">
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Tarih Filtresi */}
      <Card className="glass-effect border-slate-800 mb-6">
        <CardHeader className="border-b border-slate-800 pb-4">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Tarih Aralığı
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="text-slate-300">Başlangıç Tarihi</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPeriodType('custom');
                }}
                className="bg-slate-950 border-slate-700 mt-1 w-44"
              />
            </div>
            <div>
              <Label className="text-slate-300">Bitiş Tarihi</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPeriodType('custom');
                }}
                className="bg-slate-950 border-slate-700 mt-1 w-44"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={periodType === 'daily' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodType('daily')}
                className={periodType === 'daily' ? 'bg-orange-600' : 'border-slate-700'}
              >
                Bugün
              </Button>
              <Button 
                variant={periodType === 'weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodType('weekly')}
                className={periodType === 'weekly' ? 'bg-orange-600' : 'border-slate-700'}
              >
                Bu Hafta
              </Button>
              <Button 
                variant={periodType === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodType('monthly')}
                className={periodType === 'monthly' ? 'bg-orange-600' : 'border-slate-700'}
              >
                Bu Ay
              </Button>
            </div>
            <div className="text-slate-400 text-sm ml-auto bg-slate-800 px-3 py-2 rounded-lg">
              Seçili: <span className="text-white font-medium">{start}</span> - <span className="text-white font-medium">{end}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Özet İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Toplam Kayıt</p>
                <p className="text-2xl font-bold text-white">{stats.toplamKayit}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Personel Sayısı</p>
                <p className="text-2xl font-bold text-white">{stats.benzersizPersonelSayisi}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Building2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Tesis Sayısı</p>
                <p className="text-2xl font-bold text-white">{stats.benzersizTesisSayisi}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <CalendarDays className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Gün Sayısı</p>
                <p className="text-2xl font-bold text-white">{stats.benzersizGunSayisi}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-effect border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Toplam Fazla Mesai</p>
                <p className="text-2xl font-bold text-orange-500">{stats.toplamFazlaMesai.toFixed(1)} Saat</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rapor Tabları */}
      <Tabs defaultValue="personel" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 mb-4">
          <TabsTrigger value="personel" className="data-[state=active]:bg-orange-600">
            <User className="w-4 h-4 mr-2" />
            Personel Bazlı
          </TabsTrigger>
          <TabsTrigger value="tesis" className="data-[state=active]:bg-orange-600">
            <Building2 className="w-4 h-4 mr-2" />
            Tesis Bazlı
          </TabsTrigger>
          <TabsTrigger value="gun" className="data-[state=active]:bg-orange-600">
            <CalendarDays className="w-4 h-4 mr-2" />
            Gün Bazlı
          </TabsTrigger>
          <TabsTrigger value="detay" className="data-[state=active]:bg-orange-600">
            <FileText className="w-4 h-4 mr-2" />
            Detaylı Liste
          </TabsTrigger>
        </TabsList>

        {/* Personel Bazlı Rapor */}
        <TabsContent value="personel">
          <Card className="glass-effect border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-lg text-white">Personel Bazlı Rapor</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
              ) : personelRaporu.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Bu dönemde kayıt bulunmuyor</div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 bg-slate-900/50">
                        <TableHead className="text-slate-300">#</TableHead>
                        <TableHead className="text-slate-300">Personel Adı</TableHead>
                        <TableHead className="text-slate-300">Departman</TableHead>
                        <TableHead className="text-slate-300">Çalışma Günü</TableHead>
                        <TableHead className="text-slate-300">Fazla Mesai</TableHead>
                        <TableHead className="text-slate-300">Çalıştığı Tesisler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {personelRaporu.map((p, idx) => (
                        <TableRow key={p.id} className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'}`}>
                          <TableCell className="text-slate-400">{idx + 1}</TableCell>
                          <TableCell className="font-medium text-white">{p.ad_soyad}</TableCell>
                          <TableCell className="text-slate-400">{p.departman}</TableCell>
                          <TableCell className="text-blue-400 font-medium">{p.calismaGunu} gün</TableCell>
                          <TableCell className="text-orange-400 font-medium">{p.toplamFazlaMesai.toFixed(1)} saat</TableCell>
                          <TableCell>
                            {p.tesisler.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {p.tesisler.map((tesis, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                                    {tesis}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tesis Bazlı Rapor */}
        <TabsContent value="tesis">
          <Card className="glass-effect border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-lg text-white">Tesis Bazlı Rapor</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
              ) : tesisRaporu.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Bu dönemde kayıt bulunmuyor</div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 bg-slate-900/50">
                        <TableHead className="text-slate-300">Tesis Adı</TableHead>
                        <TableHead className="text-slate-300">Kayıt Sayısı</TableHead>
                        <TableHead className="text-slate-300">Personel Sayısı</TableHead>
                        <TableHead className="text-slate-300">Toplam Fazla Mesai</TableHead>
                        <TableHead className="text-slate-300">Çalışan Personeller</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tesisRaporu.map((t, idx) => (
                        <TableRow key={t.tesis_adi} className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'}`}>
                          <TableCell className="font-medium text-white">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-cyan-400" />
                              {t.tesis_adi}
                            </div>
                          </TableCell>
                          <TableCell className="text-blue-400 font-medium">{t.kayitSayisi}</TableCell>
                          <TableCell className="text-green-400 font-medium">{t.personelSayisi} kişi</TableCell>
                          <TableCell className="text-orange-400 font-medium">{t.toplamFazlaMesai.toFixed(1)} saat</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-md">
                              {t.personelListesi.map((personel, i) => (
                                <span key={i} className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                  {personel}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gün Bazlı Rapor */}
        <TabsContent value="gun">
          <Card className="glass-effect border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-lg text-white">Gün Bazlı Rapor</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
              ) : gunRaporu.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Bu dönemde kayıt bulunmuyor</div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 bg-slate-900/50">
                        <TableHead className="text-slate-300">Tarih</TableHead>
                        <TableHead className="text-slate-300">Gün</TableHead>
                        <TableHead className="text-slate-300">Personel Sayısı</TableHead>
                        <TableHead className="text-slate-300">Toplam Fazla Mesai</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gunRaporu.map((g, idx) => {
                        const date = new Date(g.tarih);
                        const gunAdi = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][date.getDay()];
                        return (
                          <TableRow key={g.tarih} className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'}`}>
                            <TableCell className="font-medium text-white">{g.tarih}</TableCell>
                            <TableCell className="text-slate-400">{gunAdi}</TableCell>
                            <TableCell className="text-green-400 font-medium">{g.personelSayisi} kişi</TableCell>
                            <TableCell className="text-orange-400 font-medium">{g.toplamFazlaMesai.toFixed(1)} saat</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detaylı Liste */}
        <TabsContent value="detay">
          <Card className="glass-effect border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-lg text-white">Detaylı Kayıt Listesi</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
              ) : filteredPuantajlar.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Bu dönemde kayıt bulunmuyor</div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 bg-slate-900/50">
                        <TableHead className="text-slate-300">Tarih</TableHead>
                        <TableHead className="text-slate-300">Personel</TableHead>
                        <TableHead className="text-slate-300">Tesis</TableHead>
                        <TableHead className="text-slate-300">Giriş</TableHead>
                        <TableHead className="text-slate-300">Çıkış</TableHead>
                        <TableHead className="text-slate-300">Fazla Mesai</TableHead>
                        <TableHead className="text-slate-300">Not</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPuantajlar.sort((a, b) => b.tarih.localeCompare(a.tarih)).map((p, idx) => (
                        <TableRow key={p.id} className={`border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'}`}>
                          <TableCell className="text-white">{p.tarih}</TableCell>
                          <TableCell className="font-medium text-white">{p.personel_adi}</TableCell>
                          <TableCell className="text-cyan-400">{p.tesis_adi || '-'}</TableCell>
                          <TableCell className="text-green-400">{p.giris_saati || '-'}</TableCell>
                          <TableCell className="text-red-400">{p.cikis_saati || '-'}</TableCell>
                          <TableCell className="text-orange-400">{p.fazla_mesai?.toFixed(1) || '0'}</TableCell>
                          <TableCell className="text-slate-400 text-sm">{p.notlar || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PuantajRaporlama;
