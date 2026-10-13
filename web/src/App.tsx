
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Wallet,
} from "lucide-react";
import "./App.css";

const today = new Date();
const iso = (date: Date) => date.toISOString().slice(0, 10);

const initialEnd = iso(today);
const initialStart = iso(
  new Date(today.getFullYear(), today.getMonth(), 1),
);

type Transaction = {
  id: string;
  mbDate: string;
  mbCash: number;
  mbCategory: string;
  mbContent?: string;
  inOutCode: string;
  assetId: string;
};

type DashboardData = {
  assetSummary?: {
    totalAsset: number;
    asset: number;
    debt: number;
  };
  monthlyTrend?: {
    month: string;
    total: number;
    asset: number;
    debt: number;
  }[];
};

type SummaryData = {
  summary?: {
    income: number;
    outcome: number;
    sum: number;
  };
};

async function api<T>(name: string, args: object = {}): Promise<T> {
  const response = await fetch(`/api/tools/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.error || "Request failed");
  }

  return json.data as T;
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function App() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [mbid, setMbid] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [init, overview] = await Promise.all([
        api<{
          initData: {
            mbid: string;
            initStartDate: string;
            initEndDate: string;
          };
        }>("init_get_data"),
        api<DashboardData>("dashboard_get_overview"),
      ]);

      setConnected(true);
      setMbid(init.initData.mbid);
      setDashboard(overview);

      const totals = await api<SummaryData>("summary_get_period", {
        startDate,
        endDate,
      });

      setSummary(totals);
    } catch (e) {
      setConnected(false);
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const loadTransactions = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await api<{
        transactions: Transaction[];
      }>("transaction_list", {
        startDate,
        endDate,
        mbid,
      });

      setTransactions(result.transactions || []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load transactions",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const assets = dashboard?.assetSummary;
  const totals = summary?.summary;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Wallet size={22} /></div>
          <div>
            <strong>Money</strong>
            <span>PERSONAL FINANCE</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <div className="nav-item active"><Activity size={18} /> Overview</div>
        <div className="nav-item"><ArrowDownLeft size={18} /> Transactions</div>

        <div className="sidebar-bottom">
          <span className={`status-dot ${connected ? "online" : ""}`} />
          {connected ? "Phone connected" : "Not connected"}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <div className="eyebrow">PERSONAL FINANCE</div>
            <h1>Overview</h1>
          </div>
          <button className="refresh-button" onClick={() => void refresh()}>
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </header>

        {error && <div className="error-banner">{error}</div>}

        <section className="section-heading">
          <div>
            <h2>Your finances</h2>
            <p>Live data from your Money Manager app.</p>
          </div>
          <div className="date-filters">
            <label>
              From
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card primary-card">
            <span className="stat-label">TOTAL ASSETS</span>
            <Wallet size={19} />
            <strong>{assets ? money(assets.totalAsset) : "—"}</strong>
            <small>Overall financial position</small>
          </article>

          <article className="stat-card">
            <span className="stat-label">ASSETS</span>
            <ArrowUpRight size={19} />
            <strong>{assets ? money(assets.asset) : "—"}</strong>
            <small>Available assets</small>
          </article>

          <article className="stat-card">
            <span className="stat-label">DEBT</span>
            <ArrowDownLeft size={19} />
            <strong>{assets ? money(assets.debt) : "—"}</strong>
            <small>Reported liabilities</small>
          </article>

          <article className="stat-card">
            <span className="stat-label">NET CASH FLOW</span>
            <Activity size={19} />
            <strong>{totals ? money(totals.sum) : "—"}</strong>
            <small>Selected reporting period</small>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel chart-panel">
            <div className="panel-heading">
              <div>
                <h2>Asset trend</h2>
                <p>Historical financial position</p>
              </div>
            </div>

            {dashboard?.monthlyTrend?.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dashboard.monthlyTrend}>
                  <defs>
                    <linearGradient id="assetFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#777777" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#777777" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => new Intl.NumberFormat("en-IN", {
                      notation: "compact",
                    }).format(v)}
                  />
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#333333"
                    strokeWidth={2}
                    fill="url(#assetFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                {loading ? "Loading chart…" : "No chart data available"}
              </div>
            )}
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <h2>Cash flow</h2>
                <p>Selected date range</p>
              </div>
            </div>
            <div className="flow-row">
              <span className="flow-icon income"><ArrowDownLeft size={18} /></span>
              <div><small>Income</small><strong>{totals ? money(totals.income) : "—"}</strong></div>
            </div>
            <div className="flow-row">
              <span className="flow-icon expense"><ArrowUpRight size={18} /></span>
              <div><small>Expenses</small><strong>{totals ? money(totals.outcome) : "—"}</strong></div>
            </div>
          </article>
        </section>

        <section className="panel transactions-panel">
          <div className="panel-heading">
            <div>
              <h2>Transactions</h2>
              <p>{transactions.length} records loaded</p>
            </div>
            <button className="secondary-button" onClick={() => void loadTransactions()}>
              Load transactions
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th className="amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{tx.mbDate}</td>
                    <td>{tx.mbCategory || "Uncategorised"}</td>
                    <td>{tx.mbContent || "—"}</td>
                    <td>{tx.inOutCode === "0" ? "Income" : tx.inOutCode === "1" ? "Expense" : "Transfer"}</td>
                    <td className="amount">{money(tx.mbCash)}</td>
                  </tr>
                ))}
                {!transactions.length && (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      Choose a date range and load transactions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
