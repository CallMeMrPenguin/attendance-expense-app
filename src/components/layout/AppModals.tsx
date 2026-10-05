import React from 'react';
import { X } from 'lucide-react';
import { UserProfile } from '@/types/auth';
import { Session } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import TransactionModal from '@/components/TransactionModal';
import AddSessionModal from '@/components/AddSessionModal';
import EditSessionModal from '@/components/EditSessionModal';
import ManageTeachersModal from '@/components/ManageTeachersModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import ConfirmModal from '@/components/ConfirmModal';

interface AppModalsProps {
  currentUser: UserProfile;
  // Transaction Modal
  txModalOpen: boolean;
  setTxModalOpen: (open: boolean) => void;
  modalTxType: 'income' | 'expense' | 'saving' | 'exchange';
  emergencyCurrent: number;
  accumulationCurrent: number;
  manualTransactions: any[];
  savingsHistory: any[];
  categoryBudgets: Record<string, number>;
  categoryTypes: Record<string, 'income' | 'expense'>;
  saveTransactions: (userId: string, data: any[]) => void;
  saveEmergencyCurrent: (userId: string, val: number) => void;
  saveAccumulationCurrent: (userId: string, val: number) => void;
  saveSavingsHistory: (userId: string, data: any[]) => void;

  // Add Session Modal
  addModalOpen: boolean;
  setAddModalOpen: (open: boolean) => void;
  preSelectedAddDate: string | null;
  setPreSelectedAddDate: (d: string | null) => void;
  fetchSessions: () => Promise<void>;
  activeTeacherName: string;
  selectedMonth: string;
  sessions: Session[];
  teachers: string[];
  onClearScheduleExclusion: (jobName: string, month: string) => Promise<void>;
  sessionStudentConfigs: Record<string, any>;
  onSaveSessionStudentConfigs: (teacherName: string, configs: Record<string, any>, userId?: string) => Promise<void>;
  availableIncomeCats: string[];

  // Edit Session Modal
  editModalOpen: boolean;
  setEditModalOpen: (open: boolean) => void;
  selectedSession: Session | null;
  setSelectedSession: (s: Session | null) => void;
  onDeleteSchedule: (jobName: string, scope: 'month' | 'all') => Promise<void>;
  onDeleteSingleSession: (sessionId: string) => Promise<void>;

  // Manage Teachers Modal
  teachersModalOpen: boolean;
  setTeachersModalOpen: (open: boolean) => void;
  onTeacherUpdated: (name?: string) => void;

  // Password Modal
  passwordModalOpen: boolean;
  setPasswordModalOpen: (open: boolean) => void;

  // Delete Transaction Confirm
  confirmDeleteTxId: string | null;
  setConfirmDeleteTxId: (id: string | null) => void;
  executeDeleteManualTx: () => void;

  // Mobile Drawer
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  activeTab: 'dashboard' | 'flow' | 'saving' | 'schedule' | 'settings';
  setActiveTab: (tab: any) => void;
  handleLogout: () => Promise<void>;
  handleOpenTxModal: (type: 'income' | 'expense' | 'saving' | 'exchange') => void;
}

export const AppModals: React.FC<AppModalsProps> = ({
  currentUser,
  txModalOpen,
  setTxModalOpen,
  modalTxType,
  emergencyCurrent,
  accumulationCurrent,
  manualTransactions,
  savingsHistory,
  categoryBudgets,
  categoryTypes,
  saveTransactions,
  saveEmergencyCurrent,
  saveAccumulationCurrent,
  saveSavingsHistory,
  addModalOpen,
  setAddModalOpen,
  preSelectedAddDate,
  setPreSelectedAddDate,
  fetchSessions,
  activeTeacherName,
  selectedMonth,
  sessions,
  teachers,
  onClearScheduleExclusion,
  sessionStudentConfigs,
  onSaveSessionStudentConfigs,
  availableIncomeCats,
  editModalOpen,
  setEditModalOpen,
  selectedSession,
  setSelectedSession,
  onDeleteSchedule,
  onDeleteSingleSession,
  teachersModalOpen,
  setTeachersModalOpen,
  onTeacherUpdated,
  passwordModalOpen,
  setPasswordModalOpen,
  confirmDeleteTxId,
  setConfirmDeleteTxId,
  executeDeleteManualTx,
  mobileMenuOpen,
  setMobileMenuOpen,
  activeTab,
  setActiveTab,
  handleLogout,
  handleOpenTxModal
}) => {
  return (
    <>
      {/* Mobile drawer slide-in */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/85 transition-opacity cursor-pointer"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col w-[260px] max-w-xs bg-[#0a0d16] border-r border-white/5 p-5 animate-slide-in h-full shadow-2xl">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
              currentUser={currentUser}
              handleLogout={handleLogout}
              handleOpenTxModal={handleOpenTxModal}
              isMobile={true}
            />
          </div>
        </div>
      )}

      {/* Unified Transaction Modal */}
      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        currentUser={currentUser}
        defaultType={modalTxType}
        emergencyCurrent={emergencyCurrent}
        accumulationCurrent={accumulationCurrent}
        manualTransactions={manualTransactions}
        savingsHistory={savingsHistory}
        categoryBudgets={categoryBudgets}
        categoryTypes={categoryTypes}
        saveTransactions={saveTransactions}
        saveEmergencyCurrent={saveEmergencyCurrent}
        saveAccumulationCurrent={saveAccumulationCurrent}
        saveSavingsHistory={saveSavingsHistory}
      />

      {/* Scheduler add modal */}
      {addModalOpen && (
        <AddSessionModal
          isOpen={addModalOpen}
          onClose={() => {
            setAddModalOpen(false);
            setPreSelectedAddDate(null);
          }}
          onSave={fetchSessions}
          activeTeacherName={activeTeacherName}
          selectedMonth={selectedMonth}
          existingSessions={sessions}
          teachers={teachers}
          currentUser={currentUser}
          preSelectedDate={preSelectedAddDate}
          onClearExclusion={(jobName) => onClearScheduleExclusion(jobName, selectedMonth)}
          sessionStudentConfigs={sessionStudentConfigs}
          onSaveSessionStudentConfigs={onSaveSessionStudentConfigs}
          incomeCategories={availableIncomeCats}
        />
      )}

      {/* Scheduler edit modal */}
      {editModalOpen && selectedSession && (
        <EditSessionModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedSession(null);
          }}
          onSave={fetchSessions}
          session={selectedSession}
          existingSessions={sessions}
          teachers={teachers}
          currentUser={currentUser}
          onDeleteSchedule={onDeleteSchedule}
          onDeleteSingleSession={onDeleteSingleSession}
          sessionStudentConfigs={sessionStudentConfigs}
          onSaveSessionStudentConfigs={onSaveSessionStudentConfigs}
          incomeCategories={availableIncomeCats}
        />
      )}

      {/* Scheduler teachers modal (Admin only) */}
      {teachersModalOpen && currentUser.role === 'admin' && (
        <ManageTeachersModal
          isOpen={teachersModalOpen}
          onClose={() => setTeachersModalOpen(false)}
          sessionToken={currentUser.token}
          currentAdminTeacherName={currentUser.teacherName}
          onTeacherUpdated={onTeacherUpdated}
          activeTeacherName={activeTeacherName}
          teachers={teachers}
        />
      )}

      {/* Profile: Change password modal */}
      {passwordModalOpen && (
        <ChangePasswordModal
          isOpen={passwordModalOpen}
          onClose={() => setPasswordModalOpen(false)}
        />
      )}

      {/* Transaction Deletion Confirm Modal */}
      {confirmDeleteTxId && (
        <ConfirmModal
          isOpen={!!confirmDeleteTxId}
          title="Xóa Giao Dịch"
          message="Bạn có chắc chắn muốn xóa giao dịch này khỏi hệ thống?"
          confirmLabel="Xóa Giao Dịch"
          cancelLabel="Hủy Bỏ"
          variant="danger"
          onConfirm={executeDeleteManualTx}
          onClose={() => setConfirmDeleteTxId(null)}
        />
      )}
    </>
  );
};

export default AppModals;
