import React, { useState, useEffect, useRef } from 'react';
import { Transaction, UserSettings, TransactionType } from './types';
import * as Storage from './services/storageService';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import Analysis from './components/Analysis';
import PreSpending from './components/PreSpending';
import Reckoning from './components/Reckoning';
import TargetsView from './components/TargetsView';
import { LayoutDashboard, PlusCircle, PieChart, Settings, AlertOctagon, Target as TargetIcon, Download, Upload, AlertTriangle, FileText } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

enum View {
  DASHBOARD = 'DASHBOARD',
  ANALYSIS = 'ANALYSIS',
  TARGETS = 'TARGETS',
}

const App: React.FC = () => {
  // LAZY INITIALIZATION: Reads from storage immediately on mount to prevent empty state flash
  const [transactions, setTransactions] = useState<Transaction[]>(() => Storage.getTransactions());
  const [settings, setSettings] = useState<UserSettings>(() => Storage.getSettings());
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreSpendingOpen, setIsPreSpendingOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isReckoningOpen, setIsReckoningOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Data function (still useful for updates)
  const loadTransactions = () => {
      setTransactions(Storage.getTransactions());
  };

  useEffect(() => {
    // We already lazy loaded, but we check if onboarding is needed
    if (settings.monthlyBudget === 0 || !settings.lifeAnchor) {
        setShowSettingsModal(true);
    }
  }, []);

  const handleSaveTransaction = (t: Transaction) => {
    let updated: Transaction[];
    if (editingTransaction) {
        updated = Storage.updateTransaction(t);
    } else {
        updated = Storage.saveTransaction(t);
    }
    setTransactions(updated);
    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (id: string) => {
      const { transactions: updated, shameIncremented } = Storage.deleteTransaction(id);
      setTransactions(updated);
      
      if (shameIncremented) {
          // Refresh settings to reflect new shame count
          setSettings(Storage.getSettings());
      }

      setIsFormOpen(false);
      setEditingTransaction(null);
  };

  const handleUpdateSettings = (e: React.FormEvent) => {
    e.preventDefault();
    Storage.saveSettings(settings);
    setShowSettingsModal(false);
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip non-digits to get raw number
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw ? parseInt(raw, 10) : 0;
    setSettings({ ...settings, monthlyBudget: num });
  };

  const formatNumber = (num: number) => {
      return new Intl.NumberFormat('id-ID').format(num);
  };

  const startTransactionFlow = () => {
      // The Friction Layer: Ask before showing the form
      setEditingTransaction(null);
      setIsPreSpendingOpen(true);
  };

  const handlePreSpendingProceed = () => {
      setIsPreSpendingOpen(false);
      setIsFormOpen(true);
  };

  const openEditModal = (t: Transaction) => {
      setEditingTransaction(t);
      setIsFormOpen(true);
  };

  // --- PDF EXPORT LOGIC ---
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num);

    // 1. Header
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text("KLARITY - LAPORAN KEUANGAN BRUTAL", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 26);
    doc.text(`Demi: ${settings.lifeAnchor || "Masa Depan"}`, 14, 31);

    // 2. Summary
    const totalIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Pemasukan: ${formatIDR(totalIncome)}`, 14, 45);
    doc.text(`Total Pengeluaran: ${formatIDR(totalExpense)}`, 14, 51);
    doc.setFontSize(12);
    doc.text(`Sisa Saldo (Cash): ${formatIDR(balance)}`, 14, 58);

    // 3. Table
    const tableData = transactions.map(t => [
        t.date,
        t.category,
        t.type === TransactionType.INCOME ? `+${formatIDR(t.amount)}` : `-${formatIDR(t.amount)}`,
        t.type === TransactionType.EXPENSE ? (t.emotionalTag || "-") : "-",
        t.reason || "-"
    ]);

    autoTable(doc, {
        head: [['Tanggal', 'Kategori', 'Nominal', 'Emosi', 'Alasan']],
        body: tableData,
        startY: 65,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] }, // Slate 900
        styles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 25 }, // Date
            1: { cellWidth: 30 }, // Cat
            2: { cellWidth: 35, halign: 'right' }, // Amount
            3: { cellWidth: 20 }, // Emotion
            4: { cellWidth: 'auto' } // Reason
        }
    });

    doc.save(`Klarity_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // --- BACKUP & RESTORE LOGIC ---
  
  const handleDownloadBackup = () => {
    try {
        const data = Storage.getFullBackup();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `klarity_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);
    } catch (e) {
        alert("Gagal membuat file backup. Coba lagi.");
        console.error(e);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
    } else {
        alert("Error internal: File input tidak ditemukan. Silakan refresh halaman.");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target?.result as string;
            if (!content) throw new Error("File kosong");

            const json = JSON.parse(content);
            const isValid = (json.transactions && Array.isArray(json.transactions)) || (json.settings);

            if (!isValid) {
                alert("File ini tidak terbaca sebagai backup Klarity yang valid.");
                return;
            }

            if (window.confirm("PERINGATAN: Data saat ini akan DITIMPA total dengan data dari backup. Lanjutkan?")) {
                const success = Storage.restoreBackup(json);
                if (success) {
                    alert("Data berhasil dipulihkan! Aplikasi akan dimuat ulang...");
                    window.location.reload();
                } else {
                    alert("Gagal memproses data. Struktur file mungkin rusak.");
                }
            }
        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan saat membaca file. Pastikan file adalah .json yang valid.");
        }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-screen w-full bg-background text-slate-50 font-sans selection:bg-primary selection:text-slate-900 flex flex-col overflow-hidden">
      
      {/* Top Bar - Fixed & Safe Area Aware */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-md border-b border-white/5 pt-safe px-6 pb-3 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-xl shadow-glow flex items-center justify-center">
                <span className="font-bold text-slate-900 text-xl">K</span>
            </div>
            <span className="font-bold tracking-tight text-lg text-white">Klarity</span>
        </div>
        <button 
            onClick={() => setShowSettingsModal(true)} 
            className="p-2.5 rounded-full bg-surface border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
        >
            <Settings size={22} />
        </button>
      </header>

      {/* Main Content Area - Scrollable */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pt-24 pb-32 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full no-scrollbar">
        {currentView === View.DASHBOARD && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <Dashboard 
                transactions={transactions} 
                settings={settings} 
                onEdit={openEditModal}
            />
          </div>
        )}
        {currentView === View.TARGETS && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <TargetsView onUpdateTransactions={loadTransactions} />
            </div>
        )}
        {currentView === View.ANALYSIS && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <Analysis 
                transactions={transactions} 
                monthlyBudget={settings.monthlyBudget} 
                onTriggerReckoning={() => setIsReckoningOpen(true)}
             />
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) - Positioned above Nav */}
      <div className="fixed bottom-24 right-6 z-40 bottom-safe mb-4">
        <button
          onClick={startTransactionFlow}
          className="bg-primary hover:bg-sky-300 text-slate-900 rounded-2xl p-4 shadow-xl shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 group relative border-2 border-white/10"
        >
            <span className="absolute -top-10 right-0 bg-slate-800 border border-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                Catat Transaksi
            </span>
            <AlertOctagon size={32} strokeWidth={2.5} />
        </button>
      </div>

      {/* Bottom Navigation - Safe Area Aware & Clearer Contrast */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#162032]/95 backdrop-blur-xl border-t border-white/10 pb-safe z-40 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.5)]">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          <button 
            onClick={() => setCurrentView(View.DASHBOARD)}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all active:scale-90 ${currentView === View.DASHBOARD ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <LayoutDashboard size={24} strokeWidth={currentView === View.DASHBOARD ? 2.5 : 2} />
            <span className={`text-[10px] font-bold tracking-wide ${currentView === View.DASHBOARD ? 'opacity-100' : 'opacity-70'}`}>Home</span>
          </button>
          
          <button 
            onClick={() => setCurrentView(View.TARGETS)}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all active:scale-90 ${currentView === View.TARGETS ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <TargetIcon size={24} strokeWidth={currentView === View.TARGETS ? 2.5 : 2} />
            <span className={`text-[10px] font-bold tracking-wide ${currentView === View.TARGETS ? 'opacity-100' : 'opacity-70'}`}>Tujuan</span>
          </button>

          <button 
            onClick={() => setCurrentView(View.ANALYSIS)}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all active:scale-90 ${currentView === View.ANALYSIS ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <PieChart size={24} strokeWidth={currentView === View.ANALYSIS ? 2.5 : 2} />
            <span className={`text-[10px] font-bold tracking-wide ${currentView === View.ANALYSIS ? 'opacity-100' : 'opacity-70'}`}>Analisis</span>
          </button>
        </div>
      </nav>

      {/* MODALS */}

      {isPreSpendingOpen && (
          <PreSpending 
            settings={settings}
            onCancel={() => setIsPreSpendingOpen(false)}
            onProceed={handlePreSpendingProceed}
          />
      )}

      {isFormOpen && (
        <TransactionForm 
          initialData={editingTransaction}
          onSave={handleSaveTransaction} 
          onDelete={handleDeleteTransaction}
          onClose={() => setIsFormOpen(false)} 
        />
      )}

      {/* Settings Modal - Responsive Overlay */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface w-full max-w-sm max-h-[90vh] flex flex-col rounded-3xl border border-slate-600 shadow-2xl animate-in zoom-in-95 duration-200">
                
                {/* Scrollable Content */}
                <div className="overflow-y-auto p-6 space-y-6 no-scrollbar">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                             <Settings size={20} className="text-primary"/>
                             Sumpah Finansial
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">Kami tidak bisa membantumu jika kamu tidak jujur pada diri sendiri.</p>
                    </div>
                    
                    <form id="settingsForm" onSubmit={handleUpdateSettings} className="space-y-4">
                        <div>
                            <label className="block text-xs uppercase text-slate-400 mb-1 font-bold">Life Anchor</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                value={settings.lifeAnchor}
                                onChange={(e) => setSettings({...settings, lifeAnchor: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-slate-400 mb-1 font-bold">Budget Bulanan (Rp)</label>
                            <input 
                                type="text" 
                                inputMode="numeric"
                                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none font-bold tracking-wide text-lg"
                                value={formatNumber(settings.monthlyBudget)}
                                onChange={handleBudgetChange}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-slate-400 mb-1 font-bold">Tanggal Gajian (1-31)</label>
                            <input 
                                type="number" 
                                max={31} min={1}
                                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                value={settings.paydayDayOfMonth}
                                onChange={(e) => setSettings({...settings, paydayDayOfMonth: Number(e.target.value)})}
                                required
                            />
                        </div>
                    </form>

                    <div className="pt-4 border-t border-slate-700 space-y-3">
                        <button 
                            onClick={handleExportPDF}
                            className="w-full flex items-center justify-center p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors gap-3 active:scale-95"
                        >
                            <FileText size={20} className="text-white"/>
                            <span className="text-sm font-bold text-white">Download Laporan PDF</span>
                        </button>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={handleDownloadBackup}
                                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800 border border-slate-600 active:bg-slate-700"
                            >
                                <Download size={20} className="text-primary mb-1"/>
                                <span className="text-[10px] font-bold">Backup Data</span>
                            </button>
                            <button 
                                onClick={handleImportClick}
                                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800 border border-slate-600 active:bg-slate-700"
                            >
                                <Upload size={20} className="text-emerald-400 mb-1"/>
                                <span className="text-[10px] font-bold">Restore Data</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Fixed */}
                <div className="p-4 border-t border-slate-700 bg-surface rounded-b-3xl flex flex-col gap-3">
                    <button type="submit" form="settingsForm" className="w-full bg-white text-slate-900 font-bold py-3.5 rounded-xl hover:bg-slate-200 active:scale-[0.98] transition-all text-sm uppercase tracking-wide">
                        Simpan Perubahan
                    </button>
                    <button onClick={() => setShowSettingsModal(false)} className="text-xs text-slate-400 py-2">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
      )}

      {isReckoningOpen && (
          <Reckoning 
            transactions={transactions} 
            settings={settings} 
            onClose={() => setIsReckoningOpen(false)}
          />
      )}

      {/* 
         HIDDEN FILE INPUT
         Using opacity:0 instead of display:none to ensure Android WebViews can trigger it
      */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        style={{ opacity: 0, position: 'absolute', zIndex: -1, width: 1, height: 1 }}
      />

    </div>
  );
};

export default App;