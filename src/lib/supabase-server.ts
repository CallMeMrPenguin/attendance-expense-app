import { 
  queryTable, 
  insertTable, 
  upsertTable, 
  updateTable, 
  deleteTable, 
  getDb 
} from '@/lib/db';

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

class ServerQueryBuilder {
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

  async execute(): Promise<{ data: any; count?: number; error: { message: string; code?: string } | null }> {
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

    try {
      return queryTable(this.state.table, opts);
    } catch (err: any) {
      return { data: null, error: { message: err.message, code: 'SQLITE_ERROR' } };
    }
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; count?: number; error: { message: string; code?: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class ServerUpdateBuilder {
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

  async execute(): Promise<{ data: any; error: { message: string; code?: string } | null }> {
    const conditions = {
      eq: Object.keys(this.eqMap).length > 0 ? this.eqMap : undefined,
      in: Object.keys(this.inMap).length > 0 ? this.inMap : undefined,
      ilike: Object.keys(this.ilikeMap).length > 0 ? this.ilikeMap : undefined,
      or: this.orFilter
    };

    try {
      return updateTable(this.table, this.updates, conditions);
    } catch (err: any) {
      return { data: null, error: { message: err.message, code: 'SQLITE_ERROR' } };
    }
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: { message: string; code?: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class ServerDeleteBuilder {
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

  async execute(): Promise<{ data: any; error: { message: string; code?: string } | null }> {
    const conditions = {
      eq: Object.keys(this.eqMap).length > 0 ? this.eqMap : undefined,
      in: Object.keys(this.inMap).length > 0 ? this.inMap : undefined,
      ilike: Object.keys(this.ilikeMap).length > 0 ? this.ilikeMap : undefined,
      or: this.orFilter
    };

    try {
      return deleteTable(this.table, conditions);
    } catch (err: any) {
      return { data: null, error: { message: err.message, code: 'SQLITE_ERROR' } };
    }
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: { message: string; code?: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class ServerInsertBuilder {
  private promise: Promise<{ data: any; error: { message: string; code?: string } | null }>;

  constructor(execPromise: () => Promise<{ data: any; error: { message: string; code?: string } | null }>) {
    this.promise = execPromise();
  }

  select(columns: string = '*') {
    return this;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: { message: string; code?: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }
}

class ServerUpsertBuilder {
  private promise: Promise<{ data: any; error: { message: string; code?: string } | null }>;

  constructor(execPromise: () => Promise<{ data: any; error: { message: string; code?: string } | null }>) {
    this.promise = execPromise();
  }

  select(columns: string = '*') {
    return this;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: { message: string; code?: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }
}

export function createServerLocalClient() {
  return {
    from: (table: string) => ({
      select: (columns: string = '*', options?: { count?: 'exact'; head?: boolean }) => {
        return new ServerQueryBuilder(table).select(columns, options);
      },
      insert: (records: any | any[]) => {
        return new ServerInsertBuilder(async () => {
          try {
            return insertTable(table, records);
          } catch (err: any) {
            return { data: null, error: { message: err.message, code: 'SQLITE_ERROR' } };
          }
        });
      },
      upsert: (records: any | any[], options?: { onConflict?: string }) => {
        return new ServerUpsertBuilder(async () => {
          try {
            return upsertTable(table, records, options?.onConflict);
          } catch (err: any) {
            return { data: null, error: { message: err.message, code: 'SQLITE_ERROR' } };
          }
        });
      },
      update: (updates: Record<string, any>) => {
        return new ServerUpdateBuilder(table, updates);
      },
      delete: () => {
        return new ServerDeleteBuilder(table);
      }
    }),

    auth: {
      getUser: async (token?: string) => {
        if (!token) return { data: { user: null }, error: null };
        try {
          const db = getDb();
          const cleanToken = token.replace('Bearer ', '').trim();
          let candidateId = cleanToken;
          if (cleanToken.startsWith('local_token_')) {
            candidateId = cleanToken.replace(/^local_token_/, '').split('_')[0];
          }
          const profile = db.prepare(`
            SELECT * FROM profiles 
            WHERE id = ? OR id = ? OR username = ? OR email = ?
            LIMIT 1
          `).get(cleanToken, candidateId, cleanToken, cleanToken) as any;

          if (profile) {
            const user = {
              id: profile.id,
              email: profile.email || `${profile.username}@local.com`,
              user_metadata: {
                role: profile.role,
                teacher_name: profile.teacher_name || profile.user_name,
                username: profile.username
              }
            };
            return { data: { user }, error: null };
          }
        } catch (e) {}
        return { data: { user: null }, error: null };
      },

      admin: {
        createUser: async ({ email, password, user_metadata }: any) => {
          try {
            const db = getDb();
            const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'user_' + Date.now();
            const username = user_metadata?.username || email.split('@')[0];
            const teacher_name = user_metadata?.teacher_name || user_metadata?.user_name || username;
            const role = user_metadata?.role || 'user';

            db.prepare(`
              INSERT OR REPLACE INTO profiles (id, username, user_name, teacher_name, role, email, password)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(id, username, teacher_name, teacher_name, role, email, password || '123456');

            db.prepare(`INSERT OR IGNORE INTO teachers (name) VALUES (?)`).run(teacher_name);

            return { data: { user: { id, email, user_metadata } }, error: null };
          } catch (err: any) {
            return { data: null, error: { message: err.message, code: 'SQLITE_ERROR' } };
          }
        },

        updateUserById: async (userId: string, updates: any) => {
          try {
            const db = getDb();
            if (updates.password) {
              db.prepare(`UPDATE profiles SET password = ? WHERE id = ?`).run(updates.password, userId);
            }
            if (updates.user_metadata) {
              const meta = updates.user_metadata;
              const teacher_name = meta.teacher_name || meta.user_name;
              if (teacher_name) {
                db.prepare(`UPDATE profiles SET teacher_name = ?, user_name = ? WHERE id = ?`).run(teacher_name, teacher_name, userId);
              }
              if (meta.role) {
                db.prepare(`UPDATE profiles SET role = ? WHERE id = ?`).run(meta.role, userId);
              }
            }
            return { data: { user: { id: userId } }, error: null };
          } catch (err: any) {
            return { data: null, error: { message: err.message, code: 'SQLITE_ERROR' } };
          }
        },

        deleteUser: async (userId: string) => {
          try {
            const db = getDb();
            db.prepare(`DELETE FROM profiles WHERE id = ?`).run(userId);
            return { data: { success: true }, error: null };
          } catch (err: any) {
            return { data: null, error: { message: err.message, code: 'SQLITE_ERROR' } };
          }
        },

        getUser: async (token: string) => {
          return createServerLocalClient().auth.getUser(token);
        }
      }
    }
  };
}

export const getSupabaseAdmin = () => createServerLocalClient();
export const supabaseAdmin = createServerLocalClient();
