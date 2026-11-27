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

  const [scheduleTemplates, setScheduleTemplates] = useState<Record<string, any>>({});
  const scheduleTemplatesRef = useRef<Record<string, any>>({});
  useEffect(() => {
    scheduleTemplatesRef.current = scheduleTemplates;
  }, [scheduleTemplates]);

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
      const isAutoEnabled = s.auto_checkin !== false && (s.auto_checkin as any) !== 0 && s.auto_check_in !== false && (s.auto_check_in as any) !== 0;
      if (isPending && isAutoEnabled) {
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

      const rawAuto = s.auto_check_in ?? s.auto_checkin ?? true;
      const autoCheckinVal = rawAuto !== false && rawAuto !== 0;

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
      const key = getSessionStudentConfigsKey(teacherName);
      // Check table_settings first
      const { data: tsData } = await supabase
        .from('table_settings')
        .select('setting_value')
        .eq('id', key)
        .maybeSingle();
      if (tsData?.setting_value) {
        const parsed = JSON.parse(tsData.setting_value);
        if (parsed && typeof parsed === 'object') return parsed;
      }

      // Fallback to category_budgets
      const { data } = await supabase
        .from('category_budgets')
        .select('note')
        .eq('id', key)
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
      const key = getSessionStudentConfigsKey(teacherName);
      const uId = userId || '2d3a11e1-4d71-474c-b8df-abb85394e9c8';
      const jsonStr = JSON.stringify(configs);
      const nowStr = new Date().toISOString();

      // Save to table_settings
      await (supabase.from('table_settings') as any).upsert({
        id: key,
        table_id: 'sessions',
        user_id: uId,
        setting_key: key,
        setting_value: jsonStr,
        updated_at: nowStr
      }, { onConflict: 'id' });

      // Save to category_budgets for backward compatibility
      const record = {
        id: key,
        user_id: uId,
        user_name: teacherName,
        category: '__SESSION_STUDENT_CONFIGS__',
        amount: 0,
        type: 'settings',
        icon: 'Users',
        note: jsonStr,
        updated_at: nowStr
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
      const key = getScheduleExclusionsKey(teacherName);
      // Check table_settings first
      const { data: tsData } = await supabase
        .from('table_settings')
        .select('setting_value')
        .eq('id', key)
        .maybeSingle();
      if (tsData?.setting_value) {
        const parsed = JSON.parse(tsData.setting_value);
        if (parsed && typeof parsed === 'object') return parsed;
      }

      // Fallback to category_budgets
      const { data } = await supabase
        .from('category_budgets')
        .select('note')
        .eq('id', key)
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
      const key = getScheduleExclusionsKey(teacherName);
      const uId = userId || '2d3a11e1-4d71-474c-b8df-abb85394e9c8';
      const jsonStr = JSON.stringify(exclusions);
      const nowStr = new Date().toISOString();

      // Save to table_settings
      await (supabase.from('table_settings') as any).upsert({
        id: key,
        table_id: 'schedule_exclusions',
        user_id: uId,
        setting_key: key,
        setting_value: jsonStr,
        updated_at: nowStr
      }, { onConflict: 'id' });

      // Save to category_budgets for backward compatibility
      const record = {
        id: key,
        user_id: uId,
        user_name: teacherName,
        category: '__SCHEDULE_EXCLUSIONS__',
        amount: 0,
        type: 'settings',
        icon: 'CalendarX',
        note: jsonStr,
        updated_at: nowStr
      };
      await (supabase.from('category_budgets') as any).upsert(record, { onConflict: 'id' });
    } catch (err) {
      console.error('Error saving schedule exclusions:', err);
    }
  }, []);

  const getScheduleTemplatesKey = (teacherName: string) => `schedule_templates_${cleanString(teacherName)}`;

  const fetchScheduleTemplates = useCallback(async (teacherName: string): Promise<Record<string, any>> => {
    if (!teacherName) return {};
    try {
      const key = getScheduleTemplatesKey(teacherName);
      const { data: tsData } = await supabase
        .from('table_settings')
        .select('setting_value')
        .eq('id', key)
        .maybeSingle();
      if (tsData?.setting_value) {
        const parsed = JSON.parse(tsData.setting_value);
        if (parsed && typeof parsed === 'object') return parsed;
      }

      const { data } = await supabase
        .from('category_budgets')
        .select('note')
        .eq('id', key)
        .maybeSingle();
      if (data?.note) {
        const parsed = JSON.parse(data.note);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (err) {
      console.error('Error reading schedule templates:', err);
    }
    return {};
  }, []);

  const saveScheduleTemplates = useCallback(async (teacherName: string, templates: Record<string, any>, userId?: string) => {
    if (!teacherName) return;
    try {
      scheduleTemplatesRef.current = templates;
      setScheduleTemplates(templates);
      const key = getScheduleTemplatesKey(teacherName);
      const uId = userId || '2d3a11e1-4d71-474c-b8df-abb85394e9c8';
      const jsonStr = JSON.stringify(templates);
      const nowStr = new Date().toISOString();

      await (supabase.from('table_settings') as any).upsert({
        id: key,
        table_id: 'schedule_templates',
        user_id: uId,
        setting_key: key,
        setting_value: jsonStr,
        updated_at: nowStr
      }, { onConflict: 'id' });

      await (supabase.from('category_budgets') as any).upsert({
        id: key,
        user_id: uId,
        user_name: teacherName,
        category: '__SCHEDULE_TEMPLATES__',
        amount: 0,
        type: 'settings',
        icon: 'Calendar',
        note: jsonStr,
        updated_at: nowStr
      }, { onConflict: 'id' });
    } catch (err) {
      console.error('Error saving schedule templates:', err);
    }
  }, []);

  const syncFixedSchedulesForMonth = useCallback(async (targetMonth: string, currentMonthData: any[], teacherName: string) => {
    if (!targetMonth || !teacherName) return currentMonthData;
    try {
      const [exclusions, savedTemplates] = await Promise.all([
        fetchScheduleExclusions(teacherName),
        fetchScheduleTemplates(teacherName)
      ]);
      scheduleTemplatesRef.current = savedTemplates || {};
      setScheduleTemplates(savedTemplates || {});

      const monthExclusions = (exclusions[targetMonth] || []).map(x => x.toLowerCase().trim());
      const allExclusions = (exclusions['all'] || []).map(x => x.toLowerCase().trim());
      const prevMonth = getPrevMonthStr(targetMonth);

      // Map any old renamed schedule names to their latest canonical schedule name
      const renamedOldToNew = new Map<string, string>();
      const canonicalDisplayNames = new Map<string, string>();
      Object.values(savedTemplates || {}).forEach((tpl: any) => {
        if (!tpl || !tpl.job_name) return;
        const canonicalKey = String(tpl.job_name).trim().toLowerCase();
        canonicalDisplayNames.set(canonicalKey, String(tpl.job_name).trim());
        if (Array.isArray(tpl.previous_names)) {
          tpl.previous_names.forEach((oldN: string) => {
            const oldKey = String(oldN || '').trim().toLowerCase();
            if (oldKey && oldKey !== canonicalKey) {
              renamedOldToNew.set(oldKey, canonicalKey);
            }
          });
        }
      });

      const { data: priorSessions, error: priorErr } = await supabase
        .from('sessions')
        .select('*')
        .ilike('user_name', teacherName)
        .lt('month_year', targetMonth);

      const coDinhItems = (!priorErr && priorSessions ? priorSessions : []).filter((s: any) => 
        (s.loai_hinh || s.loai_hinh_lich) !== 'tam_thoi'
      );

      // Group prior co_dinh sessions by student and find each student's most recent prior month
      const studentPriorByMonth = new Map<string, Map<string, any[]>>();
      for (const s of coDinhItems) {
        const rawName = (s.student_name || s.job_name || '').trim();
        if (!rawName) continue;
        const rawKey = rawName.toLowerCase();
        const key = renamedOldToNew.get(rawKey) || rawKey;
        const canonicalName = canonicalDisplayNames.get(key) || rawName;
        if (monthExclusions.includes(key)) continue;

        if (!studentPriorByMonth.has(key)) {
          studentPriorByMonth.set(key, new Map());
        }
        const monthMap = studentPriorByMonth.get(key)!;
        if (!monthMap.has(s.month_year)) {
          monthMap.set(s.month_year, []);
        }
        monthMap.get(s.month_year)!.push({
          ...s,
          job_name: canonicalName,
          student_name: canonicalName
        });
      }

      // Heal stale global ('all') exclusions when a student actively has co_dinh sessions in the immediately preceding month
      const staleAllExclusions: string[] = [];
      for (const [key, monthMap] of studentPriorByMonth.entries()) {
        if (allExclusions.includes(key)) {
          if (monthMap.has(prevMonth)) {
            staleAllExclusions.push(key);
          } else {
            studentPriorByMonth.delete(key);
          }
        }
      }
      if (staleAllExclusions.length > 0 && Array.isArray(exclusions['all'])) {
        exclusions['all'] = exclusions['all'].filter(x => !staleAllExclusions.includes(x.toLowerCase().trim()));
        saveScheduleExclusions(teacherName, exclusions).catch(() => {});
      }

      // Extract true weekly recurring templates per student from their most recent prior month
      const studentValidTemplates = new Map<string, Map<string, any>>();
      studentPriorByMonth.forEach((monthMap, studentKey) => {
        const months = Array.from(monthMap.keys()).sort();
        const latestMonth = months[months.length - 1];
        if (!latestMonth) return;
        const sessionsList = monthMap.get(latestMonth) || [];

        // Group by day_of_week to distinguish true weekly recurring days from 1-2 time makeup sessions
        const byDay = new Map<string, any[]>();
        sessionsList.forEach((s) => {
          const day = s.day_of_week;
          if (!day) return;
          if (!byDay.has(day)) byDay.set(day, []);
          byDay.get(day)!.push(s);
        });

        let maxDayCount = 0;
        byDay.forEach((list) => {
          if (list.length > maxDayCount) maxDayCount = list.length;
        });

        const dayTemplateMap = new Map<string, any>();
        byDay.forEach((list, day) => {
          const nonCancelled = list.filter((s) => s.status !== 'Hủy');
          // If student has regular weekly slots (>= 3 sessions/month), ignore 1-2 time makeup/cancelled days
          if (maxDayCount >= 3 && list.length <= 2 && nonCancelled.length <= 1) {
            return;
          }
          if (list.length === 0) return;

          // Pick the most frequent time on this weekday so we never generate duplicate sessions on the same day
          const timeCounts = new Map<string, { count: number; template: any }>();
          list.forEach((s) => {
            const cleanT = formatCleanTimeString(s.time);
            const cur = timeCounts.get(cleanT);
            if (!cur) {
              timeCounts.set(cleanT, { count: 1, template: s });
            } else {
              cur.count++;
            }
          });

          let bestTemplate = list[0];
          let bestCount = -1;
          timeCounts.forEach(({ count, template }) => {
            if (count > bestCount) {
              bestCount = count;
              bestTemplate = template;
            }
          });

          dayTemplateMap.set(day, bestTemplate);
        });

        if (dayTemplateMap.size > 0) {
          studentValidTemplates.set(studentKey, dayTemplateMap);
        }
      });

      // Overlay explicit saved permanent recurring templates (from "Từ tuần sau" / "Từ tháng sau" / "Tháng này" saves)
      const explicitTemplateStudents = new Set<string>();
      const partialTransitionTemplates = new Map<string, { effectiveFrom: string; days: Map<string, any> }>();
      Object.values(savedTemplates || {}).forEach((tpl: any) => {
        if (!tpl || !tpl.job_name) return;
        const studentKey = String(tpl.job_name).trim().toLowerCase();
        if (!studentKey || monthExclusions.includes(studentKey)) return;
        if (allExclusions.includes(studentKey) && !staleAllExclusions.includes(studentKey)) return;

        if (tpl.loai_hinh === 'tam_thoi') {
          studentValidTemplates.delete(studentKey);
          return;
        }

        const effMonth = String(tpl.effective_month || '0000-00');
        const effFrom = String(tpl.effective_from || '0000-00-00');
        if (targetMonth >= effMonth && tpl.days && typeof tpl.days === 'object') {
          const dayEntries = Object.entries(tpl.days);
          if (dayEntries.length > 0) {
            const dayTemplateMap = new Map<string, any>();
            dayEntries.forEach(([day, dCfg]: [string, any]) => {
              if (!day || !dCfg) return;
              dayTemplateMap.set(day, {
                user_name: teacherName,
                teacher_name: teacherName,
                job_name: String(tpl.job_name).trim(),
                student_name: String(tpl.job_name).trim(),
                day_of_week: day,
                time: formatCleanTimeString(dCfg.time || '18:00'),
                duration: Number(dCfg.duration || 2),
                price: Number(tpl.price || 0),
                color: tpl.color || '#7c3aed',
                auto_check_in: tpl.auto_checkin ?? true,
                auto_checkin: tpl.auto_checkin ?? true,
                loai_hinh_lich: 'co_dinh',
                loai_hinh: 'co_dinh',
                income_category: tpl.income_category || 'Gia Sư',
                effective_from: effFrom
              });
            });
            if (dayTemplateMap.size > 0) {
              if (targetMonth > effMonth || effFrom <= `${targetMonth}-01`) {
                studentValidTemplates.set(studentKey, dayTemplateMap);
                explicitTemplateStudents.add(studentKey);
              } else {
                // Mid-month transition inside effMonth (e.g. "Từ Đầu Tuần Sau" falling mid-month):
                // keep prior template before effFrom, and enforce new template from effFrom onward
                partialTransitionTemplates.set(studentKey, { effectiveFrom: effFrom, days: dayTemplateMap });
                explicitTemplateStudents.add(studentKey);
              }
            }
          }
        }
      });

      if (studentValidTemplates.size === 0 && partialTransitionTemplates.size === 0) return currentMonthData;

      // Clean up any stale auto-generated (fix_...) sessions in currentMonthData that no longer match prior month's recurring days/times or were renamed
      const staleAutoIdsToDelete: string[] = [];
      const studentsWithDeletedStaleAuto = new Set<string>();
      let cleanedCurrentMonthData = currentMonthData;

      currentMonthData.forEach((s: any) => {
        const sId = String(s.id || '');
        if (!sId.startsWith('fix_')) return;
        const rawSName = (s.student_name || s.job_name || '').trim().toLowerCase();
        if (renamedOldToNew.has(rawSName)) {
          staleAutoIdsToDelete.push(sId);
          studentsWithDeletedStaleAuto.add(renamedOldToNew.get(rawSName)!);
          return;
        }
        const partial = partialTransitionTemplates.get(rawSName);
        if (partial && s.date >= partial.effectiveFrom) {
          const partialMatch = partial.days.get(s.day_of_week);
          if (!partialMatch || formatCleanTimeString(partialMatch.time) !== formatCleanTimeString(s.time)) {
            staleAutoIdsToDelete.push(sId);
            studentsWithDeletedStaleAuto.add(rawSName);
          }
          return;
        }
        const validDaysMap = studentValidTemplates.get(rawSName);
        if (!validDaysMap) return;

        const matchingTemplate = validDaysMap.get(s.day_of_week);
        const effFrom = matchingTemplate?.effective_from || '0000-00-00';
        if (s.date >= effFrom && (!matchingTemplate || formatCleanTimeString(matchingTemplate.time) !== formatCleanTimeString(s.time))) {
          staleAutoIdsToDelete.push(sId);
          studentsWithDeletedStaleAuto.add(rawSName);
        }
      });

      if (staleAutoIdsToDelete.length > 0) {
        cleanedCurrentMonthData = currentMonthData.filter((s: any) => !staleAutoIdsToDelete.includes(String(s.id || '')));
        try {
          await supabase.from('sessions').delete().in('id', staleAutoIdsToDelete);
        } catch (e) {}
      }

      // Only treat existing co_dinh sessions as "already generated" so a standalone makeup (tam_thoi) session won't suppress fixed schedules
      const existingCoDinhStudentNames = new Set(
        cleanedCurrentMonthData
          .filter((s: any) => (s.loai_hinh || s.loai_hinh_lich) !== 'tam_thoi')
          .map((s: any) => (s.student_name || s.job_name || '').trim().toLowerCase())
      );

      const existingCoDinhWeekdaysByStudent = new Map<string, Set<string>>();
      const existingDatesByStudent = new Map<string, Set<string>>();
      cleanedCurrentMonthData.forEach((s: any) => {
        const sKey = (s.student_name || s.job_name || '').trim().toLowerCase();
        if (!existingDatesByStudent.has(sKey)) existingDatesByStudent.set(sKey, new Set());
        existingDatesByStudent.get(sKey)!.add(s.date);
        if ((s.loai_hinh || s.loai_hinh_lich) !== 'tam_thoi') {
          if (!existingCoDinhWeekdaysByStudent.has(sKey)) existingCoDinhWeekdaysByStudent.set(sKey, new Set());
          existingCoDinhWeekdaysByStudent.get(sKey)!.add(s.day_of_week);
        }
      });

      const existingSlotKeys = new Set(
        cleanedCurrentMonthData.map((s: any) => `${(s.student_name || s.job_name || '').trim().toLowerCase()}_${s.date}_${formatCleanTimeString(s.time)}`)
      );

      const newCandidates: any[] = [];
      const pushTemplateCandidates = (studentKey: string, dayTemplateMap: Map<string, any>, minDateInclusive?: string, maxDateExclusive?: string) => {
        const hasExistingCoDinh = existingCoDinhStudentNames.has(studentKey);
        const canFillMissingWeekdays = studentsWithDeletedStaleAuto.has(studentKey) || explicitTemplateStudents.has(studentKey);
        if (hasExistingCoDinh && !canFillMissingWeekdays && !minDateInclusive) return;

        const existingWeekdays = existingCoDinhWeekdaysByStudent.get(studentKey) || new Set<string>();
        const existingDates = existingDatesByStudent.get(studentKey) || new Set<string>();

        dayTemplateMap.forEach((templateSession, day) => {
          if (!minDateInclusive && hasExistingCoDinh && existingWeekdays.has(day)) return;

          const effFrom = minDateInclusive || templateSession.effective_from || '0000-00-00';
          const dates = getDatesForWeekday(targetMonth, templateSession.day_of_week);
          const sJob = templateSession.job_name || templateSession.student_name;
          const cleanTeacher = cleanString(teacherName).replace(/[^a-z0-9]/g, '');
          const cleanJob = cleanString(sJob).replace(/[^a-z0-9]/g, '');
          const tTime = formatCleanTimeString(templateSession.time);
          const cleanTime = tTime.replace(/[^0-9]/g, '');

          dates.forEach((dStr) => {
            if (dStr < effFrom) return;
            if (maxDateExclusive && dStr >= maxDateExclusive) return;
            if (existingDates.has(dStr)) return;
            const slotKey = `${studentKey}_${dStr}_${tTime}`;
            if (existingSlotKeys.has(slotKey)) return;
            existingSlotKeys.add(slotKey);

            const deterministicId = `fix_${cleanTeacher}_${cleanJob}_${dStr.replace(/-/g, '')}_${cleanTime}`;
            const rawAuto = templateSession.auto_check_in ?? templateSession.auto_checkin ?? true;
            const autoBool = rawAuto !== false && rawAuto !== 0;
            newCandidates.push({
              id: deterministicId,
              user_name: teacherName,
              teacher_name: teacherName,
              job_name: sJob,
              student_name: sJob,
              day_of_week: templateSession.day_of_week,
              time: tTime,
              duration: Number(templateSession.duration || 2),
              price: Number(templateSession.price || 0),
              status: 'Chưa làm',
              month_year: targetMonth,
              color: templateSession.color || '#7c3aed',
              date: dStr,
              auto_check_in: autoBool ? 1 : 0,
              auto_checkin: autoBool ? 1 : 0,
              loai_hinh_lich: 'co_dinh',
              loai_hinh: 'co_dinh',
              income_category: templateSession.income_category || templateSession.category || 'Giáo dục'
            });
          });
        });
      };

      studentValidTemplates.forEach((dayTemplateMap, studentKey) => {
        const partial = partialTransitionTemplates.get(studentKey);
        pushTemplateCandidates(studentKey, dayTemplateMap, undefined, partial?.effectiveFrom);
      });
      partialTransitionTemplates.forEach((partial, studentKey) => {
        pushTemplateCandidates(studentKey, partial.days, partial.effectiveFrom, undefined);
      });

      if (newCandidates.length === 0) return cleanedCurrentMonthData;

      let { data: insertedData, error: insertErr } = await (supabase.from('sessions') as any)
        .upsert(newCandidates, { onConflict: 'id' });

      if (insertErr) {
        const cleanCandidates = newCandidates.map(({ student_name, teacher_name, category, ...rest }: any) => rest);
        const retryRes = await (supabase.from('sessions') as any).upsert(cleanCandidates, { onConflict: 'id' });
        insertedData = retryRes.data;
        insertErr = retryRes.error;
      }

      if (!insertErr && insertedData && insertedData.length > 0) {
        return [...cleanedCurrentMonthData, ...insertedData];
      } else if (newCandidates.length > 0) {
        return [...cleanedCurrentMonthData, ...newCandidates];
      }
      return cleanedCurrentMonthData;
    } catch (err) {
      console.error('Error syncing fixed schedules:', err);
    }
    return currentMonthData;
  }, [fetchScheduleExclusions, saveScheduleExclusions, fetchScheduleTemplates]);

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

  const fetchSessions = useCallback(async (isSilent = false) => {
    if (!selectedMonth) return;
    
    // Only show full loading spinner on initial load when there is no data in memory
    if (!isSilent && sessionsRef.current.length === 0) {
      setScheduleLoading(true);
    }

    try {
      let studentConfigs: Record<string, any> = {};
      if (activeTeacherName) {
        // Parallel fetch configs, current month sessions, and exclusions concurrently
        const [fetchedConfigs, monthRes, exclusions] = await Promise.all([
          fetchSessionStudentConfigs(activeTeacherName),
          supabase
            .from('sessions')
            .select('*')
            .eq('user_name', activeTeacherName)
            .eq('month_year', selectedMonth),
          fetchScheduleExclusions(activeTeacherName)
        ]);

        studentConfigs = fetchedConfigs || {};
        if (JSON.stringify(studentConfigs) !== JSON.stringify(sessionStudentConfigsRef.current)) {
          sessionStudentConfigsRef.current = studentConfigs;
          setSessionStudentConfigs(studentConfigs);
        }

        let data = monthRes.data;
        if (!data || data.length === 0) {
          const res2 = await supabase
            .from('sessions')
            .select('*')
            .eq('teacher_name', activeTeacherName)
            .eq('month_year', selectedMonth);
          if (res2.data) data = res2.data;
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
    } catch (err) {
      console.error('Error in fetchSessions:', err);
    } finally {
      setScheduleLoading(false);
    }
  }, [
    activeTeacherName,
    selectedMonth,
    chartSelectedMonthsKey,
    currentUserRole,
    processAutoCheckIn,
    fetchSessionStudentConfigs,
    fetchScheduleExclusions,
    normalizeSessionList,
    syncFixedSchedulesForMonth,
    calculateStats,
    chartSelectedMonths
  ]);

  // Optimistic In-Memory Sessions Updater (0ms instant UI update)
  const optimisticUpsertSessions = useCallback((newSessions: Session[], oldIdsToRemove: string[] = []) => {
    setSessions(prev => {
      const keep = prev.filter(s => !oldIdsToRemove.includes(s.id));
      const map = new Map<string, Session>();
      keep.forEach(s => map.set(s.id, s));
      newSessions.forEach(s => map.set(s.id, s));
      const next = Array.from(map.values());
      calculateStats(next);
      return next;
    });

    setAllSessions(prev => {
      const keep = prev.filter(s => !oldIdsToRemove.includes(s.id));
      const map = new Map<string, Session>();
      keep.forEach(s => map.set(s.id, s));
      newSessions.forEach(s => map.set(s.id, s));
      return Array.from(map.values());
    });
  }, [calculateStats]);

  const handleDeleteSchedule = useCallback(async (jobName: string, scope: 'month' | 'all') => {
    if (!jobName || !activeTeacherName) return;
    const cleanName = jobName.trim();
    const cleanKey = cleanName.toLowerCase();

    // 1. Capture deleted sessions from current state for Trash preservation
    const currentSessions = sessionsRef.current;
    const deletedSessions = currentSessions.filter(s => {
      const jName = (s.job_name || s.student_name || '').trim().toLowerCase();
      return jName === cleanKey;
    });

    // 2. OPTIMISTIC UI UPDATE: Remove from state immediately (0ms delay, no spinner)
    setSessions(prev => {
      const next = prev.filter(s => {
        const jName = (s.job_name || s.student_name || '').trim().toLowerCase();
        return jName !== cleanKey;
      });
      calculateStats(next);
      return next;
    });

    setAllSessions(prev => prev.filter(s => {
      const jName = (s.job_name || s.student_name || '').trim().toLowerCase();
      return jName !== cleanKey;
    }));

    // 3. Save to trash_items with 30-day auto-purge expiration
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const trashRecord = {
      id: `trash_sched_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      item_type: 'schedule',
      item_name: `Lịch ${cleanName} (${deletedSessions.length} ca)`,
      item_data: JSON.stringify({
        teacherName: activeTeacherName,
        jobName: cleanName,
        scope,
        month: selectedMonth,
        sessions: deletedSessions
      }),
      related_user: activeTeacherName,
      scope,
      deleted_month: selectedMonth,
      deleted_at: now.toISOString(),
      expires_at: expires.toISOString(),
      updated_at: now.toISOString()
    };

    // Run trash save and database deletion in the background
    try {
      await (supabase.from('trash_items') as any).upsert([trashRecord], { onConflict: 'id' });

      if (scope === 'month') {
        await supabase
          .from('sessions')
          .delete()
          .or(`user_name.eq.${activeTeacherName},teacher_name.eq.${activeTeacherName}`)
          .ilike('job_name', cleanName)
          .eq('month_year', selectedMonth);

        const exclusions = await fetchScheduleExclusions(activeTeacherName);
        const currentMonthList = exclusions[selectedMonth] || [];
        if (!currentMonthList.some(x => x.toLowerCase() === cleanKey)) {
          exclusions[selectedMonth] = [...currentMonthList, cleanKey];
          await saveScheduleExclusions(activeTeacherName, exclusions, currentUser?.id);
        }

        showToast(`Đã chuyển lịch "${cleanName}" (${selectedMonth}) vào Thùng rác (lưu trữ 30 ngày)!`, 'success');
      } else {
        await supabase
          .from('sessions')
          .delete()
          .or(`user_name.eq.${activeTeacherName},teacher_name.eq.${activeTeacherName}`)
          .ilike('job_name', cleanName);

        const exclusions = await fetchScheduleExclusions(activeTeacherName);
        const allList = exclusions['all'] || [];
        if (!allList.some(x => x.toLowerCase() === cleanKey)) {
          exclusions['all'] = [...allList, cleanKey];
          await saveScheduleExclusions(activeTeacherName, exclusions, currentUser?.id);
        }

        showToast(`Đã chuyển lịch "${cleanName}" vào Thùng rác (lưu trữ 30 ngày)!`, 'success');
      }

      // Silent background sync check without blocking UI
      fetchSessions(true);
    } catch (err: any) {
      console.error('Error in handleDeleteSchedule:', err);
      showToast(err.message || 'Lỗi khi xóa lịch trình.', 'error');
    }
  }, [activeTeacherName, selectedMonth, currentUser, fetchScheduleExclusions, saveScheduleExclusions, fetchSessions, calculateStats, showToast]);

  const handleDeleteSingleSession = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    const sessionToDelete = sessionsRef.current.find(s => s.id === sessionId);

    // 1. OPTIMISTIC UI UPDATE: Remove from state immediately (0ms delay)
    setSessions(prev => {
      const next = prev.filter(s => s.id !== sessionId);
      calculateStats(next);
      return next;
    });

    setAllSessions(prev => prev.filter(s => s.id !== sessionId));

    // 2. Save single session to trash_items with 30-day expiration
    if (sessionToDelete) {
      const now = new Date();
      const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const trashRecord = {
        id: `trash_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        item_type: 'session',
        item_name: `Ca ${sessionToDelete.job_name || sessionToDelete.student_name} (${sessionToDelete.date} ${sessionToDelete.time})`,
        item_data: JSON.stringify(sessionToDelete),
        related_user: sessionToDelete.user_name || sessionToDelete.teacher_name,
        scope: 'single',
        deleted_month: sessionToDelete.month_year,
        deleted_at: now.toISOString(),
        expires_at: expires.toISOString(),
        updated_at: now.toISOString()
      };
      (supabase.from('trash_items') as any).upsert([trashRecord], { onConflict: 'id' }).catch(() => {});
    }

    try {
      await supabase.from('sessions').delete().eq('id', sessionId);
      showToast('Đã chuyển ca dạy vào Thùng rác (lưu trữ 30 ngày)!', 'success');
      fetchSessions(true);
    } catch (err: any) {
      console.error('Error in handleDeleteSingleSession:', err);
      showToast(err.message || 'Lỗi khi xóa ca làm việc.', 'error');
    }
  }, [fetchSessions, calculateStats, showToast]);

  const handleClearScheduleExclusion = useCallback(async (jobName: string, month: string, teacherOverride?: string) => {
    const targetTeacher = teacherOverride || activeTeacherName;
    if (!jobName || !targetTeacher) return;
    try {
      const key = jobName.trim().toLowerCase();
      const exclusions = await fetchScheduleExclusions(targetTeacher);
      let changed = false;
      if (month && exclusions[month]) {
        const nextMonthList = exclusions[month].filter(x => x.toLowerCase() !== key);
        if (nextMonthList.length !== exclusions[month].length) {
          exclusions[month] = nextMonthList;
          changed = true;
        }
      }
      if (exclusions['all']) {
        const nextAllList = exclusions['all'].filter(x => x.toLowerCase() !== key);
        if (nextAllList.length !== exclusions['all'].length) {
          exclusions['all'] = nextAllList;
          changed = true;
        }
      }
      if (changed) {
        await saveScheduleExclusions(targetTeacher, exclusions, currentUser?.id);
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

  const handleRenameSchedule = useCallback(async (oldName: string, newName: string) => {
    const cleanOld = (oldName || '').trim();
    const cleanNew = (newName || '').trim();
    if (!cleanOld || !cleanNew || !activeTeacherName) return;
    if (cleanOld === cleanNew) return;
    const oldLower = cleanOld.toLowerCase();

    // 1. Optimistic UI update (0ms)
    setSessions(prev => {
      const next = prev.map(s => {
        const jName = (s.job_name || s.student_name || '').trim().toLowerCase();
        if (jName === oldLower) {
          return { ...s, job_name: cleanNew, student_name: cleanNew };
        }
        return s;
      });
      calculateStats(next);
      return next;
    });

    setAllSessions(prev => prev.map(s => {
      const jName = (s.job_name || s.student_name || '').trim().toLowerCase();
      const tName = (s.user_name || s.teacher_name || '').trim().toLowerCase();
      if (jName === oldLower && (!tName || tName === activeTeacherName.trim().toLowerCase())) {
        return { ...s, job_name: cleanNew, student_name: cleanNew };
      }
      return s;
    }));

    try {
      // 2. Update database sessions for this teacher
      await supabase
        .from('sessions')
        .update({ job_name: cleanNew, student_name: cleanNew })
        .or(`user_name.eq.${activeTeacherName},teacher_name.eq.${activeTeacherName}`)
        .ilike('job_name', cleanOld);

      // 3. Migrate sessionStudentConfigs key
      const oldClassKey = `class_${cleanString(cleanOld)}`;
      const newClassKey = `class_${cleanString(cleanNew)}`;
      const curConfigs = { ...(sessionStudentConfigsRef.current || {}) };
      if (curConfigs[oldClassKey]) {
        curConfigs[newClassKey] = curConfigs[oldClassKey];
        if (oldClassKey !== newClassKey) delete curConfigs[oldClassKey];
        await saveSessionStudentConfigs(activeTeacherName, curConfigs, currentUser?.id);
      }

      // 4. Update scheduleTemplates so prior months never re-spawn the old name
      const curTemplates = { ...(scheduleTemplatesRef.current || (await fetchScheduleTemplates(activeTeacherName))) };
      const oldTplKey = cleanString(cleanOld);
      const newTplKey = cleanString(cleanNew);
      const existingTpl = curTemplates[oldTplKey] || curTemplates[newTplKey] || {};
      const prevNames = Array.from(new Set([...(existingTpl.previous_names || []), oldLower])).filter(n => n !== cleanNew.toLowerCase());
      curTemplates[newTplKey] = {
        ...existingTpl,
        job_name: cleanNew,
        teacher_name: activeTeacherName,
        previous_names: prevNames,
        updated_at: new Date().toISOString()
      };
      if (oldTplKey !== newTplKey) {
        delete curTemplates[oldTplKey];
      }
      await saveScheduleTemplates(activeTeacherName, curTemplates, currentUser?.id);

      // 5. Clear any exclusion on the new name
      await handleClearScheduleExclusion(cleanNew, selectedMonth, activeTeacherName);
      showToast(`Đã đổi tên lịch "${cleanOld}" thành "${cleanNew}"!`, 'success');
      fetchSessions(true);
    } catch (err: any) {
      console.error('Error in handleRenameSchedule:', err);
      showToast(err.message || 'Lỗi khi đổi tên lịch trình.', 'error');
    }
  }, [
    activeTeacherName,
    selectedMonth,
    currentUser?.id,
    calculateStats,
    saveSessionStudentConfigs,
    fetchScheduleTemplates,
    saveScheduleTemplates,
    handleClearScheduleExclusion,
    fetchSessions,
    showToast
  ]);

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
    scheduleTemplates,
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
    handleRenameSchedule,
    saveSessionStudentConfigs,
    saveScheduleTemplates,
    optimisticUpsertSessions,
    setSessions
  };
}
