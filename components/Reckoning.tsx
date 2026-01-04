import React, { useState, useEffect } from 'react';
import { Transaction, UserSettings, TransactionType, EmotionalTag } from '../types';
import { calculateFutureDamage } from '../services/storageService';
import { Skull, Lock, RefreshCw } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  settings: UserSettings;
  onClose: () => void;
}

const Reckoning: React.FC<Props> = ({ transactions, settings, onClose }) => {
  const [typedText, setTypedText] = useState('');
  const [canUnlock, setCanUnlock] = useState(false);
  
  const futureLoss = calculateFutureDamage(transactions);
  const impulseCount = transactions.filter(t => t.emotionalTag === EmotionalTag.IMPULSE).length;
  const shameCount = settings.shameCount || 0;
  
  const REQUIRED_TEXT = "SAYA BOROS";

  useEffect(() => {
    if (typedText.toUpperCase() === REQUIRED_TEXT) {
      setCanUnlock(true);
    } else {
      setCanUnlock(false);
    }
  }, [typedText]);

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      <div className="absolute inset-0 bg-red-900/10 pointer-events-none animate-pulse"></div>
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center space-y-2">
            <Skull className="w-20 h-20 mx-auto text-red-600" />
            <h1 className="text-4xl font-black tracking-tighter text-red-500 uppercase">Vonis Keuangan</h1>
            <p className="text-slate-500 text-sm font-mono">Hari Penghakiman</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-none font-mono text-sm space-y-4 shadow-2xl">
            <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">STATUS:</span>
                <span className="text-red-500 font-bold">KRITIS</span>
            </div>
            <div className="flex justify-between">
                <span className="text-slate-400">Total Transaksi Impulsif:</span>
                <span className="text-white">{impulseCount}x</span>
            </div>
            <div className="flex justify-between">
                <span className="text-slate-400">Upaya Menutupi Aib (Hapus Data):</span>
                <span className="text-red-500 font-bold">{shameCount}x</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-400">Proyeksi Kerugian 1 Tahun:</span>
                <span className="text-red-500 font-bold">{formatIDR(futureLoss)}</span>
            </div>
        </div>

        <div className="space-y-4 text-center">
            <p className="text-lg font-medium leading-relaxed">
                Kamu bilang kamu ingin <span className="text-primary font-bold">"{settings.lifeAnchor}"</span>, 
                tapi datamu menunjukkan kamu memilih <span className="text-red-500 font-bold">kesenangan sesaat</span>.
            </p>
            <p className="text-slate-500 text-xs">
                Aplikasi ini terkunci sampai kamu mengakui kenyataan.
            </p>
        </div>

        <div className="space-y-4">
            <label className="block text-xs text-center text-slate-500 uppercase">Ketik "{REQUIRED_TEXT}" untuk membuka kunci</label>
            <input 
                type="text" 
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                className="w-full bg-transparent border-b-2 border-red-900 text-center text-2xl font-black text-red-500 focus:outline-none focus:border-red-500 uppercase placeholder-slate-800"
                placeholder="..."
            />
            
            <button 
                onClick={onClose}
                disabled={!canUnlock}
                className="w-full bg-red-600 disabled:bg-slate-800 text-white font-bold py-4 mt-4 disabled:text-slate-600 transition-colors flex items-center justify-center gap-2"
            >
                {canUnlock ? <Lock size={16} className="text-white"/> : <Lock size={16} />}
                {canUnlock ? "TERIMA KONSEKUENSI" : "TERKUNCI"}
            </button>
        </div>
      </div>
    </div>
  );
};

export default Reckoning;