'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  School, 
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
  RefreshCw,
  Sun,
  Moon
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
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

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

  // Sync theme selection with localStorage and HTML class list
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (storedTheme) {
      setTheme(storedTheme);
      if (storedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const shutter = document.getElementById('theme-shutter');
    if (shutter) {
      shutter.classList.add('animate');
      
      // Toggle theme state halfway through the shutter animation (250ms)
      setTimeout(() => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(nextTheme);
        localStorage.setItem('theme', nextTheme);
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }, 250);

      // Remove the class after the transition ends (500ms)
      setTimeout(() => {
        shutter.classList.remove('animate');
      }, 500);
    } else {
      const nextTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(nextTheme);
      localStorage.setItem('theme', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

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

    const { data, error } = await supabase
      .from('teachers')
      .select('name')
      .order('name', { ascending: true });

    if (!error && data) {
      const list = data.map((t) => t.name);
      setTeachers(list);
      
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

  const handleSessionClick = (id: string) => {
    const s = sessions.find((item) => item.id === id);
    if (s) {
      setSelectedSession(s);
      setEditModalOpen(true);
    }
  };

  const handleTeacherUpdated = (updatedActiveName?: string) => {
    fetchTeachers();
    if (updatedActiveName) {
      setActiveTeacherName(updatedActiveName);
    }
    fetchSessions();
  };

  if (!currentUser || !selectedMonth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 gap-4">
        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-400 font-semibold text-sm">Đang tải cấu hình hệ thống...</span>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 pb-12 ${
      theme === 'dark' ? 'grid-bg-dark text-slate-100' : 'grid-bg-light text-slate-800'
    }`}>
      
      {/* Top Navbar */}
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 px-4 md:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo brand */}
          <div className="flex items-center gap-2 select-none">
            <div className="h-9 w-9 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-md">
              <School className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-lg text-indigo-900 dark:text-white leading-none">GiaSư Pro</span>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Month picker */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-1.5">
              <label htmlFor="monthInput" className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase mr-2 tracking-wider">
                Tháng Dạy:
              </label>
              <input
                id="monthInput"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-bold text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              />
            </div>

            {/* Teacher selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-1.5">
              <label htmlFor="teacherSelect" className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase mr-2 tracking-wider">
                Giáo Viên:
              </label>
              <select
                id="teacherSelect"
                value={activeTeacherName}
                disabled={currentUser.role === 'teacher'}
                onChange={(e) => setActiveTeacherName(e.target.value)}
                className="bg-transparent font-bold text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer disabled:opacity-80 disabled:cursor-default"
              >
                {teachers.map((t) => (
                  <option key={t} value={t} className="dark:bg-slate-950 dark:text-slate-300">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Teacher Management (Admins only) */}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setTeachersModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200/50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-white transition-all rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer shadow-sm bg-white dark:bg-[#1a1e28]"
              >
                <Settings className="h-3.5 w-3.5" />
                Quản lý GV
              </button>
            )}

            {/* Profiles Block */}
            <div className="flex items-center border-l border-slate-200 dark:border-white/5 pl-3 gap-3">
              <div className="flex items-center gap-2 text-left">
                <UserCircle className="h-8 w-8 text-slate-400 dark:text-slate-500 shrink-0" />
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {currentUser.teacherName}
                  </span>
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                    {currentUser.role === 'admin' ? 'Admin' : 'Giáo Viên'}
                  </span>
                </div>
              </div>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
                className="p-2 border border-slate-200/50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 transition-all rounded-lg cursor-pointer shadow-sm bg-white dark:bg-[#1a1e28]"
              >
                {theme === 'dark' ? (
                  <Sun className="h-3.5 w-3.5 text-yellow-500" />
                ) : (
                  <Moon className="h-3.5 w-3.5 text-indigo-650" />
                )}
              </button>

              {/* Password button */}
              <button
                onClick={() => setPasswordModalOpen(true)}
                title="Đổi mật khẩu"
                className="p-2 border border-slate-200/50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 transition-all rounded-lg cursor-pointer shadow-sm bg-white dark:bg-[#1a1e28]"
              >
                <Key className="h-3.5 w-3.5" />
              </button>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="p-2 border border-red-200/30 dark:border-red-950/40 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 hover:text-red-650 transition-all rounded-lg text-red-500 cursor-pointer shadow-sm bg-red-50/20 dark:bg-red-950/10"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Main Dashboard Container */}
      <main className="max-w-7xl w-full mx-auto px-6 md:px-12 py-12 flex-grow space-y-16">
        
        {/* Banner Header */}
        <header className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {/* Ambient header glow backdrop */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[350px] h-[200px] bg-purple-500/5 dark:bg-purple-500/10 blur-[90px] rounded-full pointer-events-none"></div>
          
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
              Giáo Viên: <span className="text-[#7b61ff] font-extrabold">{activeTeacherName}</span>
            </h1>
            <p className="text-slate-550 dark:text-slate-450 text-xs md:text-sm mt-3.5 font-medium tracking-wide">
              Hệ thống quản lý thời khóa biểu, điểm số và tự động tính toán thu nhập hàng tháng.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0 z-10 w-full md:w-auto">
            {/* View toggler */}
            <div className="bg-slate-100 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 p-1 rounded-xl flex gap-1 shadow-sm">
              <button
                onClick={() => setCurrentView('month')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  currentView === 'month' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-850 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Lịch Tháng
              </button>
              <button
                onClick={() => setCurrentView('week')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  currentView === 'week' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-850 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Lịch Tuần
              </button>
            </div>

            {/* Add schedule button */}
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-650 hover:from-indigo-650 hover:to-purple-750 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-indigo-500/10 hover:scale-[1.01] transition-all cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" />
              Thêm Ca Dạy Nhanh
            </button>
          </div>
        </header>

        {/* Stats Grid Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 select-none">
          <div className="bg-white dark:bg-[#1a1e28] border border-slate-200/60 dark:border-white/5 rounded-2xl p-8 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Ca Dạy Trong Tháng</span>
            <div className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mt-3 leading-none">{totalSessions}</div>
          </div>

          <div className="bg-white dark:bg-[#1a1e28] border border-slate-200/60 dark:border-white/5 rounded-2xl p-8 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Ca Hoàn Thành</span>
            <div className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mt-3 leading-none">{completedSessions}</div>
          </div>

          <div className="bg-white dark:bg-[#1a1e28] border border-slate-200/60 dark:border-white/5 rounded-2xl p-8 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Thu Nhập Thực Tế</span>
            <div className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mt-3 leading-none truncate">{formatVND(earnedIncome)}</div>
          </div>

          <div className="bg-white dark:bg-[#1a1e28] border border-slate-200/60 dark:border-white/5 rounded-2xl p-8 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Dự Kiến Thu Nhập</span>
            <div className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mt-3 leading-none truncate">{formatVND(projectedIncome)}</div>
          </div>
        </section>

        {/* Timetable Panel Area */}
        <section className="overflow-x-auto min-h-[360px] flex flex-col">
          {loading ? (
            <div className="flex-grow flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
              <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
              <span className="font-semibold text-sm">Đang tải lịch học từ database...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="h-16 w-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-slate-455 mb-4">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Chưa có ca dạy nào trong tháng này
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Sử dụng nút "Thêm Ca Dạy Nhanh" hoặc click chọn ngày trên lịch để tạo ca mới.
              </p>
            </div>
          ) : currentView === 'month' ? (
            <CalendarMonthView
              selectedMonth={selectedMonth}
              sessions={sessions}
              onSessionClick={(id) => {
                const sess = sessions.find((s) => s.id === id);
                if (sess) {
                  setSelectedSession(sess);
                  setEditModalOpen(true);
                }
              }}
            />
          ) : (
            <CalendarWeekView
              sessions={sessions}
              onSessionClick={(id) => {
                const sess = sessions.find((s) => s.id === id);
                if (sess) {
                  setSelectedSession(sess);
                  setEditModalOpen(true);
                }
              }}
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

      {/* Theme Transition sweeping Shutter overlay */}
      <div id="theme-shutter" className="theme-shutter" />

    </div>
  );
}
