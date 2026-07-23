import React from 'react';

/**
 * Formun üstünde gösterilen taslak durum bildirimi.
 * Props:
 *  - draftSavedAt: ISO timestamp | null
 *  - draftRestored: boolean
 *  - onClear: () => void
 *  - visible: boolean (default true) — false ise render etmez
 */
const DraftBanner = ({ draftSavedAt, draftRestored, onClear, visible = true }) => {
  if (!visible) return null;
  if (!draftSavedAt && !draftRestored) return null;

  const timeStr = draftSavedAt
    ? new Date(draftSavedAt).toLocaleTimeString('tr-TR')
    : null;

  return (
    <div
      data-testid="draft-indicator"
      className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 flex items-center justify-between gap-3 text-sm"
    >
      <div className="text-sky-200 flex items-center gap-2">
        <span className="text-lg">📄</span>
        <span>
          {draftRestored ? (
            <>Kaydedilmemiş taslak geri yüklendi — kaldığınız yerden devam edebilirsiniz.</>
          ) : (
            <>Taslak otomatik kaydedildi. Sayfayı kapatsanız bile veriler kaybolmaz.</>
          )}
          {timeStr && (
            <span className="ml-2 text-sky-400/80 text-xs">({timeStr})</span>
          )}
        </span>
      </div>
      <button
        type="button"
        onClick={() => {
          if (window.confirm('Kaydedilmiş taslak silinsin ve form sıfırlansın mı?')) {
            onClear?.();
            window.location.reload();
          }
        }}
        data-testid="clear-draft-btn"
        className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition"
      >
        Taslağı Sil
      </button>
    </div>
  );
};

export default DraftBanner;
