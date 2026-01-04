import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, EmotionalTag, CATEGORIES, EMOTIONAL_TAGS } from '../types';
import { X, Trash2, Calendar, ShieldCheck, Lock, Check } from 'lucide-react';

interface Props {
  onSave: (t: Transaction) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
  initialData?: Transaction | null;
}

// SAFE ID GENERATOR (Polyfill for Android/Old Browsers)
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

const TransactionForm: React.FC<Props> = ({ onSave, onDelete, onClose, initialData }) => {
  const [amountDisplay, setAmountDisplay] = useState<string>('');
  const [amountValue, setAmountValue] = useState<number>(0);
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [emotionalTag, setEmotionalTag] = useState<EmotionalTag | undefined>(undefined);
  const [reason, setReason] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isFixedExpense, setIsFixedExpense] = useState<boolean>(false);

  useEffect(() => {
    if (initialData) {
      setAmountValue(initialData.amount);
      setAmountDisplay(formatNumber(initialData.amount));
      setType(initialData.type);
      setCategory(initialData.category);
      setEmotionalTag(initialData.emotionalTag);
      setReason(initialData.reason);
      setDate(initialData.date);
      setIsFixedExpense(initialData.isFixedExpense || false);
    }
  }, [initialData]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue === '') {
      setAmountDisplay('');
      setAmountValue(0);
      return;
    }
    const num = parseInt(rawValue, 10);
    setAmountValue(num);
    setAmountDisplay(formatNumber(num));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountValue <= 0) return;

    // Use safe generator instead of direct crypto.randomUUID
    const txId = initialData ? initialData.id : generateId();

    const txData: Transaction = {
      id: txId,
      amount: amountValue,
      type,
      category,
      emotionalTag,
      reason: reason || 'Tidak ada alasan (pengecut)',
      date: date,
      timestamp: initialData ? initialData.timestamp : new Date().getTime(),
      isFixedExpense: type === TransactionType.EXPENSE ? isFixedExpense : false,
    };

    onSave(txData);
  };

  const handleDelete = () => {
    if (initialData && onDelete) {
      if (window.confirm('Yakin ingin menghapus transaksi ini?')) {
        onDelete(initialData.id);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Sheet / Modal */}
      <div className="relative w-full max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-700 shadow-2xl flex flex-col max-h-[95vh] animate-in slide-in-from-bottom-full duration-300">
        
        {/* Handle Bar (Mobile) */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden" onClick={onClose}>
            <div className="w-12 h-1.5 bg-slate-700 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700/50">
          <h2 className="text-lg font-bold text-white">
            {initialData ? 'Edit Transaksi' : 'Transaksi Baru'}
          </h2>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto px-6 py-4 space-y-6 flex-1 no-scrollbar pb-32 sm:pb-6">
            <form id="txForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Type Segmented Control */}
            <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
                <button
                    type="button"
                    onClick={() => setType(TransactionType.EXPENSE)}
                    className={`py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        type === TransactionType.EXPENSE ? 'bg-danger text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                    Pengeluaran
                </button>
                <button
                    type="button"
                    onClick={() => setType(TransactionType.INCOME)}
                    className={`py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        type === TransactionType.INCOME ? 'bg-success text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                    Pemasukan
                </button>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nominal</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400 font-bold">Rp</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={amountDisplay}
                        onChange={handleAmountChange}
                        placeholder="0"
                        className="w-full bg-slate-900 text-white text-3xl font-bold py-4 pl-12 pr-4 rounded-2xl border-2 border-slate-700 focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all placeholder-slate-800"
                        autoFocus={!initialData}
                        required
                    />
                </div>
            </div>

            {/* Category & Date Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori</label>
                    <div className="relative">
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-slate-900 text-white p-3.5 rounded-xl border border-slate-700 focus:border-primary outline-none appearance-none font-medium"
                        >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal</label>
                    <div className="relative">
                        <input 
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-slate-900 text-white p-3.5 rounded-xl border border-slate-700 focus:border-primary outline-none font-medium"
                            required
                        />
                    </div>
                </div>
            </div>

            {/* Fixed Expense Toggle */}
            {type === TransactionType.EXPENSE && (
                <div 
                    onClick={() => setIsFixedExpense(!isFixedExpense)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                        isFixedExpense 
                        ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/50' 
                        : 'bg-slate-900/50 border-slate-700 hover:bg-slate-900'
                    }`}
                >
                    <div className={`p-2.5 rounded-full ${isFixedExpense ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                        {isFixedExpense ? <Lock size={20} /> : <ShieldCheck size={20} />}
                    </div>
                    <div className="flex-1">
                        <p className={`text-sm font-bold ${isFixedExpense ? 'text-indigo-200' : 'text-slate-300'}`}>
                            Tagihan / Wajib
                        </p>
                        <p className="text-[10px] text-slate-500">
                            Tidak memotong budget jajan harian.
                        </p>
                    </div>
                    {isFixedExpense && <Check size={18} className="text-indigo-400" />}
                </div>
            )}

            {/* Emotional Tags */}
            {type === TransactionType.EXPENSE && !isFixedExpense && (
                <div className="space-y-2 animate-in fade-in">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pemicu Emosi</label>
                    <div className="grid grid-cols-3 gap-2">
                        {EMOTIONAL_TAGS.map((tag) => (
                        <button
                            key={tag.value}
                            type="button"
                            onClick={() => setEmotionalTag(emotionalTag === tag.value ? undefined : tag.value)}
                            className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all truncate ${
                            tag.color
                            } ${emotionalTag === tag.value ? 'ring-2 ring-white ring-offset-2 ring-offset-surface opacity-100 scale-[1.02]' : 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100'}`}
                        >
                            {tag.label}
                        </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alasan (Jujur)</label>
                <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Kenapa beli ini?"
                className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-primary outline-none transition-colors"
                />
            </div>
            </form>
        </div>

        {/* Footer Actions - Sticky Bottom on Mobile */}
        <div className="p-4 border-t border-slate-800 bg-surface sm:rounded-b-3xl flex gap-3 pb-safe sticky bottom-0 z-20 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.5)]">
            {initialData && onDelete && (
                <button
                    type="button"
                    onClick={handleDelete}
                    className="flex-none bg-slate-800 hover:bg-rose-950/50 text-rose-500 border border-slate-700 hover:border-rose-900 p-4 rounded-2xl transition-all"
                >
                    <Trash2 size={24} />
                </button>
            )}
            <button
                type="submit"
                form="txForm"
                className="flex-1 bg-primary hover:bg-sky-300 text-slate-900 font-bold text-lg py-4 rounded-2xl shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all"
            >
                {initialData ? 'Simpan' : 'Simpan Transaksi'}
            </button>
        </div>

      </div>
    </div>
  );
};

export default TransactionForm;