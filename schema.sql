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
    role text NOT NULL CHECK (role IN ('admin', 'teacher')),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

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

-- 7. Policies for teachers table
CREATE POLICY select_teachers ON public.teachers 
    FOR SELECT TO authenticated USING (true);

CREATE POLICY write_teachers ON public.teachers 
    FOR ALL TO authenticated USING (public.is_admin());

-- 8. Policies for profiles table
CREATE POLICY select_profiles ON public.profiles 
    FOR SELECT TO authenticated USING (true);

CREATE POLICY write_profiles ON public.profiles 
    FOR ALL TO authenticated USING (public.is_admin());

-- 9. Policies for sessions table
CREATE POLICY select_sessions ON public.sessions 
    FOR SELECT TO authenticated USING (
        public.is_admin() OR (teacher_name = public.get_teacher_name())
    );

CREATE POLICY insert_sessions ON public.sessions 
    FOR INSERT TO authenticated WITH CHECK (
        public.is_admin() OR (teacher_name = public.get_teacher_name())
    );

CREATE POLICY update_sessions ON public.sessions 
    FOR UPDATE TO authenticated USING (
        public.is_admin() OR (teacher_name = public.get_teacher_name())
    );

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
  u_role := COALESCE(new.raw_user_meta_data->>'role', 'teacher');
  u_name := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  
  -- Ensure teacher exists in teachers table
  INSERT INTO public.teachers (name)
  VALUES (t_name)
  ON CONFLICT (name) DO NOTHING;

  -- Insert profile
  INSERT INTO public.profiles (id, username, teacher_name, role)
  VALUES (new.id, u_name, t_name, u_role);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
