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
  TrendingDown,
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

const INCOME_CATEGORIES = ['Lương', 'Giáo dục', 'Đầu tư', 'Khác'];
const EXPENSE_CATEGORIES = ['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Khác'];

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Navigation states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'flow' | 'saving' | 'schedule' | 'settings'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Financial data states (removed mock dummy seed transactions)
  const [manualTransactions, setManualTransactions] = useState<any[]>([]);
  const [emergencyCurrent, setEmergencyCurrent] = useState<number>(0);
  const [emergencyTarget, setEmergencyTarget] = useState<number>(30000000);
  const [accumulationCurrent, setAccumulationCurrent] = useState<number>(0);
  const [accumulationTarget, setAccumulationTarget] = useState<number>(150000000);
  const [savingsHistory, setSavingsHistory] = useState<any[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>({});

  // Unified pop-up Transaction Modal toggle state
  const [txModalOpen, setTxModalOpen] = useState(false);

  // Unified modal input states
  const [modalTxType, setModalTxType] = useState<'income' | 'expense' | 'saving'>('expense');
  const [modalDesc, setModalDesc] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [modalCategory, setModalCategory] = useState('Ăn uống');
  const [modalDate, setModalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [modalSavingFund, setModalSavingFund] = useState<'emergency' | 'accumulation'>('emergency');
  const [modalSavingAction, setModalSavingAction] = useState<'deposit' | 'withdraw'>('deposit');

  // Multi-month selector states
  const [chartSelectedMonths, setChartSelectedMonths] = useState<string[]>([]);
  const [chartYear, setChartYear] = useState(() => new Date().getFullYear());

  // Search & Filter state for Transactions in Flow Tab
  const [txSearch, setTxSearch] = useState('');

  // Form states for Savings
  const [emActionAmount, setEmActionAmount] = useState('');
  const [acActionAmount, setAcActionAmount] = useState('');

  // Scheduler data states
  const [teachers, setTeachers] = useState<string[]>([]);
  const [activeTeacherName, setActiveTeacherName] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [currentView, setCurrentView] = useState<'month' | 'week'>('month');

  // Modal open states for Scheduler
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

  // Filtered values by selected months
  const getSelectedMonthsIncome = useCallback(() => {
    const sbEarned = sessions
      .filter(s => s.status === 'Đã dạy' && chartSelectedMonths.includes(s.month_year))
      .reduce((sum, s) => sum + (Number(s.price) || 0), 0);
      
    const manualInc = manualTransactions
      .filter(t => t.type === 'income' && chartSelectedMonths.includes(t.date.substring(0, 7)))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
    return sbEarned + manualInc;
  }, [sessions, manualTransactions, chartSelectedMonths]);

  const getSelectedMonthsExpense = useCallback(() => {
    return manualTransactions
      .filter(t => t.type === 'expense' && chartSelectedMonths.includes(t.date.substring(0, 7)))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [manualTransactions, chartSelectedMonths]);

  // Weekly calculations for single-month line view
  const getWeeklyIncome = useCallback((monthStr: string, startDay: number, endDay: number) => {
    const sbEarned = sessions
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
  }, [sessions, manualTransactions]);

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
    const sbEarned = sessions
      .filter(s => s.month_year === monthStr && s.status === 'Đã dạy')
      .reduce((sum, s) => sum + (Number(s.price) || 0), 0);
      
    const manualInc = manualTransactions
      .filter(t => t.type === 'income' && t.date.startsWith(monthStr))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
    return sbEarned + manualInc;
  }, [sessions, manualTransactions]);

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
        sbInc = sessions
          .filter(s => s.status === 'Đã dạy' && chartSelectedMonths.includes(s.month_year))
          .reduce((sum, s) => sum + (Number(s.price) || 0), 0);
      }
      return manualInc + sbInc;
    }
  }, [manualTransactions, sessions, chartSelectedMonths]);

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

  // Budget prompt handler
  const handleEditBudgetPrompt = (cat: string) => {
    if (!currentUser) return;
    const currentBudgetVal = categoryBudgets[cat] || 0;
    const input = prompt(`Nhập hạn mức ngân sách hàng tháng mới cho danh mục "${cat}":`, String(currentBudgetVal));
    if (input === null) return;
    const num = Number(input);
    if (isNaN(num) || num < 0) {
      alert('Vui lòng nhập số tiền hợp lệ.');
      return;
    }
    const updated = {
      ...categoryBudgets,
      [cat]: num
    };
    saveBudgets(currentUser.id, updated);
  };

  // Transaction Lists for Flow Tab (Separated & Sorted)
  const getIncomeTransactions = useCallback(() => {
    const manual = manualTransactions
      .filter(t => t.type === 'income')
      .map(t => ({
        id: t.id,
        desc: t.desc,
        amount: Number(t.amount) || 0,
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
        category: 'Giáo dục',
        date: s.date,
        isManual: false
      }));

    return [...manual, ...auto]
      .filter(t => chartSelectedMonths.includes(t.date.substring(0, 7)))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [manualTransactions, sessions, chartSelectedMonths]);

  const getExpenseTransactions = useCallback(() => {
    return manualTransactions
      .filter(t => t.type === 'expense' && chartSelectedMonths.includes(t.date.substring(0, 7)))
      .map(t => ({
        id: t.id,
        desc: t.desc,
        amount: Number(t.amount) || 0,
        category: t.category,
        date: t.date,
        isManual: true
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [manualTransactions, chartSelectedMonths]);

  // Unified Save logic for Pop-up Modal
  const handleSaveModalTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const userId = currentUser.id;
    const amt = Number(modalAmount);

    if (!amt || amt <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ lớn hơn 0.');
      return;
    }

    if (modalTxType === 'saving') {
      let currentVal = modalSavingFund === 'emergency' ? emergencyCurrent : accumulationCurrent;
      let newVal = currentVal;
      
      if (modalSavingAction === 'deposit') {
        newVal += amt;
      } else {
        if (amt > currentVal) {
          alert('Số dư quỹ hiện hành không đủ để thực hiện rút tiền.');
          return;
        }
        newVal -= amt;
      }

      if (modalSavingFund === 'emergency') {
        saveEmergencyCurrent(userId, newVal);
      } else {
        saveAccumulationCurrent(userId, newVal);
      }

      // Add to savings history logs
      const newHist = {
        id: `sh-${Date.now()}`,
        fund: modalSavingFund,
        type: modalSavingAction,
        amount: amt,
        date: modalDate
      };
      saveSavingsHistory(userId, [newHist, ...savingsHistory]);
      alert('Đã cập nhật giao dịch quỹ tiết kiệm thành công!');
    } else {
      if (!modalDesc.trim()) {
        alert('Vui lòng điền mô tả giao dịch.');
        return;
      }
      const newTx = {
        id: `tx-${Date.now()}`,
        desc: modalDesc.trim(),
        amount: amt,
        type: modalTxType,
        category: modalCategory,
        date: modalDate
      };
      saveTransactions(userId, [newTx, ...manualTransactions]);
      alert('Đã lưu giao dịch tài chính mới!');
    }

    // Clear inputs and close window
    setModalDesc('');
    setModalAmount('');
    setTxModalOpen(false);
  };

  const handleSavingAction = (fund: 'emergency' | 'accumulation', action: 'deposit' | 'withdraw') => {
    if (!currentUser) return;
    const userId = currentUser.id;
    const amountStr = fund === 'emergency' ? emActionAmount : acActionAmount;
    const amt = Number(amountStr);

    if (!amt || amt <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ lớn hơn 0.');
      return;
    }

    let currentVal = fund === 'emergency' ? emergencyCurrent : accumulationCurrent;
    let newVal = currentVal;
    
    if (action === 'deposit') {
      newVal += amt;
    } else {
      if (amt > currentVal) {
        alert('Số dư quỹ hiện tại không đủ để thực hiện rút tiền.');
        return;
      }
      newVal -= amt;
    }

    if (fund === 'emergency') {
      saveEmergencyCurrent(userId, newVal);
      setEmActionAmount('');
    } else {
      saveAccumulationCurrent(userId, newVal);
      setAcActionAmount('');
    }

    const newHist = {
      id: `sh-${Date.now()}`,
      fund,
      type: action,
      amount: amt,
      date: new Date().toISOString().split('T')[0]
    };
    saveSavingsHistory(userId, [newHist, ...savingsHistory]);
    alert('Đã cập nhật quỹ tiết kiệm thành công!');
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
    setModalCategory(type === 'income' ? 'Lương' : 'Ăn uống');
    setModalDesc('');
    setModalAmount('');
    setTxModalOpen(true);
  };

  // Helper for line chart drawing
  const getLineData = () => {
    if (chartSelectedMonths.length === 0) return [];
    
    if (chartSelectedMonths.length === 1) {
      const targetMonth = chartSelectedMonths[0];
      return [
        { label: 'Tuần 1', income: getWeeklyIncome(targetMonth, 1, 7), expense: getWeeklyExpense(targetMonth, 1, 7) },
        { label: 'Tuần 2', income: getWeeklyIncome(targetMonth, 8, 14), expense: getWeeklyExpense(targetMonth, 8, 14) },
        { label: 'Tuần 3', income: getWeeklyIncome(targetMonth, 15, 21), expense: getWeeklyExpense(targetMonth, 15, 21) },
        { label: 'Tuần 4', income: getWeeklyIncome(targetMonth, 22, 31), expense: getWeeklyExpense(targetMonth, 22, 31) }
      ];
    }

    // Sort chronologically
    const sorted = [...chartSelectedMonths].sort((a, b) => a.localeCompare(b));
    return sorted.map(m => {
      const [y, mn] = m.split('-');
      return {
        label: `Th.${Number(mn)}/${y.substring(2)}`,
        income: getMonthlyIncome(m),
        expense: getMonthlyExpense(m),
        rawMonth: m
      };
    });
  };

  const handleLogout = async () => {
    localStorage.removeItem('custom_teacher_session');
    await supabase.auth.signOut();
    router.push('/login');
  };

  // SUB-RENDER: Sidebar navigation
  const renderSidebarContent = (isMobile = false) => {
    if (!currentUser) return null;
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
        <div className="flex items-center gap-3 px-2 py-4 mb-4 border-b border-white/5">
          <div className="h-10 w-10 bg-indigo-500/15 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(92,54,245,0.25)] shrink-0">
            <Wallet className="h-5.5 w-5.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-wide text-white uppercase leading-none">Finance</span>
            <span className="font-extrabold text-[9px] tracking-widest text-indigo-400 uppercase">Dashboard</span>
          </div>
        </div>

        {/* Global Pop-up input button in sidebar */}
        <button
          onClick={() => handleOpenTxModal('expense')}
          className="mb-6 w-full flex items-center justify-center gap-2 py-3 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-xs rounded-xl shadow-[0_4px_12px_rgba(92,54,245,0.3)] hover:scale-[1.01] transition-all cursor-pointer border border-white/10 select-none shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm giao dịch</span>
        </button>

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

        {/* Profile info footer */}
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
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-rose-450 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer text-left"
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
    if (!currentUser) return null;
    const income = getSelectedMonthsIncome();
    const expense = getSelectedMonthsExpense();
    const net = income - expense;

    // Net worth cumulative calculation
    const totalIncomeAll = getTotalIncome();
    const totalExpenseAll = getTotalExpense();
    const walletCash = totalIncomeAll - totalExpenseAll;
    const savings = emergencyCurrent + accumulationCurrent;
    const netWorth = walletCash + savings;

    // Curvy path calculations
    const lineData = getLineData();
    const maxVal = Math.max(1000000, ...lineData.flatMap(d => [d.income, d.expense]));
    const N = lineData.length;

    const incomePts = lineData.map((d, idx) => {
      const x = N > 1 ? 85 + idx * (500 / (N - 1)) : 85;
      const y = 150 - (d.income / maxVal) * 120;
      return { x, y };
    });

    const expensePts = lineData.map((d, idx) => {
      const x = N > 1 ? 85 + idx * (500 / (N - 1)) : 85;
      const y = 150 - (d.expense / maxVal) * 120;
      return { x, y };
    });

    const getCurvyPath = (pts: { x: number, y: number }[]) => {
      if (pts.length === 0) return '';
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const dx = p1.x - p0.x;
        d += ` C ${p0.x + dx / 2} ${p0.y}, ${p0.x + dx / 2} ${p1.y}, ${p1.x} ${p1.y}`;
      }
      return d;
    };

    const getAreaPath = (pts: { x: number, y: number }[]) => {
      const linePath = getCurvyPath(pts);
      if (!linePath) return '';
      return `${linePath} L ${pts[pts.length - 1].x} 150 L ${pts[0].x} 150 Z`;
    };

    // Donut Chart Expense Circle segment variables
    const categoriesList = ['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Khác'];
    const expenseTotals = categoriesList.map(cat => ({
      name: cat,
      value: getActualCategoryAmount(cat)
    }));

    const totalSelectedExp = getSelectedMonthsExpense();
    const C = 314.16; // 2 * pi * r (r=50)
    let accumulatedDash = 0;

    const colorsMap: Record<string, string> = {
      'Ăn uống': '#f59e0b',
      'Di chuyển': '#3b82f6',
      'Shopping': '#ec4899',
      'Hóa đơn': '#a855f7',
      'Giải trí': '#f43f5e',
      'Khác': '#64748b'
    };

    const slices = expenseTotals
      .filter(e => e.value > 0)
      .map(e => {
        const pct = (e.value / totalSelectedExp) * 100;
        const len = (e.value / totalSelectedExp) * C;
        const offset = accumulatedDash;
        accumulatedDash += len;
        return {
          name: e.name,
          value: e.value,
          pct: Math.round(pct),
          color: colorsMap[e.name] || '#64748b',
          dashArray: `${len} ${C}`,
          dashOffset: -offset
        };
      });

    // Budget vs Actual tracker variables
    const M = chartSelectedMonths.length;
    const totalExpBudget = Object.keys(categoryBudgets)
      .filter(c => ['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Khác'].includes(c))
      .reduce((sum, c) => sum + (categoryBudgets[c] || 0), 0) * M;

    const budgetPercent = totalExpBudget > 0 ? Math.min(100, Math.round((expense / totalExpBudget) * 100)) : 0;
    const isOverBudget = expense > totalExpBudget;

    return (
      <div className="space-y-6 animate-mac-dropdown">
        
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-left relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-extrabold tracking-wider uppercase shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tổng quan tài chính</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Xin chào, <span className="bg-gradient-to-r from-white via-indigo-150 to-purple-400 bg-clip-text text-transparent">{currentUser.teacherName}</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-semibold pt-0.5">
              Quản lý hạn mức chi tiêu, danh mục tích lũy và thu nhập giảng dạy.
            </p>
          </div>

          <button
            onClick={() => handleOpenTxModal('expense')}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl shadow-[0_4px_12px_rgba(92,54,245,0.35)] hover:scale-[1.02] transition-all cursor-pointer border border-white/20 select-none shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm giao dịch mới</span>
          </button>
        </div>

        {/* 4 Cards (Net Worth, Thu nhập, Chi tiêu, Net) */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 text-left">
          {/* Card 1: Cumulative Net Worth */}
          <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Tổng tài sản</span>
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-sm shrink-0">
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

          {/* Card 2: Selected month(s) Incomes */}
          <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Thu nhập</span>
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-lg sm:text-2xl font-black text-white tracking-tight leading-none block truncate" title={formatVND(income)}>
                {formatVND(income)}
              </span>
            </div>
            <div className="mt-2 flex">
              <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md">
                Tháng đã chọn
              </span>
            </div>
          </div>

          {/* Card 3: Selected month(s) Expenses */}
          <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Chi tiêu</span>
              <div className="p-2 rounded-xl bg-rose-500/15 text-rose-455 border border-rose-500/30 shadow-sm shrink-0">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-lg sm:text-2xl font-black text-white tracking-tight leading-none block truncate" title={formatVND(expense)}>
                {formatVND(expense)}
              </span>
            </div>
            <div className="mt-2 flex">
              <span className="text-[10px] font-extrabold text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-md">
                Tháng đã chọn
              </span>
            </div>
          </div>

          {/* Card 4: Net income-expense */}
          <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Net (Thu - Chi)</span>
              <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm shrink-0">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-lg sm:text-2xl font-black tracking-tight leading-none block truncate ${net >= 0 ? 'text-white' : 'text-rose-455'}`} title={formatVND(net)}>
                {formatVND(net)}
              </span>
            </div>
            <div className="mt-2 flex">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${net >= 0 ? 'text-cyan-400 bg-cyan-500/15' : 'text-rose-400 bg-rose-500/15'}`}>
                Thặng dư ròng
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Month Selector filter */}
        <div className="calendar-container-depth p-4 bg-[#141824] text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 select-none">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-black uppercase text-white tracking-wider">Bộ lọc xem biểu đồ (Chọn nhiều tháng)</span>
            </div>

            {/* Year selector switch */}
            <div className="flex items-center gap-2 border border-white/10 rounded-xl p-1 bg-[#0d1018]">
              <button onClick={() => setChartYear(y=>y-1)} className="p-1 rounded-lg hover:bg-white/[0.05] text-slate-400 hover:text-white transition-colors cursor-pointer"><ChevronLeft className="h-3 w-3"/></button>
              <span className="text-xs font-extrabold px-1 text-white">{chartYear}</span>
              <button onClick={() => setChartYear(y=>y+1)} className="p-1 rounded-lg hover:bg-white/[0.05] text-slate-400 hover:text-white transition-colors cursor-pointer"><ChevronRight className="h-3 w-3"/></button>
            </div>
          </div>

          {/* 12 months buttons grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const mStr = `${chartYear}-${String(m).padStart(2, '0')}`;
              const isSelected = chartSelectedMonths.includes(mStr);
              return (
                <button
                  key={m}
                  onClick={() => toggleChartMonth(mStr)}
                  className={`py-2 rounded-xl text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-500 text-white shadow-[0_0_12px_rgba(92,54,245,0.45)] border border-indigo-500/20'
                      : 'bg-[#0d1018] text-slate-450 hover:bg-white/[0.05] hover:text-white border border-white/5'
                  }`}
                >
                  T.{m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main analytical displays */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Curvy line graph display */}
          <div className="xl:col-span-2 calendar-container-depth p-5 text-left bg-[#141824] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-5 select-none">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(92,54,245,0.7)]"></div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Xu hướng thu nhập & chi tiêu</h3>
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

            {/* SVG Curvy Line chart */}
            <div className="w-full overflow-x-auto scrollbar-thin">
              {chartSelectedMonths.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-xs text-slate-500 font-bold">
                  Vui lòng chọn ít nhất một tháng từ bộ lọc ở trên.
                </div>
              ) : (
                <svg className="w-full min-w-[500px] h-[200px]" viewBox="0 0 600 200">
                  <defs>
                    <linearGradient id="incomeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="expenseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal dotted lines */}
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

                  {/* Y-axis values */}
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

                  {/* Curvy line paths */}
                  {incomePts.length > 0 && (
                    <>
                      {/* Income area fill */}
                      <path d={getAreaPath(incomePts)} fill="url(#incomeAreaGrad)" className="pointer-events-none" />
                      {/* Expense area fill */}
                      <path d={getAreaPath(expensePts)} fill="url(#expenseAreaGrad)" className="pointer-events-none" />

                      {/* Income line */}
                      <path
                        d={getCurvyPath(incomePts)}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className="drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]"
                      />

                      {/* Expense line */}
                      <path
                        d={getCurvyPath(expensePts)}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className="drop-shadow-[0_0_6px_rgba(239,68,68,0.3)]"
                      />

                      {/* Points circles highlight */}
                      {incomePts.map((pt, idx) => (
                        <g key={idx} className="group/dot">
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="4"
                            fill="#10b981"
                            stroke="#141824"
                            strokeWidth="1.5"
                            className="transition-all duration-200 hover:scale-150 cursor-pointer"
                          />
                          <circle
                            cx={expensePts[idx].x}
                            cy={expensePts[idx].y}
                            r="4"
                            fill="#ef4444"
                            stroke="#141824"
                            strokeWidth="1.5"
                            className="transition-all duration-200 hover:scale-150 cursor-pointer"
                          />
                        </g>
                      ))}
                    </>
                  )}

                  {/* Labels */}
                  {lineData.map((d, idx) => {
                    const x = N > 1 ? 85 + idx * (500 / (N - 1)) : 85;
                    return (
                      <text
                        key={idx}
                        x={x}
                        y="168"
                        fill="#94a3b8"
                        fontSize="9"
                        fontWeight="800"
                        textAnchor="middle"
                      >
                        {d.label}
                      </text>
                    );
                  })}

                  <line x1="65" y1="145" x2="575" y2="145" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
                </svg>
              )}
            </div>
          </div>

          {/* Right side: Category Donut & Budget vs Actual progress */}
          <div className="space-y-6 text-left">
            
            {/* Donut chart for expense distribution */}
            <div className="calendar-container-depth p-5 bg-[#141824] space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(92,54,245,0.7)]"></div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Phân bổ chi tiêu</h3>
              </div>

              {totalSelectedExp === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-bold">
                  Không có chi tiêu phát sinh trong tháng đã chọn.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* SVG Donut */}
                  <div className="relative shrink-0 w-28 h-28">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                      {/* Base circle background */}
                      <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                      
                      {slices.map((s, idx) => (
                        <circle
                          key={idx}
                          cx="60"
                          cy="60"
                          r="50"
                          fill="transparent"
                          stroke={s.color}
                          strokeWidth="12"
                          strokeDasharray={s.dashArray}
                          strokeDashoffset={s.dashOffset}
                          strokeLinecap={slices.length > 1 ? 'butt' : 'round'}
                          className="transition-all duration-300"
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[9px] font-extrabold text-slate-450 uppercase leading-none">Chi tiêu</span>
                      <span className="text-xs font-black text-white leading-none mt-1 truncate max-w-[80px]" title={formatVND(totalSelectedExp)}>
                        {totalSelectedExp >= 1000000 ? `${(totalSelectedExp / 1000000).toFixed(1)}M` : formatVND(totalSelectedExp)}
                      </span>
                    </div>
                  </div>

                  {/* Legend list */}
                  <div className="flex-1 space-y-1.5 w-full">
                    {slices.slice(0, 4).map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[10px] font-bold">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="text-slate-350 truncate">{s.name}</span>
                        </div>
                        <span className="text-white font-black shrink-0">{s.pct}%</span>
                      </div>
                    ))}
                    {slices.length > 4 && (
                      <div className="text-[9px] font-black text-slate-500 text-right">
                        + {slices.length - 4} danh mục khác
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Budget vs Actual progress overview */}
            <div className="calendar-container-depth p-5 bg-[#141824] space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(92,54,245,0.7)]"></div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Hạn mức ngân sách tổng hợp</h3>
              </div>

              <div className="bg-[#181d2e] border border-white/5 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-xs font-bold items-center">
                  <span className="text-slate-350">Tổng ngân sách chi</span>
                  <span className={isOverBudget ? 'text-rose-455 font-black animate-pulse' : 'text-emerald-400'}>
                    {budgetPercent}% {isOverBudget && '(Vượt hạn mức!)'}
                  </span>
                </div>
                <div className="h-2 bg-[#101420] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${isOverBudget ? 'bg-gradient-to-r from-red-500 to-rose-500' : 'bg-gradient-to-r from-indigo-500 to-cyan-500'}`}
                    style={{ width: `${budgetPercent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] font-extrabold text-slate-550">
                  <span>Đã chi: {formatVND(expense)}</span>
                  <span>Ngân sách: {formatVND(totalExpBudget)}</span>
                </div>
              </div>
            </div>

            {/* Savings Widget */}
            <div className="calendar-container-depth p-5 space-y-4 bg-[#141824]">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(92,54,245,0.7)]"></div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Tiến độ tích lũy tiết kiệm</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[10px] font-extrabold text-slate-550">
                <div className="bg-[#181d2e] border border-white/5 p-3.5 rounded-2xl space-y-1">
                  <span className="text-slate-450 block truncate">Quỹ Dự Phòng</span>
                  <span className="text-sm font-black text-white block truncate">{formatVND(emergencyCurrent)}</span>
                </div>
                <div className="bg-[#181d2e] border border-white/5 p-3.5 rounded-2xl space-y-1">
                  <span className="text-slate-450 block truncate">Quỹ Tích Lũy</span>
                  <span className="text-sm font-black text-white block truncate">{formatVND(accumulationCurrent)}</span>
                </div>
              </div>
              <button onClick={() => setActiveTab('saving')} className="w-full py-2 bg-[#0d1018] hover:bg-white/[0.04] border border-white/10 text-indigo-350 font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer text-center">
                Xem chi tiết tiết kiệm
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  };

  // SUB-RENDER: Cash Flow Tab (Flow layout split)
  const renderFlow = () => {
    if (!currentUser) return null;
    const incomes = getIncomeTransactions();
    const expenses = getExpenseTransactions();

    // Actual categoric budgets compared
    const incomeCats = ['Lương', 'Giáo dục', 'Đầu tư', 'Khác'];
    const expenseCats = ['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Khác'];

    return (
      <div className="space-y-6 animate-mac-dropdown text-left">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-white tracking-tight">Sổ Nhật Ký Dòng Chảy</h2>
            <p className="text-slate-400 text-xs font-semibold">Liệt kê tất cả các khoản chi tiêu và nguồn thu nhập thực tế trong bộ lọc tháng.</p>
          </div>
          
          <button
            onClick={() => handleOpenTxModal('expense')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm giao dịch mới</span>
          </button>
        </div>

        {/* Categories Budget tracker block */}
        <div className="calendar-container-depth p-5 bg-[#141824] space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(92,54,245,0.7)]"></div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Hạn mức ngân sách & thực tế theo danh mục (Hàng tháng)</h3>
            </div>
            <span className="text-[9px] text-slate-500 font-extrabold block">Double-click hoặc click icon cây bút để tùy chỉnh hạn mức.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...incomeCats, ...expenseCats].map(cat => {
              const actual = getActualCategoryAmount(cat);
              const budgetVal = categoryBudgets[cat] || 0;
              const pct = budgetVal > 0 ? Math.min(100, Math.round((actual / budgetVal) * 100)) : 0;
              const isExpense = expenseCats.includes(cat);
              const isOver = isExpense && actual > budgetVal;

              return (
                <div key={cat} className="bg-[#181d2e]/60 border border-white/5 rounded-2xl p-4 space-y-2 relative group">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-350">{cat}</span>
                    <button
                      onClick={() => handleEditBudgetPrompt(cat)}
                      className="p-1 hover:bg-white/[0.05] rounded text-slate-400 hover:text-indigo-400 transition-colors"
                      title="Sửa hạn mức"
                    >
                      <Settings className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex justify-between text-[11px] font-black text-white">
                    <span>{formatVND(actual)}</span>
                    <span className="text-slate-500">Hạn mức: {formatVND(budgetVal)}</span>
                  </div>

                  {/* Progress bar line */}
                  <div className="h-1.5 bg-[#101420] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isExpense 
                          ? (isOver ? 'bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]' : 'bg-indigo-500') 
                          : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                      }`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-extrabold text-slate-500">
                    <span>{isExpense ? 'Đã chi tiêu' : 'Đã thu nhập'}</span>
                    <span className={isOver ? 'text-rose-455' : ''}>{pct}% {isOver && '(Vượt ngân sách!)'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Separated lists stacked/side-by-side */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Income block */}
          <div className="calendar-container-depth p-5 bg-[#141824] space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-450 border border-emerald-500/25 rounded-lg">
                <ArrowUpRight className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Danh Sách Thu Nhập</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-bold text-slate-350">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                    <th className="py-2.5 text-left font-black">Tên thu nhập</th>
                    <th className="py-2.5 text-left font-black">Loại hình</th>
                    <th className="py-2.5 text-right font-black">Số tiền</th>
                    <th className="py-2.5 text-center font-black w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {incomes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-500 font-bold">Chưa ghi nhận nguồn thu nào.</td>
                    </tr>
                  ) : (
                    incomes.map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-3 text-left">
                          <p className="text-white font-bold">{t.desc}</p>
                          <span className="text-[8.5px] font-extrabold text-slate-550 block mt-0.5">{t.date}</span>
                        </td>
                        <td className="py-3 text-left">
                          <span className="px-1.5 py-0.5 bg-[#0d1018] rounded text-[9px] border border-white/5">{t.category}</span>
                        </td>
                        <td className="py-3 text-right text-emerald-400 font-black">+{formatVND(t.amount)}</td>
                        <td className="py-3 text-center">
                          {t.isManual && (
                            <button
                              onClick={() => handleDeleteManualTx(t.id)}
                              className="p-1 hover:bg-rose-500/10 text-slate-500 hover:text-rose-455 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                              title="Xóa giao dịch"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expense block */}
          <div className="calendar-container-depth p-5 bg-[#141824] space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
              <div className="p-1.5 bg-rose-500/10 text-rose-450 border border-rose-500/25 rounded-lg">
                <ArrowDownRight className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Danh Sách Chi Tiêu</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-bold text-slate-350">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                    <th className="py-2.5 text-left font-black">Tên chi tiêu</th>
                    <th className="py-2.5 text-left font-black">Loại hình</th>
                    <th className="py-2.5 text-right font-black">Số tiền</th>
                    <th className="py-2.5 text-center font-black w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-500 font-bold">Chưa phát sinh giao dịch chi tiêu.</td>
                    </tr>
                  ) : (
                    expenses.map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-3 text-left">
                          <p className="text-white font-bold">{t.desc}</p>
                          <span className="text-[8.5px] font-extrabold text-slate-550 block mt-0.5">{t.date}</span>
                        </td>
                        <td className="py-3 text-left">
                          <span className="px-1.5 py-0.5 bg-[#0d1018] rounded text-[9px] border border-white/5">{t.category}</span>
                        </td>
                        <td className="py-3 text-right text-rose-455 font-black">-{formatVND(t.amount)}</td>
                        <td className="py-3 text-center">
                          {t.isManual && (
                            <button
                              onClick={() => handleDeleteManualTx(t.id)}
                              className="p-1 hover:bg-rose-500/10 text-slate-500 hover:text-rose-455 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                              title="Xóa giao dịch"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    );
  };

  // SUB-RENDER: Savings Tab
  const renderSaving = () => {
    if (!currentUser) return null;
    const emPercent = Math.min(100, Math.round((emergencyCurrent / Math.max(1, emergencyTarget)) * 100));
    const acPercent = Math.min(100, Math.round((accumulationCurrent / Math.max(1, accumulationTarget)) * 100));

    return (
      <div className="space-y-6 animate-mac-dropdown text-left">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-white tracking-tight">Kế Hoạch Tiết Kiệm</h2>
          <p className="text-slate-400 text-xs font-semibold">Bảo vệ nguồn tài sản dự trữ và tích lũy thông minh dài hạn.</p>
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
                    <p className="text-[10px] text-slate-450 font-medium leading-none mt-0.5">Dành cho tình huống khẩn cấp bất ngờ.</p>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 rounded-md">
                  Đạt {emPercent}%
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-slate-550 uppercase">Số dư hiện tại</span>
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
                    <p className="text-[10px] text-slate-455 font-medium leading-none mt-0.5">Dành cho mục tiêu lớn đầu tư dài hạn.</p>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 rounded-md">
                  Đạt {acPercent}%
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-slate-550 uppercase">Số dư hiện tại</span>
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
                      <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border shrink-0 ${isDep ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-450 border-rose-500/20'}`}>
                        {isDep ? 'Nạp quỹ' : 'Rút quỹ'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white leading-snug">
                          {h.fund === 'emergency' ? 'Quỹ Dự Phòng' : 'Quỹ Tích Lũy'}
                        </p>
                        <span className="text-[9px] font-black text-slate-500 uppercase">{h.date}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-black shrink-0 ${isDep ? 'text-emerald-400' : 'text-rose-450'}`}>
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
    if (!currentUser) return null;
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
                  ↑ {Math.round((completedSessions / totalSessions) * 100)}%
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
    if (!currentUser) return null;
    const getBackupJSON = () => {
      const data = {
        transactions: manualTransactions,
        emergency: { current: emergencyCurrent, target: emergencyTarget },
        accumulation: { current: accumulationCurrent, target: accumulationTarget },
        history: savingsHistory,
        budgets: categoryBudgets
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
        if (parsed.budgets) saveBudgets(userId, parsed.budgets);
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
        localStorage.removeItem(`finance_budgets_${userId}`);

        setManualTransactions([]);
        setEmergencyCurrent(0);
        setEmergencyTarget(30000000);
        setAccumulationCurrent(0);
        setAccumulationTarget(150000000);
        setSavingsHistory([]);
        setCategoryBudgets({
          'Lương': 15000000,
          'Giáo dục': 10000000,
          'Đầu tư': 5000000,
          'Khác': 1000000,
          'Ăn uống': 4000000,
          'Di chuyển': 1500000,
          'Shopping': 3000000,
          'Hóa đơn': 3000000,
          'Giải trí': 2000000
        });
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
                className="flex-1 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-355 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
              >
                Đổi mật khẩu
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-450 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
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
              Thực hiện xóa toàn bộ dữ liệu tài chính (giao dịch thủ công và số dư các quỹ tiết kiệm hiện có) được ghi nhớ trong trình duyệt. Thông tin về lịch dạy trên Supabase sẽ không bị ảnh hưởng.
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
      {/* Vignette Overlay */}
      <div className="vignette-overlay" />

      {/* Sidebar - Desktop view */}
      <aside className="hidden lg:flex flex-col w-[260px] shrink-0 border-r border-white/5 bg-[#0a0d16]/90 backdrop-blur-md h-screen sticky top-0 z-50 p-5">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile grid flow */}
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

      {/* UNIFIED POP-UP TRANSACTION MODAL */}
      {txModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop blur */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md animate-mac-backdrop"
            onClick={() => setTxModalOpen(false)}
          />

          {/* Modal box */}
          <div className="bg-[#0e111a] border border-white/10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative z-10 animate-mac-modal flex flex-col p-6 text-left">
            <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  {modalTxType === 'income' ? 'Thêm Khoản Thu Nhập' : modalTxType === 'expense' ? 'Thêm Khoản Chi Tiêu' : 'Cập Nhật Quỹ Tiết Kiệm'}
                </h3>
              </div>
              <button
                onClick={() => setTxModalOpen(false)}
                className="p-1.5 hover:bg-white/[0.05] rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalTx} className="space-y-4 text-left">
              {/* Type Switcher */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Loại giao dịch</label>
                <div className="flex bg-[#0d1018] p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => { setModalTxType('expense'); setModalCategory('Ăn uống'); }}
                    className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                      modalTxType === 'expense'
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'text-slate-450 hover:text-slate-200'
                    }`}
                  >
                    CHI TIÊU
                  </button>
                  <button
                    type="button"
                    onClick={() => { setModalTxType('income'); setModalCategory('Lương'); }}
                    className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                      modalTxType === 'income'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-slate-455 hover:text-slate-200'
                    }`}
                  >
                    THU NHẬP
                  </button>
                  <button
                    type="button"
                    onClick={() => { setModalTxType('saving'); }}
                    className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                      modalTxType === 'saving'
                        ? 'bg-indigo-500 text-white shadow-md'
                        : 'text-slate-455 hover:text-slate-200'
                    }`}
                  >
                    TIẾT KIỆM
                  </button>
                </div>
              </div>

              {/* Conditional Inputs */}
              {modalTxType === 'saving' ? (
                <>
                  {/* Saving target selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Chọn quỹ</label>
                      <div className="relative">
                        <select
                          value={modalSavingFund}
                          onChange={(e) => setModalSavingFund(e.target.value as any)}
                          className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer block"
                        >
                          <option value="emergency">Quỹ Dự Phòng</option>
                          <option value="accumulation">Quỹ Tích Lũy</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Hành động</label>
                      <div className="relative">
                        <select
                          value={modalSavingAction}
                          onChange={(e) => setModalSavingAction(e.target.value as any)}
                          className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer block"
                        >
                          <option value="deposit">Nạp tiền (+)</option>
                          <option value="withdraw">Rút tiền (-)</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Mô tả giao dịch</label>
                    <input
                      type="text"
                      placeholder="VD: Đi siêu thị Big C, Thưởng lương..."
                      value={modalDesc}
                      onChange={(e) => setModalDesc(e.target.value)}
                      className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Danh mục</label>
                    <div className="relative">
                      <select
                        value={modalCategory}
                        onChange={(e) => setModalCategory(e.target.value)}
                        className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer block"
                      >
                        {(modalTxType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                          <option key={c} value={c} className="bg-[#0d1018] text-white">
                            {c}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </>
              )}

              {/* Amount & Date (Shared fields) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Số tiền (VND)</label>
                  <input
                    type="number"
                    placeholder="VD: 500000"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                    className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Ngày ghi nhận</label>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    required
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-xs rounded-xl shadow-[0_4px_12px_rgba(92,54,245,0.3)] transition-all hover:scale-[1.02] cursor-pointer mt-4"
              >
                Lưu Giao Dịch
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
