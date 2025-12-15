
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, EXCLUDED_FROM_BALANCE_CATEGORIES, Transaction } from '../types';
import { Card, Button, Input, Select, Badge } from '../components/Shared';
import { Plus, Trash2, AlertTriangle, Download, ChevronLeft, ChevronRight, CheckSquare, Calendar, Settings, FileText, ChevronDown, Info, Edit2, Save, X } from 'lucide-react';

export const ExpensesView: React.FC = () => {
  const { data, addTransaction, deleteTransaction, updateTransaction, exportDataCSV } = useApp();
  
  // Transaction Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState(''); // New: For "Others" free text
  const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Tax Relief Extended State
  const [isTaxRelief, setIsTaxRelief] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [hasEInvoice, setHasEInvoice] = useState(false);

  // Cycle Mode State
  const [cycleMode, setCycleMode] = useState<'fiscal' | 'custom'>('fiscal');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  
  // Default Fiscal Month State (only relevant if mode is 'fiscal')
  const getDefaultFiscalMonth = () => {
    const today = new Date();
    if (today.getDate() >= 27) {
      today.setMonth(today.getMonth() + 1);
    }
    return today.toISOString().slice(0, 7); // YYYY-MM
  };
  const [viewMonth, setViewMonth] = useState(getDefaultFiscalMonth());

  // Helper to calculate fiscal range from viewMonth
  const getFiscalRange = (monthStr: string) => {
      const [year, month] = monthStr.split('-').map(Number);
      const start = new Date(year, month - 2, 27); 
      const end = new Date(year, month - 1, 26);
      return { 
          start: start.toISOString().split('T')[0], 
          end: end.toISOString().split('T')[0] 
      };
  };

  // Update category options when type changes
  useEffect(() => {
      // Only reset if not editing (or if editing but type mismatches which shouldn't happen usually)
      if (!editingId) {
          setCategory(type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
          setCustomCategory('');
          if (type === 'income') setIsTaxRelief(false);
      }
  }, [type, editingId]);

  // Handle Default Amounts for specific recording-only income categories
  // & PCB Logic
  useEffect(() => {
      if (category === "Mobile phone allowances" && !amount) {
          setAmount("150");
      } else if (category === "Transportation allowance" && !amount) {
          setAmount("2000");
      } else if (category === "PCB") {
          // PCB specific logic: Auto check Tax Relief (for sync) and it is Excluded (handled in submit)
          setIsTaxRelief(true);
      }
  }, [category]);

  // Handle Cycle Mode Toggle
  const toggleCycleMode = (mode: 'fiscal' | 'custom') => {
      setCycleMode(mode);
      if (mode === 'custom') {
          // When switching to custom, pre-fill with current fiscal range to avoid empty state jump
          const currentFiscal = getFiscalRange(viewMonth);
          setCustomRange(currentFiscal);
      }
      // When switching to fiscal, viewMonth is already maintained state, so it's fine.
  };

  // Calculate Active Date Range
  const cycleRange = useMemo(() => {
    if (cycleMode === 'custom') {
        return { start: customRange.start, end: customRange.end };
    }
    return getFiscalRange(viewMonth);
  }, [viewMonth, cycleMode, customRange]);

  // Helper for human readable range
  const formatRange = (range: {start: string, end: string}) => {
    if (!range.start || !range.end) return "Select Date Range";
    const s = new Date(range.start);
    const e = new Date(range.end);
    return `${s.toLocaleDateString(undefined, {month:'short', day:'numeric'})} - ${e.toLocaleDateString(undefined, {month:'short', day:'numeric', year: '2-digit'})}`;
  };

  const filteredTransactions = useMemo(() => {
    if (!cycleRange.start || !cycleRange.end) return [];
    return data.transactions.filter(t => t.date >= cycleRange.start && t.date <= cycleRange.end);
  }, [data.transactions, cycleRange]);

  const monthlyStats = useMemo(() => {
    // Only calculate using actual transactions (not excluded ones)
    const activeTrans = filteredTransactions.filter(t => !t.isExcludedFromBalance);
    const income = activeTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = activeTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const expenseRatio = monthlyStats.income > 0 ? (monthlyStats.expense / monthlyStats.income) : 0;
  const isWarning = expenseRatio >= 0.8;

  const resetForm = () => {
      setEditingId(null);
      setAmount('');
      setDescription('');
      setCategory(type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
      setCustomCategory('');
      setIsTaxRelief(false);
      setReceiptNumber('');
      setHasEInvoice(false);
      setInputDate(new Date().toISOString().split('T')[0]);
  };

  const handleEdit = (t: Transaction) => {
      setEditingId(t.id);
      setType(t.type);
      
      const isStandard = (t.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).includes(t.category);
      if (isStandard && t.category !== 'Others') {
          setCategory(t.category);
          setCustomCategory('');
      } else {
          setCategory('Others');
          setCustomCategory(t.category);
      }

      setAmount(t.amount.toString());
      setDescription(t.description);
      setInputDate(t.date);
      setIsTaxRelief(t.isTaxRelief || false);
      setReceiptNumber(t.receiptNumber || '');
      setHasEInvoice(t.hasEInvoice || false);
      
      // Scroll to top to see form
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    
    // Determine final category name
    const finalCategory = (category === 'Others' && customCategory.trim()) ? customCategory.trim() : category;

    // Check if recording only (PCB is now in this list)
    const isExcluded = EXCLUDED_FROM_BALANCE_CATEGORIES.includes(finalCategory);

    const payload: Transaction = {
      id: editingId || Date.now().toString(),
      date: inputDate,
      description: description || finalCategory, 
      amount: parseFloat(amount),
      category: finalCategory,
      type,
      isTaxRelief: type === 'expense' ? isTaxRelief : false,
      isExcludedFromBalance: isExcluded,
      receiptNumber: (type === 'expense' && isTaxRelief) ? receiptNumber : undefined,
      hasEInvoice: (type === 'expense' && isTaxRelief) ? hasEInvoice : undefined
    };

    if (editingId) {
        updateTransaction(payload);
    } else {
        addTransaction(payload);
    }
    
    resetForm();
  };

  const handleDownload = () => {
      const csv = exportDataCSV('expenses');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses_backup_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
  }

  const changeViewMonth = (delta: number) => {
      if (cycleMode === 'custom') return;
      const [y, m] = viewMonth.split('-').map(Number);
      const newDate = new Date(y, m - 1 + delta, 1);
      setViewMonth(newDate.toISOString().slice(0, 7));
  };

  const categoryOptions = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  // Dropdown Helpers
  const [selectedYearStr, selectedMonthStr] = viewMonth.split('-');
  const MONTH_NAMES = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <button onClick={handleDownload} className="p-2 bg-gray-100 rounded-full text-gray-600">
            <Download size={20} />
        </button>
      </div>

      {/* Cycle Selector */}
      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                 <button 
                    onClick={() => toggleCycleMode('fiscal')}
                    className={`text-xs px-3 py-1.5 rounded-lg border ${cycleMode === 'fiscal' ? 'bg-ios-blue text-white border-ios-blue' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                 >
                    Fiscal Cycle
                 </button>
                 <button 
                    onClick={() => toggleCycleMode('custom')}
                    className={`text-xs px-3 py-1.5 rounded-lg border ${cycleMode === 'custom' ? 'bg-ios-blue text-white border-ios-blue' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                 >
                    Manual Range
                 </button>
            </div>
            {cycleMode === 'fiscal' && (
                 <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">27th - 26th</span>
            )}
        </div>

        {cycleMode === 'fiscal' ? (
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-1 gap-2">
                <button onClick={() => changeViewMonth(-1)} className="p-2 hover:bg-white rounded-md text-gray-500 flex-shrink-0"><ChevronLeft size={20}/></button>
                
                {/* Dropdowns for Month and Year */}
                <div className="flex gap-2 flex-1 justify-center">
                    <div className="relative flex-1 max-w-[140px]">
                        <select 
                            value={selectedMonthStr} 
                            onChange={e => setViewMonth(`${selectedYearStr}-${e.target.value}`)}
                            className="w-full appearance-none bg-transparent text-gray-800 font-bold text-sm py-2 pl-2 pr-6 text-center focus:outline-none cursor-pointer"
                        >
                            {MONTH_NAMES.map((m, i) => {
                                const val = (i + 1).toString().padStart(2, '0');
                                return <option key={val} value={val}>{m}</option>
                            })}
                        </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-gray-500">
                            <ChevronDown size={12}/>
                        </div>
                    </div>
                    <div className="relative w-20">
                         <select 
                            value={selectedYearStr} 
                            onChange={e => setViewMonth(`${e.target.value}-${selectedMonthStr}`)}
                            className="w-full appearance-none bg-transparent text-gray-800 font-bold text-sm py-2 pl-2 pr-6 text-center focus:outline-none cursor-pointer"
                        >
                            {Array.from({length: 10}, (_, i) => {
                                const y = new Date().getFullYear() - 2 + i;
                                return <option key={y} value={y}>{y}</option>
                            })}
                        </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-gray-500">
                            <ChevronDown size={12}/>
                        </div>
                    </div>
                </div>

                <button onClick={() => changeViewMonth(1)} className="p-2 hover:bg-white rounded-md text-gray-500 flex-shrink-0"><ChevronRight size={20}/></button>
            </div>
        ) : (
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">From</label>
                    <input type="date" value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} className="w-full text-xs bg-gray-50 border border-gray-200 rounded p-2"/>
                </div>
                <div>
                    <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">To</label>
                    <input type="date" value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} className="w-full text-xs bg-gray-50 border border-gray-200 rounded p-2"/>
                </div>
            </div>
        )}
        
        <div className="text-center border-t border-gray-100 pt-2">
             <span className="text-xs text-gray-500 font-medium">Active Range: {formatRange(cycleRange)}</span>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-ios-bg to-white">
        <div className="grid grid-cols-3 gap-4 text-center">
            <div>
                <p className="text-xs text-gray-500 uppercase">Net Income</p>
                <p className="text-lg font-bold text-green-600">+{monthlyStats.income.toFixed(2)}</p>
            </div>
            <div>
                <p className="text-xs text-gray-500 uppercase">Expense</p>
                <p className="text-lg font-bold text-red-600">-{monthlyStats.expense.toFixed(2)}</p>
            </div>
            <div>
                <p className="text-xs text-gray-500 uppercase">Balance</p>
                <p className={`text-lg font-bold ${monthlyStats.balance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                    {monthlyStats.balance.toFixed(2)}
                </p>
            </div>
        </div>
        {isWarning && (
            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2 text-orange-700 text-sm">
                <AlertTriangle size={16} />
                <span>Warning: Expenses have exceeded 80% of net income!</span>
            </div>
        )}
      </Card>

      {/* Input Form */}
      <Card title={editingId ? "Edit Transaction" : "New Transaction"}>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
                <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === 'expense' ? 'bg-red-100 text-red-700 ring-2 ring-red-500 ring-offset-1' : 'bg-gray-50 text-gray-600'}`}>Expense</button>
                <button type="button" onClick={() => setType('income')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === 'income' ? 'bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-1' : 'bg-gray-50 text-gray-600'}`}>Income</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date</label>
                   <input 
                      type="date" 
                      value={inputDate} 
                      onChange={e => setInputDate(e.target.value)} 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-ios-blue focus:ring-1 focus:ring-ios-blue"
                      required
                   />
                </div>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} label="Amount" placeholder="0.00" required />
            </div>
            <Input value={description} onChange={e => setDescription(e.target.value)} label="Description" placeholder={type === 'income' ? 'e.g. Salary' : 'e.g. Lunch'} />
            
            <div>
                <Select value={category} onChange={e => setCategory(e.target.value)} label="Category">
                    {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
                {category === 'Others' && (
                    <div className="mt-2 animate-fadeIn">
                        <Input 
                            value={customCategory} 
                            onChange={e => setCustomCategory(e.target.value)} 
                            placeholder="Enter custom category name..."
                            autoFocus
                        />
                    </div>
                )}
            </div>

            {(EXCLUDED_FROM_BALANCE_CATEGORIES.includes(category) || category === 'PCB') && (
                <div className="bg-blue-50 p-2 rounded text-xs text-blue-700 flex items-start gap-2">
                    <Info size={14} className="mt-0.5 flex-shrink-0"/>
                    <span>This item is for <strong>recording only</strong>. It will be synced to Stats/Tax but will NOT affect your current wallet balance.</span>
                </div>
            )}

            {type === 'expense' && (
              <div className="bg-gray-50 p-3 rounded-lg space-y-3 border border-gray-100">
                  <div className="flex items-center gap-2">
                     <input 
                        type="checkbox" 
                        id="taxRelief" 
                        checked={isTaxRelief} 
                        onChange={e => setIsTaxRelief(e.target.checked)}
                        className="w-5 h-5 rounded text-ios-blue focus:ring-ios-blue border-gray-300"
                     />
                     <label htmlFor="taxRelief" className="text-sm font-medium text-gray-700 select-none">Eligible for Tax Relief / Tax Info</label>
                  </div>
                  
                  {isTaxRelief && (
                      <div className="pl-7 space-y-3 animate-fadeIn">
                          <Input 
                            label="Receipt #" 
                            value={receiptNumber} 
                            onChange={e => setReceiptNumber(e.target.value)} 
                            placeholder="Optional"
                            className="bg-white"
                          />
                          <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    checked={hasEInvoice} 
                                    onChange={e => setHasEInvoice(e.target.checked)} 
                                    id="inv" 
                                    className="w-4 h-4 rounded text-ios-blue"
                                />
                                <label htmlFor="inv" className="text-xs text-gray-600">E-Invoice Obtained</label>
                          </div>
                      </div>
                  )}
              </div>
            )}

            <div className="flex gap-2">
                {editingId && (
                    <Button type="button" variant="secondary" onClick={resetForm} className="flex-1">Cancel</Button>
                )}
                <Button type="submit" className="flex-1 flex items-center justify-center gap-2">
                    {editingId ? <Save size={18}/> : <Plus size={18} />} 
                    {editingId ? "Update Transaction" : "Add Transaction"}
                </Button>
            </div>
        </form>
      </Card>

      {/* Recent Transactions List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-700 ml-1">History ({formatRange(cycleRange)})</h3>
        {filteredTransactions
            .sort((a,b) => b.date.localeCompare(a.date))
            .map(t => (
            <div key={t.id} className={`bg-white p-4 rounded-xl shadow-sm border ${t.isExcludedFromBalance ? 'border-dashed border-gray-300 bg-gray-50/50' : 'border-gray-100'} flex justify-between items-center group`}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${t.isExcludedFromBalance ? 'bg-gray-200 text-gray-500' : t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium truncate ${t.isExcludedFromBalance ? 'text-gray-500' : 'text-gray-900'}`}>{t.description}</p>
                          {t.isTaxRelief && <Badge color="blue">Tax</Badge>}
                          {t.isExcludedFromBalance && <span className="text-[9px] uppercase font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">Info Only</span>}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{t.category} • {t.date}</p>
                        {t.isTaxRelief && (t.receiptNumber || t.hasEInvoice) && (
                            <p className="text-[10px] text-gray-400 mt-0.5 flex gap-2">
                                {t.receiptNumber && <span>Ref: {t.receiptNumber}</span>}
                                {t.hasEInvoice && <span className="text-green-600 flex items-center gap-0.5"><FileText size={8}/> E-Inv</span>}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`font-semibold ${t.isExcludedFromBalance ? 'text-gray-400' : t.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                        {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(2)}
                    </span>
                    <div className="flex gap-1">
                        <button onClick={() => handleEdit(t)} className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors">
                            <Edit2 size={16} />
                        </button>
                        <button onClick={() => deleteTransaction(t.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>
        ))}
        {filteredTransactions.length === 0 && (
            <p className="text-center text-gray-400 py-8">No transactions for this period.</p>
        )}
      </div>
    </div>
  );
};
