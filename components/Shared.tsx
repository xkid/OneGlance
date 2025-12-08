import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string; action?: React.ReactNode }> = ({ children, className = "", title, action }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
    {(title || action) && (
      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        {title && <h3 className="font-semibold text-gray-800">{title}</h3>}
        {action && <div>{action}</div>}
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }> = ({ children, variant = 'primary', className = "", ...props }) => {
  const base = "px-4 py-2 rounded-lg font-medium transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-offset-1";
  const variants = {
    primary: "bg-ios-blue text-white hover:bg-blue-600 focus:ring-blue-500",
    secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-300",
    danger: "bg-ios-red text-white hover:bg-red-600 focus:ring-red-500",
    ghost: "bg-transparent text-ios-blue hover:bg-blue-50 focus:ring-blue-200"
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = "", ...props }) => (
  <div className="mb-3">
    {label && <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>}
    <input className={`w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-ios-blue focus:ring-1 focus:ring-ios-blue ${className}`} {...props} />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, className = "", children, ...props }) => (
  <div className="mb-3">
    {label && <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>}
    <select className={`w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-ios-blue focus:ring-1 focus:ring-ios-blue ${className}`} {...props}>
      {children}
    </select>
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: 'green' | 'red' | 'blue' | 'gray' }> = ({ children, color = 'gray' }) => {
    const colors = {
        green: 'bg-green-100 text-green-700',
        red: 'bg-red-100 text-red-700',
        blue: 'bg-blue-100 text-blue-700',
        gray: 'bg-gray-100 text-gray-700',
    };
    return <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${colors[color]}`}>{children}</span>
}
