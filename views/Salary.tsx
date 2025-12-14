
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Input } from '../components/Shared';
import { Plus, Download, Trash2, Save, X } from 'lucide-react';
import { SalaryLog } from '../types';

export const SalaryView: React.FC = () => {
  const { data, addSalaryLog, deleteSalaryLog, exportDataCSV } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form State
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [basic, setBasic] = useState('');
  const [mobile, setMobile] = useState('');
  const [transport, setTransport] = useState('');
  const [wellness, setWellness] = useState('');
  const [award, setAward] = useState('');
  const [bonus, setBonus] = useState('');
  const [gesop, setGesop] = useState('');
  const [epf, setEpf] = useState('');
  const [eis, setEis] = useState('');
  const [socso, setSocso] = useState('');
  const [others, setOthers] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
      setBasic(''); setMobile(''); setTransport(''); setWellness('');
      setAward(''); setBonus(''); setGesop('');
      setEpf(''); setEis(''); setSocso(''); setOthers('');
      setNotes('');
  };

  const handleSave = () => {
      const payload: SalaryLog = {
          id: Date.now().toString(),
          month,
          basic: parseFloat(basic) || 0,
          mobile: parseFloat(mobile) || 0,
          transport: parseFloat(transport) || 0,
          wellness: parseFloat(wellness) || 0,
          award: parseFloat(award) || 0,
          bonus: parseFloat(bonus) || 0,
          gesop: parseFloat(gesop) || 0,
          epf: parseFloat(epf) || 0,
          eis: parseFloat(eis) || 0,
          socso: parseFloat(socso) || 0,
          others: parseFloat(others) || 0,
          notes
      };
      addSalaryLog(payload);
      setShowAddModal(false);
      resetForm();
  };

  const handleDownload = () => {
      const csv = exportDataCSV('salary');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `salary_data.csv`;
      a.click();
  };

  const sortedLogs = [...data.salaryLogs].sort((a,b) => b.month.localeCompare(a.month));

  return (
    <div className="space-y-6 pb-24">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Monthly Salary</h1>
            <button onClick={handleDownload} className="p-2 bg-gray-100 rounded-full text-gray-600">
                <Download size={20} />
            </button>
        </div>

        <div className="flex justify-between items-center px-1">
            <h3 className="font-semibold text-gray-700">Salary Records</h3>
            <Button variant="ghost" onClick={() => setShowAddModal(true)} className="flex items-center gap-1 text-xs">
                <Plus size={16}/> Add Month
            </Button>
        </div>

        <div className="space-y-4">
            {sortedLogs.length === 0 && <p className="text-gray-400 text-center py-8">No salary records found.</p>}
            {sortedLogs.map(s => {
                const totalIncome = s.basic + s.mobile + s.transport + s.wellness + s.award + s.bonus + s.gesop + s.others;
                const totalDeductions = s.epf + s.eis + s.socso;
                const net = totalIncome - totalDeductions;

                return (
                    <div key={s.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
                        <button onClick={() => deleteSalaryLog(s.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500">
                            <Trash2 size={16} />
                        </button>
                        
                        <div className="flex justify-between items-baseline mb-3">
                            <h4 className="text-lg font-bold text-gray-800">{s.month}</h4>
                            <span className="font-bold text-green-600 text-lg">Net: {net.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="space-y-1">
                                <p className="font-semibold text-gray-500 border-b border-gray-100 pb-1 mb-1">Earnings</p>
                                <div className="flex justify-between"><span>Basic</span><span>{s.basic.toLocaleString()}</span></div>
                                {(s.mobile > 0 || s.transport > 0 || s.wellness > 0) && (
                                    <div className="flex justify-between text-gray-500"><span>Allowances</span><span>{(s.mobile + s.transport + s.wellness).toLocaleString()}</span></div>
                                )}
                                {(s.bonus > 0 || s.award > 0) && (
                                    <div className="flex justify-between text-blue-600"><span>Bonus/Award</span><span>{(s.bonus + s.award).toLocaleString()}</span></div>
                                )}
                                {s.gesop > 0 && <div className="flex justify-between"><span>GESOP</span><span>{s.gesop.toLocaleString()}</span></div>}
                                {s.others > 0 && <div className="flex justify-between"><span>Others</span><span>{s.others.toLocaleString()}</span></div>}
                            </div>
                            <div className="space-y-1">
                                <p className="font-semibold text-gray-500 border-b border-gray-100 pb-1 mb-1">Deductions</p>
                                <div className="flex justify-between"><span>EPF</span><span>-{s.epf.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>SOCSO</span><span>-{s.socso.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>EIS</span><span>-{s.eis.toLocaleString()}</span></div>
                            </div>
                        </div>
                        {s.notes && <p className="text-xs text-gray-400 mt-2 italic">Note: {s.notes}</p>}
                    </div>
                );
            })}
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar">
                  <div className="p-4 border-b border-gray-100 font-bold text-center flex justify-between items-center">
                      <span>Add Salary Log</span>
                      <button onClick={() => setShowAddModal(false)}><X size={20}/></button>
                  </div>
                  <div className="p-4 space-y-3">
                      <Input type="month" label="Month" value={month} onChange={e => setMonth(e.target.value)} />
                      
                      <div className="grid grid-cols-2 gap-3">
                          <Input type="number" label="Basic Pay" value={basic} onChange={e => setBasic(e.target.value)} />
                          <Input type="number" label="Mobile Allow." value={mobile} onChange={e => setMobile(e.target.value)} />
                          <Input type="number" label="Transport Allow." value={transport} onChange={e => setTransport(e.target.value)} />
                          <Input type="number" label="Flex Wellness" value={wellness} onChange={e => setWellness(e.target.value)} />
                          <Input type="number" label="Award" value={award} onChange={e => setAward(e.target.value)} />
                          <Input type="number" label="Spot Bonus" value={bonus} onChange={e => setBonus(e.target.value)} />
                          <Input type="number" label="GESOP" value={gesop} onChange={e => setGesop(e.target.value)} />
                          <Input type="number" label="Others" value={others} onChange={e => setOthers(e.target.value)} />
                      </div>
                      
                      <div className="border-t border-gray-100 pt-3 mt-1">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Deductions</p>
                          <div className="grid grid-cols-3 gap-2">
                             <Input type="number" label="EPF" value={epf} onChange={e => setEpf(e.target.value)} />
                             <Input type="number" label="EIS" value={eis} onChange={e => setEis(e.target.value)} />
                             <Input type="number" label="SOCSO" value={socso} onChange={e => setSocso(e.target.value)} />
                          </div>
                      </div>

                      <Input label="Notes (Optional)" value={notes} onChange={e => setNotes(e.target.value)} />
                      
                      <p className="text-[10px] text-blue-500 italic">* SOCSO entries will automatically sync to Tax Relief module.</p>
                  </div>
                  <div className="p-4 bg-gray-50">
                      <Button onClick={handleSave} className="w-full flex justify-center items-center gap-2">
                          <Save size={18}/> Save Record
                      </Button>
                  </div>
              </div>
          </div>
        )}
    </div>
  );
};
