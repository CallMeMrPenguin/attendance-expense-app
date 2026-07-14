import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserCheck, 
  Plus, 
  Trash2, 
  Save, 
  Key, 
  User, 
  Loader2, 
  AlertCircle,
  Briefcase,
  Unlock,
  ShieldAlert,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ManageTeachersModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTeacherName: string;
  teachers: string[];
  sessionToken: string;
  currentAdminTeacherName: string;
  onTeacherUpdated: (updatedActiveName?: string) => void;
}

interface TeacherProfile {
  username: string;
  teacher_name: string;
  role: string;
}

export default function ManageTeachersModal({
  isOpen,
  onClose,
  activeTeacherName,
  teachers,
  sessionToken,
  currentAdminTeacherName,
  onTeacherUpdated,
}: ManageTeachersModalProps) {
  // Navigation states
  const [selectedTeacher, setSelectedTeacher] = useState(activeTeacherName);
  const [teacherProfiles, setTeacherProfiles] = useState<Record<string, TeacherProfile>>({});

  // Input states for editing selected teacher
  const [editName, setEditName] = useState(selectedTeacher);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'teacher' | 'user'>('teacher');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);
  
  // Add new teacher states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherUsername, setNewTeacherUsername] = useState('');
  const [newTeacherRole, setNewTeacherRole] = useState<'teacher' | 'user' | 'admin'>('teacher');
  const [newTeacherPassword, setNewTeacherPassword] = useState('123456');
  const [newTeacherConfirmPassword, setNewTeacherConfirmPassword] = useState('123456');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewConfirmPassword, setShowNewConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // 1. Fetch teacher profiles helper
  const fetchProfiles = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('username, teacher_name, role');
        
      if (!dbError && data) {
        const profileMap: Record<string, TeacherProfile> = {};
        data.forEach((p: any) => {
          profileMap[p.teacher_name] = p;
        });
        setTeacherProfiles(profileMap);
      } else if (dbError) {
        throw dbError;
      }
    } catch (err: any) {
      setError('Không thể tải hồ sơ tài khoản: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProfiles();
    }
  }, [isOpen]);

  // 2. Sync inputs when selected teacher changes (No network calls, pure local state updates)
  useEffect(() => {
    const p = teacherProfiles[selectedTeacher];
    if (p) {
      setEditName(p.teacher_name);
      setEditUsername(p.username);
      setEditRole((p.role as 'admin' | 'teacher') || 'teacher');
    } else {
      setEditName(selectedTeacher);
      setEditUsername('');
      setEditRole('teacher');
    }
    setEditPassword('');
    setError('');
    setSuccess('');
  }, [selectedTeacher, teacherProfiles]);

  if (!isOpen) return null;

  const handleSelectTeacher = (name: string) => {
    setSelectedTeacher(name);
  };

  // 3. Save Teacher Updates (Name, Username, Password, Role)
  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setError('Vui lòng nhập tên giáo viên.');
      return;
    }
    if (!editUsername.trim()) {
      setError('Vui lòng nhập tên đăng nhập.');
      return;
    }
    if (editPassword && editPassword.length < 6) {
      setError('Mật khẩu mới phải từ 6 ký tự trở lên.');
      return;
    }
    if (editPassword && editPassword !== editConfirmPassword) {
      setError('Mật khẩu mới và xác nhận mật khẩu không trùng khớp!');
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
        body: JSON.stringify({
          oldName: selectedTeacher,
          newName: editName.trim(),
          newUsername: editUsername.trim().toLowerCase(),
          newPassword: editPassword.trim() || undefined,
          newRole: editRole,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Cập nhật thất bại.');
      }

      setSuccess('Cập nhật thông tin tài khoản thành công!');
      setEditPassword('');
      setEditConfirmPassword('');
      
      // Update local profiles list cache
      const updatedProfile = {
        username: editUsername.trim().toLowerCase(),
        teacher_name: editName.trim(),
        role: editRole
      };
      
      setTeacherProfiles(prev => {
        const next = { ...prev };
        delete next[selectedTeacher];
        next[editName.trim()] = updatedProfile;
        return next;
      });

      setSelectedTeacher(editName.trim());
      onTeacherUpdated(selectedTeacher === activeTeacherName ? editName.trim() : undefined);
      setTimeout(() => setSuccess(''), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Add New Teacher Account
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim()) {
      setError('Vui lòng nhập tên tài khoản.');
      return;
    }
    if (teachers.includes(newTeacherName.trim())) {
      setError('Giáo viên này đã tồn tại!');
      return;
    }
    if (newTeacherPassword.length < 6) {
      setError('Mật khẩu phải từ 6 ký tự trở lên.');
      return;
    }
    if (newTeacherPassword !== newTeacherConfirmPassword) {
      setError('Mật khẩu và xác nhận mật khẩu không trùng khớp!');
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
        body: JSON.stringify({
          name: newTeacherName.trim(),
          username: newTeacherUsername.trim() || undefined,
          role: newTeacherRole,
          password: newTeacherPassword.trim(),
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Tạo tài khoản thất bại.');
      }

      setSuccess(`Đã tạo tài khoản "${newTeacherName.trim()}" thành công!`);
      
      const createdUsername = resData.user?.username || newTeacherUsername.trim() || newTeacherName.trim().toLowerCase().replace(/\s+/g, '');
      const newProf = {
        username: createdUsername,
        teacher_name: newTeacherName.trim(),
        role: newTeacherRole
      };

      setTeacherProfiles(prev => ({
        ...prev,
        [newTeacherName.trim()]: newProf
      }));

      setNewTeacherName('');
      setNewTeacherUsername('');
      setNewTeacherPassword('123456');
      setNewTeacherConfirmPassword('123456');
      setShowAddForm(false);
      
      onTeacherUpdated(newTeacherName.trim());
      setSelectedTeacher(newTeacherName.trim());
      await fetchProfiles();
      setTimeout(() => setSuccess(''), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 5. Execute Delete Teacher Account
  const executeDeleteTeacher = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setShowDeleteConfirmModal(false);

    try {
      const response = await fetch('/api/teachers', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ name: selectedTeacher }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Xóa giáo viên thất bại.');
      }

      setSuccess(`Đã xóa giáo viên "${selectedTeacher}" thành công.`);
      
      // Remove from cache
      setTeacherProfiles(prev => {
        const next = { ...prev };
        delete next[selectedTeacher];
        return next;
      });

      const remaining = teachers.filter((t) => t !== selectedTeacher);
      const nextSelect = remaining[0] || '';
      setSelectedTeacher(nextSelect);
      onTeacherUpdated(nextSelect);
      await fetchProfiles();
      setTimeout(() => setSuccess(''), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeacher = () => {
    if (teachers.length <= 1) {
      setError('Cần giữ lại ít nhất 1 giáo viên!');
      return;
    }
    if (selectedTeacher === 'Admin' || selectedTeacher === 'admin') {
      setError('Không thể xóa tài khoản Admin hệ thống.');
      return;
    }
    setShowDeleteConfirmModal(true);
  };

  return (
    <div 
      className="fixed inset-0 bg-[#070911]/90 z-[100] flex items-center justify-center p-4 overflow-hidden pointer-events-auto select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4">
          <div className="bg-[#121624] border border-rose-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2.5 text-rose-400 font-black text-base">
              <Trash2 className="h-5 w-5 shrink-0" />
              <span>Xác Nhận Xóa Giáo Viên</span>
            </div>
            <p className="text-xs text-slate-300 font-medium leading-relaxed bg-slate-900/80 p-3.5 rounded-xl border border-white/5">
              Xóa giáo viên <strong className="text-white">"{selectedTeacher}"</strong> sẽ xóa toàn bộ lịch dạy và tài khoản đăng nhập của người này vĩnh viễn. Bạn có chắc chắn muốn xóa không?
            </p>
            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={executeDeleteTeacher}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-[0_0_15px_rgba(244,63,94,0.4)] cursor-pointer"
              >
                Đồng Ý Xóa
              </button>
            </div>
          </div>
        </div>
      )}
      <div 
        className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-indigo-500" />
            Hồ Sơ Giáo Viên
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Alerts and errors */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-red-650 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3 bg-emerald-55 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-650 dark:text-emerald-400 text-xs font-bold">
            {success}
          </div>
        )}

        {/* Modal Main Content Box */}
        <div className="flex-grow overflow-y-auto flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-150 dark:divide-slate-800">
          
          {/* Left Column: Teachers List */}
          <div className="w-full md:w-1/3 p-4 flex flex-col gap-3 min-h-[220px] md:min-h-0 bg-slate-50/50 dark:bg-slate-950/20 shrink-0">
            <div className="flex justify-between items-center select-none shrink-0">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Danh sách ({teachers.length})
              </span>
              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setError('');
                  setSuccess('');
                }}
                className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg shadow-sm transition-all flex items-center gap-0.5 cursor-pointer uppercase tracking-wider"
              >
                <Plus className="h-3 w-3" />
                Tạo Mới
              </button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {teachers.map((name) => {
                const profile = teacherProfiles[name];
                const isActive = name === selectedTeacher;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleSelectTeacher(name)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{name}</span>
                    <span className={`text-[8px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : profile?.role === 'admin'
                          ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700/50'
                    }`}>
                      {profile?.role === 'admin' ? 'Admin' : 'Giáo Viên'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Edit Profile / Add Profile form panel */}
          <div className="flex-grow p-6">
            {showAddForm ? (
              /* Sub-View: Add New Teacher Account Form */
              <form onSubmit={handleAddTeacher} className="space-y-4 animate-fade-in text-left">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="font-extrabold text-sm text-indigo-650 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    Tạo Giáo Viên Mới
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-xs text-slate-400 hover:text-slate-650 hover:font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="newNameInput" className="text-slate-700 dark:text-slate-350 text-xs font-bold uppercase tracking-wider">
                    Tên hiển thị (Họ & Tên) *
                  </label>
                  <input
                    id="newNameInput"
                    type="text"
                    required
                    value={newTeacherName}
                    onChange={(e) => setNewTeacherName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A hoặc Phạm Thị Thu Trang..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="newUsernameInput" className="text-slate-700 dark:text-slate-350 text-xs font-bold uppercase tracking-wider">
                    Tên Đăng Nhập / Email (Tùy chọn)
                  </label>
                  <input
                    id="newUsernameInput"
                    type="text"
                    value={newTeacherUsername}
                    onChange={(e) => setNewTeacherUsername(e.target.value)}
                    placeholder="VD: phamthithutrang@gmail.com hoặc trang123..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    Để trống nếu muốn hệ thống tự sinh tên đăng nhập từ Họ & Tên.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="newRoleSelect" className="text-slate-700 dark:text-slate-350 text-xs font-bold uppercase tracking-wider">
                    Phân Quyền / Vai Trò *
                  </label>
                  <select
                    id="newRoleSelect"
                    value={newTeacherRole}
                    onChange={(e) => setNewTeacherRole(e.target.value as 'teacher' | 'user' | 'admin')}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="teacher">Giáo Viên (Tutor)</option>
                    <option value="user">Người Dùng Thông Thường (User)</option>
                    <option value="admin">Quản Trị Viên (Admin)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="newPasswordInput" className="text-slate-700 dark:text-slate-350 text-xs font-bold uppercase tracking-wider">
                    Mật khẩu đăng nhập *
                  </label>
                  <div className="relative">
                    <input
                      id="newPasswordInput"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newTeacherPassword}
                      onChange={(e) => setNewTeacherPassword(e.target.value)}
                      placeholder="VD: 123456..."
                      className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                      title={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="newConfirmPasswordInput" className="text-slate-700 dark:text-slate-350 text-xs font-bold uppercase tracking-wider">
                    Xác nhận mật khẩu *
                  </label>
                  <div className="relative">
                    <input
                      id="newConfirmPasswordInput"
                      type={showNewConfirmPassword ? 'text' : 'password'}
                      required
                      value={newTeacherConfirmPassword}
                      onChange={(e) => setNewTeacherConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu..."
                      className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewConfirmPassword(!showNewConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                      title={showNewConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showNewConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer uppercase tracking-wider"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Tạo Tài Khoản
                </button>
              </form>
            ) : (
              /* Sub-View: Selected Teacher details & credentials editor */
              <form onSubmit={handleSaveTeacher} className="space-y-4 animate-fade-in text-left">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-indigo-500" />
                    Cấu hình tài khoản
                  </h3>
                </div>

                {/* Edit Username (Login username) */}
                <div className="space-y-1.5">
                  <label htmlFor="editUsernameInput" className="text-slate-700 dark:text-slate-350 text-xs font-bold uppercase tracking-wider">
                    Tên Đăng Nhập / Email *
                  </label>
                  <input
                    id="editUsernameInput"
                    type="text"
                    required
                    disabled={selectedTeacher === 'Admin' || selectedTeacher === 'admin'}
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="VD: phamthithutrang@gmail.com hoặc nguyenvana..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed font-semibold text-slate-700 dark:text-slate-300"
                  />
                  {(selectedTeacher === 'Admin' || selectedTeacher === 'admin') && (
                    <div className="flex items-center gap-1.5 text-[9px] text-amber-600 dark:text-amber-450 font-bold uppercase tracking-wider">
                      <ShieldAlert className="h-3 w-3" />
                      Không thể sửa tên đăng nhập chính của hệ thống.
                    </div>
                  )}
                </div>

                {/* Edit Teacher Display Name */}
                <div className="space-y-1.5">
                  <label htmlFor="editNameInput" className="text-slate-700 dark:text-slate-350 text-xs font-bold uppercase tracking-wider">
                    Tên Hiển Thị (Họ & Tên) *
                  </label>
                  <input
                    id="editNameInput"
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Edit Role Select */}
                <div className="space-y-1.5">
                  <label htmlFor="editRoleSelect" className="text-slate-700 dark:text-slate-350 text-xs font-bold uppercase tracking-wider">
                    Phân Quyền / Vai Trò *
                  </label>
                  <select
                    id="editRoleSelect"
                    value={editRole}
                    disabled={selectedTeacher === currentAdminTeacherName || selectedTeacher === 'Admin' || selectedTeacher === 'admin'}
                    onChange={(e) => setEditRole(e.target.value as 'admin' | 'teacher' | 'user')}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-75"
                  >
                    <option value="teacher">Giáo Viên (Tutor)</option>
                    <option value="user">Người Dùng Thông Thường (User)</option>
                    <option value="admin">Quản Trị Viên (Admin)</option>
                  </select>
                </div>

                {/* Reset Password */}
                <div className="space-y-3 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl p-4">
                  <div>
                    <h4 className="text-xs font-extrabold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                      <Unlock className="h-3.5 w-3.5" />
                      Cấp lại / Thay đổi mật khẩu
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5 leading-tight">
                      Để trống nếu không muốn thay đổi mật khẩu của tài khoản này:
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Mật khẩu mới (tối thiểu 6 ký tự)..."
                        className="w-full pl-10 pr-10 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                        title={showEditPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {editPassword.length > 0 && (
                      <div className="relative animate-fade-in">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type={showEditConfirmPassword ? 'text' : 'password'}
                          value={editConfirmPassword}
                          onChange={(e) => setEditConfirmPassword(e.target.value)}
                          placeholder="Xác nhận mật khẩu mới..."
                          className="w-full pl-10 pr-10 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditConfirmPassword(!showEditConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                          title={showEditConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {showEditConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer buttons row */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleDeleteTeacher}
                    disabled={loading || selectedTeacher === currentAdminTeacherName || selectedTeacher === 'Admin' || selectedTeacher === 'admin'}
                    className="px-3.5 py-2.5 text-red-650 dark:text-red-400 border border-red-200 dark:border-red-950 bg-red-50/40 dark:bg-red-950/10 hover:bg-red-100 dark:hover:bg-red-950/25 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 shrink-0 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa Tài Khoản
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Cập Nhật Hồ Sơ
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-semibold transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
