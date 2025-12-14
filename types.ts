

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  description: string;
  amount: number;
  category: string;
  type: TransactionType;
  isTaxRelief?: boolean; // New flag for tax sync
  isExcludedFromBalance?: boolean; // New: For "Recording Only" items
  receiptNumber?: string; // New: For tax sync
  hasEInvoice?: boolean; // New: For tax sync
}

export interface ContributionDetail {
  id: string;
  date: string; // New: Automatic capture date
  name: string;
  amount: number;
  source?: string; // New: Source of funds (e.g. Bank Transfer)
}

export interface ParentExpenseDetail {
  id: string;
  date: string; // New: Automatic capture date
  category: string;
  amount: number;
  notes?: string;
  sharedWith?: string; // Names of people sharing
  shareCount?: number; // Number of people sharing
  deductFrom?: string; // New: Which fund to deduct from
  deductShareOnly?: boolean; // New: Deduct full amount or share amount
}

export interface ParentCareLog {
  id: string;
  monthStr: string; // YYYY-MM
  contributions: number; // Total contributions
  contributionDetails: ContributionDetail[]; // Breakdown
  expenses: number; // Total expenses (calculated from details)
  expenseDetails: ParentExpenseDetail[]; // New itemized expenses
  notes: string;
  bbfNotes?: Record<string, string>; // New: Dictionary of notes keyed by account name
  // Deprecated but kept for type safety during migration if raw JSON is loaded
  bbfNote?: string; 
}

export interface PurchaseLog {
  id: string;
  date: string;
  units: number;
  price: number; // Unit price at time of purchase
  cost: number; // Total cost (units * price)
  agent: string;
}

export interface InvestmentItem {
  id: string;
  type: 'share' | 'fund';
  name: string;
  symbol: string; // e.g., 1155.KL or Fund Code
  agent: string; // Hwang DBS, MooMoo, etc.
  purchasePrice: number; // Average Unit Price
  currency?: string; // New: Currency code
  unitsHeld: number;
  purchaseDate: string; // Date of first purchase or last update
  currentPrice?: number; // Fetched via Gemini
  lastUpdated?: string;
  notes?: string; // New: Optional notes
  purchaseHistory?: PurchaseLog[]; // New: History of accumulated purchases
}

export interface DividendLog {
  id: string;
  investmentId: string;
  date: string;
  amount: number;
  unitsHeldSnapshot: number; // Units held at time of dividend
  notes?: string;
}

export interface SaleLog {
  id: string;
  investmentId: string;
  date: string;
  unitsSold: number;
  pricePerUnit: number;
  totalAmount: number;
  itemName: string; // Snapshot in case item is deleted
  agent: string;
}

export interface FundSnapshot {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  totalCost: number;
  totalValue: number;
}

export interface TaxReliefItem {
  id: string;
  year: number;
  category: string;
  description: string;
  amount: number;
  date: string;
  receiptNumber?: string;
  hasEInvoice: boolean;
  fromExpenses?: boolean; // To distinguish synced items
}

export interface FixedDeposit {
  id: string;
  bank: string;
  slipNumber: string;
  startDate: string;
  endDate: string; // Maturity Date
  rate: number; // Percentage
  principal: number;
  remarks?: string;
}

export interface SalaryLog {
  id: string;
  month: string; // YYYY-MM
  basic: number;
  mobile: number;
  transport: number;
  wellness: number;
  award: number;
  bonus: number;
  gesop: number;
  epf: number;
  eis: number;
  socso: number;
  others: number;
  notes?: string;
}

export interface AppData {
  transactions: Transaction[];
  parentLogs: ParentCareLog[];
  investments: InvestmentItem[];
  dividends: DividendLog[];
  sales: SaleLog[];
  fundSnapshots: FundSnapshot[];
  taxItems: TaxReliefItem[];
  fixedDeposits: FixedDeposit[];
  salaryLogs: SalaryLog[];
}

export const INCOME_CATEGORIES = [
  "Net Income", 
  "Share Dividends", 
  "Misc Income",
  // Recording Only Categories
  "Basic Pay",
  "Mobile phone allowances",
  "Transportation allowance",
  "Flexible wellness allowances",
  "Spot bonus/bonus"
];

// All available expense categories (used for Transactions)
export const EXPENSE_CATEGORIES = [
  "Meals", 
  "Fuel", 
  "Insurance", 
  "Gifts/ Donations", 
  "Savings", 
  "Investment", 
  "Personal spending & care", 
  "Phone bills", 
  "Children education expenses", 
  "Parent care", 
  "Clothes", 
  "Household groceries", 
  "Meal supplement groceries", 
  "Social expenses", 
  "Income Tax", 
  "BSC share purchase", 
  "Misc mandatory deductions from monthly salary",
  "Parent Nursing Care",
  "Medical Checkup",
  "Books",
  "Vaccination",
  "Lifestyle",
  "Sports Equipment",
  "PRS",
  "SSPN",
  "Voluntary contributions to EPF",
  "Others",
  // Recording Only Categories
  "GESOP",
  "EPF EE",
  "EIS EE",
  "EIS",
  "SOCSO",
  "EPF ER",
  "EIS ER"
];

// Categories that do not affect the actual wallet balance (Info Only)
export const EXCLUDED_FROM_BALANCE_CATEGORIES = [
  // Income
  "Basic Pay",
  "Mobile phone allowances",
  "Transportation allowance",
  "Flexible wellness allowances",
  "Spot bonus/bonus",
  // Expenses
  "GESOP",
  "EPF EE",
  "EIS EE",
  "EIS",
  "SOCSO",
  "EPF ER",
  "EIS ER"
];

// Strictly Eligible Tax Relief Categories (Used for Tax Module Dropdown)
export const ELIGIBLE_TAX_CATEGORIES = [
  "Insurance",
  "Children education expenses", 
  "Parent Nursing Care",
  "Medical Checkup",
  "Books",
  "Vaccination",
  "Lifestyle",
  "Sports Equipment",
  "PRS",
  "SSPN",
  "Voluntary contributions to EPF",
  "SOCSO",
  "EPF",
  "Others" // Kept for edge cases, but user should be careful
];

export const PARENT_EXPENSE_CATEGORIES = [
  "Nursing Home",
  "Medical",
  "Groceries",
  "Maid/Helper",
  "Utilities",
  "Pocket Money",
  "Others"
];

export const SIBLINGS = ["Kah Ho", "Self", "Other"];

export const SHARERS_LIST = ["Kah Ho", "Nicole", "Sau Lai"];

export const STOCK_AGENTS = ["Hwang DBS", "MooMoo", "Rakuten", "Direct", "Other"];

export const CURRENCIES = ["MYR", "USD", "SGD", "AUD", "GBP", "EUR"];

export const PREDEFINED_STOCKS = [
  { name: "MAYBANK", symbol: "1155.KL" },
  { name: "CIMB Group Holdings Berhad", symbol: "1023" },
  { name: "Oversea-Chinese Banking Corporation Ltd", symbol: "O39" },
  { name: "Boston Scientific Corporation", symbol: "BSX" },
  { name: "Alphabet-C", symbol: "GOOG" }
];

export const PREDEFINED_FUNDS = [
  { name: "Public China Access Equity Fund", symbol: "093624284" },
  { name: "Public Islamic Opportunities Fund", symbol: "093624161" },
  { name: "Public Islamic Asia Tactical Allocation Fund", symbol: "093980865" },
  { name: "Public Select Treasures Equity Fund", symbol: "093980844" },
  { name: "Public Mutual PRS Equity Fund", symbol: "04845715" }
];