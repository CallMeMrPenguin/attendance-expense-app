'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Users, Key, LogOut, X, ChevronDown, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Session, formatCleanTimeString, getDatesForWeekday } from '@/lib/utils';

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
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/context/ToastContext';

interface UserProfile {
  id: string;
  username: string;
  teacherName: string;
  role: 'admin' | 'teacher' | 'user';
  token: string;
}

const cleanString = (str: string): string => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim();
};

const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  'Lương': 'Briefcase',
  'Giáo dục': 'GraduationCap',
  'Đầu tư': 'TrendingUp',
  'Gia Sư': 'GraduationCap',
  'Ăn uống': 'Utensils',
  'Di chuyển': 'Car',
  'Shopping': 'ShoppingBag',
  'Hóa đơn': 'Receipt',
  'Giải trí': 'Film',
  'Xăng': 'Car',
  'Đi Chợ': 'ShoppingBag',
  'Khác': 'Coins'
};

const DEFAULT_CATEGORY_NOTES: Record<string, string> = {
  'Lương': 'Thu nhập cố định hàng tháng',
  'Giáo dục': 'Giảng dạy, chấm công',
  'Đầu tư': 'Cổ tức, lợi nhuận',
  'Gia Sư': 'Học phí gia sư',
  'Ăn uống': 'Nhà hàng, siêu thị, thực phẩm',
  'Di chuyển': 'Xe máy, taxi, xăng xe',
  'Shopping': 'Quần áo, đồ dùng cá nhân',
  'Hóa đơn': 'Điện, nước, internet',
  'Giải trí': 'Xem phim, du lịch, giải trí',
  'Xăng': 'Nhiên liệu đi lại',
  'Đi Chợ': 'Thực phẩm, chợ tươi',
  'Khác': 'Các khoản chi phí khác'
};

const DEFAULT_CATEGORY_KEYWORDS: Record<string, string> = {
  'Lương': 'luong, salary',
  'Giáo dục': 'day hoc, cham cong, giang day',
  'Đầu tư': 'dau tu, chung khoan, co tuc',
  'Gia Sư': 'gia su, hoc phi',
  'Ăn uống': 'an uong, food, cafe, coffee, nha hang',
  'Di chuyển': 'di chuyen, grab, be, taxi',
  'Shopping': 'shopping, mua sam, shopee, lazada, tiki',
  'Hóa đơn': 'hoa don, dien, nuoc, internet, cuoc',
  'Giải trí': 'giai tri, cgv, cinema, du lich',
  'Xăng': 'xang, cay xang, petrolimex',
  'Đi Chợ': 'di cho, sieu thi, winmart, bach hoa xanh',
  'Khác': 'khac'
};

const matchKeyword = (cleanDetails: string, kw: string): boolean => {
  const cleanedKw = cleanString(kw);
  if (!cleanedKw) return false;

  if (cleanedKw.includes(' ')) {
    return cleanDetails.includes(cleanedKw);
  } else {
    const words = cleanDetails.split(/[\s,._-]+/).filter(Boolean);
    return words.includes(cleanedKw) || new RegExp(`\\b${cleanedKw}\\b`, 'i').test(cleanDetails);
  }
};

export default function Dashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletedTxIds, setDeletedTxIds] = useState<string[]>([]);
  
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
  const [preSelectedAddDate, setPreSelectedAddDate] = useState<string | null>(null);
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

  // Bank receipts state fetched directly from Supabase DB via API
  const [bankReceipts, setBankReceipts] = useState<any[]>([]);

  // Track in-flight background DB saves to eliminate front-end UI delay
  const [pendingSavesCount, setPendingSavesCount] = useState(0);

  const runBackgroundSave = useCallback(async (saveTask: () => Promise<any>) => {
    setPendingSavesCount(c => c + 1);
    try {
      await saveTask();
    } catch (err) {
      console.error('Background save error:', err);
    } finally {
      setPendingSavesCount(c => Math.max(0, c - 1));
    }
  }, []);

  const updateReceiptsState = useCallback((newReceipts: any[]) => {
    setBankReceipts(prev => {
      const map = new Map();
      prev.forEach(r => map.set(r.id, r));
      newReceipts.forEach(r => map.set(r.id, { ...(map.get(r.id) || {}), ...r }));
      return Array.from(map.values()).sort((a, b) => (b.trans_date || '').localeCompare(a.trans_date || ''));
    });
  }, []);

  const fetchBankReceipts = useCallback(async () => {
    try {
      const res = await fetch('/api/bank-receipts');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.receipts) && data.receipts.length > 0) {
          updateReceiptsState(data.receipts);
        }
      }
    } catch (err) {
      console.error('Error fetching bank receipts:', err);
    }
  }, [updateReceiptsState]);

  const handleClassifyReceipt = useCallback((
    receiptId: string,
    type: 'income' | 'expense' | 'saving',
    category: string,
    createRule: boolean,
    matchField: string,
    matchValue: string
  ) => {
    // Remove from deletedTxIds if user explicitly re-classifies manually
    if (currentUser?.id) {
      setDeletedTxIds(prev => {
        const txId = `tx-receipt-${receiptId.startsWith('vcb-') ? receiptId.replace('vcb-', '') : receiptId}`;
        const rawId = receiptId.replace(/^tx-receipt-/, '').replace(/^vcb-/, '');
        return prev.filter(id => id !== receiptId && id !== txId && id !== rawId && id !== `vcb-${rawId}`);
      });
    }

    // 1. Optimistic instant local update
    setBankReceipts(prev => {
      return prev.map(r => r.id === receiptId ? { ...r, status: 'classified', type, category } : r);
    });
    showToast('Đã phân loại biên lai!', 'success');

    // 2. Non-blocking background save to API & Supabase
    runBackgroundSave(async () => {
      try {
        const res = await fetch('/api/bank-receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiptId,
            type,
            category,
            userId: currentUser?.id,
            createRule,
            matchField,
            matchValue
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.receipts)) {
            updateReceiptsState(data.receipts);
            try {
              const txRes = await supabase
                .from('manual_transactions')
                .select('id, user_id, teacher_name, desc_text, amount, type, category, date, created_at')
                .order('date', { ascending: false });
              if (txRes.data) {
                const formatted = txRes.data.map((t: any) => ({
                  id: t.id,
                  desc: t.desc_text || t.desc || '',
                  amount: Number(t.amount) || 0,
                  type: t.type,
                  category: t.category,
                  date: t.date
                }));
                setManualTransactions(formatted);
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        console.error('Error in background receipt classification:', err);
      }
    });
  }, [currentUser, showToast, updateReceiptsState, runBackgroundSave]);

  const handleSyncReceipts = useCallback(async () => {
    try {
      const mergedKeywords: Record<string, string> = {
        'Lương': 'luong',
        'Giáo dục': 'day hoc, day, cham cong',
        'Đầu tư': 'dau tu, chung khoan',
        'Khác': 'khac',
        'Di chuyển': 'xang, grab, taxi, di lai, xe',
        'Ăn uống': 'an uong, do an, food, com, nhahang, quanan, cafe, trasua, bua an, tien an, mon an',
        'Shopping': 'shopping, mua sam, shopee, lazada',
        'Hóa đơn': 'hoa don, dien nuoc, wifi',
        'Giải trí': 'giai tri, xem phim, du lich',
        'Tiết kiệm khẩn cấp': 'tiet kiem khan cap, khan cap',
        'Tích lũy dài hạn': 'tich luy dai han, tich luy',
        'Tiết kiệm khác': 'tiet kiem khac'
      };

      const res = await fetch('/api/bank-receipts/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: mergedKeywords, userId: currentUser?.id })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.receipts)) {
          updateReceiptsState(data.receipts);
          if (Array.isArray(data.transactions) && currentUser?.id) {
            setManualTransactions(prev => {
              const map = new Map<string, any>();
              prev.forEach(t => map.set(t.id, t));
              data.transactions.forEach((t: any) => {
                const rawId = (t.id || '').replace(/^tx-receipt-/, '').replace(/^vcb-/, '');
                const isDeleted = deletedTxIds.includes(t.id) || deletedTxIds.includes(rawId) || deletedTxIds.includes(`vcb-${rawId}`);
                if (!isDeleted) {
                  map.set(t.id, t);
                }
              });
              return Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            });
          }
          showToast('Đang quét Gmail ngầm tìm biên lai mới...', 'info');
        }
      }
    } catch (err) {
      console.error('Error syncing receipts:', err);
      showToast('Có lỗi xảy ra khi đồng bộ Gmail.', 'error');
    }
  }, [showToast, updateReceiptsState, currentUser?.id, deletedTxIds]);

  // Trigger Gmail IMAP scan automatically whenever user switches to Dòng tiền (Flow) tab
  useEffect(() => {
    if (activeTab === 'flow' && currentUser?.id) {
      handleSyncReceipts();
    }
  }, [activeTab, currentUser?.id, handleSyncReceipts]);

  // Fetch bank receipts on mount, window focus, and 60-second periodic poll
  useEffect(() => {
    fetchBankReceipts();

    const interval = setInterval(() => {
      fetchBankReceipts();
    }, 60000);

    const onFocus = () => {
      fetchBankReceipts();
    };

    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchBankReceipts]);

  // Client-side Instant Auto-Classification & Transaction Registration
  useEffect(() => {
    if (!bankReceipts || bankReceipts.length === 0) return;

    const mergedKwMap: Record<string, string> = {
      'Lương': 'luong',
      'Giáo dục': 'day hoc, day, cham cong',
      'Đầu tư': 'dau tu, chung khoan',
      'Khác': 'khac',
      'Di chuyển': 'xang, grab, taxi, di lai, xe',
      'Ăn uống': 'an uong, do an, food, com, nhahang, quanan, cafe, trasua',
      'Shopping': 'shopping, mua sam, shopee, lazada',
      'Hóa đơn': 'hoa don, dien nuoc, wifi',
      'Giải trí': 'giai tri, xem phim, du lich',
      'Tiết kiệm khẩn cấp': 'tiet kiem khan cap, khan cap',
      'Tích lũy dài hạn': 'tich luy dai han, tich luy',
      'Tiết kiệm khác': 'tiet kiem khac'
    };

    let receiptsChanged = false;
    let newTxList: any[] = [];

    const updatedReceipts = bankReceipts.map((r: any) => {
      let status = r.status;
      let category = r.category;
      let type = r.type;

      if (status !== 'classified' && r.details) {
        const cleanDetails = cleanString(r.details);
        for (const catName of Object.keys(mergedKwMap)) {
          const kwStr = mergedKwMap[catName];
          if (kwStr) {
            const kwList = kwStr.split(',').map(cleanString).filter(Boolean);
            for (const kw of kwList) {
              if (matchKeyword(cleanDetails, kw)) {
                status = 'classified';
                category = catName;
                const savingCats = ['Tiết kiệm khẩn cấp', 'Tích lũy dài hạn', 'Tiết kiệm khác', 'Tiết kiệm'];
                type = savingCats.includes(catName) ? 'saving' : (['Lương', 'Giáo dục', 'Đầu tư'].includes(catName) ? 'income' : 'expense');
                receiptsChanged = true;
                break;
              }
            }
          }
          if (status === 'classified') break;
        }
      }

      return { ...r, status, category, type };
    });

    if (receiptsChanged) {
      setBankReceipts(updatedReceipts);
    }
  }, [bankReceipts, currentUser]);

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

  const [categoryTypes, setCategoryTypes] = useState<Record<string, 'income' | 'expense'>>({});
  const [categoryIcons, setCategoryIcons] = useState<Record<string, string>>({});
  const [categoryNotes, setCategoryNotes] = useState<Record<string, string>>({});
  const [categoryKeywords, setCategoryKeywords] = useState<Record<string, string>>({});

  // Load financial data directly from Supabase DB (shared across all admins)
  useEffect(() => {
    if (!currentUser) return;

    const defaultBudgets: Record<string, number> = {
      'Lương': 15000000,
      'Giáo dục': 10000000,
      'Đầu tư': 5000000,
      'Gia Sư': 4000000,
      'Khác': 1000000,
      'Ăn uống': 4000000,
      'Di chuyển': 1500000,
      'Shopping': 3000000,
      'Hóa đơn': 3000000,
      'Giải trí': 2000000,
      'Xăng': 500000,
      'Đi Chợ': 1500000
    };

    const fetchFinanceCloud = async () => {
      try {
        const [txRes, fundRes, budgetRes, histRes] = await Promise.all([
          supabase.from('manual_transactions').select('id, user_id, teacher_name, desc_text, amount, type, category, date, created_at').order('date', { ascending: false }),
          supabase.from('savings_funds').select('user_id, teacher_name, emergency_current, emergency_target, accumulation_current, accumulation_target, updated_at').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('category_budgets').select('*'),
          supabase.from('savings_history').select('id, user_id, teacher_name, fund, type, amount, date, created_at').order('date', { ascending: false })
        ]);

        if (txRes.data) {
          const formatted = txRes.data.map((t: any) => ({
            id: t.id,
            desc: t.desc_text || t.desc || '',
            amount: Number(t.amount) || 0,
            type: t.type,
            category: t.category,
            date: t.date
          }));
          setManualTransactions(formatted);
        }

        if (fundRes.data) {
          setEmergencyCurrent(Number(fundRes.data.emergency_current) || 0);
          setEmergencyTarget(Number(fundRes.data.emergency_target) || 30000000);
          setAccumulationCurrent(Number(fundRes.data.accumulation_current) || 0);
          setAccumulationTarget(Number(fundRes.data.accumulation_target) || 150000000);
        }

        if (budgetRes.data && budgetRes.data.length > 0) {
          const bMap: Record<string, number> = {};
          const tMap: Record<string, 'income' | 'expense'> = {};
          const iMap: Record<string, string> = {};
          const nMap: Record<string, string> = {};
          const kMap: Record<string, string> = {};

          budgetRes.data.forEach((b: any) => {
            if (b.type === 'settings' || b.category?.includes('TABLE_SETTINGS')) return;
            bMap[b.category] = Number(b.amount) || 0;
            let type: 'income' | 'expense' = b.type || (['Lương', 'Giáo dục', 'Đầu tư', 'Gia Sư'].includes(b.category) ? 'income' : 'expense');
            let icon = b.icon || DEFAULT_CATEGORY_ICONS[b.category] || (type === 'income' ? 'TrendingUp' : 'Coins');
            let note = b.note || DEFAULT_CATEGORY_NOTES[b.category] || (type === 'income' ? 'Thu nhập khác' : 'Chi phí khác');
            let kw = b.keywords || DEFAULT_CATEGORY_KEYWORDS[b.category] || '';

            if (b.keywords && typeof b.keywords === 'string' && b.keywords.startsWith('{')) {
              try {
                const parsed = JSON.parse(b.keywords);
                if (parsed.type) type = parsed.type;
                if (parsed.icon !== undefined && parsed.icon !== null) icon = parsed.icon;
                if (parsed.note !== undefined && parsed.note !== null) note = parsed.note;
                if (parsed.kw !== undefined && parsed.kw !== null) kw = parsed.kw;
              } catch (e) {}
            }
            tMap[b.category] = type;
            iMap[b.category] = icon;
            nMap[b.category] = note;
            kMap[b.category] = kw;
          });
          setCategoryBudgets(bMap);
          setCategoryTypes(tMap);
          setCategoryIcons(iMap);
          setCategoryNotes(nMap);
          setCategoryKeywords(kMap);
        } else {
          setCategoryBudgets(defaultBudgets);
        }

        if (histRes.data) {
          const formatted = histRes.data.map((h: any) => ({
            id: h.id,
            fund: h.fund,
            type: h.type,
            amount: Number(h.amount) || 0,
            date: h.date
          }));
          setSavingsHistory(formatted);
        }
      } catch (err) {
        console.error('Direct Supabase cloud fetch error:', err);
      }
    };

    fetchFinanceCloud();
  }, [currentUser]);

  // Direct Supabase Save Helpers (Updates React State & Supabase Cloud directly without localStorage)
  const saveTransactions = useCallback((userId: string, data: any[]) => {
    setManualTransactions(data);

    if (!currentUser) return;
    const teacherName = currentUser.teacherName || 'Admin';
    runBackgroundSave(async () => {
      try {
        if (data.length > 0) {
          const records = data.map(t => ({
            id: t.id || `tx-${Date.now()}-${Math.random()}`,
            user_id: userId,
            teacher_name: teacherName,
            desc_text: t.desc || '',
            amount: Number(t.amount) || 0,
            type: t.type,
            category: t.category,
            date: t.date
          }));
          const { error } = await supabase.from('manual_transactions').upsert(records, { onConflict: 'id' });
          if (error) console.error('Supabase manual_transactions upsert error:', error);
        }
      } catch (err) {
        console.error('Direct saveTransactions error:', err);
      }
    });
  }, [currentUser, runBackgroundSave]);

  const saveSavingsFundsDirect = useCallback((userId: string, emCurr: number, emTar: number, acCurr: number, acTar: number) => {
    if (!currentUser) return;
    runBackgroundSave(async () => {
      try {
        const payload = {
          user_id: 'aae79676-8bc1-4cce-8f5d-e78379a6abc4',
          teacher_name: 'Shared Admin',
          emergency_current: emCurr,
          emergency_target: emTar,
          accumulation_current: acCurr,
          accumulation_target: acTar,
          updated_at: new Date().toISOString()
        };
        const { error } = await supabase.from('savings_funds').upsert(payload, { onConflict: 'user_id' });
        if (error) console.error('Supabase savings_funds upsert error:', error);
      } catch (err) {
        console.error('Direct saveSavingsFunds error:', err);
      }
    });
  }, [currentUser, runBackgroundSave]);

  const saveEmergencyCurrent = (userId: string, val: number) => {
    setEmergencyCurrent(val);
    saveSavingsFundsDirect(userId, val, emergencyTarget, accumulationCurrent, accumulationTarget);
  };

  const saveEmergencyTarget = (userId: string, val: number) => {
    setEmergencyTarget(val);
    saveSavingsFundsDirect(userId, emergencyCurrent, val, accumulationCurrent, accumulationTarget);
  };

  const saveAccumulationCurrent = (userId: string, val: number) => {
    setAccumulationCurrent(val);
    saveSavingsFundsDirect(userId, emergencyCurrent, emergencyTarget, val, accumulationTarget);
  };

  const saveAccumulationTarget = (userId: string, val: number) => {
    setAccumulationTarget(val);
    saveSavingsFundsDirect(userId, emergencyCurrent, emergencyTarget, accumulationCurrent, val);
  };

  const saveSavingsHistory = useCallback((userId: string, data: any[]) => {
    setSavingsHistory(data);

    if (!currentUser) return;
    runBackgroundSave(async () => {
      try {
        if (data.length > 0) {
          const records = data.map(h => ({
            id: h.id || `sh-${Date.now()}-${Math.random()}`,
            user_id: userId,
            teacher_name: currentUser.teacherName || 'Admin',
            fund: h.fund,
            type: h.type,
            amount: Number(h.amount) || 0,
            date: h.date
          }));
          const { error } = await supabase.from('savings_history').upsert(records, { onConflict: 'id' });
          if (error) console.error('Supabase savings_history upsert error:', error);
        }
      } catch (err) {
        console.error('Direct saveSavingsHistory error:', err);
      }
    });
  }, [currentUser, runBackgroundSave]);

  const saveBudgets = useCallback((
    userId: string, 
    budgets: Record<string, number>, 
    keywords?: Record<string, string>, 
    catTypes?: Record<string, 'income' | 'expense'>,
    catIcons?: Record<string, string>,
    catNotes?: Record<string, string>
  ) => {
    // Merge new maps with existing state maps
    const targetTypes = { ...categoryTypes, ...catTypes };
    const targetIcons = { ...categoryIcons, ...catIcons };
    const targetNotes = { ...categoryNotes, ...catNotes };
    const targetKeywords = { ...categoryKeywords, ...keywords };

    // Remove keys that are no longer in budgets (renamed or deleted categories)
    const validKeys = new Set(Object.keys(budgets));
    Object.keys(targetTypes).forEach(k => { if (!validKeys.has(k)) delete targetTypes[k]; });
    Object.keys(targetIcons).forEach(k => { if (!validKeys.has(k)) delete targetIcons[k]; });
    Object.keys(targetNotes).forEach(k => { if (!validKeys.has(k)) delete targetNotes[k]; });
    Object.keys(targetKeywords).forEach(k => { if (!validKeys.has(k)) delete targetKeywords[k]; });

    setCategoryBudgets(budgets);
    setCategoryTypes(targetTypes);
    setCategoryIcons(targetIcons);
    setCategoryNotes(targetNotes);
    setCategoryKeywords(targetKeywords);

    if (!currentUser) return;

    runBackgroundSave(async () => {
      try {
        const records = Object.keys(budgets).map(cat => {
          const type = targetTypes[cat] || (['Lương', 'Giáo dục', 'Đầu tư', 'Gia Sư'].includes(cat) ? 'income' : 'expense');
          const kw = targetKeywords[cat] !== undefined ? targetKeywords[cat] : (DEFAULT_CATEGORY_KEYWORDS[cat] || '');
          const icon = targetIcons[cat] || DEFAULT_CATEGORY_ICONS[cat] || (type === 'income' ? 'TrendingUp' : 'Coins');
          const note = targetNotes[cat] || DEFAULT_CATEGORY_NOTES[cat] || (type === 'income' ? 'Thu nhập khác' : 'Chi phí khác');
          const record: any = {
            id: cat,
            user_id: userId,
            teacher_name: currentUser.teacherName || 'Admin',
            category: cat,
            amount: Number(budgets[cat]) || 0,
            type: type,
            icon: icon,
            note: note,
            keywords: kw,
            updated_at: new Date().toISOString()
          };
          return record;
        });

        if (records.length > 0) {
          const { error } = await supabase.from('category_budgets').upsert(records, { onConflict: 'id' });
          if (error && error.code === 'PGRST204') {
            const cleanRecords = records.map(({ keywords, ...rest }: any) => rest);
            const { error: retryErr } = await supabase.from('category_budgets').upsert(cleanRecords, { onConflict: 'id' });
            if (retryErr) console.error('Retry upsert category_budgets error:', retryErr);
          } else if (error) {
            console.error('Supabase category_budgets upsert error:', error);
          }
        }
      } catch (err) {
        console.error('Direct saveBudgets error:', err);
      }
    });
  }, [currentUser, runBackgroundSave, categoryTypes, categoryIcons, categoryNotes, categoryKeywords]);

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

  // Auto check-in processor for past/reached sessions
  const processAutoCheckIn = useCallback(async (items: Session[]): Promise<Session[]> => {
    if (!items || items.length === 0) return items;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const idsToUpdate: string[] = [];

    const updatedSessions = items.map((s) => {
      const isPending = s.status === 'Chưa làm' || s.status === 'Chưa dạy';
      if (isPending && s.auto_checkin !== false && s.auto_check_in !== false) {
        const sDate = s.date;
        const sTime = formatCleanTimeString(s.time);

        const isPastDay = sDate < todayStr;
        const isTodayDue = sDate === todayStr && currentTimeStr >= sTime;

        if (isPastDay || isTodayDue) {
          idsToUpdate.push(s.id);
          return { ...s, status: 'Đã làm' };
        }
      }
      return s;
    });

    if (idsToUpdate.length > 0) {
      try {
        await supabase
          .from('sessions')
          .update({ status: 'Đã làm' })
          .in('id', idsToUpdate);
      } catch (err) {
        console.error('Error auto checking-in sessions:', err);
      }
      return updatedSessions;
    }

    return items;
  }, []);

  // Helper to normalize session properties
  const normalizeSessionList = useCallback((rawList: any[]): Session[] => {
    if (!Array.isArray(rawList)) return [];
    return rawList.map(s => {
      const userName = s.user_name || s.teacher_name || 'Admin';
      const jobName = s.job_name || s.student_name || 'Công việc';
      let st = s.status || 'Chưa làm';
      if (st === 'Chưa dạy') st = 'Chưa làm';
      if (st === 'Đã dạy') st = 'Đã làm';
      return {
        ...s,
        user_name: userName,
        teacher_name: userName,
        job_name: jobName,
        student_name: jobName,
        status: st
      };
    });
  }, []);

  // Helper to carry forward fixed schedules (loai_hinh === 'co_dinh') into target month if missing
  const syncFixedSchedulesForMonth = useCallback(async (targetMonth: string, currentMonthData: any[], teacherName: string) => {
    if (!targetMonth || !teacherName) return currentMonthData;
    try {
      // 1. Fetch prior sessions marked co_dinh for this teacher
      const { data: priorFixed, error: priorErr } = await supabase
        .from('sessions')
        .select('*')
        .or(`user_name.eq.${teacherName},teacher_name.eq.${teacherName}`)
        .lt('month_year', targetMonth);

      if (priorErr || !priorFixed || priorFixed.length === 0) {
        return currentMonthData;
      }

      // Filter only co_dinh items
      const coDinhItems = priorFixed.filter((s: any) => (s.loai_hinh || s.loai_hinh_lich) === 'co_dinh');
      if (coDinhItems.length === 0) return currentMonthData;

      // Find the most recent prior month
      const priorMonths = Array.from(new Set(coDinhItems.map((s: any) => s.month_year))).sort();
      const mostRecentPriorMonth = priorMonths[priorMonths.length - 1];
      if (!mostRecentPriorMonth) return currentMonthData;

      const latestPriorSessions = coDinhItems.filter((s: any) => s.month_year === mostRecentPriorMonth);

      // Existing student names in current month
      const existingStudentNames = new Set(
        currentMonthData.map((s: any) => (s.student_name || s.job_name || '').trim().toLowerCase())
      );

      // Collect prior fixed sessions for students not in current month
      const studentsToCarryForwardMap = new Map<string, any[]>();
      for (const s of latestPriorSessions) {
        const sName = (s.student_name || s.job_name || '').trim();
        if (!sName) continue;
        const key = sName.toLowerCase();
        if (!existingStudentNames.has(key)) {
          if (!studentsToCarryForwardMap.has(key)) {
            studentsToCarryForwardMap.set(key, []);
          }
          studentsToCarryForwardMap.get(key)!.push(s);
        }
      }

      if (studentsToCarryForwardMap.size === 0) {
        return currentMonthData;
      }

      const newCandidates: any[] = [];
      studentsToCarryForwardMap.forEach((sessionsList) => {
        // Deduplicate pattern by (day_of_week, time)
        const patternMap = new Map<string, any>();
        sessionsList.forEach((s) => {
          const patternKey = `${s.day_of_week}_${s.time}`;
          if (!patternMap.has(patternKey)) {
            patternMap.set(patternKey, s);
          }
        });

        patternMap.forEach((templateSession) => {
          const dates = getDatesForWeekday(targetMonth, templateSession.day_of_week);
          dates.forEach((dStr) => {
            newCandidates.push({
              user_name: teacherName,
              teacher_name: teacherName,
              job_name: templateSession.job_name || templateSession.student_name,
              student_name: templateSession.student_name || templateSession.job_name,
              day_of_week: templateSession.day_of_week,
              time: formatCleanTimeString(templateSession.time),
              duration: Number(templateSession.duration || 1.5),
              price: Number(templateSession.price || 0),
              status: 'Chưa làm',
              month_year: targetMonth,
              color: templateSession.color || '#7c3aed',
              date: dStr,
              auto_check_in: templateSession.auto_check_in ?? templateSession.auto_checkin ?? true,
              auto_checkin: templateSession.auto_checkin ?? templateSession.auto_check_in ?? true,
              loai_hinh_lich: 'co_dinh',
              loai_hinh: 'co_dinh',
              income_category: templateSession.income_category || templateSession.category || 'Giáo dục'
            });
          });
        });
      });

      if (newCandidates.length === 0) return currentMonthData;

      // Insert into Supabase
      let { data: insertedData, error: insertErr } = await supabase
        .from('sessions')
        .insert(newCandidates)
        .select('*');

      if (insertErr && (
        insertErr.message?.includes('schema cache') || 
        insertErr.message?.includes('Could not find') ||
        insertErr.message?.includes('does not exist')
      )) {
        const cleanCandidates = newCandidates.map(({ auto_check_in, auto_checkin, loai_hinh_lich, loai_hinh, category, income_category, student_name, teacher_name, ...rest }) => rest);
        const retryRes = await supabase.from('sessions').insert(cleanCandidates).select('*');
        insertedData = retryRes.data;
        insertErr = retryRes.error;
      }

      if (!insertErr && insertedData && insertedData.length > 0) {
        return [...currentMonthData, ...insertedData];
      } else if (newCandidates.length > 0) {
        return [...currentMonthData, ...newCandidates];
      }
    } catch (err) {
      console.error('Error syncing fixed schedules:', err);
    }
    return currentMonthData;
  }, []);

  // Fetch session schedule data
  const fetchSessions = useCallback(async () => {
    if (!selectedMonth) return;
    setLoading(true);

    // 1. Fetch sessions for the active user/teacher in selectedMonth (for scheduler)
    if (activeTeacherName) {
      let { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_name', activeTeacherName)
        .eq('month_year', selectedMonth);

      if ((error || !data || data.length === 0) && activeTeacherName) {
        const res2 = await supabase
          .from('sessions')
          .select('*')
          .eq('teacher_name', activeTeacherName)
          .eq('month_year', selectedMonth);
        if (!res2.error && res2.data) {
          data = res2.data;
          error = null;
        }
      }

      const initialData = data || [];
      const syncedData = await syncFixedSchedulesForMonth(selectedMonth, initialData, activeTeacherName);
      const normalized = normalizeSessionList(syncedData);
      const processed = await processAutoCheckIn(normalized);
      setSessions(processed);
      calculateStats(processed);
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
        const normalizedAll = normalizeSessionList(data);
        const processedAll = await processAutoCheckIn(normalizedAll);
        setAllSessions(processedAll);
      } else {
        setAllSessions([]);
      }
    } else {
      setAllSessions([]);
    }

    setLoading(false);
  }, [activeTeacherName, selectedMonth, chartSelectedMonths, currentUser, processAutoCheckIn]);

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

  // Periodic timer for live auto check-in every 30 seconds
  useEffect(() => {
    if (!sessions || sessions.length === 0) return;

    const interval = setInterval(async () => {
      const updatedSessions = await processAutoCheckIn(sessions);
      if (updatedSessions !== sessions) {
        setSessions(updatedSessions);
        calculateStats(updatedSessions);
      }

      if (allSessions.length > 0) {
        const updatedAll = await processAutoCheckIn(allSessions);
        if (updatedAll !== allSessions) {
          setAllSessions(updatedAll);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [sessions, allSessions, processAutoCheckIn]);

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
      if (s.status === 'Đã làm' || s.status === 'Đã dạy') {
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
  // Preceding Roll-Over Surplus calculation (leftover money from previous months)
  const getPrecedingRollOverBalance = useCallback((targetMonthStr: string) => {
    if (!targetMonthStr) return 0;
    const targetSessions = currentUser?.role === 'admin' ? allSessions : sessions;

    const prevManualInc = manualTransactions
      .filter(t => t.type === 'income' && t.date && t.date.substring(0, 7) < targetMonthStr)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const prevAutoInc = targetSessions
      .filter(s => (s.status === 'Đã làm' || s.status === 'Đã dạy') && s.date && s.date.substring(0, 7) < targetMonthStr)
      .reduce((sum, s) => sum + (Number(s.price) || 0), 0);

    const prevManualExp = manualTransactions
      .filter(t => t.type === 'expense' && t.date && t.date.substring(0, 7) < targetMonthStr)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const prevNetSurplus = (prevManualInc + prevAutoInc) - prevManualExp;
    return Math.max(0, prevNetSurplus);
  }, [sessions, allSessions, manualTransactions, currentUser]);

  const getTotalIncome = useCallback(() => {
    const targetSessions = currentUser?.role === 'admin' ? allSessions : sessions;
    const sbInc = targetSessions
      .filter(s => s.status === 'Đã làm' || s.status === 'Đã dạy')
      .reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    const manualInc = manualTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    return sbInc + manualInc;
  }, [sessions, allSessions, manualTransactions, currentUser]);

  const getTotalExpense = useCallback(() => {
    return manualTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [manualTransactions]);

  const getMonthlyIncome = useCallback((monthStr: string) => {
    const targetSessions = currentUser?.role === 'admin' ? allSessions : sessions;
    const sbEarned = targetSessions
      .filter(s => (s.status === 'Đã làm' || s.status === 'Đã dạy') && s.month_year === monthStr)
      .reduce((sum, s) => sum + (Number(s.price) || 0), 0);
      
    const manualInc = manualTransactions
      .filter(t => t.type === 'income' && t.date.startsWith(monthStr))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const rollOver = getPrecedingRollOverBalance(monthStr);
    return sbEarned + manualInc + rollOver;
  }, [sessions, allSessions, manualTransactions, currentUser, getPrecedingRollOverBalance]);

  const getMonthlyExpense = useCallback((monthStr: string) => {
    return manualTransactions
      .filter(t => t.type === 'expense' && t.date.startsWith(monthStr))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [manualTransactions]);

  // Filtered values by selected months (including previous month roll-over balance)
  const getSelectedMonthsIncome = useCallback(() => {
    const targetSessions = currentUser?.role === 'admin' ? allSessions : sessions;
    const sbEarned = targetSessions
      .filter(s => (s.status === 'Đã làm' || s.status === 'Đã dạy') && chartSelectedMonths.includes(s.month_year))
      .reduce((sum, s) => sum + (Number(s.price) || 0), 0);
      
    const manualInc = manualTransactions
      .filter(t => t.type === 'income' && chartSelectedMonths.includes(t.date.substring(0, 7)))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const sortedMonths = [...chartSelectedMonths].sort();
    const earliestMonth = sortedMonths[0];
    const rollOver = earliestMonth ? getPrecedingRollOverBalance(earliestMonth) : 0;
      
    return sbEarned + manualInc + rollOver;
  }, [sessions, allSessions, manualTransactions, chartSelectedMonths, currentUser, getPrecedingRollOverBalance]);

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
        if (s.month_year !== monthStr || (s.status !== 'Đã làm' && s.status !== 'Đã dạy')) return false;
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

  // Actual total per category for selected months
  const getActualCategoryAmount = useCallback((cat: string) => {
    const isExp = ['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Khác'].includes(cat);
    if (isExp) {
      return manualTransactions
        .filter(t => t.type === 'expense' && t.category === cat && chartSelectedMonths.includes(t.date.substring(0, 7)))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    } else {
      const manualInc = manualTransactions
        .filter(t => t.type === 'income' && t.category === cat && chartSelectedMonths.includes(t.date.substring(0, 7)))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      const targetSessions = currentUser?.role === 'admin' ? allSessions : sessions;
      const sbInc = targetSessions
        .filter(s => (s.status === 'Đã làm' || s.status === 'Đã dạy') && chartSelectedMonths.includes(s.month_year) && ((s as any).income_category || s.category || 'Giáo dục') === cat)
        .reduce((sum, s) => sum + (Number(s.price) || 0), 0);
      return manualInc + sbInc;
    }
  }, [manualTransactions, sessions, allSessions, chartSelectedMonths, currentUser]);

  // Toggle multi-select months
  const toggleChartMonth = useCallback((mStr: string) => {
    setChartSelectedMonths(prev => {
      if (prev.includes(mStr)) {
        if (prev.length === 1) return prev; // Do not empty
        return prev.filter(m => m !== mStr);
      } else {
        return [...prev, mStr];
      }
    });
  }, []);

  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState<string | null>(null);

  const handleDeleteManualTx = useCallback((id: string) => {
    setConfirmDeleteTxId(id);
  }, []);

  const executeDeleteManualTx = () => {
    if (!currentUser || !confirmDeleteTxId) return;
    const userId = currentUser.id;
    const idToDelete = confirmDeleteTxId;
    const updated = manualTransactions.filter(t => t.id !== idToDelete);
    setManualTransactions(updated);

    runBackgroundSave(async () => {
      try {
        await supabase.from('manual_transactions').delete().eq('id', idToDelete);
        if (idToDelete.startsWith('tx-receipt-')) {
          const receiptId = idToDelete.replace('tx-receipt-', '');
          const rawId = receiptId.replace(/^vcb-/, '');
          await supabase
            .from('bank_receipts')
            .update({ status: 'unclassified', type: null, category: null })
            .or(`id.eq.${receiptId},id.eq.${rawId},id.eq.vcb-${rawId}`);

          setBankReceipts(prev => prev.map(r => {
            if (r.id === receiptId || r.id === rawId || r.id === `vcb-${rawId}`) {
              return { ...r, status: 'unclassified', type: null, category: null };
            }
            return r;
          }));
        }
      } catch (err) {
        console.error('Error deleting manual transaction from DB:', err);
      }
    });

    // Track deleted transaction ID so auto-classification never resurrects it in history section
    setDeletedTxIds(prev => {
      const set = new Set(prev);
      set.add(idToDelete);
      if (idToDelete.startsWith('tx-receipt-')) {
        const rawId = idToDelete.replace('tx-receipt-', '');
        set.add(rawId);
        set.add(`vcb-${rawId}`);
      }
      return Array.from(set);
    });

    setConfirmDeleteTxId(null);
  };

  const handleOpenTxModal = useCallback((type: 'income' | 'expense' | 'saving') => {
    setModalTxType(type);
    setTxModalOpen(true);
  }, []);

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
      <div className={`flex-1 flex flex-col min-w-0 h-screen overflow-y-auto transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[112px]' : 'lg:pl-[292px]'}`}>
        
        {/* Floating Mobile Header - Always pinned on top when scrolling on mobile */}
        <header className="lg:hidden h-16 border-b border-white/10 bg-[#070911]/95 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 shrink-0 shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-3">
            {/* Hamburger for mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400 hover:text-white transition-all cursor-pointer shadow-[0_0_12px_rgba(92,54,245,0.3)] shrink-0"
              title="Mở menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <div className="h-8.5 w-8.5 bg-indigo-500/20 border border-indigo-400/50 rounded-xl flex items-center justify-center text-indigo-300 shadow-[0_0_12px_rgba(92,54,245,0.4)] shrink-0">
                <Wallet className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xs tracking-wider text-white uppercase leading-none">Finance</span>
                <span className="font-extrabold text-[9px] tracking-widest text-indigo-400 uppercase leading-none mt-0.5">Dashboard</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            {pendingSavesCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-xl text-[10px] font-black shadow-sm animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping"></span>
                <span>Đang lưu ngầm ({pendingSavesCount})</span>
              </div>
            )}

            {/* Quick Scheduler Manage (Admin only & Schedule view) */}
            {currentUser.role === 'admin' && activeTab === 'schedule' && (
              <button
                onClick={() => setTeachersModalOpen(true)}
                title="Quản lý danh sách giáo viên"
                className="flex items-center gap-2 px-3 py-1.5 bg-[#121624] border border-white/10 hover:border-indigo-500/40 text-indigo-300 text-xs font-bold rounded-xl shadow-md transition-all hover:scale-[1.01] cursor-pointer"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Quản lý</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic page content content scrolling */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6">
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
              getPrecedingRollOverBalance={getPrecedingRollOverBalance}
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
              categoryTypes={categoryTypes}
              categoryIcons={categoryIcons}
              categoryNotes={categoryNotes}
              categoryKeywords={categoryKeywords}
              chartSelectedMonths={chartSelectedMonths}
              bankReceipts={bankReceipts}
              getActualCategoryAmount={getActualCategoryAmount}
              handleDeleteManualTx={handleDeleteManualTx}
              handleOpenTxModal={handleOpenTxModal}
              saveBudgets={saveBudgets}
              saveTransactions={saveTransactions}
              toggleChartMonth={toggleChartMonth}
              handleClassifyReceipt={handleClassifyReceipt}
              handleSyncReceipts={handleSyncReceipts}
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
              manualTransactions={manualTransactions}
              saveEmergencyCurrent={saveEmergencyCurrent}
              saveEmergencyTarget={saveEmergencyTarget}
              saveAccumulationCurrent={saveAccumulationCurrent}
              saveAccumulationTarget={saveAccumulationTarget}
              saveSavingsHistory={saveSavingsHistory}
              saveTransactions={saveTransactions}
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
              onAddSessionOnDate={(dateStr) => {
                setPreSelectedAddDate(dateStr);
                setAddModalOpen(true);
              }}
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
        categoryBudgets={categoryBudgets}
        categoryTypes={categoryTypes}
        saveTransactions={saveTransactions}
        saveEmergencyCurrent={saveEmergencyCurrent}
        saveAccumulationCurrent={saveAccumulationCurrent}
        saveSavingsHistory={saveSavingsHistory}
      />

      {/* Scheduler add modal */}
      {addModalOpen && (
        <AddSessionModal
          isOpen={addModalOpen}
          onClose={() => {
            setAddModalOpen(false);
            setPreSelectedAddDate(null);
          }}
          onSave={fetchSessions}
          activeTeacherName={activeTeacherName}
          selectedMonth={selectedMonth}
          existingSessions={sessions}
          teachers={teachers}
          currentUser={currentUser}
          preSelectedDate={preSelectedAddDate}
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
          teachers={teachers}
          currentUser={currentUser}
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

      {/* Transaction Deletion Confirm Modal */}
      {confirmDeleteTxId && (
        <ConfirmModal
          isOpen={!!confirmDeleteTxId}
          title="Xóa Giao Dịch"
          message="Bạn có chắc chắn muốn xóa giao dịch này khỏi hệ thống?"
          confirmLabel="Xóa Giao Dịch"
          cancelLabel="Hủy Bỏ"
          variant="danger"
          onConfirm={executeDeleteManualTx}
          onClose={() => setConfirmDeleteTxId(null)}
        />
      )}
    </div>
  );
}
