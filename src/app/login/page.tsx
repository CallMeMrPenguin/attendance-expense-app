'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  GraduationCap, 
  Lock, 
  User, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password visibility and Remember Me states
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // If already logged in, redirect to home page
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
      }
    };
    checkSession();

    // Retrieve saved login credentials if checked previously
    const savedUser = localStorage.getItem('remembered_username');
    const savedPass = localStorage.getItem('remembered_password');
    if (savedUser && savedPass) {
      setUsername(savedUser);
      setPassword(savedPass);
      setRememberMe(true);
    }
  }, [router]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cleanInput = username.trim().toLowerCase();
      let loginEmail = cleanInput;
      let authData: any = null;
      let authError: any = null;

      // 1. Try to sync via server-side secure credentials sync API first
      let syncedEmail = null;
      try {
        const syncRes = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanInput, password })
        });
        if (syncRes.ok) {
          const syncJson = await syncRes.json();
          if (syncJson.status === 'success' && syncJson.email) {
            syncedEmail = syncJson.email;
          }
        }
      } catch (syncErr) {
        console.warn('API credentials sync failed/unavailable:', syncErr);
      }

      if (syncedEmail) {
        // Auth is synced on server, now sign in client-side using the resolved email
        const result = await supabase.auth.signInWithPassword({
          email: syncedEmail,
          password: password,
        });
        authData = result.data;
        authError = result.error;
      } else {
        // 2. Fallback to client-side email resolution if API sync failed/local
        if (!cleanInput.includes('@')) {
          let resolvedEmail = null;
          try {
            const { data, error: rpcError } = await supabase.rpc('resolve_username_email', { p_username: cleanInput });
            if (!rpcError && data) {
              resolvedEmail = data;
            }
          } catch (rpcErr) {
            console.warn('RPC resolve_username_email failed:', rpcErr);
          }

          if (!resolvedEmail) {
            try {
              const { data: matchedProfile } = await supabase
                .from('profiles')
                .select('email')
                .eq('username', cleanInput)
                .maybeSingle();
              if (matchedProfile?.email) {
                resolvedEmail = matchedProfile.email;
              }
            } catch (dbErr) {
              console.warn('Direct profile lookup failed:', dbErr);
            }
          }

          if (resolvedEmail) {
            loginEmail = resolvedEmail;
          } else {
            loginEmail = `${cleanInput}@giasupro.com`;
          }
        }

        const result = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: password,
        });

        if (!result.error && result.data?.user) {
          authData = result.data;
        } else {
          authError = result.error;
          if (!cleanInput.includes('@') && loginEmail.endsWith('@giasupro.com')) {
            const secondResult = await supabase.auth.signInWithPassword({
              email: `${cleanInput}@gmail.com`,
              password: password,
            });
            if (!secondResult.error && secondResult.data?.user) {
              authData = secondResult.data;
              authError = null;
            } else {
              authError = secondResult.error;
            }
          }
        }
      }

      if (authError || !authData?.user) {
        setError(
          authError?.message?.includes('Invalid login')
            ? 'Tên đăng nhập hoặc mật khẩu không chính xác!'
            : `Đăng nhập thất bại: ${authError?.message || 'Không rõ nguyên nhân'}`
        );
        setLoading(false);
        return;
      }

      // 3. Auth succeeded - read the profile (session is active, RLS passes)
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('username, teacher_name, role')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (!userProfile) {
        setError('Tài khoản tồn tại nhưng chưa có hồ sơ. Vui lòng liên hệ quản trị viên.');
        setLoading(false);
        return;
      }

      // Store custom teacher session in localStorage for seamless dashboard access
      localStorage.setItem('custom_teacher_session', JSON.stringify({
        username: userProfile.username,
        teacherName: userProfile.teacher_name,
        role: userProfile.role
      }));

      // Save credentials if Remember Me is checked
      if (rememberMe) {
        localStorage.setItem('remembered_username', username.trim());
        localStorage.setItem('remembered_password', password);
      } else {
        localStorage.removeItem('remembered_username');
        localStorage.removeItem('remembered_password');
      }

      // Redirect to dashboard
      router.push('/');
    } catch (err: any) {
      setError('Có lỗi xảy ra: ' + (err.message || 'Không rõ nguyên nhân'));
      setLoading(false);
    }
  };



  return (
    <main className="min-h-screen flex items-center justify-center grid-bg-dark p-4">
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 animate-fade-in text-white">
        
        {/* Header/Logo */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-16 w-16 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
            <GraduationCap className="h-9 w-9" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-300 via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
            GiaSư Pro
          </h1>
          <p className="text-slate-400 text-sm mt-1">Hệ Thống Chấm Công & Quản Lý Lịch</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm mb-6 animate-fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-slate-300 font-semibold text-xs tracking-wider uppercase">
              Tên Đăng Nhập *
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                id="username"
                type="text"
                required
                disabled={loading}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập (VD: admin)..."
                className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-slate-300 font-semibold text-xs tracking-wider uppercase">
              Mật Khẩu *
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full pl-11 pr-11 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {/* Remember me checkbox row */}
          <div className="flex items-center justify-between py-1 select-none">
            <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-350 text-xs font-semibold">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-slate-950/60 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang Đăng Nhập...
              </>
            ) : (
              'Đăng Nhập'
            )}
          </button>
        </form>

        {/* Demo/Instructions Info */}
        <div className="mt-8 text-center text-xs text-slate-500 border-t border-white/5 pt-4">
          <p>Dùng tài khoản do quản trị viên cấp để đăng nhập.</p>
        </div>
      </div>
    </main>
  );
}
