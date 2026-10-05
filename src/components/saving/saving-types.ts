export interface SavingTabProps {
  currentUser: {
    id: string;
  };
  emergencyCurrent: number;
  emergencyTarget: number;
  accumulationCurrent: number;
  accumulationTarget: number;
  savingsHistory: any[];
  manualTransactions?: any[];
  saveEmergencyCurrent: (userId: string, val: number) => void;
  saveEmergencyTarget: (userId: string, val: number) => void;
  saveAccumulationCurrent: (userId: string, val: number) => void;
  saveAccumulationTarget: (userId: string, val: number) => void;
  saveSavingsHistory: (userId: string, data: any[]) => void;
  saveTransactions?: (userId: string, data: any[]) => void;
}

export interface SavingHistoryItem {
  id: string;
  fund: 'emergency' | 'accumulation';
  type: 'deposit' | 'withdraw';
  amount: number;
  date: string;
  note?: string;
}
