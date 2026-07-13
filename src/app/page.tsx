'use client';
//test
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  School, 
  CalendarDays, 
  UserCircle, 
  Settings, 
  LogOut, 
  Key, 
  Plus, 
  TrendingUp, 
  CheckCircle2, 
  DollarSign, 
  AlertCircle,
  Calendar as CalendarIcon,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Session, formatVND } from '@/lib/utils';
import CalendarMonthView from '@/components/CalendarMonthView';
import CalendarWeekView from '@/components/CalendarWeekView';
import AddSessionModal from '@/components/AddSessionModal';
import EditSessionModal from '@/components/EditSessionModal';
import ManageTeachersModal from '@/components/ManageTeachersModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';

interface UserProfile {
  id: string;
  username: string;
  teacherName: string;
  role: 'admin' | 'teacher';
  token: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [teachers, setTeachers] = useState<string[]>([]);
  const [activeTeacherName, setActiveTeacherName] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [currentView, setCurrentView] = useState<'month' | 'week'>('month');

  // Modal open states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [teachersModalOpen, setTeachersModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  
  // Selected session for editing
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Stats
  const [totalSessions, setTotalSessions] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [earnedIncome, setEarnedIncome] = useState(0);
  const [projectedIncome, setProjectedIncome] = useState(0);

  // Authenticate and fetch session on load
  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.push('/login');
        return;
      }

      // Fetch user profile role and teacher name
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, teacher_name, role')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }

      setCurrentUser({
        id: session.user.id,
        username: profile.username,
        teacherName: profile.teacher_name,
        role: profile.role,
        token: session.access_token,
      });

      setActiveTeacherName(profile.teacher_name);

      // Set default month
      const now = new Date();
      const currMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(currMonth);
    };

    fetchSession();
  }, [router]);

  // Fetch teachers list (Admins only get full list, teachers just get themselves)
  const fetchTeachers = useCallback(async () => {
    if (!currentUser) return;

    if (currentUser.role === 'teacher') {
      setTeachers([currentUser.teacherName]);
      setActiveTeacherName(currentUser.teacherName);
      return;
    }

    // Admin pulls all teachers from DB
    const { data, error } = await supabase
      .from('teachers')
      .select('name')
      .order('name', { ascending: true });

    if (!error && data) {
      const list = data.map((t) => t.name);
      setTeachers(list);
      
      // Select first teacher as active by default if none selected
      if (list.length > 0 && !activeTeacherName) {
        setActiveTeacherName(list[0]);
      }
    }
  }, [currentUser, activeTeacherName]);

  // Fetch session schedule data
  const fetchSessions = useCallback(async () => {
    if (!activeTeacherName || !selectedMonth) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('teacher_name', activeTeacherName)
      .eq('month_year', selectedMonth);

    if (!error && data) {
      setSessions(data as Session[]);
      calculateStats(data as Session[]);
    }
    setLoading(false);
  }, [activeTeacherName, selectedMonth]);

  // Sync teachers and sessions when user or parameters change
  useEffect(() => {
    if (currentUser) {
      fetchTeachers();
    }
  }, [currentUser, fetchTeachers]);

  useEffect(() => {
    if (activeTeacherName && selectedMonth) {
      fetchSessions();
    }
  }, [activeTeacherName, selectedMonth, fetchSessions]);

  const calculateStats = (items: Session[]) => {
    let total = items.length;
    let completed = 0;
    let earned = 0;
    let projected = 0;

    items.forEach((s) => {
      if (s.status === 'Đã dạy') {
        completed++;
        earned += Number(s.price) || 0;
      }
      if (s.status !== 'Hủy') {
        projected += Number(s.price) || 0;
      }
    });

    setTotalSessions(total);
    setCompletedSessions(completed);
    setEarnedIncome(earned);
    setProjectedIncome(projected);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Called when active session card is clicked
  const handleSessionClick = (id: string) => {
    const s = sessions.find((item) => item.id === id);
    if (s) {
      setSelectedSession(s);
      setEditModalOpen(true);
    }
  };

  // Called after modifying list of teachers
  const handleTeacherUpdated = (updatedActiveName?: string) => {
    fetchTeachers();
    if (updatedActiveName) {
      setActiveTeacherName(updatedActiveName);
    }
    fetchSessions();
  };

  if (!currentUser || !selectedMonth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-500 font-semibold text-sm">Đang tải cấu hình hệ thống...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 animate-fade-in pb-12">
      
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 md:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo brand */}
          <div className="flex items-center gap-2 select-none">
            <div className="h-9 w-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md">
              <School className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-lg text-indigo-900 leading-none">GiaSư Pro</span>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-3.5">
            {/* Month picker */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5">
              <label htmlFor="monthInput" className="text-[10px] font-extrabold text-slate-500 uppercase mr-2 tracking-wider">
                Tháng Dạy:
              </label>
              <input
                id="monthInput"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-bold text-xs text-slate-700 outline-none cursor-pointer"
              />
            </div>

            {/* Teacher selector */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5">
              <label htmlFor="teacherSelect" className="text-[10px] font-extrabold text-slate-500 uppercase mr-2 tracking-wider">
                Giáo Viên:
              </label>
              <select
                id="teacherSelect"
                value={activeTeacherName}
                disabled={currentUser.role === 'teacher'}
                onChange={(e) => setActiveTeacherName(e.target.value)}
                className="bg-transparent font-bold text-xs text-slate-700 outline-none cursor-pointer disabled:opacity-80 disabled:cursor-default"
              >
                {teachers.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Teacher Management (Admins only) */}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setTeachersModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 transition-all rounded-xl text-xs font-bold text-slate-600 cursor-pointer shadow-sm bg-white"
              >
                <Settings className="h-3.5 w-3.5" />
                Quản lý GV
              </button>
            )}

            {/* Profiles Block */}
            <div className="flex items-center border-l border-slate-200 pl-3.5 gap-3.5">
              <div className="flex items-center gap-2 text-left">
                <UserCircle className="h-8 w-8 text-slate-400 shrink-0" />
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    {currentUser.teacherName}
                  </span>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">
                    {currentUser.role === 'admin' ? 'Admin' : 'Giáo Viên'}
                  </span>
                </div>
              </div>

              {/* Password button */}
              <button
                onClick={() => setPasswordModalOpen(true)}
                title="Đổi mật khẩu"
                className="p-2 border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all rounded-xl text-slate-500 cursor-pointer shadow-sm bg-white"
              >
                <Key className="h-3.5 w-3.5" />
              </button>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="p-2 border border-red-100 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all rounded-xl text-red-500 cursor-pointer shadow-sm bg-red-50/30"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Main Dashboard Container */}
      <main className="max-w-7xl w-full mx-auto px-4 md:px-8 mt-6 flex-grow space-y-6">
        
        {/* Banner Header */}
        <header className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_right,_var(--tw-gradient-stops))] from-indigo-500/10 to-transparent pointer-events-none"></div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Giáo Viên: <span className="bg-gradient-to-r from-indigo-300 to-cyan-300 bg-clip-text text-transparent">{activeTeacherName}</span>
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1 font-medium">
              Hệ thống quản lý thời khóa biểu, điểm số và tự động tính toán thu nhập hàng tháng.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3.5 shrink-0 z-10 w-full md:w-auto">
            {/* View toggler */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 p-1 rounded-xl flex gap-1">
              <button
                onClick={() => setCurrentView('month')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  currentView === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                Lịch Tháng
              </button>
              <button
                onClick={() => setCurrentView('week')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  currentView === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                Lịch Tuần
              </button>
            </div>

            {/* Add schedule button */}
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 transition-all font-semibold text-xs rounded-xl shadow-md cursor-pointer hover:shadow-indigo-500/20 text-white w-full md:w-auto"
            >
              <Plus className="h-4 w-4" />
              Thêm Ca Dạy Nhanh
            </button>
          </div>
        </header>

        {/* Stats Grid Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex justify-between items-center shadow-sm">
            <div className="text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Ca Dạy Trong Tháng</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalSessions}</div>
            </div>
            <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <CalendarIcon className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex justify-between items-center shadow-sm">
            <div className="text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Ca Hoàn Thành</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{completedSessions}</div>
            </div>
            <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex justify-between items-center shadow-sm">
            <div className="text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Thu Nhập Thực Tế</span>
              <div className="text-xl font-extrabold text-slate-900 mt-1.5">{formatVND(earnedIncome)}</div>
            </div>
            <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex justify-between items-center shadow-sm">
            <div className="text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Dự Kiến Thu Nhập</span>
              <div className="text-xl font-extrabold text-slate-900 mt-1.5">{formatVND(projectedIncome)}</div>
            </div>
            <div className="h-10 w-10 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </section>

        {/* Timetable Panel Area */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto min-h-[360px] flex flex-col">
          {loading ? (
            <div className="flex-grow flex flex-col items-center justify-center p-12 text-slate-450 gap-3">
              <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
              <span className="font-semibold text-sm">Đang tải lịch học từ database...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="h-16 w-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-350 mb-4">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Chưa có ca dạy nào trong tháng này
              </h3>
              <p className="text-slate-400 text-xs mt-1 max-w-sm">
                Nhấp nút &ldquo;Thêm Ca Dạy Nhanh&rdquo; ở góc trên để cấu hình thời khóa biểu định kỳ cho giáo viên.
              </p>
            </div>
          ) : currentView === 'month' ? (
            <CalendarMonthView
              selectedMonth={selectedMonth}
              sessions={sessions}
              onSessionClick={handleSessionClick}
            />
          ) : (
            <CalendarWeekView
              sessions={sessions}
              onSessionClick={handleSessionClick}
            />
          )}
        </section>

      </main>

      {/* Modals Mounting */}
      <AddSessionModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        activeTeacherName={activeTeacherName}
        selectedMonth={selectedMonth}
        existingSessions={sessions}
        onSave={fetchSessions}
      />

      <EditSessionModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedSession(null);
        }}
        session={selectedSession}
        existingSessions={sessions}
        onSave={fetchSessions}
      />

      {currentUser.role === 'admin' && (
        <ManageTeachersModal
          isOpen={teachersModalOpen}
          onClose={() => setTeachersModalOpen(false)}
          activeTeacherName={activeTeacherName}
          teachers={teachers}
          sessionToken={currentUser.token}
          onTeacherUpdated={handleTeacherUpdated}
        />
      )}

      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />

    </div>
  );
}
