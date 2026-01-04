import React, { useState, useEffect } from 'react';
import { Target, Transaction, TransactionType, EmotionalTag } from '../types';
import * as Storage from '../services/storageService';
import { Target as TargetIcon, Plus, Trash2, Edit2, TrendingUp, X, Check, Calendar } from 'lucide-react';

interface Props {
    onUpdateTransactions?: () => void;
}

const TargetsView: React.FC<Props> = ({ onUpdateTransactions }) => {
  const [targets, setTargets] = useState<Target[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDepositMode, setIsDepositMode] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  
  // Amount states (String for formatted display)
  const [targetAmountDisplay, setTargetAmountDisplay] = useState('');
  const [currentAmountDisplay, setCurrentAmountDisplay] = useState('');
  const [depositAmountDisplay, setDepositAmountDisplay] = useState('');
  
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    setTargets(Storage.getTargets());
  }, []);

  const formatNumber = (num: number) => new Intl.NumberFormat('id-ID').format(num);
  
  const parseNumber = (str: string) => parseInt(str.replace(/\D/g, '') || '0', 10);

  const handleAmountChange = (val: string, setter: (v: string) => void) => {
    const raw = val.replace(/\D/g, '');
    if (raw === '') setter('');
    else setter(formatNumber(parseInt(raw, 10)));
  };

  const resetForm = () => {
    setName('');
    setTargetAmountDisplay('');
    setCurrentAmountDisplay('');
    setEditingId(null);
    setIsDepositMode(false);
    setDepositAmountDisplay('');
    setDeadline('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Target) => {
    setName(t.name);
    setTargetAmountDisplay(formatNumber(t.targetAmount));
    setCurrentAmountDisplay(formatNumber(t.collectedAmount));
    setDeadline(t.deadline || '');
    setEditingId(t.id);
    setIsDepositMode(false);
    setIsModalOpen(true);
  };

  const handleOpenDeposit = (t: Target) => {
    setName(t.name);
    setTargetAmountDisplay(formatNumber(t.targetAmount)); // View only
    setCurrentAmountDisplay(formatNumber(t.collectedAmount)); // View only
    setEditingId(t.id);
    setIsDepositMode(true);
    setDepositAmountDisplay('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDepositMode && editingId) {
        // Handle Deposit
        const target = targets.find(t => t.id === editingId);
        if (target) {
            const added = parseNumber(depositAmountDisplay);
            
            // 1. Update Target Goal
            const updatedTarget: Target = {
                ...target,
                collectedAmount: target.collectedAmount + added
            };
            const updatedList = Storage.saveTarget(updatedTarget);
            setTargets(updatedList);

            // 2. AUTO-RECORD AS EXPENSE
            if (added > 0) {
                const autoTx: Transaction = {
                    id: crypto.randomUUID(),
                    amount: added,
                    type: TransactionType.EXPENSE,
                    category: 'Investasi',
                    emotionalTag: EmotionalTag.NEED,
                    reason: `Tabungan: ${target.name}`,
                    date: new Date().toISOString().split('T')[0],
                    timestamp: Date.now(),
                    // CRITICAL: Mark as Fixed Expense so it reduces Liquidity but NOT the Daily/Jajan Budget
                    isFixedExpense: true 
                };
                Storage.saveTransaction(autoTx);
                
                if (onUpdateTransactions) {
                    onUpdateTransactions();
                }
            }
        }
    } else {
        // Handle Create/Edit
        const initialBalance = parseNumber(currentAmountDisplay);
        
        const newTarget: Target = {
            id: editingId || crypto.randomUUID(),
            name,
            targetAmount: parseNumber(targetAmountDisplay),
            collectedAmount: initialBalance,
            deadline: deadline || undefined,
        };

        // NEW LOGIC: If Creating New Target AND has Initial Balance > 0
        // We assume "Initial Balance" means money currently in hand being allocated now.
        if (!editingId && initialBalance > 0) {
            const autoTx: Transaction = {
                id: crypto.randomUUID(),
                amount: initialBalance,
                type: TransactionType.EXPENSE,
                category: 'Investasi',
                emotionalTag: EmotionalTag.NEED,
                reason: `Saldo Awal: ${name}`,
                date: new Date().toISOString().split('T')[0],
                timestamp: Date.now(),
                // CRITICAL: Mark as Fixed Expense
                isFixedExpense: true
            };
            Storage.saveTransaction(autoTx);
            
            if (onUpdateTransactions) {
                onUpdateTransactions();
            }
        }

        const updatedList = Storage.saveTarget(newTarget);
        setTargets(updatedList);
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Hapus target ini? Mimpi dibatalkan?')) {
        const updatedList = Storage.deleteTarget(id);
        setTargets(updatedList);
        setIsModalOpen(false);
    }
  };

  const calculateProgress = (current: number, total: number) => {
      return Math.min(100, Math.max(0, (current / total) * 100));
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-white">Target Keuangan</h2>
            <p className="text-slate-400 text-xs">Ubah uang menjadi mimpi nyata.</p>
        </div>
        <button 
            onClick={handleOpenCreate}
            className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-full transition-colors"
        >
            <Plus size={24} />
        </button>
      </div>

      {targets.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-900/50">
              <TargetIcon className="w-16 h-16 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400 font-medium">Belum ada target.</p>
              <p className="text-slate-500 text-xs mt-1">Hidup tanpa tujuan itu membosankan.</p>
              <button 
                onClick={handleOpenCreate}
                className="mt-4 text-emerald-400 text-sm font-bold uppercase tracking-wider hover:text-emerald-300"
              >
                  + Buat Target Baru
              </button>
          </div>
      ) : (
          <div className="space-y-4">
              {targets.map(target => {
                  const progress = calculateProgress(target.collectedAmount, target.targetAmount);
                  const isComplete = progress >= 100;
                  
                  return (
                    <div key={target.id} className="bg-surface border border-slate-700 p-5 rounded-2xl relative overflow-hidden group">
                        {/* Progress Bar Background */}
                        <div className="absolute bottom-0 left-0 h-1 bg-slate-700 w-full">
                            <div 
                                className={`h-full transition-all duration-500 ${isComplete ? 'bg-emerald-400' : 'bg-blue-500'}`} 
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>

                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    {target.name}
                                    {isComplete && <Check size={16} className="text-emerald-400" />}
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Target: <span className="text-slate-200">{formatNumber(target.targetAmount)}</span>
                                </p>
                                {target.deadline && (
                                    <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                                        <Calendar size={10} />
                                        {target.deadline}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenEdit(target)} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg">
                                    <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDelete(target.id)} className="p-1.5 bg-slate-800 text-rose-500 hover:bg-rose-900/30 rounded-lg">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between items-end relative z-10">
                            <div>
                                <p className="text-2xl font-black text-white">{formatNumber(target.collectedAmount)}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">
                                    {progress.toFixed(1)}% Terkumpul
                                </p>
                            </div>
                            <button 
                                onClick={() => handleOpenDeposit(target)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2 ${
                                    isComplete 
                                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                                }`}
                                disabled={isComplete}
                            >
                                <TrendingUp size={16} />
                                Isi
                            </button>
                        </div>
                    </div>
                  );
              })}
          </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-4">
              <div className="bg-surface w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl animate-in slide-in-from-bottom-10 duration-200">
                  <div className="flex justify-between items-center p-4 border-b border-slate-700">
                      <h3 className="font-bold text-white">
                          {isDepositMode ? `Isi Celengan: ${name}` : (editingId ? 'Edit Target' : 'Buat Target Baru')}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <form onSubmit={handleSave} className="p-4 space-y-4">
                      {!isDepositMode && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Target</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-primary outline-none"
                                    placeholder="Cth: Laptop Baru"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Butuh Berapa? (Rp)</label>
                                <input 
                                    type="text"
                                    inputMode="numeric"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-primary outline-none"
                                    placeholder="0"
                                    value={targetAmountDisplay}
                                    onChange={e => handleAmountChange(e.target.value, setTargetAmountDisplay)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Saldo Awal (Opsional)</label>
                                <input 
                                    type="text"
                                    inputMode="numeric"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-primary outline-none"
                                    placeholder="0"
                                    value={currentAmountDisplay}
                                    onChange={e => handleAmountChange(e.target.value, setCurrentAmountDisplay)}
                                />
                                <p className="text-[10px] text-slate-500 mt-1">
                                    Otomatis dicatat sebagai pengeluaran (Investasi) hari ini.
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tenggat Waktu / Deadline</label>
                                <input 
                                    type="date"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-primary outline-none"
                                    value={deadline}
                                    onChange={e => setDeadline(e.target.value)}
                                />
                            </div>
                        </>
                      )}

                      {isDepositMode && (
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tambah Uang (Rp)</label>
                              <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">Rp</span>
                                  <input 
                                      type="text"
                                      inputMode="numeric"
                                      className="w-full bg-slate-900 border-2 border-emerald-500/50 rounded-xl p-4 pl-12 text-2xl font-bold text-white focus:border-emerald-500 outline-none"
                                      placeholder="0"
                                      value={depositAmountDisplay}
                                      onChange={e => handleAmountChange(e.target.value, setDepositAmountDisplay)}
                                      autoFocus
                                      required
                                  />
                              </div>
                              <p className="text-xs text-slate-400 mt-2 text-center">
                                  Uang ini akan otomatis dicatat sebagai <strong>Pengeluaran (Investasi)</strong>.
                              </p>
                          </div>
                      )}

                      <div className="flex gap-2 mt-4">
                        {!isDepositMode && editingId && (
                             <button 
                                type="button"
                                onClick={() => handleDelete(editingId)}
                                className="flex-none bg-slate-800 hover:bg-rose-900/50 text-rose-500 p-4 rounded-xl transition-colors border border-slate-700"
                             >
                                 <Trash2 size={24} />
                             </button>
                        )}
                        <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl">
                            {isDepositMode ? 'Masukan ke Tabungan' : 'Simpan Target'}
                        </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default TargetsView;