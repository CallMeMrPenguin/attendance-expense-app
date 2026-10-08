import { getDb } from '@/lib/db';

export const SYNC_TABLES: Record<string, string> = {
  teachers: 'name',
  profiles: 'id',
  sessions: 'id',
  manual_transactions: 'id',
  savings_funds: 'user_id',
  category_budgets: 'id',
  savings_history: 'id',
  bank_receipts: 'id',
  receipt_rules: 'id',
  table_settings: 'id',
};

export interface SyncStats {
  appliedRecords: number;
  appliedDeletions: number;
  conflictsResolved: number;
  outgoingRecords: number;
  outgoingDeletions: number;
}

export function getLastSyncTimestamp(): string | null {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM sync_meta WHERE key = 'last_synced_at'").get() as { value: string } | undefined;
    return row?.value || null;
  } catch (e) {
    return null;
  }
}

export function setLastSyncTimestamp(isoTimestamp: string): void {
  try {
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO sync_meta (key, value, updated_at)
      VALUES ('last_synced_at', ?, datetime('now'))
    `).run(isoTimestamp);
  } catch (e) {
    console.error('[SyncEngine] setLastSyncTimestamp error:', e);
  }
}

export function getRemoteSyncUrl(): string {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM sync_meta WHERE key = 'remote_sync_url'").get() as { value: string } | undefined;
    if (row?.value && row.value.trim().length > 0) return row.value.trim();
  } catch (e) {}

  return (process.env.REMOTE_SYNC_URL || 'https://chamcong.upkidscentermanager.io.vn').trim().replace(/\/+$/, '');
}

export function setRemoteSyncUrl(url: string): void {
  try {
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO sync_meta (key, value, updated_at)
      VALUES ('remote_sync_url', ?, datetime('now'))
    `).run(url.trim().replace(/\/+$/, ''));
  } catch (e) {
    console.error('[SyncEngine] setRemoteSyncUrl error:', e);
  }
}

/**
 * Lấy danh sách các thay đổi (delta) và deletions kể từ mốc thời gian `sinceIso`
 */
export function getLocalSyncChanges(sinceIso: string | null) {
  const db = getDb();
  const changes: Record<string, any[]> = {};
  let totalRecords = 0;

  for (const [table] of Object.entries(SYNC_TABLES)) {
    try {
      let rows: any[] = [];
      if (sinceIso) {
        // Lấy các bản ghi được tạo hoặc cập nhật sau mốc sinceIso
        rows = db.prepare(`
          SELECT * FROM "${table}" 
          WHERE (updated_at IS NOT NULL AND updated_at > ?) 
             OR (created_at IS NOT NULL AND created_at > ?)
        `).all(sinceIso, sinceIso);
      } else {
        rows = db.prepare(`SELECT * FROM "${table}"`).all();
      }
      changes[table] = rows;
      totalRecords += rows.length;
    } catch (e: any) {
      console.warn(`[SyncEngine] getLocalSyncChanges error on ${table}:`, e.message);
      changes[table] = [];
    }
  }

  let deletions: { table_name: string; record_id: string; deleted_at: string }[] = [];
  try {
    if (sinceIso) {
      deletions = db.prepare(`
        SELECT table_name, record_id, deleted_at 
        FROM sync_deletions 
        WHERE deleted_at > ?
      `).all(sinceIso) as any[];
    } else {
      deletions = db.prepare(`
        SELECT table_name, record_id, deleted_at 
        FROM sync_deletions
      `).all() as any[];
    }
  } catch (e: any) {
    console.warn('[SyncEngine] getLocalSyncChanges deletions error:', e.message);
  }

  return {
    changes,
    deletions,
    totalRecords,
    totalDeletions: deletions.length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Áp dụng danh sách thay đổi và deletions từ đối tác vào database cục bộ
 * theo chuẩn Professional Conflict Resolution (Last-Write-Wins with Tombstones)
 */
export function applyIncomingSyncChanges(
  incomingChanges: Record<string, any[]>,
  incomingDeletions: { table_name: string; record_id: string; deleted_at: string }[]
): { appliedRecords: number; appliedDeletions: number; conflictsResolved: number } {
  const db = getDb();
  let appliedRecords = 0;
  let appliedDeletions = 0;
  let conflictsResolved = 0;

  const runTx = db.transaction(() => {
    // 1. Áp dụng Deletions trước
    if (Array.isArray(incomingDeletions) && incomingDeletions.length > 0) {
      const tombstoneStmt = db.prepare(`
        INSERT OR REPLACE INTO sync_deletions (table_name, record_id, deleted_at)
        VALUES (?, ?, ?)
      `);

      for (const del of incomingDeletions) {
        const pkCol = SYNC_TABLES[del.table_name];
        if (!pkCol) continue;

        try {
          const existing = db.prepare(`SELECT * FROM "${del.table_name}" WHERE "${pkCol}" = ?`).get(del.record_id) as any;
          if (existing) {
            const existingTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
            const delTime = new Date(del.deleted_at || 0).getTime();

            // Nếu thời điểm xóa mới hơn hoặc bằng thời điểm cập nhật -> Thực hiện xóa
            if (delTime >= existingTime) {
              db.prepare(`DELETE FROM "${del.table_name}" WHERE "${pkCol}" = ?`).run(del.record_id);
              tombstoneStmt.run(del.table_name, del.record_id, del.deleted_at);
              appliedDeletions++;
            } else {
              // Bản ghi đã bị sửa đổi sau thời điểm xóa -> Giữ bản ghi (Conflict resolved: LWW)
              conflictsResolved++;
            }
          } else {
            // Lưu tombstone để phòng trường hợp bản ghi đến sau
            tombstoneStmt.run(del.table_name, del.record_id, del.deleted_at);
          }
        } catch (e: any) {
          console.warn(`[SyncEngine] apply deletion error for ${del.table_name}/${del.record_id}:`, e.message);
        }
      }
    }

    // 2. Áp dụng Upserts (Incoming Changes)
    if (incomingChanges && typeof incomingChanges === 'object') {
      for (const [table, records] of Object.entries(incomingChanges)) {
        const pkCol = SYNC_TABLES[table];
        if (!pkCol || !Array.isArray(records)) continue;

        const tableCols = db.prepare(`PRAGMA table_info("${table}")`).all().map((c: any) => c.name);
        const colSet = new Set(tableCols);

        for (const rawRec of records) {
          if (!rawRec) continue;
          const recId = rawRec[pkCol];
          if (recId === undefined || recId === null || recId === '') continue;

          try {
            const incomingTime = new Date(rawRec.updated_at || rawRec.created_at || 0).getTime();

            // Kiểm tra xem bản ghi này có tombstone xóa hay không
            const tombstone = db.prepare(`
              SELECT deleted_at FROM sync_deletions 
              WHERE table_name = ? AND record_id = ?
            `).get(table, String(recId)) as { deleted_at: string } | undefined;

            if (tombstone) {
              const tombTime = new Date(tombstone.deleted_at || 0).getTime();
              if (tombTime >= incomingTime) {
                // Đã bị xóa trên máy này sau khi tạo bên kia -> Bỏ qua không chèn lại
                conflictsResolved++;
                continue;
              } else {
                // Incoming record mới hơn tombstone -> Xóa tombstone cũ vì đã được tái tạo/sửa
                db.prepare(`DELETE FROM sync_deletions WHERE table_name = ? AND record_id = ?`).run(table, String(recId));
              }
            }

            // Kiểm tra bản ghi hiện tại trong database
            const existing = db.prepare(`SELECT * FROM "${table}" WHERE "${pkCol}" = ?`).get(recId) as any;

            if (existing) {
              const existingTime = new Date(existing.updated_at || existing.created_at || 0).getTime();

              // Nếu bản ghi đến mới hơn bản ghi hiện tại -> Ghi đè
              if (incomingTime > existingTime) {
                const cleanRec: Record<string, any> = {};
                for (const [k, v] of Object.entries(rawRec)) {
                  if (colSet.has(k)) cleanRec[k] = v;
                }
                if (!cleanRec.updated_at) cleanRec.updated_at = new Date().toISOString();

                const keys = Object.keys(cleanRec);
                const cols = keys.map(k => `"${k}"`).join(', ');
                const placeholders = keys.map(k => `@${k}`).join(', ');
                db.prepare(`INSERT OR REPLACE INTO "${table}" (${cols}) VALUES (${placeholders})`).run(cleanRec);
                appliedRecords++;
              } else {
                // Bản ghi hiện tại mới hơn hoặc bằng -> Giữ nguyên (Conflict resolved)
                conflictsResolved++;
              }
            } else {
              // Chưa có bản ghi -> Thêm mới
              const cleanRec: Record<string, any> = {};
              for (const [k, v] of Object.entries(rawRec)) {
                if (colSet.has(k)) cleanRec[k] = v;
              }
              if (!cleanRec.created_at) cleanRec.created_at = new Date().toISOString();
              if (!cleanRec.updated_at) cleanRec.updated_at = new Date().toISOString();

              const keys = Object.keys(cleanRec);
              const cols = keys.map(k => `"${k}"`).join(', ');
              const placeholders = keys.map(k => `@${k}`).join(', ');
              db.prepare(`INSERT OR REPLACE INTO "${table}" (${cols}) VALUES (${placeholders})`).run(cleanRec);
              appliedRecords++;
            }
          } catch (e: any) {
            console.warn(`[SyncEngine] apply record error on ${table} (ID: ${recId}):`, e.message);
          }
        }
      }
    }
  });

  runTx();
  return { appliedRecords, appliedDeletions, conflictsResolved };
}

/**
 * Thực hiện Đồng Bộ Hai Chiều Toàn Diện (Bidirectional Sync) giữa Local và Web Server
 */
export async function executeBidirectionalSync(options: {
  remoteUrl?: string;
  forceFullSync?: boolean;
  secretToken?: string;
} = {}): Promise<{
  success: boolean;
  isOffline: boolean;
  message: string;
  stats?: SyncStats;
  serverTime?: string;
}> {
  const remoteUrl = (options.remoteUrl || getRemoteSyncUrl()).trim().replace(/\/+$/, '');
  const secret = options.secretToken || process.env.SYNC_SECRET || 'chamcong_sync_secure_token_2026';

  let since = options.forceFullSync ? null : getLastSyncTimestamp();

  // 1. Thu thập thay đổi cục bộ từ mốc since
  const localPayload = getLocalSyncChanges(since);

  // 2. Gửi yêu cầu sync tới Web Server
  let remoteResponse: any;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const res = await fetch(`${remoteUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-secret': secret,
      },
      body: JSON.stringify({
        since,
        changes: localPayload.changes,
        deletions: localPayload.deletions,
        client_time: localPayload.timestamp,
        client_id: 'client_local_desktop',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        isOffline: res.status >= 500 || res.status === 404,
        message: `Máy chủ Web trả về lỗi (Mã ${res.status}): ${errText.slice(0, 150)}`,
      };
    }

    remoteResponse = await res.json();
  } catch (err: any) {
    const isNetworkError = err.name === 'AbortError' || err.message?.includes('fetch failed') || err.message?.includes('ENOTFOUND') || err.message?.includes('ECONNREFUSED');
    return {
      success: false,
      isOffline: isNetworkError,
      message: isNetworkError 
        ? 'Không thể kết nối đến Web Server (Web đang sập hoặc mất mạng). Bản Local đang hoạt động an toàn độc lập.'
        : `Lỗi kết nối đồng bộ: ${err.message}`,
    };
  }

  if (!remoteResponse || !remoteResponse.success) {
    return {
      success: false,
      isOffline: false,
      message: remoteResponse?.error || 'Phản hồi từ Web Server không hợp lệ.',
    };
  }

  // 3. Áp dụng thay đổi từ Web Server vào Local DB
  const applyResult = applyIncomingSyncChanges(
    remoteResponse.changes || {},
    remoteResponse.deletions || []
  );

  // 4. Cập nhật mốc thời gian đồng bộ thành công mới
  const newSyncTime = remoteResponse.server_time || new Date().toISOString();
  setLastSyncTimestamp(newSyncTime);

  const stats: SyncStats = {
    appliedRecords: applyResult.appliedRecords,
    appliedDeletions: applyResult.appliedDeletions,
    conflictsResolved: applyResult.conflictsResolved,
    outgoingRecords: localPayload.totalRecords,
    outgoingDeletions: localPayload.totalDeletions,
  };

  return {
    success: true,
    isOffline: false,
    message: `Đồng bộ thành công! (Nhận: ${stats.appliedRecords} bản ghi, Đẩy: ${stats.outgoingRecords} bản ghi)`,
    stats,
    serverTime: newSyncTime,
  };
}
