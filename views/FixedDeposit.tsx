
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FixedDeposit, FDMaturityLog } from '../types';
import { Card, Button, Input, Badge } from '../components/Shared';
import { searchFDPromotions } from '../services/geminiService';
import { Plus, Trash2, Calendar, Download, Edit2, Search, Sparkles, X, Save, TrendingUp, DollarSign, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export const FixedDepositView: React.FC = () => {
  const { data, addFixedDeposit, updateFixedDeposit, deleteFixedDeposit, collectFixedDeposit, exportDataCSV } = useApp();
  
  const [activeView, setActiveView] = useState<'active' | 'calendar' | 'history'>('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [bank, setBank] = useState('');
  const [slipNumber, setSlipNumber] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(''); // Maturity
  const [rate, setRate] = useState('');
  const [principal, setPrincipal] = useState('');
  const [remarks, setRemarks] = useState('');

  // Collect/Maturity State
  const [collectItem, setCollectItem] = useState<FixedDeposit | null>(null);
  const [collectDate, setCollectDate] = useState(new Date().toISOString().split('T')[0]);
  const [finalInterest, setFinalInterest] = useState('');

  // Promo State
  const [isSearching, setIsSearching] = useState(false);
  const [promoResult, setPromoResult] = useState('');

  // Calendar View State
  const [calDate, setCalDate] = useState(new Date());
  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(null);

  // History State
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());

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

  const calculateProjectedInterest = (p: number, r: number, start: string, end: string) => {
      const maturity = calculateMaturity(p, r, start, end);
      return maturity - p;
  }

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

  const initiateCollection = (fd: FixedDeposit) => {
      setCollectItem(fd);
      const projected = calculateProjectedInterest(fd.principal, fd.rate, fd.startDate, fd.endDate);
      setFinalInterest(projected.toFixed(2));
      setCollectDate(new Date().toISOString().split('T')[0]);
      setShowCollectModal(true);
  };

  const confirmCollection = () => {
      if (!collectItem || !finalInterest) return;
      
      const log: FDMaturityLog = {
          id: Date.now().toString(),
          date: collectDate,
          bank: collectItem.bank,
          slipNumber: collectItem.slipNumber,
          principal: collectItem.principal,
          interestEarned: parseFloat(finalInterest),
          rateSnapshot: collectItem.rate,
          year: new Date(collectDate).getFullYear()
      };

      collectFixedDeposit(log, collectItem.id);
      setShowCollectModal(false);
      setCollectItem(null);
  };

  const handleAddToCalendar = (fd: FixedDeposit) => {
      const maturityVal = calculateMaturity(fd.principal, fd.rate, fd.startDate, fd.endDate).toFixed(2);
      // Create ICS content (simplified)
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
      const target = activeView === 'history' ? 'fd_history' : 'fd';
      const csv = exportDataCSV(target);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${target}_data.csv`;
      a.click();
  };

  // --- DATA DERIVATIONS ---
  // Active Sorted by maturity
  const sortedFDs = useMemo(() => {
      return [...data.fixedDeposits].sort((a,b) => a.endDate.localeCompare(b.endDate));
  }, [data.fixedDeposits]);

  const totalPrincipal = data.fixedDeposits.reduce((sum, fd) => sum + fd.principal, 0);

  // History Filtered by Year
  const historyLogs = useMemo(() => {
      return (data.fdMaturityLogs || [])
        .filter(l => l.year === historyYear)
        .sort((a,b) => b.date.localeCompare(a.date));
  }, [data.fdMaturityLogs, historyYear]);

  const historyTotalInterest = historyLogs.reduce((sum, l) => sum + l.interestEarned, 0);

  // Calendar Data Map
  const calendarMap = useMemo(() => {
      const map = new Map<string, FixedDeposit[]>();
      data.fixedDeposits.forEach(fd => {
          const existing = map.get(fd.endDate) || [];
          map.set(fd.endDate, [...existing, fd]);
      });
      return map;
  }, [data.fixedDeposits]);

  // Calendar Generation
  const generateCalendarDays = () => {
      const year = calDate.getFullYear();
      const month = calDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDay = firstDay.getDay(); // 0 = Sun

      const days = [];
      // Empty slots
      for (let i = 0; i < startingDay; i++) {
          days.push(<div key={`empty-${i}`} className="h-10"></div>);
      }
      
      // Actual days
      for (let i = 1; i <= daysInMonth; i++) {
          const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
          const dueFDs = calendarMap.get(dateStr);
          const isSelected = selectedCalDay === dateStr;
          
          days.push(
              <div 
                key={dateStr} 
                onClick={() => setSelectedCalDay(dateStr)}
                className={`h-10 flex flex-col items-center justify-center rounded-lg cursor-pointer transition-colors relative border ${isSelected ? 'border-ios-blue bg-blue-50' : 'border-transparent hover:bg-gray-50'}`}
              >
                  <span className={`text-sm ${isSelected ? 'font-bold text-ios-blue' : 'text-gray-700'}`}>{i}</span>
                  {dueFDs && (
                      <div className="flex gap-0.5 mt-0.5">
                          {dueFDs.map((_, idx) => (
                              <div key={idx} className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                          ))}
                      </div>
                  )}
              </div>
          );
      }
      return days;
  };

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

      {/* Segmented Control */}
      <div className="bg-gray-200 p-1 rounded-xl flex">
        <button onClick={() => setActiveView('active')} className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeView === 'active' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Active</button>
        <button onClick={() => setActiveView('calendar')} className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeView === 'calendar' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Calendar</button>
        <button onClick={() => setActiveView('history')} className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeView === 'history' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>History</button>
      </div>

      {/* --- ACTIVE VIEW --- */}
      {activeView === 'active' && (
          <>
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
                                <button onClick={() => initiateCollection(fd)} className="flex-1 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 flex justify-center items-center gap-1">
                                    <CheckCircle size={12}/> Collect/Renew
                                </button>
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
          </>
      )}

      {/* --- CALENDAR VIEW --- */}
      {activeView === 'calendar' && (
          <div className="space-y-4">
              <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <button onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1))} className="p-2 hover:bg-gray-50 rounded-full"><ChevronLeft size={20}/></button>
                  <span className="font-bold text-gray-800">{calDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}</span>
                  <button onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1))} className="p-2 hover:bg-gray-50 rounded-full"><ChevronRight size={20}/></button>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 mb-2">
                      <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                      {generateCalendarDays()}
                  </div>
              </div>

              {selectedCalDay && (
                  <Card title={`Due on ${selectedCalDay}`}>
                      {calendarMap.get(selectedCalDay)?.length ? (
                          <div className="space-y-2">
                              {calendarMap.get(selectedCalDay)?.map(fd => (
                                  <div key={fd.id} className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                                      <div>
                                          <p className="font-bold text-blue-900">{fd.bank}</p>
                                          <p className="text-xs text-blue-600">Slip: {fd.slipNumber}</p>
                                      </div>
                                      <div className="text-right">
                                          <p className="font-bold text-blue-900">{fd.principal.toLocaleString()}</p>
                                          <p className="text-xs text-blue-600">Principal</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <p className="text-center text-gray-400 text-sm py-2">No FDs maturing on this date.</p>
                      )}
                  </Card>
              )}
          </div>
      )}

      {/* --- HISTORY VIEW --- */}
      {activeView === 'history' && (
          <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-700">Maturity Log</h3>
                  <select 
                      value={historyYear} 
                      onChange={e => setHistoryYear(parseInt(e.target.value))}
                      className="bg-gray-100 rounded-lg px-2 py-1 text-sm font-semibold focus:outline-none"
                  >
                      {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                          <option key={y} value={y}>{y}</option>
                      ))}
                  </select>
              </div>

              <Card className="bg-indigo-600 text-white">
                  <div className="flex items-center gap-2 mb-1">
                      <TrendingUp size={16} className="text-indigo-200"/>
                      <p className="text-indigo-200 text-xs uppercase">Total Dividends {historyYear}</p>
                  </div>
                  <p className="text-3xl font-bold">MYR {historyTotalInterest.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </Card>

              <div className="space-y-3">
                  {historyLogs.length === 0 && <p className="text-center text-gray-400 py-4">No records for {historyYear}</p>}
                  {historyLogs.map(log => (
                      <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                          <div>
                              <p className="font-bold text-gray-900">{log.bank}</p>
                              <p className="text-xs text-gray-500">{log.date} • Slip: {log.slipNumber}</p>
                              <p className="text-xs text-gray-400 mt-1">Principal: {log.principal.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                              <span className="block font-bold text-green-600 text-lg">+{log.interestEarned.toFixed(2)}</span>
                              <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded">Dividend</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

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

      {/* --- COLLECT / MATURITY MODAL --- */}
      {showCollectModal && collectItem && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 bg-green-50">
                      <h3 className="font-bold text-green-800 text-center">Collect Dividend</h3>
                      <p className="text-xs text-green-600 text-center">{collectItem.bank} - {collectItem.slipNumber}</p>
                  </div>
                  <div className="p-4 space-y-4">
                      <div className="bg-gray-50 p-3 rounded text-sm">
                          <div className="flex justify-between mb-1">
                              <span className="text-gray-500">Principal</span>
                              <span className="font-medium">{collectItem.principal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-gray-500">Original Rate</span>
                              <span className="font-medium">{collectItem.rate}%</span>
                          </div>
                      </div>
                      
                      <Input 
                        label="Final Interest/Dividend Received" 
                        type="number" 
                        step="0.01" 
                        value={finalInterest} 
                        onChange={e => setFinalInterest(e.target.value)}
                      />
                      <Input 
                        label="Date Collected" 
                        type="date"
                        value={collectDate} 
                        onChange={e => setCollectDate(e.target.value)}
                      />
                      
                      <p className="text-xs text-gray-400 italic">
                          *Confirming will move this record to History and remove it from Active list.
                      </p>
                  </div>
                  <div className="p-4 bg-gray-50 flex gap-2">
                      <Button variant="secondary" className="flex-1" onClick={() => setShowCollectModal(false)}>Cancel</Button>
                      <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={confirmCollection}>Confirm</Button>
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
