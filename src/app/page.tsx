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
  ChevronLeft,
  GraduationCap,
  ChevronDown,
  Check,
  Wallet,
  PiggyBank,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Menu,
  X,
  Activity,
  Sparkles
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
  role: 'admin' | 'teacher' | 'user';
  token: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Navigation states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'flow' | 'saving' | 'schedule' | 'settings'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Financial data states
  const [manualTransactions, setManualTransactions] = useState<any[]>([]);
  const [emergencyCurrent, setEmergencyCurrent] = useState<number>(12000000);
  const [emergencyTarget, setEmergencyTarget] = useState<number>(30000000);
  const [accumulationCurrent, setAccumulationCurrent] = useState<number>(45000000);
  const [accumulationTarget, setAccumulationTarget] = useState<number>(150000000);
  const [savingsHistory, setSavingsHistory] = useState<any[]>([]);

  // Form states for Transactions
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txCategory, setTxCategory] = useState('Ăn uống');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Form states for Savings
  const [emActionAmount, setEmActionAmount] = useState('');
  const [acActionAmount, setAcActionAmount] = useState('');

  // Search & Filter state for Transactions
  const [txFilter, setTxFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [txSearch, setTxSearch] = useState('');

  // Scheduler data states
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
  const [heroTeacherDropOpen, setHeroTeacherDropOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

  // Always force dark mode (night mode)
  useEffect(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  }, []);

  // Close all custom dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-picker]')) {
        setMonthPickerOpen(false);
        setHeroTeacherDropOpen(false);
        setProfileMenuOpen(false);
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
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, teacher_name, role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile) {
          setCurrentUser({
            id: session.user.id,
            username: profile.username,
            teacherName: profile.teacher_name,
            role: profile.role as any,
            token: session.access_token,
          });
          setActiveTeacherName(profile.teacher_name);
          return;
        }
      }

      router.push('/login');
    };

    fetchSession();
  }, [router]);

  // Load finance data from LocalStorage
  useEffect(() => {
    if (!currentUser) return;
    const userId = currentUser.id;
    
    // Load transactions
    const storedTrans = localStorage.getItem(`finance_trans_${userId}`);
    if (storedTrans) {
      try {
        setManualTransactions(JSON.parse(storedTrans));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Seed initial transactions for demonstrative purposes
      const seedData = [
        { id: 't1', desc: 'Thưởng KPI tháng trước', amount: 5000000, type: 'income', category: 'Lương', date: '2026-07-02' },
        { id: 't2', desc: 'Mua sắm iPad Pro mới', amount: 18500000, type: 'expense', category: 'Shopping', date: '2026-07-04' },
        { id: 't3', desc: 'Thuê nhà tháng 7', amount: 4500000, type: 'expense', category: 'Hóa đơn', date: '2026-07-05' },
        { id: 't4', desc: 'Đi ăn tối cùng gia đình', amount: 1200000, type: 'expense', category: 'Ăn uống', date: '2026-07-08' }
      ];
      setManualTransactions(seedData);
      localStorage.setItem(`finance_trans_${userId}`, JSON.stringify(seedData));
    }

    // Load savings
    const storedEmCurr = localStorage.getItem(`finance_em_curr_${userId}`);
    const storedEmTar = localStorage.getItem(`finance_em_tar_${userId}`);
    const storedAcCurr = localStorage.getItem(`finance_ac_curr_${userId}`);
    const storedAcTar = localStorage.getItem(`finance_ac_tar_${userId}`);
    const storedSavHist = localStorage.getItem(`finance_sav_hist_${userId}`);

    if (storedEmCurr) setEmergencyCurrent(Number(storedEmCurr));
    else setEmergencyCurrent(12000000);

    if (storedEmTar) setEmergencyTarget(Number(storedEmTar));
    else setEmergencyTarget(30000000);

    if (storedAcCurr) setAccumulationCurrent(Number(storedAcCurr));
    else setAccumulationCurrent(45000000);

    if (storedAcTar) setAccumulationTarget(Number(storedAcTar));
    else setAccumulationTarget(150000000);

    if (storedSavHist) {
      try {
        setSavingsHistory(JSON.parse(storedSavHist));
      } catch (e) {
        console.error(e);
      }
    } else {
      const seedHistory = [
        { id: 'h1', fund: 'emergency', type: 'deposit', amount: 8000000, date: '2026-07-01' },
        { id: 'h2', fund: 'accumulation', type: 'deposit', amount: 35000000, date: '2026-07-05' },
        { id: 'h3', fund: 'emergency', type: 'deposit', amount: 4000000, date: '2026-07-10' },
        { id: 'h4', fund: 'accumulation', type: 'deposit', amount: 10000000, date: '2026-07-12' }
      ];
      setSavingsHistory(seedHistory);
      localStorage.setItem(`finance_sav_hist_${userId}`, JSON.stringify(seedHistory));
    }
  }, [currentUser]);

  // Save helpers
  const saveTransactions = (userId: string, data: any[]) => {
    setManualTransactions(data);
    localStorage.setItem(`finance_trans_${userId}`, JSON.stringify(data));
  };

  const saveEmergencyCurrent = (userId: string, val: number) => {
    setEmergencyCurrent(val);
    localStorage.setItem(`finance_em_curr_${userId}`, String(val));
  };

  const saveEmergencyTarget = (userId: string, val: number) => {
    setEmergencyTarget(val);
    localStorage.setItem(`finance_em_tar_${userId}`, String(val));
  };

  const saveAccumulationCurrent = (userId: string, val: number) => {
    setAccumulationCurrent(val);
    localStorage.setItem(`finance_ac_curr_${userId}`, String(val));
  };

  const saveAccumulationTarget = (userId: string, val: number) => {
    setAccumulationTarget(val);
    localStorage.setItem(`finance_ac_tar_${userId}`, String(val));
  };

  const saveSavingsHistory = (userId: string, data: any[]) => {
    setSavingsHistory(data);
    localStorage.setItem(`finance_sav_hist_${userId}`, JSON.stringify(data));
  };

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
      setActiveTeacherName((prev) => {
        const needsDefault =
          !prev ||
          prev === 'Giáo Viên 1' ||
          !list.includes(prev);
        return needsDefault ? list[0] : prev;
      });
    }
  }, [currentUser]);

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
    } else {
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

  // Finance metrics integration calculations
  const getSupabaseIncome = useCallback(() => {
    let earned = 0;
    sessions.forEach(s => {
      if (s.status === 'Đã dạy') {
        earned += Number(s.price) || 0;
      }
    });
    return earned;
  }, [sessions]);

  const getTotalIncome = useCallback(() => {
    const manualInc = manualTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    return manualInc + getSupabaseIncome();
  }, [manualTransactions, getSupabaseIncome]);

  const getTotalExpense = useCallback(() => {
    return manualTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [manualTransactions]);

  const getCombinedTransactions = useCallback(() => {
    const manual = manualTransactions.map(t => ({
      id: t.id,
      desc: t.desc,
      amount: Number(t.amount) || 0,
      type: t.type,
      category: t.category,
      date: t.date,
      isManual: true
    }));

    const auto = sessions
      .filter(s => s.status === 'Đã dạy')
      .map(s => ({
        id: `session-${s.id}`,
        desc: `Thu nhập ca dạy: ${s.student_name}`,
        amount: Number(s.price) || 0,
        type: 'income',
        category: 'Giáo dục',
        date: s.date,
        isManual: false
      }));

    return [...manual, ...auto].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [manualTransactions, sessions]);

  // Upcoming classes selector (filtered from future schedule dates)
  const getUpcomingSessions = () => {
    const nowStr = new Date().toISOString().split('T')[0];
    return sessions
      .filter(s => {
        if (s.status === 'Hủy') return false;
        return s.date >= nowStr || s.status === 'Chưa dạy';
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, 3);
  };

  // Savings deposits / withdrawals handler
  const handleSavingAction = (fund: 'emergency' | 'accumulation', action: 'deposit' | 'withdraw') => {
    if (!currentUser) return;
    const userId = currentUser.id;
    const amountStr = fund === 'emergency' ? emActionAmount : acActionAmount;
    const amountVal = Number(amountStr);
    
    if (!amountVal || amountVal <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ lớn hơn 0.');
      return;
    }

    let currentVal = fund === 'emergency' ? emergencyCurrent : accumulationCurrent;
    let newVal = currentVal;
    
    if (action === 'deposit') {
      newVal += amountVal;
    } else {
      if (amountVal > currentVal) {
        alert('Số dư quỹ tiết kiệm hiện tại không đủ để thực hiện rút tiền.');
        return;
      }
      newVal -= amountVal;
    }

    if (fund === 'emergency') {
      saveEmergencyCurrent(userId, newVal);
      setEmActionAmount('');
    } else {
      saveAccumulationCurrent(userId, newVal);
      setAcActionAmount('');
    }

    // Add log item to savings history
    const newHistItem = {
      id: `sh-${Date.now()}`,
      fund,
      type: action,
      amount: amountVal,
      date: new Date().toISOString().split('T')[0]
    };
    
    const updatedHist = [newHistItem, ...savingsHistory];
    saveSavingsHistory(userId, updatedHist);
  };

  if (!currentUser || !selectedMonth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#090b10] gap-4">
        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-400 font-semibold text-sm">Đang tải cấu hình hệ thống...</span>
      </div>
    );
  }

  // SUB-RENDER: Sidebar Content
  const renderSidebarContent = (isMobile = false) => {
    const tabs = [
      { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
      { id: 'flow', label: 'Dòng chảy', icon: Activity },
      { id: 'saving', label: 'Tiết kiệm', icon: PiggyBank },
      { id: 'schedule', label: 'Lịch trình', icon: CalendarIcon },
      { id: 'settings', label: 'Cài đặt', icon: Settings },
    ];

    return (
      <div className="flex flex-col h-full select-none text-left">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 py-4 mb-8 border-b border-white/5">
          <div className="h-10 w-10 bg-indigo-500/15 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(92,54,245,0.25)] shrink-0">
            <Wallet className="h-5.5 w-5.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-wide text-white uppercase leading-none">Finance</span>
            <span className="font-extrabold text-[9px] tracking-widest text-indigo-400 uppercase">Dashboard</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex flex-col gap-2 flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (isMobile) setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                  isActive
                    ? 'bg-indigo-500/15 border border-indigo-500/35 text-indigo-300 shadow-[0_0_12px_rgba(92,54,245,0.15)]'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User profile card & logout */}
        <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2.5 px-2">
            <div className="h-8.5 w-8.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl flex items-center justify-center text-indigo-300 font-black text-xs shadow-sm shrink-0">
              {currentUser.teacherName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-extrabold text-white truncate leading-tight">
                {currentUser.teacherName}
              </span>
              <span className="text-[9px] font-black text-indigo-400/80 uppercase tracking-widest leading-none">
                {currentUser.role === 'admin' ? 'Admin' : 'User'}
              </span>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer text-left"
          >
            <LogOut className="h-4.5 w-4.5 text-rose-450 shrink-0" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    );
  };

  // SUB-RENDER: Dashboard Tab
  const renderDashboard = () => {
    const upcoming = getUpcomingSessions();
    const supabaseIncome = getSupabaseIncome();
    const manualIncome = manualTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalIncome = manualIncome + supabaseIncome;
    const totalExpense = getTotalExpense();
    const walletCash = totalIncome - totalExpense;
    const savings = emergencyCurrent + accumulationCurrent;
    const netWorth = walletCash + savings;

    // Last 6 months SVG chart rendering values
    const chartData = [
      { label: 'Th.2', income: 15000000, expense: 11000000 },
      { label: 'Th.3', income: 18000000, expense: 12500000 },
      { label: 'Th.4', income: 22000000, expense: 16000000 },
      { label: 'Th.5', income: 19500000, expense: 14000000 },
      { label: 'Th.6', income: 24000000, expense: 17500000 },
      { label: 'Th.7', income: totalIncome, expense: totalExpense },
    ];

    const maxVal = Math.max(25000000, ...chartData.flatMap(d => [d.income, d.expense]));
    const emPercent = Math.min(100, Math.round((emergencyCurrent / Math.max(1, emergencyTarget)) * 100));
    const acPercent = Math.min(100, Math.round((accumulationCurrent / Math.max(1, accumulationTarget)) * 100));

    return (
      <div className="space-y-6 animate-mac-dropdown">
        {/* Welcome Hero */}
        <div className="flex flex-col gap-1 text-left relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-extrabold tracking-wider uppercase w-fit mb-1 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Tổng quan tài sản</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-[1.1]">
            Xin chào, <span className="bg-gradient-to-r from-white via-indigo-150 to-purple-400 bg-clip-text text-transparent">{currentUser.teacherName}</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-semibold pt-0.5">
            Quản lý tài chính, quỹ dự phòng, tích lũy tiết kiệm và lịch học gia sư trong một giao diện duy nhất.
          </p>
        </div>

        {/* KPI metrics */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 text-left">
          {/* Net Worth */}
          <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Tổng tài sản</span>
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-[0_0_12px_rgba(123,97,255,0.25)] shrink-0">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-lg sm:text-2xl font-black text-white tracking-tight leading-none block truncate" title={formatVND(netWorth)}>
                {formatVND(netWorth)}
              </span>
            </div>
            <div className="mt-2 flex">
              <span className="text-[10px] font-extrabold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-md">
                Ví + Tiết kiệm
              </span>
            </div>
          </div>

          {/* Available wallet */}
          <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Tiền mặt trong ví</span>
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)] shrink-0">
                <Coins className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-lg sm:text-2xl font-black tracking-tight leading-none block truncate ${walletCash >= 0 ? 'text-white' : 'text-rose-400'}`} title={formatVND(walletCash)}>
                {formatVND(walletCash)}
              </span>
            </div>
            <div className="mt-2 flex">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${walletCash >= 0 ? 'text-emerald-400 bg-emerald-500/15' : 'text-rose-400 bg-rose-500/15'}`}>
                Doanh thu - Chi tiêu
              </span>
            </div>
          </div>

          {/* Actual Earned Income */}
          <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Tổng thu tháng này</span>
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)] shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-lg sm:text-2xl font-black text-white tracking-tight leading-none block truncate" title={formatVND(totalIncome)}>
                {formatVND(totalIncome)}
              </span>
            </div>
            <div className="mt-2 flex">
              <span className="text-[10px] font-extrabold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md">
                Đã dạy + Giao dịch
              </span>
            </div>
          </div>

          {/* Total Savings */}
          <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Tổng tiết kiệm</span>
              <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)] shrink-0">
                <PiggyBank className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-lg sm:text-2xl font-black text-white tracking-tight leading-none block truncate" title={formatVND(savings)}>
                {formatVND(savings)}
              </span>
            </div>
            <div className="mt-2 flex">
              <span className="text-[10px] font-extrabold text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-md">
                Dự phòng + Tích lũy
              </span>
            </div>
          </div>
        </div>

        {/* Main Grid: Chart / Savings & Upcoming */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Chart + Recent Transactions */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Chart */}
            <div className="calendar-container-depth p-5 text-left bg-[#141824]">
              <div className="flex items-center justify-between mb-5 select-none">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(92,54,245,0.7)]"></div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Lịch Sử Thu Nhập & Chi Tiêu (6 tháng qua)</h3>
                </div>
                <div className="flex items-center gap-3.5 text-[10px] font-extrabold">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-emerald-500 rounded-sm"></span>
                    <span className="text-slate-450">Thu nhập</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-rose-500 rounded-sm"></span>
                    <span className="text-slate-450">Chi tiêu</span>
                  </div>
                </div>
              </div>

              {/* Responsive SVG Column chart */}
              <div className="w-full overflow-x-auto scrollbar-thin">
                <svg className="w-full min-w-[520px] h-[200px]" viewBox="0 0 600 200">
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#059669" stopOpacity="0.15" />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity="0.15" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines */}
                  {[25, 65, 105, 145].map((y, idx) => (
                    <line
                      key={idx}
                      x1="65"
                      y1={y}
                      x2="575"
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.04)"
                      strokeDasharray="4 4"
                    />
                  ))}

                  {/* Y-axis Label text */}
                  {[maxVal, maxVal * 0.66, maxVal * 0.33, 0].map((val, idx) => {
                    const yPoints = [25, 65, 105, 145];
                    return (
                      <text
                        key={idx}
                        x="55"
                        y={yPoints[idx] + 3.5}
                        fill="#64748b"
                        fontSize="9"
                        fontWeight="750"
                        textAnchor="end"
                      >
                        {val >= 1000000 ? `${(val / 1000000).toFixed(0)}M` : formatVND(val)}
                      </text>
                    );
                  })}

                  {/* Column Rendering */}
                  {chartData.map((d, idx) => {
                    const slotWidth = (600 - 80) / 6;
                    const centerPoint = 80 + idx * slotWidth + slotWidth / 2;
                    
                    const incHeight = (d.income / maxVal) * 120;
                    const expHeight = (d.expense / maxVal) * 120;
                    
                    const incY = 145 - incHeight;
                    const expY = 145 - expHeight;

                    return (
                      <g key={idx} className="group">
                        {/* Income Column */}
                        <rect
                          x={centerPoint - 13}
                          y={incY}
                          width="11"
                          height={Math.max(1, incHeight)}
                          fill="url(#incomeGrad)"
                          stroke="#10b981"
                          strokeWidth="1"
                          rx="3"
                          className="transition-all duration-300 hover:opacity-100 opacity-90 cursor-pointer"
                        >
                          <title>{`Thu nhập ${d.label}: ${formatVND(d.income)}`}</title>
                        </rect>
                        
                        {/* Expense Column */}
                        <rect
                          x={centerPoint + 2}
                          y={expY}
                          width="11"
                          height={Math.max(1, expHeight)}
                          fill="url(#expenseGrad)"
                          stroke="#ef4444"
                          strokeWidth="1"
                          rx="3"
                          className="transition-all duration-300 hover:opacity-100 opacity-90 cursor-pointer"
                        >
                          <title>{`Chi tiêu ${d.label}: ${formatVND(d.expense)}`}</title>
                        </rect>

                        {/* Month text label */}
                        <text
                          x={centerPoint}
                          y="168"
                          fill="#94a3b8"
                          fontSize="9.5"
                          fontWeight="800"
                          textAnchor="middle"
                        >
                          {d.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Baseline grid line */}
                  <line x1="65" y1="145" x2="575" y2="145" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
                </svg>
              </div>
            </div>

            {/* Recent log */}
            <div className="calendar-container-depth p-5 text-left bg-[#141824]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(92,54,245,0.7)]"></div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Hoạt động dòng tiền gần đây</h3>
                </div>
                <button onClick={() => setActiveTab('flow')} className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 hover:underline">
                  Xem tất cả
                </button>
              </div>

              {getCombinedTransactions().slice(0, 4).length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center font-bold">Chưa có phát sinh giao dịch nào.</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {getCombinedTransactions().slice(0, 4).map((t: any) => {
                    const isInc = t.type === 'income';
                    return (
                      <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-2 rounded-xl shrink-0 ${isInc ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                            {isInc ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate leading-snug">{t.desc}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] font-black text-slate-500 uppercase">{t.date}</span>
                              <span className="h-1 w-1 bg-white/10 rounded-full"></span>
                              <span className="text-[9px] font-extrabold text-slate-400">{t.category}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`text-xs font-black shrink-0 ${isInc ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isInc ? '+' : '-'}{formatVND(t.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Goals progress and Next classes */}
          <div className="space-y-6 text-left">
            
            {/* Savings Goals progress */}
            <div className="calendar-container-depth p-5 space-y-4 bg-[#141824]">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(92,54,245,0.7)]"></div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Tiến độ tích lũy tiết kiệm</h3>
              </div>

              {/* Emergency */}
              <div className="bg-[#181d2e] border border-white/5 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-350">Quỹ Dự Phòng</span>
                  <span className="text-indigo-400">{emPercent}%</span>
                </div>
                <div className="h-2 bg-[#101420] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_8px_rgba(92,54,245,0.5)] transition-all duration-300"
                    style={{ width: `${emPercent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] font-extrabold text-slate-500">
                  <span>Đã tích lũy: {formatVND(emergencyCurrent)}</span>
                  <span>Mục tiêu: {formatVND(emergencyTarget)}</span>
                </div>
              </div>

              {/* Accumulation */}
              <div className="bg-[#181d2e] border border-white/5 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-350">Quỹ Tích Lũy</span>
                  <span className="text-cyan-400">{acPercent}%</span>
                </div>
                <div className="h-2 bg-[#101420] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-all duration-300"
                    style={{ width: `${acPercent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] font-extrabold text-slate-500">
                  <span>Đã tích lũy: {formatVND(accumulationCurrent)}</span>
                  <span>Mục tiêu: {formatVND(accumulationTarget)}</span>
                </div>
              </div>

              <button onClick={() => setActiveTab('saving')} className="w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/35 text-indigo-350 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center block">
                Nạp / Rút Quỹ Tiết Kiệm
              </button>
            </div>

            {/* Upcoming Shifts list */}
            <div className="calendar-container-depth p-5 bg-[#141824]">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(92,54,245,0.7)]"></div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Lịch giảng dạy sắp tới</h3>
                </div>
                <button onClick={() => setActiveTab('schedule')} className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 hover:underline">
                  Xem lịch học
                </button>
              </div>

              {upcoming.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center font-bold">Chưa có lịch dạy học nào.</p>
              ) : (
                <div className="space-y-3.5">
                  {upcoming.map((s) => (
                    <div key={s.id} className="bg-[#181d2e] border border-white/5 rounded-2xl p-3.5 flex items-center justify-between hover:border-indigo-500/25 transition-all">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-white">{s.student_name}</p>
                        <div className="flex flex-col text-[10px] text-slate-400 font-extrabold space-y-0.5">
                          <span>{s.date} ({s.day_of_week})</span>
                          <span>{s.time} - Thời lượng: {s.duration}h</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                        {formatVND(s.price)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    );
  };

  // SUB-RENDER: Cash Flow Tab
  const renderFlow = () => {
    const supabaseIncome = getSupabaseIncome();
    const manualIncome = manualTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = manualIncome + supabaseIncome;
    const totalExpense = getTotalExpense();
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100)) : 0;

    const combined = getCombinedTransactions();
    const filtered = combined.filter((t: any) => {
      if (txFilter === 'income' && t.type !== 'income') return false;
      if (txFilter === 'expense' && t.type !== 'expense') return false;
      
      if (txSearch) {
        const q = txSearch.toLowerCase();
        return (
          t.desc.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.date.includes(q)
        );
      }
      return true;
    });

    const categories = txType === 'income' 
      ? ['Lương', 'Đầu tư', 'Khác'] 
      : ['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Khác'];

    const handleAddTx = (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;
      const userId = currentUser.id;

      if (!txDesc.trim() || !txAmount || Number(txAmount) <= 0) {
        alert('Vui lòng điền mô tả và số tiền hợp lệ lớn hơn 0.');
        return;
      }

      const newTx = {
        id: `tx-${Date.now()}`,
        desc: txDesc.trim(),
        amount: Number(txAmount),
        type: txType,
        category: txCategory,
        date: txDate
      };

      const updated = [newTx, ...manualTransactions];
      saveTransactions(userId, updated);
      
      setTxDesc('');
      setTxAmount('');
    };

    const handleDeleteTx = (id: string) => {
      if (!currentUser) return;
      const userId = currentUser.id;
      if (confirm('Bạn có chắc chắn muốn xóa giao dịch thủ công này?')) {
        const updated = manualTransactions.filter(t => t.id !== id);
        saveTransactions(userId, updated);
      }
    };

    return (
      <div className="space-y-6 animate-mac-dropdown text-left">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-white tracking-tight">Dòng Chảy Tài Chính</h2>
          <p className="text-slate-400 text-xs font-semibold">Theo dõi chi tiết các khoản phát sinh thu nhập và chi tiêu của bạn.</p>
        </div>

        {/* Summary metric blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#141824] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tổng thu tháng này</span>
              <p className="text-base sm:text-lg font-black text-white">{formatVND(totalIncome)}</p>
            </div>
          </div>

          <div className="bg-[#141824] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <ArrowDownRight className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tổng chi tháng này</span>
              <p className="text-base sm:text-lg font-black text-white">{formatVND(totalExpense)}</p>
            </div>
          </div>

          <div className="bg-[#141824] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tỷ suất tiết kiệm</span>
              <p className="text-base sm:text-lg font-black text-white">{savingsRate}%</p>
            </div>
          </div>
        </div>

        {/* Data list and form grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Transaction History list */}
          <div className="xl:col-span-2 calendar-container-depth p-5 space-y-4 bg-[#141824]">
            
            {/* Header filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div className="flex bg-[#0d1018] p-1 rounded-xl border border-white/10 w-full sm:w-auto">
                {(['all', 'income', 'expense'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTxFilter(type)}
                    className={`flex-1 sm:flex-initial px-4 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                      txFilter === type
                        ? 'bg-indigo-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {type === 'all' ? 'TẤT CẢ' : type === 'income' ? 'THU NHẬP' : 'CHI TIÊU'}
                  </button>
                ))}
              </div>

              {/* Search text input */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm giao dịch..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* List scroll panel */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
              {filtered.length === 0 ? (
                <p className="text-xs text-slate-500 py-12 text-center font-bold">Không tìm thấy giao dịch nào tương hợp.</p>
              ) : (
                filtered.map((t: any) => {
                  const isInc = t.type === 'income';
                  return (
                    <div key={t.id} className="p-3 bg-[#181d2e]/40 border border-white/5 hover:border-white/10 rounded-2xl flex items-center justify-between gap-4 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 ${isInc ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-455 border border-rose-500/20'}`}>
                          {isInc ? <ArrowUpRight className="h-4.5 w-4.5" /> : <ArrowDownRight className="h-4.5 w-4.5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white truncate leading-snug">{t.desc}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-black text-slate-500 uppercase">{t.date}</span>
                            <span className="h-1 w-1 bg-white/10 rounded-full"></span>
                            <span className="text-[9px] font-extrabold text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded-md border border-white/5">
                              {t.category}
                            </span>
                            {!t.isManual && (
                              <span className="text-[8px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-1.5 py-0.5 rounded-md shrink-0">
                                Tự động đồng bộ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-black ${isInc ? 'text-emerald-400' : 'text-rose-455'}`}>
                          {isInc ? '+' : '-'}{formatVND(t.amount)}
                        </span>
                        {t.isManual && (
                          <button
                            onClick={() => handleDeleteTx(t.id)}
                            title="Xóa giao dịch"
                            className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Add Form panel */}
          <div className="calendar-container-depth p-5 space-y-4 h-fit bg-[#141824]">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Plus className="h-4.5 w-4.5 text-indigo-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Thêm giao dịch thủ công</h3>
            </div>

            <form onSubmit={handleAddTx} className="space-y-4">
              {/* Type Switch */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Loại hình</label>
                <div className="flex bg-[#0d1018] p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => { setTxType('expense'); setTxCategory('Ăn uống'); }}
                    className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                      txType === 'expense'
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'text-slate-450 hover:text-slate-200'
                    }`}
                  >
                    CHI TIÊU
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTxType('income'); setTxCategory('Lương'); }}
                    className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                      txType === 'income'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-slate-450 hover:text-slate-200'
                    }`}
                  >
                    THU NHẬP
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Mô tả giao dịch</label>
                <input
                  type="text"
                  placeholder="VD: Mua thực phẩm, Tiền lương..."
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Số tiền (VND)</label>
                <input
                  type="number"
                  placeholder="VD: 250000"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Danh mục danh mục</label>
                <div className="relative">
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer block"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c} className="bg-[#0d1018] text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Datepicker */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Ngày giao dịch</label>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                  required
                />
              </div>

              {/* Save trigger button */}
              <button
                type="submit"
                className="w-full py-3 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-xs rounded-xl shadow-[0_4px_12px_rgba(92,54,245,0.3)] transition-all hover:scale-[1.02] cursor-pointer"
              >
                Ghi Nhận Giao Dịch
              </button>
            </form>
          </div>

        </div>
      </div>
    );
  };

  // SUB-RENDER: Savings Tab
  const renderSaving = () => {
    const emPercent = Math.min(100, Math.round((emergencyCurrent / Math.max(1, emergencyTarget)) * 100));
    const acPercent = Math.min(100, Math.round((accumulationCurrent / Math.max(1, accumulationTarget)) * 100));

    return (
      <div className="space-y-6 animate-mac-dropdown text-left">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-white tracking-tight">Quỹ Tiết Kiệm Tích Lũy</h2>
          <p className="text-slate-400 text-xs font-semibold">Tách biệt dòng tiền tích lũy dài hạn và quỹ dự phòng rủi ro biến cố.</p>
        </div>

        {/* Dual Card panel */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Emergency Fund Card */}
          <div className="kpi-editorial-card p-6 flex flex-col justify-between space-y-6 text-left">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl shadow-sm">
                    <PiggyBank className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Quỹ Dự Phòng</h3>
                    <p className="text-[10px] text-slate-450 font-medium leading-none mt-0.5">Dành cho tình huống khẩn cấp (ốm đau, sự cố đột xuất).</p>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 rounded-md">
                  Đạt {emPercent}%
                </span>
              </div>

              {/* Balances */}
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-slate-550 uppercase">Số dư hiện hữu</span>
                <p className="text-2xl font-black text-white leading-none">{formatVND(emergencyCurrent)}</p>
              </div>

              {/* Progress */}
              <div className="space-y-2 pt-1.5">
                <div className="h-2 bg-[#101420] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_8px_rgba(92,54,245,0.45)] transition-all duration-300"
                    style={{ width: `${emPercent}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span>Mục tiêu:</span>
                    <input
                      type="number"
                      value={emergencyTarget}
                      onChange={(e) => {
                        if (!currentUser) return;
                        saveEmergencyTarget(currentUser.id, Number(e.target.value));
                      }}
                      className="w-24 bg-[#0d1018] border border-white/10 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white text-right focus:outline-none focus:border-indigo-500"
                    />
                    <span>VND</span>
                  </div>
                  <span>Tiến độ mục tiêu</span>
                </div>
              </div>
            </div>

            {/* Quick Actions form */}
            <div className="bg-[#121624] rounded-2xl p-4 border border-white/5 space-y-3.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Giao dịch nạp / rút quỹ</span>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Nhập số tiền..."
                  value={emActionAmount}
                  onChange={(e) => setEmActionAmount(e.target.value)}
                  className="flex-1 bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  onClick={() => handleSavingAction('emergency', 'deposit')}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Nạp
                </button>
                <button
                  onClick={() => handleSavingAction('emergency', 'withdraw')}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Rút
                </button>
              </div>
            </div>
          </div>

          {/* Accumulation Fund Card */}
          <div className="kpi-editorial-card p-6 flex flex-col justify-between space-y-6 text-left">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl shadow-sm">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Quỹ Tích Lũy</h3>
                    <p className="text-[10px] text-slate-450 font-medium leading-none mt-0.5">Dành cho mục tiêu lớn dài hạn (mua xe, nhà, học tập, đầu tư).</p>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 rounded-md">
                  Đạt {acPercent}%
                </span>
              </div>

              {/* Balances */}
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-slate-550 uppercase">Số dư hiện hữu</span>
                <p className="text-2xl font-black text-white leading-none">{formatVND(accumulationCurrent)}</p>
              </div>

              {/* Progress */}
              <div className="space-y-2 pt-1.5">
                <div className="h-2 bg-[#101420] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-[0_0_8px_rgba(6,182,212,0.45)] transition-all duration-300"
                    style={{ width: `${acPercent}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span>Mục tiêu:</span>
                    <input
                      type="number"
                      value={accumulationTarget}
                      onChange={(e) => {
                        if (!currentUser) return;
                        saveAccumulationTarget(currentUser.id, Number(e.target.value));
                      }}
                      className="w-24 bg-[#0d1018] border border-white/10 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white text-right focus:outline-none focus:border-indigo-500"
                    />
                    <span>VND</span>
                  </div>
                  <span>Tiến độ mục tiêu</span>
                </div>
              </div>
            </div>

            {/* Quick Actions form */}
            <div className="bg-[#121624] rounded-2xl p-4 border border-white/5 space-y-3.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Giao dịch nạp / rút quỹ</span>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Nhập số tiền..."
                  value={acActionAmount}
                  onChange={(e) => setAcActionAmount(e.target.value)}
                  className="flex-1 bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  onClick={() => handleSavingAction('accumulation', 'deposit')}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Nạp
                </button>
                <button
                  onClick={() => handleSavingAction('accumulation', 'withdraw')}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Rút
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* savings logs */}
        <div className="calendar-container-depth p-5 text-left bg-[#141824]">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3.5 mb-4">
            <History className="h-4.5 w-4.5 text-indigo-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Lịch sử giao dịch quỹ tiết kiệm</h3>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
            {savingsHistory.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center font-bold">Chưa có phát sinh giao dịch tích lũy.</p>
            ) : (
              savingsHistory.map((h) => {
                const isDep = h.type === 'deposit';
                return (
                  <div key={h.id} className="p-3.5 bg-[#181d2e]/45 border border-white/5 rounded-2xl flex items-center justify-between gap-4 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border shrink-0 ${isDep ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                        {isDep ? 'Nạp quỹ' : 'Rút quỹ'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white leading-snug">
                          {h.fund === 'emergency' ? 'Quỹ Dự Phòng Khẩn Cấp' : 'Quỹ Tích Lũy Dài Hạn'}
                        </p>
                        <span className="text-[9px] font-black text-slate-500 uppercase">{h.date}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-black shrink-0 ${isDep ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isDep ? '+' : '-'}{formatVND(h.amount)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  // SUB-RENDER: Schedule View (rebranding scheduler)
  const renderSchedule = () => {
    return (
      <div className="space-y-6 animate-mac-dropdown">
        
        {/* Scheduler identity */}
        <section className="relative flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-left">
          <div className="space-y-1 max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-extrabold tracking-wider uppercase mb-1 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(123,97,255,1)]"></span>
              <span>Tổng quan giảng dạy</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none">
              Lịch Trình Giảng Dạy & Chấm Công
            </h1>

            <p className="text-slate-400 text-xs sm:text-sm font-semibold tracking-wide pt-0.5">
              {totalSessions > 0 
                ? `Tháng này bạn có ${totalSessions} ca dạy với tổng doanh thu dự kiến ${formatVND(projectedIncome)}.`
                : 'Hiện tại chưa có lịch ca dạy nào được tạo cho tháng này.'
              }
            </p>
          </div>

          {/* Action button & Month Selector */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 z-10" data-picker>
            {/* Hero — Teacher Dropdown (Admin only) */}
            {currentUser.role === 'admin' && teachers.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setHeroTeacherDropOpen(o=>!o)}
                  className="flex items-center gap-2 bg-[#121624] border border-white/10 hover:border-indigo-500/40 text-white text-xs font-bold rounded-xl px-3.5 py-2.5 cursor-pointer focus:outline-none transition-all shadow-lg"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
                  <span>{activeTeacherName}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${heroTeacherDropOpen?'rotate-180':''}`}/>
                </button>
                {heroTeacherDropOpen && (
                  <div className="absolute top-full mt-2 left-0 z-[200] min-w-full w-max bg-[#0d1018] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-xl animate-mac-dropdown origin-top-left">
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
          </div>
        </section>

        {/* Dominating KPI Cards */}
        <section className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 text-left">
          {/* KPI 1 */}
          <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Ca dạy trong tháng</span>
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-[0_0_12px_rgba(123,97,255,0.3)] shrink-0">
                <CalendarIcon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-lg sm:text-2xl font-black text-white tracking-tight leading-none block truncate" title={String(totalSessions)}>
                {totalSessions}
              </span>
            </div>
            <div className="mt-2 flex">
              <span className="text-[10px] font-extrabold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-md">
                Tổng ca dạy
              </span>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Ca hoàn thành</span>
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-lg sm:text-2xl font-black text-white tracking-tight leading-none block truncate" title={String(completedSessions)}>
                {completedSessions}
              </span>
            </div>
            <div className="mt-2 flex">
              {totalSessions > 0 && (
                <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md">
                  ↑ {Math.round((completedSessions / totalSessions) * 105) / 1.05}%
                </span>
              )}
            </div>
          </div>

          {/* KPI 3 */}
          <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Thu nhập thực tế</span>
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.3)] shrink-0">
                <Coins className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-lg sm:text-2xl font-black text-white tracking-tight leading-none block truncate" title={formatVND(earnedIncome)}>
                {formatVND(earnedIncome)}
              </span>
            </div>
            <div className="mt-2 flex">
              <span className="text-[10px] font-extrabold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md">
                Đã giảng dạy
              </span>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Thu nhập dự kiến</span>
              <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-lg sm:text-2xl font-black text-white tracking-tight leading-none block truncate" title={formatVND(projectedIncome)}>
                {formatVND(projectedIncome)}
              </span>
            </div>
            <div className="mt-2 flex">
              <span className="text-[10px] font-extrabold text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-md">
                Thu nhập tối đa
              </span>
            </div>
          </div>
        </section>

        {/* Timetable view */}
        <section className="flex-grow flex flex-col min-h-[480px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5 select-none shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-[#5c36f5] shadow-[0_0_10px_rgba(92,54,245,1)]"></div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Lịch biểu giảng dạy học sinh
              </h3>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* Thêm ca dạy button */}
              <button
                onClick={() => setAddModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-1.5 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-[11px] rounded-xl shadow-[0_4px_12px_rgba(92,54,245,0.35)] hover:scale-[1.02] transition-all cursor-pointer border border-white/20 select-none"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Thêm Ca Dạy Nhanh</span>
              </button>

              {/* Month Selector dropdown */}
              <div className="relative" data-picker>
                <button
                  onClick={() => { setMonthPickerOpen(o => !o); setPickerYear(parseInt(selectedMonth.split('-')[0])); }}
                  className="flex items-center gap-2 bg-[#121624] border border-white/10 hover:border-indigo-500/40 text-white text-[11px] font-bold rounded-xl px-3.5 py-1.5 cursor-pointer transition-all shadow-lg"
                >
                  <CalendarIcon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span className="font-black">
                    {(() => { const [y,m]=selectedMonth.split('-'); return ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'][parseInt(m)-1]+' '+y; })()}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${monthPickerOpen?'rotate-180':''}`}/>
                </button>
                {monthPickerOpen && (
                  <div className="absolute top-full mt-2 right-0 z-[200] w-64 bg-[#0d1018] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-4 backdrop-blur-xl animate-mac-dropdown origin-top-right">
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
                          <button key={mn} onClick={()=>{setSelectedMonth(val);setMonthPickerOpen(false);}} className={`py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${isActive?'bg-[#5c36f5] text-white shadow-[0_0_12px_rgba(92,54,245,0.5)]':'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}>{mn}</button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* View Switcher slider */}
              <div className="relative flex bg-[#0d1018] border border-white/10 p-1 rounded-xl">
                <div
                  className="absolute top-1 bottom-1 rounded-[10px] bg-[#5c36f5] shadow-[0_0_16px_rgba(92,54,245,0.55)] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none"
                  style={{
                    left: '4px',
                    width: 'calc(50% - 4px)',
                    transform: currentView === 'month' ? 'translateX(0)' : 'translateX(100%)',
                  }}
                />
                <button
                  onClick={() => setCurrentView('month')}
                  className={`relative z-10 px-4 py-1.5 text-[10px] font-black rounded-[10px] transition-colors duration-300 ${
                    currentView === 'month' ? 'text-white' : 'text-slate-555 hover:text-slate-300'
                  }`}
                >
                  LỊCH THÁNG
                </button>
                <button
                  onClick={() => setCurrentView('week')}
                  className={`relative z-10 px-4 py-1.5 text-[10px] font-black rounded-[10px] transition-colors duration-300 ${
                    currentView === 'week' ? 'text-white' : 'text-slate-555 hover:text-slate-300'
                  }`}
                >
                  LỊCH TUẦN
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="calendar-container-depth flex flex-col items-center justify-center p-16 text-slate-400 gap-3 min-h-[380px] h-full">
              <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
              <span className="font-extrabold text-sm text-slate-300">Đang tải dữ liệu từ database...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="calendar-container-depth flex flex-col items-center justify-center py-20 px-6 text-center min-h-[380px] h-full bg-[#141824]">
              <div className="h-16 w-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-4 shadow-sm">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-black text-white">
                Chưa có lịch dạy học nào trong tháng {selectedMonth}
              </h3>
              <p className="text-xs text-slate-400 mt-2 max-w-md font-medium">
                Hãy click nút "Thêm Ca Dạy Nhanh" phía trên để khởi tạo ca học.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 grid-rows-1 w-full flex-grow overflow-hidden">
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
    );
  };

  // SUB-RENDER: Settings Tab
  const renderSettings = () => {
    const getBackupJSON = () => {
      const data = {
        transactions: manualTransactions,
        emergency: { current: emergencyCurrent, target: emergencyTarget },
        accumulation: { current: accumulationCurrent, target: accumulationTarget },
        history: savingsHistory
      };
      return JSON.stringify(data, null, 2);
    };

    const handleRestoreJSON = (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;
      const userId = currentUser.id;
      const form = e.currentTarget as HTMLFormElement;
      const text = (form.elements.namedItem('restoreArea') as HTMLTextAreaElement).value;
      try {
        const parsed = JSON.parse(text);
        if (parsed.transactions) saveTransactions(userId, parsed.transactions);
        if (parsed.emergency) {
          saveEmergencyCurrent(userId, parsed.emergency.current);
          saveEmergencyTarget(userId, parsed.emergency.target);
        }
        if (parsed.accumulation) {
          saveAccumulationCurrent(userId, parsed.accumulation.current);
          saveAccumulationTarget(userId, parsed.accumulation.target);
        }
        if (parsed.history) saveSavingsHistory(userId, parsed.history);
        alert('Khôi phục dữ liệu sao lưu thành công!');
      } catch (err) {
        alert('Cú pháp chuỗi khôi phục lỗi. Hãy kiểm tra lại định dạng JSON.');
      }
    };

    const handleResetData = () => {
      if (!currentUser) return;
      const userId = currentUser.id;
      if (confirm('CẢNH BÁO: Xóa bỏ vĩnh viễn toàn bộ giao dịch dòng chảy và tiết kiệm? Hành động này không thể hoàn tác.')) {
        localStorage.removeItem(`finance_trans_${userId}`);
        localStorage.removeItem(`finance_em_curr_${userId}`);
        localStorage.removeItem(`finance_em_tar_${userId}`);
        localStorage.removeItem(`finance_ac_curr_${userId}`);
        localStorage.removeItem(`finance_ac_tar_${userId}`);
        localStorage.removeItem(`finance_sav_hist_${userId}`);

        setManualTransactions([]);
        setEmergencyCurrent(0);
        setEmergencyTarget(30000000);
        setAccumulationCurrent(0);
        setAccumulationTarget(150000000);
        setSavingsHistory([]);
        alert('Đã xóa dữ liệu tài chính cục bộ.');
      }
    };

    return (
      <div className="space-y-6 animate-mac-dropdown text-left">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-white tracking-tight">Cài Đặt Hệ Thống</h2>
          <p className="text-slate-400 text-xs font-semibold">Tùy biến tài khoản, sao lưu khôi phục dữ liệu tài chính cục bộ.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Account Profile Card */}
          <div className="calendar-container-depth p-5 space-y-4 bg-[#141824]">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <UserCircle className="h-4.5 w-4.5 text-indigo-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Hồ sơ tài khoản</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400 font-extrabold">Tên người dùng</span>
                <span className="text-white font-black">{currentUser.username}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400 font-extrabold">Quyền truy cập</span>
                <span className="text-indigo-300 font-black uppercase tracking-widest">{currentUser.role}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400 font-extrabold">Giáo viên đồng bộ</span>
                <span className="text-white font-black">{currentUser.teacherName}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setPasswordModalOpen(true)}
                className="flex-1 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-350 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
              >
                Đổi mật khẩu
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
              >
                Đăng xuất
              </button>
            </div>
          </div>

          {/* Delete data card */}
          <div className="calendar-container-depth p-5 space-y-4 bg-[#141824]">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Settings className="h-4.5 w-4.5 text-rose-450" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Quản lý vùng nhớ</h3>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              Thực hiện xóa toàn bộ dữ liệu tài chính (giao dịch thủ công và số dư các quỹ tích lũy tiết kiệm) được ghi nhớ trong trình duyệt. Thông tin về lịch dạy trên Supabase sẽ không bị ảnh hưởng.
            </p>
            <button
              onClick={handleResetData}
              className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all hover:scale-[1.01] cursor-pointer"
            >
              Xóa Toàn Bộ Dữ Liệu Tài Chính
            </button>
          </div>

          {/* Backup Restores */}
          <div className="calendar-container-depth p-5 space-y-4 xl:col-span-2 bg-[#141824]">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <FileText className="h-4.5 w-4.5 text-cyan-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Sao lưu & phục hồi tài chính</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Copy data */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Chuỗi sao lưu hiện thời (JSON)</label>
                <textarea
                  readOnly
                  value={getBackupJSON()}
                  className="w-full h-40 bg-[#0d1018] border border-white/10 text-[10px] font-mono text-cyan-300 rounded-xl p-3 focus:outline-none focus:border-indigo-500 scrollbar-thin resize-none"
                  onClick={(e) => {
                    (e.target as HTMLTextAreaElement).select();
                    document.execCommand('copy');
                    alert('Đã copy chuỗi sao lưu vào bộ nhớ Clipboard!');
                  }}
                  title="Click để chọn tất cả"
                />
                <span className="text-[9px] text-slate-500 font-extrabold block">Mẹo: Click vào hộp thoại trên để tự động copy chuỗi sao lưu.</span>
              </div>

              {/* Paste data */}
              <form onSubmit={handleRestoreJSON} className="space-y-2 flex flex-col">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Nhập dữ liệu khôi phục (JSON)</label>
                <textarea
                  name="restoreArea"
                  placeholder="Dán chuỗi dữ liệu JSON đã sao lưu vào đây..."
                  className="w-full h-40 bg-[#0d1018] border border-white/10 text-[10px] font-mono text-slate-400 rounded-xl p-3 focus:outline-none focus:border-indigo-500 resize-none"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer mt-auto"
                >
                  Khôi Phục Dữ Liệu
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // MAIN LAYOUT RETURN
  return (
    <div className="min-h-screen transition-colors duration-300 ambient-bg-dark text-slate-100 relative overflow-hidden select-none flex">
      {/* Signature Vignette Overlay */}
      <div className="vignette-overlay" />

      {/* Sidebar - Desktop view */}
      <aside className="hidden lg:flex flex-col w-[260px] shrink-0 border-r border-white/5 bg-[#0a0d16]/90 backdrop-blur-md h-screen sticky top-0 z-50 p-5">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer and main grid flow */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* macOS Floating Toolbar */}
        <header className="macos-toolbar rounded-2xl px-6 py-3.5 mx-4 sm:mx-6 lg:mx-8 mt-4 sticky top-4 z-[99] flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-2">
            {/* Mobile Hamburger menu */}
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            
            {/* Header branding / active title status */}
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 bg-indigo-500/15 border border-indigo-500/30 rounded-lg flex items-center justify-center text-indigo-400 lg:hidden shadow-sm">
                <Wallet className="h-4.5 w-4.5" />
              </div>
              <span className="font-black text-sm text-white tracking-tight lg:hidden">Finance Dashboard</span>
              
              <span className="hidden lg:inline-block font-black text-sm text-white uppercase tracking-widest">
                {activeTab === 'dashboard' && 'Tổng quan'}
                {activeTab === 'flow' && 'Dòng chảy'}
                {activeTab === 'saving' && 'Tiết kiệm'}
                {activeTab === 'schedule' && 'Lịch trình'}
                {activeTab === 'settings' && 'Cài đặt'}
              </span>
            </div>
          </div>

          {/* Right navbar profile menu */}
          <div className="flex items-center gap-3 relative" data-picker>
            {/* Quick Scheduler Manage (Admin only & Schedule view) */}
            {currentUser.role === 'admin' && activeTab === 'schedule' && (
              <button
                onClick={() => setTeachersModalOpen(true)}
                title="Quản lý danh sách giáo viên"
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#5c36f5]/12 hover:bg-[#5c36f5]/25 border border-[#5c36f5]/30 rounded-xl text-xs font-extrabold text-indigo-300 transition-all shadow-sm cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Quản lý</span>
              </button>
            )}

            <button
              onClick={() => setProfileMenuOpen(o => !o)}
              className="flex items-center gap-2.5 p-1 px-2.5 hover:bg-white/[0.05] border border-transparent hover:border-white/10 rounded-xl transition-all cursor-pointer text-left select-none"
            >
              <div className="h-8.5 w-8.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl flex items-center justify-center text-indigo-300 font-black text-xs shadow-sm shrink-0">
                {currentUser.teacherName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-extrabold text-white leading-tight">
                  {currentUser.teacherName}
                </span>
                <span className="text-[9px] font-black text-indigo-400/80 uppercase tracking-widest leading-none flex items-center gap-1">
                  {currentUser.role === 'admin' ? 'Admin' : 'User'}
                  <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                </span>
              </div>
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 z-[200] w-48 bg-[#0d1018] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-xl animate-mac-dropdown origin-top-right">
                <button
                  onClick={() => { setActiveTab('settings'); setProfileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors cursor-pointer text-left"
                >
                  <Settings className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span>Cài đặt hệ thống</span>
                </button>
                <button
                  onClick={() => { setPasswordModalOpen(true); setProfileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/[0.05] hover:text-white transition-colors cursor-pointer text-left"
                >
                  <Key className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span>Đổi mật khẩu</span>
                </button>
                <div className="border-t border-white/5" />
                <button
                  onClick={() => { handleLogout(); setProfileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-rose-455 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer text-left"
                >
                  <LogOut className="h-4 w-4 text-rose-455 shrink-0" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Mobile Slide-out Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-[100] flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-mac-backdrop"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="relative flex flex-col w-[260px] max-w-xs h-full bg-[#0a0d16] p-5 z-10 border-r border-white/5 animate-mac-modal">
              {renderSidebarContent(true)}
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1720px] mx-auto w-full min-h-[calc(100vh-100px)] relative z-10 overflow-y-auto">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'flow' && renderFlow()}
          {activeTab === 'saving' && renderSaving()}
          {activeTab === 'schedule' && renderSchedule()}
          {activeTab === 'settings' && renderSettings()}
        </main>
      </div>

      {/* Scheduler Dialog Modals */}
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
        onSwitchSession={(id) => {
          const matched = sessions.find((s) => s.id === id);
          if (matched) {
            setSelectedSession(matched);
          }
        }}
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
