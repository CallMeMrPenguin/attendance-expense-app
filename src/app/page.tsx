'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Session } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import MobileHeader from '@/components/layout/MobileHeader';
import AppModals from '@/components/layout/AppModals';
import DashboardTab from '@/components/DashboardTab';
import FlowTab from '@/components/FlowTab';
import SavingTab from '@/components/SavingTab';
import ScheduleTab from '@/components/ScheduleTab';
import SettingsTab from '@/components/SettingsTab';

import { useAuthSession } from '@/hooks/useAuthSession';
import { useBackgroundSave } from '@/hooks/useBackgroundSave';
import { useBankReceipts } from '@/hooks/useBankReceipts';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useScheduleData } from '@/hooks/useScheduleData';

export default function Dashboard() {
  const { currentUser, loading: authLoading, handleLogout } = useAuthSession();
  const { pendingSavesCount, runBackgroundSave } = useBackgroundSave();

  // Navigation states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'flow' | 'saving' | 'schedule' | 'settings'>('dashboard');
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(['dashboard']));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(true);

  // Multi-month selector states
  const [chartSelectedMonths, setChartSelectedMonths] = useState<string[]>(() => {
    const now = new Date();
    return [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`];
  });
  const [chartYear, setChartYear] = useState(() => new Date().getFullYear());

  const toggleChartMonth = useCallback((mStr: string) => {
    setChartSelectedMonths(prev => {
      if (prev.includes(mStr)) {
        if (prev.length === 1) return prev;
        return prev.filter(m => m !== mStr);
      } else {
        return [...prev, mStr];
      }
    });
  }, []);

  // Track visited tabs for lazy preservation
  useEffect(() => {
    setVisitedTabs(prev => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  // Sidebar pinned state
  useEffect(() => {
    const pinnedVal = localStorage.getItem('sidebar_pinned');
    if (pinnedVal !== null) {
      const isPinned = pinnedVal === 'true';
      setIsSidebarPinned(isPinned);
      if (!isPinned) {
        setSidebarCollapsed(true);
      }
    }
  }, []);

  const handleSetSidebarPinned = (pinned: boolean) => {
    setIsSidebarPinned(pinned);
    localStorage.setItem('sidebar_pinned', pinned ? 'true' : 'false');
    if (!pinned) {
      setSidebarCollapsed(true);
    } else {
      setSidebarCollapsed(false);
    }
  };

  // Enforce role permission on tab switching
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && activeTab !== 'schedule') {
      setActiveTab('schedule');
    }
  }, [currentUser, activeTab]);

  // Schedule Data Hook
  const {
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
    fetchSessions,
    handleTeacherUpdated,
    handleDeleteSchedule,
    handleDeleteSingleSession,
    handleClearScheduleExclusion,
    saveSessionStudentConfigs
  } = useScheduleData({
    currentUser,
    chartSelectedMonths
  });

  // Modal open states
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [modalTxType, setModalTxType] = useState<'income' | 'expense' | 'saving' | 'exchange'>('expense');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [preSelectedAddDate, setPreSelectedAddDate] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [teachersModalOpen, setTeachersModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const handleOpenTxModal = useCallback((type: 'income' | 'expense' | 'saving' | 'exchange') => {
    setModalTxType(type);
    setTxModalOpen(true);
  }, []);

  // Lock background scrolling completely when any modal window is open
  useEffect(() => {
    const isModalActive = txModalOpen || addModalOpen || editModalOpen || teachersModalOpen || passwordModalOpen;
    if (isModalActive) {
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    };
  }, [txModalOpen, addModalOpen, editModalOpen, teachersModalOpen, passwordModalOpen]);

  // Finance Data Hook
  const [bankReceiptsPlaceholder, setBankReceiptsPlaceholder] = useState<any[]>([]);
  const [, setDeletedTxIdsPlaceholder] = useState<string[]>([]);

  const finance = useFinanceData({
    currentUser,
    runBackgroundSave,
    bankReceipts: bankReceiptsPlaceholder,
    setBankReceipts: setBankReceiptsPlaceholder,
    setDeletedTxIds: setDeletedTxIdsPlaceholder,
    chartSelectedMonths
  });

  // Bank Receipts Hook
  const receipts = useBankReceipts({
    currentUser,
    runBackgroundSave,
    categoryKeywords: finance.categoryKeywords,
    activeTab,
    setManualTransactions: finance.setManualTransactions
  });

  // Link bank receipts state directly to finance data hook
  useEffect(() => {
    setBankReceiptsPlaceholder(receipts.bankReceipts);
  }, [receipts.bankReceipts]);

  // Loading Screen Guard - only show while auth is actively resolving and currentUser is not yet set
  if (authLoading && !currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#090b10] gap-4">
        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-400 font-semibold text-sm">Đang tải cấu hình hệ thống...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300 ambient-bg-dark text-slate-100 relative overflow-hidden select-none flex">
      {/* Desktop Sidebar */}
      <aside 
        onMouseEnter={() => {
          if (!isSidebarPinned) setSidebarCollapsed(false);
        }}
        onMouseLeave={() => {
          if (!isSidebarPinned) setSidebarCollapsed(true);
        }}
        className={`hidden lg:flex flex-col sidebar-glass-glow fixed left-4 top-4 bottom-4 z-50 p-5 rounded-2xl transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-[80px]' : 'w-[260px]'}`}
      >
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          currentUser={currentUser}
          handleLogout={handleLogout}
          handleOpenTxModal={handleOpenTxModal}
          onChangePassword={() => setPasswordModalOpen(true)}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 h-screen overflow-y-auto transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[112px]' : 'lg:pl-[292px]'}`}>
        
        {/* Floating Mobile Header */}
        <MobileHeader
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          pendingSavesCount={pendingSavesCount}
          currentUser={currentUser}
          activeTab={activeTab}
          onOpenTeachersModal={() => setTeachersModalOpen(true)}
        />

        {/* Dynamic page content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6">
          {visitedTabs.has('dashboard') && (
            <div className={activeTab === 'dashboard' ? 'space-y-6' : 'hidden'}>
              <DashboardTab
                currentUser={currentUser}
                manualTransactions={finance.manualTransactions}
                sessions={currentUser.role === 'admin' ? allSessions : sessions}
                allFinanceTransactions={finance.allFinanceTransactions}
                emergencyCurrent={finance.emergencyCurrent}
                accumulationCurrent={finance.accumulationCurrent}
                categoryBudgets={finance.categoryBudgets}
                categoryTypes={finance.categoryTypes}
                chartSelectedMonths={chartSelectedMonths}
                toggleChartMonth={toggleChartMonth}
                chartYear={chartYear}
                setChartYear={setChartYear}
                getWeeklyIncome={finance.getWeeklyIncome}
                getWeeklyExpense={finance.getWeeklyExpense}
                getMonthlyIncome={finance.getMonthlyIncome}
                getMonthlyExpense={finance.getMonthlyExpense}
                getSelectedMonthsIncome={finance.getSelectedMonthsIncome}
                getSelectedMonthsExpense={finance.getSelectedMonthsExpense}
                getTotalIncome={finance.getTotalIncome}
                getTotalExpense={finance.getTotalExpense}
                getActualCategoryAmount={finance.getActualCategoryAmount}
                getPrecedingRollOverBalance={finance.getPrecedingRollOverBalance}
                handleOpenTxModal={handleOpenTxModal}
                setActiveTab={setActiveTab}
              />
            </div>
          )}

          {visitedTabs.has('flow') && (
            <div className={activeTab === 'flow' ? 'space-y-6' : 'hidden'}>
              <FlowTab
                currentUser={currentUser}
                manualTransactions={finance.manualTransactions}
                sessions={currentUser.role === 'admin' ? allSessions : sessions}
                categoryBudgets={finance.categoryBudgets}
                categoryTypes={finance.categoryTypes}
                categoryIcons={finance.categoryIcons}
                categoryNotes={finance.categoryNotes}
                categoryKeywords={finance.categoryKeywords}
                chartSelectedMonths={chartSelectedMonths}
                bankReceipts={receipts.bankReceipts}
                getActualCategoryAmount={finance.getActualCategoryAmount}
                handleDeleteManualTx={finance.handleDeleteManualTx}
                handleOpenTxModal={handleOpenTxModal}
                saveBudgets={finance.saveBudgets}
                saveTransactions={finance.saveTransactions}
                toggleChartMonth={toggleChartMonth}
                handleClassifyReceipt={receipts.handleClassifyReceipt}
                handleUnclassifyReceipt={receipts.handleUnclassifyReceipt}
                handleSyncReceipts={receipts.handleSyncReceipts}
                trangAccountBalance={finance.trangAccountBalance}
                saveTrangAccountBalance={finance.saveTrangAccountBalance}
              />
            </div>
          )}

          {visitedTabs.has('saving') && (
            <div className={activeTab === 'saving' ? 'space-y-6' : 'hidden'}>
              <SavingTab
                currentUser={currentUser}
                emergencyCurrent={finance.emergencyCurrent}
                emergencyTarget={finance.emergencyTarget}
                accumulationCurrent={finance.accumulationCurrent}
                accumulationTarget={finance.accumulationTarget}
                savingsHistory={finance.savingsHistory}
                manualTransactions={finance.manualTransactions}
                saveEmergencyCurrent={finance.saveEmergencyCurrent}
                saveEmergencyTarget={finance.saveEmergencyTarget}
                saveAccumulationCurrent={finance.saveAccumulationCurrent}
                saveAccumulationTarget={finance.saveAccumulationTarget}
                saveSavingsHistory={finance.saveSavingsHistory}
                saveTransactions={finance.saveTransactions}
              />
            </div>
          )}

          {visitedTabs.has('schedule') && (
            <div className={activeTab === 'schedule' ? 'space-y-6' : 'hidden'}>
              <ScheduleTab
                currentUser={currentUser}
                totalSessions={totalSessions}
                completedSessions={completedSessions}
                earnedIncome={earnedIncome}
                projectedIncome={projectedIncome}
                teachers={teachers}
                activeTeacherName={activeTeacherName}
                setActiveTeacherName={setActiveTeacherName}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                currentView={currentView}
                setCurrentView={setCurrentView}
                loading={scheduleLoading}
                sessions={sessions}
                setAddModalOpen={setAddModalOpen}
                setSelectedSession={setSelectedSession}
                setEditModalOpen={setEditModalOpen}
                onAddSessionOnDate={(dateStr) => {
                  setPreSelectedAddDate(dateStr);
                  setAddModalOpen(true);
                }}
                onDeleteSchedule={handleDeleteSchedule}
                onDeleteSingleSession={handleDeleteSingleSession}
              />
            </div>
          )}

          {visitedTabs.has('settings') && (
            <div className={activeTab === 'settings' ? 'space-y-6' : 'hidden'}>
              <SettingsTab
                currentUser={currentUser}
                manualTransactions={finance.manualTransactions}
                emergencyCurrent={finance.emergencyCurrent}
                emergencyTarget={finance.emergencyTarget}
                accumulationCurrent={finance.accumulationCurrent}
                accumulationTarget={finance.accumulationTarget}
                savingsHistory={finance.savingsHistory}
                categoryBudgets={finance.categoryBudgets}
                isSidebarPinned={isSidebarPinned}
                setIsSidebarPinned={handleSetSidebarPinned}
                saveTransactions={finance.saveTransactions}
                saveEmergencyCurrent={finance.saveEmergencyCurrent}
                saveEmergencyTarget={finance.saveEmergencyTarget}
                saveAccumulationCurrent={finance.saveAccumulationCurrent}
                saveAccumulationTarget={finance.saveAccumulationTarget}
                saveSavingsHistory={finance.saveSavingsHistory}
                saveBudgets={finance.saveBudgets}
                setManualTransactions={finance.setManualTransactions}
                setEmergencyCurrent={finance.setEmergencyCurrent}
                setEmergencyTarget={finance.setEmergencyTarget}
                setAccumulationCurrent={finance.setAccumulationCurrent}
                setAccumulationTarget={finance.setAccumulationTarget}
                setSavingsHistory={finance.setSavingsHistory}
                setCategoryBudgets={finance.setCategoryBudgets}
                setPasswordModalOpen={setPasswordModalOpen}
                handleLogout={handleLogout}
              />
            </div>
          )}
        </main>
      </div>

      {/* Global App Modals */}
      <AppModals
        currentUser={currentUser}
        txModalOpen={txModalOpen}
        setTxModalOpen={setTxModalOpen}
        modalTxType={modalTxType}
        emergencyCurrent={finance.emergencyCurrent}
        accumulationCurrent={finance.accumulationCurrent}
        manualTransactions={finance.manualTransactions}
        savingsHistory={finance.savingsHistory}
        categoryBudgets={finance.categoryBudgets}
        categoryTypes={finance.categoryTypes}
        saveTransactions={finance.saveTransactions}
        saveEmergencyCurrent={finance.saveEmergencyCurrent}
        saveAccumulationCurrent={finance.saveAccumulationCurrent}
        saveSavingsHistory={finance.saveSavingsHistory}
        addModalOpen={addModalOpen}
        setAddModalOpen={setAddModalOpen}
        preSelectedAddDate={preSelectedAddDate}
        setPreSelectedAddDate={setPreSelectedAddDate}
        fetchSessions={fetchSessions}
        activeTeacherName={activeTeacherName}
        selectedMonth={selectedMonth}
        sessions={sessions}
        teachers={teachers}
        onClearScheduleExclusion={handleClearScheduleExclusion}
        sessionStudentConfigs={sessionStudentConfigs}
        onSaveSessionStudentConfigs={saveSessionStudentConfigs}
        availableIncomeCats={finance.availableIncomeCats}
        editModalOpen={editModalOpen}
        setEditModalOpen={setEditModalOpen}
        selectedSession={selectedSession}
        setSelectedSession={setSelectedSession}
        onDeleteSchedule={handleDeleteSchedule}
        onDeleteSingleSession={handleDeleteSingleSession}
        teachersModalOpen={teachersModalOpen}
        setTeachersModalOpen={setTeachersModalOpen}
        onTeacherUpdated={handleTeacherUpdated}
        passwordModalOpen={passwordModalOpen}
        setPasswordModalOpen={setPasswordModalOpen}
        confirmDeleteTxId={finance.confirmDeleteTxId}
        setConfirmDeleteTxId={finance.setConfirmDeleteTxId}
        executeDeleteManualTx={finance.executeDeleteManualTx}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleLogout={handleLogout}
        handleOpenTxModal={handleOpenTxModal}
      />
    </div>
  );
}
