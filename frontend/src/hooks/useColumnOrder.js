import { useState, useCallback, useEffect } from 'react';

/**
 * Sütun sırasını localStorage'da saklar ve sürükle-bırak için
 * yeniden sıralama API'si sunar.
 *
 * @param {string} storageKey  - localStorage anahtarı (her tablo için benzersiz)
 * @param {string[]} defaultOrder - Sütun anahtarlarının varsayılan sırası
 * @returns {{
 *   order: string[],
 *   reorder: (sourceKey: string, targetKey: string) => void,
 *   reset: () => void,
 *   setOrder: (next: string[]) => void
 * }}
 */
export function useColumnOrder(storageKey, defaultOrder) {
  const [order, setOrderState] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // defaultOrder'da olmayan anahtarları temizle
          const valid = parsed.filter(k => defaultOrder.includes(k));
          // Yeni eklenen anahtarları (savedde yok) defaultOrder'daki ORİJİNAL konumlarına yerleştir
          const missing = defaultOrder.filter(k => !valid.includes(k));
          if (missing.length === 0) return valid;
          const result = [...valid];
          missing.forEach(k => {
            const defIdx = defaultOrder.indexOf(k);
            // result'ta defIdx'ten önceki kaç default anahtar var?
            const beforeCount = defaultOrder.slice(0, defIdx).filter(x => result.includes(x)).length;
            result.splice(beforeCount, 0, k);
          });
          return result;
        }
      }
    } catch (e) {
      // sessizce yoksay
    }
    return defaultOrder;
  });

  // defaultOrder değişirse (örn. dinamik kolonlar) yeni anahtarları doğru konuma ekle
  useEffect(() => {
    setOrderState(prev => {
      const valid = prev.filter(k => defaultOrder.includes(k));
      const missing = defaultOrder.filter(k => !valid.includes(k));
      if (missing.length === 0 && valid.length === prev.length) return prev;
      const result = [...valid];
      missing.forEach(k => {
        const defIdx = defaultOrder.indexOf(k);
        const beforeCount = defaultOrder.slice(0, defIdx).filter(x => result.includes(x)).length;
        result.splice(beforeCount, 0, k);
      });
      return result;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOrder.join('|')]);

  const persist = useCallback((next) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (e) { /* yoksay */ }
  }, [storageKey]);

  const setOrder = useCallback((next) => {
    setOrderState(next);
    persist(next);
  }, [persist]);

  const reorder = useCallback((sourceKey, targetKey) => {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    setOrderState(prev => {
      const sIdx = prev.indexOf(sourceKey);
      const tIdx = prev.indexOf(targetKey);
      if (sIdx === -1 || tIdx === -1) return prev;
      const next = [...prev];
      next.splice(sIdx, 1);
      next.splice(tIdx, 0, sourceKey);
      persist(next);
      return next;
    });
  }, [persist]);

  const reset = useCallback(() => {
    setOrderState(defaultOrder);
    try { localStorage.removeItem(storageKey); } catch (e) { /* yoksay */ }
  }, [storageKey, defaultOrder]);

  return { order, reorder, reset, setOrder };
}
