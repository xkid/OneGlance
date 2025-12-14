

import React, { useState, useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import { ExpensesView } from './views/Expenses';
import { ParentCareView } from './views/ParentCare';
import { InvestmentsView } from './views/Investments';
import { TaxView } from './views/Tax';
import { StatsView } from './views/Stats';
import { FixedDepositView } from './views/FixedDeposit';
import { SalaryView } from './views/Salary';
import { Wallet, Heart, TrendingUp, FileText, PieChart, Landmark, Banknote } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'parent' | 'invest' | 'fd' | 'salary' | 'tax' | 'stats'>('expenses');

  // iOS Icon Fix: Convert SVG to PNG client-side for "Add to Home Screen" support
  useEffect(() => {
    const generateAppleTouchIcon = () => {
        const link = document.getElementById('apple-touch-icon') as HTMLLinkElement;
        if (!link) {
            console.warn("Apple Touch Icon link tag not found");
            return;
        }

        // Create an image element to load the SVG
        const img = new Image();
        // Add timestamp to prevent caching issues
        img.src = '/icon.svg?v=' + new Date().getTime();
        img.crossOrigin = 'anonymous'; // Good practice even for local
        
        // Ensure the image loads before drawing
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Clear canvas first
                ctx.clearRect(0, 0, 512, 512);
                // Draw the SVG onto the canvas
                ctx.drawImage(img, 0, 0, 512, 512);
                try {
                    // Convert to PNG data URI
                    const pngUrl = canvas.toDataURL('image/png');
                    // Update the link tag
                    link.href = pngUrl;
                    link.setAttribute('sizes', '180x180'); // Standard iOS size hint
                    console.log("iOS Icon generated successfully");
                } catch (e) {
                    console.error("Failed to generate iOS icon data URI", e);
                }
            }
        };

        img.onerror = (e) => {
            console.error("Failed to load icon.svg for iOS generation", e);
        }
    };

    // Run with a slight delay to ensure DOM is fully ready and resources available
    const timer = setTimeout(generateAppleTouchIcon, 500);
    return () => clearTimeout(timer);
  }, []);

  const renderView = () => {
    switch (activeTab) {
      case 'expenses': return <ExpensesView />;
      case 'parent': return <ParentCareView />;
      case 'invest': return <InvestmentsView />;
      case 'fd': return <FixedDepositView />;
      case 'salary': return <SalaryView />;
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
          <div className="fixed bottom-0 w-full max-w-md bg-white/90 backdrop-blur-lg border-t border-gray-200 pb-safe pt-2 px-2 z-30 overflow-x-auto no-scrollbar">
            <div className="flex justify-between items-end pb-4 min-w-[350px]">
              <NavBtn 
                active={activeTab === 'expenses'} 
                onClick={() => setActiveTab('expenses')} 
                icon={<Wallet size={24} />} 
                label="Exp" 
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
                active={activeTab === 'salary'} 
                onClick={() => setActiveTab('salary')} 
                icon={<Banknote size={24} />} 
                label="Salary" 
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
    className={`flex flex-col items-center gap-1 transition-colors duration-200 min-w-[40px] ${active ? 'text-ios-blue' : 'text-gray-400 hover:text-gray-600'}`}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default App;
