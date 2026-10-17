import { Activity, ArrowDownLeft, ArrowDownUp, ArrowUpRight, Wallet } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardData, SummaryData, Transaction } from "../types/index.ts";
import { money } from "../utils/finance.ts";
import TransactionTable from "../components/TransactionTable.tsx";

type Props = {
  dashboard: DashboardData | null;
  assets: DashboardData["assetSummary"] | undefined;
  totals: SummaryData["summary"] | undefined;
  transactions: Transaction[];
  startDate: string; endDate: string;
  setStartDate: (value: string) => void; setEndDate: (value: string) => void;
  loading: boolean; accountName: (id: string) => string;
  onNavigateTransactions: () => void; onEdit: (tx: Transaction) => void; onDelete: (tx: Transaction) => void;
};

export default function OverviewPage({ dashboard, assets, totals, transactions, startDate, endDate, setStartDate, setEndDate, loading, accountName, onNavigateTransactions, onEdit, onDelete }: Props) {
  return (
    <>
      <section className="section-heading"><div><h2>Your finances</h2><p>Live data from your Money Manager app.</p></div><div className="date-filters"><label>From<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label><label>To<input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></label></div></section>
                <section className="stats-grid">
                  <article className="stat-card primary-card"><span className="stat-label">TOTAL ASSETS</span><Wallet size={19} /><strong>{assets ? money(assets.totalAsset) : "—"}</strong><small>Overall financial position</small></article>
                  <article className="stat-card"><span className="stat-label">ASSETS</span><ArrowUpRight size={19} /><strong>{assets ? money(assets.asset) : "—"}</strong><small>Available assets</small></article>
                  <article className="stat-card"><span className="stat-label">DEBT</span><ArrowDownLeft size={19} /><strong>{assets ? money(assets.debt) : "—"}</strong><small>Reported liabilities</small></article>
                  <article className="stat-card"><span className="stat-label">NET CASH FLOW</span><Activity size={19} /><strong>{totals ? money(totals.sum) : "—"}</strong><small>Selected reporting period</small></article>
                </section>
                <section className="content-grid">
                  <article className="panel chart-panel"><div className="panel-heading"><div><h2>Asset trend</h2><p>Historical financial position</p></div></div>
                    {dashboard?.monthlyTrend?.length ? <ResponsiveContainer width="100%" height={280}><AreaChart data={dashboard.monthlyTrend}><defs><linearGradient id="assetFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#777777" stopOpacity={0.28} /><stop offset="95%" stopColor="#777777" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={v => new Intl.NumberFormat("en-IN", { notation: "compact" }).format(v)} /><Tooltip formatter={value => money(Number(value))} /><Area type="monotone" dataKey="total" stroke="#333333" strokeWidth={2} fill="url(#assetFill)" /></AreaChart></ResponsiveContainer> : <div className="empty-state">{loading ? "Loading chart…" : "No chart data available"}</div>}
                  </article>
                  <article className="panel"><div className="panel-heading"><div><h2>Cash flow</h2><p>Selected date range</p></div></div><div className="flow-row"><span className="flow-icon income"><ArrowDownLeft size={18} /></span><div><small>Income</small><strong>{totals ? money(totals.income) : "—"}</strong></div></div><div className="flow-row"><span className="flow-icon expense"><ArrowUpRight size={18} /></span><div><small>Expenses</small><strong>{totals ? money(totals.outcome) : "—"}</strong></div></div></article>
                </section>
                <section className="panel transactions-panel"><div className="panel-heading"><div><h2>Recent transactions</h2><p>{transactions.length} records loaded for the selected period</p></div><button className="secondary-button" onClick={onNavigateTransactions}>Manage transactions <ArrowDownUp size={15} /></button></div><TransactionTable rows={transactions.slice(0, 8)} accountName={accountName} onEdit={onEdit} onDelete={onDelete} /></section>
    </>
  );
}
