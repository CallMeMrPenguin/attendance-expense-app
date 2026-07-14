export const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

export interface Session {
  id: string;
  teacher_name: string;
  student_name: string;
  day_of_week: string;
  time: string;
  duration: number;
  price: number;
  status: 'Chưa dạy' | 'Đã dạy' | 'Hủy' | string;
  grade?: string;
  homework?: string;
  note?: string;
  month_year: string;
  color: string;
  date: string;
  created_at?: string;
  updated_at?: string;
  auto_check_in?: boolean;
  auto_checkin?: boolean;
  loai_hinh_lich?: 'co_dinh' | 'tam_thoi';
  loai_hinh?: 'co_dinh' | 'tam_thoi';
}

// Convert "18:00" to minutes (1080)
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

// Get end time string (e.g., "18:00" + 1.5 => "19:30")
export function getEndTime(startTimeStr: string, duration: number): string {
  const startMin = timeToMinutes(startTimeStr);
  const endMin = startMin + duration * 60;
  const h = String(Math.floor(endMin / 60) % 24).padStart(2, '0');
  const m = String(Math.round(endMin % 60)).padStart(2, '0');
  return `${h}:${m}`;
}

// Safe formatting for HH:mm time
export function formatCleanTimeString(timeStr: string): string {
  if (!timeStr) return '18:00';
  const str = String(timeStr).trim();
  const match = str.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const h = String(match[1]).padStart(2, '0');
    const m = String(match[2]).padStart(2, '0');
    return `${h}:${m}`;
  }
  return '18:00';
}

// Generate dates in a month that match a specific day of week
// monthYearStr: "2026-07", dayOfWeekStr: "Thứ 2"
export function getDatesForWeekday(monthYearStr: string, dayOfWeekStr: string): string[] {
  if (!monthYearStr || !dayOfWeekStr) return [];
  const [year, month] = monthYearStr.split('-').map(Number);
  const dates: string[] = [];
  
  const dayMap: Record<string, number> = {
    'Thứ 2': 1,
    'Thứ 3': 2,
    'Thứ 4': 3,
    'Thứ 5': 4,
    'Thứ 6': 5,
    'Thứ 7': 6,
    'Chủ Nhật': 0,
  };
  
  const targetDay = dayMap[dayOfWeekStr];
  if (targetDay === undefined) return [];
  
  // Date constructor month is 0-indexed
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    if (date.getDay() === targetDay) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    date.setDate(date.getDate() + 1);
  }
  return dates;
}

// Detect session overlapping and close-gap warnings (< 15 mins)
export interface OverlapResult {
  type: 'overlap' | 'gap';
  newS: Partial<Session>;
  extS: Session;
}

export function checkOverlaps(
  newSessions: Partial<Session>[],
  existingSessions: Session[],
  excludeIds: string[] = []
): OverlapResult[] {
  const overlaps: OverlapResult[] = [];
  const excludeSet = new Set(excludeIds);
  
  for (const newS of newSessions) {
    if (!newS.time || !newS.duration || !newS.date || !newS.teacher_name) continue;
    const newStart = timeToMinutes(newS.time);
    const newEnd = newStart + newS.duration * 60;
    
    for (const extS of existingSessions) {
      if (excludeSet.has(extS.id)) continue;
      if (extS.teacher_name !== newS.teacher_name) continue;
      if (extS.date !== newS.date) continue;
      if (extS.status === 'Hủy') continue; // Cancelled classes don't conflict
      
      const extStart = timeToMinutes(extS.time);
      const extEnd = extStart + extS.duration * 60;
      
      let gap: number;
      if (newStart < extStart) {
        gap = extStart - newEnd;
      } else {
        gap = newStart - extEnd;
      }
      
      if (gap < 0) {
        overlaps.push({ type: 'overlap', newS, extS });
      } else if (gap < 15) {
        overlaps.push({ type: 'gap', newS, extS });
      }
    }
  }
  return overlaps;
}

// Generate color by student name deterministically (using FNV-1a for high distribution to avoid color collisions)
export function getStudentColor(studentName: string): string {
  if (!studentName) return '#7c3aed';
  const palette = [
    '#7c3aed', // Vivid Purple Violet
    '#0ea5e9', // Sky Blue
    '#10b981', // Emerald Green
    '#f59e0b', // Amber Gold
    '#ec4899', // Hot Pink
    '#06b6d4', // Cyan Teal
    '#f97316', // Bright Orange
    '#84cc16', // Lime Green
    '#a78bfa', // Lavender
    '#fb7185', // Rose Red
  ];
  
  let hash = 2166136261;
  for (let i = 0; i < studentName.length; i++) {
    hash ^= studentName.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  
  const index = Math.abs(hash) % palette.length;
  return palette[index];
}


// Format currency
export function formatVND(amt: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amt || 0);
}

// Format date into Vietnamese display (e.g., "Thứ 2, ngày 14/07")
export function formatDateVN(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const weekdays = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const dayName = weekdays[d.getDay()];
  return `${dayName}, ngày ${parts[2]}/${parts[1]}`;
}
