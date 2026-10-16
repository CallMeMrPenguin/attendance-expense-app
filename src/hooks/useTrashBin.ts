'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

export interface TrashItem {
  id: string;
  item_type: 'schedule' | 'session' | 'transaction';
  item_name: string;
  item_data: string; // JSON payload
  related_user?: string;
  scope?: string;
  deleted_month?: string;
  deleted_at: string;
  expires_at: string;
  updated_at?: string;
}

export function useTrashBin() {
  const { showToast } = useToast();
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch trash items from DB
  const fetchTrashItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('trash_items')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        setTrashItems(data as TrashItem[]);
      }
    } catch (err) {
      console.error('Error fetching trash items:', err);
    }
  }, []);

  // Move an item to trash with 30-day auto-purge expiration
  const moveToTrash = useCallback(async (params: {
    item_type: 'schedule' | 'session' | 'transaction';
    item_name: string;
    item_data: any;
    related_user?: string;
    scope?: string;
    deleted_month?: string;
  }) => {
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // exactly 30 days
    const trashId = `trash_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const record: TrashItem = {
      id: trashId,
      item_type: params.item_type,
      item_name: params.item_name,
      item_data: typeof params.item_data === 'string' ? params.item_data : JSON.stringify(params.item_data),
      related_user: params.related_user || '',
      scope: params.scope || 'single',
      deleted_month: params.deleted_month || '',
      deleted_at: now.toISOString(),
      expires_at: expires.toISOString(),
      updated_at: now.toISOString(),
    };

    // Optimistically add to state
    setTrashItems(prev => [record, ...prev]);

    try {
      await (supabase.from('trash_items') as any).upsert([record], { onConflict: 'id' });
    } catch (err) {
      console.error('Error saving to trash_items:', err);
    }
  }, []);

  // Restore an item from trash
  const restoreTrashItem = useCallback(async (
    item: TrashItem,
    onRestoredCallback?: () => void
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const parsedData = JSON.parse(item.item_data);

      if (item.item_type === 'schedule') {
        const sessionsList = parsedData.sessions || (Array.isArray(parsedData) ? parsedData : []);
        const teacherName = parsedData.teacherName || item.related_user;
        const jobName = parsedData.jobName || item.item_name;
        const targetMonth = parsedData.month || item.deleted_month;

        // 1. Restore sessions into database
        if (sessionsList.length > 0) {
          const nowIso = new Date().toISOString();
          const refreshedSessions = sessionsList.map((s: any) => ({
            ...s,
            updated_at: nowIso
          }));
          await (supabase.from('sessions') as any).upsert(refreshedSessions, { onConflict: 'id' });
        }

        // 2. Remove from exclusions if present
        if (teacherName && jobName) {
          const cleanKey = jobName.trim().toLowerCase();
          const key = `schedule_exclusions_${teacherName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          
          try {
            const { data: cbData } = await supabase
              .from('category_budgets')
              .select('note')
              .eq('id', key)
              .maybeSingle();

            if (cbData?.note) {
              const parsed = JSON.parse(cbData.note);
              let changed = false;
              if (targetMonth && parsed[targetMonth]) {
                parsed[targetMonth] = parsed[targetMonth].filter((x: string) => x.toLowerCase() !== cleanKey);
                changed = true;
              }
              if (parsed['all']) {
                parsed['all'] = parsed['all'].filter((x: string) => x.toLowerCase() !== cleanKey);
                changed = true;
              }
              if (changed) {
                await (supabase.from('category_budgets') as any).upsert({
                  id: key,
                  note: JSON.stringify(parsed),
                  updated_at: new Date().toISOString()
                }, { onConflict: 'id' });
              }
            }
          } catch (e) {}
        }

        showToast(`Đã khôi phục thành công lịch trình "${item.item_name}"!`, 'success');
      } else if (item.item_type === 'session') {
        const s = parsedData;
        const nowIso = new Date().toISOString();
        await (supabase.from('sessions') as any).upsert([{ ...s, updated_at: nowIso }], { onConflict: 'id' });
        showToast(`Đã khôi phục thành công ca dạy "${item.item_name}"!`, 'success');
      } else if (item.item_type === 'transaction') {
        const tx = parsedData;
        const rec = {
          id: tx.id || `tx_${Date.now()}`,
          user_id: tx.user_id || '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
          user_name: tx.user_name || item.related_user || 'ADMIN',
          desc_text: tx.desc || tx.desc_text || item.item_name,
          amount: Number(tx.amount) || 0,
          type: tx.type || 'expense',
          category: tx.category || 'Khác',
          date: tx.date || new Date().toISOString().substring(0, 10),
          created_at: tx.created_at || new Date().toISOString()
        };
        await (supabase.from('manual_transactions') as any).upsert([rec], { onConflict: 'id' });
        showToast(`Đã khôi phục giao dịch "${item.item_name}"!`, 'success');
      }

      // Delete from trash_items
      await supabase.from('trash_items').delete().eq('id', item.id);
      setTrashItems(prev => prev.filter(t => t.id !== item.id));

      if (onRestoredCallback) {
        onRestoredCallback();
      }

      return true;
    } catch (err: any) {
      console.error('Error restoring trash item:', err);
      showToast(err.message || 'Lỗi khi khôi phục mục.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Permanently delete single item from trash
  const permanentlyDeleteTrashItem = useCallback(async (id: string) => {
    try {
      await supabase.from('trash_items').delete().eq('id', id);
      setTrashItems(prev => prev.filter(t => t.id !== id));
      showToast('Đã xóa vĩnh viễn khỏi Thùng rác!', 'info');
    } catch (err: any) {
      showToast('Lỗi khi xóa mục khỏi Thùng rác.', 'error');
    }
  }, [showToast]);

  // Empty entire trash
  const emptyTrash = useCallback(async () => {
    try {
      if (trashItems.length === 0) return;
      const ids = trashItems.map(t => t.id);
      await supabase.from('trash_items').delete().in('id', ids);
      setTrashItems([]);
      showToast('Đã dọn dẹp sạch Thùng rác!', 'info');
    } catch (err) {
      showToast('Lỗi khi làm trống Thùng rác.', 'error');
    }
  }, [trashItems, showToast]);

  useEffect(() => {
    fetchTrashItems();
  }, [fetchTrashItems]);

  return {
    trashItems,
    loading,
    fetchTrashItems,
    moveToTrash,
    restoreTrashItem,
    permanentlyDeleteTrashItem,
    emptyTrash,
    trashCount: trashItems.length
  };
}
