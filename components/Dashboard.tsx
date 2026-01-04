import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, UserSettings, EMOTIONAL_TAGS } from '../types';
import { calculateBurnRate, getDaysUntilPayday, calculateFutureDamage } from '../services/storageService';
import { ArrowUpRight, Skull, AlertTriangle, ChevronDown, ChevronUp, Anchor, TrendingDown, EyeOff, CalendarClock, Lock, ShoppingBag, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  settings: UserSettings;
  onEdit: (transaction: Transaction) => void;
}

const Dashboard: React.FC<Props> = ({ transactions, settings, onEdit }) => {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Helper to change months
  const changeMonth = (offset: number) => {
      const newDate = new Date(selectedDate);
      newDate.setMonth(newDate.getMonth() + offset);
      setSelectedDate(newDate);
      setShowAllHistory(false); // Reset history view on month change
  };

  const isCurrentMonth = useMemo(() => {
      const now = new Date();
      return selectedDate.getMonth() === now.getMonth() && selectedDate.getFullYear() === now.getFullYear();
  }, [selectedDate]);

  const stats = useMemo(() => {
    const selectedMonthPrefix = selectedDate.toISOString().slice(0, 7); // YYYY-MM

    // Filter transactions for the SELECTED month
    const monthlyTransactions = transactions.filter(t => t.date.startsWith(selectedMonthPrefix));

    // 1. VARIABLE EXPENSE (Jajan/Harian)
    const variableExpense = monthlyTransactions
        .filter(t => t.type === TransactionType.EXPENSE && !t.isFixedExpense)
        .reduce((acc, t) => acc + t.amount, 0);

    // 2. FIXED EXPENSE (Wajib/Tagihan)
    const fixedExpense = monthlyTransactions
        .filter(t => t.type === TransactionType.EXPENSE && t.isFixedExpense)
        .reduce((acc, t) => acc + t.amount, 0);

    const monthlyIncome = monthlyTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((acc, t) => acc + t.amount, 0);
    
    // 3. LIQUIDITY (Total Cash Available Real-time - ALL TIME)
    // Liquidity is always calculated from ALL transactions to show current real money
    const allTimeIncome = transactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((acc, t) => acc + t.amount, 0);
    const allTimeExpense = transactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((acc, t) => acc + t.amount, 0);
    
    const liquidity = allTimeIncome - allTimeExpense;

    const daysLeft = getDaysUntilPayday(settings.paydayDayOfMonth);
    
    // Budget Remaining for the SELECTED month
    const budgetRemaining = settings.monthlyBudget - variableExpense;
    
    // Safe Daily Logic (Only relevant for CURRENT month)
    const effectiveAvailable = Math.min(liquidity, budgetRemaining);
    const safeDaily = (isCurrentMonth && daysLeft > 0) ? Math.max(0, effectiveAvailable / daysLeft) : 0;
    
    const burnRate = calculateBurnRate(transactions);
    const futureDamage = calculateFutureDamage(transactions);

    // Crisis Threshold
    const isCrisisMode = isCurrentMonth && safeDaily < 20000;
    
    // Progress calculation
    const budgetProgress = Math.min(100, (variableExpense / settings.monthlyBudget) * 100);

    return { 
        liquidity, 
        variableExpense,
        fixedExpense,
        monthlyIncome,
        safeDaily, 
        daysLeft, 
        burnRate, 
        budgetRemaining, 
        futureDamage, 
        isCrisisMode,
        budgetProgress,
        monthlyTransactions
    };
  }, [transactions, settings, selectedDate, isCurrentMonth]);

  // Sorting for the list: Date Descending
  const displayedTransactions = showAllHistory 
    ? stats.monthlyTransactions 
    : stats.monthlyTransactions.slice(0, 5);
  
  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatMonthYear = (date: Date) => {
      return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date);
  };

  // Styles based on State
  const containerClass = stats.isCrisisMode ? "grayscale contrast-125" : "";
  const safeColor = stats.isCrisisMode ? "text-white" : (stats.safeDaily < 50000 ? 'text-rose-400' : 'text-emerald-400');
  
  let progressColor = 'bg-primary';
  if (stats.budgetProgress > 75) progressColor = 'bg-amber-500';
  if (stats.budgetProgress > 90) progressColor = 'bg-rose-600';

  return (
    <div className={`space-y-6 pb-24 ${containerClass}`}>
      
      {/* Life Anchor Banner */}
      {settings.lifeAnchor && (
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest justify-center bg-slate-900/50 py-2 rounded-full border border-slate-800">
             <Anchor size={12} />
             <span>Demi: {settings.lifeAnchor}</span>
        </div>
      )}

      {/* MONTH NAVIGATOR */}
      <div className="flex items-center justify-between bg-surface p-2 rounded-xl border border-slate-700">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
              <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 font-bold text-white uppercase tracking-wider text-sm">
              <Calendar size={14} className="text-primary"/>
              {formatMonthYear(selectedDate)}
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
              <ChevronRight size={20} />
          </button>
      </div>

      {/* Hero Card: Dynamic Content based on Month */}
      <div className={`relative overflow-hidden rounded-3xl p-6 shadow-2xl border ${stats.isCrisisMode ? 'bg-black border-rose-900/50' : 'bg-gradient-to-br from-indigo-950 to-slate-900 border-white/5'}`}>
        
        {stats.isCrisisMode && (
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-rose-900/20 to-transparent pointer-events-none animate-pulse"></div>
        )}

        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Skull size={120} />
        </div>
        
        <div className="relative z-10">
          {isCurrentMonth ? (
              // --- CURRENT MONTH VIEW (SAFE TO SPEND) ---
              <>
                {stats.isCrisisMode ? (
                    <div className="flex items-center gap-2 mb-2 text-rose-500">
                        <AlertTriangle size={20} className="animate-pulse"/>
                        <span className="font-black uppercase tracking-widest text-xs">DARURAT: HEMAT SEKARANG</span>
                    </div>
                ) : (
                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Jatah Jajan Harian (Safe)</p>
                )}
                
                <h1 className={`text-4xl sm:text-5xl font-black tracking-tight ${safeColor} tabular-nums`}>
                    {formatIDR(stats.safeDaily)}
                </h1>
                
                <div className="mt-6 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <CalendarClock size={16} className="text-indigo-400" />
                        <span className="text-indigo-200 text-xs">Gajian {settings.paydayDayOfMonth}hb</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-full flex items-center gap-2">
                        <span className="text-indigo-300 text-xs uppercase font-bold">Sisa Waktu:</span>
                        <span className="font-bold text-white">{stats.daysLeft} hari</span>
                    </div>
                </div>
              </>
          ) : (
              // --- PAST/FUTURE MONTH VIEW (SUMMARY) ---
              <>
                <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">
                    {stats.budgetRemaining >= 0 ? 'Sisa Budget (Surplus)' : 'Over Budget (Defisit)'}
                </p>
                <h1 className={`text-4xl sm:text-5xl font-black tracking-tight tabular-nums ${stats.budgetRemaining >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {stats.budgetRemaining >= 0 ? '+' : ''}{formatIDR(stats.budgetRemaining)}
                </h1>
                <p className="text-xs text-slate-400 mt-2">
                    {stats.budgetRemaining >= 0 
                        ? "Bulan ini kamu berhasil menahan diri. Bagus." 
                        : "Kamu gagal mengontrol diri di bulan ini."}
                </p>
              </>
          )}
        </div>
      </div>

      {/* BUDGET UTILIZATION BAR (Variable Expenses Only) */}
      <div className="bg-surface p-5 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-end mb-2 relative z-10">
              <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Pemakaian Budget ({formatMonthYear(selectedDate)})
                  </h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-lg font-bold text-white">
                        {formatIDR(stats.variableExpense)} 
                    </p>
                    <span className="text-slate-500 text-sm font-normal"> / {formatIDR(settings.monthlyBudget)}</span>
                  </div>
              </div>
              <div className="text-right">
                  <p className={`text-xl font-black ${stats.budgetProgress >= 100 ? 'text-rose-500' : 'text-slate-200'}`}>
                      {stats.budgetProgress.toFixed(0)}%
                  </p>
              </div>
          </div>
          
          {/* Bar */}
          <div className="h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative z-10">
              <div 
                  className={`h-full ${progressColor} transition-all duration-1000 ease-out relative`} 
                  style={{ width: `${stats.budgetProgress}%` }}
              >
                  {stats.budgetProgress > 100 && (
                      <div className="absolute inset-0 bg-stripes animate-pulse opacity-50"></div>
                  )}
              </div>
          </div>
          
          {stats.budgetRemaining < 0 && (
              <p className="text-rose-500 text-[10px] font-bold mt-2 uppercase flex items-center gap-1 animate-pulse relative z-10">
                  <AlertTriangle size={10} />
                  Over Budget: {formatIDR(Math.abs(stats.budgetRemaining))}
              </p>
          )}

          {/* Fixed Expense Summary */}
          {stats.fixedExpense > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center opacity-70">
                  <div className="flex items-center gap-2 text-indigo-300">
                      <Lock size={12} />
                      <span className="text-[10px] uppercase font-bold tracking-wider">Pengeluaran Wajib (Bills)</span>
                  </div>
                  <span className="text-xs font-mono text-indigo-200">{formatIDR(stats.fixedExpense)}</span>
              </div>
          )}
      </div>

      {/* SHAME BADGE */}
      {settings.shameCount > 0 && isCurrentMonth && (
          <div className="bg-red-950/20 border border-red-900/30 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <EyeOff className="text-red-500" size={16} />
                  <div>
                      <p className="text-red-400 font-bold text-[10px] uppercase">Data Terhapus (Aib)</p>
                  </div>
              </div>
              <span className="text-red-500 font-black text-lg">{settings.shameCount}x</span>
          </div>
      )}

      {/* The Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Real Cash */}
        <div className="bg-surface p-4 rounded-2xl border border-slate-700 relative overflow-hidden">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <ArrowUpRight size={18} />
                <span className="font-bold text-[10px] uppercase tracking-wider">Total Uang (Likuid)</span>
            </div>
            <p className="text-xl font-bold text-white truncate">{formatIDR(stats.liquidity)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Saldo Real-time</p>
        </div>

        {/* Projected Loss */}
        <div className="bg-surface p-4 rounded-2xl border border-slate-700 relative overflow-hidden">
            <div className="flex items-center gap-2 text-rose-400 mb-2">
                <TrendingDown size={18} />
                <span className="font-bold text-[10px] uppercase tracking-wider">Potensi Rugi 1 Thn</span>
            </div>
            <p className="text-xl font-bold text-rose-200 truncate">{formatIDR(stats.futureDamage)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Akibat Impulsif</p>
        </div>
      </div>

      {/* Transaction List (Filtered by Month) */}
      <div className="pt-2">
        <div className="flex justify-between items-end mb-4 px-1">
            <h3 className="text-slate-400 font-semibold text-sm uppercase tracking-wider">
                Riwayat {formatMonthYear(selectedDate)}
            </h3>
        </div>
        
        {displayedTransactions.length === 0 ? (
            <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
                <p className="text-slate-500 text-sm">Tidak ada transaksi di bulan ini.</p>
            </div>
        ) : (
            <div className="space-y-3">
            {displayedTransactions.map(t => (
                <button 
                    key={t.id} 
                    onClick={() => onEdit(t)}
                    className="w-full text-left bg-surface p-4 rounded-xl border border-slate-800 flex justify-between items-center group hover:bg-slate-800 transition-colors active:scale-[0.99]"
                >
                <div>
                    <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{t.category}</span>
                    {/* ICONS FOR EXPENSE TYPES */}
                    {t.type === TransactionType.EXPENSE && (
                        t.isFixedExpense ? (
                            <div title="Wajib/Rutin" className="p-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                <Lock size={10} />
                            </div>
                        ) : (
                            <div title="Jajan/Gaya Hidup" className="p-0.5 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                <ShoppingBag size={10} />
                            </div>
                        )
                    )}

                    {t.emotionalTag && !t.isFixedExpense && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                        {EMOTIONAL_TAGS.find(tag => tag.value === t.emotionalTag)?.label.split(' ')[1] || t.emotionalTag}
                        </span>
                    )}
                    </div>
                    <div className="flex gap-2 items-center mt-1">
                        <span className="text-[10px] text-slate-500 font-mono">{t.date}</span>
                        <p className="text-xs text-slate-400 italic truncate max-w-[150px] sm:max-w-xs opacity-70">"{t.reason}"</p>
                    </div>
                </div>
                <div className={`font-bold whitespace-nowrap text-sm ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-white'}`}>
                    {t.type === TransactionType.INCOME ? '+' : '-'}{formatIDR(t.amount)}
                </div>
                </button>
            ))}
            
            {stats.monthlyTransactions.length > 5 && (
                <button 
                    onClick={() => setShowAllHistory(!showAllHistory)}
                    className="w-full py-4 mt-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white flex items-center justify-center gap-2 transition-colors border border-dashed border-slate-800 rounded-xl"
                >
                    {showAllHistory ? (
                        <>Tutup Riwayat <ChevronUp size={14}/></>
                    ) : (
                        <>Lihat Semua ({stats.monthlyTransactions.length}) <ChevronDown size={14}/></>
                    )}
                </button>
            )}
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;