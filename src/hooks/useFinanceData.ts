import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types/auth';
import {
  DEFAULT_CATEGORY_ICONS,
  DEFAULT_CATEGORY_NOTES,
  DEFAULT_CATEGORY_KEYWORDS
} from '@/lib/constants/categories';

interface UseFinanceDataProps {
  currentUser: UserProfile | null;
  runBackgroundSave: (task: () => Promise<any>) => Promise<void>;
  bankReceipts: any[];
  setBankReceipts: React.Dispatch<React.SetStateAction<any[]>>;
  setDeletedTxIds: React.Dispatch<React.SetStateAction<string[]>>;
  chartSelectedMonths: string[];
}

export function useFinanceData({
  currentUser,
  runBackgroundSave,
  bankReceipts,
  setBankReceipts,
  setDeletedTxIds,
  chartSelectedMonths
}: UseFinanceDataProps) {
  // Financial data states
  const [manualTransactions, setManualTransactions] = useState<any[]>([]);
  const [emergencyCurrent, setEmergencyCurrent] = useState<number>(0);
  const [emergencyTarget, setEmergencyTarget] = useState<number>(30000000);
  const [accumulationCurrent, setAccumulationCurrent] = useState<number>(0);
  const [accumulationTarget, setAccumulationTarget] = useState<number>(150000000);
  const [savingsHistory, setSavingsHistory] = useState<any[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>({});
  const [categoryTypes, setCategoryTypes] = useState<Record<string, 'income' | 'expense'>>({});
  const [categoryIcons, setCategoryIcons] = useState<Record<string, string>>({});
  const [categoryNotes, setCategoryNotes] = useState<Record<string, string>>({});
  const [categoryKeywords, setCategoryKeywords] = useState<Record<string, string>>({});
  const [trangAccountBalance, setTrangAccountBalance] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('__TRANG_ACCOUNT_BALANCE__');
      if (saved && !isNaN(Number(saved))) return Number(saved);
    }
    return 5000000;
  });

  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState<string | null>(null);

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
          supabase.from('manual_transactions').select('*').order('date', { ascending: false }),
          supabase.from('savings_funds').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('category_budgets').select('*').order('updated_at', { ascending: true }),
          supabase.from('savings_history').select('*').order('date', { ascending: false })
        ]);

        if (txRes.data) {
          const formatted = txRes.data.map((t: any) => {
            const rawDesc = t.desc_text || t.desc || '';
            const isRecurring = !!(t.isRecurring || t.is_recurring || /^\[(CỐ ĐỊNH|RECURRING)\]/i.test(rawDesc));
            const desc = rawDesc.replace(/^\[(CỐ ĐỊNH|RECURRING)\]\s*/i, '');
            return {
              id: t.id,
              desc,
              amount: Number(t.amount) || 0,
              type: t.type,
              category: t.category,
              date: t.date,
              isRecurring,
              isManual: true
            };
          });
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
            if (b.category === '__TRANG_ACCOUNT_BALANCE__' || b.id === 'trang_account_balance') {
              const val = Number(b.amount) || 5000000;
              setTrangAccountBalance(val);
              if (typeof window !== 'undefined') localStorage.setItem('__TRANG_ACCOUNT_BALANCE__', String(val));
              return;
            }
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

            if (b.note && typeof b.note === 'string' && b.note.startsWith('{')) {
              try {
                const parsed = JSON.parse(b.note);
                if (parsed.text !== undefined) note = parsed.text;
                if (parsed.kw !== undefined && parsed.kw !== null) kw = parsed.kw;
                if (parsed.icon !== undefined && parsed.icon !== null) icon = parsed.icon;
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

          // Auto-sync missing savings history entries into manual transactions to ensure monthly surplus is deducted/credited
          if (txRes.data && currentUser?.id) {
            const existingTxIds = new Set(txRes.data.map((t: any) => t.id));
            const missingSavingsTxs: any[] = [];
            for (const h of formatted) {
              const cleanId = String(h.id).replace(/^sh-/, '');
              const possibleIds = [`tx-sh-${h.id}`, `tx-sh-${cleanId}`, `tx-sh-sh-${cleanId}`];
              const exists = possibleIds.some(id => existingTxIds.has(id));
              if (!exists) {
                const isDeposit = h.type === 'deposit';
                const fundTitle = h.fund === 'emergency' ? 'Quỹ Dự Phòng' : 'Quỹ Tích Lũy';
                missingSavingsTxs.push({
                  id: `tx-sh-${h.id}`,
                  user_id: currentUser.id,
                  user_name: currentUser.teacherName || 'ADMIN',
                  desc_text: isDeposit ? `Chuyển tiền vào ${fundTitle}` : `Rút tiền từ ${fundTitle}`,
                  amount: Number(h.amount) || 0,
                  type: 'exchange',
                  category: 'Trao đổi',
                  date: h.date || new Date().toISOString().split('T')[0]
                });
              }
            }

            if (missingSavingsTxs.length > 0) {
              await (supabase.from('manual_transactions') as any).upsert(missingSavingsTxs, { onConflict: 'id' });
              const { data: refreshedTxs } = await supabase.from('manual_transactions').select('*').order('date', { ascending: false });
              if (refreshedTxs) {
                const updatedList = refreshedTxs.map((t: any) => {
                  const rawDesc = t.desc_text || t.desc || '';
                  const isRecurring = !!(t.isRecurring || t.is_recurring || /^\[(CỐ ĐỊNH|RECURRING)\]/i.test(rawDesc));
                  const desc = rawDesc.replace(/^\[(CỐ ĐỊNH|RECURRING)\]\s*/i, '');
                  return {
                    id: t.id,
                    desc,
                    amount: Number(t.amount) || 0,
                    type: t.type,
                    category: t.category,
                    date: t.date,
                    isRecurring,
                    isManual: true
                  };
                });
                setManualTransactions(updatedList);
              }
            }
          }
        }
      } catch (err) {
        console.error('Direct Supabase cloud fetch error:', err);
      }
    };

    fetchFinanceCloud();
  }, [currentUser]);

  // Direct Supabase Save Helpers
  const saveTransactions = useCallback((userId: string, data: any[]) => {
    setManualTransactions(data);

    // Keep bankReceipts state in sync if any receipt transaction was modified
    const receiptUpdates = new Map<string, any>(
      data
        .filter(t => t.id && String(t.id).startsWith('tx-receipt-'))
        .map(t => [String(t.id).replace('tx-receipt-', '').replace('vcb-', ''), t])
    );
    if (receiptUpdates.size > 0) {
      setBankReceipts(prev => prev.map(r => {
        const cleanId = String(r.id).replace('vcb-', '');
        const updated = receiptUpdates.get(cleanId);
        if (updated) {
          return {
            ...r,
            type: updated.type,
            category: updated.category,
            details: updated.desc || r.details
          };
        }
        return r;
      }));
    }

    if (!currentUser) return;
    const teacherName = currentUser.teacherName || 'Admin';
    runBackgroundSave(async () => {
      try {
        if (data.length > 0) {
          const records = data.map(t => {
            const isRecurring = !!(t.isRecurring || t.is_recurring);
            const cleanDesc = (t.desc || t.desc_text || '').replace(/^\[(CỐ ĐỊNH|RECURRING)\]\s*/i, '');
            const desc_text = isRecurring ? `[CỐ ĐỊNH] ${cleanDesc}` : cleanDesc;
            return {
              id: t.id || `tx-${Date.now()}-${Math.random()}`,
              user_id: userId,
              user_name: teacherName,
              desc_text,
              amount: Number(t.amount) || 0,
              type: t.type,
              category: t.category,
              date: t.date
            };
          });
          const { error } = await (supabase.from('manual_transactions') as any).upsert(records, { onConflict: 'id' });
          if (error) {
            console.error('Supabase manual_transactions upsert error:', error.message);
            const fallbackRecords = records.map(({ user_name, ...rest }: any) => ({ ...rest, teacher_name: user_name }));
            await (supabase.from('manual_transactions') as any).upsert(fallbackRecords, { onConflict: 'id' });
          }

          // Keep bank_receipts table in sync if receipt transactions were modified
          const receiptRecords = data.filter(t => t.id && String(t.id).startsWith('tx-receipt-'));
          for (const rt of receiptRecords) {
            const rawId = String(rt.id).replace('tx-receipt-', '');
            const cleanId = rawId.replace(/^vcb-/, '');
            await (supabase.from('bank_receipts') as any)
              .update({ type: rt.type, category: rt.category })
              .or(`id.eq.${rawId},id.eq.vcb-${cleanId},id.eq.${cleanId}`);
          }
        }
      } catch (err) {
        console.error('Direct saveTransactions error:', err);
      }
    });
  }, [currentUser, runBackgroundSave, setBankReceipts]);

  const saveSavingsFundsDirect = useCallback((userId: string, emCurr: number, emTar: number, acCurr: number, acTar: number) => {
    if (!currentUser) return;
    runBackgroundSave(async () => {
      try {
        const payload = {
          user_id: 'aae79676-8bc1-4cce-8f5d-e78379a6abc4',
          user_name: 'Shared Admin',
          emergency_current: emCurr,
          emergency_target: emTar,
          accumulation_current: acCurr,
          accumulation_target: acTar,
          updated_at: new Date().toISOString()
        };
        const { error } = await (supabase.from('savings_funds') as any).upsert(payload, { onConflict: 'user_id' });
        if (error) {
          console.error('Supabase savings_funds upsert error:', error.message);
          const { user_name, ...fallbackPayload } = payload as any;
          fallbackPayload.teacher_name = user_name;
          await (supabase.from('savings_funds') as any).upsert(fallbackPayload, { onConflict: 'user_id' });
        }
      } catch (err) {
        console.error('Direct saveSavingsFunds error:', err);
      }
    });
  }, [currentUser, runBackgroundSave]);

  const saveEmergencyCurrent = useCallback((userId: string, val: number) => {
    setEmergencyCurrent(val);
    saveSavingsFundsDirect(userId, val, emergencyTarget, accumulationCurrent, accumulationTarget);
  }, [emergencyTarget, accumulationCurrent, accumulationTarget, saveSavingsFundsDirect]);

  const saveEmergencyTarget = useCallback((userId: string, val: number) => {
    setEmergencyTarget(val);
    saveSavingsFundsDirect(userId, emergencyCurrent, val, accumulationCurrent, accumulationTarget);
  }, [emergencyCurrent, accumulationCurrent, accumulationTarget, saveSavingsFundsDirect]);

  const saveAccumulationCurrent = useCallback((userId: string, val: number) => {
    setAccumulationCurrent(val);
    saveSavingsFundsDirect(userId, emergencyCurrent, emergencyTarget, val, accumulationTarget);
  }, [emergencyCurrent, emergencyTarget, accumulationTarget, saveSavingsFundsDirect]);

  const saveAccumulationTarget = useCallback((userId: string, val: number) => {
    setAccumulationTarget(val);
    saveSavingsFundsDirect(userId, emergencyCurrent, emergencyTarget, accumulationCurrent, val);
  }, [emergencyCurrent, emergencyTarget, accumulationCurrent, saveSavingsFundsDirect]);

  const saveSavingsHistory = useCallback((userId: string, data: any[]) => {
    setSavingsHistory(data);

    if (!currentUser) return;
    runBackgroundSave(async () => {
      try {
        if (data.length > 0) {
          const records = data.map(h => ({
            id: h.id || `sh-${Date.now()}-${Math.random()}`,
            user_id: userId,
            user_name: currentUser.teacherName || 'Admin',
            fund: h.fund,
            type: h.type,
            amount: Number(h.amount) || 0,
            date: h.date
          }));
          const { error } = await (supabase.from('savings_history') as any).upsert(records, { onConflict: 'id' });
          if (error) {
            console.error('Supabase savings_history upsert error:', error.message);
            const fallbackRecords = records.map(({ user_name, ...rest }: any) => ({ ...rest, teacher_name: user_name }));
            await (supabase.from('savings_history') as any).upsert(fallbackRecords, { onConflict: 'id' });
          }
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
    const targetTypes = { ...categoryTypes, ...catTypes };
    const targetIcons = { ...categoryIcons, ...catIcons };
    const targetNotes = { ...categoryNotes, ...catNotes };
    const targetKeywords = { ...categoryKeywords, ...keywords };

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
        const records = Object.keys(budgets).map((cat, idx) => {
          const type = targetTypes[cat] || (['Lương', 'Giáo dục', 'Đầu tư', 'Gia Sư'].includes(cat) ? 'income' : 'expense');
          const kw = targetKeywords[cat] !== undefined ? targetKeywords[cat] : (DEFAULT_CATEGORY_KEYWORDS[cat] || '');
          const icon = targetIcons[cat] || DEFAULT_CATEGORY_ICONS[cat] || (type === 'income' ? 'TrendingUp' : 'Coins');
          const noteText = targetNotes[cat] || DEFAULT_CATEGORY_NOTES[cat] || (type === 'income' ? 'Thu nhập khác' : 'Chi phí khác');
          const notePayload = JSON.stringify({ text: noteText, kw: kw });
          const record: any = {
            id: cat,
            user_id: userId,
            user_name: currentUser.userName || currentUser.teacherName || 'Admin',
            category: cat,
            amount: Number(budgets[cat]) || 0,
            type: type,
            icon: icon,
            note: notePayload,
            updated_at: new Date(Date.now() + idx * 100).toISOString()
          };
          return record;
        });

        if (records.length > 0) {
          const { error } = await (supabase.from('category_budgets') as any).upsert(records, { onConflict: 'id' });
          if (error) {
            console.error('Supabase category_budgets upsert error:', error.message);
            const fallbackRecords = records.map(({ user_name, ...rest }: any) => ({ ...rest, teacher_name: user_name }));
            await (supabase.from('category_budgets') as any).upsert(fallbackRecords, { onConflict: 'id' });
          }
        }
      } catch (err) {
        console.error('Direct saveBudgets error:', err);
      }
    });
  }, [currentUser, runBackgroundSave, categoryTypes, categoryIcons, categoryNotes, categoryKeywords]);

  const saveTrangAccountBalance = useCallback((val: number) => {
    setTrangAccountBalance(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('__TRANG_ACCOUNT_BALANCE__', String(val));
    }
    if (!currentUser) return;

    runBackgroundSave(async () => {
      try {
        const payload = {
          id: 'trang_account_balance',
          user_id: currentUser.id,
          user_name: currentUser.userName || currentUser.teacherName || 'ADMIN',
          category: '__TRANG_ACCOUNT_BALANCE__',
          amount: val,
          type: 'settings',
          icon: 'Wallet',
          note: JSON.stringify({ initial_balance: val }),
          updated_at: new Date().toISOString()
        };
        const { error } = await (supabase.from('category_budgets') as any).upsert(payload, { onConflict: 'id' });
        if (error && error.code === 'PGRST204') {
          const { user_name, ...cleanPayload } = payload;
          await (supabase.from('category_budgets') as any).upsert(cleanPayload, { onConflict: 'id' });
        }
      } catch (e) {}
    });
  }, [currentUser, runBackgroundSave]);

  const handleDeleteManualTx = useCallback((id: string) => {
    setConfirmDeleteTxId(id);
  }, []);

  const executeDeleteManualTx = useCallback(() => {
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
        } else if (idToDelete.startsWith('tx-sh-')) {
          const shId = idToDelete.replace('tx-sh-', '');
          const matchHist = savingsHistory.find(h => h.id === shId || `sh-${h.id}` === shId);
          if (matchHist) {
            if (matchHist.fund === 'emergency') {
              const reverted = matchHist.type === 'deposit'
                ? Math.max(0, emergencyCurrent - Number(matchHist.amount))
                : emergencyCurrent + Number(matchHist.amount);
              saveEmergencyCurrent(userId, reverted);
            } else {
              const reverted = matchHist.type === 'deposit'
                ? Math.max(0, accumulationCurrent - Number(matchHist.amount))
                : accumulationCurrent + Number(matchHist.amount);
              saveAccumulationCurrent(userId, reverted);
            }
            const updatedHist = savingsHistory.filter(h => h.id !== matchHist.id && `sh-${h.id}` !== shId);
            saveSavingsHistory(userId, updatedHist);
          }
        }
      } catch (err) {
        console.error('Error deleting manual transaction from DB:', err);
      }
    });

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
  }, [
    currentUser,
    confirmDeleteTxId,
    manualTransactions,
    runBackgroundSave,
    savingsHistory,
    emergencyCurrent,
    accumulationCurrent,
    saveEmergencyCurrent,
    saveAccumulationCurrent,
    saveSavingsHistory,
    setBankReceipts,
    setDeletedTxIds
  ]);

  // Unified Finance Transactions: manual transactions + classified bank receipts
  const allFinanceTransactions = useMemo(() => {
    const receiptTransactions = (bankReceipts || [])
      .filter(r => r.status === 'classified' && r.category)
      .map(r => ({
        id: `tx-receipt-${r.id}`,
        desc: r.details || `Biên lai ${r.order_number || ''}`,
        amount: Number(r.amount) || 0,
        type: (r.type || 'expense') as 'income' | 'expense' | 'exchange',
        category: r.category,
        date: r.trans_date ? r.trans_date.substring(0, 10) : (r.created_at ? r.created_at.substring(0, 10) : ''),
        isManual: true,
        isRecurring: false,
        isFromReceipt: true,
        orderNumber: r.order_number
      }));

    const cleanReceiptIds = new Set(
      receiptTransactions.map(t => String(t.id).replace('tx-receipt-', '').replace('vcb-', ''))
    );

    const filteredManual = (manualTransactions || []).filter(t => {
      const cId = String(t.id).replace('tx-receipt-', '').replace('vcb-', '');
      return !cleanReceiptIds.has(cId);
    });

    return [...filteredManual, ...receiptTransactions].sort(
      (a, b) => (b.date || '').localeCompare(a.date || '')
    );
  }, [bankReceipts, manualTransactions]);

  const availableIncomeCats = useMemo(() => {
    const list = Object.keys(categoryBudgets).filter(c => !c.startsWith('__') && categoryTypes[c] === 'income');
    return list.length > 0 ? list : ['Gia Sư', 'Lương', 'Thu Nợ', 'Khác'];
  }, [categoryBudgets, categoryTypes]);

  const getPrecedingRollOverBalance = useCallback((targetMonthStr: string) => {
    if (!targetMonthStr) return 0;

    const prevInc = allFinanceTransactions
      .filter(t => t.type === 'income' && t.date && t.date.substring(0, 7) < targetMonthStr)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const prevExp = allFinanceTransactions
      .filter(t => t.type === 'expense' && t.date && t.date.substring(0, 7) < targetMonthStr)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const prevNetSurplus = prevInc - prevExp;
    return Math.max(0, prevNetSurplus);
  }, [allFinanceTransactions]);

  const getTotalIncome = useCallback(() => {
    return allFinanceTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [allFinanceTransactions]);

  const getTotalExpense = useCallback(() => {
    return allFinanceTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [allFinanceTransactions]);

  const getMonthlyIncome = useCallback((monthStr: string) => {
    return allFinanceTransactions
      .filter(t => t.type === 'income' && t.date && t.date.startsWith(monthStr))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [allFinanceTransactions]);

  const getMonthlyExpense = useCallback((monthStr: string) => {
    return allFinanceTransactions
      .filter(t => t.type === 'expense' && t.date && t.date.startsWith(monthStr))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [allFinanceTransactions]);

  const getSelectedMonthsIncome = useCallback(() => {
    return allFinanceTransactions
      .filter(t => t.type === 'income' && chartSelectedMonths.includes((t.date || '').substring(0, 7)))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [allFinanceTransactions, chartSelectedMonths]);

  const getSelectedMonthsExpense = useCallback(() => {
    return allFinanceTransactions
      .filter(t => t.type === 'expense' && chartSelectedMonths.includes((t.date || '').substring(0, 7)))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [allFinanceTransactions, chartSelectedMonths]);

  const getWeeklyIncome = useCallback((monthStr: string, startDay: number, endDay: number) => {
    return allFinanceTransactions
      .filter(t => {
        if (t.type !== 'income' || !t.date || !t.date.startsWith(monthStr)) return false;
        const d = Number(t.date.split('-')[2]) || 1;
        return d >= startDay && d <= endDay;
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [allFinanceTransactions]);

  const getWeeklyExpense = useCallback((monthStr: string, startDay: number, endDay: number) => {
    return allFinanceTransactions
      .filter(t => {
        if (t.type !== 'expense' || !t.date || !t.date.startsWith(monthStr)) return false;
        const d = Number(t.date.split('-')[2]) || 1;
        return d >= startDay && d <= endDay;
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [allFinanceTransactions]);

  const getActualCategoryAmount = useCallback((cat: string, targetType?: 'income' | 'expense') => {
    const isInc = targetType 
      ? targetType === 'income' 
      : (categoryTypes[cat] ? categoryTypes[cat] === 'income' : ['Lương', 'Gia Sư', 'Giáo dục', 'Thu Nợ'].includes(cat));
    const expectedType = isInc ? 'income' : 'expense';

    return allFinanceTransactions
      .filter(t => {
        if (t.type !== expectedType) return false;
        if (!chartSelectedMonths.includes((t.date || '').substring(0, 7))) return false;
        if (t.category === cat) return true;
        if (cat === 'Gia Sư' && (t.category === 'Giáo dục' || t.category === 'Gia Sư')) return true;
        return false;
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [allFinanceTransactions, categoryTypes, chartSelectedMonths]);

  return {
    manualTransactions,
    setManualTransactions,
    emergencyCurrent,
    setEmergencyCurrent,
    emergencyTarget,
    setEmergencyTarget,
    accumulationCurrent,
    setAccumulationCurrent,
    accumulationTarget,
    setAccumulationTarget,
    savingsHistory,
    setSavingsHistory,
    categoryBudgets,
    setCategoryBudgets,
    categoryTypes,
    setCategoryTypes,
    categoryIcons,
    setCategoryIcons,
    categoryNotes,
    setCategoryNotes,
    categoryKeywords,
    setCategoryKeywords,
    trangAccountBalance,
    setTrangAccountBalance,
    confirmDeleteTxId,
    setConfirmDeleteTxId,
    saveTransactions,
    saveEmergencyCurrent,
    saveEmergencyTarget,
    saveAccumulationCurrent,
    saveAccumulationTarget,
    saveSavingsHistory,
    saveBudgets,
    saveTrangAccountBalance,
    handleDeleteManualTx,
    executeDeleteManualTx,
    allFinanceTransactions,
    availableIncomeCats,
    getPrecedingRollOverBalance,
    getTotalIncome,
    getTotalExpense,
    getMonthlyIncome,
    getMonthlyExpense,
    getSelectedMonthsIncome,
    getSelectedMonthsExpense,
    getWeeklyIncome,
    getWeeklyExpense,
    getActualCategoryAmount
  };
}
