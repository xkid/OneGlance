
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SIBLINGS, ContributionDetail, PARENT_EXPENSE_CATEGORIES, ParentExpenseDetail, SHARERS_LIST } from '../types';
import { Card, Button, Input, Select, Badge } from '../components/Shared';
import { Save, ChevronLeft, ChevronRight, Download, Plus, Trash2, Wallet, ArrowRight, ArrowDown, Users, Edit2, Calendar, Filter, X } from 'lucide-react';

export const ParentCareView: React.FC = () => {
  const { data, updateParentLog, exportDataCSV, addTransaction } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Expense Form State
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseCategory, setExpenseCategory] = useState(PARENT_EXPENSE_CATEGORIES[0]);
  const [customExpenseCategory, setCustomExpenseCategory] = useState(''); // Free text for 'Others'
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  
  // Shared With Checkbox Logic
  const [selectedSharers, setSelectedSharers] = useState<string[]>([]);
  // Multiple Custom Sharers
  const [customSharers, setCustomSharers] = useState<string[]>([]);
  const [newSharerInput, setNewSharerInput] = useState('');
  
  const [deductFrom, setDeductFrom] = useState('General Balance');
  const [deductShareOnly, setDeductShareOnly] = useState(false);
  
  // Contribution Form State
  const [contribDate, setContribDate] = useState(new Date().toISOString().split('T')[0]);
  const [addSibName, setAddSibName] = useState('');
  const [addSibSource, setAddSibSource] = useState('');
  const [addSibAmount, setAddSibAmount] = useState('');
  const [editingContribId, setEditingContribId] = useState<string | null>(null);
  
  // Balance View State
  const [isEditingBbfNote, setIsEditingBbfNote] = useState(false);
  const [bbfNotesMap, setBbfNotesMap] = useState<Record<string, string>>({});
  const [accountFilter, setAccountFilter] = useState('All'); // 'All' or specific source name
  
  // Lists State
  const [tempContributions, setTempContributions] = useState<ContributionDetail[]>([]);
  const [tempExpenses, setTempExpenses] = useState<ParentExpenseDetail[]>([]);

  // Maps and Calculations
  const logMap = useMemo(() => {
    const map = new Map();
    data.parentLogs.forEach(l => map.set(l.monthStr, l));
    return map;
  }, [data.parentLogs]);

  const currentLog = logMap.get(selectedMonth);

  // Initialize form when month changes
  useEffect(() => {
    setTempContributions(currentLog?.contributionDetails || []);
    setTempExpenses(currentLog?.expenseDetails || []);
    // Initialize BBF Notes map, falling back to empty object
    setBbfNotesMap(currentLog?.bbfNotes || {});
    // Reset dates to today
    setContribDate(new Date().toISOString().split('T')[0]);
    setExpenseDate(new Date().toISOString().split('T')[0]);
    resetExpenseForm();
    resetContribForm();
  }, [currentLog, selectedMonth]);

  const resetExpenseForm = () => {
      setExpenseAmount('');
      setExpenseNotes('');
      setExpenseCategory(PARENT_EXPENSE_CATEGORIES[0]);
      setCustomExpenseCategory('');
      setSelectedSharers([]);
      setCustomSharers([]);
      setDeductShareOnly(false);
      setEditingExpenseId(null);
  };

  const resetContribForm = () => {
      setAddSibAmount('');
      setAddSibName('');
      setAddSibSource('');
      setEditingContribId(null);
  };

  // Derive unique sources for dropdown (used for both Deduct From and Filter)
  const availableAccounts = useMemo(() => {
      const sources = new Set<string>();
      sources.add('General Balance');
      sources.add('Kah Ho Balance');
      
      // Add sources from history if needed, or just current month input
      tempContributions.forEach(c => {
          if (c.source) sources.add(c.source);
      });
      // Add deduction sources found in expenses
      tempExpenses.forEach(e => {
          if (e.deductFrom) sources.add(e.deductFrom);
      });
      
      return Array.from(sources);
  }, [tempContributions, tempExpenses]);

  // Calculate Balance Brought Forward (from all previous months)
  // Filtered by Account if selected
  const calculateBalance = (targetMonth: string, filterAccount: string) => {
    const sortedLogs = [...data.parentLogs].sort((a, b) => a.monthStr.localeCompare(b.monthStr));
    let balance = 0;
    
    for (const log of sortedLogs) {
        if (log.monthStr < targetMonth) {
            // Filter Contributions
            const validContribs = (log.contributionDetails || []).filter(c => 
                filterAccount === 'All' || 
                (filterAccount === 'General Balance' && !c.source) || 
                c.source === filterAccount
            );
            const monthlyContrib = validContribs.reduce((sum, c) => sum + c.amount, 0);

            // Filter Expenses
            const validExpenses = (log.expenseDetails || []).filter(e => 
                filterAccount === 'All' || 
                (filterAccount === 'General Balance' && !e.deductFrom) || 
                e.deductFrom === filterAccount
            );
            
            const monthlyExpense = validExpenses.reduce((sum, e) => {
                 if (e.deductShareOnly && e.shareCount && e.shareCount > 0) {
                    return sum + (e.amount / e.shareCount);
                 }
                 return sum + e.amount;
            }, 0);

            balance += (monthlyContrib - monthlyExpense);
        }
    }
    return balance;
  };

  const bbf = calculateBalance(selectedMonth, accountFilter);
  
  // Current Note for Display/Edit based on filter
  const currentBbfNote = accountFilter === 'All' ? '' : (bbfNotesMap[accountFilter] || '');

  const filteredContributions = tempContributions.filter(c => 
      accountFilter === 'All' || 
      (accountFilter === 'General Balance' && !c.source) || 
      c.source === accountFilter
  );
  
  const filteredExpenses = tempExpenses.filter(e => 
       accountFilter === 'All' || 
       (accountFilter === 'General Balance' && !e.deductFrom) || 
       e.deductFrom === accountFilter
  );

  const totalContributions = filteredContributions.reduce((sum, c) => sum + c.amount, 0);
  
  const totalExpenses = filteredExpenses.reduce((sum, e) => {
      if (e.deductShareOnly && e.shareCount && e.shareCount > 0) {
          return sum + (e.amount / e.shareCount);
      }
      return sum + e.amount;
  }, 0);

  const balanceCarriedForward = bbf + totalContributions - totalExpenses;

  // Generic Save Helper
  const saveChanges = (newContribs: ContributionDetail[], newExpenses: ParentExpenseDetail[], newBbfNotes: Record<string, string>) => {
      // Recalculate Totals (Global, not filtered)
      const tContrib = newContribs.reduce((sum, c) => sum + c.amount, 0);
      const tExpense = newExpenses.reduce((sum, e) => {
          if (e.deductShareOnly && e.shareCount && e.shareCount > 0) {
              return sum + (e.amount / e.shareCount);
          }
          return sum + e.amount;
      }, 0);
      
      updateParentLog({
          id: currentLog?.id || Date.now().toString(),
          monthStr: selectedMonth,
          contributions: tContrib,
          contributionDetails: newContribs,
          expenses: tExpense,
          expenseDetails: newExpenses,
          notes: '', // Deprecated top level note
          bbfNotes: newBbfNotes
      });
  };

  // --- Contribution Handlers ---
  const handleSaveContribution = () => {
      if (!addSibAmount || !addSibName) return;
      
      const item: ContributionDetail = {
          id: editingContribId || Date.now().toString(),
          date: contribDate,
          name: addSibName,
          amount: parseFloat(addSibAmount),
          source: addSibSource || 'General Balance'
      };

      let newContribs;
      if (editingContribId) {
          newContribs = tempContributions.map(c => c.id === editingContribId ? item : c);
      } else {
          newContribs = [...tempContributions, item];
      }

      setTempContributions(newContribs);
      resetContribForm();
      saveChanges(newContribs, tempExpenses, bbfNotesMap);
  };

  const handleEditContribution = (c: ContributionDetail) => {
      setAddSibName(c.name);
      setAddSibAmount(c.amount.toString());
      setAddSibSource(c.source || 'General Balance');
      setContribDate(c.date || selectedMonth + '-01');
      setEditingContribId(c.id);
  };

  const handleRemoveContribution = (id: string) => {
      const newContribs = tempContributions.filter(c => c.id !== id);
      setTempContributions(newContribs);
      saveChanges(newContribs, tempExpenses, bbfNotesMap);
  };

  // --- Expense Handlers ---
  
  // Calculate Pax Count
  const paxCount = useMemo(() => {
      let count = selectedSharers.length;
      count += customSharers.length;
      return count > 0 ? count : 1;
  }, [selectedSharers, customSharers]);

  const handleToggleSharer = (name: string) => {
      if (selectedSharers.includes(name)) {
          setSelectedSharers(prev => prev.filter(s => s !== name));
      } else {
          setSelectedSharers(prev => [...prev, name]);
      }
  };

  const handleAddCustomSharer = () => {
      if (newSharerInput.trim()) {
          setCustomSharers(prev => [...prev, newSharerInput.trim()]);
          setNewSharerInput('');
      }
  };

  const handleRemoveCustomSharer = (idx: number) => {
      setCustomSharers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveExpense = () => {
      if (!expenseAmount) return;
      
      const finalSharers = [...selectedSharers, ...customSharers];
      const sharerString = finalSharers.join(', ');

      const amountVal = parseFloat(expenseAmount);
      
      // Determine final category (Preset or Free Text)
      const finalCategory = expenseCategory === 'Others' && customExpenseCategory.trim() 
          ? customExpenseCategory.trim() 
          : expenseCategory;

      const item: ParentExpenseDetail = {
          id: editingExpenseId || Date.now().toString(),
          date: expenseDate,
          category: finalCategory,
          amount: amountVal,
          notes: expenseNotes,
          sharedWith: sharerString,
          shareCount: paxCount,
          deductFrom: deductFrom,
          deductShareOnly: deductShareOnly
      };

      // SYNC TO EXPENSES MODULE (Module 1) - Only on create for now to avoid complexity of update sync
      if (!editingExpenseId && selectedSharers.includes("Sau Lai")) {
           // Calculate share amount
           const shareAmt = amountVal / paxCount;
           addTransaction({
               id: 'sync-' + Date.now().toString(),
               date: expenseDate,
               description: `Parent Care: ${finalCategory}`,
               amount: parseFloat(shareAmt.toFixed(2)),
               category: 'Parent care',
               type: 'expense',
               isTaxRelief: true // Sync to Tax Module as well
           });
      }

      let newExpenses;
      if (editingExpenseId) {
          newExpenses = tempExpenses.map(e => e.id === editingExpenseId ? item : e);
      } else {
          newExpenses = [...tempExpenses, item];
      }

      setTempExpenses(newExpenses);
      resetExpenseForm();
      saveChanges(tempContributions, newExpenses, bbfNotesMap);
  };

  const handleEditExpense = (e: ParentExpenseDetail) => {
      // Check if category is in standard list
      if (PARENT_EXPENSE_CATEGORIES.includes(e.category)) {
          setExpenseCategory(e.category);
          setCustomExpenseCategory('');
      } else {
          setExpenseCategory('Others');
          setCustomExpenseCategory(e.category);
      }

      setExpenseDate(e.date || selectedMonth + '-01');
      setExpenseAmount(e.amount.toString());
      setExpenseNotes(e.notes || '');
      setDeductFrom(e.deductFrom || 'General Balance');
      setDeductShareOnly(e.deductShareOnly || false);
      
      // Parse Sharers
      const sharerArr = e.sharedWith ? e.sharedWith.split(', ').filter(Boolean) : [];
      const standardSharers = sharerArr.filter(s => SHARERS_LIST.includes(s));
      const customSharersFound = sharerArr.filter(s => !SHARERS_LIST.includes(s));
      
      setSelectedSharers(standardSharers);
      setCustomSharers(customSharersFound);
      
      setEditingExpenseId(e.id);
  };

  const handleRemoveExpense = (id: string) => {
      const newExpenses = tempExpenses.filter(e => e.id !== id);
      setTempExpenses(newExpenses);
      saveChanges(tempContributions, newExpenses, bbfNotesMap);
  };

  const handleSaveBbfNote = (newVal: string) => {
      if (accountFilter === 'All') return;
      
      const updatedNotes = { ...bbfNotesMap, [accountFilter]: newVal };
      setBbfNotesMap(updatedNotes);
      setIsEditingBbfNote(false);
      saveChanges(tempContributions, tempExpenses, updatedNotes);
  };

  const changeMonth = (delta: number) => {
      const d = new Date(selectedMonth + "-01");
      d.setMonth(d.getMonth() + delta);
      setSelectedMonth(d.toISOString().slice(0, 7));
  };

  const handleDownload = () => {
      const csv = exportDataCSV('parent');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = 'parent_care_data.csv';
      a.click();
  }

  return (
    <div className="space-y-6 pb-24">
       <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Parent Care</h1>
        <button onClick={handleDownload} className="p-2 bg-gray-100 rounded-full text-gray-600">
            <Download size={20} />
        </button>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-between bg-white p-2 rounded-xl shadow-sm border border-gray-100">
        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20}/></button>
        <div className="text-center">
             <span className="font-bold text-lg block">{new Date(selectedMonth + "-01").toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
        </div>
        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={20}/></button>
      </div>

      {/* Main Balance Statement Card */}
      <Card className="bg-white border-2 border-gray-100 overflow-hidden relative">
         <div className="absolute top-0 left-0 w-2 h-full bg-ios-blue"></div>
         <div className="pl-4">
            <div className="flex justify-between items-start mb-2 border-b border-gray-50 pb-2">
                 {/* Account Filter */}
                 <div className="flex items-center gap-2">
                     <Wallet size={16} className="text-gray-400"/>
                     <select 
                        value={accountFilter}
                        onChange={e => {
                            setAccountFilter(e.target.value);
                            setIsEditingBbfNote(false); // Reset edit mode on change
                        }}
                        className="text-sm font-semibold text-gray-700 bg-transparent focus:outline-none"
                     >
                         <option value="All">All Accounts</option>
                         {availableAccounts.map(a => <option key={a} value={a}>{a}</option>)}
                     </select>
                 </div>
            </div>

            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="text-gray-500 text-sm font-medium uppercase tracking-wider block">Balance from Last Month</span>
                    {/* B/F Note Section */}
                    {accountFilter !== 'All' ? (
                        isEditingBbfNote ? (
                            <div className="flex items-center gap-2 mt-1">
                                <input 
                                    defaultValue={currentBbfNote} 
                                    onBlur={(e) => handleSaveBbfNote(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveBbfNote(e.currentTarget.value)}
                                    className="text-xs border-b border-gray-300 focus:outline-none focus:border-ios-blue w-32"
                                    placeholder="Source note..."
                                    autoFocus
                                />
                                <button onMouseDown={(e) => e.preventDefault()} className="text-green-600 text-xs"><Save size={14}/></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 mt-1 cursor-pointer group" onClick={() => setIsEditingBbfNote(true)}>
                                 <span className={`text-xs ${currentBbfNote ? 'text-gray-600' : 'text-gray-400 italic'}`}>
                                     {currentBbfNote || "Add wallet note..."}
                                 </span>
                                 <Edit2 size={10} className="text-gray-300 group-hover:text-gray-500"/>
                            </div>
                        )
                    ) : (
                        <div className="mt-1">
                             <span className="text-[10px] text-gray-300 italic">Select a specific wallet to view/edit notes</span>
                        </div>
                    )}
                </div>
                <span className="text-xl font-bold text-gray-800">{bbf.toFixed(2)}</span>
            </div>
            
            <div className="space-y-2 border-l-2 border-gray-200 pl-4 ml-1 my-2">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-green-600 flex items-center gap-2"><Plus size={14}/> Funds In ({accountFilter === 'All' ? 'Total' : accountFilter})</span>
                    <span className="font-semibold text-green-600">{totalContributions.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-red-500 flex items-center gap-2"><ArrowDown size={14}/> Expenses ({accountFilter === 'All' ? 'Total' : accountFilter})</span>
                    <span className="font-semibold text-red-500">- {totalExpenses.toFixed(2)}</span>
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-end">
                <span className="text-ios-blue font-bold text-sm uppercase">Carried Forward</span>
                <span className="text-3xl font-bold text-ios-blue">{balanceCarriedForward.toFixed(2)}</span>
            </div>
         </div>
      </Card>

      {/* CONTRIBUTIONS SECTION */}
      <Card title={editingContribId ? "Edit Contribution" : "Funds In / Contributions"}>
         <div className={`bg-gray-50 p-4 rounded-xl border ${editingContribId ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-100'} mb-4 space-y-2 transition-all`}>
             <div className="flex items-center justify-between mb-1">
                 <label className="text-[10px] font-semibold text-gray-400 uppercase">Date</label>
                 <input type="date" value={contribDate} onChange={e => setContribDate(e.target.value)} className="text-xs bg-transparent focus:outline-none text-right"/>
             </div>
             <div className="grid grid-cols-2 gap-2">
                 <div>
                     <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                     <input 
                         list="siblings-list"
                         value={addSibName}
                         onChange={e => setAddSibName(e.target.value)}
                         className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-ios-blue focus:ring-1 focus:ring-ios-blue"
                         placeholder="e.g. Kah Ho"
                     />
                     <datalist id="siblings-list">
                         {SIBLINGS.map(s => <option key={s} value={s} />)}
                     </datalist>
                 </div>
                 <div>
                     <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Amount</label>
                     <Input 
                         type="number" 
                         value={addSibAmount} 
                         onChange={e => setAddSibAmount(e.target.value)} 
                         className="mb-0"
                     />
                 </div>
             </div>
             
             <div className="flex gap-2 items-center">
                 <div className="flex-1">
                    <input 
                         list="account-list"
                         value={addSibSource}
                         onChange={e => setAddSibSource(e.target.value)}
                         className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-ios-blue focus:ring-1 focus:ring-ios-blue"
                         placeholder="Source (e.g. Kah Ho Balance)"
                     />
                     <datalist id="account-list">
                         {availableAccounts.map(a => <option key={a} value={a} />)}
                     </datalist>
                 </div>
                 {editingContribId ? (
                     <div className="flex gap-1">
                         <button onClick={handleSaveContribution} className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg shadow-sm"><Save size={20}/></button>
                         <button onClick={resetContribForm} className="bg-gray-200 hover:bg-gray-300 text-gray-600 p-2 rounded-lg"><X size={20}/></button>
                     </div>
                 ) : (
                     <button onClick={handleSaveContribution} className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg shadow-sm transition-colors">
                         <Plus size={20}/>
                     </button>
                 )}
             </div>
         </div>

         <div className="space-y-2">
             {filteredContributions.length === 0 && <p className="text-center text-sm text-gray-400 py-2">No contributions matching filter.</p>}
             {filteredContributions.map(c => (
                 <div key={c.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-sm">
                     <div>
                        <span className="font-medium text-gray-700 block">{c.name}</span>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                             <Calendar size={10}/> {c.date || selectedMonth} • {c.source || 'General'}
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                         <span className="font-bold text-green-600">+{c.amount.toFixed(2)}</span>
                         <button onClick={() => handleEditContribution(c)} className="text-gray-300 hover:text-blue-500 transition-colors"><Edit2 size={16}/></button>
                         <button onClick={() => handleRemoveContribution(c.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                     </div>
                 </div>
             ))}
         </div>
      </Card>

      {/* EXPENSES SECTION */}
      <Card title={editingExpenseId ? "Edit Expense" : "Expenses / Deductions"}>
          <div className={`bg-gray-50 p-4 rounded-xl border ${editingExpenseId ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-100'} mb-4 space-y-3 transition-all`}>
               <div className="flex items-center justify-between">
                   <label className="text-[10px] font-semibold text-gray-400 uppercase">Expense Date</label>
                   <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="text-xs bg-transparent focus:outline-none text-right"/>
               </div>
               
               <div className="grid grid-cols-5 gap-2">
                   <div className="col-span-3">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                        <Select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="mb-0">
                           {PARENT_EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </Select>
                   </div>
                   <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Bill</label>
                        <Input 
                            type="number" 
                            step="0.01"
                            value={expenseAmount} 
                            onChange={e => setExpenseAmount(e.target.value)}
                            placeholder="0.00"
                            className="mb-0"
                        />
                   </div>
               </div>

               {/* Conditional Free Text Input for 'Others' */}
               {expenseCategory === 'Others' && (
                   <div className="animate-fadeIn">
                       <label className="block text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-1">Specify Details</label>
                       <Input 
                           value={customExpenseCategory}
                           onChange={e => setCustomExpenseCategory(e.target.value)}
                           placeholder="e.g. Plumber repair"
                           className="mb-0 border-blue-200 focus:border-blue-400"
                       />
                   </div>
               )}
               
               {/* Shared Expense Inputs Checkboxes */}
               <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Shared With ({paxCount} Pax)</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        {SHARERS_LIST.map(sharer => (
                             <label key={sharer} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                 <input 
                                     type="checkbox" 
                                     checked={selectedSharers.includes(sharer)}
                                     onChange={() => handleToggleSharer(sharer)}
                                     className="w-4 h-4 text-ios-blue rounded border-gray-300"
                                 />
                                 {sharer}
                             </label>
                        ))}
                    </div>
                    {/* Dynamic List for 'Other' Sharers */}
                    <div className="space-y-2 mt-2">
                        {customSharers.map((name, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded">
                                <span className="text-xs text-gray-700">{name}</span>
                                <button onClick={() => handleRemoveCustomSharer(idx)} className="text-gray-400 hover:text-red-500"><X size={12}/></button>
                            </div>
                        ))}
                        <div className="flex gap-2">
                            <input 
                                value={newSharerInput}
                                onChange={e => setNewSharerInput(e.target.value)}
                                placeholder="Add other name..."
                                className="flex-1 text-xs border-b border-gray-200 focus:outline-none focus:border-ios-blue py-1"
                                onKeyDown={e => e.key === 'Enter' && handleAddCustomSharer()}
                            />
                            <button onClick={handleAddCustomSharer} className="text-blue-500 text-xs font-medium">Add</button>
                        </div>
                    </div>

                    {!editingExpenseId && selectedSharers.includes("Sau Lai") && (
                         <p className="text-[10px] text-blue-500 mt-2 flex items-center gap-1">
                             <Filter size={10}/> Will sync {((parseFloat(expenseAmount) || 0) / paxCount).toFixed(2)} to Expenses Module
                         </p>
                    )}
               </div>
               
               {/* Deduction Source & Logic */}
               <div className="space-y-2 pt-2 border-t border-gray-200">
                   <div>
                       <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Deduct From (Source)</label>
                       <div className="flex gap-2">
                           <Select value={deductFrom} onChange={e => setDeductFrom(e.target.value)} className="mb-0 text-sm flex-1">
                               {availableAccounts.map(s => <option key={s} value={s}>{s}</option>)}
                           </Select>
                       </div>
                       <input 
                            list="deduct-list"
                            value={deductFrom}
                            onChange={e => setDeductFrom(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-ios-blue focus:ring-1 focus:ring-ios-blue text-sm"
                            placeholder="Type custom source or select..."
                        />
                        <datalist id="deduct-list">
                             {availableAccounts.map(s => <option key={s} value={s} />)}
                        </datalist>
                   </div>
                   {paxCount > 1 && (
                       <div className="flex items-center gap-2">
                           <input 
                               type="checkbox" 
                               id="deductShare" 
                               checked={deductShareOnly} 
                               onChange={e => setDeductShareOnly(e.target.checked)}
                               className="w-4 h-4 text-ios-blue rounded border-gray-300"
                           />
                           <label htmlFor="deductShare" className="text-xs text-gray-600 select-none">
                               Deduct only my share from balance? ({((parseFloat(expenseAmount) || 0) / paxCount).toFixed(2)})
                           </label>
                       </div>
                   )}
               </div>

               <Input 
                    value={expenseNotes} 
                    onChange={e => setExpenseNotes(e.target.value)} 
                    placeholder="Optional remarks (e.g. November Nursing fees)"
                    className="mb-0"
               />
               <div className="flex gap-2">
                   {editingExpenseId && (
                       <Button variant="secondary" onClick={resetExpenseForm} className="flex-1">Cancel</Button>
                   )}
                   <Button onClick={handleSaveExpense} className="flex-1 flex justify-center items-center gap-2">
                       <Save size={18}/> {editingExpenseId ? "Update Expense" : "Add Expense"}
                   </Button>
               </div>
          </div>

          <div className="space-y-2">
               {filteredExpenses.length === 0 && <p className="text-center text-gray-400 text-sm">No expenses matching filter.</p>}
               {filteredExpenses.map(e => {
                   const perPax = e.shareCount && e.shareCount > 1 ? e.amount / e.shareCount : e.amount;
                   const deductedAmount = e.deductShareOnly ? perPax : e.amount;

                   return (
                       <div key={e.id} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-sm">
                           <div className="flex justify-between items-start">
                               <div>
                                   <div className="flex items-center gap-2">
                                       <p className="font-medium text-gray-800">{e.category}</p>
                                       <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">{e.date || selectedMonth}</span>
                                   </div>
                                   <div className="text-xs text-gray-500 space-y-0.5 mt-1">
                                       {e.notes && <p>• {e.notes}</p>}
                                       <p>• Deduct from: <span className="font-medium">{e.deductFrom || 'General'}</span></p>
                                       {e.shareCount && e.shareCount > 1 && (
                                            <p className="text-blue-600 flex items-center gap-1">
                                                <Users size={10}/> Shared by {e.shareCount} ({e.sharedWith})
                                            </p>
                                       )}
                                   </div>
                               </div>
                               <div className="text-right">
                                   <span className="font-bold text-red-600 block">-{deductedAmount.toFixed(2)}</span>
                                   <span className="text-[10px] text-gray-400 block">Bill: {e.amount.toFixed(2)}</span>
                                   {e.shareCount && e.shareCount > 1 && (
                                       <span className="text-[10px] text-gray-400 block">({perPax.toFixed(2)} / pax)</span>
                                   )}
                                   <div className="flex gap-2 justify-end mt-1">
                                       <button onClick={() => handleEditExpense(e)} className="text-gray-300 hover:text-blue-500"><Edit2 size={14}/></button>
                                       <button onClick={() => handleRemoveExpense(e.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                                   </div>
                               </div>
                           </div>
                       </div>
                   );
               })}
          </div>
      </Card>
    </div>
  );
};
