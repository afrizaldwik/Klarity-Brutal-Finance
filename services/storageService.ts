import { Transaction, UserSettings, TransactionType, EmotionalTag, Target } from '../types';

const STORAGE_KEY_TX = 'klarity_transactions';
const STORAGE_KEY_SETTINGS = 'klarity_settings';
const STORAGE_KEY_TARGETS = 'klarity_targets';

const DEFAULT_SETTINGS: UserSettings = {
  monthlyIncome: 0,
  monthlyBudget: 0,
  paydayDayOfMonth: 1,
  lifeAnchor: '',
  shameCount: 0,
  installDate: Date.now(),
};

// --- TRANSACTIONS ---

export const getTransactions = (): Transaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_TX);
    const parsed: Transaction[] = data ? JSON.parse(data) : [];
    
    // SORTING LOGIC: Date Descending (Newest first), then Timestamp Descending
    return parsed.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) {
            return dateB - dateA;
        }
        return b.timestamp - a.timestamp;
    });
  } catch (e) {
    console.error("Failed to load transactions", e);
    return [];
  }
};

export const saveTransaction = (transaction: Transaction): Transaction[] => {
  try {
    const current = getTransactions();
    // Check for delayed entry logic
    const txDate = new Date(transaction.date).getTime();
    const createdDate = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    
    // If transaction date is more than 24 hours in the past compared to creation
    if (createdDate - txDate > oneDay) {
        transaction.isDelayedEntry = true;
    }

    const updated = [transaction, ...current];
    localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(updated));
    return getTransactions(); 
  } catch (e) {
    console.error("Storage Limit Exceeded or Error", e);
    alert("Gagal menyimpan. Memori penuh?");
    return getTransactions();
  }
};

export const updateTransaction = (transaction: Transaction): Transaction[] => {
  try {
    const current = getTransactions();
    const index = current.findIndex(t => t.id === transaction.id);
    if (index !== -1) {
      current[index] = transaction;
      localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(current));
    }
    return getTransactions();
  } catch (e) {
     console.error("Storage Update Error", e);
     return getTransactions();
  }
};

export const deleteTransaction = (id: string): { transactions: Transaction[], shameIncremented: boolean } => {
  const current = getTransactions();
  const txToDelete = current.find(t => t.id === id);
  let shameIncremented = false;

  // THE SHAME MECHANISM
  // If user deletes an Impulse buy, we increment the shame counter permanently.
  if (txToDelete && txToDelete.emotionalTag === EmotionalTag.IMPULSE) {
      const settings = getSettings();
      settings.shameCount = (settings.shameCount || 0) + 1;
      saveSettings(settings);
      shameIncremented = true;
  }

  const updated = current.filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(updated));
  return { transactions: updated, shameIncremented };
};

// --- TARGETS (GOALS) ---

export const getTargets = (): Target[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_TARGETS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveTarget = (target: Target): Target[] => {
  try {
    const current = getTargets();
    const exists = current.findIndex(t => t.id === target.id);
    let updated;
    if (exists !== -1) {
      current[exists] = target;
      updated = [...current];
    } else {
      updated = [...current, target];
    }
    localStorage.setItem(STORAGE_KEY_TARGETS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Save Target Error", e);
    return getTargets();
  }
};

export const deleteTarget = (id: string): Target[] => {
  const current = getTargets();
  const updated = current.filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY_TARGETS, JSON.stringify(updated));
  return updated;
};

// --- SETTINGS ---

export const getSettings = (): UserSettings => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SETTINGS);
    const parsed = data ? JSON.parse(data) : DEFAULT_SETTINGS;
    // Ensure new fields exist for old users
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: UserSettings): UserSettings => {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  return settings;
};

// --- BACKUP & RESTORE ---

export const getFullBackup = () => {
  // Gathers ALL data points
  return {
    transactions: getTransactions(),
    targets: getTargets(),
    settings: getSettings(),
    timestamp: new Date().toISOString(),
    version: '1.1' // Version bump
  };
};

export const restoreBackup = (jsonData: any): boolean => {
  try {
    // Basic structural check
    if (!jsonData || typeof jsonData !== 'object') {
        return false;
    }

    // 1. CLEAR CURRENT DATA (Wipe clean to prevent ghost data)
    localStorage.removeItem(STORAGE_KEY_TX);
    localStorage.removeItem(STORAGE_KEY_TARGETS);
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    
    // 2. RESTORE TRANSACTIONS
    // If key exists, save it. If not, save empty array (effectively resetting it)
    const transactions = Array.isArray(jsonData.transactions) ? jsonData.transactions : [];
    localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(transactions));
    
    // 3. RESTORE TARGETS
    const targets = Array.isArray(jsonData.targets) ? jsonData.targets : [];
    localStorage.setItem(STORAGE_KEY_TARGETS, JSON.stringify(targets));
    
    // 4. RESTORE SETTINGS
    // Merge with defaults to ensure integrity
    const restoredSettings = jsonData.settings || {};
    const finalSettings = { ...DEFAULT_SETTINGS, ...restoredSettings };
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(finalSettings));
    
    return true;
  } catch (e) {
    console.error("Restore failed", e);
    // Attempt to salvage basic settings if catastrophe happens
    saveSettings(DEFAULT_SETTINGS); 
    return false;
  }
};

// --- CALCULATIONS ---

export const getCurrentMonthStats = (transactions: Transaction[]) => {
    const now = new Date();
    // YYYY-MM format
    const currentMonthPrefix = now.toISOString().slice(0, 7); 
    
    const monthlyTransactions = transactions.filter(t => t.date.startsWith(currentMonthPrefix));
    
    const totalExpense = monthlyTransactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((acc, t) => acc + t.amount, 0);

    const totalIncome = monthlyTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((acc, t) => acc + t.amount, 0);

    return { totalExpense, totalIncome };
};

export const calculateBurnRate = (transactions: Transaction[]): number => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentExpenses = transactions.filter(t => 
    t.type === TransactionType.EXPENSE && 
    t.timestamp >= thirtyDaysAgo.getTime()
  );

  const totalSpent = recentExpenses.reduce((acc, t) => acc + t.amount, 0);
  return totalSpent / 30; 
};

export const calculateFutureDamage = (transactions: Transaction[]): number => {
    // Calculate average monthly impulse spending
    const now = new Date();
    const currentMonthStr = now.toISOString().slice(0, 7); // YYYY-MM
    
    // Get impulsive transactions from current month (rough approximation)
    const impulsive = transactions.filter(t => 
        t.type === TransactionType.EXPENSE &&
        t.emotionalTag === EmotionalTag.IMPULSE &&
        t.date.startsWith(currentMonthStr)
    );

    const monthlyLoss = impulsive.reduce((acc, t) => acc + t.amount, 0);
    // Project for 1 year
    return monthlyLoss * 12;
};

export const getDaysUntilPayday = (payday: number): number => {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let targetDate = new Date(currentYear, currentMonth, payday);

  // If today is past payday (e.g., today is 26th, payday is 25th), target is next month
  // If today IS payday, consider it 0 days or 30 days depending on logic, 
  // but usually we want to count down to the *next* infusion of cash.
  if (currentDay >= payday) {
    targetDate = new Date(currentYear, currentMonth + 1, payday);
  }

  const diffTime = Math.abs(targetDate.getTime() - today.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays;
};