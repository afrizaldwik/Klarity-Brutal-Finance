import React, { useMemo } from 'react';
import { Transaction, TransactionType, EMOTIONAL_TAGS } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BrainCircuit, Gavel, TrendingUp, AlertOctagon } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  monthlyBudget: number;
  onTriggerReckoning: () => void;
}

const Analysis: React.FC<Props> = ({ transactions, monthlyBudget, onTriggerReckoning }) => {
  
  // 1. Calculate Emotional Spending Data for Chart
  const emotionalData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
    const counts: Record<string, number> = {};
    
    expenses.forEach(t => {
      const tag = t.emotionalTag || 'Untagged';
      counts[tag] = (counts[tag] || 0) + t.amount;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  // 2. Generate Manual "Brutal" Insights based on Math
  const analysisStats = useMemo(() => {
      const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
      if (expenses.length === 0) return null;

      const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
      
      // Impulse Check
      const impulseTx = expenses.filter(t => t.emotionalTag === 'Impulse');
      const impulseTotal = impulseTx.reduce((sum, t) => sum + t.amount, 0);
      const impulsePercentage = totalExpense > 0 ? (impulseTotal / totalExpense) * 100 : 0;

      // Top Category
      const catCounts: Record<string, number> = {};
      expenses.forEach(t => {
          catCounts[t.category] = (catCounts[t.category] || 0) + t.amount;
      });
      const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];

      return {
          totalExpense,
          impulseTotal,
          impulsePercentage,
          topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null
      };
  }, [transactions]);

  const formatIDRCompact = (value: number) => {
      return new Intl.NumberFormat('id-ID', { notation: "compact", compactDisplay: "short" }).format(value);
  };
  
  const formatIDR = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
  }

  return (
    <div className="space-y-8 pb-24">
      <div className="flex justify-between items-end">
        <h2 className="text-2xl font-bold text-white">Analisis Perilaku</h2>
      </div>

      {/* Trigger Reckoning Button */}
      <button 
        onClick={onTriggerReckoning}
        className="w-full bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-500 p-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
      >
        <Gavel size={24} />
        <span className="font-black uppercase tracking-widest">Hadapi Vonis Bulanan</span>
      </button>

      {/* Manual Insight Card (Replaced AI) */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
                <BrainCircuit className="text-emerald-400" />
                <h3 className="font-bold text-slate-200">Fakta Statistik</h3>
            </div>
            
            {analysisStats ? (
                <div className="space-y-4">
                    {/* Impulse Stat */}
                    <div className="bg-black/20 p-4 rounded-xl border-l-4 border-rose-500">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Kebocoran Impulsif</p>
                        <p className="text-slate-200 text-sm leading-relaxed">
                            Kamu telah membakar <span className="text-rose-400 font-bold">{formatIDR(analysisStats.impulseTotal)}</span> ({analysisStats.impulsePercentage.toFixed(1)}% dari pengeluaran) hanya untuk keinginan sesaat.
                        </p>
                    </div>

                    {/* Top Category Stat */}
                    {analysisStats.topCategory && (
                        <div className="bg-black/20 p-4 rounded-xl border-l-4 border-amber-500">
                             <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Kategori Terboros</p>
                             <div className="flex justify-between items-center">
                                 <span className="text-white font-bold">{analysisStats.topCategory.name}</span>
                                 <span className="text-amber-400 font-mono">{formatIDR(analysisStats.topCategory.amount)}</span>
                             </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-6">
                    <p className="text-slate-500 text-sm">Belum ada cukup data transaksi untuk dianalisis.</p>
                </div>
            )}
        </div>
      </div>

      {/* Charts */}
      <div className="bg-surface p-4 rounded-2xl border border-slate-700">
        <h3 className="text-slate-400 font-semibold mb-4 text-sm uppercase tracking-wider">Belanja Berdasarkan Emosi (Rp)</h3>
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={emotionalData}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} 
                         tickFormatter={(val) => {
                             const tag = EMOTIONAL_TAGS.find(t => t.value === val);
                             return tag ? tag.label.split(' ')[1] : val;
                         }}
                    />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatIDRCompact}/>
                    <Tooltip 
                        formatter={(value: number) => [formatIDR(value), "Total"]}
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {emotionalData.map((entry, index) => {
                             // Extract color class logic roughly for hex or fallback
                             let fill = '#94a3b8'; // default slate
                             if (entry.name === 'Impulse') fill = '#f43f5e';
                             if (entry.name === 'Need') fill = '#10b981';
                             if (entry.name === 'Hunger') fill = '#f59e0b';
                             if (entry.name === 'Social') fill = '#a855f7';
                             return <Cell key={`cell-${index}`} fill={fill} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analysis;