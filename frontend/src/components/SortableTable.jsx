import React from 'react';
import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { useColumnOrder } from '@/hooks/useColumnOrder';
import { DraggableTableHead } from '@/components/DraggableTableHead';

/**
 * Sürükle-bırak ile sütunları yeniden sıralanabilen tablo.
 *
 * Props:
 *  - storageKey: string (zorunlu) — localStorage anahtarı (her tablo için benzersiz)
 *  - columns: Array<{
 *      key: string,
 *      label: React.ReactNode,
 *      headCls?: string,
 *      headTitle?: string,
 *      renderCell: (row, idx) => React.ReactElement  // <TableCell>...</TableCell> döndürmeli
 *    }>
 *  - data: any[]
 *  - rowKey: (row, idx) => string | number
 *  - rowClassName?: (row, idx) => string
 *  - emptyText?: string
 *  - loading?: boolean
 *  - loadingText?: string
 *  - headerRowClassName?: string
 *  - showResetButton?: boolean (default true)
 *  - resetLabel?: string (default "Sütun Sırasını Sıfırla")
 *  - hint?: string (default "Sütun başlıklarını sürükleyerek yer değiştirebilirsiniz.")
 *  - tableClassName?: string
 *  - children?: any  // ek body satırları (örn. toplam satırı)
 */
export const SortableTable = ({
  storageKey,
  columns,
  data,
  rowKey,
  rowClassName,
  emptyText = 'Kayıt bulunmuyor',
  loading = false,
  loadingText = 'Yükleniyor...',
  headerRowClassName = 'border-slate-800 bg-slate-900/50',
  showResetButton = true,
  resetLabel = 'Sütun Sırasını Sıfırla',
  hint = 'Sütun başlıklarını sürükleyerek yer değiştirebilirsiniz.',
  tableClassName = '',
  children,
  footerRender, // (orderedCols) => React.ReactNode  — toplam satırı vb. için
}) => {
  const colKeys = React.useMemo(() => columns.map(c => c.key), [columns]);
  const { order, reorder, reset } = useColumnOrder(storageKey, colKeys);
  const orderedCols = React.useMemo(
    () => order.map(k => columns.find(c => c.key === k)).filter(Boolean),
    [order, columns]
  );

  return (
    <div>
      {(showResetButton || hint) && (
        <div className="flex items-center justify-between flex-wrap gap-2 px-1 pb-2">
          {hint ? <span className="text-xs text-slate-500">{hint}</span> : <span />}
          {showResetButton && (
            <Button
              onClick={reset}
              size="sm"
              variant="outline"
              className="border-slate-700 text-slate-300 hover:text-white h-7 text-xs"
              data-testid={`reset-cols-${storageKey}`}
            >
              <RotateCcw className="w-3 h-3 mr-1" /> {resetLabel}
            </Button>
          )}
        </div>
      )}
      {loading ? (
        <div className="p-8 text-center text-slate-400">{loadingText}</div>
      ) : (!data || data.length === 0) ? (
        <div className="p-8 text-center text-slate-400">{emptyText}</div>
      ) : (
        <Table className={tableClassName}>
          <TableHeader>
            <TableRow className={headerRowClassName}>
              {orderedCols.map(col => (
                <DraggableTableHead
                  key={col.key}
                  colKey={col.key}
                  onReorder={reorder}
                  className={col.headCls}
                  title={col.headTitle}
                >
                  {col.label}
                </DraggableTableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, idx) => (
              <TableRow
                key={rowKey ? rowKey(row, idx) : idx}
                className={rowClassName ? rowClassName(row, idx) : `border-slate-800 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'}`}
              >
                {orderedCols.map(col => (
                  <React.Fragment key={col.key}>{col.renderCell(row, idx)}</React.Fragment>
                ))}
              </TableRow>
            ))}
            {children}
            {footerRender ? footerRender(orderedCols) : null}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
