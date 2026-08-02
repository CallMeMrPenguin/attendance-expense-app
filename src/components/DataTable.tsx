'use client';

import React, { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
  GroupingState,
  ExpandedState,
  ColumnPinningState,
  ColumnOrderState,
  ColumnResizeMode,
  Row,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';
import {
  ChevronLeft, ChevronRight, RefreshCw, AlertCircle,
  ArrowUp, ArrowDown, ArrowUpDown, Search, ChevronDown, ChevronUp,
  CheckSquare, ChevronsLeft, ChevronsRight, X, SlidersHorizontal,
  Download, FileSpreadsheet, FileText, Zap, RotateCcw, GripVertical,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string | React.ReactNode;

  // Pagination
  pageSize?: number;
  showPagination?: boolean;

  // Feature toggles
  enableGlobalSearch?: boolean;
  enableColumnVisibility?: boolean;
  enableRowSelection?: boolean;
  enableColumnResizing?: boolean;
  enableColumnReorder?: boolean;
  enableGrouping?: boolean;
  enableRowExpansion?: boolean;
  enableColumnPinning?: boolean;
  enableMultiSort?: boolean;
  enableVirtualization?: boolean;   // auto-on when data.length > 500
  enableExport?: boolean;

  // Sticky layout
  stickyHeader?: boolean;
  stickyFirstColumn?: boolean;

  // Initial state
  initialSorting?: SortingState;
  initialColumnVisibility?: VisibilityState;
  initialColumnPinning?: ColumnPinningState;

  // Callbacks
  onRowClick?: (row: TData) => void;
  onSelectionChange?: (selectedRows: TData[]) => void;
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactNode;

  // Toolbar slots
  toolbarLeft?: React.ReactNode;
  toolbarRight?: React.ReactNode;
  searchPlaceholder?: string;

  // Export & Storage
  exportFilename?: string;
  tableId?: string;
  userId?: string;
  teacherName?: string;
}

// ─── Indeterminate Checkbox ──────────────────────────────────────────────────
function IndeterminateCheckbox({
  indeterminate,
  className = '',
  ...rest
}: { indeterminate?: boolean } & React.HTMLProps<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null!);
  useEffect(() => {
    if (typeof indeterminate === 'boolean') {
      ref.current.indeterminate = !rest.checked && indeterminate;
    }
  }, [ref, indeterminate, rest.checked]);
  return (
    <input
      type="checkbox"
      ref={ref}
      className={`accent-indigo-500 cursor-pointer w-3.5 h-3.5 rounded ${className}`}
      {...rest}
    />
  );
}

// ─── Draggable Header Cell ────────────────────────────────────────────────────
function DraggableHeader({
  header,
  children,
  enableReorder,
  enableColumnResizing,
  align = 'center',
}: {
  header: any;
  children: React.ReactNode;
  enableReorder: boolean;
  enableColumnResizing: boolean;
  align?: 'center' | 'left';
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.id,
  });

  const isPinned = header.column.getIsPinned();
  const width = header.getSize();

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : undefined,
    position: 'relative',
    boxSizing: 'border-box',
    ...(enableColumnResizing ? { width, minWidth: width, maxWidth: width } : {}),
    ...(isPinned === 'left' ? { position: 'sticky', left: header.column.getStart('left'), zIndex: 10, boxShadow: '2px 0 6px rgba(0,0,0,0.5)' } : {}),
    ...(isPinned === 'right' ? { position: 'sticky', right: header.column.getAfter('right'), zIndex: 10, boxShadow: '-2px 0 6px rgba(0,0,0,0.5)' } : {}),
  };

  const alignClass = align === 'left' ? 'justify-start text-left' : 'justify-center text-center';

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`select-none relative border-b border-[#28334e] bg-[#111827] ${
        isPinned ? 'bg-[#111827]' : ''
      }`}
    >
      {/* Draggable Title Area */}
      <div
        {...(enableReorder ? { ...attributes, ...listeners } : {})}
        className={`flex items-center ${alignClass} gap-1.5 w-full py-3.5 px-3 overflow-hidden text-slate-200 text-xs sm:text-sm font-black uppercase tracking-wider whitespace-nowrap ${
          enableReorder ? 'cursor-grab active:cursor-grabbing hover:text-white transition-colors' : ''
        }`}
        title={enableReorder ? 'Giữ chuột và kéo để thay đổi thứ tự cột' : undefined}
      >
        {enableReorder && <GripVertical size={12} className="text-slate-500 hover:text-indigo-400 shrink-0" />}
        {children}
      </div>

      {/* Resize handle */}
      {enableColumnResizing && header.column.getCanResize() && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          title="Kéo để thay đổi độ rộng cột"
          className={`absolute -right-1 top-1 h-[calc(100%-8px)] w-2.5 cursor-col-resize select-none touch-none rounded-full transition-colors z-30 ${
            header.column.getIsResizing() ? 'bg-indigo-500' : 'bg-transparent hover:bg-indigo-500/60'
          }`}
        />
      )}
    </th>
  );
}

// ─── Column Visibility & Alignment Dropdown ──────────────────────────────────
function ColumnVisibilityDropdown<TData>({
  table,
  columnAlignments,
  onToggleAlignment,
  onResetColumnWidths,
  onMoveColumn,
}: {
  table: ReturnType<typeof useReactTable<TData>>;
  columnAlignments: Record<string, 'center' | 'left'>;
  onToggleAlignment: (colId: string) => void;
  onResetColumnWidths?: () => void;
  onMoveColumn?: (colId: string, direction: 'up' | 'down') => void;
}) {
  const [activeTab, setActiveTab] = useState<'visibility' | 'align'>('visibility');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allCols = table.getAllLeafColumns().filter(c => c.id !== 'select' && c.id !== '_expander');

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c243c] hover:bg-[#253050] text-slate-300 hover:text-white border border-[#303d62] text-xs font-bold transition cursor-pointer"
        title="Hiển thị & Căn chỉnh cột"
      >
        <SlidersHorizontal size={13} className="text-indigo-400" />
        <span className="hidden sm:inline">Cột</span>
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-[60] w-72 bg-[#131929] border border-[#28334e] rounded-2xl shadow-2xl p-3 space-y-2 animate-mac-dropdown">
          {/* TAB SWITCHER */}
          <div className="flex bg-[#0b0e19] p-1 rounded-xl border border-white/5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('visibility')}
              className={`flex-1 py-1.5 text-center rounded-lg transition cursor-pointer ${
                activeTab === 'visibility' ? 'bg-[#5c36f5] text-white font-extrabold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hiển Thị & Thứ Tự
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('align')}
              className={`flex-1 py-1.5 text-center rounded-lg transition cursor-pointer ${
                activeTab === 'align' ? 'bg-[#5c36f5] text-white font-extrabold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Căn Chỉnh
            </button>
          </div>

          {/* TAB 1: VISIBILITY & REORDER */}
          {activeTab === 'visibility' && (
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase text-indigo-400 tracking-wider border-b border-white/10 pb-1.5 mb-1 flex items-center justify-between">
                <span>Cột & Thứ Tự</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => table.toggleAllColumnsVisible(true)}
                    className="text-[9px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition cursor-pointer">Tất cả</button>
                  <button type="button" onClick={() => table.toggleAllColumnsVisible(false)}
                    className="text-[9px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition cursor-pointer">Ẩn hết</button>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-thin pr-1">
                {allCols.map((col, idx) => (
                  <div key={col.id} className="flex items-center justify-between gap-1 text-xs text-slate-200 px-1.5 py-1 rounded-lg hover:bg-[#1e2740] transition group">
                    <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer hover:text-white">
                      <input type="checkbox" checked={col.getIsVisible()} onChange={col.getToggleVisibilityHandler()}
                        className="accent-indigo-500 rounded cursor-pointer w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}</span>
                    </label>
                    {onMoveColumn && (
                      <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => onMoveColumn(col.id, 'up')}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                          title="Chuyển sang trái (Lên)"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === allCols.length - 1}
                          onClick={() => onMoveColumn(col.id, 'down')}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer"
                          title="Chuyển sang phải (Xuống)"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: ALIGNMENT */}
          {activeTab === 'align' && (
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase text-indigo-400 tracking-wider border-b border-white/10 pb-1.5 mb-1">
                <span>Tích = Căn Giữa | Bỏ tích = Trái</span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-0.5 scrollbar-thin pr-1">
                {allCols.map(col => {
                  const isCentered = columnAlignments[col.id] === 'center';
                  const colName = typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id;
                  return (
                    <label key={col.id} className="flex items-center justify-between gap-2 text-xs text-slate-200 cursor-pointer hover:text-white px-1.5 py-1 rounded-lg hover:bg-[#1e2740] transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isCentered}
                          onChange={() => onToggleAlignment(col.id)}
                          className="accent-indigo-500 rounded cursor-pointer w-3.5 h-3.5 shrink-0"
                        />
                        <span className="truncate">{colName}</span>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded shrink-0 ${
                        isCentered ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isCentered ? 'Giữa' : 'Trái'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* RESET BUTTON */}
          {onResetColumnWidths && (
            <div className="pt-2 border-t border-white/10 mt-1">
              <button
                type="button"
                onClick={() => {
                  onResetColumnWidths();
                  setOpen(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-extrabold transition cursor-pointer"
                title="Đặt lại độ rộng, thứ tự, căn chỉnh và hiển thị cột về mặc định"
              >
                <RotateCcw size={12} />
                <span>Đặt lại giao diện cột</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Export Dropdown ──────────────────────────────────────────────────────────
function ExportDropdown<TData>({
  table,
  filename,
}: {
  table: ReturnType<typeof useReactTable<TData>>;
  filename: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getExportRows = () =>
    table.getFilteredRowModel().rows.map(row =>
      row.getVisibleCells()
        .filter(c => c.column.id !== 'select' && c.column.id !== '_expander')
        .map(c => {
          const val = c.getValue();
          if (val === null || val === undefined) return '';
          if (typeof val === 'number') {
            if (!Number.isInteger(val)) {
              return Math.floor(val * 10 + 0.0000001) / 10;
            }
            return val;
          }
          if (typeof val === 'string' && !isNaN(Number(val)) && val.includes('.')) {
            const num = Number(val);
            return (Math.floor(num * 10 + 0.0000001) / 10).toFixed(1);
          }
          if (typeof val === 'object') return JSON.stringify(val);
          return String(val);
        })
    );

  const getHeaders = () =>
    table.getHeaderGroups()[0].headers
      .filter(h => h.column.id !== 'select' && h.column.id !== '_expander' && h.column.getIsVisible())
      .map(h => typeof h.column.columnDef.header === 'string' ? h.column.columnDef.header : h.column.id);

  const exportExcel = () => {
    const headers = getHeaders();
    const rows = getExportRows();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${filename}.xlsx`);
    setOpen(false);
  };

  const exportPDF = () => {
    const headers = getHeaders();
    const rows = getExportRows();
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(12);
    doc.text(filename, 14, 15);
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 22,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 82], textColor: [200, 200, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 255] },
    });
    doc.save(`${filename}.pdf`);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c243c] hover:bg-[#253050] text-slate-300 hover:text-white border border-[#303d62] text-xs font-bold transition cursor-pointer"
        title="Xuất dữ liệu"
      >
        <Download size={13} className="text-emerald-400" />
        <span className="hidden sm:inline">Xuất</span>
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-[60] w-44 bg-[#131929] border border-[#28334e] rounded-2xl shadow-2xl p-2 space-y-1 animate-mac-dropdown">
          <button
            type="button"
            onClick={exportExcel}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-emerald-500/10 hover:border hover:border-emerald-500/20 transition cursor-pointer"
          >
            <FileSpreadsheet size={13} className="text-emerald-400" />
            Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={exportPDF}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-rose-500/10 hover:border hover:border-rose-500/20 transition cursor-pointer"
          >
            <FileText size={13} className="text-rose-400" />
            PDF (.pdf)
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main DataTable ───────────────────────────────────────────────────────────
export function DataTable<TData>({
  data,
  columns,
  loading = false,
  loadingMessage = 'Đang tải dữ liệu...',
  emptyMessage = 'Không tìm thấy dữ liệu phù hợp.',
  pageSize = 20,
  showPagination = true,
  enableGlobalSearch = true,
  enableColumnVisibility = true,
  enableRowSelection = false,
  enableColumnResizing = true,
  enableColumnReorder = true,
  enableGrouping = false,
  enableRowExpansion = false,
  enableColumnPinning = false,
  enableMultiSort = true,
  enableVirtualization,
  enableExport = true,
  stickyHeader = true,
  stickyFirstColumn = false,
  initialSorting = [],
  initialColumnVisibility = {},
  initialColumnPinning = {},
  onRowClick,
  onSelectionChange,
  renderSubComponent,
  toolbarLeft,
  toolbarRight,
  searchPlaceholder = 'Tìm kiếm...',
  exportFilename = 'export',
  tableId,
  userId,
  teacherName,
}: DataTableProps<TData>) {

  const storageKey = `dt_layout_${tableId || exportFilename}`;

  const savedLayout = React.useMemo(() => {
    if (!storageKey || typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(storageKey);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  }, [storageKey]);

  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(() => savedLayout?.sizing || {});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    const baseVis = { ...initialColumnVisibility, ...(savedLayout?.visibility || {}) };
    columns.forEach((col: any) => {
      const id = col.id || col.accessorKey;
      if (id && baseVis[id] === undefined) {
        baseVis[id] = true;
      }
    });
    return baseVis;
  });
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() => savedLayout?.order || []);
  const [columnAlignments, setColumnAlignments] = useState<Record<string, 'center' | 'left'>>(() => savedLayout?.alignments || {});

  // Fetch table settings from Supabase DB on mount if available
  useEffect(() => {
    if (!tableId) return;
    let isMounted = true;
    const fetchDbLayout = async () => {
      try {
        const settingId = `tbl_cfg_${tableId}`;
        const { data, error } = await supabase
          .from('category_budgets')
          .select('note')
          .eq('id', settingId)
          .maybeSingle();

        if (!error && data && data.note && isMounted) {
          const parsed = JSON.parse(data.note);
          if (parsed) {
            if (parsed.sizing) setColumnSizing(parsed.sizing);
            if (parsed.visibility) setColumnVisibility(parsed.visibility);
            if (parsed.order) setColumnOrder(parsed.order);
            if (parsed.alignments) setColumnAlignments(parsed.alignments);
            if (storageKey && typeof window !== 'undefined') {
              localStorage.setItem(storageKey, JSON.stringify(parsed));
            }
          }
        }
      } catch (e) {}
    };
    fetchDbLayout();
    return () => { isMounted = false; };
  }, [tableId, storageKey]);

  // Save table layout updates to both LocalStorage and Supabase DB
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!tableId || typeof window === 'undefined') return;
    const layout = {
      sizing: columnSizing,
      visibility: columnVisibility,
      order: columnOrder,
      alignments: columnAlignments,
    };

    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(layout));
      } catch (e) {}
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const settingId = `tbl_cfg_${tableId}`;
        let uId = userId;
        let tName = teacherName || 'ADMIN';

        if (!uId) {
          const { data: userRes } = await supabase.auth.getUser();
          uId = userRes.user?.id;
        }

        if (uId) {
          await supabase.from('category_budgets').upsert({
            id: settingId,
            user_id: uId,
            teacher_name: tName,
            category: `__TABLE_SETTINGS_${tableId}__`,
            amount: 0,
            type: 'settings',
            icon: 'SlidersHorizontal',
            note: JSON.stringify(layout),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        }
      } catch (e) {}
    }, 500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [columnSizing, columnVisibility, columnOrder, columnAlignments, tableId, storageKey, userId, teacherName]);

  const handleToggleAlignment = useCallback((colId: string) => {
    setColumnAlignments(prev => {
      const current = prev[colId] || 'left';
      const next = current === 'center' ? 'left' : 'center';
      return { ...prev, [colId]: next };
    });
  }, []);

  const handleResetColumnWidths = useCallback(() => {
    setColumnSizing({});
    setColumnVisibility(initialColumnVisibility);
    setColumnOrder([]);
    setColumnAlignments({});
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {}
    }
    if (tableId) {
      const settingId = `tbl_cfg_${tableId}`;
      supabase.from('category_budgets').delete().eq('id', settingId).then(() => {});
    }
  }, [initialColumnVisibility, storageKey, tableId]);

  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(
    stickyFirstColumn
      ? { left: [columns[0] && (columns[0] as any).id || (columns[0] as any).accessorKey || ''], ...initialColumnPinning }
      : initialColumnPinning
  );
  const columnResizeMode: ColumnResizeMode = 'onChange';
  const tableScrollRef = useRef<HTMLDivElement>(null);

  const allColumns = React.useMemo<ColumnDef<TData, any>[]>(() => {
    const cols: ColumnDef<TData, any>[] = [];

    if (enableRowSelection) {
      cols.push({
        id: 'select',
        size: 38,
        minSize: 38,
        maxSize: 38,
        enableResizing: false,
        enableSorting: false,
        enableGlobalFilter: false,
        header: ({ table }) => (
          <div className="flex items-center justify-center w-full">
            <IndeterminateCheckbox
              checked={table.getIsAllPageRowsSelected()}
              indeterminate={table.getIsSomePageRowsSelected()}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center w-full">
            <IndeterminateCheckbox
              checked={row.getIsSelected()}
              indeterminate={row.getIsSomeSelected()}
              onChange={row.getToggleSelectedHandler()}
              onClick={e => e.stopPropagation()}
            />
          </div>
        ),
      });
    }

    if (enableRowExpansion && renderSubComponent) {
      cols.push({
        id: '_expander',
        size: 36,
        enableResizing: false,
        enableSorting: false,
        enableGlobalFilter: false,
        header: () => null,
        cell: ({ row }) =>
          row.getCanExpand() ? (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); row.toggleExpanded(); }}
              className="p-1 rounded text-slate-400 hover:text-indigo-400 transition cursor-pointer"
            >
              {row.getIsExpanded() ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          ) : null,
      });
    }

    cols.push(...columns);
    return cols;
  }, [columns, enableRowSelection, enableRowExpansion, renderSubComponent]);

  const table = useReactTable<TData>({
    data,
    columns: allColumns,
    columnResizeMode,
    state: {
      globalFilter,
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      grouping,
      expanded,
      columnPinning,
      columnOrder,
      columnSizing,
    },
    onColumnSizingChange: setColumnSizing,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: updater => {
      setRowSelection(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        return next;
      });
    },
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    onColumnPinningChange: setColumnPinning,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getGroupedRowModel: enableGrouping ? getGroupedRowModel() : undefined,
    getExpandedRowModel: (enableRowExpansion || enableGrouping) ? getExpandedRowModel() : undefined,
    enableRowSelection,
    enableColumnResizing,
    enableGrouping,
    enableGlobalFilter: enableGlobalSearch,
    enableMultiSort,
    isMultiSortEvent: () => true,
    getRowCanExpand: enableRowExpansion ? () => true : undefined,
    initialState: { pagination: { pageSize } },
  });

  const handleMoveColumn = useCallback((colId: string, direction: 'up' | 'down') => {
    const currentOrder = table.getState().columnOrder.length > 0
      ? [...table.getState().columnOrder]
      : table.getAllLeafColumns().filter(c => c.id !== 'select' && c.id !== '_expander').map(c => c.id);
    const idx = currentOrder.indexOf(colId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentOrder.length) return;
    setColumnOrder(arrayMove(currentOrder, idx, targetIdx));
  }, [table]);

  const prevSelRef = useRef<RowSelectionState>({});
  useEffect(() => {
    if (!onSelectionChange) return;
    if (JSON.stringify(rowSelection) === JSON.stringify(prevSelRef.current)) return;
    prevSelRef.current = rowSelection;
    const selected = table.getRowModel().rows
      .filter(r => rowSelection[r.id])
      .map(r => r.original);
    onSelectionChange(selected);
  }, [rowSelection, table, onSelectionChange]);

  const useVirt = enableVirtualization !== undefined
    ? enableVirtualization
    : data.length > 500;

  const allRows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () => 44,
    overscan: 10,
    enabled: useVirt && !loading && allRows.length > 0,
  });

  const virtualRows = useVirt ? virtualizer.getVirtualItems() : null;
  const totalSize = useVirt ? virtualizer.getTotalSize() : 0;
  const paddingTop = virtualRows && virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows && virtualRows.length > 0
    ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)
    : 0;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const currentOrder = table.getState().columnOrder.length > 0
      ? table.getState().columnOrder
      : table.getAllLeafColumns().map(c => c.id);
    const oldIndex = currentOrder.indexOf(String(active.id));
    const newIndex = currentOrder.indexOf(String(over.id));
    if (oldIndex !== -1 && newIndex !== -1) {
      setColumnOrder(arrayMove(currentOrder, oldIndex, newIndex));
    }
  }, [table]);

  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const hasActiveFilter = globalFilter.trim().length > 0 || columnFilters.length > 0;
  const selectedCount = Object.keys(rowSelection).length;

  const orderedHeaderIds = table.getHeaderGroups()[0]?.headers.map(h => h.id) ?? [];

  return (
    <div className="flex flex-col min-h-0 w-full font-sans border border-[#1e2740] rounded-2xl overflow-hidden bg-[#0d1018]">
      {/* ── TOOLBAR ─────────────────────────────────────────────────────────── */}
      {(enableGlobalSearch || enableColumnVisibility || enableExport || toolbarLeft || toolbarRight) && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-[#1e2740] bg-[#0b0e1a] shrink-0">
          {/* Left */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {enableGlobalSearch && (
              <div className="relative flex-1 min-w-[160px] max-w-sm">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={globalFilter}
                  onChange={e => setGlobalFilter(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-[#13192c] border border-[#253050] text-white text-xs rounded-xl pl-8 pr-8 py-1.5 focus:outline-none focus:border-indigo-500/60 placeholder:text-slate-600 font-medium transition"
                />
                {globalFilter && (
                  <button type="button" onClick={() => setGlobalFilter('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition cursor-pointer">
                    <X size={11} />
                  </button>
                )}
              </div>
            )}
            {toolbarLeft}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {hasActiveFilter && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                <span>{totalFiltered.toLocaleString()} kết quả</span>
                <button type="button" onClick={() => { setGlobalFilter(''); setColumnFilters([]); }}
                  className="text-indigo-400 hover:text-white cursor-pointer"><X size={10} /></button>
              </div>
            )}

            {useVirt && !loading && (
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold">
                <Zap size={10} />
                <span>Virtual</span>
              </div>
            )}

            {enableRowSelection && selectedCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                <CheckSquare size={10} />
                <span>{selectedCount} đã chọn</span>
                <button type="button" onClick={() => setRowSelection({})}
                  className="text-emerald-400 hover:text-white cursor-pointer"><X size={10} /></button>
              </div>
            )}

            {toolbarRight}

            {enableExport && <ExportDropdown<TData> table={table} filename={exportFilename} />}
            {enableColumnVisibility && (
              <ColumnVisibilityDropdown<TData>
                table={table}
                columnAlignments={columnAlignments}
                onToggleAlignment={handleToggleAlignment}
                onResetColumnWidths={handleResetColumnWidths}
                onMoveColumn={handleMoveColumn}
              />
            )}
          </div>
        </div>
      )}

      {/* ── TABLE AREA ──────────────────────────────────────────────────────── */}
      {loading && allRows.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-16">
          <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin" />
          <span className="text-xs font-bold">{loadingMessage}</span>
        </div>
      ) : allRows.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-16 text-center px-4">
          <AlertCircle className="h-9 w-9 text-indigo-400/40" />
          {typeof emptyMessage === 'string'
            ? <p className="text-sm font-black text-slate-300">{emptyMessage}</p>
            : emptyMessage}
          {hasActiveFilter && (
            <button type="button" onClick={() => { setGlobalFilter(''); setColumnFilters([]); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer">
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div
            ref={tableScrollRef}
            className={`overflow-x-auto relative ${useVirt ? 'overflow-y-auto flex-1 min-h-0' : 'overflow-y-visible'}`}
            style={{ overscrollBehaviorX: 'contain' }}
          >
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedHeaderIds} strategy={horizontalListSortingStrategy}>
                <table
                  className="text-left text-sm"
                  style={{
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                    tableLayout: enableColumnResizing ? 'fixed' : 'auto',
                    ...(enableColumnResizing ? { width: table.getTotalSize() } : { width: '100%' }),
                  }}
                >
                  <thead className={`bg-[#111827] ${stickyHeader ? 'sticky top-0 z-20' : ''}`}>
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => {
                          const isSelectCol = header.column.id === 'select' || header.column.id === '_expander';
                          const align = isSelectCol ? 'center' : (columnAlignments[header.column.id] || 'left');

                          return (
                            <DraggableHeader
                              key={header.id}
                              header={header}
                              enableReorder={enableColumnReorder && !isSelectCol}
                              enableColumnResizing={enableColumnResizing}
                              align={align}
                            >
                              <div
                                className={`inline-flex items-center ${align === 'left' ? 'justify-start' : 'justify-center'} gap-1.5 max-w-full ${
                                  header.column.getCanSort() ? 'cursor-pointer select-none hover:text-white transition-colors' : ''
                                }`}
                                onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                              >
                                <span className="truncate">
                                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                </span>

                                {header.column.getCanSort() && (
                                  <span className="shrink-0 inline-flex items-center">
                                    {header.column.getIsSorted() === 'asc'
                                      ? <ArrowUp size={12} className="text-indigo-400" />
                                      : header.column.getIsSorted() === 'desc'
                                      ? <ArrowDown size={12} className="text-indigo-400" />
                                      : <ArrowUpDown size={12} className="text-slate-600 hover:text-slate-400 transition" />}
                                  </span>
                                )}

                                {header.column.getIsSorted() && enableMultiSort && (() => {
                                  const idx = sorting.findIndex(s => s.id === header.column.id);
                                  return sorting.length > 1 && idx !== -1 ? (
                                    <span className="text-[9px] font-black text-indigo-300 bg-indigo-500/20 rounded px-1 shrink-0">{idx + 1}</span>
                                  ) : null;
                                })()}
                              </div>
                            </DraggableHeader>
                          );
                        })}
                      </tr>
                    ))}
                  </thead>

                  <tbody className="bg-[#0d1018]">
                    {useVirt && paddingTop > 0 && (
                      <tr><td style={{ height: paddingTop }} colSpan={allColumns.length} /></tr>
                    )}

                    {(useVirt ? virtualRows!.map(vr => allRows[vr.index]) : allRows).map((row, rowIdx) => (
                      <Fragment key={row.id}>
                        <tr
                          className={`
                            group transition-colors duration-150
                            ${onRowClick ? 'cursor-pointer' : ''}
                            ${row.getIsSelected()
                              ? 'bg-indigo-500/10 hover:bg-indigo-500/15'
                              : rowIdx % 2 === 0
                              ? 'bg-[#0d1018] hover:bg-[#131928]'
                              : 'bg-[#0b0f1c] hover:bg-[#131928]'}
                          `}
                          onClick={() => onRowClick?.(row.original)}
                        >
                          {row.getVisibleCells().map((cell, cellIdx) => {
                            const isPinned = cell.column.getIsPinned();
                            const isLastRow = rowIdx === allRows.length - 1;
                            const isFirstCell = cellIdx === 0;
                            const isLastCell = cellIdx === row.getVisibleCells().length - 1;
                            const isSelectCol = cell.column.id === 'select' || cell.column.id === '_expander';
                            const isCentered = isSelectCol || columnAlignments[cell.column.id] === 'center';

                            return (
                              <td
                                key={cell.id}
                                className={`
                                  py-3 ${isSelectCol ? 'px-1' : 'px-3.5'} font-semibold text-slate-200 text-xs sm:text-sm
                                  border-b border-[#161e30]
                                  ${isCentered ? 'text-center' : 'text-left'}
                                  ${isPinned ? 'bg-inherit' : ''}
                                  ${isLastRow && isFirstCell ? 'rounded-bl-xl' : ''}
                                  ${isLastRow && isLastCell ? 'rounded-br-xl' : ''}
                                `}
                                style={{
                                  boxSizing: 'border-box',
                                  ...(enableColumnResizing ? { width: cell.column.getSize(), minWidth: cell.column.getSize(), maxWidth: cell.column.getSize() } : {}),
                                  ...(isPinned === 'left' ? { position: 'sticky', left: cell.column.getStart('left'), zIndex: 3, boxShadow: '2px 0 6px rgba(0,0,0,0.4)' } : {}),
                                  ...(isPinned === 'right' ? { position: 'sticky', right: cell.column.getAfter('right'), zIndex: 3, boxShadow: '-2px 0 6px rgba(0,0,0,0.4)' } : {}),
                                  backgroundColor: isPinned
                                    ? (row.getIsSelected() ? 'rgba(99,102,241,0.1)' : rowIdx % 2 === 0 ? '#0d1018' : '#0b0f1c')
                                    : undefined,
                                }}
                              >
                                <div className={`w-full flex items-center ${isCentered ? 'justify-center text-center' : 'justify-start text-left'}`}>
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </div>
                              </td>
                            );
                          })}
                        </tr>

                        {row.getIsExpanded() && renderSubComponent && (
                          <tr className="bg-[#090c16] border-b border-[#1a2236]">
                            <td colSpan={row.getVisibleCells().length} className="px-5 py-4">
                              {renderSubComponent({ row })}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}

                    {useVirt && paddingBottom > 0 && (
                      <tr><td style={{ height: paddingBottom }} colSpan={allColumns.length} /></tr>
                    )}
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>
          </div>

          {/* ── PAGINATION ──────────────────────────────────────────────────── */}
          {showPagination && pageCount > 0 && !useVirt && (
            <div className="shrink-0 px-4 py-2.5 bg-[#090c16] border-t border-[#1a2236] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-bold">
              <div className="flex items-center gap-3 flex-wrap">
                <span>
                  Trang <span className="text-white">{pageIndex + 1}</span> / {pageCount}
                  <span className="text-slate-600 ml-2">({totalFiltered.toLocaleString()} bản ghi)</span>
                </span>
                <select
                  value={table.getState().pagination.pageSize}
                  onChange={e => table.setPageSize(Number(e.target.value))}
                  className="bg-[#13192c] border border-[#253050] text-white text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                >
                  {[10, 20, 50, 100].map(sz => (
                    <option key={sz} value={sz}>{sz} / trang</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button type="button" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}
                  className="p-1.5 rounded-lg bg-[#141c2e] hover:bg-[#1e2a42] text-slate-300 disabled:opacity-30 border border-white/10 transition cursor-pointer disabled:cursor-not-allowed" title="Trang đầu">
                  <ChevronsLeft size={13} />
                </button>
                <button type="button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                  className="px-2.5 py-1.5 rounded-lg bg-[#141c2e] hover:bg-[#1e2a42] text-slate-300 disabled:opacity-30 border border-white/10 transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed">
                  <ChevronLeft size={13} /><span>Trước</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
                    let pageNum: number;
                    if (pageCount <= 5) pageNum = i;
                    else if (pageIndex < 3) pageNum = i;
                    else if (pageIndex > pageCount - 4) pageNum = pageCount - 5 + i;
                    else pageNum = pageIndex - 2 + i;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => table.setPageIndex(pageNum)}
                        className={`w-7 h-7 rounded-lg text-[11px] font-extrabold border transition cursor-pointer ${
                          pageNum === pageIndex
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_8px_rgba(99,102,241,0.4)]'
                            : 'bg-[#141c2e] border-white/10 text-slate-400 hover:bg-[#1e2a42] hover:text-white'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                </div>

                <button type="button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                  className="px-2.5 py-1.5 rounded-lg bg-[#141c2e] hover:bg-[#1e2a42] text-slate-300 disabled:opacity-30 border border-white/10 transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed">
                  <span>Sau</span><ChevronRight size={13} />
                </button>
                <button type="button" onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()}
                  className="p-1.5 rounded-lg bg-[#141c2e] hover:bg-[#1e2a42] text-slate-300 disabled:opacity-30 border border-white/10 transition cursor-pointer disabled:cursor-not-allowed" title="Trang cuối">
                  <ChevronsRight size={13} />
                </button>
              </div>
            </div>
          )}

          {useVirt && (
            <div className="shrink-0 px-4 py-2 bg-[#090c16] border-t border-[#1a2236] flex items-center justify-between text-[10px] text-slate-500 font-bold">
              <div className="flex items-center gap-2">
                <Zap size={10} className="text-amber-400" />
                <span>Virtual scroll — {allRows.length.toLocaleString()} hàng</span>
                {hasActiveFilter && <span className="text-indigo-400">({totalFiltered.toLocaleString()} kết quả)</span>}
              </div>
              {enableExport && (
                <span className="text-slate-600">Xuất để lưu toàn bộ dữ liệu</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
