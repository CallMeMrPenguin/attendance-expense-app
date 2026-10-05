import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types/auth';
import { DEFAULT_CATEGORY_KEYWORDS } from '@/lib/constants/categories';
import { useToast } from '@/context/ToastContext';

interface UseBankReceiptsProps {
  currentUser: UserProfile | null;
  runBackgroundSave: (task: () => Promise<any>) => Promise<void>;
  categoryKeywords: Record<string, string>;
  activeTab: string;
  setManualTransactions: React.Dispatch<React.SetStateAction<any[]>>;
}

export function useBankReceipts({
  currentUser,
  runBackgroundSave,
  categoryKeywords,
  activeTab,
  setManualTransactions
}: UseBankReceiptsProps) {
  const { showToast } = useToast();
  const [bankReceipts, setBankReceipts] = useState<any[]>([]);
  const [deletedTxIds, setDeletedTxIds] = useState<string[]>([]);

  const updateReceiptsState = useCallback((newReceipts: any[]) => {
    setBankReceipts(prev => {
      const map = new Map();
      prev.forEach(r => map.set(r.id, r));
      let hasChanges = false;
      newReceipts.forEach(r => {
        const existing = map.get(r.id);
        if (!existing) {
          hasChanges = true;
          map.set(r.id, r);
        } else {
          let fieldChanged = false;
          for (const k of Object.keys(r)) {
            if (existing[k] !== r[k]) {
              fieldChanged = true;
              break;
            }
          }
          if (fieldChanged) {
            hasChanges = true;
            map.set(r.id, { ...existing, ...r });
          }
        }
      });
      if (!hasChanges) return prev;
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
    type: 'income' | 'expense' | 'saving' | 'exchange',
    category: string,
    createRule: boolean,
    matchField: string,
    matchValue: string,
    note?: string
  ) => {
    // Remove from deletedTxIds if user explicitly re-classifies manually
    if (currentUser?.id) {
      setDeletedTxIds(prev => {
        const cleanReceiptId = String(receiptId).replace(/^tx-receipt-/, '');
        const rawId = cleanReceiptId.replace(/^(vcb-)+/, '');
        const idsToRemove = [
          receiptId,
          cleanReceiptId,
          rawId,
          `vcb-${rawId}`,
          `tx-receipt-${receiptId}`,
          `tx-receipt-${rawId}`,
          `tx-receipt-vcb-${rawId}`
        ];
        return prev.filter(id => !idsToRemove.includes(id));
      });
    }

    const trimmedNote = (note || '').trim();

    // 1. Optimistic instant local update for receipts
    setBankReceipts(prev => {
      return prev.map(r => {
        if (r.id === receiptId) {
          const baseDetails = (r.details || '').split(' | Ghi chú: ')[0];
          const updatedDetails = trimmedNote ? `${baseDetails} | Ghi chú: ${trimmedNote}` : baseDetails;
          return {
            ...r,
            status: 'classified',
            type,
            category,
            note: trimmedNote,
            details: updatedDetails
          };
        }
        return r;
      });
    });

    // 2. Optimistic instant local update for manual transactions
    const targetReceipt = bankReceipts.find(r => r.id === receiptId);
    if (targetReceipt) {
      const baseDetails = (targetReceipt.details || '').split(' | Ghi chú: ')[0];
      const notePrefix = trimmedNote ? `${trimmedNote} ` : '';
      const sName = targetReceipt.remitter_name || targetReceipt.sender_name || (targetReceipt.debit_account?.includes('9981397845') ? 'PHAM THI THU TRANG' : 'BUI DUC HUNG');
      const bName = targetReceipt.beneficiary_name || '';
      const descText = `${notePrefix}[Biên lai Vietcombank] ${sName} ➔ ${bName}: ${baseDetails}`;
      const txId = `tx-receipt-${receiptId}`;
      const txType = type === 'saving' ? 'expense' : type;
      const newTxObj = {
        id: txId,
        desc: descText,
        amount: Number(targetReceipt.amount) || 0,
        type: txType,
        category,
        date: targetReceipt.trans_date || new Date().toISOString().split('T')[0],
        isRecurring: false,
        isManual: true
      };
      setManualTransactions(prev => {
        const existingIndex = prev.findIndex(t => t.id === txId || t.id.includes(receiptId));
        if (existingIndex >= 0) {
          const nextArr = [...prev];
          nextArr[existingIndex] = newTxObj;
          return nextArr;
        } else {
          return [newTxObj, ...prev];
        }
      });
    }

    showToast('Đã phân loại biên lai!', 'success');

    // 3. Non-blocking background save to API & Supabase
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
            matchValue,
            note: trimmedNote
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.receipts)) {
            updateReceiptsState(data.receipts);
            try {
              const txRes = await supabase
                .from('manual_transactions')
                .select('*')
                .order('date', { ascending: false });
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
            } catch (e) {}
          }
        }
      } catch (err) {
        console.error('Error in background receipt classification:', err);
      }
    });
  }, [currentUser, bankReceipts, showToast, updateReceiptsState, runBackgroundSave, setManualTransactions]);

  const handleUnclassifyReceipt = useCallback((receiptId: string) => {
    const rawId = String(receiptId).replace(/^tx-receipt-/, '').replace(/^(vcb-)+/, '');
    const possibleIds = [
      receiptId,
      rawId,
      `vcb-${rawId}`,
      `vcb-vcb-${rawId}`,
      `tx-receipt-${receiptId}`,
      `tx-receipt-${rawId}`,
      `tx-receipt-vcb-${rawId}`,
      `tx-receipt-vcb-vcb-${rawId}`
    ];

    if (currentUser?.id) {
      setDeletedTxIds(prev => [...prev, ...possibleIds]);
    }

    setBankReceipts(prev => {
      return prev.map(r => {
        const rRaw = String(r.id || '').replace(/^tx-receipt-/, '').replace(/^(vcb-)+/, '');
        if (possibleIds.includes(r.id) || rRaw === rawId) {
          const baseDetails = (r.details || '').split(' | Ghi chú: ')[0];
          return {
            ...r,
            status: 'unclassified' as const,
            type: undefined,
            category: undefined,
            details: baseDetails,
            note: undefined
          };
        }
        return r;
      });
    });

    setManualTransactions(prev => prev.filter(t => {
      const tRaw = String(t.id || '').replace(/^tx-receipt-/, '').replace(/^(vcb-)+/, '');
      return !possibleIds.includes(t.id) && tRaw !== rawId;
    }));

    showToast('Đã chuyển biên lai về Chưa phân loại!', 'success');

    runBackgroundSave(async () => {
      try {
        const res = await fetch('/api/bank-receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiptId,
            unclassify: true,
            userId: currentUser?.id
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.receipts)) {
            updateReceiptsState(data.receipts);
          }
        }
      } catch (err) {
        console.error('handleUnclassifyReceipt error:', err);
      }
    });
  }, [currentUser, updateReceiptsState, showToast, runBackgroundSave, setManualTransactions]);

  const handleSyncReceipts = useCallback(async () => {
    try {
      const activeKeywords = { ...DEFAULT_CATEGORY_KEYWORDS, ...categoryKeywords };

      const res = await fetch('/api/bank-receipts/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: activeKeywords, userId: currentUser?.id })
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
  }, [showToast, updateReceiptsState, currentUser?.id, deletedTxIds, categoryKeywords, setManualTransactions]);

  // Trigger Gmail IMAP scan ONLY when user switches to Dòng tiền (Flow) tab from another tab
  const prevActiveTabRef = useRef<string>(activeTab);
  useEffect(() => {
    if (activeTab === 'flow' && prevActiveTabRef.current !== 'flow' && currentUser?.id) {
      handleSyncReceipts();
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab, currentUser?.id, handleSyncReceipts]);

  // Fetch bank receipts on mount and 60-second periodic poll
  useEffect(() => {
    fetchBankReceipts();

    const interval = setInterval(() => {
      fetchBankReceipts();
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchBankReceipts]);

  return {
    bankReceipts,
    setBankReceipts,
    deletedTxIds,
    setDeletedTxIds,
    updateReceiptsState,
    fetchBankReceipts,
    handleClassifyReceipt,
    handleUnclassifyReceipt,
    handleSyncReceipts
  };
}
