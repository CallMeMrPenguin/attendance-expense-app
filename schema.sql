-- 1. Enable extensions if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create teachers table
CREATE TABLE IF NOT EXISTS public.teachers (
    name text PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Create profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE NOT NULL,
    teacher_name text REFERENCES public.teachers(name) ON UPDATE CASCADE ON DELETE CASCADE NOT NULL,
    role text NOT NULL CHECK (role IN ('admin', 'user')),
    email text,
    password text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Fix check constraint if table previously had 'teacher' role in check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user'));

-- 4. Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_name text REFERENCES public.teachers(name) ON UPDATE CASCADE ON DELETE CASCADE NOT NULL,
    student_name text NOT NULL,
    day_of_week text NOT NULL,
    time text NOT NULL,
    duration numeric NOT NULL,
    price numeric NOT NULL,
    status text NOT NULL CHECK (status IN ('Chưa dạy', 'Đã dạy', 'Hủy')),
    grade text,
    homework text,
    note text,
    month_year text NOT NULL,
    color text NOT NULL,
    date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 6. Helper Security Functions (Security Definer to bypass RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_teacher_name()
RETURNS text SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT teacher_name FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql;

-- 7. Policies for teachers table (Idempotent DROP before CREATE)
DROP POLICY IF EXISTS select_teachers ON public.teachers;
CREATE POLICY select_teachers ON public.teachers 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS write_teachers ON public.teachers;
CREATE POLICY write_teachers ON public.teachers 
    FOR ALL TO authenticated USING (public.is_admin());

-- 8. Policies for profiles table (Idempotent DROP before CREATE)
DROP POLICY IF EXISTS select_profiles ON public.profiles;
CREATE POLICY select_profiles ON public.profiles 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS write_profiles ON public.profiles;
CREATE POLICY write_profiles ON public.profiles 
    FOR ALL TO authenticated USING (public.is_admin());

-- 9. Policies for sessions table (Idempotent DROP before CREATE)
DROP POLICY IF EXISTS select_sessions ON public.sessions;
CREATE POLICY select_sessions ON public.sessions 
    FOR SELECT TO authenticated USING (
        public.is_admin() OR (teacher_name = public.get_teacher_name())
    );

DROP POLICY IF EXISTS insert_sessions ON public.sessions;
CREATE POLICY insert_sessions ON public.sessions 
    FOR INSERT TO authenticated WITH CHECK (
        public.is_admin() OR (teacher_name = public.get_teacher_name())
    );

DROP POLICY IF EXISTS update_sessions ON public.sessions;
CREATE POLICY update_sessions ON public.sessions 
    FOR UPDATE TO authenticated USING (
        public.is_admin() OR (teacher_name = public.get_teacher_name())
    );

DROP POLICY IF EXISTS delete_sessions ON public.sessions;
CREATE POLICY delete_sessions ON public.sessions 
    FOR DELETE TO authenticated USING (
        public.is_admin() OR (teacher_name = public.get_teacher_name())
    );

-- 10. Automatically Create Profile Trigger on User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  t_name text;
  u_role text;
  u_name text;
BEGIN
  t_name := COALESCE(new.raw_user_meta_data->>'teacher_name', split_part(new.email, '@', 1));
  u_role := COALESCE(new.raw_user_meta_data->>'role', 'user');
  u_name := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  
  -- Ensure teacher exists in teachers table
  INSERT INTO public.teachers (name)
  VALUES (t_name)
  ON CONFLICT (name) DO NOTHING;

  -- Insert profile
  INSERT INTO public.profiles (id, username, teacher_name, role)
  VALUES (new.id, u_name, t_name, u_role)
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    teacher_name = EXCLUDED.teacher_name,
    role = EXCLUDED.role;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution (Idempotent DROP before CREATE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Purge legacy 'Giáo Viên 1' and normalize legacy 'teacher' role to 'user'
DELETE FROM public.teachers WHERE name = 'Giáo Viên 1';
DELETE FROM public.profiles WHERE teacher_name = 'Giáo Viên 1';
DELETE FROM public.sessions WHERE teacher_name = 'Giáo Viên 1';
UPDATE public.profiles SET role = 'user' WHERE role = 'teacher';

-- 12. Secure email resolution for anonymous users
CREATE OR REPLACE FUNCTION public.resolve_username_email(p_username text)
RETURNS text SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT email FROM public.profiles
    WHERE username = p_username OR email = p_username
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- 13. Create manual_transactions table
CREATE TABLE IF NOT EXISTS public.manual_transactions (
    id text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    teacher_name text NOT NULL,
    desc_text text NOT NULL,
    amount numeric NOT NULL,
    type text NOT NULL CHECK (type IN ('income', 'expense')),
    category text NOT NULL,
    date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 14. Create savings_funds table
CREATE TABLE IF NOT EXISTS public.savings_funds (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    teacher_name text NOT NULL,
    emergency_current numeric DEFAULT 0 NOT NULL,
    emergency_target numeric DEFAULT 30000000 NOT NULL,
    accumulation_current numeric DEFAULT 0 NOT NULL,
    accumulation_target numeric DEFAULT 150000000 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 15. Create category_budgets table
CREATE TABLE IF NOT EXISTS public.category_budgets (
    id text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    teacher_name text NOT NULL,
    category text NOT NULL,
    amount numeric NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 16. Create savings_history table
CREATE TABLE IF NOT EXISTS public.savings_history (
    id text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    teacher_name text NOT NULL,
    fund text NOT NULL CHECK (fund IN ('emergency', 'accumulation')),
    type text NOT NULL CHECK (type IN ('deposit', 'withdraw')),
    amount numeric NOT NULL,
    date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 17. Create bank_receipts table
CREATE TABLE IF NOT EXISTS public.bank_receipts (
    id text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    order_number text,
    trans_date text,
    debit_account text,
    remitter_name text,
    credit_account text,
    beneficiary_name text,
    beneficiary_bank text,
    amount numeric NOT NULL,
    details text,
    status text NOT NULL DEFAULT 'unclassified' CHECK (status IN ('unclassified', 'classified')),
    type text CHECK (type IN ('income', 'expense')),
    category text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 18. Create receipt_rules table
CREATE TABLE IF NOT EXISTS public.receipt_rules (
    id text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    match_field text NOT NULL CHECK (match_field IN ('remitter_name', 'beneficiary_name', 'details', 'sender')),
    match_value text NOT NULL,
    target_type text NOT NULL CHECK (target_type IN ('income', 'expense')),
    target_category text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS for all financial tables
ALTER TABLE public.manual_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_rules ENABLE ROW LEVEL SECURITY;

-- Add permissive RLS policies for authenticated users
DROP POLICY IF EXISTS all_manual_transactions ON public.manual_transactions;
CREATE POLICY all_manual_transactions ON public.manual_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS all_savings_funds ON public.savings_funds;
CREATE POLICY all_savings_funds ON public.savings_funds FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS all_category_budgets ON public.category_budgets;
CREATE POLICY all_category_budgets ON public.category_budgets FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS all_savings_history ON public.savings_history;
CREATE POLICY all_savings_history ON public.savings_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS all_bank_receipts ON public.bank_receipts;
CREATE POLICY all_bank_receipts ON public.bank_receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS all_receipt_rules ON public.receipt_rules;
CREATE POLICY all_receipt_rules ON public.receipt_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);


