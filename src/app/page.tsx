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
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

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

  // Always force dark mode (night mode)
  useEffect(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  }, []);

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
  const efficiencyRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;  return (
    <div className="min-h-screen transition-colors duration-300 ambient-bg-dark text-slate-100 relative overflow-hidden select-none">
      
      {/* Signature Vignette Overlay & Ambient Aurora Glow */}
      <div className="vignette-overlay" />
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none animate-aurora z-0" />
      <div className="absolute top-1/3 -right-40 w-[550px] h-[550px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none animate-aurora z-0" style={{ animationDelay: '-6s' }} />

      {/* Main Content Container - Widened Viewport (Dominating Page) */}
      <div className="relative z-10 w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 py-6 flex flex-col min-h-screen">
        
        {/* 11. Floating macOS Style Top Toolbar */}
        <header className="macos-toolbar rounded-2xl px-6 py-3.5 mb-10 w-full flex flex-wrap items-center justify-between gap-4 sticky top-4 z-50">
          
          {/* Left toolbar filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Logo brand badge */}
            <div className="flex items-center gap-2.5 pr-4 border-r border-white/10 mr-1">
              <div className="h-8 w-8 bg-indigo-500/15 border border-indigo-500/30 rounded-lg flex items-center justify-center text-indigo-400 shadow-[0_0_12px_rgba(123,97,255,0.3)]">
                <GraduationCap className="h-4.5 w-4.5" />
              </div>
              <span className="font-black text-base bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent tracking-tight">GiaSu Pro</span>
            </div>

            {/* Month Selector dropdown */}
            <div className="flex items-center bg-[#090b10]/80 border border-white/[0.08] hover:border-indigo-500/40 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-inner">
              <CalendarIcon className="h-3.5 w-3.5 text-indigo-400 mr-2" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-slate-200 border-none outline-none font-bold text-xs p-0 cursor-pointer"
              />
            </div>

            {/* Teacher select dropdown */}
            <div className="flex items-center bg-[#090b10]/80 border border-white/[0.08] hover:border-indigo-500/40 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-inner">
              <label htmlFor="teacherSelect" className="text-slate-400 font-extrabold uppercase mr-1.5 text-[10px] tracking-wider">Giáo viên:</label>
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block mr-2 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
              <select
                id="teacherSelect"
                value={activeTeacherName}
                disabled={currentUser.role === 'teacher'}
                onChange={(e) => setActiveTeacherName(e.target.value)}
                className="bg-transparent border-none outline-none font-bold text-slate-200 focus:ring-0 p-0 text-xs cursor-pointer"
              >
                {teachers.map((t) => (
                  <option key={t} value={t} className="bg-[#090b10] text-slate-200">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Admin Manage Teachers Modal Trigger */}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setTeachersModalOpen(true)}
                title="Quản lý danh sách giáo viên"
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#7b61ff]/12 hover:bg-[#7b61ff]/25 border border-[#7b61ff]/30 rounded-xl text-xs font-extrabold text-indigo-300 transition-all shadow-sm cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Quản lý</span>
              </button>
            )}
          </div>

          {/* Right toolbar profile & actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPasswordModalOpen(true)}
              title="Đổi mật khẩu"
              className="p-2 border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.06] text-slate-300 transition-all rounded-xl cursor-pointer bg-[#090b10]/60"
            >
              <Key className="h-4 w-4" />
            </button>

            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-2 border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 text-rose-400 transition-all rounded-xl cursor-pointer bg-rose-950/10"
            >
              <LogOut className="h-4 w-4" />
            </button>

            <div className="flex items-center border-l border-white/10 pl-3.5 gap-2.5">
              <div className="h-8.5 w-8.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl flex items-center justify-center text-indigo-300 font-black text-xs shadow-[0_0_12px_rgba(123,97,255,0.2)]">
                {currentUser.teacherName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-extrabold text-white leading-tight">
                  {currentUser.teacherName}
                </span>
                <span className="text-[9px] font-black text-indigo-400/80 uppercase tracking-widest leading-none">
                  {currentUser.role === 'admin' ? 'Quản trị viên' : 'Giáo viên'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* 2. & 12. Hero Area with Identity & Editorial Typography */}
        <section className="relative mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-left">
          
          <div className="space-y-2 max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-extrabold tracking-wider uppercase mb-1 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(123,97,255,1)]"></span>
              <span>Tổng quan giảng dạy</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.05]">
              Xin chào, <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-400 bg-clip-text text-transparent">
                {currentUser.teacherName}
              </span>
            </h1>

            <p className="text-slate-400 text-xs sm:text-sm font-semibold tracking-wide pt-1">
              {totalSessions > 0 
                ? `Tháng này bạn có ${totalSessions} ca dạy với tổng doanh thu dự kiến ${formatVND(projectedIncome)}.`
                : 'Hiện tại chưa có lịch ca dạy nào được tạo cho tháng này.'
              }
            </p>
          </div>

          {/* Action button shifted right to break rigid symmetry */}
          <div className="flex items-center gap-4 shrink-0 z-10 w-full md:w-auto">
            <button
              onClick={() => setAddModalOpen(true)}
              className="w-full md:w-auto flex items-center justify-center gap-2.5 px-6 py-3 bg-[#7b61ff] hover:bg-[#8e77ff] text-white font-extrabold text-xs rounded-xl shadow-[0_8px_25px_rgba(123,97,255,0.4)] hover:shadow-[0_12px_32px_rgba(123,97,255,0.6)] hover:scale-[1.02] transition-all cursor-pointer border border-white/20 select-none"
            >
              <Plus className="h-4.5 w-4.5" />
              Thêm Ca Dạy Nhanh
            </button>
          </div>
        </section>

        {/* 4. Editorial Dominating KPI Cards with Glowing Outer Gradient Borders */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14 text-left">
          
          {/* KPI 1 */}
          <div className="gradient-border-wrapper">
            <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px] h-full">
              <div className="flex justify-between items-start">
                <span className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-none">
                  {totalSessions}
                </span>
                <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-[0_0_16px_rgba(123,97,255,0.45)] shrink-0">
                  <CalendarIcon className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ca dạy trong tháng</span>
                <span className="text-[10px] font-extrabold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-md">
                  Tổng ca
                </span>
              </div>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="gradient-border-wrapper">
            <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px] h-full">
              <div className="flex justify-between items-start">
                <span className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-none">
                  {completedSessions}
                </span>
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_16px_rgba(16,185,129,0.45)] shrink-0">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ca hoàn thành</span>
                {totalSessions > 0 && (
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md">
                    ↑ {Math.round((completedSessions / totalSessions) * 100)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* KPI 3 */}
          <div className="gradient-border-wrapper">
            <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px] h-full">
              <div className="flex justify-between items-start gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                  {formatVND(earnedIncome)}
                </span>
                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_16px_rgba(245,158,11,0.45)] shrink-0">
                  <Coins className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Thu nhập thực tế</span>
                <span className="text-[10px] font-extrabold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md">
                  Đã dạy
                </span>
              </div>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="gradient-border-wrapper">
            <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px] h-full">
              <div className="flex justify-between items-start gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                  {formatVND(projectedIncome)}
                </span>
                <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_16px_rgba(6,182,212,0.45)] shrink-0">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dự kiến thu nhập</span>
                <span className="text-[10px] font-extrabold text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-md">
                  Tối đa
                </span>
              </div>
            </div>
          </div>

        </section>

        {/* 1. Timetable Area - Wrapped in Outer Gradient Border */}
        <section className="flex-grow flex flex-col min-h-[480px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5 select-none shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-[#7b61ff] shadow-[0_0_10px_rgba(123,97,255,1)]"></div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Lịch Giảng Dạy & Doanh Thu
              </h3>
            </div>
            
            {/* Smooth Sliding Pill View Switcher Buttons */}
            <div className="relative bg-[#0d1018] border border-white/10 p-1 rounded-xl flex items-center shadow-inner overflow-hidden select-none">
              {/* Smooth Animated Sliding Violet Pill Indicator */}
              <div 
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#7b61ff] rounded-lg shadow-[0_2px_14px_rgba(123,97,255,0.6)] transition-transform duration-300 ease-out"
                style={{
                  transform: currentView === 'month' ? 'translateX(0)' : 'translateX(calc(100% + 4px))'
                }}
              />

              <button
                onClick={() => setCurrentView('month')}
                className={`relative z-10 px-4 py-1.5 text-xs font-black rounded-lg transition-colors duration-200 cursor-pointer text-center ${
                  currentView === 'month' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Lịch Tháng
              </button>
              <button
                onClick={() => setCurrentView('week')}
                className={`relative z-10 px-4 py-1.5 text-xs font-black rounded-lg transition-colors duration-200 cursor-pointer text-center ${
                  currentView === 'week' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Lịch Tuần
              </button>
            </div>
          </div>

          {loading ? (
            <div className="gradient-border-wrapper flex-grow">
              <div className="calendar-container-depth flex flex-col items-center justify-center p-16 text-slate-400 gap-3 min-h-[380px] h-full">
                <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
                <span className="font-extrabold text-sm text-slate-300">Đang tải lịch học từ hệ thống database...</span>
              </div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="gradient-border-wrapper flex-grow">
              <div className="calendar-container-depth flex flex-col items-center justify-center py-20 px-6 text-center min-h-[380px] h-full">
                <div className="h-16 w-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-4 shadow-[0_0_20px_rgba(123,97,255,0.15)]">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-black text-white">
                  Chưa có ca dạy nào trong tháng {selectedMonth}
                </h3>
                <p className="text-xs text-slate-400 mt-2 max-w-md font-medium">
                  Sử dụng nút "Thêm Ca Dạy Nhanh" ở trên để tạo ca dạy mới cho học sinh.
                </p>
              </div>
            </div>
          ) : (
            /* Wrapped in Signature Gradient Outer Border */
            <div className="gradient-border-wrapper flex-grow">
              <div className="grid grid-cols-1 grid-rows-1 w-full flex-grow overflow-hidden rounded-[22px]">
                {/* Month View */}
                <div 
                  className={`col-start-1 row-start-1 transition-all duration-300 ease-out ${
                    currentView === 'month' 
                      ? 'opacity-100 scale-100 z-10 pointer-events-auto' 
                      : 'opacity-0 scale-[0.98] z-0 pointer-events-none'
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
                  className={`col-start-1 row-start-1 transition-all duration-300 ease-out ${
                    currentView === 'week' 
                      ? 'opacity-100 scale-100 z-10 pointer-events-auto' 
                      : 'opacity-0 scale-[0.98] z-0 pointer-events-none'
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
            </div>
          )}
        </section>

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
