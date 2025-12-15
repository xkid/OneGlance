
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ELIGIBLE_TAX_CATEGORIES } from '../types';
import { Card, Button, Input, Select, Badge } from '../components/Shared';
import { FileText, Plus, Trash2, Download, Link2, Edit2, X, Save } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

  // Dynamic Year Generation
  const yearOptions = useMemo(() => {
      const currentYear = new Date().getFullYear();
      const years = new Set<number>();
      
      // Default range 2021 -> Current + 2
      for (let y = 2021; y <= currentYear + 2; y++) {
          years.add(y);
      }

      // Scan Manual Items
      data.taxItems.forEach(t => years.add(t.year));

      // Scan Transactions
      data.transactions.forEach(t => {
          if (t.isTaxRelief) {
              const y = parseInt(t.date.split('-')[0]);
              if (!isNaN(y)) years.add(y);
          }
      });

      return Array.from(years).sort((a, b) => b - a);
  }, [data.taxItems, data.transactions]);

  // Combine Manual Tax Items + Synced Expenses
  const allItems = useMemo(() => {
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

  // Separate Reliefs vs PCB (Tax Paid)
  const reliefItems = allItems.filter(t => t.category !== 'PCB' && t.category !== 'Income Tax');
  const taxPaidItems = allItems.filter(t => t.category === 'PCB' || t.category === 'Income Tax');

  const totalRelief = reliefItems.reduce((sum, t) => sum + t.amount, 0);
  const totalTaxPaid = taxPaidItems.reduce((sum, t) => sum + t.amount, 0);

  // DATA FOR CHARTS
  const taxReliefByCategory = useMemo(() => {
      const breakdown: Record<string, number> = {};
      reliefItems.forEach(t => {
          breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
      });
      return Object.keys(breakdown).map(cat => ({
          name: cat,
          value: breakdown[cat]
      })).sort((a,b) => b.value - a.value);
  }, [reliefItems]);

  const pcbMonthlyData = useMemo(() => {
      const buckets = Array.from({length: 12}, (_, i) => ({
          name: new Date(selectedYear, i, 1).toLocaleDateString('default', {month:'short'}),
          PCB: 0
      }));
      
      taxPaidItems.forEach(t => {
          const monthIdx = parseInt(t.date.split('-')[1]) - 1;
          if (buckets[monthIdx]) {
              buckets[monthIdx].PCB += t.amount;
          }
      });
      return buckets;
  }, [taxPaidItems, selectedYear]);


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
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={handleDownload} className="p-2 bg-gray-100 rounded-full text-gray-600">
                <Download size={20} />
            </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
          <Card className="bg-indigo-600 text-white">
              <p className="text-indigo-200 text-[10px] uppercase">Total Relief Claimable</p>
              <p className="text-2xl font-bold mt-1">MYR {totalRelief.toLocaleString()}</p>
          </Card>
          <Card className="bg-teal-600 text-white">
              <p className="text-teal-200 text-[10px] uppercase">Total Tax Paid (PCB)</p>
              <p className="text-2xl font-bold mt-1">MYR {totalTaxPaid.toLocaleString()}</p>
          </Card>
      </div>

      <Card title="Monthly Tax Paid (PCB)">
          <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pcbMonthlyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false}/>
                      <Tooltip cursor={{fill: '#f3f4f6'}} />
                      <Bar dataKey="PCB" fill="#0D9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
              </ResponsiveContainer>
          </div>
      </Card>

      <Card title="Relief by Category">
          <div className="h-[250px] w-full">
              {taxReliefByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={taxReliefByCategory} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                          <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={80}/>
                          <YAxis fontSize={10} tickLine={false} axisLine={false}/>
                          <Tooltip cursor={{fill: '#f3f4f6'}} />
                          <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} name="Amount" />
                      </BarChart>
                  </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-gray-400">No Relief Data</div>}
          </div>
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
          <h3 className="font-semibold text-gray-700 ml-1">Records for {selectedYear}</h3>
          {allItems.length === 0 ? <p className="text-gray-400 text-center py-4">No records found.</p> : 
            allItems.map(t => (
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
