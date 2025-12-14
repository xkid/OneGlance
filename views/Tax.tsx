

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ELIGIBLE_TAX_CATEGORIES } from '../types';
import { Card, Button, Input, Select, Badge } from '../components/Shared';
import { FileText, Plus, Trash2, Download, Link2, Edit2, X, Save } from 'lucide-react';

export const TaxView: React.FC = () => {
  const { data, addTaxItem, deleteTaxItem, updateTaxItem, updateTransaction, exportDataCSV } = useApp();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Add Form State
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(ELIGIBLE_TAX_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receipt, setReceipt] = useState('');
  const [eInvoice, setEInvoice] = useState(false);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Combine Manual Tax Items + Synced Expenses
  const displayItems = useMemo(() => {
    const manualItems = data.taxItems.filter(t => t.year === selectedYear).map(t => ({...t, isManual: true}));
    
    // Sync from Expenses where isTaxRelief is true
    const syncedItems = data.transactions
      .filter(t => t.isTaxRelief && t.date.startsWith(selectedYear.toString()))
      .map(t => ({
        id: `synced-${t.id}`,
        year: parseInt(t.date.split('-')[0]),
        category: t.category,
        description: t.description,
        amount: t.amount,
        date: t.date,
        receiptNumber: t.receiptNumber || '', // Pull from transaction
        hasEInvoice: t.hasEInvoice || false, // Pull from transaction
        isManual: false,
        originalId: t.id // Reference to real transaction ID
      }));

    return [...manualItems, ...syncedItems].sort((a,b) => b.date.localeCompare(a.date));
  }, [data.taxItems, data.transactions, selectedYear]);

  const totalRelief = displayItems.reduce((sum, t) => sum + t.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    addTaxItem({
        id: Date.now().toString(),
        year: selectedYear,
        category,
        description,
        amount: parseFloat(amount),
        date: date,
        receiptNumber: receipt,
        hasEInvoice: eInvoice
    });
    setAmount('');
    setDescription('');
    setReceipt('');
    setEInvoice(false);
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleEditClick = (item: any) => {
      setEditingItem(item);
  };

  const handleUpdateSave = () => {
      if (!editingItem) return;
      
      const newAmount = parseFloat(editingItem.amount);
      const newDesc = editingItem.description;
      const newCat = editingItem.category;
      const newDate = editingItem.date;
      
      if (editingItem.isManual) {
          // Update Manual Tax Item
          updateTaxItem({
              id: editingItem.id,
              year: parseInt(editingItem.date.split('-')[0]),
              category: newCat,
              description: newDesc,
              amount: newAmount,
              date: newDate,
              receiptNumber: editingItem.receiptNumber,
              hasEInvoice: editingItem.hasEInvoice
          });
      } else {
          // Update Synced Expense Transaction
          // Find original transaction
          const original = data.transactions.find(t => t.id === editingItem.originalId);
          if (original) {
              updateTransaction({
                  ...original,
                  date: newDate,
                  amount: newAmount,
                  description: newDesc,
                  category: newCat,
                  // Save tax specific fields back to transaction
                  receiptNumber: editingItem.receiptNumber,
                  hasEInvoice: editingItem.hasEInvoice
              });
          }
      }
      setEditingItem(null);
  };

  const handleDownload = () => {
      const csv = exportDataCSV('tax');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = `tax_relief_${selectedYear}.csv`;
      a.click();
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Tax Relief</h1>
        <div className="flex gap-2">
            <select 
                value={selectedYear} 
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="bg-gray-100 rounded-lg px-3 py-1 text-sm font-semibold focus:outline-none"
            >
                {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={handleDownload} className="p-2 bg-gray-100 rounded-full text-gray-600">
                <Download size={20} />
            </button>
        </div>
      </div>

      <Card className="bg-indigo-600 text-white">
          <p className="text-indigo-200 text-xs uppercase">Total Claimable {selectedYear}</p>
          <p className="text-3xl font-bold mt-1">MYR {totalRelief.toLocaleString()}</p>
      </Card>

      <Card title="Add Manual Record">
          <form onSubmit={handleSubmit} className="space-y-3">
              <Select label="Category" value={category} onChange={e => setCategory(e.target.value)}>
                  {ELIGIBLE_TAX_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
              <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Item details" required/>
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" label="Amount" value={amount} onChange={e => setAmount(e.target.value)} required/>
                <Input type="date" label="Date" value={date} onChange={e => setDate(e.target.value)} required/>
              </div>
              <Input label="Receipt #" value={receipt} onChange={e => setReceipt(e.target.value)}/>
              
              <div className="flex items-center gap-2 py-2">
                  <input type="checkbox" checked={eInvoice} onChange={e => setEInvoice(e.target.checked)} id="einv" className="w-5 h-5 rounded text-ios-blue"/>
                  <label htmlFor="einv" className="text-sm text-gray-700">E-Invoice Obtained</label>
              </div>
              <Button type="submit" className="w-full flex justify-center gap-2"><Plus size={18}/> Add Record</Button>
          </form>
      </Card>

      <div className="space-y-3">
          {displayItems.length === 0 ? <p className="text-gray-400 text-center py-4">No records for {selectedYear}</p> : 
            displayItems.map(t => (
                <div key={t.id} className={`bg-white p-4 rounded-xl shadow-sm border ${t.isManual ? 'border-gray-100' : 'border-blue-100 bg-blue-50/20'} flex justify-between items-center`}>
                    <div>
                        <div className="flex items-center gap-2">
                           <p className="font-semibold text-gray-900">{t.category}</p>
                           {!t.isManual && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1"><Link2 size={10}/> Synced</span>}
                        </div>
                        <p className="text-sm text-gray-500">{t.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">{t.date}</span>
                            {t.receiptNumber && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">Ref: {t.receiptNumber}</span>}
                            {t.hasEInvoice && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1"><FileText size={10}/> E-Inv</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                           <span className="font-bold text-gray-800 block">{t.amount.toFixed(2)}</span>
                           {/* Allow edit on manual. Synced items usually edited at source, but logic added just in case */}
                           <button 
                                onClick={() => handleEditClick(t)}
                                className="text-[10px] text-blue-600 hover:underline mt-1 inline-flex items-center gap-1"
                           >
                               <Edit2 size={8}/> Edit
                           </button>
                        </div>
                        {t.isManual ? (
                            <button onClick={() => deleteTaxItem(t.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                        ) : (
                           <div className="w-4"></div> 
                        )}
                    </div>
                </div>
            ))
          }
      </div>

      {/* EDIT MODAL */}
      {editingItem && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <span className="font-bold">Edit Record</span>
                      <button onClick={() => setEditingItem(null)}><X size={20}/></button>
                  </div>
                  <div className="p-4 space-y-3">
                      {!editingItem.isManual && (
                          <div className="bg-blue-50 p-2 rounded text-xs text-blue-800 mb-2">
                              Note: This is a synced item. Editing this will update the original source record.
                          </div>
                      )}
                      <Select label="Category" value={editingItem.category} onChange={e => setEditingItem({...editingItem, category: e.target.value})}>
                          {ELIGIBLE_TAX_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </Select>
                      <Input label="Description" value={editingItem.description} onChange={e => setEditingItem({...editingItem, description: e.target.value})} />
                      <div className="grid grid-cols-2 gap-3">
                          <Input type="number" label="Amount" value={editingItem.amount} onChange={e => setEditingItem({...editingItem, amount: e.target.value})} />
                          <Input type="date" label="Date" value={editingItem.date} onChange={e => setEditingItem({...editingItem, date: e.target.value})} />
                      </div>
                      
                      {/* Make these available even for synced items now */}
                      <Input label="Receipt #" value={editingItem.receiptNumber || ''} onChange={e => setEditingItem({...editingItem, receiptNumber: e.target.value})}/>
                      <div className="flex items-center gap-2 py-2">
                            <input type="checkbox" checked={editingItem.hasEInvoice} onChange={e => setEditingItem({...editingItem, hasEInvoice: e.target.checked})} id="edit-einv" className="w-5 h-5 rounded text-ios-blue"/>
                            <label htmlFor="edit-einv" className="text-sm text-gray-700">E-Invoice Obtained</label>
                      </div>
                  </div>
                  <div className="p-4 bg-gray-50">
                      <Button onClick={handleUpdateSave} className="w-full flex justify-center items-center gap-2">
                          <Save size={18}/> Save Changes
                      </Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
