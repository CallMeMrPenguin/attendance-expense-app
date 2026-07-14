'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserCircle, 
  Settings, 
  LogOut, 
  Key, 
  Plus, 
  TrendingUp, 
  CheckCircle2, 
  DollarSign, 
  Coins,
  AlertCircle,
  Calendar as CalendarIcon,
  RefreshCw,
  Sun,
  Moon,
  LayoutDashboard,
  Users,
  CalendarRange,
  BookOpen,
  FileText,
  BarChart3,
  MessageSquare,
  Search,
  Bell,
  ChevronRight,
  GraduationCap
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
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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

  const handleTeacherUpdated = (updatedActiveName?: string) => {
    fetchTeachers();
    if (updatedActiveName) {
      setActiveTeacherName(updatedActiveName);
    }
    fetchSessions();
  };

  if (!currentUser || !selectedMonth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#090b10] gap-4">
        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-400 font-semibold text-sm">Đang tải cấu hình hệ thống...</span>
      </div>
    );
  }

  // Efficiency calculation
  const efficiencyRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${
      theme === 'dark' ? 'grid-bg-dark text-slate-100' : 'grid-bg-light text-slate-800'
    }`}>
      
      {/* 1. Left Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-[#090b10]/40 backdrop-blur-md h-screen sticky top-0 hidden lg:flex flex-col justify-between p-6 shrink-0 select-none">
        
        <div>
          {/* Logo brand wrapper */}
          <div className="flex items-center gap-3 px-2 py-3 select-none">
            <div className="h-10 w-10 bg-indigo-500/10 border border-indigo-500/30 rounded-lg flex items-center justify-center text-indigo-500 shadow-inner">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="font-extrabold text-lg bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">GiaSu Pro</span>
          </div>

          {/* Menu items */}
          <nav className="mt-8 space-y-1.5 text-left">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold bg-[#7b61ff]/10 text-[#7b61ff] border border-[#7b61ff]/15 select-none transition-all cursor-pointer">
              <LayoutDashboard className="h-4.5 w-4.5" />
              <span>Tổng quan</span>
            </button>
          </nav>
        </div>
      </aside>
      {/* 2. Main Content Page Wrapper */}
      <div className="flex-grow flex flex-col min-h-screen">
        
        {/* Top Navbar */}
        <nav className="border-b border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-[#090b10]/40 backdrop-blur-md sticky top-0 z-50 px-6 py-4 shadow-sm select-none">
          <div className="w-full flex items-center justify-between gap-4">
            
            {/* Left toolbar dropdown filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Month Selector dropdown */}
              <div className="flex items-center bg-slate-100 dark:bg-[#11131a]/60 border border-slate-200/50 dark:border-white/5 rounded-lg px-4 py-2 text-xs font-bold shadow-sm">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-200 border-none outline-none font-bold text-xs p-0 cursor-pointer"
                />
              </div>

              {/* Teacher select dropdown */}
              <div className="flex items-center bg-slate-100 dark:bg-[#11131a]/60 border border-slate-200/50 dark:border-white/5 rounded-lg px-4 py-2 text-xs font-bold shadow-sm">
                <label htmlFor="teacherSelect" className="text-slate-400 dark:text-slate-500 font-extrabold uppercase mr-1">Giáo viên:</label>
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block mr-1.5 animate-pulse"></span>
                <select
                  id="teacherSelect"
                  value={activeTeacherName}
                  disabled={currentUser.role === 'teacher'}
                  onChange={(e) => setActiveTeacherName(e.target.value)}
                  className="bg-transparent border-none outline-none font-bold text-slate-800 dark:text-slate-200 focus:ring-0 p-0 text-xs cursor-pointer"
                >
                  {teachers.map((t) => (
                    <option key={t} value={t} className="dark:bg-[#090b10]">
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quản lý button next to Teacher selector (only for Admin) */}
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setTeachersModalOpen(true)}
                  title="Quản lý giáo viên"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#7b61ff]/10 hover:bg-[#7b61ff]/18 border border-[#7b61ff]/20 rounded-lg text-xs font-bold text-[#7b61ff] transition-all shadow-sm cursor-pointer select-none"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Quản lý</span>
                </button>
              )}
            </div>

            {/* Right toolbar controls */}
            <div className="flex items-center gap-3">

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
                className="p-2 border border-slate-200/50 dark:border-white/5 hover:bg-slate-55 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 transition-all rounded-lg cursor-pointer shadow-sm bg-white dark:bg-[#1a1e28]"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-yellow-500" />
                ) : (
                  <Moon className="h-4 w-4 text-indigo-650" />
                )}
              </button>

              {/* Password change security key button */}
              <button
                onClick={() => setPasswordModalOpen(true)}
                title="Đổi mật khẩu"
                className="p-2 border border-slate-200/50 dark:border-white/5 hover:bg-slate-55 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 transition-all rounded-lg cursor-pointer shadow-sm bg-white dark:bg-[#1a1e28]"
              >
                <Key className="h-4 w-4" />
              </button>

              {/* Log out exit button */}
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="p-2 border border-red-200/30 dark:border-red-950/40 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 hover:text-red-650 transition-all rounded-lg text-red-550 cursor-pointer shadow-sm bg-red-50/20 dark:bg-red-950/10"
              >
                <LogOut className="h-4 w-4" />
              </button>

              {/* Profile Block (Initials / Display Names / Subtitles) */}
              <div className="flex items-center border-l border-slate-200 dark:border-white/5 pl-3 gap-3">
                <div className="h-8.5 w-8.5 bg-indigo-500/10 border border-indigo-500/25 rounded-xl flex items-center justify-center text-indigo-500 font-extrabold text-xs shadow-inner">
                  {currentUser.teacherName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {currentUser.teacherName}
                  </span>
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                    {currentUser.role === 'admin' ? 'Quản trị viên' : 'Giáo Viên'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </nav>

        {/* Dashboard Main Content Canvas */}
        <main className="max-w-7xl w-full mx-auto px-6 md:px-12 py-12 flex-grow space-y-16">
          
          {/* Header section with wave aura gradients */}
          <header className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[350px] h-[200px] bg-purple-500/5 dark:bg-purple-500/10 blur-[90px] rounded-full pointer-events-none"></div>
            
            <div className="text-left select-none">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
                Xin chào, <span className="bg-gradient-to-r from-indigo-500 to-purple-650 dark:from-indigo-400 dark:to-purple-500 bg-clip-text text-transparent">{currentUser.teacherName}</span>
              </h1>
              <p className="text-slate-450 dark:text-slate-500 text-xs md:text-sm mt-3 font-semibold tracking-wide">
                Tổng quan lịch dạy và doanh thu trong tuần.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 shrink-0 z-10 w-full md:w-auto">
              {/* Add schedule button */}
              <button
                onClick={() => setAddModalOpen(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7b61ff] hover:bg-[#6c52ee] text-white font-bold text-xs rounded-lg shadow-md hover:scale-[1.01] transition-all cursor-pointer border border-[#7b61ff]/10 border-solid select-none"
              >
                <Plus className="h-4.5 w-4.5" />
                Thêm Ca Dạy Nhanh
              </button>
            </div>
          </header>

          {/* Stats Information Blocks Row (4 KPI columns, no hieu suat, with Lucide icons) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 select-none text-left">
            {/* KPI 1 */}
            <div className="bg-white dark:bg-[#1a1e28] border border-slate-200 dark:border-white/5 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:-translate-y-0.5 transition-all duration-200 border-solid">
              <div className="h-11 w-11 rounded-lg flex items-center justify-center shrink-0 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-solid border-indigo-100/30 dark:border-indigo-900/10">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left overflow-hidden">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Ca dạy trong tháng</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 leading-none">{totalSessions}</span>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white dark:bg-[#1a1e28] border border-slate-200 dark:border-white/5 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:-translate-y-0.5 transition-all duration-200 border-solid">
              <div className="h-11 w-11 rounded-lg flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-650 dark:text-emerald-400 border border-solid border-emerald-100/30 dark:border-emerald-900/10">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Ca hoàn thành</span>
                  {totalSessions > 0 && (
                    <span className="text-[9px] font-extrabold text-emerald-650 bg-emerald-500/10 dark:bg-emerald-500/12 px-1 py-0.5 rounded">
                      +{Math.round((completedSessions / totalSessions) * 100)}%
                    </span>
                  )}
                </div>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 leading-none">{completedSessions}</span>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white dark:bg-[#1a1e28] border border-slate-200 dark:border-white/5 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:-translate-y-0.5 transition-all duration-200 border-solid">
              <div className="h-11 w-11 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-950/40 text-amber-650 dark:text-amber-400 border border-solid border-amber-100/30 dark:border-amber-900/10">
                <Coins className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left overflow-hidden">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Thu nhập thực tế</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 leading-none truncate">{formatVND(earnedIncome)}</span>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white dark:bg-[#1a1e28] border border-slate-200 dark:border-white/5 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:-translate-y-0.5 transition-all duration-200 border-solid">
              <div className="h-11 w-11 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-950/40 text-blue-650 dark:text-blue-400 border border-solid border-blue-100/30 dark:border-blue-900/10">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left overflow-hidden">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Dự kiến thu nhập</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 leading-none truncate">{formatVND(projectedIncome)}</span>
              </div>
            </div>
          </section>

          {/* Timetable Panel Area */}
          <section className="min-h-[360px] flex flex-col">
            {!loading && sessions.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 select-none shrink-0">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <CalendarRange className="h-4.5 w-4.5 text-indigo-500" />
                  Lịch giảng dạy & Doanh thu
                </h3>
                
                {/* Segment views toggler switches */}
                <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 p-1 rounded-lg flex gap-1 shadow-sm border-solid">
                  <button
                    onClick={() => setCurrentView('month')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      currentView === 'month' 
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-[#1a1e28] dark:text-white' 
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Lịch Tháng
                  </button>
                  <button
                    onClick={() => setCurrentView('week')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      currentView === 'week' 
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-[#1a1e28] dark:text-white' 
                        : 'text-slate-555 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    Lịch Tuần
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex-grow flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
                <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
                <span className="font-semibold text-sm">Đang tải lịch học từ database...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="h-16 w-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mb-4 border-solid">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Chưa có ca dạy nào trong tháng này
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Sử dụng nút "Thêm Ca Dạy Nhanh" hoặc click chọn ngày trên lịch để tạo ca mới.
                </p>
              </div>
            ) : (
              <div className="relative w-full">
                {/* Month View */}
                <div 
                  className={`transition-all duration-300 ease-in-out ${
                    currentView === 'month' 
                      ? 'opacity-100 scale-100 pointer-events-auto relative' 
                      : 'opacity-0 scale-[0.99] pointer-events-none absolute inset-x-0 top-0'
                  }`}
                >
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
                </div>

                {/* Week View */}
                <div 
                  className={`transition-all duration-300 ease-in-out ${
                    currentView === 'week' 
                      ? 'opacity-100 scale-100 pointer-events-auto relative' 
                      : 'opacity-0 scale-[0.99] pointer-events-none absolute inset-x-0 top-0'
                  }`}
                >
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
                </div>
              </div>
            )}
          </section>

        </main>

      </div>

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
          currentAdminTeacherName={currentUser.teacherName}
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
