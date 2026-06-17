import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useModule } from '@/context/ModuleContext';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, CloudUpload, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const ModuleSelector = () => {
  const { modules, selectModule } = useModule();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [backingUp, setBackingUp] = useState(false);

  // Filter modules based on user permissions
  const availableModules = modules.filter(module =>
    user?.role === 'admin' || user?.permissions?.includes(module.id)
  );

  const handleModuleSelect = (moduleId) => {
    selectModule(moduleId);
    navigate('/dashboard');
  };

  const handleManualBackup = async () => {
    if (backingUp) return;
    setBackingUp(true);
    const toastId = toast.loading('GitHub\'a manuel tam yedek alınıyor...');
    try {
      const { data } = await axios.post(
        `${API_URL}/github-sync/push-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` }, timeout: 180000 }
      );

      if (data?.configured === false) {
        toast.error(data?.error || 'GitHub senkronizasyonu yapılandırılmamış', { id: toastId });
        return;
      }

      const tables = data?.tables || {};
      const tableCount = Object.keys(tables).length;
      const successCount = Object.values(tables).filter(Boolean).length;
      const dbOk = data?.database === true;

      if (successCount === tableCount && dbOk) {
        toast.success(
          `Tam yedek başarıyla alındı: ${successCount} tablo + database.db`,
          { id: toastId }
        );
      } else {
        toast.warning(
          `Yedekleme tamamlandı: ${successCount}/${tableCount} tablo, database.db ${dbOk ? 'OK' : 'BAŞARISIZ'}`,
          { id: toastId }
        );
      }
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Yedekleme sırasında bir hata oluştu';
      toast.error(`Yedekleme başarısız: ${msg}`, { id: toastId });
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative" data-testid="module-selector-page">
      {/* Manual full-backup button — top right, visible to all authenticated users */}
      <button
        onClick={handleManualBackup}
        disabled={backingUp}
        data-testid="manual-full-backup-btn"
        title="Tüm verileri ve database.db dosyasını GitHub'a anında yedekle"
        className="absolute top-4 right-4 sm:top-6 sm:right-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white text-sm font-semibold shadow-lg shadow-orange-900/30 border border-orange-400/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {backingUp ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Yedekleniyor...</span>
          </>
        ) : (
          <>
            <CloudUpload className="w-4 h-4" />
            <span>Manuel Tam Yedek Al</span>
          </>
        )}
      </button>

      <div className="w-full max-w-6xl animate-fade-in">
        <div className="text-center mb-12">
          <img
            src="/acerler_bims_logo.png"
            alt="Acerler BIMS Logo"
            className="h-24 mx-auto mb-6 object-contain"
          />
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
