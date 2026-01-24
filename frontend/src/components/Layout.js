import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  FileText,
  List,
  BarChart3,
  LogOut,
  Menu,
  X,
  Factory,
  Settings,
  ArrowLeft,
  Database,
  Users,
  Clock,
  Calendar,
  DollarSign,
  Car,
  Truck,
  ClipboardCheck,
  Fuel,
  TrendingUp,
  TrendingDown,
  FilePlus,
  Building,
  Boxes
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const { currentModule, clearModule } = useModule();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const baseMenuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Ana Sayfa', testId: 'nav-dashboard' },
  ];

  const bimsMenuItems = [
    { path: '/production-entry', icon: FileText, label: 'Üretim Girişi', testId: 'nav-production-entry' },
    { path: '/production-list', icon: List, label: 'Kayıtlar', testId: 'nav-production-list' },
    { path: '/bims-stok', icon: Boxes, label: 'Stok', testId: 'nav-bims-stok' },
    { path: '/reports', icon: BarChart3, label: 'Raporlar', testId: 'nav-reports' },
    { path: '/bims-resources', icon: Database, label: 'Kaynaklar', testId: 'nav-bims-resources' },
  ];

  const cimentoMenuItems = [
    { path: '/cimento-entry', icon: FileText, label: 'Çimento Girişi', testId: 'nav-cimento-entry' },
    { path: '/cimento-list', icon: List, label: 'Kayıtlar', testId: 'nav-cimento-list' },
    { path: '/cimento-reports', icon: BarChart3, label: 'Raporlar', testId: 'nav-cimento-reports' },
    { path: '/cimento-resources', icon: Database, label: 'Kaynaklar', testId: 'nav-cimento-resources' },
  ];

  const personelMenuItems = [
    { path: '/personel-listesi', icon: Users, label: 'Personel Listesi', testId: 'nav-personel-listesi' },
    { path: '/puantaj', icon: Clock, label: 'Puantaj', testId: 'nav-puantaj' },
    { path: '/izin-yonetimi', icon: Calendar, label: 'İzin Yönetimi', testId: 'nav-izin-yonetimi' },
    { path: '/maas-bordrosu', icon: DollarSign, label: 'Maaş Bordrosu', testId: 'nav-maas-bordrosu' },
  ];

  const araclarMenuItems = [
    { path: '/arac-yonetimi', icon: Car, label: 'Araç Yönetimi', testId: 'nav-arac-yonetimi' },
    { path: '/muayene-takip', icon: ClipboardCheck, label: 'Muayene Takip', testId: 'nav-muayene-takip' },
    { path: '/arac-kaynaklar', icon: Database, label: 'Kaynaklar', testId: 'nav-arac-kaynaklar' },
  ];

  const motorinMenuItems = [
    { path: '/motorin-alim', icon: TrendingUp, label: 'Motorin Alımı', testId: 'nav-motorin-alim' },
    { path: '/motorin-verme-giris', icon: TrendingDown, label: 'Araçlara Verme', testId: 'nav-motorin-verme' },
    { path: '/motorin-liste', icon: List, label: 'Kayıtlar', testId: 'nav-motorin-liste' },
    { path: '/motorin-raporlar', icon: BarChart3, label: 'Raporlar', testId: 'nav-motorin-raporlar' },
    { path: '/motorin-kaynaklar', icon: Database, label: 'Kaynaklar', testId: 'nav-motorin-kaynaklar' },
  ];

  const teklifMenuItems = [
    { path: '/teklif-olustur', icon: FilePlus, label: 'Yeni Teklif', testId: 'nav-teklif-olustur' },
    { path: '/teklif-liste', icon: List, label: 'Teklif Listesi', testId: 'nav-teklif-liste' },
    { path: '/teklif-kaynaklar', icon: Building, label: 'Müşteriler', testId: 'nav-teklif-kaynaklar' },
  ];

  const menuItems = currentModule?.id === 'bims' 
    ? [...baseMenuItems, ...bimsMenuItems]
    : currentModule?.id === 'cimento'
    ? [...baseMenuItems, ...cimentoMenuItems]
    : currentModule?.id === 'personel'
    ? [...baseMenuItems, ...personelMenuItems]
    : currentModule?.id === 'araclar'
    ? [...baseMenuItems, ...araclarMenuItems]
    : currentModule?.id === 'motorin'
    ? [...baseMenuItems, ...motorinMenuItems]
    : currentModule?.id === 'teklif'
    ? [...baseMenuItems, ...teklifMenuItems]
    : baseMenuItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-center">
            <img 
              src="/acerler_bims_logo.png" 
              alt="Acerler BIMS Logo" 
              className="h-14 object-contain"
            />
          </div>
          
          {/* Module Info & Back Button */}
          {currentModule && (
            <button
              onClick={() => {
                clearModule();
                navigate('/');
              }}
              className="mt-4 w-full flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 hover:text-gray-900 transition-all text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <div className="flex-1 text-left">
                <div className="text-xs text-gray-500">Modül Değiştir</div>
                <div className="text-sm font-medium">{currentModule.icon} {currentModule.name}</div>
              </div>
            </button>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={item.testId}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-orange-500">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Çıkış Yap
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <img 
              src="/acerler_bims_logo.png" 
              alt="Acerler BIMS Logo" 
              className="h-10 object-contain"
            />
            {currentModule && (
              <p className="text-xs text-gray-500">{currentModule.icon} {currentModule.name}</p>
            )}
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-button"
            className="text-gray-600 hover:text-gray-900"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="bg-white border-b border-gray-200 p-4 space-y-2 animate-fade-in">
            {currentModule && (
              <button
                onClick={() => {
                  clearModule();
                  navigate('/');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Modül Değiştir</span>
              </button>
            )}
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`mobile-${item.testId}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all ${
                    isActive
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              data-testid="mobile-logout-button"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Çıkış Yap</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-16 bg-gray-50">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;