import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, FileBarChart, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { Transaction } from "../types/index.ts";
import { money } from "../utils/finance.ts";

type Props = { transactions: Transaction[]; startDate: string; endDate: string; setStartDate: (value: string) => void; setEndDate: (value: string) => void; loading: boolean; accountName: (id: string) => string };
const COLORS = ["#353535", "#777777", "#a0a0a0", "#c2c2c2", "#5e8270", "#9c7777", "#7b8da6", "#b29c72"];
const csvCell = (value: unknown) => '"' + String(value ?? "").replace(/"/g, '""') + '"';

export default function ReportsPage({ transactions, startDate, endDate, setStartDate, setEndDate, loading, accountName }: Props) {
  const report = useMemo(() => {
    const incomeRows = transactions.filter(tx => tx.inOutCode === "0");
    const expenseRows = transactions.filter(tx => tx.inOutCode === "1");
    const transferCount = transactions.length - incomeRows.length - expenseRows.length;
    const income = incomeRows.reduce((sum, tx) => sum + Math.abs(Number(tx.mbCash) || 0), 0);
    const expenses = expenseRows.reduce((sum, tx) => sum + Math.abs(Number(tx.mbCash) || 0), 0);
    const categoryMap = new Map<string, { category: string; amount: number; count: number }>();
    expenseRows.forEach(tx => {
      const category = tx.mbCategory || "Uncategorised";
      const row = categoryMap.get(category) || { category, amount: 0, count: 0 };
      row.amount += Math.abs(Number(tx.mbCash) || 0); row.count += 1; categoryMap.set(category, row);
    });
    const monthMap = new Map<string, { month: string; income: number; expenses: number }>();
    [...incomeRows, ...expenseRows].forEach(tx => {
      const month = String(tx.mbDate || "").slice(0, 7); if (!month) return;
      const row = monthMap.get(month) || { month, income: 0, expenses: 0 };
      if (tx.inOutCode === "0") row.income += Math.abs(Number(tx.mbCash) || 0); else row.expenses += Math.abs(Number(tx.mbCash) || 0);
      monthMap.set(month, row);
    });
    const accounts = new Map<string, { accountId: string; account: string; income: number; expenses: number; count: number }>();
    [...incomeRows, ...expenseRows].forEach(tx => {
      const id = tx.assetId || "";
      const row = accounts.get(id) || { accountId: id, account: accountName(id), income: 0, expenses: 0, count: 0 };
      if (tx.inOutCode === "0") row.income += Math.abs(Number(tx.mbCash) || 0); else row.expenses += Math.abs(Number(tx.mbCash) || 0);
      row.count += 1; accounts.set(id, row);
    });
    return {
      income, expenses, net: income - expenses, incomeCount: incomeRows.length, expenseCount: expenseRows.length, transferCount,
      categories: [...categoryMap.values()].sort((a,b) => b.amount-a.amount),
      monthly: [...monthMap.values()].sort((a,b) => a.month.localeCompare(b.month)).map(row => ({ ...row, label: new Date(row.month + "-01T00:00:00").toLocaleDateString("en-IN", { month: "short", year: "2-digit" }) })),
      accounts: [...accounts.values()].sort((a,b) => (b.income+b.expenses)-(a.income+a.expenses)),
    };
  }, [transactions, accountName]);

  function exportCsv() {
    const headers = ["Date","Type","Amount (INR)","Category","Subcategory","Account","Payment method","Description","Notes"];
    const rows = transactions.map(tx => [tx.mbDate, tx.inOutCode === "0" ? "Income" : tx.inOutCode === "1" ? "Expense" : "Transfer", Math.abs(Number(tx.mbCash)||0), tx.mbCategory, tx.subCategory, accountName(tx.assetId), tx.payType, tx.mbContent, tx.mbDetailContent]);
    const csv = [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = `money-manager-report-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  return <>
    <section className="section-heading report-heading"><div><h2>Reports &amp; analytics</h2><p>Understand cash flow, spending categories and account activity using live transaction data.</p></div><div className="report-actions"><div className="date-filters"><label>From<input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)} /></label><label>To<input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} /></label></div><button className="primary-button" onClick={exportCsv} disabled={!transactions.length}><Download size={15} /> Export CSV</button></div></section>
    <section className="stats-grid report-stats">
      <article className="stat-card"><span className="stat-label">TOTAL INCOME</span><TrendingUp size={19}/><strong>{money(report.income)}</strong><small>{report.incomeCount} income records</small></article>
      <article className="stat-card"><span className="stat-label">TOTAL EXPENSES</span><TrendingDown size={19}/><strong>{money(report.expenses)}</strong><small>{report.expenseCount} expense records</small></article>
      <article className={`stat-card ${report.net >= 0 ? "report-net-positive" : "report-net-negative"}`}><span className="stat-label">NET CASH FLOW</span><Wallet size={19}/><strong>{money(report.net)}</strong><small>Income minus expenses</small></article>
      <article className="stat-card"><span className="stat-label">TRANSACTIONS</span><FileBarChart size={19}/><strong>{transactions.length}</strong><small>{report.transferCount} transfer records included</small></article>
    </section>
    <section className="report-chart-grid">
      <article className="panel report-chart-panel"><div className="panel-heading"><div><h2>Monthly cash flow</h2><p>Income compared with expenses</p></div></div>
        {report.monthly.length ? <ResponsiveContainer width="100%" height={290}><BarChart data={report.monthly} margin={{top:5,right:8,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#ececec"/><XAxis dataKey="label" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v => new Intl.NumberFormat("en-IN",{notation:"compact",maximumFractionDigits:1}).format(Number(v))}/><Tooltip formatter={value => money(Number(value))}/><Legend/><Bar dataKey="income" name="Income" fill="#4b8061" radius={[4,4,0,0]}/><Bar dataKey="expenses" name="Expenses" fill="#a95f5f" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer> : <div className="empty-state">{loading ? "Loading transaction data…" : "No income or expense records in this date range."}</div>}
      </article>
      <article className="panel report-chart-panel"><div className="panel-heading"><div><h2>Spending by category</h2><p>Expense distribution for this period</p></div></div>
        {report.categories.length ? <><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={report.categories.slice(0,8)} dataKey="amount" nameKey="category" innerRadius={54} outerRadius={83} paddingAngle={2}>{report.categories.slice(0,8).map((item,i)=><Cell key={item.category} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={value => money(Number(value))}/></PieChart></ResponsiveContainer><div className="report-category-legend">{report.categories.slice(0,8).map((item,i)=><div key={item.category}><span><i style={{background:COLORS[i%COLORS.length]}}/>{item.category}</span><strong>{money(item.amount)}</strong></div>)}</div></> : <div className="empty-state">{loading ? "Loading transaction data…" : "No expense categories in this date range."}</div>}
      </article>
    </section>
    <section className="panel report-table-panel"><div className="panel-heading"><div><h2>Account activity</h2><p>Income, expenses and record counts by account</p></div></div>
      {report.accounts.length ? <div className="table-wrap"><table><thead><tr><th>ACCOUNT</th><th className="amount">INCOME</th><th className="amount">EXPENSES</th><th className="amount">NET</th><th className="amount">RECORDS</th></tr></thead><tbody>{report.accounts.map(row=><tr key={row.accountId||"unknown"}><td>{row.account}</td><td className="amount positive-amount">{money(row.income)}</td><td className="amount negative-amount">{money(row.expenses)}</td><td className={`amount ${row.income-row.expenses>=0?"positive-amount":"negative-amount"}`}>{money(row.income-row.expenses)}</td><td className="amount">{row.count}</td></tr>)}</tbody></table></div> : <div className="empty-state">{loading ? "Loading transaction data…" : "No account activity for this period."}</div>}
    </section>
    <p className="report-footnote">Reports use transactions loaded for {startDate} to {endDate}. Transfers appear in the record count and CSV export but are excluded from income, expense and net cash-flow totals.</p>
  </>;
}
