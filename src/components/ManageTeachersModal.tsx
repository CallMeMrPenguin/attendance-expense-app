import React, { useState } from 'react';
import { X, UserCheck, Plus, Trash2, Edit2, Loader2, AlertCircle } from 'lucide-react';

interface ManageTeachersModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTeacherName: string;
  teachers: string[];
  sessionToken: string;
  onTeacherUpdated: (updatedActiveName?: string) => void;
}

export default function ManageTeachersModal({
  isOpen,
  onClose,
  activeTeacherName,
  teachers,
  sessionToken,
  onTeacherUpdated,
}: ManageTeachersModalProps) {
  const [newTeacherName, setNewTeacherName] = useState('');
  const [renameValue, setRenameValue] = useState(activeTeacherName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  // 1. Rename Teacher
  const handleRename = async () => {
    if (!renameValue.trim()) {
      setError('Vui lòng nhập tên mới cho giáo viên!');
      return;
    }
    if (renameValue.trim() === activeTeacherName) {
      setError('Tên mới trùng với tên cũ.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/teachers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ oldName: activeTeacherName, newName: renameValue.trim() }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to rename teacher');
      }

      setSuccess(`Đổi tên thành công: ${activeTeacherName} -> ${renameValue.trim()}`);
      onTeacherUpdated(renameValue.trim());
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Add Teacher
  const handleAdd = async () => {
    if (!newTeacherName.trim()) {
      setError('Vui lòng nhập tên giáo viên mới!');
      return;
    }
    if (teachers.includes(newTeacherName.trim())) {
      setError('Tên giáo viên này đã tồn tại!');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ name: newTeacherName.trim() }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to create teacher');
      }

      setSuccess(`Đã thêm giáo viên: ${newTeacherName.trim()}`);
      setNewTeacherName('');
      onTeacherUpdated(newTeacherName.trim());
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Delete Teacher
  const handleDelete = async () => {
    if (teachers.length <= 1) {
      setError('Cần giữ lại ít nhất 1 giáo viên!');
      return;
    }
    const confirmed = confirm(
      `Bạn có chắc chắn muốn xóa giáo viên "${activeTeacherName}" và tất cả ca dạy của giáo viên này? Hành động này không thể hoàn tác!`
    );
    if (!confirmed) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/teachers', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ name: activeTeacherName }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to delete teacher');
      }

      setSuccess(`Đã xóa giáo viên "${activeTeacherName}" thành công.`);
      const remainingTeachers = teachers.filter((t) => t !== activeTeacherName);
      onTeacherUpdated(remainingTeachers[0] || '');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <UserCheck className="h-5 w-5 text-indigo-500" />
            Quản Lý Giáo Viên
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              {success}
            </div>
          )}

          {/* Action 1: Rename Active Teacher */}
          <div className="space-y-2">
            <label className="text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider block">
              Đổi Tên Giáo Viên Đang Chọn (&quot;{activeTeacherName}&quot;)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Edit2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="Tên mới..."
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                onClick={handleRename}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer shrink-0"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Đổi Tên
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 my-4"></div>

          {/* Action 2: Add New Teacher */}
          <div className="space-y-2">
            <label className="text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider block">
              Thêm Giáo Viên Mới
            </label>
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  placeholder="Nhập tên giáo viên mới..."
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer shrink-0"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Thêm GV
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 my-4"></div>

          {/* Action 3: Delete Active Teacher */}
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h4 className="text-red-700 dark:text-red-400 font-bold text-sm">
                Xóa Giáo Viên Đang Chọn
              </h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                Xóa hồ sơ giáo viên &ldquo;{activeTeacherName}&rdquo; và toàn bộ ca dạy tương ứng.
              </p>
            </div>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Xóa GV Này
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl text-sm font-semibold transition-all"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
