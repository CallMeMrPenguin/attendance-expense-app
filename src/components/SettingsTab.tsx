import React from 'react';
import { UserCircle, Settings, FileText } from 'lucide-react';

interface SettingsTabProps {
  currentUser: {
    id: string;
    username: string;
    role: string;
    teacherName: string;
  };
  manualTransactions: any[];
  emergencyCurrent: number;
  emergencyTarget: number;
  accumulationCurrent: number;
  accumulationTarget: number;
  savingsHistory: any[];
  categoryBudgets: Record<string, number>;
  
  // Setters/savers to update parent state
  saveTransactions: (userId: string, data: any[]) => void;
  saveEmergencyCurrent: (userId: string, val: number) => void;
  saveEmergencyTarget: (userId: string, val: number) => void;
  saveAccumulationCurrent: (userId: string, val: number) => void;
  saveAccumulationTarget: (userId: string, val: number) => void;
  saveSavingsHistory: (userId: string, data: any[]) => void;
  saveBudgets: (userId: string, budgets: Record<string, number>) => void;
  
  // Local state update callbacks
  setManualTransactions: React.Dispatch<React.SetStateAction<any[]>>;
  setEmergencyCurrent: React.Dispatch<React.SetStateAction<number>>;
  setEmergencyTarget: React.Dispatch<React.SetStateAction<number>>;
  setAccumulationCurrent: React.Dispatch<React.SetStateAction<number>>;
  setAccumulationTarget: React.Dispatch<React.SetStateAction<number>>;
  setSavingsHistory: React.Dispatch<React.SetStateAction<any[]>>;
  setCategoryBudgets: React.Dispatch<React.SetStateAction<Record<string, number>>>;

  setPasswordModalOpen: (open: boolean) => void;
  handleLogout: () => Promise<void>;
}

export default function SettingsTab({
  currentUser,
  manualTransactions,
  emergencyCurrent,
  emergencyTarget,
  accumulationCurrent,
  accumulationTarget,
  savingsHistory,
  categoryBudgets,
  
  saveTransactions,
  saveEmergencyCurrent,
  saveEmergencyTarget,
  saveAccumulationCurrent,
  saveAccumulationTarget,
  saveSavingsHistory,
  saveBudgets,
  
  setManualTransactions,
  setEmergencyCurrent,
  setEmergencyTarget,
  setAccumulationCurrent,
  setAccumulationTarget,
  setSavingsHistory,
  setCategoryBudgets,
  
  setPasswordModalOpen,
  handleLogout
}: SettingsTabProps) {

  const getBackupJSON = () => {
    const data = {
      transactions: manualTransactions,
      emergency: { current: emergencyCurrent, target: emergencyTarget },
      accumulation: { current: accumulationCurrent, target: accumulationTarget },
      history: savingsHistory,
      budgets: categoryBudgets
    };
    return JSON.stringify(data, null, 2);
  };

  const handleRestoreJSON = (e: React.FormEvent) => {
    e.preventDefault();
    const userId = currentUser.id;
    const form = e.currentTarget as HTMLFormElement;
    const text = (form.elements.namedItem('restoreArea') as HTMLTextAreaElement).value;
    try {
      const parsed = JSON.parse(text);
      if (parsed.transactions) {
        saveTransactions(userId, parsed.transactions);
        setManualTransactions(parsed.transactions);
      }
      if (parsed.emergency) {
        saveEmergencyCurrent(userId, parsed.emergency.current);
        setEmergencyCurrent(parsed.emergency.current);
        saveEmergencyTarget(userId, parsed.emergency.target);
        setEmergencyTarget(parsed.emergency.target);
      }
      if (parsed.accumulation) {
        saveAccumulationCurrent(userId, parsed.accumulation.current);
        setAccumulationCurrent(parsed.accumulation.current);
        saveAccumulationTarget(userId, parsed.accumulation.target);
        setAccumulationTarget(parsed.accumulation.target);
      }
      if (parsed.history) {
        saveSavingsHistory(userId, parsed.history);
        setSavingsHistory(parsed.history);
      }
      if (parsed.budgets) {
        saveBudgets(userId, parsed.budgets);
        setCategoryBudgets(parsed.budgets);
      }
      alert('Khôi phục dữ liệu sao lưu thành công!');
    } catch (err) {
      alert('Cú pháp chuỗi khôi phục lỗi. Hãy kiểm tra lại định dạng JSON.');
    }
  };

  const handleResetData = () => {
    const userId = currentUser.id;
    if (confirm('CẢNH BÁO: Xóa bỏ vĩnh viễn toàn bộ giao dịch dòng chảy và tiết kiệm? Hành động này không thể hoàn tác.')) {
      localStorage.removeItem(`finance_trans_${userId}`);
      localStorage.removeItem(`finance_em_curr_${userId}`);
      localStorage.removeItem(`finance_em_tar_${userId}`);
      localStorage.removeItem(`finance_ac_curr_${userId}`);
      localStorage.removeItem(`finance_ac_tar_${userId}`);
      localStorage.removeItem(`finance_sav_hist_${userId}`);
      localStorage.removeItem(`finance_budgets_${userId}`);

      setManualTransactions([]);
      setEmergencyCurrent(0);
      setEmergencyTarget(30000000);
      setAccumulationCurrent(0);
      setAccumulationTarget(150000000);
      setSavingsHistory([]);
      setCategoryBudgets({
        'Lương': 15000000,
        'Giáo dục': 10000000,
        'Đầu tư': 5000000,
        'Khác': 1000000,
        'Ăn uống': 4000000,
        'Di chuyển': 1500000,
        'Shopping': 3000000,
        'Hóa đơn': 3000000,
        'Giải trí': 2000000
      });
      alert('Đã xóa dữ liệu tài chính cục bộ.');
    }
  };

  return (
    <div className="space-y-6 animate-mac-dropdown text-left">
      {/* Title */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-white tracking-tight">Cài Đặt Hệ Thống</h2>
        <p className="text-slate-400 text-xs font-semibold">Tùy biến tài khoản, sao lưu khôi phục dữ liệu tài chính cục bộ.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Account Profile Card */}
        <div className="calendar-container-depth p-5 space-y-4 bg-[#141824]">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <UserCircle className="h-4.5 w-4.5 text-indigo-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Hồ sơ tài khoản</h3>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-slate-400 font-extrabold">Tên người dùng</span>
              <span className="text-white font-black">{currentUser.username}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-slate-400 font-extrabold">Quyền truy cập</span>
              <span className="text-indigo-300 font-black uppercase tracking-widest">{currentUser.role}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-slate-400 font-extrabold">Giáo viên đồng bộ</span>
              <span className="text-white font-black">{currentUser.teacherName}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setPasswordModalOpen(true)}
              className="flex-1 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-355 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
            >
              Đổi mật khẩu
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-450 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
            >
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Delete data card */}
        <div className="calendar-container-depth p-5 space-y-4 bg-[#141824]">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Settings className="h-4.5 w-4.5 text-rose-450" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Quản lý vùng nhớ</h3>
          </div>
          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
            Thực hiện xóa toàn bộ dữ liệu tài chính (giao dịch thủ công và số dư các quỹ tiết kiệm hiện có) được ghi nhớ trong trình duyệt. Thông tin về lịch dạy trên Supabase sẽ không bị ảnh hưởng.
          </p>
          <button
            onClick={handleResetData}
            className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all hover:scale-[1.01] cursor-pointer"
          >
            Xóa Toàn Bộ Dữ Liệu Tài Chính
          </button>
        </div>

        {/* Backup Restores */}
        <div className="calendar-container-depth p-5 space-y-4 xl:col-span-2 bg-[#141824]">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <FileText className="h-4.5 w-4.5 text-cyan-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Sao lưu & phục hồi tài chính</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Copy data */}
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Chuỗi sao lưu hiện thời (JSON)</label>
              <textarea
                readOnly
                value={getBackupJSON()}
                className="w-full h-40 bg-[#0d1018] border border-white/10 text-[10px] font-mono text-cyan-300 rounded-xl p-3 focus:outline-none focus:border-indigo-500 scrollbar-thin resize-none"
                onClick={(e) => {
                  (e.target as HTMLTextAreaElement).select();
                  document.execCommand('copy');
                  alert('Đã copy chuỗi sao lưu vào bộ nhớ Clipboard!');
                }}
                title="Click để chọn tất cả"
              />
              <span className="text-[9px] text-slate-500 font-extrabold block">Mẹo: Click vào hộp thoại trên để tự động copy chuỗi sao lưu.</span>
            </div>

            {/* Paste data */}
            <form onSubmit={handleRestoreJSON} className="space-y-2 flex flex-col">
              <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Nhập dữ liệu khôi phục (JSON)</label>
              <textarea
                name="restoreArea"
                placeholder="Dán chuỗi dữ liệu JSON đã sao lưu vào đây..."
                className="w-full h-40 bg-[#0d1018] border border-white/10 text-[10px] font-mono text-slate-400 rounded-xl p-3 focus:outline-none focus:border-indigo-500 resize-none"
                required
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer mt-auto"
              >
                Khôi Phục Dữ Liệu
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
