/**
 * Resource Event Bus
 * Kaynaklar sayfalarında bir kaynak değiştiğinde (kalıp, ürün, operatör, işletme vs.)
 * bir event yayınlar. Üretim Girişi gibi bu verileri kullanan sayfalar dinleyip anında yeniler.
 */

export const RESOURCE_EVENT = 'resources:updated';

export const emitResourceUpdate = (resourceType, action = 'update') => {
  try {
    window.dispatchEvent(new CustomEvent(RESOURCE_EVENT, {
      detail: { resourceType, action, ts: Date.now() }
    }));
    // Ayrıca BroadcastChannel ile diğer sekmelere de bildir
    try {
      const bc = new BroadcastChannel(RESOURCE_EVENT);
      bc.postMessage({ resourceType, action, ts: Date.now() });
      bc.close();
    } catch (e) {
      // BroadcastChannel yoksa (eski tarayıcı) sessizce geç
    }
  } catch (e) {}
};

export const subscribeResourceUpdate = (callback) => {
  const handler = (e) => callback(e.detail || {});
  window.addEventListener(RESOURCE_EVENT, handler);

  let bc = null;
  try {
    bc = new BroadcastChannel(RESOURCE_EVENT);
    bc.onmessage = (msg) => callback(msg.data || {});
  } catch (e) {}

  return () => {
    window.removeEventListener(RESOURCE_EVENT, handler);
    if (bc) try { bc.close(); } catch (e) {}
  };
};
