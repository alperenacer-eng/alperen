import React, { useState } from 'react';
import { TableHead } from '@/components/ui/table';
import { GripVertical } from 'lucide-react';

/**
 * Sürüklenebilir tablo başlığı.
 * `onReorder(sourceKey, targetKey)` çağırarak ana state'i günceller.
 *
 * Kullanım:
 *  <DraggableTableHead colKey="ad" onReorder={reorder} className="...">
 *    Ad Soyad
 *  </DraggableTableHead>
 */
export const DraggableTableHead = ({
  colKey,
  onReorder,
  className = '',
  children,
  title,
  ...rest
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/col-key', colKey);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };
  const handleDragEnd = () => setIsDragging(false);
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isOver) setIsOver(true);
  };
  const handleDragLeave = () => setIsOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    const sourceKey = e.dataTransfer.getData('text/col-key');
    setIsOver(false);
    if (sourceKey && sourceKey !== colKey) onReorder(sourceKey, colKey);
  };

  return (
    <TableHead
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-col-key={colKey}
      title={title || 'Sürükleyerek yer değiştirin'}
      className={`${className} cursor-grab active:cursor-grabbing select-none ${
        isOver ? 'ring-2 ring-orange-400 bg-orange-500/10' : ''
      } ${isDragging ? 'opacity-50' : ''} transition-all`}
      {...rest}
    >
      <span className="inline-flex items-center gap-1.5">
        <GripVertical className="w-3 h-3 text-slate-500 opacity-50" />
        {children}
      </span>
    </TableHead>
  );
};
