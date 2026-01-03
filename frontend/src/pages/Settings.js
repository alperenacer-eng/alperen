import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useModule } from '@/context/ModuleContext';
import { Package, Building2, Users, Settings as SettingsIcon, Shield, ArrowLeft } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const { clearModule } = useModule();
  const navigate = useNavigate();
  
  const settingsCards = [
    {
      title: 'Ürünler',
      description: 'Ürün listesini yönetin',
      icon: Package,
      path: '/settings/products',
      color: 'bg-blue-500',
      testId: 'settings-products-card'
    },
    {
      title: 'İşletmeler',
      description: 'İşletme/bölüm listesini yönetin',
      icon: Building2,
      path: '/settings/departments',
      color: 'bg-green-500',
      testId: 'settings-departments-card'
    },
    {
      title: 'Operatörler',
      description: 'Operatör listesini yönetin',
      icon: Users,
      path: '/settings/operators',
      color: 'bg-purple-500',
      testId: 'settings-operators-card'
    },
  ];

  // Add admin card if user is admin
  if (user?.role === 'admin') {
    settingsCards.push({
      title: 'Kullanıcı Yönetimi',
      description: 'Kullanıcılar ve izinleri yönetin',
      icon: Shield,
      path: '/settings/users',
      color: 'bg-red-500',
      testId: 'settings-users-card'
    });
  }

  return (
    <div className="animate-fade-in" data-testid="settings-page">
      <div className="mb-8">
        <button
          onClick={() => {
            clearModule();
            navigate('/');
          }}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Modül Seçimine Dön
        </button>
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="w-8 h-8 text-orange-500" />
          <h1 className="text-3xl md:text-4xl font-bold text-white">Ayarlar</h1>
        </div>
        <p className="text-slate-400">Sistem tanımlamalarını yönetin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Link
              key={index}
              to={card.path}
              data-testid={card.testId}
              className="glass-effect rounded-xl p-8 border border-slate-800 hover:border-slate-700 transition-all hover:-translate-y-1 group"
            >
              <div className={`w-16 h-16 ${card.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{card.title}</h3>
              <p className="text-slate-400">{card.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Settings;