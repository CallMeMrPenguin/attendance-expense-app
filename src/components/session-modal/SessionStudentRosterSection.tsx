import React from 'react';
import { Users } from 'lucide-react';
import { formatDateVN, formatVND, formatNumberDots } from '@/lib/utils';

interface SessionStudentRosterSectionProps {
  originalStudentCount: number;
  studentCount: number;
  studentNames: string[];
  presentStudents: string[];
  absentStudents: string[];
  pricePerStudent: string;
  price: string;
  sessionDate: string;
  onOriginalCountChange: (count: number) => void;
  onPricePerStudentChange: (val: string) => void;
  onStudentNameIndexChange: (index: number, name: string) => void;
  onQuickReduceStudent: () => void;
  onQuickResetStudent: () => void;
  onToggleStudentAttendance: (studentName: string) => void;
  onStudentCountChange: (count: number) => void;
}

export const SessionStudentRosterSection: React.FC<SessionStudentRosterSectionProps> = ({
  originalStudentCount,
  studentCount,
  studentNames,
  presentStudents,
  absentStudents,
  pricePerStudent,
  price,
  sessionDate,
  onOriginalCountChange,
  onPricePerStudentChange,
  onStudentNameIndexChange,
  onQuickReduceStudent,
  onQuickResetStudent,
  onToggleStudentAttendance,
  onStudentCountChange,
}) => {
  return (
    <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
      <div className="p-4 bg-slate-100/80 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                Sĩ Số Lớp & Học Phí Chi Tiết
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Cấu hình danh sách học sinh và điểm danh từng em cho ca này
              </span>
            </div>
          </div>
          {studentCount < originalStudentCount && (
            <span className="text-[10px] font-black px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full animate-pulse">
              Đang giảm {originalStudentCount - studentCount} HS
            </span>
          )}
        </div>

        {/* Class base configs: Sĩ số gốc & Giá mỗi học sinh */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sĩ số lớp (Mặc định)
            </label>
            <input
              type="number"
              min={1}
              value={originalStudentCount}
              onChange={(e) => onOriginalCountChange(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0d1018] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Học phí / 1 học sinh (đ)
            </label>
            <input
              type="text"
              value={pricePerStudent ? formatNumberDots(pricePerStudent) : ''}
              onChange={(e) => onPricePerStudentChange(e.target.value)}
              placeholder="VD: 100.000"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0d1018] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Editable Student Names in Class (Roster) */}
        {originalStudentCount > 1 && (
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-indigo-300 uppercase tracking-wider">
                Tên các học sinh trong lớp ({originalStudentCount} HS)
              </span>
              <span className="text-[9.5px] font-bold text-slate-400">
                Tự động đồng bộ sang bảng tính học phí
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Array.from({ length: originalStudentCount }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-slate-400 w-5 text-center">#{idx + 1}</span>
                  <input
                    type="text"
                    value={studentNames[idx] || ''}
                    onChange={(e) => onStudentNameIndexChange(idx, e.target.value)}
                    placeholder={`Học sinh ${idx + 1}`}
                    className="flex-1 px-2.5 py-1.5 bg-[#0c0f1e] border border-[#212c4b] rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Specific session student adjuster (Điểm danh ca học hôm nay) */}
        <div className="p-3 bg-slate-50 dark:bg-[#121626] rounded-xl border border-slate-200 dark:border-white/5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
              Điểm danh ca này ({formatDateVN(sessionDate)}):
            </span>
            
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onQuickReduceStudent}
                disabled={studentCount <= 0}
                className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 hover:text-amber-300 rounded-lg text-[10px] font-black cursor-pointer disabled:opacity-40 transition-colors"
                title="Giảm 1 học sinh vắng mặt"
              >
                -1 HS (Vắng)
              </button>
              {studentCount !== originalStudentCount && (
                <button
                  type="button"
                  onClick={onQuickResetStudent}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                  title="Khôi phục đầy đủ cả lớp"
                >
                  Đầy đủ ({originalStudentCount} HS)
                </button>
              )}
            </div>
          </div>

          {/* Interactive Multi-Student Attendance Checkboxes */}
          {originalStudentCount > 1 && studentNames.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Tích chọn học sinh ĐI HỌC hôm nay (Bỏ tích để đánh dấu VẮNG):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {studentNames.map((sName, idx) => {
                  const isPresent = presentStudents.includes(sName);
                  return (
                    <div
                      key={idx}
                      onClick={() => onToggleStudentAttendance(sName)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between select-none ${
                        isPresent
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-white shadow-sm'
                          : 'bg-rose-500/10 border-rose-500/30 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isPresent}
                          onChange={() => {}} // Handled by parent div
                          className="h-4 w-4 rounded border-slate-700 accent-emerald-500 cursor-pointer pointer-events-none"
                        />
                        <span className={`text-xs font-black truncate ${isPresent ? 'text-white' : 'text-slate-400 line-through'}`}>
                          {sName}
                        </span>
                      </div>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                        isPresent
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {isPresent ? 'Có mặt' : 'Vắng'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1 border-t border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onStudentCountChange(studentCount - 1)}
                className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-black text-sm flex items-center justify-center cursor-pointer transition-colors"
              >
                -
              </button>
              <div className="px-3 py-1.5 min-w-[60px] text-center font-black text-xs bg-white dark:bg-[#0d1018] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white">
                {studentCount} HS
              </div>
              <button
                type="button"
                onClick={() => onStudentCountChange(studentCount + 1)}
                className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-black text-sm flex items-center justify-center cursor-pointer transition-colors"
              >
                +
              </button>
            </div>

            <div className="flex-1 text-right">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Học phí ca này</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {formatVND(Number(price) || 0)}
              </span>
            </div>
          </div>

          {/* Calculation feedback notice */}
          {studentCount < originalStudentCount && (
            <div className="text-[10.5px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg leading-relaxed">
              Giảm {originalStudentCount - studentCount} HS tạm thời ({absentStudents.join(', ') || 'Vắng mặt'}): {studentCount} HS × {formatVND(Number(pricePerStudent) || 0)} = {formatVND(Number(price) || 0)} (giảm trừ {formatVND((originalStudentCount - studentCount) * (Number(pricePerStudent) || 0))})
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionStudentRosterSection;
