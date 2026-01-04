import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Login from '@/pages/Login';
import ModuleSelector from '@/pages/ModuleSelector';
import Dashboard from '@/pages/Dashboard';
import ProductionEntry from '@/pages/ProductionEntry';
import ProductionList from '@/pages/ProductionList';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import ProductsManagement from '@/pages/ProductsManagement';
import DepartmentsManagement from '@/pages/DepartmentsManagement';
import OperatorsManagement from '@/pages/OperatorsManagement';
import UserManagement from '@/pages/UserManagement';
import BimsResources from '@/pages/BimsResources';
import CimentoDashboard from '@/pages/CimentoDashboard';
import CimentoResources from '@/pages/CimentoResources';
import CimentoEntry from '@/pages/CimentoEntry';
import PersonelDashboard from '@/pages/PersonelDashboard';
import PersonelListesi from '@/pages/PersonelListesi';
import Puantaj from '@/pages/Puantaj';
import IzinYonetimi from '@/pages/IzinYonetimi';
import MaasBordrosu from '@/pages/MaasBordrosu';
import Layout from '@/components/Layout';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ModuleProvider } from '@/context/ModuleContext';
import '@/App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Yükleniyor...</div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <ModuleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <ModuleSelector />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
            </Route>
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route path="production-entry" element={<ProductionEntry />} />
              <Route path="production-list" element={<ProductionList />} />
              <Route path="reports" element={<Reports />} />
              <Route path="bims-resources" element={<BimsResources />} />
              <Route path="cimento" element={<CimentoDashboard />} />
              <Route path="cimento-entry" element={<CimentoEntry />} />
              <Route path="cimento-resources" element={<CimentoResources />} />
              <Route path="personel" element={<PersonelDashboard />} />
              <Route path="personel-listesi" element={<PersonelListesi />} />
              <Route path="personel-ekle" element={<PersonelListesi />} />
              <Route path="puantaj" element={<Puantaj />} />
              <Route path="izin-yonetimi" element={<IzinYonetimi />} />
              <Route path="maas-bordrosu" element={<MaasBordrosu />} />
              <Route path="settings" element={<Settings />} />
              <Route path="settings/products" element={<ProductsManagement />} />
              <Route path="settings/departments" element={<DepartmentsManagement />} />
              <Route path="settings/operators" element={<OperatorsManagement />} />
              <Route path="settings/users" element={<UserManagement />} />
            </Route>
          </Routes>
          <Toaster position="top-right" />
        </BrowserRouter>
      </ModuleProvider>
    </AuthProvider>
  );
}

export default App;