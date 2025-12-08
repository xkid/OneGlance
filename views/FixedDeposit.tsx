
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FixedDeposit } from '../types';
import { Card, Button, Input, Badge } from '../components/Shared';
import { searchFDPromotions } from '../services/geminiService';
import { Plus, Trash2, Calendar, Download, Edit2, Search, Sparkles, X, Save } from 'lucide-react';

export const FixedDepositView: React.FC = () => {
  const { data, addFixedDeposit, updateFixedDeposit, deleteFixedDeposit, exportDataCSV } = useApp();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [bank, setBank] = useState('');
  const [slipNumber, setSlipNumber] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(''); // Maturity
  const [rate, setRate] = useState('');
  const [principal, setPrincipal] = useState('');
  const [remarks, setRemarks] = useState('');

  // Promo State
  const [isSearching, setIsSearching] = useState(false);
  const [promoResult, setPromoResult] = useState('');

  // Helpers
  const calculateMaturity = (p: number, r: number, start: string, end: string) => {
      if (!start || !end) return 0;
      const s = new Date(start);
      const e = new Date(end);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      // Standard Simple Interest: P * R * T(days)/365
      const interest = (p * (r / 100) * diffDays) / 365;
      return p + interest;
  };

  const resetForm = () => {
      setBank('');
      setSlipNumber('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setRate('');
      setPrincipal('');
      setRemarks('');
      setEditingId(null);
  };

  const handleEdit = (fd: FixedDeposit) => {
      setBank(fd.bank);
      setSlipNumber(fd.slipNumber);
      setStartDate(fd.startDate);
      setEndDate(fd.endDate);
      setRate(fd.rate.toString());
      setPrincipal(fd.principal.toString());
      setRemarks(fd.remarks || '');
      setEditingId(fd.id);
      setShowAddModal(true);
  };

  const handleSave = () => {
      if (!bank || !slipNumber || !endDate || !rate || !principal) return;
      
      const payload: FixedDeposit = {
          id: editingId || Date.now().toString(),
          bank,
          slipNumber,
          startDate,
          endDate,
          rate: parseFloat(rate),
          principal: parseFloat(principal),
          remarks
      };

      if (editingId) {
          updateFixedDeposit(payload);
      } else {
          addFixedDeposit(payload);
      }
      setShowAddModal(false);
      resetForm();
  };

  const handleAddToCalendar = (fd: FixedDeposit) => {
      const maturityVal = calculateMaturity(fd.principal, fd.rate, fd.startDate, fd.endDate).toFixed(2);
      
      // Create ICS content
      const eventDetails = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'BEGIN:VEVENT',
          `DTSTART:${fd.endDate.replace(/-/g, '')}`,
          `DTEND:${fd.endDate.replace(/-/g, '')}`,
          `SUMMARY:FD Maturity - ${fd.bank} (${fd.slipNumber})`,
          `DESCRIPTION:Your Fixed Deposit is maturing. Principal: ${fd.principal}, Rate: ${fd.rate}%. Estimated Return: ${maturityVal}. Remarks: ${fd.remarks || 'None'}`,
          'END:VEVENT',
          'END:VCALENDAR'
      ].join('\n');

      const blob = new Blob([eventDetails], { type: 'text/calendar;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fd_maturity_${fd.slipNumber}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleFindRates = async () => {
      setIsSearching(true);
      setShowPromoModal(true);
      const result = await searchFDPromotions();
      if (result) {
          setPromoResult(result.rawText);
      } else {
          setPromoResult("Could not fetch promotions at this time.");
      }
      setIsSearching(false);
  };
  
  const handleDownloadCSV = () => {
      const csv = exportDataCSV('fd');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fd_data.csv`;
      a.click();
  };

  // Sort by maturity date
  const sortedFDs = useMemo(() => {
      return [...data.fixedDeposits].sort((a,b) => a.endDate.localeCompare(b.endDate));
  }, [data.fixedDeposits]);

  const totalPrincipal = data.fixedDeposits.reduce((sum, fd) => sum + fd.principal, 0);

  return (
    <div className="space-y-6 pb-24">
       <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Fixed Deposits</h1>
        <div className="flex gap-2">
            <button onClick={handleFindRates} className="p-2 bg-blue-100 rounded-full text-blue-600 animate-pulse-slow">
                <Sparkles size={20} />
            </button>
            <button onClick={handleDownloadCSV} className="p-2 bg-gray-100 rounded-full text-gray-600">
                <Download size={20} />
            </button>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <p className="text-emerald-100 text-xs uppercase">Total Principal Deposited</p>
          <p className="text-3xl font-bold mt-1">{totalPrincipal.toLocaleString()}</p>
          <p className="text-xs text-emerald-100 mt-2">{data.fixedDeposits.length} Active Certificates</p>
      </Card>

      <div className="flex justify-between items-center px-1">
          <h3 className="font-semibold text-gray-700">Certificates</h3>
          <Button variant="ghost" onClick={() => { resetForm(); setShowAddModal(true); }} className="flex items-center gap-1 text-xs">
              <Plus size={16}/> Add New
          </Button>
      </div>

      <div className="space-y-3">
          {sortedFDs.length === 0 && <p className="text-gray-400 text-center py-8">No active fixed deposits.</p>}
          {sortedFDs.map(fd => {
              const maturityVal = calculateMaturity(fd.principal, fd.rate, fd.startDate, fd.endDate);
              const isMatured = new Date(fd.endDate) <= new Date();

              return (
                  <div key={fd.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                      {isMatured && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">MATURED</div>}
                      
                      <div className="flex justify-between items-start mb-2">
                          <div>
                              <h4 className="font-bold text-gray-900">{fd.bank}</h4>
                              <p className="text-xs text-gray-500">Slip: {fd.slipNumber}</p>
                          </div>
                          <div className="text-right">
                              <p className="font-bold text-emerald-600">{fd.rate}%</p>
                              <p className="text-xs text-gray-400">Rate</p>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                              <p className="text-gray-400 text-xs">Principal</p>
                              <p className="font-semibold">{fd.principal.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                              <p className="text-gray-400 text-xs">Maturity Value</p>
                              <p className="font-semibold text-ios-blue">{maturityVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                          </div>
                      </div>

                      <div className="bg-gray-50 p-2 rounded-lg flex justify-between items-center mb-3">
                          <div className="text-xs text-gray-500">
                              <span className="block text-[10px] uppercase">Matures On</span>
                              <span className={`font-medium ${isMatured ? 'text-red-500' : 'text-gray-700'}`}>{fd.endDate}</span>
                          </div>
                          <button 
                             onClick={() => handleAddToCalendar(fd)}
                             className="text-xs flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded text-blue-600 hover:bg-blue-50"
                          >
                              <Calendar size={12}/> Sync Calendar
                          </button>
                      </div>

                      {fd.remarks && <p className="text-xs text-gray-400 italic mb-3">"{fd.remarks}"</p>}

                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                          <button onClick={() => handleEdit(fd)} className="flex-1 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100 flex justify-center items-center gap-1">
                              <Edit2 size={12}/> Edit
                          </button>
                          <button onClick={() => deleteFixedDeposit(fd.id)} className="flex-1 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 flex justify-center items-center gap-1">
                              <Trash2 size={12}/> Delete
                          </button>
                      </div>
                  </div>
              )
          })}
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar">
                  <div className="p-4 border-b border-gray-100 font-bold text-center flex justify-between items-center">
                      <span>{editingId ? 'Edit' : 'Add'} Fixed Deposit</span>
                      <button onClick={() => setShowAddModal(false)}><X size={20}/></button>
                  </div>
                  <div className="p-4 space-y-3">
                      <Input label="Bank Name" value={bank} onChange={e => setBank(e.target.value)} placeholder="e.g. Maybank"/>
                      <Input label="Slip Number" value={slipNumber} onChange={e => setSlipNumber(e.target.value)} placeholder="e.g. 12345678"/>
                      <div className="grid grid-cols-2 gap-3">
                          <Input type="date" label="Start Date" value={startDate} onChange={e => setStartDate(e.target.value)}/>
                          <Input type="date" label="Maturity Date" value={endDate} onChange={e => setEndDate(e.target.value)}/>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <Input type="number" label="Principal Amount" value={principal} onChange={e => setPrincipal(e.target.value)}/>
                          <Input type="number" label="Rate (%)" value={rate} onChange={e => setRate(e.target.value)} step="0.01"/>
                      </div>
                      <Input label="Remarks" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional notes"/>
                      
                      {/* Live Calculation Preview */}
                      {principal && rate && startDate && endDate && (
                          <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 text-center">
                              Estimated Maturity Value: <br/>
                              <span className="font-bold text-lg">
                                  {calculateMaturity(parseFloat(principal), parseFloat(rate), startDate, endDate).toFixed(2)}
                              </span>
                          </div>
                      )}
                  </div>
                  <div className="p-4 bg-gray-50">
                      <Button onClick={handleSave} className="w-full flex justify-center items-center gap-2">
                          <Save size={18}/> Save Certificate
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {/* --- PROMO SEARCH MODAL --- */}
      {showPromoModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-md h-[80vh] flex flex-col">
                  <div className="p-4 border-b border-gray-100 font-bold text-center flex justify-between items-center bg-gray-50">
                      <span className="flex items-center gap-2"><Sparkles size={16} className="text-purple-500"/> Best Rate Scout</span>
                      <button onClick={() => setShowPromoModal(false)}><X size={20}/></button>
                  </div>
                  <div className="flex-1 p-6 overflow-y-auto">
                      {isSearching ? (
                          <div className="flex flex-col items-center justify-center h-full space-y-4">
                              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                              <p className="text-gray-500 text-sm animate-pulse">Scouting top rates in Malaysia...</p>
                          </div>
                      ) : (
                          <div className="prose prose-sm prose-blue max-w-none">
                              <div className="whitespace-pre-wrap font-sans text-gray-700 text-sm leading-relaxed">
                                  {promoResult}
                              </div>
                          </div>
                      )}
                  </div>
                  <div className="p-4 border-t border-gray-100 text-center text-xs text-gray-400">
                      Results powered by Google Search & Gemini. Verify with bank directly.
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
