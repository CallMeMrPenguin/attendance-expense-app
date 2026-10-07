import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types/auth';
import { useToast } from '@/context/ToastContext';

export const DEFAULT_ADMIN: UserProfile = {
  id: '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
  username: 'buiduchung2004',
  teacherName: 'ADMIN',
  userName: 'ADMIN',
  role: 'admin',
  token: 'local_token_admin_auto'
};

export function useAuthSession() {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEFAULT_ADMIN);
  const [loading, setLoading] = useState(false);

  // Always force dark mode (night mode)
  useEffect(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  }, []);

  // Auto-reload client when a new local build is updated
  useEffect(() => {
    let currentVersion: string | null = null;

    const checkVersion = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.version && data.version !== 'local') {
          if (currentVersion === null) {
            currentVersion = data.version;
          } else if (currentVersion !== data.version) {
            console.log('New deployment detected! Auto reloading...');
            window.location.reload();
          }
        }
      } catch (e) {
        // Ignore network check errors
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, 25000);
    const onFocus = () => checkVersion();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Authenticate and fetch session on load
  useEffect(() => {
    let isMounted = true;

    // Safety timeout: never let loading hang more than 1.5s under any circumstance
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setCurrentUser(prev => prev || DEFAULT_ADMIN);
        setLoading(false);
      }
    }, 1500);

    const fetchSession = async () => {
      setLoading(true);
      try {
        let profile: any = null;
        let userToken = '';

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: p } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          if (p) {
            profile = p;
            userToken = session.access_token;
          }
        }

        if (!profile) {
          const { data: adminProf } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', 'buiduchung2004')
            .maybeSingle();

          if (adminProf) {
            profile = adminProf;
            userToken = `local_token_${adminProf.id}_auto`;
          } else {
            const { data: anyProf } = await supabase
              .from('profiles')
              .select('*')
              .order('role', { ascending: true })
              .limit(1)
              .maybeSingle();
            profile = anyProf;
            userToken = `local_token_${anyProf?.id || 'admin'}_auto`;
          }
        }

        if (isMounted) {
          if (profile) {
            const uName = (profile as any).user_name || profile.teacher_name || 'Admin';
            setCurrentUser({
              id: profile.id,
              username: profile.username,
              teacherName: uName,
              userName: uName,
              role: profile.role as any,
              token: userToken,
            });
          } else {
            setCurrentUser(DEFAULT_ADMIN);
          }
        }
      } catch (err) {
        console.error('Error fetching auth session:', err);
        if (isMounted) {
          setCurrentUser(DEFAULT_ADMIN);
        }
      } finally {
        if (isMounted) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    };

    fetchSession();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const handleLogout = useCallback(async () => {
    showToast('Hệ thống đang chạy chế độ Local không cần đăng nhập.', 'info');
  }, [showToast]);

  return {
    currentUser,
    setCurrentUser,
    loading,
    handleLogout
  };
}
