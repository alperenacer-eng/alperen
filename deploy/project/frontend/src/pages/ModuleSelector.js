import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useModule } from '@/context/ModuleContext';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight } from 'lucide-react';

const ModuleSelector = () => {
  const { modules, selectModule } = useModule();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filter modules based on user permissions
  const availableModules = modules.filter(module => 
    user?.role === 'admin' || user?.permissions?.includes(module.id)
  );

  const handleModuleSelect = (moduleId) => {
    selectModule(moduleId);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" data-testid="module-selector-page">
      <div className="w-full max-w-6xl animate-fade-in">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl mb-6 shadow-2xl shadow-orange-500/30">
            <span className="text-4xl">🏭</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Acerler Bims Takip</h1>
          <p className="text-xl text-slate-400">Hangi modülü kullanmak istersiniz?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {availableModules.length > 0 ? (
            availableModules.map((module) => (
              <button
                key={module.id}
                onClick={() => handleModuleSelect(module.id)}
                data-testid={`module-${module.id}`}
                className="group glass-effect rounded-2xl p-8 border border-slate-800 hover:border-slate-700 transition-all hover:-translate-y-2 text-left"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-16 h-16 bg-gradient-to-br ${module.color} rounded-2xl flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform`}>
                    {module.icon}
                  </div>
                  <ArrowRight className="w-6 h-6 text-slate-600 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                  {module.name}
                </h3>
                <p className="text-slate-400">{module.description}</p>
              </button>
            ))
          ) : (
            <div className="col-span-2 text-center py-12">
              <p className="text-xl text-slate-400">Erişim izniniz olan modül bulunmuyor</p>
              <p className="text-sm text-slate-500 mt-2">Lütfen yöneticinizle iletişime geçin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModuleSelector;