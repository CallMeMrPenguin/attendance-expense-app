import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, formatCleanTimeString, getDatesForWeekday, getPrevMonthStr } from '@/lib/utils';
import { cleanString } from '@/lib/constants/categories';
import { UserProfile } from '@/types/auth';
import { useToast } from '@/context/ToastContext';

interface UseScheduleDataProps {
  currentUser: UserProfile | null;
  chartSelectedMonths: string[];
}

export function useScheduleData({
  currentUser,
  chartSelectedMonths
}: UseScheduleDataProps) {
  const { showToast } = useToast();
  const [teachers, setTeachers] = useState<string[]>([]);
  const [activeTeacherName, setActiveTeacherName] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [sessionStudentConfigs, setSessionStudentConfigs] = useState<Record<string, { student_count: number; price_per_student: number; original_student_count?: number }>>({});
  const sessionStudentConfigsRef = useRef<Record<string, any>>({});
  useEffect(() => {
    sessionStudentConfigsRef.current = sessionStudentConfigs;
  }, [sessionStudentConfigs]);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'stats'>('month');
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Stats
  const [totalSessions, setTotalSessions] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [earnedIncome, setEarnedIncome] = useState(0);
  const [projectedIncome, setProjectedIncome] = useState(0);

  // Fetch teachers list
  const fetchTeachers = useCallback(async () => {
    if (!currentUser) return;

    if (currentUser.role !== 'admin') {
      setTeachers([currentUser.teacherName]);
      setActiveTeacherName(currentUser.teacherName);
      return;
    }

    const { data, error } = await supabase
      .from('teachers')
      .select('name')
      .neq('name', 'Giáo Viên 1')
      .order('name', { ascending: true });

    let list: string[] = [];
    if (!error && data) {
      list = (data as any[]).map((t: any) => t.name).filter((n: any) => n !== 'Giáo Viên 1');
    }

    if (list.length === 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*');
      if (profileData) {
        list = [...new Set((profileData as any[]).map((p: any) => p.user_name || p.teacher_name).filter((n: any) => n && n !== 'Giáo Viên 1'))] as string[];
      }
    }

    if (list.length > 0) {
      list.sort((a, b) => {
        if (a === 'ADMIN') return -1;
        if (b === 'ADMIN') return 1;
        if (a === 'Phạm Thị Thu Trang') return -1;
        if (b === 'Phạm Thị Thu Trang') return 1;
        return a.localeCompare(b);
      });
      setTeachers(list);
      setActiveTeacherName((prev) => {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('preferred_schedule_teacher') : null;
        if (saved && list.includes(saved)) return saved;
        const needsDefault =
          !prev ||
          prev === 'Giáo Viên 1' ||
          !list.includes(prev);
        return needsDefault ? list[0] : prev;
      });
    }
  }, [currentUser]);

  // Auto check-in processor for past/reached sessions
  const processAutoCheckIn = useCallback(async (items: Session[]): Promise<Session[]> => {
    if (!items || items.length === 0) return items;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const idsToUpdate: string[] = [];

    const updatedSessions = items.map((s) => {
      const isPending = s.status === 'Chưa làm' || s.status === 'Chưa dạy' || s.status === 'Chưa học';
      if (isPending && s.auto_checkin !== false && s.auto_check_in !== false) {
        const sDate = s.date;
        const sTime = formatCleanTimeString(s.time);

        const isPastDay = sDate < todayStr;
        const isTodayDue = sDate === todayStr && currentTimeStr >= sTime;

        if (isPastDay || isTodayDue) {
          idsToUpdate.push(s.id);
          return { ...s, status: 'Đã làm' };
        }
      }
      return s;
    });

    if (idsToUpdate.length > 0) {
      try {
        await supabase
          .from('sessions')
          .update({ status: 'Đã làm' })
          .in('id', idsToUpdate);
      } catch (err) {
        console.error('Error auto checking-in sessions:', err);
      }
      return updatedSessions;
    }

    return items;
  }, []);

  const normalizeSessionList = useCallback((rawList: any[], configs?: Record<string, any>): Session[] => {
    if (!Array.isArray(rawList)) return [];
    const cfgMap = configs || sessionStudentConfigsRef.current || {};
    return rawList.map(s => {
      const userName = s.user_name || s.teacher_name || 'Admin';
      const jobName = s.job_name || s.student_name || 'Công việc';
      let st = s.status || 'Chưa làm';
      if (st === 'Chưa dạy') st = 'Chưa làm';
      if (st === 'Đã dạy') st = 'Đã làm';

      const cleanJobKey = cleanString(jobName);
      const specificCfg = cfgMap[`sess_${s.id}`];
      const classCfg = cfgMap[`class_${cleanJobKey}`];
      const cfg = specificCfg || classCfg || {};

      const studentCount = s.student_count ?? specificCfg?.student_count ?? cfg.student_count ?? 1;
      const originalStudentCount = s.original_student_count ?? specificCfg?.original_student_count ?? cfg.original_student_count ?? classCfg?.student_count ?? studentCount;
      const pricePerStudent = s.price_per_student ?? specificCfg?.price_per_student ?? cfg.price_per_student ?? (studentCount > 0 ? Math.round((Number(s.price) || 0) / studentCount) : Number(s.price) || 0);
      const computedPrice = studentCount < originalStudentCount ? (studentCount * pricePerStudent) : (Number(s.price) || (studentCount * pricePerStudent));

      let studentNames: string[] = specificCfg?.student_names || classCfg?.student_names || s.student_names || [];
      if (!Array.isArray(studentNames) || studentNames.length === 0) {
        if (originalStudentCount > 1) {
          studentNames = Array.from({ length: originalStudentCount }, (_, i) => `Học sinh ${i + 1}`);
        }
      }

      const presentStudents: string[] = specificCfg?.present_students || s.present_students || (studentCount < originalStudentCount ? studentNames.slice(0, studentCount) : studentNames);
      const absentStudents: string[] = specificCfg?.absent_students || s.absent_students || (studentCount < originalStudentCount ? studentNames.filter(n => !presentStudents.includes(n)) : []);

      const autoCheckinVal = s.auto_check_in ?? s.auto_checkin ?? true;

      return {
        ...s,
        user_name: userName,
        teacher_name: userName,
        job_name: jobName,
        student_name: jobName,
        status: st,
        price: computedPrice,
        student_count: studentCount,
        price_per_student: pricePerStudent,
        original_student_count: originalStudentCount,
        student_names: studentNames,
        present_students: presentStudents,
        absent_students: absentStudents,
        auto_check_in: autoCheckinVal,
        auto_checkin: autoCheckinVal
      };
    });
  }, []);

  const getSessionStudentConfigsKey = (teacherName: string) => `session_student_configs_${cleanString(teacherName)}`;

  const fetchSessionStudentConfigs = useCallback(async (teacherName: string): Promise<Record<string, any>> => {
    if (!teacherName) return {};
    try {
      const { data } = await supabase
        .from('category_budgets')
        .select('note')
        .eq('id', getSessionStudentConfigsKey(teacherName))
        .maybeSingle();
      if (data?.note) {
        const parsed = JSON.parse(data.note);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (err) {
      console.error('Error reading session student configs:', err);
    }
    return {};
  }, []);

  const saveSessionStudentConfigs = useCallback(async (teacherName: string, configs: Record<string, any>, userId?: string) => {
    if (!teacherName) return;
    try {
      sessionStudentConfigsRef.current = configs;
      setSessionStudentConfigs(configs);
      const record = {
        id: getSessionStudentConfigsKey(teacherName),
        user_id: userId || '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
        user_name: teacherName,
        category: '__SESSION_STUDENT_CONFIGS__',
        amount: 0,
        type: 'settings',
        icon: 'Users',
        note: JSON.stringify(configs),
        updated_at: new Date().toISOString()
      };
      await (supabase.from('category_budgets') as any).upsert(record, { onConflict: 'id' });
    } catch (err) {
      console.error('Error saving session student configs:', err);
    }
  }, []);

  const getScheduleExclusionsKey = (teacherName: string) => `schedule_exclusions_${cleanString(teacherName)}`;

  const fetchScheduleExclusions = useCallback(async (teacherName: string): Promise<Record<string, string[]>> => {
    if (!teacherName) return {};
    try {
      const { data } = await supabase
        .from('category_budgets')
        .select('note')
        .eq('id', getScheduleExclusionsKey(teacherName))
        .maybeSingle();
      if (data?.note) {
        const parsed = JSON.parse(data.note);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (err) {
      console.error('Error reading schedule exclusions:', err);
    }
    return {};
  }, []);

  const saveScheduleExclusions = useCallback(async (teacherName: string, exclusions: Record<string, string[]>, userId?: string) => {
    if (!teacherName) return;
    try {
      const record = {
        id: getScheduleExclusionsKey(teacherName),
        user_id: userId || '2d3a11e1-4d71-474c-b8df-abb85394e9c8',
        user_name: teacherName,
        category: '__SCHEDULE_EXCLUSIONS__',
        amount: 0,
        type: 'settings',
        icon: 'CalendarX',
        note: JSON.stringify(exclusions),
        updated_at: new Date().toISOString()
      };
      await (supabase.from('category_budgets') as any).upsert(record, { onConflict: 'id' });
    } catch (err) {
      console.error('Error saving schedule exclusions:', err);
    }
  }, []);

  const syncFixedSchedulesForMonth = useCallback(async (targetMonth: string, currentMonthData: any[], teacherName: string) => {
    if (!targetMonth || !teacherName) return currentMonthData;
    try {
      const exclusions = await fetchScheduleExclusions(teacherName);
      const monthExclusions = (exclusions[targetMonth] || []).map(x => x.toLowerCase().trim());
      const allExclusions = (exclusions['all'] || []).map(x => x.toLowerCase().trim());

      const { data: priorSessions, error: priorErr } = await supabase
        .from('sessions')
        .select('*')
        .ilike('user_name', teacherName)
        .lt('month_year', targetMonth);

      if (priorErr || !priorSessions || priorSessions.length === 0) {
        return currentMonthData;
      }

      const coDinhItems = priorSessions.filter((s: any) => 
        (s.loai_hinh || s.loai_hinh_lich) !== 'tam_thoi'
      );
      if (coDinhItems.length === 0) return currentMonthData;

      const priorMonths = Array.from(new Set(coDinhItems.map((s: any) => s.month_year))).sort();
      const mostRecentPriorMonth = priorMonths[priorMonths.length - 1];
      if (!mostRecentPriorMonth) return currentMonthData;

      const latestPriorSessions = coDinhItems.filter((s: any) => s.month_year === mostRecentPriorMonth);

      const existingStudentNames = new Set(
        currentMonthData.map((s: any) => (s.student_name || s.job_name || '').trim().toLowerCase())
      );

      const studentsToCarryForwardMap = new Map<string, any[]>();
      for (const s of latestPriorSessions) {
        const sName = (s.student_name || s.job_name || '').trim();
        if (!sName) continue;
        const key = sName.toLowerCase();

        if (monthExclusions.includes(key) || allExclusions.includes(key)) {
          continue;
        }

        if (!existingStudentNames.has(key)) {
          if (!studentsToCarryForwardMap.has(key)) {
            studentsToCarryForwardMap.set(key, []);
          }
          studentsToCarryForwardMap.get(key)!.push(s);
        }
      }

      if (studentsToCarryForwardMap.size === 0) {
        return currentMonthData;
      }

      const newCandidates: any[] = [];
      studentsToCarryForwardMap.forEach((sessionsList) => {
        const patternMap = new Map<string, any>();
        sessionsList.forEach((s) => {
          const patternKey = `${s.day_of_week}_${s.time}`;
          if (!patternMap.has(patternKey)) {
            patternMap.set(patternKey, s);
          }
        });

        patternMap.forEach((templateSession) => {
          const dates = getDatesForWeekday(targetMonth, templateSession.day_of_week);
          dates.forEach((dStr) => {
            newCandidates.push({
              id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined,
              user_name: teacherName,
              teacher_name: teacherName,
              job_name: templateSession.job_name || templateSession.student_name,
              student_name: templateSession.student_name || templateSession.job_name,
              day_of_week: templateSession.day_of_week,
              time: formatCleanTimeString(templateSession.time),
              duration: Number(templateSession.duration || 2),
              price: Number(templateSession.price || 0),
              status: 'Chưa làm',
              month_year: targetMonth,
              color: templateSession.color || '#7c3aed',
              date: dStr,
              auto_check_in: templateSession.auto_check_in ?? templateSession.auto_checkin ?? true,
              auto_checkin: templateSession.auto_checkin ?? templateSession.auto_check_in ?? true,
              loai_hinh_lich: 'co_dinh',
              loai_hinh: 'co_dinh',
              income_category: templateSession.income_category || templateSession.category || 'Giáo dục'
            });
          });
        });
      });

      if (newCandidates.length === 0) return currentMonthData;

      let { data: insertedData, error: insertErr } = await supabase
        .from('sessions')
        .insert(newCandidates)
        .select('*');

      if (insertErr) {
        const cleanCandidates = newCandidates.map(({ student_name, teacher_name, category, ...rest }: any) => rest);
        const retryRes = await supabase.from('sessions').insert(cleanCandidates).select('*');
        insertedData = retryRes.data;
        insertErr = retryRes.error;
      }

      if (!insertErr && insertedData && insertedData.length > 0) {
        return [...currentMonthData, ...insertedData];
      } else if (newCandidates.length > 0) {
        return [...currentMonthData, ...newCandidates];
      }
    } catch (err) {
      console.error('Error syncing fixed schedules:', err);
    }
    return currentMonthData;
  }, [fetchScheduleExclusions]);

  const calculateStats = useCallback((items: Session[]) => {
    let total = items.length;
    let completed = 0;
    let earned = 0;
    let projected = 0;

    items.forEach((s) => {
      if (s.status === 'Đã làm' || s.status === 'Đã dạy') {
        completed++;
        earned += Number(s.price) || 0;
      }
      if (s.status !== 'Hủy') {
        projected += Number(s.price) || 0;
      }
    });

    setTotalSessions(total);
    setCompletedSessions(completed);
    setEarnedIncome(earned);
    setProjectedIncome(projected);
  }, []);

  const chartSelectedMonthsKey = chartSelectedMonths.join(',');
  const currentUserRole = currentUser?.role;

  const fetchSessions = useCallback(async () => {
    if (!selectedMonth) return;
    setScheduleLoading(true);

    let studentConfigs: Record<string, any> = {};
    if (activeTeacherName) {
      studentConfigs = await fetchSessionStudentConfigs(activeTeacherName);
      if (JSON.stringify(studentConfigs) !== JSON.stringify(sessionStudentConfigsRef.current)) {
        sessionStudentConfigsRef.current = studentConfigs;
        setSessionStudentConfigs(studentConfigs);
      }

      let { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_name', activeTeacherName)
        .eq('month_year', selectedMonth);

      if ((error || !data || data.length === 0) && activeTeacherName) {
        const res2 = await supabase
          .from('sessions')
          .select('*')
          .eq('teacher_name', activeTeacherName)
          .eq('month_year', selectedMonth);
        if (!res2.error && res2.data) {
          data = res2.data;
          error = null;
        }
      }

      const initialData = data || [];
      const syncedData = await syncFixedSchedulesForMonth(selectedMonth, initialData, activeTeacherName);
      const normalized = normalizeSessionList(syncedData, studentConfigs);
      const processed = await processAutoCheckIn(normalized);
      setSessions(processed);
      calculateStats(processed);
    } else {
      setSessions([]);
      calculateStats([]);
    }

    if (currentUserRole === 'admin') {
      const selectedList = chartSelectedMonths.length > 0 ? chartSelectedMonths : [selectedMonth];
      const priorList = selectedList.map(m => getPrevMonthStr(m));
      const monthsToFetch = Array.from(new Set([...selectedList, ...priorList]));
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .in('month_year', monthsToFetch);
      if (!error && data) {
        const normalizedAll = normalizeSessionList(data, studentConfigs);
        const processedAll = await processAutoCheckIn(normalizedAll);
        setAllSessions(processedAll);
      } else {
        setAllSessions([]);
      }
    } else {
      setAllSessions([]);
    }

    setScheduleLoading(false);
  }, [
    activeTeacherName,
    selectedMonth,
    chartSelectedMonthsKey,
    currentUserRole,
    processAutoCheckIn,
    fetchSessionStudentConfigs,
    normalizeSessionList,
    syncFixedSchedulesForMonth,
    calculateStats,
    chartSelectedMonths
  ]);

  const handleDeleteSchedule = useCallback(async (jobName: string, scope: 'month' | 'all') => {
    if (!jobName || !activeTeacherName) return;
    setScheduleLoading(true);
    try {
      const cleanName = jobName.trim();
      const cleanKey = cleanName.toLowerCase();

      if (scope === 'month') {
        const { data: delRows } = await supabase
          .from('sessions')
          .delete()
          .ilike('user_name', activeTeacherName)
          .ilike('job_name', cleanName)
          .eq('month_year', selectedMonth)
          .select('id');

        if (!delRows || delRows.length === 0) {
          await supabase
            .from('sessions')
            .delete()
            .ilike('job_name', cleanName)
            .eq('month_year', selectedMonth);
        }

        setSessions(prev => prev.filter(s => {
          const jName = (s.job_name || s.student_name || '').trim().toLowerCase();
          return jName !== cleanKey;
        }));

        const exclusions = await fetchScheduleExclusions(activeTeacherName);
        const currentMonthList = exclusions[selectedMonth] || [];
        if (!currentMonthList.some(x => x.toLowerCase() === cleanKey)) {
          exclusions[selectedMonth] = [...currentMonthList, cleanKey];
          await saveScheduleExclusions(activeTeacherName, exclusions, currentUser?.id);
        }

        showToast(`Đã xóa lịch trình "${cleanName}" trong tháng ${selectedMonth}!`, 'success');
      } else {
        const { data: delRows } = await supabase
          .from('sessions')
          .delete()
          .ilike('user_name', activeTeacherName)
          .ilike('job_name', cleanName)
          .select('id');

        if (!delRows || delRows.length === 0) {
          await supabase
            .from('sessions')
            .delete()
            .ilike('job_name', cleanName);
        }

        setSessions(prev => prev.filter(s => {
          const jName = (s.job_name || s.student_name || '').trim().toLowerCase();
          return jName !== cleanKey;
        }));

        const exclusions = await fetchScheduleExclusions(activeTeacherName);
        const allList = exclusions['all'] || [];
        if (!allList.some(x => x.toLowerCase() === cleanKey)) {
          exclusions['all'] = [...allList, cleanKey];
          await saveScheduleExclusions(activeTeacherName, exclusions, currentUser?.id);
        }

        showToast(`Đã xóa vĩnh viễn lịch trình "${cleanName}" khỏi hệ thống!`, 'success');
      }

      await fetchSessions();
    } catch (err: any) {
      console.error('Error in handleDeleteSchedule:', err);
      showToast(err.message || 'Lỗi khi xóa lịch trình.', 'error');
    } finally {
      setScheduleLoading(false);
    }
  }, [activeTeacherName, selectedMonth, currentUser, fetchScheduleExclusions, saveScheduleExclusions, fetchSessions, showToast]);

  const handleDeleteSingleSession = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    setScheduleLoading(true);
    try {
      const { error: delErr } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (delErr) throw new Error(delErr.message);

      showToast('Đã xóa ca làm việc thành công!', 'success');
      await fetchSessions();
    } catch (err: any) {
      console.error('Error in handleDeleteSingleSession:', err);
      showToast(err.message || 'Lỗi khi xóa ca làm việc.', 'error');
    } finally {
      setScheduleLoading(false);
    }
  }, [fetchSessions, showToast]);

  const handleClearScheduleExclusion = useCallback(async (jobName: string, month: string) => {
    if (!jobName || !activeTeacherName) return;
    try {
      const key = jobName.trim().toLowerCase();
      const exclusions = await fetchScheduleExclusions(activeTeacherName);
      let changed = false;
      if (exclusions[month]) {
        exclusions[month] = exclusions[month].filter(x => x.toLowerCase() !== key);
        changed = true;
      }
      if (exclusions['all']) {
        exclusions['all'] = exclusions['all'].filter(x => x.toLowerCase() !== key);
        changed = true;
      }
      if (changed) {
        await saveScheduleExclusions(activeTeacherName, exclusions, currentUser?.id);
      }
    } catch (err) {
      console.error('Error clearing schedule exclusion:', err);
    }
  }, [activeTeacherName, currentUser, fetchScheduleExclusions, saveScheduleExclusions]);

  useEffect(() => {
    if (currentUser) {
      fetchTeachers();
    }
  }, [currentUser, fetchTeachers]);

  const fetchSessionsRef = useRef(fetchSessions);
  fetchSessionsRef.current = fetchSessions;

  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const allSessionsRef = useRef(allSessions);
  allSessionsRef.current = allSessions;

  useEffect(() => {
    if (selectedMonth) {
      fetchSessionsRef.current();
    }
  }, [selectedMonth, activeTeacherName, chartSelectedMonthsKey, currentUser?.id]);

  // Periodic timer for live auto check-in every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const currentSessions = sessionsRef.current;
      if (currentSessions && currentSessions.length > 0) {
        const updatedSessions = await processAutoCheckIn(currentSessions);
        if (updatedSessions !== currentSessions) {
          setSessions(updatedSessions);
          calculateStats(updatedSessions);
        }
      }

      const currentAll = allSessionsRef.current;
      if (currentAll && currentAll.length > 0) {
        const updatedAll = await processAutoCheckIn(currentAll);
        if (updatedAll !== currentAll) {
          setAllSessions(updatedAll);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [processAutoCheckIn, calculateStats]);

  const handleTeacherUpdated = useCallback((updatedActiveName?: string) => {
    fetchTeachers();
    if (updatedActiveName) {
      setActiveTeacherName(updatedActiveName);
    }
    fetchSessions();
  }, [fetchTeachers, fetchSessions]);

  return {
    teachers,
    activeTeacherName,
    setActiveTeacherName,
    sessions,
    allSessions,
    sessionStudentConfigs,
    selectedMonth,
    setSelectedMonth,
    currentView,
    setCurrentView,
    scheduleLoading,
    totalSessions,
    completedSessions,
    earnedIncome,
    projectedIncome,
    fetchTeachers,
    fetchSessions,
    handleTeacherUpdated,
    handleDeleteSchedule,
    handleDeleteSingleSession,
    handleClearScheduleExclusion,
    saveSessionStudentConfigs
  };
}
