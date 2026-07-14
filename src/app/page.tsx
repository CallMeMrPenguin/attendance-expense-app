'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  ChevronLeft,
  GraduationCap,
  ChevronDown,
  Check
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

function DashboardInner() {
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

  // Custom picker open states
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [heroMonthPickerOpen, setHeroMonthPickerOpen] = useState(false);
  const [teacherDropOpen, setTeacherDropOpen] = useState(false);
  const [heroTeacherDropOpen, setHeroTeacherDropOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

  // Debug log (shown when debug is active)
  const searchParams = useSearchParams();
  const [isDebug, setIsDebug] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const addDebug = (msg: string) => setDebugLog(prev => [`${new Date().toLocaleTimeString()}: ${msg}`, ...prev.slice(0, 19)]);

  useEffect(() => {
    if (searchParams?.get('debug') === '1' || localStorage.getItem('debug') === '1') {
      setIsDebug(true);
      localStorage.setItem('debug', '1');
    }
  }, [searchParams]);



  // Always force dark mode (night mode)
  useEffect(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  }, []);

  // Close all custom dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Only close if the click target is not inside a [data-picker] element
      const target = e.target as HTMLElement;
      if (!target.closest('[data-picker]')) {
        setMonthPickerOpen(false);
        setHeroMonthPickerOpen(false);
        setTeacherDropOpen(false);
        setHeroTeacherDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Authenticate and fetch session on load
  useEffect(() => {
    const fetchSession = async () => {
      const now = new Date();
      const currMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(currMonth);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        addDebug(`✅ Supabase Auth session found. User: ${session.user.email}`);
        const { data: profile, error: profErr } = await supabase
          .from('profiles')
          .select('username, teacher_name, role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profErr) addDebug(`❌ profiles error: ${profErr.message}`);

        if (profile) {
          addDebug(`✅ Profile loaded: name="${profile.teacher_name}" role=${profile.role}`);
          setCurrentUser({
            id: session.user.id,
            username: profile.username,
            teacherName: profile.teacher_name,
            role: profile.role,
            token: session.access_token,
          });
          setActiveTeacherName(profile.teacher_name);
          return;
        } else {
          addDebug('⚠️ Auth session exists but no profile row found');
        }
      } else {
        addDebug('⚠️ No Supabase Auth session — checking localStorage fallback');
      }

      const customSessionStr = localStorage.getItem('custom_teacher_session');
      if (customSessionStr) {
        addDebug(`📦 Using custom_teacher_session from localStorage`);
        try {
          const customSession = JSON.parse(customSessionStr);
          if (customSession && customSession.username) {
            addDebug(`✅ Custom session: name="${customSession.teacherName}" role=${customSession.role}`);
            setCurrentUser({
              id: 'custom-session-id',
              username: customSession.username,
              teacherName: customSession.teacherName,
              role: customSession.role,
              token: 'custom-token',
            });
            setActiveTeacherName(customSession.teacherName);
            return;
          }
        } catch (e) {
          addDebug(`❌ Failed to parse custom session: ${e}`);
          console.warn('Failed to parse custom session:', e);
        }
      } else {
        addDebug('❌ No custom_teacher_session in localStorage either — redirecting to login');
      }

      router.push('/login');
    };

    fetchSession();
  }, [router]);

  // Fetch teachers list
  const fetchTeachers = useCallback(async () => {
    if (!currentUser) return;

    if (currentUser.role !== 'admin') {
      setTeachers([currentUser.teacherName]);
      setActiveTeacherName(currentUser.teacherName);
      return;
    }

    const { data, error } = await supabase
      .from('teachers')
      .select('name')
      .neq('name', 'Giáo Viên 1')
      .order('name', { ascending: true });

    let list: string[] = [];
    if (!error && data) {
      list = data.map((t) => t.name).filter((n) => n !== 'Giáo Viên 1');
    }

    if (list.length === 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('teacher_name')
        .order('teacher_name', { ascending: true });
      if (profileData) {
        list = [...new Set(profileData.map((p) => p.teacher_name).filter((n) => n && n !== 'Giáo Viên 1'))];
      }
    }

    if (list.length > 0) {
      setTeachers(list);
      const adminOwnName = currentUser?.teacherName;
      const needsDefault =
        !activeTeacherName ||
        activeTeacherName === 'Giáo Viên 1' ||
        !list.includes(activeTeacherName) ||
        (activeTeacherName === adminOwnName && list.length > 1 && list[0] !== adminOwnName);
      if (needsDefault) {
        setActiveTeacherName(list.find((n) => n !== adminOwnName) || list[0]);
      }
    }
  }, [currentUser, activeTeacherName]);



  // Fetch session schedule data
  const fetchSessions = useCallback(async () => {
    if (!activeTeacherName || !selectedMonth) {
      addDebug(`⛔ fetchSessions skipped: teacher="${activeTeacherName}" month="${selectedMonth}"`);
      return;
    }
    addDebug(`🔄 Querying sessions: teacher="${activeTeacherName}" month="${selectedMonth}"`);
    setLoading(true);
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('teacher_name', activeTeacherName)
      .eq('month_year', selectedMonth);
    if (!error && data) {
      addDebug(`✅ Sessions loaded: ${data.length} records`);
      setSessions(data as Session[]);
      calculateStats(data as Session[]);
    } else {
      addDebug(`❌ Sessions error: ${error?.message || 'unknown'} | code: ${error?.code} | hint: ${error?.hint}`);
      setSessions([]);
      calculateStats([]);
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
    localStorage.removeItem('custom_teacher_session');
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
      
      {/* Signature Vignette Overlay */}
      <div className="vignette-overlay" />

      {/* Main Content Container - Widened Viewport (Dominating Page) */}
      <div className="relative z-10 w-full max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 py-6 flex flex-col min-h-screen">

        {/* 🐛 Debug Panel — visible only when ?debug=1 */}
        {isDebug && (
          <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/95 border-t border-green-500/40 p-3 max-h-64 overflow-y-auto font-mono text-[10px] leading-relaxed">
            <div className="flex items-center gap-2 mb-2 text-green-400 font-bold text-xs sticky top-0 bg-black/95 pb-1 border-b border-green-500/20">
              <span>🐛 DEBUG PANEL</span>
              <span className="text-slate-500">|</span>
              <span className="text-yellow-300">teacher: <b>{activeTeacherName || '(empty)'}</b></span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-300">month: <b>{selectedMonth || '(empty)'}</b></span>
              <span className="text-slate-500">|</span>
              <span className="text-purple-300">sessions: <b>{sessions.length}</b></span>
              <span className="text-slate-500">|</span>
              <span className="text-orange-300">auth: <b>{currentUser ? (currentUser.token === 'custom-token' ? 'custom-session' : 'supabase-auth') : 'none'}</b></span>
            </div>
            {debugLog.length === 0 && <div className="text-slate-500 italic">No log entries yet...</div>}
            {debugLog.map((line, i) => (
              <div key={i} className={`py-0.5 ${line.includes('❌') ? 'text-red-400' : line.includes('⚠️') ? 'text-yellow-400' : line.includes('✅') ? 'text-green-400' : 'text-slate-300'}`}>
                {line}
              </div>
            ))}
          </div>
        )}


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

            {/* Toolbar Month Picker — fully custom dark dropdown */}
            <div className="relative" data-picker>
              <button
                onClick={() => { setMonthPickerOpen(o => !o); setPickerYear(parseInt(selectedMonth.split('-')[0])); }}
                className="flex items-center gap-2 bg-[#090b10]/80 border border-white/[0.08] hover:border-indigo-500/40 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-inner cursor-pointer"
              >
                <CalendarIcon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span className="text-slate-200 font-bold text-xs select-none whitespace-nowrap">
                  {(() => { const [y,m]=selectedMonth.split('-'); return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1]+' '+y; })()}
                </span>
                <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${monthPickerOpen ? 'rotate-180':''}`} />
              </button>
              {monthPickerOpen && (
                <div className="absolute top-full mt-2 left-0 z-[200] w-64 bg-[#0d1018] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-4 backdrop-blur-xl">
                  {/* Year nav */}
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => setPickerYear(y=>y-1)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"><ChevronLeft className="h-4 w-4"/></button>
                    <span className="text-sm font-black text-white">{pickerYear}</span>
                    <button onClick={() => setPickerYear(y=>y+1)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"><ChevronRight className="h-4 w-4"/></button>
                  </div>
                  {/* Month grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((mn,i)=>{
                      const val=`${pickerYear}-${String(i+1).padStart(2,'0')}`;
                      const isActive=val===selectedMonth;
                      return(
                        <button key={mn} onClick={()=>{setSelectedMonth(val);setMonthPickerOpen(false);}} className={`py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${isActive?'bg-[#7b61ff] text-white shadow-[0_0_12px_rgba(123,97,255,0.5)]':'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}>{mn}</button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Toolbar Teacher Dropdown — fully custom */}
            <div className="relative" data-picker>
              <button
                onClick={() => currentUser.role === 'admin' && setTeacherDropOpen(o=>!o)}
                className={`flex items-center gap-2 bg-[#090b10]/80 border border-white/[0.08] hover:border-indigo-500/40 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-inner ${currentUser.role==='admin'?'cursor-pointer':'cursor-default'}`}
              >
                <span className="text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">USER:</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
                <span className="text-slate-200 font-bold">{activeTeacherName}</span>
                {currentUser.role === 'admin' && <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${teacherDropOpen?'rotate-180':''}`}/>}
              </button>
              {teacherDropOpen && currentUser.role === 'admin' && (
                <div className="absolute top-full mt-2 left-0 z-[200] min-w-full w-max bg-[#0d1018] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-xl">
                  {teachers.map(t=>(
                    <button key={t} onClick={()=>{setActiveTeacherName(t);setTeacherDropOpen(false);}} className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-left transition-colors cursor-pointer ${t===activeTeacherName?'bg-indigo-500/20 text-indigo-300':'text-slate-300 hover:bg-white/[0.05] hover:text-white'}`}>
                      {t===activeTeacherName&&<Check className="h-3 w-3 text-indigo-400 shrink-0"/>}
                      <span className={t===activeTeacherName?'':'ml-5'}>{t}</span>
                    </button>
                  ))}
                </div>
              )}
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
                  {currentUser.role === 'admin' ? 'Admin' : 'User'}
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

          {/* Action button & Month Selector */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 z-10">
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7b61ff] hover:bg-[#8e77ff] text-white font-extrabold text-xs rounded-xl shadow-[0_8px_25px_rgba(123,97,255,0.45)] hover:shadow-[0_12px_32px_rgba(123,97,255,0.65)] hover:scale-[1.02] transition-all cursor-pointer border border-white/20 select-none"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Thêm Ca Dạy Nhanh</span>
            </button>

            {/* Hero — Teacher Dropdown (Admin only) */}
            {currentUser.role === 'admin' && teachers.length > 0 && (
              <div className="relative" data-picker>
                <button
                  onClick={() => setHeroTeacherDropOpen(o=>!o)}
                  className="flex items-center gap-2 bg-[#121624] border border-white/10 hover:border-indigo-500/40 text-white text-xs font-bold rounded-xl px-3.5 py-2.5 cursor-pointer focus:outline-none transition-all shadow-lg"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
                  <span>{activeTeacherName}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${heroTeacherDropOpen?'rotate-180':''}`}/>
                </button>
                {heroTeacherDropOpen && (
                  <div className="absolute top-full mt-2 left-0 z-[200] min-w-full w-max bg-[#0d1018] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-xl">
                    {teachers.map(t=>(
                      <button key={t} onClick={()=>{setActiveTeacherName(t);setHeroTeacherDropOpen(false);}} className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-left transition-colors cursor-pointer ${t===activeTeacherName?'bg-indigo-500/20 text-indigo-300':'text-slate-300 hover:bg-white/[0.05] hover:text-white'}`}>
                        {t===activeTeacherName&&<Check className="h-3 w-3 text-indigo-400 shrink-0"/>}
                        <span className={t===activeTeacherName?'':'ml-5'}>{t}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Hero — Month Picker (fully custom dark dropdown) */}
            <div className="relative" data-picker>
              <button
                onClick={() => { setHeroMonthPickerOpen(o=>!o); setPickerYear(parseInt(selectedMonth.split('-')[0])); }}
                className="flex items-center gap-2 bg-[#121624] border border-white/10 hover:border-indigo-500/40 text-white text-xs font-bold rounded-xl px-3.5 py-2.5 cursor-pointer transition-all shadow-lg"
              >
                <CalendarIcon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span className="font-black">
                  {(() => { const [y,m]=selectedMonth.split('-'); return ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'][parseInt(m)-1]+' '+y; })()}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${heroMonthPickerOpen?'rotate-180':''}`}/>
              </button>
              {heroMonthPickerOpen && (
                <div className="absolute top-full mt-2 right-0 z-[200] w-64 bg-[#0d1018] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-4 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={()=>setPickerYear(y=>y-1)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"><ChevronLeft className="h-4 w-4"/></button>
                    <span className="text-sm font-black text-white">{pickerYear}</span>
                    <button onClick={()=>setPickerYear(y=>y+1)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"><ChevronRight className="h-4 w-4"/></button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Th.1','Th.2','Th.3','Th.4','Th.5','Th.6','Th.7','Th.8','Th.9','Th.10','Th.11','Th.12'].map((mn,i)=>{
                      const val=`${pickerYear}-${String(i+1).padStart(2,'0')}`;
                      const isActive=val===selectedMonth;
                      return(
                        <button key={mn} onClick={()=>{setSelectedMonth(val);setHeroMonthPickerOpen(false);}} className={`py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${isActive?'bg-[#7b61ff] text-white shadow-[0_0_12px_rgba(123,97,255,0.5)]':'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}>{mn}</button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 4. Editorial Dominating KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14 text-left">
          
          {/* KPI 1 */}
          <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
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

          {/* KPI 2 */}
          <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
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

          {/* KPI 3 */}
          <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
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

          {/* KPI 4 */}
          <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
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

        </section>

        {/* 1. Timetable Area */}
        <section className="flex-grow flex flex-col min-h-[480px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5 select-none shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-[#7b61ff] shadow-[0_0_10px_rgba(123,97,255,1)]"></div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Lịch Giảng Dạy & Doanh Thu
              </h3>
            </div>
            
            {/* View Switcher — smooth sliding pill */}
            <div className="relative flex bg-[#0d1018] border border-white/10 p-1 rounded-xl">
              {/* Sliding pill background */}
              <div
                className="absolute top-1 bottom-1 rounded-[10px] bg-[#7b61ff] shadow-[0_0_16px_rgba(123,97,255,0.55)] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none"
                style={{
                  left: '4px',
                  width: 'calc(50% - 4px)',
                  transform: currentView === 'month' ? 'translateX(0)' : 'translateX(100%)',
                }}
              />
              <button
                onClick={() => setCurrentView('month')}
                className={`relative z-10 px-4 py-1.5 text-[10px] font-black rounded-[10px] transition-colors duration-300 ${
                  currentView === 'month' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                LỊCH THÁNG
              </button>
              <button
                onClick={() => setCurrentView('week')}
                className={`relative z-10 px-4 py-1.5 text-[10px] font-black rounded-[10px] transition-colors duration-300 ${
                  currentView === 'week' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                LỊCH TUẦN
              </button>
            </div>
          </div>

          {loading ? (
            <div className="calendar-container-depth flex flex-col items-center justify-center p-16 text-slate-400 gap-3 min-h-[380px] h-full">
              <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
              <span className="font-extrabold text-sm text-slate-300">Đang tải lịch học từ hệ thống database...</span>
            </div>
          ) : sessions.length === 0 ? (
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
          ) : (
            <div className="grid grid-cols-1 grid-rows-1 w-full flex-grow overflow-hidden">
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

// Suspense wrapper required by Next.js for useSearchParams
export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#090b10]">
        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardInner />
    </Suspense>
  );
}
