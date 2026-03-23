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
  TrendingUp, CalendarDays, User, Download
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const PuantajRaporlama = () => {
  const { token } = useAuth();
  const { currentModule } = useModule();
  const navigate = useNavigate();
  
  const [puantajlar, setPuantajlar] = useState([]);
  const [personeller, setPersoneller] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tarih aralığı
  const [periodType, setPeriodType] = useState('monthly'); // daily, weekly, monthly, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const headers = { Authorization: `Bearer ${token}` };

  // Tarih hesaplamaları
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
        start.setDate(today.getDate() - today.getDay() + 1); // Pazartesi
        end = new Date(start);
        end.setDate(start.getDate() + 6); // Pazar
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
      const [puantajRes, personelRes] = await Promise.all([
        axios.get(`${API_URL}/puantaj`, { headers }),
        axios.get(`${API_URL}/personeller`, { headers })
      ]);
      setPuantajlar(puantajRes.data);
      setPersoneller(personelRes.data.filter(p => p.aktif));
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
    
    // Varsayılan tarih aralığı
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, [currentModule, fetchData, navigate]);

  // Filtrelenmiş puantajlar
  const { start, end } = getDateRange();
  const filteredPuantajlar = puantajlar.filter(p => {
    return p.tarih >= start && p.tarih <= end;
  });

  // Özet İstatistikler
  const stats = {
    toplamKayit: filteredPuantajlar.length,
    toplamFazlaMesai: filteredPuantajlar.reduce((sum, p) => sum + (p.fazla_mesai || 0), 0),
    benzersizGunSayisi: [...new Set(filteredPuantajlar.map(p => p.tarih))].length,
    benzersizPersonelSayisi: [...new Set(filteredPuantajlar.map(p => p.personel_id))].length
  };

  // Personel Bazlı Rapor
  const personelRaporu = personeller.map(personel => {
    const personelPuantajlari = filteredPuantajlar.filter(p => p.personel_id === personel.id);
    return {
      id: personel.id,
      ad_soyad: personel.ad_soyad,
      departman: personel.departman || '-',
      calismaGunu: personelPuantajlari.length,
      toplamFazlaMesai: personelPuantajlari.reduce((sum, p) => sum + (p.fazla_mesai || 0), 0)
    };
  }).filter(p => p.calismaGunu > 0).sort((a, b) => b.calismaGunu - a.calismaGunu);

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
    // Personel bazlı CSV
    let csv = 'Personel Adı,Departman,Çalışma Günü,Toplam Fazla Mesai\n';
    personelRaporu.forEach(p => {
      csv += `"${p.ad_soyad}","${p.departman}",${p.calismaGunu},${p.toplamFazlaMesai.toFixed(1)}\n`;
    });
    csv += '\n\nTarih,Personel Sayısı,Toplam Fazla Mesai\n';
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
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          h2 { color: #666; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          tr:nth-child(even) { background-color: #fafafa; }
          .stats { display: flex; gap: 20px; margin: 20px 0; flex-wrap: wrap; }
          .stat-box { background: #f5f5f5; padding: 15px; border-radius: 8px; min-width: 150px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #333; }
          .stat-label { color: #666; font-size: 12px; }
          .header-info { color: #666; margin-bottom: 20px; }
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
              <th>Toplam Fazla Mesai</th>
            </tr>
          </thead>
          <tbody>
            ${personelRaporu.map(p => `
              <tr>
                <td>${p.ad_soyad}</td>
                <td>${p.departman}</td>
                <td>${p.calismaGunu}</td>
                <td>${p.toplamFazlaMesai.toFixed(1)} saat</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Gün Bazlı Rapor</h2>
        <table>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Personel Sayısı</th>
              <th>Toplam Fazla Mesai</th>
            </tr>
          </thead>
          <tbody>
            ${gunRaporu.map(g => `
              <tr>
                <td>${g.tarih}</td>
                <td>${g.personelSayisi}</td>
                <td>${g.toplamFazlaMesai.toFixed(1)} saat</td>
              </tr>
            `).join('')}
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
              <Label className="text-slate-300">Periyot</Label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger className="bg-slate-950 border-slate-700 w-40 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="daily">Bugün</SelectItem>
                  <SelectItem value="weekly">Bu Hafta</SelectItem>
                  <SelectItem value="monthly">Bu Ay</SelectItem>
                  <SelectItem value="custom">Özel Aralık</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {periodType === 'custom' && (
              <>
                <div>
                  <Label className="text-slate-300">Başlangıç</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-950 border-slate-700 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Bitiş</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-950 border-slate-700 mt-1"
                  />
                </div>
              </>
            )}
            <div className="text-slate-400 text-sm ml-auto">
              <span className="text-white font-medium">{start}</span> - <span className="text-white font-medium">{end}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Özet İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                        <TableHead className="text-slate-300">Toplam Fazla Mesai</TableHead>
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
