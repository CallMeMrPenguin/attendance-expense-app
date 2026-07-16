import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  isOpen,
  title = 'Xác Nhận Thao Tác',
  message,
  confirmLabel = 'Xác Nhận',
  cancelLabel = 'Hủy Bỏ',
  variant = 'danger',
  onConfirm,
  onClose
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999999] flex items-center justify-center p-4 overflow-hidden pointer-events-auto animate-mac-backdrop text-slate-100 select-none">
      <div 
        className="bg-[#0f1320] border border-white/15 rounded-2xl w-full max-w-sm p-6 relative shadow-[0_25px_60px_rgba(0,0,0,0.9)] animate-mac-modal text-center space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Warning Icon Badge */}
        <div className="flex justify-center pt-2">
          <div className={`p-3.5 rounded-2xl border flex items-center justify-center ${
            isDanger 
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-[0_0_20px_rgba(239,68,68,0.35)]'
              : isWarning
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
              : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400 shadow-[0_0_20px_rgba(92,54,245,0.35)]'
          }`}>
            {isDanger ? <Trash2 className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}
          </div>
        </div>

        {/* Title & Message */}
        <div className="space-y-1.5">
          <h3 className={`text-sm font-black uppercase tracking-wider ${
            isDanger ? 'text-rose-400 text-glow-red' : isWarning ? 'text-amber-400' : 'text-indigo-400 text-glow-purple'
          }`}>
            {title}
          </h3>
          <p className="text-xs font-semibold text-slate-300 leading-relaxed px-2">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-[#181d2f] hover:bg-[#22283f] text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-white/5 transition-all cursor-pointer active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-2.5 px-4 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
              isDanger
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] border border-rose-400/30'
                : isWarning
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-400/30'
                : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_0_15px_rgba(92,54,245,0.4)] border border-indigo-400/30'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
