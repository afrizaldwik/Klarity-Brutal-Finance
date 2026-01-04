export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum EmotionalTag {
  NEED = 'Need',
  IMPULSE = 'Impulse',
  HUNGER = 'Hunger',
  SOCIAL = 'Social',
  EMERGENCY = 'Emergency',
  BOREDOM = 'Boredom',
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  emotionalTag?: EmotionalTag;
  reason: string; // The "1 sentence reason"
  date: string; // ISO string YYYY-MM-DD
  timestamp: number; // Creation timestamp
  isDelayedEntry?: boolean; // If entered > 24 hours after the date
  isFixedExpense?: boolean; // NEW: True if this is a mandatory bill/fixed cost that shouldn't affect "Fun Budget"
}

export interface Target {
  id: string;
  name: string;
  targetAmount: number;
  collectedAmount: number;
  deadline?: string;
}

export interface UserSettings {
  monthlyIncome: number;
  monthlyBudget: number;
  paydayDayOfMonth: number; // 1-31
  lifeAnchor: string; // The "Why"
  shameCount: number; // Number of deleted impulse transactions
  installDate: number;
}

export interface AnalysisResult {
  brutalTruth: string;
  leaks: string[];
  safeToSpendDaily: number;
}

export const CATEGORIES = [
  'Makanan & Minuman',
  'Transportasi',
  'Tempat Tinggal',
  'Hiburan',
  'Belanja',
  'Kesehatan',
  'Edukasi',
  'Investasi',
  'Bayar Utang',
  'Lainnya',
];

export const EMOTIONAL_TAGS = [
  { value: EmotionalTag.NEED, label: '🛡️ Butuh', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' },
  { value: EmotionalTag.IMPULSE, label: '🔥 Impulsif', color: 'bg-rose-500/20 text-rose-400 border-rose-500/50' },
  { value: EmotionalTag.HUNGER, label: '🍔 Lapar', color: 'bg-amber-500/20 text-amber-400 border-amber-500/50' },
  { value: EmotionalTag.SOCIAL, label: '🥂 Sosial', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
  { value: EmotionalTag.BOREDOM, label: '🥱 Bosan', color: 'bg-slate-500/20 text-slate-400 border-slate-500/50' },
  { value: EmotionalTag.EMERGENCY, label: '🚑 Darurat', color: 'bg-red-600/20 text-red-500 border-red-600/50' },
];