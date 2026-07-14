import React, { useState } from 'react';
import { PiggyBank, Coins, History } from 'lucide-react';
import { formatVND } from '@/lib/utils';

interface SavingTabProps {
  currentUser: {
    id: string;
  };
  emergencyCurrent: number;
  emergencyTarget: number;
  accumulationCurrent: number;
  accumulationTarget: number;
  savingsHistory: any[];
  saveEmergencyCurrent: (userId: string, val: number) => void;
  saveEmergencyTarget: (userId: string, val: number) => void;
  saveAccumulationCurrent: (userId: string, val: number) => void;
  saveAccumulationTarget: (userId: string, val: number) => void;
  saveSavingsHistory: (userId: string, data: any[]) => void;
}

import { useToast } from '@/context/ToastContext';

export default function SavingTab({
  currentUser,
  emergencyCurrent,
  emergencyTarget,
  accumulationCurrent,
  accumulationTarget,
  savingsHistory,
  saveEmergencyCurrent,
  saveEmergencyTarget,
  saveAccumulationCurrent,
  saveAccumulationTarget,
  saveSavingsHistory
}: SavingTabProps) {
  const { showToast } = useToast();
  const [emActionAmount, setEmActionAmount] = useState('');
  const [acActionAmount, setAcActionAmount] = useState('');

  const handleSavingAction = (fund: 'emergency' | 'accumulation', action: 'deposit' | 'withdraw') => {
    const userId = currentUser.id;
    const amountStr = fund === 'emergency' ? emActionAmount : acActionAmount;
    const amt = Number(amountStr);

    if (!amt || amt <= 0) {
      showToast('Vui lòng nhập số tiền hợp lệ lớn hơn 0.', 'error');
      return;
    }

    let currentVal = fund === 'emergency' ? emergencyCurrent : accumulationCurrent;
    let newVal = currentVal;
    
    if (action === 'deposit') {
      newVal += amt;
    } else {
      if (amt > currentVal) {
        showToast('Số dư quỹ hiện tại không đủ để thực hiện rút tiền.', 'error');
        return;
      }
      newVal -= amt;
    }

    if (fund === 'emergency') {
      saveEmergencyCurrent(userId, newVal);
      setEmActionAmount('');
    } else {
      saveAccumulationCurrent(userId, newVal);
      setAcActionAmount('');
    }

    const newHist = {
      id: `sh-${Date.now()}`,
      fund,
      type: action,
      amount: amt,
      date: new Date().toISOString().split('T')[0]
    };
    saveSavingsHistory(userId, [newHist, ...savingsHistory]);
    showToast('Đã cập nhật quỹ tiết kiệm thành công!', 'success');
  };

  const emPercent = Math.min(100, Math.round((emergencyCurrent / Math.max(1, emergencyTarget)) * 100));
  const acPercent = Math.min(100, Math.round((accumulationCurrent / Math.max(1, accumulationTarget)) * 100));

  return (
    <div className="space-y-6 animate-mac-dropdown text-left">
      {/* Title */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-white tracking-tight">Kế Hoạch Tiết Kiệm</h2>
        <p className="text-slate-400 text-xs font-semibold">Bảo vệ nguồn tài sản dự trữ và tích lũy thông minh dài hạn.</p>
      </div>

      {/* Dual Card panel */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Emergency Fund Card */}
        <div className="kpi-editorial-card p-6 flex flex-col justify-between space-y-6 text-left">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl shadow-sm">
                  <PiggyBank className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Quỹ Dự Phòng</h3>
                  <p className="text-[10px] text-slate-455 font-medium leading-none mt-0.5">Dành cho tình huống khẩn cấp bất ngờ.</p>
                </div>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 rounded-md">
                Đạt {emPercent}%
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-extrabold text-slate-550 uppercase">Số dư hiện tại</span>
              <p className="text-2xl font-black text-white leading-none">{formatVND(emergencyCurrent)}</p>
            </div>

            {/* Progress */}
            <div className="space-y-2 pt-1.5">
              <div className="h-2 bg-[#101420] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_8px_rgba(92,54,245,0.45)] transition-all duration-300"
                  style={{ width: `${emPercent}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span>Mục tiêu:</span>
                  <input
                    type="number"
                    value={emergencyTarget}
                    onChange={(e) => {
                      saveEmergencyTarget(currentUser.id, Number(e.target.value));
                    }}
                    className="w-24 bg-[#0d1018] border border-white/10 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white text-right focus:outline-none focus:border-indigo-500 animate-transition"
                  />
                  <span>VND</span>
                </div>
                <span>Tiến độ mục tiêu</span>
              </div>
            </div>
          </div>

          {/* Quick Actions form */}
          <div className="bg-[#121624] rounded-2xl p-4 border border-white/5 space-y-3.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Giao dịch nạp / rút quỹ</span>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Nhập số tiền..."
                value={emActionAmount}
                onChange={(e) => setEmActionAmount(e.target.value)}
                className="flex-1 bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                onClick={() => handleSavingAction('emergency', 'deposit')}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
              >
                Nạp
              </button>
              <button
                onClick={() => handleSavingAction('emergency', 'withdraw')}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
              >
                Rút
              </button>
            </div>
          </div>
        </div>

        {/* Accumulation Fund Card */}
        <div className="kpi-editorial-card p-6 flex flex-col justify-between space-y-6 text-left">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl shadow-sm">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Quỹ Tích Lũy</h3>
                  <p className="text-[10px] text-slate-455 font-medium leading-none mt-0.5">Dành cho mục tiêu lớn đầu tư dài hạn.</p>
                </div>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 rounded-md">
                Đạt {acPercent}%
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-extrabold text-slate-550 uppercase">Số dư hiện tại</span>
              <p className="text-2xl font-black text-white leading-none">{formatVND(accumulationCurrent)}</p>
            </div>

            {/* Progress */}
            <div className="space-y-2 pt-1.5">
              <div className="h-2 bg-[#101420] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-[0_0_8px_rgba(6,182,212,0.45)] transition-all duration-300"
                  style={{ width: `${acPercent}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span>Mục tiêu:</span>
                  <input
                    type="number"
                    value={accumulationTarget}
                    onChange={(e) => {
                      saveAccumulationTarget(currentUser.id, Number(e.target.value));
                    }}
                    className="w-24 bg-[#0d1018] border border-white/10 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white text-right focus:outline-none focus:border-indigo-500 animate-transition"
                  />
                  <span>VND</span>
                </div>
                <span>Tiến độ mục tiêu</span>
              </div>
            </div>
          </div>

          {/* Quick Actions form */}
          <div className="bg-[#121624] rounded-2xl p-4 border border-white/5 space-y-3.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Giao dịch nạp / rút quỹ</span>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Nhập số tiền..."
                value={acActionAmount}
                onChange={(e) => setAcActionAmount(e.target.value)}
                className="flex-1 bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                onClick={() => handleSavingAction('accumulation', 'deposit')}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
              >
                Nạp
              </button>
              <button
                onClick={() => handleSavingAction('accumulation', 'withdraw')}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
              >
                Rút
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* savings logs */}
      <div className="calendar-container-depth p-5 text-left bg-[#141824]">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3.5 mb-4">
          <History className="h-4.5 w-4.5 text-indigo-400" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">Lịch sử giao dịch quỹ tiết kiệm</h3>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
          {savingsHistory.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center font-bold">Chưa có phát sinh giao dịch tích lũy.</p>
          ) : (
            savingsHistory.map((h) => {
              const isDep = h.type === 'deposit';
              return (
                <div key={h.id} className="p-3.5 bg-[#181d2e]/45 border border-white/5 rounded-2xl flex items-center justify-between gap-4 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border shrink-0 ${isDep ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-450 border-rose-500/20'}`}>
                      {isDep ? 'Nạp quỹ' : 'Rút quỹ'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-snug">
                        {h.fund === 'emergency' ? 'Quỹ Dự Phòng' : 'Quỹ Tích Lũy'}
                      </p>
                      <span className="text-[9px] font-black text-slate-500 uppercase">{h.date}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-black shrink-0 ${isDep ? 'text-emerald-400' : 'text-rose-450'}`}>
                    {isDep ? '+' : '-'}{formatVND(h.amount)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
