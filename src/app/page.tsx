'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Users, Key, LogOut, X, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Session } from '@/lib/utils';

// Import newly refactored modular components
import Sidebar from '@/components/Sidebar';
import TransactionModal from '@/components/TransactionModal';
import DashboardTab from '@/components/DashboardTab';
import FlowTab from '@/components/FlowTab';
import SavingTab from '@/components/SavingTab';
import ScheduleTab from '@/components/ScheduleTab';
import SettingsTab from '@/components/SettingsTab';
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
  
  // Navigation states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'flow' | 'saving' | 'schedule' | 'settings'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(true);

  useEffect(() => {
    const pinnedVal = localStorage.getItem('sidebar_pinned');
    if (pinnedVal !== null) {
      const isPinned = pinnedVal === 'true';
      setIsSidebarPinned(isPinned);
      if (!isPinned) {
        setSidebarCollapsed(true);
      }
    }
  }, []);

  const handleSetSidebarPinned = (pinned: boolean) => {
    setIsSidebarPinned(pinned);
    localStorage.setItem('sidebar_pinned', pinned ? 'true' : 'false');
    if (!pinned) {
      setSidebarCollapsed(true);
    } else {
      setSidebarCollapsed(false);
    }
  };

  // Financial data states
  const [manualTransactions, setManualTransactions] = useState<any[]>([]);
  const [emergencyCurrent, setEmergencyCurrent] = useState<number>(0);
  const [emergencyTarget, setEmergencyTarget] = useState<number>(30000000);
  const [accumulationCurrent, setAccumulationCurrent] = useState<number>(0);
  const [accumulationTarget, setAccumulationTarget] = useState<number>(150000000);
  const [savingsHistory, setSavingsHistory] = useState<any[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>({});

  // Unified pop-up Transaction Modal toggle state
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [modalTxType, setModalTxType] = useState<'income' | 'expense' | 'saving'>('expense');

  // Multi-month selector states
  const [chartSelectedMonths, setChartSelectedMonths] = useState<string[]>([]);
  const [chartYear, setChartYear] = useState(() => new Date().getFullYear());

  // Scheduler data states
  const [teachers, setTeachers] = useState<string[]>([]);
  const [activeTeacherName, setActiveTeacherName] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [currentView, setCurrentView] = useState<'month' | 'week'>('month');

  // Modal open states for Scheduler & Profiles
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [teachersModalOpen, setTeachersModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  
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

  // Lock background scrolling completely when any modal window is open
  useEffect(() => {
    const isModalActive = txModalOpen || addModalOpen || editModalOpen || teachersModalOpen || passwordModalOpen;
    if (isModalActive) {
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    };
  }, [txModalOpen, addModalOpen, editModalOpen, teachersModalOpen, passwordModalOpen]);

  // Auto-reload client when a new deployment is built on Vercel
  useEffect(() => {
    let currentVersion: string | null = null;

    const checkVersion = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.version && data.version !== 'local') {
          if (currentVersion === null) {
            currentVersion = data.version;
          } else if (currentVersion !== data.version) {
            console.log('New deployment detected! Auto reloading...');
            window.location.reload();
          }
        }
      } catch (e) {
        // Ignore network check errors
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, 25000);
    const onFocus = () => checkVersion();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Close all custom dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-picker]')) {
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
      setChartSelectedMonths([currMonth]);

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
          if (profile.role !== 'admin') {
            setActiveTab('schedule');
          }
          return;
        }
      }

      router.push('/login');
    };

    fetchSession();
  }, [router]);

  // Enforce role permission on activeTab switching
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && activeTab !== 'schedule') {
      setActiveTab('schedule');
    }
  }, [currentUser, activeTab]);

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
      setManualTransactions([]);
    }

    // Load savings
    const storedEmCurr = localStorage.getItem(`finance_em_curr_${userId}`);
    const storedEmTar = localStorage.getItem(`finance_em_tar_${userId}`);
    const storedAcCurr = localStorage.getItem(`finance_ac_curr_${userId}`);
    const storedAcTar = localStorage.getItem(`finance_ac_tar_${userId}`);
    const storedSavHist = localStorage.getItem(`finance_sav_hist_${userId}`);

    if (storedEmCurr) setEmergencyCurrent(Number(storedEmCurr));
    else setEmergencyCurrent(0);

    if (storedEmTar) setEmergencyTarget(Number(storedEmTar));
    else setEmergencyTarget(30000000);

    if (storedAcCurr) setAccumulationCurrent(Number(storedAcCurr));
    else setAccumulationCurrent(0);

    if (storedAcTar) setAccumulationTarget(Number(storedAcTar));
    else setAccumulationTarget(150000000);

    if (storedSavHist) {
      try {
        setSavingsHistory(JSON.parse(storedSavHist));
      } catch (e) {
        console.error(e);
      }
    } else {
      setSavingsHistory([]);
    }

    // Load category budgets
    const storedBudgets = localStorage.getItem(`finance_budgets_${userId}`);
    if (storedBudgets) {
      try {
        setCategoryBudgets(JSON.parse(storedBudgets));
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaultBudgets = {
        'Lương': 15000000,
        'Giáo dục': 10000000,
        'Đầu tư': 5000000,
        'Khác': 1000000,
        'Ăn uống': 4000000,
        'Di chuyển': 1500000,
        'Shopping': 3000000,
        'Hóa đơn': 3000000,
        'Giải trí': 2000000
      };
      setCategoryBudgets(defaultBudgets);
      localStorage.setItem(`finance_budgets_${userId}`, JSON.stringify(defaultBudgets));
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

  const saveBudgets = (userId: string, budgets: Record<string, number>) => {
    setCategoryBudgets(budgets);
    localStorage.setItem(`finance_budgets_${userId}`, JSON.stringify(budgets));
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
    if (!selectedMonth) return;
    setLoading(true);

    // 1. Fetch sessions for the active teacher in selectedMonth (for scheduler)
    if (activeTeacherName) {
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
    } else {
      setSessions([]);
      calculateStats([]);
    }

    // 2. Fetch all sessions for all teachers in chartSelectedMonths (for admin cash flow)
    if (currentUser?.role === 'admin') {
      const monthsToFetch = chartSelectedMonths.length > 0 ? chartSelectedMonths : [selectedMonth];
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .in('month_year', monthsToFetch);
      if (!error && data) {
        setAllSessions(data as Session[]);
      } else {
        setAllSessions([]);
      }
    } else {
      setAllSessions([]);
    }

    setLoading(false);
  }, [activeTeacherName, selectedMonth, chartSelectedMonths, currentUser]);

  // Sync teachers and sessions when user or parameters change
  useEffect(() => {
    if (currentUser) {
      fetchTeachers();
    }
  }, [currentUser, fetchTeachers]);

  useEffect(() => {
    if (selectedMonth) {
      fetchSessions();
    }
  }, [selectedMonth, chartSelectedMonths, fetchSessions]);

  // Guard tab view permissions for non-admin roles
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && activeTab !== 'schedule') {
      setActiveTab('schedule');
    }
  }, [currentUser, activeTab]);

  const handleTeacherUpdated = (updatedActiveName?: string) => {
    fetchTeachers();
    if (updatedActiveName) {
      setActiveTeacherName(updatedActiveName);
    }
    fetchSessions();
  };

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

  // Finance calculations
  const getSupabaseIncome = useCallback(() => {
    let earned = 0;
    const targetSessions = currentUser?.role === 'admin' ? allSessions : sessions;
    targetSessions.forEach(s => {
      if (s.status === 'Đã dạy') {
        earned += Number(s.price) || 0;
      }
    });
    return earned;
  }, [sessions, allSessions, currentUser]);

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

  // Filtered values by selected months
  const getSelectedMonthsIncome = useCallback(() => {
    const targetSessions = currentUser?.role === 'admin' ? allSessions : sessions;
    const sbEarned = targetSessions
      .filter(s => s.status === 'Đã dạy' && chartSelectedMonths.includes(s.month_year))
      .reduce((sum, s) => sum + (Number(s.price) || 0), 0);
      
    const manualInc = manualTransactions
      .filter(t => t.type === 'income' && chartSelectedMonths.includes(t.date.substring(0, 7)))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
    return sbEarned + manualInc;
  }, [sessions, allSessions, manualTransactions, chartSelectedMonths, currentUser]);

  const getSelectedMonthsExpense = useCallback(() => {
    return manualTransactions
      .filter(t => t.type === 'expense' && chartSelectedMonths.includes(t.date.substring(0, 7)))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [manualTransactions, chartSelectedMonths]);

  // Weekly calculations for single-month line view
  const getWeeklyIncome = useCallback((monthStr: string, startDay: number, endDay: number) => {
    const targetSessions = currentUser?.role === 'admin' ? allSessions : sessions;
    const sbEarned = targetSessions
      .filter(s => {
        if (s.month_year !== monthStr || s.status !== 'Đã dạy') return false;
        const d = Number(s.date.split('-')[2]) || 1;
        return d >= startDay && d <= endDay;
      })
      .reduce((sum, s) => sum + (Number(s.price) || 0), 0);
      
    const manualInc = manualTransactions
      .filter(t => {
        if (t.type !== 'income' || !t.date.startsWith(monthStr)) return false;
        const d = Number(t.date.split('-')[2]) || 1;
        return d >= startDay && d <= endDay;
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
    return sbEarned + manualInc;
  }, [sessions, allSessions, manualTransactions, currentUser]);

  const getWeeklyExpense = useCallback((monthStr: string, startDay: number, endDay: number) => {
    return manualTransactions
      .filter(t => {
        if (t.type !== 'expense' || !t.date.startsWith(monthStr)) return false;
        const d = Number(t.date.split('-')[2]) || 1;
        return d >= startDay && d <= endDay;
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [manualTransactions]);

  const getMonthlyIncome = useCallback((monthStr: string) => {
    const targetSessions = currentUser?.role === 'admin' ? allSessions : sessions;
    const sbEarned = targetSessions
      .filter(s => s.month_year === monthStr && s.status === 'Đã dạy')
      .reduce((sum, s) => sum + (Number(s.price) || 0), 0);
      
    const manualInc = manualTransactions
      .filter(t => t.type === 'income' && t.date.startsWith(monthStr))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
    return sbEarned + manualInc;
  }, [sessions, allSessions, manualTransactions, currentUser]);

  const getMonthlyExpense = useCallback((monthStr: string) => {
    return manualTransactions
      .filter(t => t.type === 'expense' && t.date.startsWith(monthStr))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [manualTransactions]);

  // Actual total per category for selected months
  const getActualCategoryAmount = useCallback((cat: string) => {
    const isExp = ['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Khác'].includes(cat);
    if (isExp) {
      return manualTransactions
        .filter(t => t.type === 'expense' && t.category === cat && chartSelectedMonths.includes(t.date.substring(0, 7)))
        .reduce((sum, t) => sum + t.amount, 0);
    } else {
      const manualInc = manualTransactions
        .filter(t => t.type === 'income' && t.category === cat && chartSelectedMonths.includes(t.date.substring(0, 7)))
        .reduce((sum, t) => sum + t.amount, 0);
      
      let sbInc = 0;
      if (cat === 'Giáo dục') {
        const targetSessions = currentUser?.role === 'admin' ? allSessions : sessions;
        sbInc = targetSessions
          .filter(s => s.status === 'Đã dạy' && chartSelectedMonths.includes(s.month_year))
          .reduce((sum, s) => sum + (Number(s.price) || 0), 0);
      }
      return manualInc + sbInc;
    }
  }, [manualTransactions, sessions, allSessions, chartSelectedMonths, currentUser]);

  // Toggle multi-select months
  const toggleChartMonth = (mStr: string) => {
    setChartSelectedMonths(prev => {
      if (prev.includes(mStr)) {
        if (prev.length === 1) return prev; // Do not empty
        return prev.filter(m => m !== mStr);
      } else {
        return [...prev, mStr];
      }
    });
  };

  const handleDeleteManualTx = (id: string) => {
    if (!currentUser) return;
    const userId = currentUser.id;
    if (confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
      const updated = manualTransactions.filter(t => t.id !== id);
      saveTransactions(userId, updated);
    }
  };

  const handleOpenTxModal = (type: 'income' | 'expense' | 'saving') => {
    setModalTxType(type);
    setTxModalOpen(true);
  };

  const handleLogout = async () => {
    localStorage.removeItem('custom_teacher_session');
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Loading Screen Guard
  if (!currentUser || !selectedMonth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#090b10] gap-4">
        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-400 font-semibold text-sm">Đang tải cấu hình hệ thống...</span>
      </div>
    );
  }

  // MAIN LAYOUT RETURN
  return (
    <div className="min-h-screen transition-colors duration-300 ambient-bg-dark text-slate-100 relative overflow-hidden select-none flex">

      {/* Sidebar - Desktop view - Floating square with rounded corners */}
      <aside 
        onMouseEnter={() => {
          if (!isSidebarPinned) setSidebarCollapsed(false);
        }}
        onMouseLeave={() => {
          if (!isSidebarPinned) setSidebarCollapsed(true);
        }}
        className={`hidden lg:flex flex-col sidebar-glass-glow fixed left-4 top-4 bottom-4 z-50 p-5 rounded-2xl transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-[80px]' : 'w-[260px]'}`}
      >
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          currentUser={currentUser}
          handleLogout={handleLogout}
          handleOpenTxModal={handleOpenTxModal}
          onChangePassword={() => setPasswordModalOpen(true)}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
      </aside>

      {/* Mobile grid flow */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[112px]' : 'lg:pl-[292px]'}`}>
        
        {/* macOS Floating Toolbar - Mobile ONLY to eliminate empty header space on desktop */}
        <header className="lg:hidden h-16 border-b border-white/5 bg-[#0a0d16]/40 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40 shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger for mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 hover:bg-white/[0.05] rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-3 relative">
            {/* Quick Scheduler Manage (Admin only & Schedule view) */}
            {currentUser.role === 'admin' && activeTab === 'schedule' && (
              <button
                onClick={() => setTeachersModalOpen(true)}
                title="Quản lý danh sách giáo viên"
                className="flex items-center gap-2 px-3 py-1.5 bg-[#121624] border border-white/10 hover:border-indigo-500/40 text-indigo-350 text-xs font-bold rounded-xl shadow-md transition-all hover:scale-[1.01] cursor-pointer"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Quản lý</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic page content content scrolling */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardTab
              currentUser={currentUser}
              manualTransactions={manualTransactions}
              sessions={currentUser.role === 'admin' ? allSessions : sessions}
              emergencyCurrent={emergencyCurrent}
              accumulationCurrent={accumulationCurrent}
              categoryBudgets={categoryBudgets}
              chartSelectedMonths={chartSelectedMonths}
              toggleChartMonth={toggleChartMonth}
              chartYear={chartYear}
              setChartYear={setChartYear}
              getWeeklyIncome={getWeeklyIncome}
              getWeeklyExpense={getWeeklyExpense}
              getMonthlyIncome={getMonthlyIncome}
              getMonthlyExpense={getMonthlyExpense}
              getSelectedMonthsIncome={getSelectedMonthsIncome}
              getSelectedMonthsExpense={getSelectedMonthsExpense}
              getTotalIncome={getTotalIncome}
              getTotalExpense={getTotalExpense}
              getActualCategoryAmount={getActualCategoryAmount}
              handleOpenTxModal={handleOpenTxModal}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'flow' && (
            <FlowTab
              currentUser={currentUser}
              manualTransactions={manualTransactions}
              sessions={currentUser.role === 'admin' ? allSessions : sessions}
              categoryBudgets={categoryBudgets}
              chartSelectedMonths={chartSelectedMonths}
              getActualCategoryAmount={getActualCategoryAmount}
              handleDeleteManualTx={handleDeleteManualTx}
              handleOpenTxModal={handleOpenTxModal}
              saveBudgets={saveBudgets}
              saveTransactions={saveTransactions}
              toggleChartMonth={toggleChartMonth}
            />
          )}

          {activeTab === 'saving' && (
            <SavingTab
              currentUser={currentUser}
              emergencyCurrent={emergencyCurrent}
              emergencyTarget={emergencyTarget}
              accumulationCurrent={accumulationCurrent}
              accumulationTarget={accumulationTarget}
              savingsHistory={savingsHistory}
              saveEmergencyCurrent={saveEmergencyCurrent}
              saveEmergencyTarget={saveEmergencyTarget}
              saveAccumulationCurrent={saveAccumulationCurrent}
              saveAccumulationTarget={saveAccumulationTarget}
              saveSavingsHistory={saveSavingsHistory}
            />
          )}

          {activeTab === 'schedule' && (
            <ScheduleTab
              currentUser={currentUser}
              totalSessions={totalSessions}
              completedSessions={completedSessions}
              earnedIncome={earnedIncome}
              projectedIncome={projectedIncome}
              teachers={teachers}
              activeTeacherName={activeTeacherName}
              setActiveTeacherName={setActiveTeacherName}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              currentView={currentView}
              setCurrentView={setCurrentView}
              loading={loading}
              sessions={sessions}
              setAddModalOpen={setAddModalOpen}
              setSelectedSession={setSelectedSession}
              setEditModalOpen={setEditModalOpen}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              currentUser={currentUser}
              manualTransactions={manualTransactions}
              emergencyCurrent={emergencyCurrent}
              emergencyTarget={emergencyTarget}
              accumulationCurrent={accumulationCurrent}
              accumulationTarget={accumulationTarget}
              savingsHistory={savingsHistory}
              categoryBudgets={categoryBudgets}
              isSidebarPinned={isSidebarPinned}
              setIsSidebarPinned={handleSetSidebarPinned}
              saveTransactions={saveTransactions}
              saveEmergencyCurrent={saveEmergencyCurrent}
              saveEmergencyTarget={saveEmergencyTarget}
              saveAccumulationCurrent={saveAccumulationCurrent}
              saveAccumulationTarget={saveAccumulationTarget}
              saveSavingsHistory={saveSavingsHistory}
              saveBudgets={saveBudgets}
              setManualTransactions={setManualTransactions}
              setEmergencyCurrent={setEmergencyCurrent}
              setEmergencyTarget={setEmergencyTarget}
              setAccumulationCurrent={setAccumulationCurrent}
              setAccumulationTarget={setAccumulationTarget}
              setSavingsHistory={setSavingsHistory}
              setCategoryBudgets={setCategoryBudgets}
              setPasswordModalOpen={setPasswordModalOpen}
              handleLogout={handleLogout}
            />
          )}
        </main>
      </div>

      {/* Sidebar - Mobile drawer slide-in */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-[#090b10]/60 backdrop-blur-sm transition-opacity cursor-pointer"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col w-[260px] max-w-xs bg-[#0a0d16] border-r border-white/5 p-5 animate-slide-in h-full shadow-2xl">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
              currentUser={currentUser}
              handleLogout={handleLogout}
              handleOpenTxModal={handleOpenTxModal}
              isMobile={true}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        currentUser={currentUser}
        defaultType={modalTxType}
        emergencyCurrent={emergencyCurrent}
        accumulationCurrent={accumulationCurrent}
        manualTransactions={manualTransactions}
        savingsHistory={savingsHistory}
        saveTransactions={saveTransactions}
        saveEmergencyCurrent={saveEmergencyCurrent}
        saveAccumulationCurrent={saveAccumulationCurrent}
        saveSavingsHistory={saveSavingsHistory}
      />

      {/* Scheduler add modal */}
      {addModalOpen && (
        <AddSessionModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onSave={fetchSessions}
          activeTeacherName={activeTeacherName}
          selectedMonth={selectedMonth}
          existingSessions={sessions}
        />
      )}

      {/* Scheduler edit modal */}
      {editModalOpen && selectedSession && (
        <EditSessionModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedSession(null);
          }}
          onSave={fetchSessions}
          session={selectedSession}
          existingSessions={sessions}
        />
      )}

      {/* Scheduler teachers modal (Admin only) */}
      {teachersModalOpen && currentUser.role === 'admin' && (
        <ManageTeachersModal
          isOpen={teachersModalOpen}
          onClose={() => setTeachersModalOpen(false)}
          sessionToken={currentUser.token}
          currentAdminTeacherName={currentUser.teacherName}
          onTeacherUpdated={handleTeacherUpdated}
          activeTeacherName={activeTeacherName}
          teachers={teachers}
        />
      )}

      {/* Profile: Change password modal */}
      {passwordModalOpen && (
        <ChangePasswordModal
          isOpen={passwordModalOpen}
          onClose={() => setPasswordModalOpen(false)}
        />
      )}
    </div>
  );
}
