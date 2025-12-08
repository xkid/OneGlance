

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { STOCK_AGENTS, InvestmentItem, PREDEFINED_STOCKS, PREDEFINED_FUNDS, SaleLog, DividendLog, CURRENCIES } from '../types';
import { Card, Button, Input, Select, Badge } from '../components/Shared';
import { fetchMarketPrice } from '../services/geminiService';
import { Plus, RefreshCw, TrendingUp, TrendingDown, ExternalLink, Download, Edit2, DollarSign, Coins, X, StickyNote } from 'lucide-react';

export const InvestmentsView: React.FC = () => {
  const { data, addInvestment, updateInvestment, recordInvestmentSale, updateInvestmentPrice, addDividend, exportDataCSV } = useApp();
  const [activeTab, setActiveTab] = useState<'share' | 'fund'>('share');
  const [loading, setLoading] = useState<string | null>(null);
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showDivModal, setShowDivModal] = useState(false);

  // Form Data States
  const [currentItem, setCurrentItem] = useState<Partial<InvestmentItem>>({ type: 'share', agent: 'Direct', currency: 'MYR' });
  const [saleData, setSaleData] = useState({ units: '', price: '', date: new Date().toISOString().split('T')[0] });
  const [divData, setDivData] = useState({ amount: '', date: new Date().toISOString().split('T')[0], notes: '' });

  // Filtering
  const items = data.investments.filter(i => i.type === activeTab && i.unitsHeld > 0);
  
  // Calculations (Simplified mixed currency sum for display)
  // Note: Ideally we convert everything to base currency, but for now we sum raw values
  // or primarily treat as MYR visual
  const currentValue = items.reduce((sum, i) => sum + ((i.currentPrice || i.purchasePrice) * i.unitsHeld), 0);
  const totalInvested = items.reduce((sum, i) => sum + (i.purchasePrice * i.unitsHeld), 0);
  
  const totalPL = currentValue - totalInvested;
  const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  const handleUpdatePrice = async (id: string, symbol: string, name: string) => {
    setLoading(id);
    const result = await fetchMarketPrice(symbol, name);
    if (result) {
        updateInvestmentPrice(id, result.price);
    } else {
        alert("Could not fetch price. Try again later.");
    }
    setLoading(null);
  };

  // --- ADD / EDIT HANDLERS ---
  const openAddModal = () => {
      setCurrentItem({ type: activeTab, agent: 'Direct', currency: 'MYR', purchaseDate: new Date().toISOString().split('T')[0] });
      setShowAddModal(true);
  };

  const openEditModal = (item: InvestmentItem) => {
      setCurrentItem({ ...item, currency: item.currency || 'MYR' });
      setShowEditModal(true);
  };

  const handleSaveItem = () => {
      if(currentItem.name && currentItem.symbol && currentItem.purchasePrice && currentItem.unitsHeld) {
          const itemPayload: InvestmentItem = {
              id: currentItem.id || Date.now().toString(),
              type: activeTab,
              name: currentItem.name,
              symbol: currentItem.symbol,
              agent: currentItem.agent || 'Direct',
              purchasePrice: Number(currentItem.purchasePrice),
              currency: currentItem.currency || 'MYR',
              unitsHeld: Number(currentItem.unitsHeld),
              purchaseDate: currentItem.purchaseDate || new Date().toISOString().split('T')[0],
              currentPrice: currentItem.currentPrice || Number(currentItem.purchasePrice),
              notes: currentItem.notes || ''
          };

          if (currentItem.id) {
              updateInvestment(itemPayload);
          } else {
              addInvestment(itemPayload);
          }
          setShowAddModal(false);
          setShowEditModal(false);
      }
  };

  // --- SELL HANDLERS ---
  const openSellModal = (item: InvestmentItem) => {
      setCurrentItem(item);
      setSaleData({ units: '', price: item.currentPrice?.toString() || item.purchasePrice.toString(), date: new Date().toISOString().split('T')[0] });
      setShowSellModal(true);
  };

  const handleConfirmSell = () => {
      if (!currentItem.id || !saleData.units || !saleData.price) return;
      const unitsSold = parseFloat(saleData.units);
      const priceSold = parseFloat(saleData.price);
      
      if (unitsSold > (currentItem.unitsHeld || 0)) {
          alert("Cannot sell more units than held!");
          return;
      }

      const saleLog: SaleLog = {
          id: Date.now().toString(),
          investmentId: currentItem.id,
          date: saleData.date,
          unitsSold: unitsSold,
          pricePerUnit: priceSold,
          totalAmount: unitsSold * priceSold,
          itemName: currentItem.name || 'Unknown',
          agent: currentItem.agent || 'Direct'
      };

      recordInvestmentSale(saleLog);
      setShowSellModal(false);
  };

  // --- DIVIDEND HANDLERS ---
  const openDivModal = (item: InvestmentItem) => {
      setCurrentItem(item);
      setDivData({ amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
      setShowDivModal(true);
  };

  const handleConfirmDiv = () => {
      if (!currentItem.id || !divData.amount) return;
      const divLog: DividendLog = {
          id: Date.now().toString(),
          investmentId: currentItem.id,
          date: divData.date,
          amount: parseFloat(divData.amount),
          unitsHeldSnapshot: currentItem.unitsHeld || 0,
          notes: divData.notes
      };
      addDividend(divLog);
      setShowDivModal(false);
  };

  // --- PRESETS ---
  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (!val) return;
      const list = activeTab === 'share' ? PREDEFINED_STOCKS : PREDEFINED_FUNDS;
      const selected = list.find(item => item.symbol === val);
      if (selected) {
          setCurrentItem({ 
            ...currentItem, 
            name: selected.name, 
            symbol: selected.symbol,
            type: activeTab
          });
      }
  };

   const handleDownload = () => {
      const csv = exportDataCSV('investments');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = 'investments_data.csv';
      a.click();
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
        <button onClick={handleDownload} className="p-2 bg-gray-100 rounded-full text-gray-600">
            <Download size={20} />
        </button>
      </div>

      {/* Segmented Control */}
      <div className="bg-gray-200 p-1 rounded-xl flex">
        <button 
            onClick={() => setActiveTab('share')}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'share' ? 'bg-white shadow text-black' : 'text-gray-500'}`}
        >
            Shares
        </button>
        <button 
            onClick={() => setActiveTab('fund')}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'fund' ? 'bg-white shadow text-black' : 'text-gray-500'}`}
        >
            Mutual Funds
        </button>
      </div>

      {/* Portfolio Summary */}
      <Card className="bg-gray-900 text-white">
        <div className="grid grid-cols-2 gap-6">
            <div>
                <p className="text-gray-400 text-xs uppercase mb-1">Estimated Value</p>
                <p className="text-2xl font-bold">{currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-gray-400">Total</span></p>
            </div>
            <div>
                 <p className="text-gray-400 text-xs uppercase mb-1">Total Return</p>
                 <div className={`flex items-center gap-1 font-bold text-lg ${totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalPL >= 0 ? <TrendingUp size={18}/> : <TrendingDown size={18}/>}
                    {Math.abs(totalPLPercent).toFixed(2)}%
                 </div>
                 <p className={`text-xs ${totalPL >= 0 ? 'text-green-400/80' : 'text-red-400/80'}`}>
                    {totalPL >= 0 ? '+' : ''}{totalPL.toLocaleString()}
                 </p>
            </div>
        </div>
      </Card>

      {/* List */}
      <div className="flex justify-between items-center px-1">
          <h3 className="font-semibold text-gray-700">Holdings ({items.length})</h3>
          <Button variant="ghost" onClick={openAddModal} className="flex items-center gap-1 text-xs">
              <Plus size={16}/> Add New
          </Button>
      </div>

      <div className="space-y-4">
        {items.map(item => {
            const pl = ((item.currentPrice || item.purchasePrice) - item.purchasePrice) * item.unitsHeld;
            const plPerc = (((item.currentPrice || item.purchasePrice) - item.purchasePrice) / item.purchasePrice) * 100;
            const currency = item.currency || 'MYR';

            return (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-900 text-sm max-w-[150px] truncate">{item.name}</h4>
                                <Badge color="gray">{item.symbol}</Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{item.agent} • {item.unitsHeld} Units</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-gray-900">{currency} {(item.currentPrice || item.purchasePrice).toFixed(2)}</p>
                            <p className="text-xs text-gray-400">Curr Price</p>
                        </div>
                    </div>
                    
                    {item.notes && (
                        <div className="mb-3 bg-yellow-50 p-2 rounded text-xs text-yellow-800 flex items-start gap-1">
                            <StickyNote size={12} className="mt-0.5 flex-shrink-0"/>
                            <span>{item.notes}</span>
                        </div>
                    )}
                    
                    <div className="flex justify-between items-center border-t border-gray-50 pt-3 mb-3">
                        <div>
                             <p className={`text-sm font-semibold flex items-center gap-1 ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {pl >= 0 ? '+' : ''}{currency} {pl.toFixed(2)} ({plPerc.toFixed(1)}%)
                             </p>
                             <p className="text-xs text-gray-400">Unrealized P/L</p>
                        </div>
                        <Button 
                            variant="secondary" 
                            className="text-xs py-1.5 px-3 flex items-center gap-1"
                            onClick={() => handleUpdatePrice(item.id, item.symbol, item.name)}
                            disabled={loading === item.id}
                        >
                            {loading === item.id ? <RefreshCw className="animate-spin" size={14}/> : <RefreshCw size={14}/>}
                            Update
                        </Button>
                    </div>

                    {/* Action Toolbar */}
                    <div className="flex gap-2 border-t border-gray-50 pt-3">
                        <button onClick={() => openEditModal(item)} className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 py-2 rounded hover:bg-gray-100">
                           <Edit2 size={12}/> Edit
                        </button>
                        <button onClick={() => openSellModal(item)} className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-red-600 bg-red-50 py-2 rounded hover:bg-red-100">
                           <DollarSign size={12}/> Sell
                        </button>
                        {item.type === 'share' && (
                             <button onClick={() => openDivModal(item)} className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-green-600 bg-green-50 py-2 rounded hover:bg-green-100">
                                <Coins size={12}/> Dividend
                             </button>
                        )}
                    </div>

                    {item.lastUpdated && <p className="text-[10px] text-gray-300 mt-2 text-right">Updated: {new Date(item.lastUpdated).toLocaleDateString()}</p>}
                </div>
            )
        })}
      </div>

      {/* --- ADD / EDIT MODAL --- */}
      {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar">
                  <div className="p-4 border-b border-gray-100 font-bold text-center flex justify-between items-center">
                      <span>{showEditModal ? 'Edit' : 'Add'} {activeTab === 'share' ? 'Share' : 'Fund'}</span>
                      <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }}><X size={20}/></button>
                  </div>
                  <div className="p-4 space-y-3">
                      {/* Quick Select Dropdown (Only on Add) */}
                      {showAddModal && (
                          <div className="mb-3">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Select from List</label>
                            <select 
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-ios-blue focus:ring-1 focus:ring-ios-blue"
                                onChange={handlePresetChange}
                                defaultValue=""
                            >
                                <option value="" disabled>Select a predefined {activeTab}</option>
                                {(activeTab === 'share' ? PREDEFINED_STOCKS : PREDEFINED_FUNDS).map(item => (
                                    <option key={item.symbol} value={item.symbol}>{item.name}</option>
                                ))}
                            </select>
                          </div>
                      )}
                      
                      <Input label="Name" value={currentItem.name || ''} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} placeholder="Name"/>
                      <Input label="Symbol/Code" value={currentItem.symbol || ''} onChange={e => setCurrentItem({...currentItem, symbol: e.target.value})} placeholder="Symbol"/>
                      
                      {/* Editable Agent Selection */}
                      <div className="mb-3">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Agent</label>
                          <input 
                            list="agent-list"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-ios-blue focus:ring-1 focus:ring-ios-blue"
                            value={currentItem.agent}
                            onChange={e => setCurrentItem({...currentItem, agent: e.target.value})}
                            placeholder="Select or type new..."
                          />
                          <datalist id="agent-list">
                              {STOCK_AGENTS.map(a => <option key={a} value={a} />)}
                          </datalist>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Currency</label>
                            <select 
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-ios-blue focus:ring-1 focus:ring-ios-blue"
                                value={currentItem.currency}
                                onChange={e => setCurrentItem({...currentItem, currency: e.target.value})}
                            >
                                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                         </div>
                         <Input type="number" label="Buy Price" value={currentItem.purchasePrice || ''} onChange={e => setCurrentItem({...currentItem, purchasePrice: parseFloat(e.target.value)})}/>
                      </div>
                      
                      <Input type="number" label="Units Held" value={currentItem.unitsHeld || ''} onChange={e => setCurrentItem({...currentItem, unitsHeld: parseFloat(e.target.value)})}/>
                      <Input type="date" label="Purchase Date" value={currentItem.purchaseDate} onChange={e => setCurrentItem({...currentItem, purchaseDate: e.target.value})}/>
                      
                      <div className="mb-3">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes (Optional)</label>
                          <textarea 
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-ios-blue focus:ring-1 focus:ring-ios-blue"
                              rows={3}
                              value={currentItem.notes || ''}
                              onChange={e => setCurrentItem({...currentItem, notes: e.target.value})}
                              placeholder="Strategy, target price, etc..."
                          />
                      </div>
                  </div>
                  <div className="p-4 bg-gray-50">
                      <Button className="w-full" onClick={handleSaveItem}>Save Changes</Button>
                  </div>
              </div>
          </div>
      )}

      {/* --- SELL MODAL --- */}
      {showSellModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm">
                  <div className="p-4 border-b border-gray-100 font-bold text-center">Sell {currentItem.name}</div>
                  <div className="p-4 space-y-4">
                      <div className="bg-red-50 p-3 rounded text-sm text-red-800">
                          Units Held: {currentItem.unitsHeld}
                      </div>
                      <Input type="number" label="Units Sold" value={saleData.units} onChange={e => setSaleData({...saleData, units: e.target.value})}/>
                      <Input type="number" label="Selling Price (Per Unit)" value={saleData.price} onChange={e => setSaleData({...saleData, price: e.target.value})}/>
                      <Input type="date" label="Date Sold" value={saleData.date} onChange={e => setSaleData({...saleData, date: e.target.value})}/>
                      {saleData.units && saleData.price && (
                          <div className="text-right font-bold text-lg">
                              Total: {(parseFloat(saleData.units) * parseFloat(saleData.price)).toFixed(2)}
                          </div>
                      )}
                  </div>
                  <div className="p-4 bg-gray-50 flex gap-3">
                      <Button variant="secondary" className="flex-1" onClick={() => setShowSellModal(false)}>Cancel</Button>
                      <Button variant="danger" className="flex-1" onClick={handleConfirmSell}>Confirm Sell</Button>
                  </div>
              </div>
          </div>
      )}

       {/* --- DIVIDEND MODAL --- */}
       {showDivModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm">
                  <div className="p-4 border-b border-gray-100 font-bold text-center">Record Dividend: {currentItem.name}</div>
                  <div className="p-4 space-y-4">
                      <div className="bg-green-50 p-3 rounded text-sm text-green-800">
                          Units Held Snapshot: {currentItem.unitsHeld}
                      </div>
                      <Input type="number" label="Total Dividend Amount" value={divData.amount} onChange={e => setDivData({...divData, amount: e.target.value})} placeholder="0.00"/>
                      <Input type="date" label="Date Received" value={divData.date} onChange={e => setDivData({...divData, date: e.target.value})}/>
                      <Input label="Notes" value={divData.notes} onChange={e => setDivData({...divData, notes: e.target.value})} placeholder="Optional"/>
                  </div>
                  <div className="p-4 bg-gray-50 flex gap-3">
                      <Button variant="secondary" className="flex-1" onClick={() => setShowDivModal(false)}>Cancel</Button>
                      <Button className="flex-1" onClick={handleConfirmDiv}>Save Record</Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};