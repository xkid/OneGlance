
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

  // iOS Icon Fix: Generates multiple PNG sizes from SVG client-side for "Add to Home Screen" support
  useEffect(() => {
    const generateAppleTouchIcons = async () => {
        // Load the source SVG
        const img = new Image();
        // Use absolute path for public asset to avoid module resolution issues
        img.src = "/icon.svg";
        
        try {
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
        } catch (e) {
            console.error("Failed to load icon SVG for generation", e);
            return;
        }

        // Define iOS standard icon sizes
        const sizes = [76, 120, 152, 167, 180];

        // Generate a link tag for each size
        sizes.forEach(size => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                ctx.clearRect(0, 0, size, size);
                // Draw SVG onto canvas
                ctx.drawImage(img, 0, 0, size, size);
                
                try {
                    const pngUrl = canvas.toDataURL('image/png');
                    const sizeStr = `${size}x${size}`;
                    
                    // Check if specific link already exists
                    let link = document.querySelector(`link[rel="apple-touch-icon"][sizes="${sizeStr}"]`) as HTMLLinkElement;
                    
                    if (!link) {
                        link = document.createElement('link');
                        link.rel = 'apple-touch-icon';
                        link.setAttribute('sizes', sizeStr);
                        document.head.appendChild(link);
                    }
                    link.href = pngUrl;
                } catch (e) {
                    console.warn(`Failed to generate iOS icon for size ${size}`, e);
                }
            }
        });

        // Update the default fallback icon (usually 180x180 or largest)
        const defaultLink = document.getElementById('apple-touch-icon-default') as HTMLLinkElement;
        if (defaultLink) {
            const canvas = document.createElement('canvas');
            canvas.width = 180;
            canvas.height = 180;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, 180, 180);
                defaultLink.href = canvas.toDataURL('image/png');
            }
        }
    };

    // Run with a slight delay to ensure resources available
    const timer = setTimeout(generateAppleTouchIcons, 500);
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
