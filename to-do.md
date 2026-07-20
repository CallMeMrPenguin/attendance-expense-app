# Project To-Do List

## Core Rule: App Must Be Silent When Nobody Is Using It

> If no user has the app open → zero Vercel function runtime consumed.
> No background loops. No auto-sync on startup. No persistent connections.
> IMAP runs only on a schedule. All API routes must exit under 5 seconds.

---

## 🔴 Critical — Vercel Function Memory & Duration Leaks

### [ ] #1 — Kill the SSE Stream (Biggest Billing Leak)

**File**: `src/app/api/bank-receipts/stream/route.ts`

**Problem**
This route holds an open Server-Sent Events connection with a `setInterval` ping
every 15 seconds. On Vercel Fluid, every open browser tab keeps a function instance
alive indefinitely — burning memory-seconds 24/7 even when the user is idle.

**Solution**
- Delete `src/app/api/bank-receipts/stream/route.ts` entirely.
- Remove `subscribeSseClient`, `unsubscribeSseClient`, `broadcastSseEvent` from
  `src/lib/imap-service.ts` — they only exist to serve the SSE stream.
- Replace with **client-side polling**: after a user triggers a manual sync, the client
  polls `/api/bank-receipts` once every 30–60 seconds to check for updates.
- Result: zero function runtime when nobody is using the app.

---

### [ ] #2 — Move IMAP Sync to a Vercel Cron Job

**File**: `src/app/api/bank-receipts/sync/route.ts` (line 18)

**Problem**
```ts
syncBankReceipts(clientKeywords, userId).catch(...);
// ↑ Fire-and-forget. Response returns instantly but IMAP keeps the
//   function alive for 30–60 more seconds. Vercel bills the full duration.
```

**Solution**
- Move IMAP sync to a **Vercel Cron Job** via `vercel.json`:
  ```json
  {
    "crons": [
      { "path": "/api/bank-receipts/sync-cron", "schedule": "*/30 * * * *" }
    ]
  }
  ```
- Create `src/app/api/bank-receipts/sync-cron/route.ts` — awaits `syncBankReceipts()`
  fully, then returns. Vercel triggers it every 30 minutes automatically.
- The existing `/api/bank-receipts/sync` POST should only read from DB and return,
  never trigger IMAP.
- Remove IMAP auto-start from `src/instrumentation.ts` entirely — the cron replaces it.
- Result: app does nothing in the background when nobody is using it.

---

### [ ] #3 — Never Trigger IMAP Sync from a GET Request

**File**: `src/app/api/bank-receipts/route.ts` (lines 23–25)

**Problem**
```ts
if (receipts.length === 0) {
  receipts = await syncBankReceipts(); // blocks function for 30–60s
}
```
Cold start or empty DB triggers a full blocking IMAP fetch inside a GET.
Function stays alive up to 60 seconds for what should be a <100ms DB read.

**Solution**
- Delete those 3 lines entirely.
- GET reads from Supabase only, always exits fast.
- If DB is empty, return empty array — user triggers sync manually.

---

## 🟡 High — Unnecessary Memory & Data Usage

### [ ] #4 — Cache the Supabase Admin Client

**File**: `src/lib/supabase.ts` (line 23)

**Problem**
```ts
export const getSupabaseAdmin = () => createClient(...)
// New client object created on every single API call.
```

**Solution**
```ts
let _adminClient: ReturnType<typeof createClient> | null = null;

export const getSupabaseAdmin = () => {
  if (!_adminClient) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
    _adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _adminClient;
};
```

---

### [ ] #5 — Replace Full DELETE + re-INSERT with Upsert

**File**: `src/app/api/finance/route.ts` (lines 171–193)

**Problem**
Every save deletes all `manual_transactions` for the user, then re-inserts everything.
200 transactions = 200 rows destroyed and recreated on every click of Save.

**Solution**
```ts
// Replace:
await admin.from('manual_transactions').delete().eq('user_id', userId);
await admin.from('manual_transactions').insert(records);

// With:
await admin.from('manual_transactions').upsert(records, { onConflict: 'id' });
```
Same fix applies to `savings_history`.

---

### [ ] #6 — Narrow select('*') Queries

**Files**: All API routes

**Problem**
`select('*')` fetches all columns including large text fields on every query.
Inflates payload size, increases memory usage, and slows JSON parsing.

**Solution**
Explicitly select only what each route actually uses:
```ts
// Instead of:
.select('*')

// Example for transactions list:
.select('id, amount, type, category, date, desc_text')
```
