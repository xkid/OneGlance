
import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { ExpensesView } from './views/Expenses';
import { ParentCareView } from './views/ParentCare';
import { InvestmentsView } from './views/Investments';
import { TaxView } from './views/Tax';
import { StatsView } from './views/Stats';
import { FixedDepositView } from './views/FixedDeposit';
import { Wallet, Heart, TrendingUp, FileText, PieChart, Landmark } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'parent' | 'invest' | 'fd' | 'tax' | 'stats'>('expenses');

  const renderView = () => {
    switch (activeTab) {
      case 'expenses': return <ExpensesView />;
      case 'parent': return <ParentCareView />;
      case 'invest': return <InvestmentsView />;
      case 'fd': return <FixedDepositView />;
      case 'tax': return <TaxView />;
      case 'stats': return <StatsView />;
      default: return <ExpensesView />;
    }
  };

  return (
    <AppProvider>
      <div className="min-h-screen bg-ios-bg flex justify-center">
        {/* Mobile constrained container */}
        <div className="w-full max-w-md bg-ios-bg min-h-screen relative shadow-2xl flex flex-col">
          
          {/* Status Bar Shim (for aesthetics) */}
          <div className="h-12 w-full bg-ios-bg/90 backdrop-blur sticky top-0 z-20"></div>
          
          {/* Main Content */}
          <main className="flex-1 px-4 overflow-y-auto no-scrollbar">
            {renderView()}
          </main>

          {/* Bottom Navigation */}
          <div className="fixed bottom-0 w-full max-w-md bg-white/90 backdrop-blur-lg border-t border-gray-200 pb-safe pt-2 px-2 z-30">
            <div className="flex justify-around items-end pb-4">
              <NavBtn 
                active={activeTab === 'expenses'} 
                onClick={() => setActiveTab('expenses')} 
                icon={<Wallet size={24} />} 
                label="Expenses" 
              />
              <NavBtn 
                active={activeTab === 'parent'} 
                onClick={() => setActiveTab('parent')} 
                icon={<Heart size={24} />} 
                label="Parent" 
              />
              <NavBtn 
                active={activeTab === 'invest'} 
                onClick={() => setActiveTab('invest')} 
                icon={<TrendingUp size={24} />} 
                label="Invest" 
              />
               <NavBtn 
                active={activeTab === 'fd'} 
                onClick={() => setActiveTab('fd')} 
                icon={<Landmark size={24} />} 
                label="FD" 
              />
              <NavBtn 
                active={activeTab === 'tax'} 
                onClick={() => setActiveTab('tax')} 
                icon={<FileText size={24} />} 
                label="Tax" 
              />
              <NavBtn 
                active={activeTab === 'stats'} 
                onClick={() => setActiveTab('stats')} 
                icon={<PieChart size={24} />} 
                label="Stats" 
              />
            </div>
          </div>
        </div>
      </div>
    </AppProvider>
  );
};

const NavBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center gap-1 transition-colors duration-200 ${active ? 'text-ios-blue' : 'text-gray-400 hover:text-gray-600'}`}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default App;
