import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { 
  SYNC_TABLES, 
  getLocalSyncChanges, 
  applyIncomingSyncChanges, 
  executeBidirectionalSync,
  getLastSyncTimestamp,
  getRemoteSyncUrl,
  setRemoteSyncUrl
} from '@/lib/sync-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const tableCounts: Record<string, number> = {};

    for (const [table] of Object.entries(SYNC_TABLES)) {
      try {
        const row = db.prepare(`SELECT count(*) as cnt FROM "${table}"`).get() as { cnt: number };
        tableCounts[table] = row?.cnt || 0;
      } catch (e) {
        tableCounts[table] = 0;
      }
    }

    let deletionCount = 0;
    try {
      const delRow = db.prepare('SELECT count(*) as cnt FROM sync_deletions').get() as { cnt: number };
      deletionCount = delRow?.cnt || 0;
    } catch (e) {}

    return NextResponse.json({
      success: true,
      server_time: new Date().toISOString(),
      last_synced_at: getLastSyncTimestamp(),
      remote_sync_url: getRemoteSyncUrl(),
      table_counts: tableCounts,
      deletion_tombstones: deletionCount,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Action 1: Trình duyệt yêu cầu kích hoạt đồng bộ hai chiều (Local -> Web -> Local)
    if (action === 'trigger' || action === 'trigger_outbound_sync') {
      const result = await executeBidirectionalSync({
        remoteUrl: body.remoteUrl,
        forceFullSync: !!body.forceFullSync,
        secretToken: body.secretToken,
      });
      return NextResponse.json(result);
    }

    // Action 2: Kiểm tra kết nối tới Web Server
    if (action === 'test_connection') {
      const targetUrl = (body.remoteUrl || getRemoteSyncUrl()).trim().replace(/\/+$/, '');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`${targetUrl}/api/sync`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const remoteData = await res.json();
          return NextResponse.json({
            success: true,
            isOnline: true,
            message: `Kết nối Web Server thành công (Mã ${res.status})`,
            remote_time: remoteData.server_time,
            remote_counts: remoteData.table_counts,
          });
        } else {
          return NextResponse.json({
            success: false,
            isOnline: false,
            statusCode: res.status,
            message: `Web Server trả về mã lỗi ${res.status} (Có thể Web đang sập hoặc lỗi cấu hình).`,
          });
        }
      } catch (e: any) {
        return NextResponse.json({
          success: false,
          isOnline: false,
          message: `Không thể kết nối tới ${targetUrl}: ${e.message}`,
        });
      }
    }

    // Action 3: Đổi cấu hình Remote Sync URL
    if (action === 'set_remote_url') {
      if (!body.url || typeof body.url !== 'string') {
        return NextResponse.json({ success: false, error: 'Thiếu tham số url hợp lệ' }, { status: 400 });
      }
      setRemoteSyncUrl(body.url);
      return NextResponse.json({
        success: true,
        message: 'Đã lưu Remote Sync URL mới',
        remote_sync_url: getRemoteSyncUrl(),
      });
    }

    // Action 4: Xuất toàn bộ dữ liệu ra JSON để tải về
    if (action === 'export_backup') {
      const db = getDb();
      const exportData: Record<string, any[]> = {};
      for (const [table] of Object.entries(SYNC_TABLES)) {
        try {
          exportData[table] = db.prepare(`SELECT * FROM "${table}"`).all();
        } catch (e) {
          exportData[table] = [];
        }
      }
      return NextResponse.json({
        success: true,
        data: exportData,
        exported_at: new Date().toISOString()
      });
    }

    // Action 5: Nhập dữ liệu từ JSON vào cơ sở dữ liệu
    if (action === 'import_backup') {
      const importPayload = body.data;
      if (!importPayload || typeof importPayload !== 'object') {
        return NextResponse.json({ success: false, error: 'Dữ liệu JSON không hợp lệ' }, { status: 400 });
      }
      const db = getDb();
      let importedCount = 0;
      db.transaction(() => {
        for (const [table] of Object.entries(SYNC_TABLES)) {
          const rows = importPayload[table];
          if (Array.isArray(rows) && rows.length > 0) {
            for (const r of rows) {
              const keys = Object.keys(r);
              const cols = keys.map(k => `"${k}"`).join(', ');
              const placeholders = keys.map(k => `@${k}`).join(', ');
              const stmt = db.prepare(`INSERT OR REPLACE INTO "${table}" (${cols}) VALUES (${placeholders})`);
              stmt.run(r);
              importedCount++;
            }
          }
        }
      })();
      return NextResponse.json({
        success: true,
        message: `Đã nhập thành công ${importedCount} bản ghi vào hệ thống`,
        imported_count: importedCount
      });
    }

    // Luồng Sync Incoming (Web Server nhận sync từ Local Client hoặc ngược lại)
    const { since, changes, deletions } = body;

    // 1. Áp dụng thay đổi từ caller vào cơ sở dữ liệu hiện tại
    const applyStats = applyIncomingSyncChanges(changes || {}, deletions || []);

    // 2. Thu thập các thay đổi trên máy chủ này từ mốc `since` để trả về cho caller
    const outgoing = getLocalSyncChanges(since || null);

    return NextResponse.json({
      success: true,
      server_time: new Date().toISOString(),
      changes: outgoing.changes,
      deletions: outgoing.deletions,
      applied_stats: applyStats,
      outgoing_stats: {
        total_records: outgoing.totalRecords,
        total_deletions: outgoing.totalDeletions,
      },
    });
  } catch (err: any) {
    console.error('API /api/sync error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
