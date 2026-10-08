'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error' | 'idle';

export interface SyncStats {
  appliedRecords: number;
  appliedDeletions: number;
  conflictsResolved: number;
  outgoingRecords: number;
  outgoingDeletions: number;
}

export function useSyncManager() {
  const [status, setStatus] = useState<SyncState>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('Sẵn sàng đồng bộ');
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [remoteUrl, setRemoteUrl] = useState<string>('https://chamcong.upkidscentermanager.io.vn');
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const isSyncingRef = useRef(false);

  // Lấy trạng thái đồng bộ ban đầu
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sync', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLastSyncTime(data.last_synced_at || null);
          if (data.remote_sync_url) setRemoteUrl(data.remote_sync_url);
          if (data.table_counts) setTableCounts(data.table_counts);
        }
      }
    } catch (e) {
      // Bỏ qua lỗi mạng nội bộ
    }
  }, []);

  // Kích hoạt đồng bộ hai chiều (Local <-> Web Server)
  const syncNow = useCallback(async (forceFullSync: boolean = false) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setStatus('syncing');
    setMessage('Đang kết nối và đồng bộ hai chiều...');

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger', forceFullSync }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus('synced');
        setMessage(data.message || 'Đồng bộ hai chiều thành công');
        if (data.stats) setStats(data.stats);
        if (data.serverTime) setLastSyncTime(data.serverTime);

        // Kích hoạt custom event để các bảng dữ liệu trên trang tự refresh nếu có bản ghi mới
        if (typeof window !== 'undefined' && (data.stats?.appliedRecords > 0 || data.stats?.appliedDeletions > 0)) {
          window.dispatchEvent(new CustomEvent('chamcong:data-synced', { detail: data.stats }));
        }
      } else {
        if (data.isOffline) {
          setStatus('offline');
          setMessage(data.message || 'Web Server ngoại tuyến. Dữ liệu đang được lưu an toàn tại máy cục bộ.');
        } else {
          setStatus('error');
          setMessage(data.message || 'Lỗi trong quá trình đồng bộ.');
        }
      }
    } catch (err: any) {
      setStatus('offline');
      setMessage('Không thể kết nối máy chủ Web. Đang vận hành ở chế độ Local an toàn.');
    } finally {
      isSyncingRef.current = false;
      fetchStatus();
    }
  }, [fetchStatus]);

  // Kiểm tra kết nối độc lập tới Web Server
  const testConnection = useCallback(async (customUrl?: string) => {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_connection',
          remoteUrl: customUrl || remoteUrl,
        }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, isOnline: false, message: e.message };
    }
  }, [remoteUrl]);

  // Lưu cấu hình Remote Sync URL mới
  const saveRemoteUrl = useCallback(async (url: string) => {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_remote_url', url }),
      });
      const data = await res.json();
      if (data.success && data.remote_sync_url) {
        setRemoteUrl(data.remote_sync_url);
      }
      return data;
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, []);

  // Tự động kiểm tra và đồng bộ định kỳ (mỗi 45 giây)
  useEffect(() => {
    fetchStatus();

    // Lần sync đầu tiên sau khi app load 3 giây
    const initialTimer = setTimeout(() => {
      syncNow(false);
    }, 3000);

    const interval = setInterval(() => {
      if (navigator.onLine && !isSyncingRef.current) {
        syncNow(false);
      }
    }, 45000);

    const handleOnline = () => {
      syncNow(false);
    };

    window.addEventListener('online', handleOnline);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchStatus, syncNow]);

  return {
    status,
    lastSyncTime,
    message,
    stats,
    remoteUrl,
    tableCounts,
    syncNow,
    testConnection,
    saveRemoteUrl,
    refreshStatus: fetchStatus,
  };
}
