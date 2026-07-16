'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Users, Key, LogOut, X, ChevronDown, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Session, formatCleanTimeString } from '@/lib/utils';

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

  // Load financial data from LocalStorage first, then sync directly with Supabase DB (matching sessions table architecture)
  useEffect(() => {
    if (!currentUser) return;
    const userId = currentUser.id;
    const teacherName = currentUser.teacherName || 'Admin';

    // Step 1: Initial LocalStorage Load (Prevents data loss under all conditions)
    let localTx: any[] = [];
    let localSavHist: any[] = [];
    let localBudgets: Record<string, number> = {};
    let localEmCurr = 0;
    let localEmTar = 30000000;
    let localAcCurr = 0;
    let localAcTar = 150000000;

    const storedTrans = localStorage.getItem(`finance_trans_${userId}`);
    if (storedTrans) {
      try { localTx = JSON.parse(storedTrans); } catch (e) { console.error(e); }
    }
    const storedSavHist = localStorage.getItem(`finance_sav_hist_${userId}`);
    if (storedSavHist) {
      try { localSavHist = JSON.parse(storedSavHist); } catch (e) { console.error(e); }
    }
    const storedBudgets = localStorage.getItem(`finance_budgets_${userId}`);
    if (storedBudgets) {
      try { localBudgets = JSON.parse(storedBudgets); } catch (e) { console.error(e); }
    }
    const sEmCurr = localStorage.getItem(`finance_em_curr_${userId}`);
    if (sEmCurr) localEmCurr = Number(sEmCurr);
    const sEmTar = localStorage.getItem(`finance_em_tar_${userId}`);
    if (sEmTar) localEmTar = Number(sEmTar);
    const sAcCurr = localStorage.getItem(`finance_ac_curr_${userId}`);
    if (sAcCurr) localAcCurr = Number(sAcCurr);
    const sAcTar = localStorage.getItem(`finance_ac_tar_${userId}`);
    if (sAcTar) localAcTar = Number(sAcTar);

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

    setManualTransactions(localTx);
    setEmergencyCurrent(localEmCurr);
    setEmergencyTarget(localEmTar);
    setAccumulationCurrent(localAcCurr);
    setAccumulationTarget(localAcTar);
    setSavingsHistory(localSavHist);
    setCategoryBudgets({ ...defaultBudgets, ...localBudgets });

    // Step 2: Direct Supabase Cloud Synchronization & Auto-Migration
    const fetchFinanceCloud = async () => {
      try {
        const [txRes, fundRes, budgetRes, histRes] = await Promise.all([
          supabase.from('manual_transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
          supabase.from('savings_funds').select('*').eq('user_id', userId).maybeSingle(),
          supabase.from('category_budgets').select('*').eq('user_id', userId),
          supabase.from('savings_history').select('*').eq('user_id', userId).order('date', { ascending: false })
        ]);

        if (txRes.error || fundRes.error || budgetRes.error || histRes.error) {
          console.warn('Supabase financial tables not present or inaccessible. Operating in LocalStorage mode.', {
            txErr: txRes.error?.message,
            fundErr: fundRes.error?.message,
            budgetErr: budgetRes.error?.message,
            histErr: histRes.error?.message
          });
          return;
        }

        const cloudTx = txRes.data || [];
        const cloudFund = fundRes.data;
        const cloudBudgets = budgetRes.data || [];
        const cloudHist = histRes.data || [];

        const hasCloudData = cloudTx.length > 0 || !!cloudFund || cloudBudgets.length > 0 || cloudHist.length > 0;

        if (hasCloudData) {
          // Cloud has data: sync to state & LocalStorage
          if (cloudTx.length > 0) {
            const formatted = cloudTx.map((t: any) => ({
              id: t.id,
              desc: t.desc_text || t.desc || '',
              amount: Number(t.amount) || 0,
              type: t.type,
              category: t.category,
              date: t.date
            }));
            setManualTransactions(formatted);
            localStorage.setItem(`finance_trans_${userId}`, JSON.stringify(formatted));
          }

          if (cloudFund) {
            setEmergencyCurrent(Number(cloudFund.emergency_current) || 0);
            setEmergencyTarget(Number(cloudFund.emergency_target) || 30000000);
            setAccumulationCurrent(Number(cloudFund.accumulation_current) || 0);
            setAccumulationTarget(Number(cloudFund.accumulation_target) || 150000000);

            localStorage.setItem(`finance_em_curr_${userId}`, String(cloudFund.emergency_current || 0));
            localStorage.setItem(`finance_em_tar_${userId}`, String(cloudFund.emergency_target || 30000000));
            localStorage.setItem(`finance_ac_curr_${userId}`, String(cloudFund.accumulation_current || 0));
            localStorage.setItem(`finance_ac_tar_${userId}`, String(cloudFund.accumulation_target || 150000000));
          }

          if (cloudBudgets.length > 0) {
            const bMap: Record<string, number> = {};
            cloudBudgets.forEach((b: any) => { bMap[b.category] = Number(b.amount) || 0; });
            setCategoryBudgets({ ...defaultBudgets, ...bMap });
            localStorage.setItem(`finance_budgets_${userId}`, JSON.stringify(bMap));
          }

          if (cloudHist.length > 0) {
            const formatted = cloudHist.map((h: any) => ({
              id: h.id,
              fund: h.fund,
              type: h.type,
              amount: Number(h.amount) || 0,
              date: h.date
            }));
            setSavingsHistory(formatted);
            localStorage.setItem(`finance_sav_hist_${userId}`, JSON.stringify(formatted));
          }
        } else if (localTx.length > 0 || localSavHist.length > 0 || Object.keys(localBudgets).length > 0) {
          // Cloud table is empty BUT LocalStorage has existing data -> Auto-migrate UP to Supabase cloud!
          console.log('Auto-migrating local financial data up to Supabase database...');
          if (localTx.length > 0) {
            const txRecords = localTx.map(t => ({
              id: t.id || `tx-${Date.now()}-${Math.random()}`,
              user_id: userId,
              teacher_name: teacherName,
              desc_text: t.desc || '',
              amount: Number(t.amount) || 0,
              type: t.type,
              category: t.category,
              date: t.date
            }));
            await supabase.from('manual_transactions').insert(txRecords);
          }

          await supabase.from('savings_funds').upsert({
            user_id: userId,
            teacher_name: teacherName,
            emergency_current: localEmCurr,
            emergency_target: localEmTar,
            accumulation_current: localAcCurr,
            accumulation_target: localAcTar,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

          if (localSavHist.length > 0) {
            const histRecords = localSavHist.map(h => ({
              id: h.id || `sh-${Date.now()}-${Math.random()}`,
              user_id: userId,
              teacher_name: teacherName,
              fund: h.fund,
              type: h.type,
              amount: Number(h.amount) || 0,
              date: h.date
            }));
            await supabase.from('savings_history').insert(histRecords);
          }

          const budgetRecords = Object.keys(localBudgets).map(cat => ({
            id: `${userId}_${cat}`,
            user_id: userId,
            teacher_name: teacherName,
            category: cat,
            amount: Number(localBudgets[cat]) || 0,
            updated_at: new Date().toISOString()
          }));
          if (budgetRecords.length > 0) {
            await supabase.from('category_budgets').upsert(budgetRecords, { onConflict: 'id' });
          }
        }
      } catch (err) {
        console.error('Direct Supabase cloud fetch error:', err);
      }
    };

    fetchFinanceCloud();
  }, [currentUser]);

  // Direct Supabase Save Helpers (Updates React State, LocalStorage Backup & Supabase Cloud directly)
  const saveTransactions = useCallback(async (userId: string, data: any[]) => {
    setManualTransactions(data);
    localStorage.setItem(`finance_trans_${userId}`, JSON.stringify(data));

    if (!currentUser) return;
    const teacherName = currentUser.teacherName || 'Admin';
    try {
      await supabase.from('manual_transactions').delete().eq('user_id', userId);
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
        const { error } = await supabase.from('manual_transactions').insert(records);
        if (error) console.error('Supabase manual_transactions insert error:', error);
      }
    } catch (err) {
      console.error('Direct saveTransactions error:', err);
    }
  }, [currentUser]);

  const saveSavingsFundsDirect = async (userId: string, emCurr: number, emTar: number, acCurr: number, acTar: number) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase.from('savings_funds').upsert({
        user_id: userId,
        teacher_name: currentUser.teacherName || 'Admin',
        emergency_current: emCurr,
        emergency_target: emTar,
        accumulation_current: acCurr,
        accumulation_target: acTar,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      if (error) console.error('Supabase savings_funds upsert error:', error);
    } catch (err) {
      console.error('Direct saveSavingsFunds error:', err);
    }
  };

  const saveEmergencyCurrent = (userId: string, val: number) => {
    setEmergencyCurrent(val);
    localStorage.setItem(`finance_em_curr_${userId}`, String(val));
    saveSavingsFundsDirect(userId, val, emergencyTarget, accumulationCurrent, accumulationTarget);
  };

  const saveEmergencyTarget = (userId: string, val: number) => {
    setEmergencyTarget(val);
    localStorage.setItem(`finance_em_tar_${userId}`, String(val));
    saveSavingsFundsDirect(userId, emergencyCurrent, val, accumulationCurrent, accumulationTarget);
  };

  const saveAccumulationCurrent = (userId: string, val: number) => {
    setAccumulationCurrent(val);
    localStorage.setItem(`finance_ac_curr_${userId}`, String(val));
    saveSavingsFundsDirect(userId, emergencyCurrent, emergencyTarget, val, accumulationTarget);
  };

  const saveAccumulationTarget = (userId: string, val: number) => {
    setAccumulationTarget(val);
    localStorage.setItem(`finance_ac_tar_${userId}`, String(val));
    saveSavingsFundsDirect(userId, emergencyCurrent, emergencyTarget, accumulationCurrent, val);
  };

  const saveSavingsHistory = useCallback(async (userId: string, data: any[]) => {
    setSavingsHistory(data);
    localStorage.setItem(`finance_sav_hist_${userId}`, JSON.stringify(data));

    if (!currentUser) return;
    try {
      await supabase.from('savings_history').delete().eq('user_id', userId);
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
        const { error } = await supabase.from('savings_history').insert(records);
        if (error) console.error('Supabase savings_history insert error:', error);
      }
    } catch (err) {
      console.error('Direct saveSavingsHistory error:', err);
    }
  }, [currentUser]);

  const saveBudgets = useCallback(async (userId: string, budgets: Record<string, number>) => {
    setCategoryBudgets(budgets);
    localStorage.setItem(`finance_budgets_${userId}`, JSON.stringify(budgets));

    if (!currentUser) return;
    try {
      const records = Object.keys(budgets).map(cat => ({
        id: `${userId}_${cat}`,
        user_id: userId,
        teacher_name: currentUser.teacherName || 'Admin',
        category: cat,
        amount: Number(budgets[cat]) || 0,
        updated_at: new Date().toISOString()
      }));
      if (records.length > 0) {
        const { error } = await supabase.from('category_budgets').upsert(records, { onConflict: 'id' });
        if (error) console.error('Supabase category_budgets upsert error:', error);
      }
    } catch (err) {
      console.error('Direct saveBudgets error:', err);
    }
  }, [currentUser]);

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
      if (s.status === 'Chưa dạy' && s.auto_checkin !== false && s.auto_check_in !== false) {
        const sDate = s.date;
        const sTime = formatCleanTimeString(s.time);

        const isPastDay = sDate < todayStr;
        const isTodayDue = sDate === todayStr && currentTimeStr >= sTime;

        if (isPastDay || isTodayDue) {
          idsToUpdate.push(s.id);
          return { ...s, status: 'Đã dạy' };
        }
      }
      return s;
    });

    if (idsToUpdate.length > 0) {
      try {
        await supabase
          .from('sessions')
          .update({ status: 'Đã dạy' })
          .in('id', idsToUpdate);
      } catch (err) {
        console.error('Error auto checking-in sessions:', err);
      }
      return updatedSessions;
    }

    return items;
  }, []);

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
        const processed = await processAutoCheckIn(data as Session[]);
        setSessions(processed);
        calculateStats(processed);
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
        const processedAll = await processAutoCheckIn(data as Session[]);
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
  // Preceding Roll-Over Surplus calculation (leftover money from previous months)
  const getPrecedingRollOverBalance = useCallback((targetMonthStr: string) => {
    if (!targetMonthStr) return 0;
    const targetSessions = currentUser?.role === 'admin' ? allSessions : sessions;

    const prevManualInc = manualTransactions
      .filter(t => t.type === 'income' && t.date && t.date.substring(0, 7) < targetMonthStr)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const prevAutoInc = targetSessions
      .filter(s => s.status === 'Đã dạy' && s.date && s.date.substring(0, 7) < targetMonthStr)
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
      .filter(s => s.status === 'Đã dạy')
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
      .filter(s => s.status === 'Đã dạy' && s.month_year === monthStr)
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
      .filter(s => s.status === 'Đã dạy' && chartSelectedMonths.includes(s.month_year))
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
    const updated = manualTransactions.filter(t => t.id !== confirmDeleteTxId);
    saveTransactions(userId, updated);
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
          teachers={teachers}
          currentUser={currentUser}
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
