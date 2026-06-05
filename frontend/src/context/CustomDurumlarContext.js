import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CustomDurumlarContext = createContext({
  customDurumlar: [],
  activeCustomDurumlar: [],
  loading: false,
  refresh: () => {},
  addDurum: async () => null,
  updateDurum: async () => null,
});

export const CustomDurumlarProvider = ({ children }) => {
  const [customDurumlar, setCustomDurumlar] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/custom-durumlar`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setCustomDurumlar(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Özel durumlar yüklenemedi:', err);
      setCustomDurumlar([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addDurum = useCallback(async ({ label, tip = 'gunluk', def_carpan = 1.0 }) => {
    const token = localStorage.getItem('token');
    const res = await axios.post(`${API}/custom-durumlar`, { label, tip, def_carpan }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    await fetchAll();
    return res.data;
  }, [fetchAll]);

  const updateDurum = useCallback(async (id, payload) => {
    const token = localStorage.getItem('token');
    const res = await axios.put(`${API}/custom-durumlar/${id}`, payload, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    await fetchAll();
    return res.data;
  }, [fetchAll]);

  const activeCustomDurumlar = customDurumlar.filter(d => d.is_active === 1 || d.is_active === true);

  return (
    <CustomDurumlarContext.Provider value={{
      customDurumlar,
      activeCustomDurumlar,
      loading,
      refresh: fetchAll,
      addDurum,
      updateDurum,
    }}>
      {children}
    </CustomDurumlarContext.Provider>
  );
};

export const useCustomDurumlar = () => useContext(CustomDurumlarContext);
