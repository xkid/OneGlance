
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCIES, InvestmentItem } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, AreaChart, Area } from 'recharts';
import { Card, Button, Input } from '../components/Shared';
import { Upload, FileDown, Wallet, Heart, TrendingUp, FileText, Landmark, AlertCircle, Calendar, ArrowRight, ArrowDown, ArrowUp, Banknote, Trash2, AlertTriangle, X } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export const StatsView: React.FC = () => {
  const { data, exportDataJSON, importData, captureFundSnapshot, resetData } = useApp();
  const [importStatus, setImportStatus] = useState<string>('');
  const [moduleView, setModuleView] = useState<'expenses' | 'parent' | 'invest' | 'tax' | 'fd' | 'salary'>('expenses');
  const [selectedHistoryYear, setSelectedHistoryYear] = useState<number>(new Date().getFullYear());
  const [selectedTaxYear, setSelectedTaxYear] = useState<number>(new Date().getFullYear());
  const [selectedShareCurrency, setSelectedShareCurrency] = useState<string>('All');
  const [selectedSalaryYear, setSelectedSalaryYear] = useState<number>(new Date().getFullYear());

  // Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetInput, setResetInput] = useState('');

  // Auto-capture fund snapshot on mount (throttled to once per day via context logic check)
  useEffect(() => {
     captureFundSnapshot();
  }, []);

  // Generate Year Options: 2021 to Current + 5 Years
  const yearOptions = useMemo(() => {
      const currentYear = new Date().getFullYear();
      const startYear = 2021;
      const endYear = currentYear + 5;
      const years = [];
      for(let y = startYear; y <= endYear; y++) {
          years.push(y);
      }
      return years;
  }, []);

  // --- DATA PREPARATION ---

  // 1. EXPENSES DATA
  const expenseByCategory = useMemo(() => {
    return data.transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);
  }, [data.transactions]);

  const pieData = Object.keys(expenseByCategory).map(key => ({
      name: key,
      value: expenseByCategory[key]
  })).sort((a,b) => b.value - a.value).slice(0, 6);

  const monthlyTrend = useMemo(() => {
    const trend = data.transactions.reduce((acc, t) => {
        const month = t.date.substring(0, 7); // YYYY-MM
        if (!acc[month]) acc[month] = { name: month, income: 0, expense: 0 };
        if (t.type === 'income') acc[month].income += t.amount;
        else acc[month].expense += t.amount;
        return acc;
    }, {} as Record<string, any>);
    return Object.values(trend).sort((a: any, b: any) => a.name.localeCompare(b.name)).slice(-6);
  }, [data.transactions]);


  // 2. INVEST DATA (SHARES - Performance)
  const investShareData = useMemo(() => {
      // Filter for shares AND ensure unitsHeld > 0
      let shares = data.investments.filter(i => i.type === 'share' && i.unitsHeld > 0);
      
      if (selectedShareCurrency !== 'All') {
          shares = shares.filter(i => (i.currency || 'MYR') === selectedShareCurrency);
      }
      
      return shares.map(share => {
          const cost = share.purchasePrice * share.unitsHeld;
          const value = (share.currentPrice || share.purchasePrice) * share.unitsHeld;
          const totalDivs = data.dividends
            .filter(d => d.investmentId === share.id)
            .reduce((sum, d) => sum + d.amount, 0);

          return {
              name: share.symbol || share.name,
              fullName: share.name,
              Cost: cost,
              Value: value,
              Dividends: totalDivs
          };
      });
  }, [data.investments, data.dividends, selectedShareCurrency]);

  // 3. INVEST DATA (MUTUAL FUNDS - Chart)
  const fundMonthlyPurchaseData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(selectedHistoryYear, i, 1);
        return {
            monthIndex: i,
            name: d.toLocaleDateString('default', { month: 'short' }),
            PurchaseCost: 0,
            MarketValue: 0
        };
    });

    data.investments
        .filter(i => i.type === 'fund' && i.unitsHeld > 0)
        .forEach(fund => {
            const pDate = new Date(fund.purchaseDate);
            if (pDate.getFullYear() === selectedHistoryYear) {
                const mIndex = pDate.getMonth();
                months[mIndex].PurchaseCost += (fund.purchasePrice * fund.unitsHeld);
                months[mIndex].MarketValue += ((fund.currentPrice || fund.purchasePrice) * fund.unitsHeld);
            }
        });

    return months;
  }, [data.investments, selectedHistoryYear]);

  // Historical Value Trend
  const fundHistoricalData = useMemo(() => {
      const snapshots = data.fundSnapshots.filter(s => {
          const y = parseInt(s.date.split('-')[0]);
          return y === selectedHistoryYear;
      });

      const groupedByMonth = snapshots.reduce((acc, s) => {
          const month = parseInt(s.date.split('-')[1]) - 1;
          if (!acc[month]) acc[month] = [];
          acc[month].push(s);
          return acc;
      }, {} as Record<number, typeof snapshots>);

      const result = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(selectedHistoryYear, i, 1);
          const monthName = d.toLocaleDateString('default', { month: 'short' });
          const monthSnaps = groupedByMonth[i];

          if (!monthSnaps || monthSnaps.length === 0) {
              return { name: monthName, AvgCost: 0, AvgValue: 0 };
          }

          monthSnaps.sort((a,b) => a.date.localeCompare(b.date));
          const first = monthSnaps[0];
          const last = monthSnaps[monthSnaps.length - 1];

          return {
              name: monthName,
              AvgCost: (first.totalCost + last.totalCost) / 2,
              AvgValue: (first.totalValue + last.totalValue) / 2
          };
      });

      return result;
  }, [data.fundSnapshots, selectedHistoryYear]);

  // 3c. Overall Fund Summary
  const fundSummary = useMemo(() => {
      const funds = data.investments.filter(i => i.type === 'fund' && i.unitsHeld > 0);
      const totalCost = funds.reduce((sum, f) => sum + (f.purchasePrice * f.unitsHeld), 0);
      const totalValue = funds.reduce((sum, f) => sum + ((f.currentPrice || f.purchasePrice) * f.unitsHeld), 0);
      const diff = totalValue - totalCost;
      const percent = totalCost === 0 ? 0 : (diff / totalCost) * 100;

      return { cost: totalCost, value: totalValue, diff, percent };
  }, [data.investments]);


  // --- HISTORY CALCULATIONS FOR TABLE ---
  
  // A. SHARES HISTORY (Dividends & Sales)
  const shareHistory = useMemo(() => {
      const shares = data.investments.filter(i => i.type === 'share');
      const hist = shares.map(share => {
          // Dividends in selected year
          const divs = data.dividends.filter(d => d.investmentId === share.id && d.date.startsWith(selectedHistoryYear.toString()));
          const totalDivAmount = divs.reduce((sum, d) => sum + d.amount, 0);
          
          // Cost of CURRENTLY HELD units
          const currentCostBasis = share.purchasePrice * share.unitsHeld;
          
          // Yield Calculation (Profit % vs Spend for current units)
          // NOTE: If unitsHeld is 0, we can't calc yield on held units.
          const yieldPercent = (currentCostBasis > 0) ? (totalDivAmount / currentCostBasis) * 100 : 0;

          // Sales in selected year
          const sales = data.sales.filter(s => s.investmentId === share.id && s.date.startsWith(selectedHistoryYear.toString()));

          if (divs.length === 0 && sales.length === 0) return null;

          return {
              share,
              dividends: divs,
              sales,
              totalDivAmount,
              yieldPercent,
              currentCostBasis
          };
      }).filter(Boolean); // Remove nulls
      return hist;
  }, [data.investments, data.dividends, data.sales, selectedHistoryYear]);

  // B. FUND HISTORY (Purchases & Sales)
  const fundHistory = useMemo(() => {
      // Purchases in Year
      const purchases = data.investments.filter(i => i.type === 'fund' && i.purchaseDate.startsWith(selectedHistoryYear.toString()));
      
      // Sales in Year
      // We need to find sales linked to funds. 
      // SaleLog has investmentId. We check if that ID belonged to a fund.
      const sales = data.sales.filter(s => {
          if (!s.date.startsWith(selectedHistoryYear.toString())) return false;
          // Find the item it belongs to
          const inv = data.investments.find(i => i.id === s.investmentId);
          // If inv exists check type. If not (deleted?), rely on itemName lookup? 
          // For now assume investment item still exists as per current logic (units just go to 0)
          return inv && inv.type === 'fund';
      });

      return { purchases, sales };
  }, [data.investments, data.sales, selectedHistoryYear]);


  // 4. TAX DATA
  const taxByYear = useMemo(() => {
      const manual = data.taxItems.reduce((acc, t) => {
          acc[t.year] = (acc[t.year] || 0) + t.amount;
          return acc;
      }, {} as Record<number, number>);
      data.transactions.filter(t => t.isTaxRelief).forEach(t => {
          const year = parseInt(t.date.split('-')[0]);
          manual[year] = (manual[year] || 0) + t.amount;
      });
      return Object.keys(manual).map(y => ({ name: y, Amount: manual[parseInt(y)] }));
  }, [data.taxItems, data.transactions]);

  const taxByCategory = useMemo(() => {
      const breakdown: Record<string, number> = {};
      
      // Manual Items
      data.taxItems.filter(t => t.year === selectedTaxYear).forEach(t => {
          breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
      });

      // Synced Transactions (Expenses flagged as Tax Relief)
      data.transactions.filter(t => t.isTaxRelief && t.date.startsWith(selectedTaxYear.toString())).forEach(t => {
          breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
      });

      return Object.keys(breakdown).map(cat => ({
          name: cat,
          value: breakdown[cat]
      })).sort((a,b) => b.value - a.value);
  }, [data.taxItems, data.transactions, selectedTaxYear]);

  // 5. PARENT & FD DATA (Existing logic)
  const parentTrend = useMemo(() => {
      return data.parentLogs.map(l => ({
          name: l.monthStr,
          Contributions: l.contributions,
          Expenses: l.expenses
      })).sort((a,b) => a.name.localeCompare(b.name)).slice(-6);
  }, [data.parentLogs]);

  const fdByBank = useMemo(() => {
      const grouped = data.fixedDeposits.reduce((acc, fd) => {
          acc[fd.bank] = (acc[fd.bank] || 0) + fd.principal;
          return acc;
      }, {} as Record<string, number>);
      return Object.keys(grouped).map(bank => ({ name: bank, Amount: grouped[bank] })).sort((a,b) => b.Amount - a.Amount);
  }, [data.fixedDeposits]);

  const maturingFDs = useMemo(() => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return data.fixedDeposits.filter(fd => {
          const due = new Date(fd.endDate);
          return due >= today && due <= nextWeek;
      }).sort((a,b) => a.endDate.localeCompare(b.endDate));
  }, [data.fixedDeposits]);


  // 6. SALARY STATS
  const salaryData = useMemo(() => {
      // Filter by selected year
      const logs = data.salaryLogs.filter(s => s.month.startsWith(selectedSalaryYear.toString()));
      
      // Map to Chart Format
      return logs.sort((a,b) => a.month.localeCompare(b.month)).map(s => {
          const monthName = new Date(s.month + '-01').toLocaleDateString('default', { month: 'short' });
          return {
              name: monthName,
              Basic: s.basic,
              Allowances: s.mobile + s.transport + s.wellness,
              Bonus: s.bonus + s.award + s.gesop,
              Others: s.others,
              Deductions: s.epf + s.eis + s.socso // Optional: visualize deductions
          }
      });
  }, [data.salaryLogs, selectedSalaryYear]);


  // --- HANDLERS ---
  const handleExportJSON = () => {
    const json = exportDataJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealthtrack_backup_full.json`;
    a.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          if (evt.target?.result) {
              const success = importData(evt.target.result as string);
              setImportStatus(success ? 'Success!' : 'Invalid File');
              setTimeout(() => setImportStatus(''), 3000);
          }
      };
      reader.readAsText(file);
  };

  const initiateReset = () => {
      // Generate a random 6-character alphanumeric code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      setResetCode(code);
      setResetInput('');
      setShowResetModal(true);
  };

  const confirmReset = () => {
      if (resetInput === resetCode) {
          resetData();
          setShowResetModal(false);
          // Optional: You could refresh the page or show a toast here
      }
  };

  return (
    <div className="space-y-6 pb-24">
        <h1 className="text-2xl font-bold text-gray-900">Analysis & Settings</h1>

        {/* Module Selector */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex overflow-x-auto no-scrollbar">
            {[
                { id: 'expenses', icon: <Wallet size={16}/>, label: 'Expenses' },
                { id: 'parent', icon: <Heart size={16}/>, label: 'Parent' },
                { id: 'invest', icon: <TrendingUp size={16}/>, label: 'Invest' },
                { id: 'fd', icon: <Landmark size={16}/>, label: 'FD' },
                { id: 'salary', icon: <Banknote size={16}/>, label: 'Salary' },
                { id: 'tax', icon: <FileText size={16}/>, label: 'Tax' },
            ].map(m => (
                <button 
                    key={m.id}
                    onClick={() => setModuleView(m.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${moduleView === m.id ? 'bg-ios-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    {m.icon} {m.label}
                </button>
            ))}
        </div>

        {/* --- VIEW: EXPENSES --- */}
        {moduleView === 'expenses' && (
            <>
                <Card title="Expense Breakdown (All Time)">
                    <div className="h-[250px] w-full">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-gray-400">No data</div>}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center mt-2">
                        {pieData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-1 text-xs">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                <span className="text-gray-600">{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Monthly Trend (Last 6 Months)">
                    <div className="h-[250px] w-full mt-2">
                        {monthlyTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyTrend}>
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false}/>
                                    <YAxis fontSize={10} tickLine={false} axisLine={false}/>
                                    <Tooltip />
                                    <Bar dataKey="income" fill="#34C759" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expense" fill="#FF3B30" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-gray-400">No data</div>}
                    </div>
                </Card>
            </>
        )}

        {/* --- VIEW: SALARY --- */}
        {moduleView === 'salary' && (
             <div className="space-y-6">
                <Card title="Salary Composition Breakdown">
                     <div className="flex justify-between items-center mb-4">
                        <div className="flex-1"></div>
                        <select 
                            value={selectedSalaryYear} 
                            onChange={e => setSelectedSalaryYear(parseInt(e.target.value))}
                            className="text-xs bg-gray-100 p-1.5 rounded-lg font-semibold border-none focus:ring-0"
                        >
                            {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                     </div>
                     <div className="h-[350px] w-full">
                        {salaryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={salaryData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false}/>
                                    <Tooltip cursor={{fill: '#f3f4f6'}} />
                                    <Legend wrapperStyle={{fontSize: '10px'}} />
                                    <Bar dataKey="Basic" stackId="a" fill="#007AFF" />
                                    <Bar dataKey="Allowances" stackId="a" fill="#34C759" />
                                    <Bar dataKey="Bonus" stackId="a" fill="#FF9500" />
                                    <Bar dataKey="Others" stackId="a" fill="#AF52DE" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-gray-400">No Salary Data for {selectedSalaryYear}</div>}
                    </div>
                </Card>
             </div>
        )}

        {/* --- VIEW: INVEST --- */}
        {moduleView === 'invest' && (
            <div className="space-y-6">
                <Card title="Share Performance">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                        <p className="text-xs text-gray-500">Comparing Cost vs Value vs Dividends.</p>
                        <select 
                            value={selectedShareCurrency} 
                            onChange={e => setSelectedShareCurrency(e.target.value)}
                            className="text-xs bg-gray-100 p-1.5 rounded-lg font-semibold border-none focus:ring-0"
                        >
                            <option value="All">All Currencies</option>
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="h-[300px] w-full">
                        {investShareData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={investShareData} margin={{ top: 20, right: 0, left: -20, bottom: 5 }}>
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0}/>
                                    <YAxis fontSize={10} tickLine={false} axisLine={false}/>
                                    <Tooltip cursor={{fill: '#f3f4f6'}} />
                                    <Legend wrapperStyle={{fontSize: '12px'}}/>
                                    <Bar dataKey="Cost" fill="#9CA3AF" name="Cost Basis" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Value" fill="#007AFF" name="Market Value" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Dividends" fill="#34C759" name="Accum. Dividends" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-gray-400">No active shares found</div>}
                    </div>
                </Card>

                <Card title="Detailed Transaction History">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                        <h4 className="text-sm font-bold text-gray-700">Yearly Breakdown</h4>
                        <select 
                            value={selectedHistoryYear} 
                            onChange={e => setSelectedHistoryYear(Number(e.target.value))}
                            className="text-xs bg-gray-100 p-1.5 rounded-lg font-semibold"
                        >
                            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="space-y-6">
                        {/* 1. SHARES HISTORY */}
                        <div>
                            <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Shares: Dividends & Sales</h5>
                            {shareHistory.length === 0 ? <p className="text-xs text-gray-400 italic">No activity in {selectedHistoryYear}</p> : (
                                <div className="space-y-4">
                                    {shareHistory.map((item: any) => (
                                        <div key={item.share.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-sm text-gray-800">{item.share.name}</span>
                                                <span className="text-[10px] text-gray-500">Held: {item.share.unitsHeld} units</span>
                                            </div>
                                            
                                            {/* Dividends */}
                                            {item.dividends.length > 0 && (
                                                <div className="mb-2">
                                                    <div className="flex justify-between items-center text-xs text-green-700 font-semibold mb-1">
                                                        <span>Dividends Received</span>
                                                        <span>Total: {item.totalDivAmount.toFixed(2)}</span>
                                                    </div>
                                                    {item.dividends.map((d: any) => (
                                                        <div key={d.id} className="flex justify-between text-[10px] text-gray-600 pl-2 border-l-2 border-green-200">
                                                            <span>{d.date}</span>
                                                            <span>{d.amount.toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                    <div className="text-[10px] text-gray-400 mt-1 text-right">
                                                        Annual Yield vs Spend (Held): <span className="font-bold text-green-600">{item.yieldPercent.toFixed(2)}%</span>
                                                        <br/>
                                                        <span className="text-[9px]">(Based on {item.currentCostBasis.toFixed(2)} cost basis)</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Sales */}
                                            {item.sales.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-gray-200">
                                                    <div className="text-xs text-red-700 font-semibold mb-1">Share Disposals</div>
                                                    {item.sales.map((s: any) => (
                                                        <div key={s.id} className="flex justify-between text-[10px] text-gray-600 pl-2 border-l-2 border-red-200 mb-1">
                                                            <div>
                                                                <span className="block">{s.date}</span>
                                                                <span className="text-gray-400">Sold {s.unitsSold} units</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="block font-medium">@{s.pricePerUnit.toFixed(2)}</span>
                                                                <span className="block font-bold">Total: {s.totalAmount.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 2. FUNDS HISTORY */}
                        <div className="pt-4 border-t border-gray-100">
                            <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Mutual Funds: Purchases & Sales</h5>
                            {fundHistory.purchases.length === 0 && fundHistory.sales.length === 0 ? <p className="text-xs text-gray-400 italic">No activity in {selectedHistoryYear}</p> : (
                                <div className="space-y-3">
                                    {fundHistory.purchases.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-blue-600 mb-1">Purchases</p>
                                            {fundHistory.purchases.map(p => (
                                                <div key={p.id} className="flex justify-between items-center bg-blue-50 p-2 rounded text-xs border border-blue-100 mb-1">
                                                    <div className="flex-1">
                                                        <span className="block font-medium truncate">{p.name}</span>
                                                        <span className="text-gray-400">{p.purchaseDate}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block font-bold">+{p.unitsHeld} units</span>
                                                        <span className="text-gray-500">@{p.purchasePrice.toFixed(4)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {fundHistory.sales.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-[10px] font-bold text-red-600 mb-1">Sales</p>
                                            {fundHistory.sales.map(s => (
                                                <div key={s.id} className="flex justify-between items-center bg-red-50 p-2 rounded text-xs border border-red-100 mb-1">
                                                    <div className="flex-1">
                                                        <span className="block font-medium truncate">{s.itemName}</span>
                                                        <span className="text-gray-400">{s.date}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block font-bold">-{s.unitsSold} units</span>
                                                        <span className="text-gray-500">@{s.pricePerUnit.toFixed(4)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <Card title="Mutual Funds Analysis">
                     {/* Summary Card */}
                     <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl p-4 mb-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-1">Total Spent</p>
                                <p className="font-bold text-gray-900">{fundSummary.cost.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500 uppercase mb-1">Current Value</p>
                                <p className="font-bold text-indigo-600">{fundSummary.value.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-indigo-100 flex justify-between items-center">
                             <span className="text-xs font-medium text-gray-500">Unrealized P/L</span>
                             <span className={`font-bold text-sm flex items-center gap-1 ${fundSummary.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                 {fundSummary.diff >= 0 ? <TrendingUp size={14}/> : <TrendingUp size={14} className="rotate-180"/>}
                                 {fundSummary.diff >= 0 ? '+' : ''}{fundSummary.diff.toLocaleString(undefined, {minimumFractionDigits: 2})} ({fundSummary.percent.toFixed(2)}%)
                             </span>
                        </div>
                    </div>
                    
                     <div className="flex justify-between items-center mb-4">
                        <select 
                            value={selectedHistoryYear} 
                            onChange={e => setSelectedHistoryYear(Number(e.target.value))}
                            className="text-xs bg-gray-100 p-1.5 rounded-lg font-semibold"
                        >
                            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                     </div>

                     {/* Historical Trend Chart (Area Chart) */}
                     <div className="mb-6">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Historical Value Trend (Avg of Start/End)</h4>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={fundHistoricalData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#5856D6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#5856D6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false}/>
                                    <Tooltip />
                                    <Area type="monotone" dataKey="AvgValue" stroke="#5856D6" fillOpacity={1} fill="url(#colorVal)" name="Avg Market Value"/>
                                    <Area type="monotone" dataKey="AvgCost" stroke="#9CA3AF" fill="none" name="Avg Cost"/>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-[10px] text-gray-400 text-center italic mt-1">
                            *Values are averaged from 1st and last available snapshots of the month.
                        </p>
                     </div>

                     {/* Monthly Purchase Chart */}
                     <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Funds Purchased in {selectedHistoryYear}</h4>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={fundMonthlyPurchaseData}>
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false}/>
                                    <Tooltip />
                                    <Legend wrapperStyle={{fontSize: '10px'}}/>
                                    <Bar dataKey="PurchaseCost" fill="#9CA3AF" name="Purchase Cost" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="MarketValue" fill="#8884d8" name="Current Value" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                     </div>
                </Card>
            </div>
        )}

        {/* --- VIEW: PARENT --- */}
        {moduleView === 'parent' && (
             <Card title="Parent Care Flow">
                <div className="h-[250px] w-full mt-2">
                    {parentTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={parentTrend}>
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false}/>
                                <YAxis fontSize={10} tickLine={false} axisLine={false}/>
                                <Tooltip />
                                <Legend wrapperStyle={{fontSize: '12px'}}/>
                                <Bar dataKey="Contributions" fill="#34C759" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Expenses" fill="#FF3B30" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-gray-400">No Parent Logs</div>}
                </div>
            </Card>
        )}

         {/* --- VIEW: FD --- */}
         {moduleView === 'fd' && (
             <div className="space-y-6">
                 {/* MATURING ALERT */}
                 <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                     <div className="flex items-center gap-2 mb-3">
                         <AlertCircle size={20} className="text-orange-500"/>
                         <h3 className="font-bold text-orange-800">Maturing Next 7 Days</h3>
                     </div>
                     {maturingFDs.length > 0 ? (
                         <div className="space-y-2">
                             {maturingFDs.map(fd => (
                                 <div key={fd.id} className="bg-white p-3 rounded-lg border border-orange-100 flex justify-between items-center shadow-sm">
                                     <div>
                                         <p className="font-bold text-gray-800">{fd.bank}</p>
                                         <p className="text-xs text-gray-500">{fd.slipNumber}</p>
                                     </div>
                                     <div className="text-right">
                                         <p className="font-bold text-orange-600">{fd.endDate}</p>
                                         <p className="text-xs text-gray-400">Principal: {fd.principal.toLocaleString()}</p>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     ) : (
                         <p className="text-sm text-gray-500 italic">No deposits maturing in the coming week.</p>
                     )}
                 </div>

                 {/* BANK BREAKDOWN */}
                 <Card title="Total FD Allocation per Bank">
                    <div className="h-[250px] w-full mt-2">
                        {fdByBank.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={fdByBank}>
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false}/>
                                    <YAxis fontSize={10} tickLine={false} axisLine={false}/>
                                    <Tooltip />
                                    <Bar dataKey="Amount" fill="#00C49F" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-gray-400">No Fixed Deposits</div>}
                    </div>
                </Card>
             </div>
         )}

        {/* --- VIEW: TAX --- */}
        {moduleView === 'tax' && (
            <div className="space-y-6">
                <Card title="Tax Relief by Category">
                     <div className="flex justify-between items-center mb-4">
                        <div className="flex-1"></div>
                        <select 
                            value={selectedTaxYear} 
                            onChange={e => setSelectedTaxYear(parseInt(e.target.value))}
                            className="text-xs bg-gray-100 p-1.5 rounded-lg font-semibold border-none focus:ring-0"
                        >
                            {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                     </div>
                     <div className="h-[300px] w-full">
                        {taxByCategory.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={taxByCategory} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={80}/>
                                    <YAxis fontSize={10} tickLine={false} axisLine={false}/>
                                    <Tooltip cursor={{fill: '#f3f4f6'}} />
                                    <Bar dataKey="value" fill="#5856D6" radius={[4, 4, 0, 0]} name="Amount" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-gray-400">No Tax Data for {selectedTaxYear}</div>}
                    </div>
                </Card>

                <Card title="Annual Trend (Total Eligible)">
                    <div className="h-[250px] w-full mt-2">
                        {taxByYear.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={taxByYear}>
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false}/>
                                    <YAxis fontSize={10} tickLine={false} axisLine={false}/>
                                    <Tooltip />
                                    <Bar dataKey="Amount" fill="#818CF8" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-gray-400">No Historical Data</div>}
                    </div>
                </Card>
            </div>
        )}

        {/* Global Settings */}
        <Card title="Data Management">
            <div className="space-y-4">
                <p className="text-sm text-gray-500">Backup your data or transfer to another device.</p>
                
                <Button onClick={handleExportJSON} variant="secondary" className="w-full flex justify-center items-center gap-2">
                    <FileDown size={18} /> Export Full Backup (JSON)
                </Button>

                <div className="relative">
                    <input 
                        type="file" 
                        accept=".json"
                        onChange={handleImportFile}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button variant="primary" className="w-full flex justify-center items-center gap-2">
                        <Upload size={18} /> Import Backup
                    </Button>
                </div>
                {importStatus && <p className="text-center text-sm font-semibold text-green-600">{importStatus}</p>}

                {/* Reset Data Button */}
                <Button onClick={initiateReset} variant="danger" className="w-full mt-4 flex justify-center items-center gap-2">
                    <Trash2 size={18} /> Reset All Data
                </Button>
            </div>
        </Card>

        {/* RESET CONFIRMATION MODAL */}
        {showResetModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <div className="flex items-center gap-2 text-red-600 font-bold">
                            <AlertTriangle size={20}/>
                            <h3>Reset Application Data</h3>
                        </div>
                        <button onClick={() => setShowResetModal(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={20}/>
                        </button>
                    </div>
                    
                    <div className="text-center space-y-3">
                        <p className="text-sm text-gray-600">
                            This action will <span className="font-bold text-red-600">permanently delete</span> all your transactions, investments, and settings. This cannot be undone.
                        </p>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Type the code below to confirm</p>
                        <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
                            <p className="font-mono text-2xl font-bold tracking-widest text-gray-800 select-none">{resetCode}</p>
                        </div>
                    </div>

                    <Input 
                        value={resetInput} 
                        onChange={e => setResetInput(e.target.value)} 
                        placeholder="Enter code here" 
                        className="text-center font-bold tracking-widest uppercase"
                        autoFocus
                    />

                    <div className="flex gap-2">
                         <Button variant="secondary" onClick={() => setShowResetModal(false)} className="flex-1">Cancel</Button>
                         <Button 
                            variant="danger" 
                            onClick={confirmReset} 
                            disabled={resetInput !== resetCode}
                            className={`flex-1 ${resetInput !== resetCode ? 'opacity-50 cursor-not-allowed' : ''}`}
                         >
                             Confirm Reset
                         </Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
