import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { ShieldAlert, Timer, Ban, CheckCircle2, Wallet, ShoppingBag } from 'lucide-react';

interface Props {
  settings: UserSettings;
  onCancel: () => void;
  onProceed: () => void;
}

const PreSpending: React.FC<Props> = ({ settings, onCancel, onProceed }) => {
  const [step, setStep] = useState<'INTERROGATE' | 'TIMER' | 'DECISION'>('INTERROGATE');
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (step === 'TIMER') {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setStep('DECISION');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      
      {step === 'INTERROGATE' && (
        <div className="text-center space-y-6 max-w-sm w-full">
          <ShieldAlert className="w-20 h-20 text-rose-500 mx-auto animate-pulse" />
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Cek Niatmu</h2>
            <div className="bg-surface border border-slate-700 p-4 rounded-xl">
                <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Demi Target:</p>
                <p className="text-lg font-bold text-primary">"{settings.lifeAnchor || 'Masa Depan'}"</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
              {/* Option 1: Impulse Buy -> Timer */}
              <button 
                onClick={() => setStep('TIMER')}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl border border-slate-600 flex items-center gap-3 transition-colors group"
              >
                <ShoppingBag className="text-rose-400 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                    <p className="font-bold text-sm">Mau Belanja / Jajan</p>
                    <p className="text-[10px] text-slate-400">Aktifkan Timer Penundaan (10s)</p>
                </div>
              </button>

              {/* Option 2: Needs/Income -> Bypass */}
              <button 
                onClick={onProceed}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl border border-slate-600 flex items-center gap-3 transition-colors group"
              >
                <Wallet className="text-emerald-400 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                    <p className="font-bold text-sm">Kebutuhan Wajib / Pemasukan</p>
                    <p className="text-[10px] text-slate-400">Bayar tagihan, makan pokok, gaji</p>
                </div>
              </button>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button 
                onClick={onCancel}
                className="w-full py-3 text-slate-500 hover:text-rose-400 text-sm font-medium transition-colors"
            >
                Batal (Saya Sadar & Hemat Uang)
            </button>
          </div>
        </div>
      )}

      {step === 'TIMER' && (
        <div className="text-center space-y-8">
            <div className="relative">
                <Timer className="w-32 h-32 text-warning mx-auto animate-spin-slow" />
                <span className="absolute inset-0 flex items-center justify-center text-4xl font-black text-white">
                    {timeLeft}
                </span>
            </div>
            <h2 className="text-xl text-slate-300">Tahan...</h2>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">Biarkan logika mengambil alih dopamin.</p>
        </div>
      )}

      {step === 'DECISION' && (
        <div className="text-center space-y-6 max-w-sm animate-in zoom-in duration-300 w-full">
           <h2 className="text-2xl font-bold text-white">Masih Mau Beli?</h2>
           <p className="text-slate-400 text-sm">Keputusan ada di tanganmu.</p>
           
           <button 
            onClick={onCancel}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20"
          >
            <CheckCircle2 />
            Gak Jadi (Saya Hemat)
          </button>

          <button 
            onClick={onProceed}
            className="w-full bg-transparent border-2 border-slate-700 text-slate-400 font-bold py-4 rounded-xl hover:text-white hover:border-slate-500 transition-colors"
          >
            Tetap Beli (Saya Keras Kepala)
          </button>
        </div>
      )}
    </div>
  );
};

export default PreSpending;