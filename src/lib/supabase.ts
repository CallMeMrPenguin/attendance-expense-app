// Universal Client-Safe Local Client (Safe for browser and SSR)

// Client-side in-flight deduplication & short-lived micro-cache
const clientQueryCache = new Map<string, { data: any; count?: number; error: any; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<{ data: any; count?: number; error: any }>>();

export function invalidateClientCache(table?: string) {
  if (!table) {
    clientQueryCache.clear();
    return;
  }
  const prefix = `${table}:`;
  for (const k of clientQueryCache.keys()) {
    if (k.startsWith(prefix)) {
      clientQueryCache.delete(k);
    }
  }
}

interface QueryBuilderState {
  table: string;
  columns?: string;
  count?: 'exact' | null;
  head?: boolean;
  eqMap: Record<string, any>;
  neqMap: Record<string, any>;
  inMap: Record<string, any[]>;
  ilikeMap: Record<string, string>;
  ltMap: Record<string, any>;
  lteMap: Record<string, any>;
  gtMap: Record<string, any>;
  gteMap: Record<string, any>;
  orFilter?: string;
  orderConfig?: { column: string; ascending?: boolean };
  limitVal?: number;
  isMaybeSingle?: boolean;
}

class QueryBuilder {
  private state: QueryBuilderState;

  constructor(table: string) {
    this.state = {
      table,
      eqMap: {},
      neqMap: {},
      inMap: {},
      ilikeMap: {},
      ltMap: {},
      lteMap: {},
      gtMap: {},
      gteMap: {}
    };
  }

  select(columns: string = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.state.columns = columns;
    if (options?.count) this.state.count = options.count;
    if (options?.head) this.state.head = options.head;
    return this;
  }

  eq(column: string, value: any) {
    this.state.eqMap[column] = value;
    return this;
  }

  neq(column: string, value: any) {
    this.state.neqMap[column] = value;
    return this;
  }

  in(column: string, values: any[]) {
    this.state.inMap[column] = values;
    return this;
  }

  ilike(column: string, pattern: string) {
    this.state.ilikeMap[column] = pattern;
    return this;
  }

  like(column: string, pattern: string) {
    this.state.ilikeMap[column] = pattern;
    return this;
  }

  lt(column: string, value: any) {
    this.state.ltMap[column] = value;
    return this;
  }

  lte(column: string, value: any) {
    this.state.lteMap[column] = value;
    return this;
  }

  gt(column: string, value: any) {
    this.state.gtMap[column] = value;
    return this;
  }

  gte(column: string, value: any) {
    this.state.gteMap[column] = value;
    return this;
  }

  or(expression: string) {
    this.state.orFilter = expression;
    return this;
  }

  order(column: string, options: { ascending?: boolean } = { ascending: true }) {
    this.state.orderConfig = { column, ascending: options.ascending !== false };
    return this;
  }

  limit(count: number) {
    this.state.limitVal = count;
    return this;
  }

  maybeSingle() {
    this.state.isMaybeSingle = true;
    return this.execute();
  }

  single() {
    this.state.isMaybeSingle = true;
    return this.execute();
  }

  async execute(): Promise<{ data: any; count?: number; error: any }> {
    const opts = {
      columns: this.state.columns,
      count: this.state.count,
      head: this.state.head,
      eq: Object.keys(this.state.eqMap).length > 0 ? this.state.eqMap : undefined,
      neq: Object.keys(this.state.neqMap).length > 0 ? this.state.neqMap : undefined,
      in: Object.keys(this.state.inMap).length > 0 ? this.state.inMap : undefined,
      ilike: Object.keys(this.state.ilikeMap).length > 0 ? this.state.ilikeMap : undefined,
      lt: Object.keys(this.state.ltMap).length > 0 ? this.state.ltMap : undefined,
      lte: Object.keys(this.state.lteMap).length > 0 ? this.state.lteMap : undefined,
      gt: Object.keys(this.state.gtMap).length > 0 ? this.state.gtMap : undefined,
      gte: Object.keys(this.state.gteMap).length > 0 ? this.state.gteMap : undefined,
      or: this.state.orFilter,
      order: this.state.orderConfig,
      limit: this.state.limitVal,
      maybeSingle: this.state.isMaybeSingle
    };

    const cacheKey = `${this.state.table}:${JSON.stringify(opts)}`;
    const now = Date.now();

    // 1. Check client-side micro cache (TTL: 2000ms)
    const cached = clientQueryCache.get(cacheKey);
    if (cached && (now - cached.timestamp < 2000)) {
      return {
        data: Array.isArray(cached.data) ? [...cached.data] : (cached.data && typeof cached.data === 'object' ? { ...cached.data } : cached.data),
        count: cached.count,
        error: cached.error
      };
    }

    // 2. Check in-flight request deduplication
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'query', table: this.state.table, options: opts })
        });
        const json = await res.json();
        if (!json.error) {
          if (clientQueryCache.size > 200) {
            const oldest = Array.from(clientQueryCache.keys()).slice(0, 50);
            for (const k of oldest) clientQueryCache.delete(k);
          }
          clientQueryCache.set(cacheKey, {
            data: json.data,
            count: json.count,
            error: null,
            timestamp: Date.now()
          });
        }
        return json;
      } catch (err: any) {
        return { data: null, error: { message: err.message } };
      } finally {
        inFlightRequests.delete(cacheKey);
      }
    })();

    inFlightRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; count?: number; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class UpdateBuilder {
  private table: string;
  private updates: Record<string, any>;
  private eqMap: Record<string, any> = {};
  private inMap: Record<string, any[]> = {};
  private ilikeMap: Record<string, string> = {};
  private orFilter?: string;

  constructor(table: string, updates: Record<string, any>) {
    this.table = table;
    this.updates = updates;
  }

  eq(column: string, value: any) {
    this.eqMap[column] = value;
    return this;
  }

  in(column: string, values: any[]) {
    this.inMap[column] = values;
    return this;
  }

  ilike(column: string, pattern: string) {
    this.ilikeMap[column] = pattern;
    return this;
  }

  or(expression: string) {
    this.orFilter = expression;
    return this;
  }

  select(columns: string = '*') {
    return this;
  }

  async execute(): Promise<{ data: any; error: any }> {
    invalidateClientCache(this.table);
    const conditions = {
      eq: Object.keys(this.eqMap).length > 0 ? this.eqMap : undefined,
      in: Object.keys(this.inMap).length > 0 ? this.inMap : undefined,
      ilike: Object.keys(this.ilikeMap).length > 0 ? this.ilikeMap : undefined,
      or: this.orFilter
    };

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', table: this.table, updates: this.updates, conditions })
      });
      return await res.json();
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class DeleteBuilder {
  private table: string;
  private eqMap: Record<string, any> = {};
  private inMap: Record<string, any[]> = {};
  private ilikeMap: Record<string, string> = {};
  private orFilter?: string;

  constructor(table: string) {
    this.table = table;
  }

  eq(column: string, value: any) {
    this.eqMap[column] = value;
    return this;
  }

  in(column: string, values: any[]) {
    this.inMap[column] = values;
    return this;
  }

  ilike(column: string, pattern: string) {
    this.ilikeMap[column] = pattern;
    return this;
  }

  or(expression: string) {
    this.orFilter = expression;
    return this;
  }

  select(columns: string = '*') {
    return this;
  }

  async execute(): Promise<{ data: any; error: any }> {
    invalidateClientCache(this.table);
    const conditions = {
      eq: Object.keys(this.eqMap).length > 0 ? this.eqMap : undefined,
      in: Object.keys(this.inMap).length > 0 ? this.inMap : undefined,
      ilike: Object.keys(this.ilikeMap).length > 0 ? this.ilikeMap : undefined,
      or: this.orFilter
    };

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', table: this.table, conditions })
      });
      return await res.json();
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class InsertBuilder {
  private promise: Promise<{ data: any; error: any }>;

  constructor(execPromise: () => Promise<{ data: any; error: any }>) {
    this.promise = execPromise();
  }

  select(columns: string = '*') {
    return this;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }
}

class UpsertBuilder {
  private promise: Promise<{ data: any; error: any }>;

  constructor(execPromise: () => Promise<{ data: any; error: any }>) {
    this.promise = execPromise();
  }

  select(columns: string = '*') {
    return this;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }
}

function createLocalClient() {
  return {
    from: (table: string) => ({
      select: (columns: string = '*', options?: { count?: 'exact'; head?: boolean }) => {
        return new QueryBuilder(table).select(columns, options);
      },
      insert: (records: any | any[]) => {
        invalidateClientCache(table);
        return new InsertBuilder(async () => {
          try {
            const res = await fetch('/api/db', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'insert', table, records })
            });
            return await res.json();
          } catch (err: any) {
            return { data: null, error: { message: err.message } };
          }
        });
      },
      upsert: (records: any | any[], options?: { onConflict?: string }) => {
        invalidateClientCache(table);
        return new UpsertBuilder(async () => {
          try {
            const res = await fetch('/api/db', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'upsert', table, records, onConflict: options?.onConflict })
            });
            return await res.json();
          } catch (err: any) {
            return { data: null, error: { message: err.message } };
          }
        });
      },
      update: (updates: Record<string, any>) => {
        return new UpdateBuilder(table, updates);
      },
      delete: () => {
        return new DeleteBuilder(table);
      }
    }),

    auth: {
      getSession: async () => {
        if (typeof window !== 'undefined') {
          try {
            const saved = localStorage.getItem('local_auth_session');
            if (saved) {
              const session = JSON.parse(saved);
              return { data: { session }, error: null };
            }
          } catch (e) {}
        }
        return { data: { session: null }, error: null };
      },

      getUser: async () => {
        if (typeof window !== 'undefined') {
          try {
            const saved = localStorage.getItem('local_auth_session');
            if (saved) {
              const session = JSON.parse(saved);
              if (session?.user) {
                return { data: { user: session.user }, error: null };
              }
            }
          } catch (e) {}
        }
        return { data: { user: null }, error: null };
      },

      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        try {
          const res = await fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'auth_login', username: email, password })
          });
          const json = await res.json();
          if (json.error) {
            return { data: { user: null, session: null }, error: json.error };
          }
          if (json.data?.session && typeof window !== 'undefined') {
            localStorage.setItem('local_auth_session', JSON.stringify(json.data.session));
          }
          return { data: { user: json.data?.user, session: json.data?.session }, error: null };
        } catch (err: any) {
          return { data: { user: null, session: null }, error: { message: err.message } };
        }
      },

      signOut: async () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('local_auth_session');
        }
        return { error: null };
      },

      updateUser: async ({ password }: { password?: string }) => {
        if (!password) return { data: null, error: null };
        let userId = '';
        if (typeof window !== 'undefined') {
          try {
            const saved = localStorage.getItem('local_auth_session');
            if (saved) {
              userId = JSON.parse(saved)?.user?.id || '';
            }
          } catch (e) {}
        }
        if (!userId) return { data: null, error: { message: 'Chưa đăng nhập' } };

        try {
          const res = await fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'auth_update_password', userId, newPassword: password })
          });
          const json = await res.json();
          if (json.error) return { data: null, error: json.error };
          return { data: { user: { id: userId } }, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message } };
        }
      },

      admin: {
        createUser: async () => ({ data: null, error: null }),
        updateUserById: async () => ({ data: null, error: null }),
        deleteUser: async () => ({ data: { success: true }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null })
      }
    },

    rpc: async (fn: string, args?: any) => {
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'rpc', fn, args })
        });
        return await res.json();
      } catch (err: any) {
        return { data: null, error: { message: err.message } };
      }
    }
  };
}

export const supabase = createLocalClient();
export const getSupabaseAdmin = () => createLocalClient();
