import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * useFormDraft — form verilerini localStorage'a otomatik taslak olarak kaydeder,
 * sayfaya dönüldüğünde geri yükler ve window focus'ta bir refresh callback tetikler.
 *
 * @param {string}   draftKey       - localStorage anahtarı (modül+form bazında UNIQUE olmalı)
 * @param {object}   formData       - Anlık form verisi
 * @param {function} setFormData    - Form verisini set eden fonksiyon
 * @param {object}   options
 *   - enabled: boolean (default: true) - false ise hiçbir şey yapmaz (örn. edit modunda)
 *   - debounceMs: number (default: 400)
 *   - hasContent: (formData) => boolean - taslak yazılacak mı? (boş formu yazmamak için)
 *   - onFocusRefresh: () => void - window focus'ta çağrılır (dropdown yenileme)
 *   - toastMessage: string - restore olduğunda gösterilecek toast (null ise gösterme)
 *   - mergeStrategy: 'replace' | 'merge' (default: 'merge') - restore'da mevcutu koru mu?
 *
 * @returns { draftSavedAt, draftRestored, clearDraft, saveDraftNow }
 */
export default function useFormDraft(draftKey, formData, setFormData, options = {}) {
  const {
    enabled = true,
    debounceMs = 400,
    hasContent,
    onFocusRefresh,
    toastMessage = '📄 Kaydedilmemiş taslak geri yüklendi — kaldığınız yerden devam edebilirsiniz',
    mergeStrategy = 'merge',
  } = options;

  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const restoredOnceRef = useRef(false);
  const enabledRef = useRef(enabled);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  // 📥 GERİ YÜKLE (ilk mount'ta 1 kez)
  useEffect(() => {
    if (!enabled) return;
    if (restoredOnceRef.current) return;
    restoredOnceRef.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.formData) return;

      setFormData(prev => (
        mergeStrategy === 'replace'
          ? { ...parsed.formData }
          : { ...prev, ...parsed.formData }
      ));
      setDraftRestored(true);
      setDraftSavedAt(parsed.savedAt || null);
      if (toastMessage) {
        toast.success(toastMessage);
      }
    } catch (e) {
      // sessizce geç
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // 💾 OTOMATİK KAYDET (formData değiştikçe, debounce)
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => {
      try {
        const shouldWrite = typeof hasContent === 'function'
          ? hasContent(formData)
          : Object.values(formData || {}).some(v =>
              v !== '' && v !== null && v !== undefined && !(typeof v === 'object' && Object.keys(v || {}).length === 0)
            );
        if (shouldWrite) {
          const nowIso = new Date().toISOString();
          localStorage.setItem(draftKey, JSON.stringify({
            formData,
            savedAt: nowIso,
          }));
          setDraftSavedAt(nowIso);
        }
      } catch (e) {}
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [formData, enabled, draftKey, debounceMs, hasContent]);

  // 🔄 Window focus / visibility'de refresh callback tetikle
  useEffect(() => {
    if (!enabled) return;
    if (!onFocusRefresh) return;
    const onFocus = () => onFocusRefresh();
    const onVis = () => { if (document.visibilityState === 'visible') onFocusRefresh(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, onFocusRefresh]);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(draftKey); } catch (e) {}
    setDraftSavedAt(null);
    setDraftRestored(false);
  }, [draftKey]);

  const saveDraftNow = useCallback(() => {
    try {
      const nowIso = new Date().toISOString();
      localStorage.setItem(draftKey, JSON.stringify({ formData, savedAt: nowIso }));
      setDraftSavedAt(nowIso);
    } catch (e) {}
  }, [draftKey, formData]);

  return { draftSavedAt, draftRestored, clearDraft, saveDraftNow };
}
