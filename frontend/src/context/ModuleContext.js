import React, { createContext, useState, useContext } from 'react';

const ModuleContext = createContext(null);

const MODULES = [
  { 
    id: 'bims', 
    name: 'Bims Üretim',
    icon: '📦',
    color: 'from-blue-500 to-blue-600',
    description: 'Bims üretim süreçlerini takip edin'
  },
  { 
    id: 'cimento', 
    name: 'Çimento',
    icon: '🏗️',
    color: 'from-gray-500 to-gray-600',
    description: 'Çimento stok ve takip yönetimi'
  },
  { 
    id: 'parke', 
    name: 'Parke Üretim',
    icon: '🪵',
    color: 'from-green-500 to-green-600',
    description: 'Parke üretim süreçlerini yönetin'
  },
  { 
    id: 'araclar', 
    name: 'Araçlar',
    icon: '🚗',
    color: 'from-purple-500 to-purple-600',
    description: 'Araç takip ve yönetimi'
  },
  { 
    id: 'motorin', 
    name: 'Motorin',
    icon: '⛽',
    color: 'from-amber-500 to-orange-600',
    description: 'Motorin stok ve tüketim takibi'
  },
  { 
    id: 'personel', 
    name: 'Personel',
    icon: '👥',
    color: 'from-orange-500 to-orange-600',
    description: 'Personel yönetimi ve takibi'
  },
  { 
    id: 'teklif', 
    name: 'Teklif',
    icon: '📋',
    color: 'from-teal-500 to-cyan-600',
    description: 'Satış teklifleri yönetimi'
  },
  { 
    id: 'irsaliye', 
    name: 'İrsaliye',
    icon: '📄',
    color: 'from-rose-500 to-pink-600',
    description: 'İrsaliye yükleme ve arşivleme'
  },
  { 
    id: 'ayarlar', 
    name: 'Ayarlar',
    icon: '⚙️',
    color: 'from-slate-500 to-slate-600',
    description: 'Sistem ayarları ve tanımlamalar'
  },
];

export const ModuleProvider = ({ children }) => {
  const [currentModule, setCurrentModule] = useState(null);

  const selectModule = (moduleId) => {
    const module = MODULES.find(m => m.id === moduleId);
    setCurrentModule(module);
    localStorage.setItem('currentModule', moduleId);
  };

  const clearModule = () => {
    setCurrentModule(null);
    localStorage.removeItem('currentModule');
  };

  // Load module from localStorage on mount
  React.useEffect(() => {
    const savedModule = localStorage.getItem('currentModule');
    if (savedModule) {
      const module = MODULES.find(m => m.id === savedModule);
      if (module) setCurrentModule(module);
    }
  }, []);

  return (
    <ModuleContext.Provider value={{ 
      currentModule, 
      selectModule, 
      clearModule,
      modules: MODULES 
    }}>
      {children}
    </ModuleContext.Provider>
  );
};

export const useModule = () => {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModule must be used within ModuleProvider');
  }
  return context;
};