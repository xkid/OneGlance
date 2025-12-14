
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppData, Transaction, ParentCareLog, InvestmentItem, DividendLog, TaxReliefItem, SaleLog, FixedDeposit, FundSnapshot, PurchaseLog, SalaryLog, FDMaturityLog } from '../types';

interface AppContextType {
  data: AppData;
  addTransaction: (t: Transaction) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
  updateParentLog: (log: ParentCareLog) => void;
  addInvestment: (i: InvestmentItem) => void;
  updateInvestment: (i: InvestmentItem) => void;
  deleteInvestment: (id: string) => void;
  recordInvestmentSale: (log: SaleLog) => void;
  updateInvestmentPrice: (id: string, price: number) => void;
  addDividend: (d: DividendLog) => void;
  captureFundSnapshot: () => void;
  addTaxItem: (t: TaxReliefItem) => void;
  updateTaxItem: (t: TaxReliefItem) => void;
  deleteTaxItem: (id: string) => void;
  addFixedDeposit: (fd: FixedDeposit) => void;
  updateFixedDeposit: (fd: FixedDeposit) => void;
  deleteFixedDeposit: (id: string) => void;
  collectFixedDeposit: (log: FDMaturityLog, action: 'withdraw' | 'renew', payload?: string | FixedDeposit) => void; // Updated signature
  addSalaryLog: (s: SalaryLog) => void;
  deleteSalaryLog: (id: string) => void;
  resetData: () => void;
  importData: (jsonData: string) => boolean;
  exportDataJSON: () => string;
  exportDataCSV: (module: 'expenses' | 'parent' | 'investments' | 'tax' | 'fd' | 'fund_history' | 'salary' | 'fd_history') => string;
}

const defaultData: AppData = {
  transactions: [],
  parentLogs: [],
  investments: [], 
  dividends: [],
  sales: [],
  fundSnapshots: [],
  taxItems: [],
  fixedDeposits: [],
  fdMaturityLogs: [], // New
  salaryLogs: []
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(defaultData);

  // Load from LocalStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('wealthtrack_data');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        
        // Migration: Ensure parent logs have contributionDetails, expenseDetails and bbfNotes
        if (parsed.parentLogs) {
            parsed.parentLogs = parsed.parentLogs.map((log: any) => ({
                ...log,
                contributionDetails: log.contributionDetails || [],
                expenseDetails: log.expenseDetails || (log.expenses > 0 ? [{ id: 'legacy', category: 'Others', amount: log.expenses, notes: 'Legacy Migration' }] : []),
                bbfNotes: log.bbfNotes || (log.bbfNote ? { "General Balance": log.bbfNote } : {})
            }));
        }
        // Migration: Ensure arrays exists
        if (!parsed.sales) parsed.sales = [];
        if (!parsed.fixedDeposits) parsed.fixedDeposits = [];
        if (!parsed.fundSnapshots) parsed.fundSnapshots = [];
        if (!parsed.salaryLogs) parsed.salaryLogs = [];
        if (!parsed.fdMaturityLogs) parsed.fdMaturityLogs = [];

        setData(parsed);
      } catch (e) {
        console.error("Failed to parse local storage", e);
      }
    }
  }, []);

  // Save to LocalStorage on change
  useEffect(() => {
    localStorage.setItem('wealthtrack_data', JSON.stringify(data));
  }, [data]);

  const addTransaction = (t: Transaction) => {
    setData(prev => ({ ...prev, transactions: [t, ...prev.transactions] }));
  };

  const updateTransaction = (updatedT: Transaction) => {
    setData(prev => ({
        ...prev,
        transactions: prev.transactions.map(t => t.id === updatedT.id ? updatedT : t)
    }));
  };

  const deleteTransaction = (id: string) => {
    setData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
  };

  const updateParentLog = (log: ParentCareLog) => {
    setData(prev => {
      const exists = prev.parentLogs.find(l => l.id === log.id);
      let newLogs;
      if (exists) {
        newLogs = prev.parentLogs.map(l => l.id === log.id ? log : l);
      } else {
        newLogs = [...prev.parentLogs, log];
      }
      return { ...prev, parentLogs: newLogs };
    });
  };

  const addInvestment = (newItem: InvestmentItem) => {
    setData(prev => {
        // Check if holding already exists (Same Symbol AND Same Type)
        // Normalized check (case insensitive for symbol)
        const existingIndex = prev.investments.findIndex(i => 
            i.symbol.toLowerCase() === newItem.symbol.toLowerCase() && i.type === newItem.type
        );

        if (existingIndex > -1) {
            // Accumulate
            const existing = prev.investments[existingIndex];
            
            // Calculate new Weighted Average Price
            const totalCostOld = existing.unitsHeld * existing.purchasePrice;
            const totalCostNew = newItem.unitsHeld * newItem.purchasePrice;
            const newTotalUnits = existing.unitsHeld + newItem.unitsHeld;
            
            // Weighted Average: (Old Total Cost + New Total Cost) / New Total Units
            const newAvgPrice = newTotalUnits > 0 ? (totalCostOld + totalCostNew) / newTotalUnits : 0;

            // Generate History Log for the new purchase
            const newPurchaseLog: PurchaseLog = {
                id: Date.now().toString(),
                date: newItem.purchaseDate,
                units: newItem.unitsHeld,
                price: newItem.purchasePrice,
                cost: totalCostNew,
                agent: newItem.agent
            };

            // Ensure existing has history initialized if legacy
            const existingHistory: PurchaseLog[] = existing.purchaseHistory || [
                {
                    id: 'legacy_init_' + existing.id,
                    date: existing.purchaseDate,
                    units: existing.unitsHeld,
                    price: existing.purchasePrice,
                    cost: totalCostOld,
                    agent: existing.agent
                }
            ];
            
            // Logic for Agent Merging:
            // If the agents are different (e.g., 'Public Mutual' vs 'Direct'), set to 'Multiple'.
            // If they are the same, keep the existing one.
            const newAgent = existing.agent === 'Multiple' || existing.agent !== newItem.agent 
                             ? 'Multiple' 
                             : existing.agent;

            const updatedItem: InvestmentItem = {
                ...existing,
                unitsHeld: newTotalUnits,
                purchasePrice: newAvgPrice,
                purchaseHistory: [...existingHistory, newPurchaseLog],
                agent: newAgent,
                // Update purchase date to reflect latest activity, or keep original? 
                // Usually for a holding card, the 'last buy' date is useful, but the history array tracks details.
                purchaseDate: newItem.purchaseDate, 
            };

            const newInvestments = [...prev.investments];
            newInvestments[existingIndex] = updatedItem;
            return { ...prev, investments: newInvestments };
        } else {
            // New Holding
            // Initialize history
            const history: PurchaseLog[] = [{
                id: Date.now().toString(),
                date: newItem.purchaseDate,
                units: newItem.unitsHeld,
                price: newItem.purchasePrice,
                cost: newItem.unitsHeld * newItem.purchasePrice,
                agent: newItem.agent
            }];
            return { ...prev, investments: [...prev.investments, { ...newItem, purchaseHistory: history }] };
        }
    });
  };

  const updateInvestment = (updatedItem: InvestmentItem) => {
      setData(prev => ({
          ...prev,
          investments: prev.investments.map(i => i.id === updatedItem.id ? updatedItem : i)
      }));
  };

  const deleteInvestment = (id: string) => {
      setData(prev => ({ ...prev, investments: prev.investments.filter(i => i.id !== id) }));
  };

  const recordInvestmentSale = (log: SaleLog) => {
      setData(prev => {
          // 1. Add Sales Log
          const newSales = [...prev.sales, log];
          
          // 2. Update Units Held
          const newInvestments = prev.investments.map(i => {
              if (i.id === log.investmentId) {
                  return { ...i, unitsHeld: Math.max(0, i.unitsHeld - log.unitsSold) };
              }
              return i;
          });

          return { ...prev, sales: newSales, investments: newInvestments };
      });
  };

  const updateInvestmentPrice = (id: string, price: number) => {
    setData(prev => ({
      ...prev,
      investments: prev.investments.map(i => i.id === id ? { ...i, currentPrice: price, lastUpdated: new Date().toISOString() } : i)
    }));
  };

  const addDividend = (d: DividendLog) => {
    setData(prev => ({ ...prev, dividends: [...prev.dividends, d] }));
  };

  const captureFundSnapshot = () => {
    setData(prev => {
        const today = new Date().toISOString().split('T')[0];
        // Check if snapshot already exists for today to avoid duplicates
        const existingIndex = prev.fundSnapshots.findIndex(s => s.date === today);
        
        const funds = prev.investments.filter(i => i.type === 'fund' && i.unitsHeld > 0);
        const totalCost = funds.reduce((sum, f) => sum + (f.purchasePrice * f.unitsHeld), 0);
        const totalValue = funds.reduce((sum, f) => sum + ((f.currentPrice || f.purchasePrice) * f.unitsHeld), 0);

        const newSnapshot: FundSnapshot = {
            id: existingIndex >= 0 ? prev.fundSnapshots[existingIndex].id : Date.now().toString(),
            date: today,
            totalCost,
            totalValue
        };

        let newSnapshots = [...prev.fundSnapshots];
        if (existingIndex >= 0) {
            newSnapshots[existingIndex] = newSnapshot;
        } else {
            newSnapshots.push(newSnapshot);
        }

        return { ...prev, fundSnapshots: newSnapshots };
    });
  };

  const addTaxItem = (t: TaxReliefItem) => {
    setData(prev => ({ ...prev, taxItems: [...prev.taxItems, t] }));
  };

  const updateTaxItem = (updatedItem: TaxReliefItem) => {
    setData(prev => ({
        ...prev,
        taxItems: prev.taxItems.map(t => t.id === updatedItem.id ? updatedItem : t)
    }));
  };

  const deleteTaxItem = (id: string) => {
    setData(prev => ({ ...prev, taxItems: prev.taxItems.filter(t => t.id !== id) }));
  };

  const addFixedDeposit = (fd: FixedDeposit) => {
    setData(prev => ({ ...prev, fixedDeposits: [...prev.fixedDeposits, fd] }));
  };

  const updateFixedDeposit = (updatedFD: FixedDeposit) => {
    setData(prev => ({
      ...prev,
      fixedDeposits: prev.fixedDeposits.map(fd => fd.id === updatedFD.id ? updatedFD : fd)
    }));
  };

  const deleteFixedDeposit = (id: string) => {
    setData(prev => ({ ...prev, fixedDeposits: prev.fixedDeposits.filter(fd => fd.id !== id) }));
  };

  const collectFixedDeposit = (log: FDMaturityLog, action: 'withdraw' | 'renew', payload?: string | FixedDeposit) => {
      setData(prev => {
          const newLogs = [...(prev.fdMaturityLogs || []), log];
          let newFDs = prev.fixedDeposits;

          if (action === 'withdraw' && typeof payload === 'string') {
              newFDs = newFDs.filter(fd => fd.id !== payload);
          } else if (action === 'renew' && typeof payload === 'object' && payload !== null) {
              const updatedFD = payload as FixedDeposit;
              newFDs = newFDs.map(fd => fd.id === updatedFD.id ? updatedFD : fd);
          }

          return {
              ...prev,
              fdMaturityLogs: newLogs,
              fixedDeposits: newFDs
          };
      });
  };

  const addSalaryLog = (s: SalaryLog) => {
      setData(prev => {
          // Check for existing log for this month? Assuming multiple allowed, or overwrite.
          // Let's assume append for now to be safe, but ideally check overlaps.
          const newLogs = [...prev.salaryLogs, s];
          
          // SOCSO Sync Logic
          let newTaxItems = prev.taxItems;
          if (s.socso > 0) {
              const year = parseInt(s.month.split('-')[0]);
              // Check if a SOCSO entry for this salary log already exists (by ID reference or implicit)
              // Since we don't have direct linking, we just add a new TaxReliefItem.
              // We'll mark it with description "SOCSO - [Month]"
              
              const taxItem: TaxReliefItem = {
                  id: 'socso-sync-' + s.id,
                  year: year,
                  category: 'SOCSO',
                  description: `SOCSO Deduction - ${s.month}`,
                  amount: s.socso,
                  date: `${s.month}-28`, // Approximate date
                  hasEInvoice: false,
                  fromExpenses: false // It's from Salary, effectively
              };
              newTaxItems = [...newTaxItems, taxItem];
          }

          return { ...prev, salaryLogs: newLogs, taxItems: newTaxItems };
      });
  };

  const deleteSalaryLog = (id: string) => {
      setData(prev => {
          const newLogs = prev.salaryLogs.filter(s => s.id !== id);
          // Remove associated SOCSO tax item if it exists
          const newTaxItems = prev.taxItems.filter(t => t.id !== 'socso-sync-' + id);
          return { ...prev, salaryLogs: newLogs, taxItems: newTaxItems };
      });
  };

  const resetData = () => {
    // Reset to factory default data
    setData(defaultData);
  };

  const importData = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      // Basic validation
      if (parsed.transactions && parsed.investments) {
        // Migration safety
        if (parsed.parentLogs) {
            parsed.parentLogs = parsed.parentLogs.map((log: any) => ({
                ...log,
                contributionDetails: log.contributionDetails || [],
                expenseDetails: log.expenseDetails || (log.expenses > 0 ? [{ id: 'legacy', category: 'Others', amount: log.expenses, notes: 'Legacy Migration' }] : []),
                bbfNotes: log.bbfNotes || (log.bbfNote ? { "General Balance": log.bbfNote } : {})
            }));
        }
        if (!parsed.sales) parsed.sales = [];
        if (!parsed.fixedDeposits) parsed.fixedDeposits = [];
        if (!parsed.fundSnapshots) parsed.fundSnapshots = [];
        if (!parsed.salaryLogs) parsed.salaryLogs = [];
        if (!parsed.fdMaturityLogs) parsed.fdMaturityLogs = [];
        
        setData(parsed);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const exportDataJSON = () => JSON.stringify(data, null, 2);

  const exportDataCSV = (module: 'expenses' | 'parent' | 'investments' | 'tax' | 'fd' | 'fund_history' | 'salary' | 'fd_history'): string => {
    let header = "";
    let rows: string[] = [];

    if (module === 'expenses') {
      header = "Date,Description,Category,Type,Amount,TaxRelief,Receipt,EInvoice";
      rows = data.transactions.map(t => 
        `${t.date},"${t.description}",${t.category},${t.type},${t.amount},${t.isTaxRelief ? 'Yes' : 'No'},"${t.receiptNumber || ''}",${t.hasEInvoice ? 'Yes' : 'No'}`
      );
    } else if (module === 'parent') {
      header = "Month,BalanceNotes,TotalContributions,Details,TotalExpenses,ExpenseDetails,Notes";
      rows = data.parentLogs.map(p => {
          const contribs = p.contributionDetails ? p.contributionDetails.map(d => `[${d.date || 'ND'}] ${d.name} (${d.source || 'N/A'}):${d.amount}`).join(';') : '';
          const expenses = p.expenseDetails ? p.expenseDetails.map(d => `[${d.date || 'ND'}] ${d.category} (PaidFrom: ${d.deductFrom || 'Gen'}; Shared: ${d.sharedWith || 'No'}; ShareOnly?: ${d.deductShareOnly}):${d.amount}`).join(';') : '';
          const bbfNotesStr = p.bbfNotes ? Object.entries(p.bbfNotes).map(([k,v]) => `${k}:${v}`).join('|') : '';
          return `${p.monthStr},"${bbfNotesStr}",${p.contributions},"${contribs}",${p.expenses},"${expenses}","${p.notes}"`
      });
    } else if (module === 'investments') {
      header = "RecordType,Name,Symbol,Agent,Date,Units,Price,Amount,Notes";
      
      const portfolioRows = data.investments.map(i => {
         const mainRow = `HOLDING,"${i.name}",${i.symbol},${i.agent},${i.purchaseDate},${i.unitsHeld},${i.purchasePrice},${(i.unitsHeld * i.purchasePrice).toFixed(2)},"CurrentPrice: ${i.currentPrice || 0}; AvgPrice: ${i.purchasePrice}"`;
         // Export history as separate rows if needed, or simply append info. Let's do separate rows for clarity
         const histRows = i.purchaseHistory ? i.purchaseHistory.map(h => 
            `HISTORY,"${i.name}",${i.symbol},${h.agent},${h.date},${h.units},${h.price},${h.cost},`
         ).join('\n') : '';
         return mainRow + (histRows ? '\n' + histRows : '');
      });

      const saleRows = data.sales.map(s => 
        `SALE,"${s.itemName}",,${s.agent},${s.date},${s.unitsSold},${s.pricePerUnit},${s.totalAmount.toFixed(2)},`
      );

      const divRows = data.dividends.map(d => {
          const inv = data.investments.find(i => i.id === d.investmentId);
          return `DIVIDEND,"${inv?.name || 'Unknown'}",${inv?.symbol || ''},${inv?.agent || ''},${d.date},${d.unitsHeldSnapshot},,${d.amount.toFixed(2)},"${d.notes || ''}"`
      });

      rows = [...portfolioRows, ...saleRows, ...divRows];

    } else if (module === 'tax') {
      header = "Year,Category,Description,Date,Amount,Receipt,EInvoice,Source";
      rows = data.taxItems.map(t => 
        `${t.year},${t.category},"${t.description}",${t.date},${t.amount},${t.receiptNumber || ''},${t.hasEInvoice},Manual`
      );
      // Append synced tax items from transactions
      const syncedRows = data.transactions
        .filter(t => t.isTaxRelief)
        .map(t => {
           const year = t.date.split('-')[0];
           return `${year},${t.category},"${t.description}",${t.date},${t.amount},"${t.receiptNumber || ''}",${t.hasEInvoice ? 'Yes' : 'No'},Expenses`;
        });
      rows = [...rows, ...syncedRows];
    } else if (module === 'fd') {
      header = "Bank,SlipNumber,StartDate,MaturityDate,Rate,Principal,Remarks";
      rows = data.fixedDeposits.map(fd => 
        `"${fd.bank}","${fd.slipNumber}",${fd.startDate},${fd.endDate},${fd.rate},${fd.principal},"${fd.remarks || ''}"`
      );
    } else if (module === 'fd_history') {
      header = "DateCollected,Bank,SlipNumber,Principal,InterestEarned,RateSnapshot,Year";
      rows = (data.fdMaturityLogs || []).map(log => 
        `${log.date},"${log.bank}","${log.slipNumber}",${log.principal},${log.interestEarned},${log.rateSnapshot},${log.year}`
      );
    } else if (module === 'fund_history') {
      header = "Date,TotalCost,TotalValue";
      rows = data.fundSnapshots.map(s => 
        `${s.date},${s.totalCost.toFixed(2)},${s.totalValue.toFixed(2)}`
      );
    } else if (module === 'salary') {
      header = "Month,Basic,Mobile,Transport,Wellness,Award,Bonus,GESOP,EPF,EIS,SOCSO,Others,Notes";
      rows = data.salaryLogs.map(s =>
        `${s.month},${s.basic},${s.mobile},${s.transport},${s.wellness},${s.award},${s.bonus},${s.gesop},${s.epf},${s.eis},${s.socso},${s.others},"${s.notes || ''}"`
      );
    }

    return [header, ...rows].join("\n");
  };

  return (
    <AppContext.Provider value={{ 
      data, addTransaction, updateTransaction, deleteTransaction, updateParentLog, 
      addInvestment, updateInvestment, deleteInvestment, recordInvestmentSale, updateInvestmentPrice, addDividend, 
      captureFundSnapshot,
      addTaxItem, updateTaxItem, deleteTaxItem, 
      addFixedDeposit, updateFixedDeposit, deleteFixedDeposit, collectFixedDeposit,
      addSalaryLog, deleteSalaryLog,
      resetData,
      importData, exportDataJSON, exportDataCSV 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
