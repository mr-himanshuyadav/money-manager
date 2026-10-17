import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Activity, ArrowDownLeft, ArrowDownUp, ArrowUpRight, Check,
  ChevronDown, CirclePlus, Filter, Landmark, Pencil, RefreshCw, Search, Trash2, Wallet, X,
} from "lucide-react";
import "./App.css";

type CategoryChild = { mcscid: string; mcscname: string };
type Category = { mcid: string; mcname: string; mcsc?: CategoryChild[] };
type PaymentType = { ptid: string; ptname: string };
type AssetName = { assetId: string; assetType: string; assetName: string };
type Account = { assetId: string; assetGroupId?: string; assetType: "group" | "item"; assetName: string; assetMoney: number; linkAssetId?: string; linkAssetName?: string };
type AccountGroup = { assetGroupId: string; assetType: "group"; assetName: string; assetMoney: number; color?: string; children: Account[] };
type AccountsPayload = { assetGroups?: AccountGroup[]; totalBalance?: number };
type AccountFormState = { assetId?: string; assetGroupId: string; assetName: string; assetMoney: string };
type InitPayload = {
  initData: { mbid: string; initStartDate?: string; initEndDate?: string };
  categories?: { income?: Category[]; expense?: Category[] };
  paymentTypes?: PaymentType[];
  assetNames?: AssetName[];
};
type Transaction = {
  id: string; mbDate: string; assetId: string; toAssetId?: string; targetAssetId?: string;
  payType: string; mcid: string; mbCategory: string; mcscid?: string; subCategory?: string;
  mbContent?: string; mbCash: number; inOutCode: string; inOutType: string; mbDetailContent?: string;
};
type DashboardData = {
  assetSummary?: { totalAsset: number; asset: number; debt: number };
  monthlyTrend?: { month: string; total: number; asset: number; debt: number }[];
};
type SummaryData = {
  summary?: { income: number; outcome: number; sum: number };
  incomeByCategory?: unknown[]; expenseByCategory?: unknown[];
};
type FormState = {
  id?: string; mbDate: string; kind: "0" | "1"; inOutType: string; assetId: string; payType: string;
  mcid: string; mcscid: string; mbCash: string; mbContent: string; mbDetailContent: string;
};

const today = new Date();
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const initialEnd = iso(today);
const initialStart = iso(new Date(today.getFullYear(), today.getMonth(), 1));

async function api<T>(name: string, args: object = {}): Promise<T> {
  const response = await fetch(`/api/tools/${name}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args),
  });
  const json = await response.json();
  if (!response.ok || !json.success) throw new Error(json.error || `Request failed (${response.status})`);
  if (json.data && typeof json.data === "object" && "success" in json.data && json.data.success === false) {
    throw new Error(json.data.message || "Money Manager rejected the request");
  }
  return json.data as T;
}
function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value) || 0);
}
function errorMessage(e: unknown) { return e instanceof Error ? e.message : "Something went wrong"; }
function blankForm(kind: "0" | "1" = "1"): FormState {
  return { mbDate: iso(new Date()), kind, inOutType: kind === "0" ? "Income" : "Expense", assetId: "", payType: "", mcid: "", mcscid: "", mbCash: "", mbContent: "", mbDetailContent: "" };
}

export default function App() {
  const [page, setPage] = useState<"Overview" | "Transactions" | "Accounts">("Overview");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accountsData, setAccountsData] = useState<AccountsPayload | null>(null);
  const [accountForm, setAccountForm] = useState<AccountFormState | null>(null);
  const [accountSaving, setAccountSaving] = useState(false);
  const [init, setInit] = useState<InitPayload | null>(null);
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [loading, setLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [connected, setConnected] = useState(false);
  const [mbid, setMbid] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [form, setForm] = useState<FormState | null>(null);

  const loadTx = useCallback(async (bookId = mbid, from = startDate, to = endDate) => {
    if (!bookId) return;
    setTxLoading(true);
    try {
      const result = await api<{ transactions?: Transaction[] } | Transaction[]>("transaction_list", { startDate: from, endDate: to, mbid: bookId });
      const rows = Array.isArray(result) ? result : result.transactions;
      setTransactions(rows || []);
    } catch (e) { setError(errorMessage(e)); }
    finally { setTxLoading(false); }
  }, [mbid, startDate, endDate]);

  const loadAccounts = useCallback(async () => {
    try {
      const result = await api<AccountsPayload>("asset_list");
      setAccountsData(result);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    if (page === "Accounts") void loadAccounts();
  }, [page, loadAccounts]);

  const refresh = useCallback(async () => {
    setLoading(true); setError(""); setNotice("");
    try {
      const [initResult, overview] = await Promise.all([
        api<InitPayload>("init_get_data"), api<DashboardData>("dashboard_get_overview"),
      ]);
      setInit(initResult); setMbid(initResult.initData.mbid); setDashboard(overview); setConnected(true);
      const [totals, txResult] = await Promise.all([
        api<SummaryData>("summary_get_period", { startDate, endDate }),
        api<{ transactions?: Transaction[] } | Transaction[]>("transaction_list", { startDate, endDate, mbid: initResult.initData.mbid }),
      ]);
      setSummary(totals);
      setTransactions(Array.isArray(txResult) ? txResult : (txResult.transactions || []));
    } catch (e) { setConnected(false); setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { setPageNo(1); }, [query, typeFilter, categoryFilter, accountFilter, sortOrder, startDate, endDate, pageSize]);

  const allCategories = useMemo(() => [ ...(init?.categories?.income || []), ...(init?.categories?.expense || []) ], [init]);
  const currentCategories = form?.kind === "0" ? (init?.categories?.income || []) : (init?.categories?.expense || []);
  const selectedCategory = currentCategories.find(c => c.mcid === form?.mcid);
  const subcategories = selectedCategory?.mcsc || [];
  const accountName = (id: string) => init?.assetNames?.find(a => a.assetId === id)?.assetName || id || "—";

  const visibleTransactions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = transactions.filter(tx => {
      const isIncome = tx.inOutCode === "0";
      const isExpense = tx.inOutCode === "1";
      const typeOk = typeFilter === "all" || (typeFilter === "0" && isIncome) || (typeFilter === "1" && isExpense) || (typeFilter === "transfer" && !isIncome && !isExpense);
      const categoryOk = categoryFilter === "all" || tx.mcid === categoryFilter || tx.mbCategory === categoryFilter;
      const accountOk = accountFilter === "all" || tx.assetId === accountFilter;
      const searchOk = !q || [tx.mbContent, tx.mbCategory, tx.subCategory, tx.mbDetailContent, tx.payType, accountName(tx.assetId)].some(v => String(v || "").toLowerCase().includes(q));
      return typeOk && categoryOk && accountOk && searchOk;
    });
    return filtered.sort((a, b) => {
      if (sortOrder === "highest") return Number(b.mbCash) - Number(a.mbCash);
      if (sortOrder === "lowest") return Number(a.mbCash) - Number(b.mbCash);
      return sortOrder === "newest" ? String(b.mbDate).localeCompare(String(a.mbDate)) : String(a.mbDate).localeCompare(String(b.mbDate));
    });
  }, [transactions, query, typeFilter, categoryFilter, accountFilter, sortOrder, init]);

  function openCreate() {
    const kind: "0" | "1" = typeFilter === "0" ? "0" : "1";
    const cats = kind === "0" ? init?.categories?.income : init?.categories?.expense;
    const priorType = transactions.find(tx => tx.inOutCode === kind)?.inOutType || (kind === "0" ? "Income" : "Expense");
    setForm({ ...blankForm(kind), inOutType: priorType, assetId: init?.assetNames?.[0]?.assetId || "", payType: init?.paymentTypes?.[0]?.ptname || "", mcid: cats?.[0]?.mcid || "" });
  }
  function openEdit(tx: Transaction) {
    if (tx.inOutCode !== "0" && tx.inOutCode !== "1") { setError("Editing transfer records is not supported in this transaction form. Use the Transfers module for those records."); return; }
    const kind: "0" | "1" = tx.inOutCode === "0" ? "0" : "1";
    const cats = kind === "0" ? init?.categories?.income : init?.categories?.expense;
    const categoryId = cats?.some(c => c.mcid === tx.mcid) ? tx.mcid : (cats?.find(c => c.mcname === tx.mbCategory)?.mcid || "");
    setForm({ id: tx.id, mbDate: String(tx.mbDate).slice(0, 10), kind, inOutType: tx.inOutType || kind, assetId: tx.assetId || "", payType: tx.payType || "", mcid: categoryId, mcscid: tx.mcscid || "", mbCash: String(tx.mbCash ?? ""), mbContent: tx.mbContent || "", mbDetailContent: tx.mbDetailContent || "" });
    setError("");
  }
  async function saveTransaction(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!form || !mbid) return;
    const amount = Number(form.mbCash);
    if (!Number.isFinite(amount) || amount <= 0) { setError("Enter an amount greater than zero."); return; }
    if (!form.assetId || !form.mcid || !form.payType) { setError("Choose an account, category and payment type."); return; }
    const category = currentCategories.find(c => c.mcid === form.mcid);
    const sub = category?.mcsc?.find(s => s.mcscid === form.mcscid);
    const payload = {
      ...(form.id ? { id: form.id } : {}), mbDate: form.mbDate, assetId: form.assetId,
      payType: form.payType, mcid: form.mcid, mbCategory: category?.mcname || "",
      mbCash: amount, inOutCode: form.kind, inOutType: form.inOutType || (form.kind === "0" ? "Income" : "Expense"),
      ...(form.mcscid ? { mcscid: form.mcscid, subCategory: sub?.mcscname || "" } : {}),
      ...(form.mbContent.trim() ? { mbContent: form.mbContent.trim() } : {}),
      ...(form.mbDetailContent.trim() ? { mbDetailContent: form.mbDetailContent.trim() } : {}),
    };
    setSaving(true); setError(""); setNotice("");
    try {
      await api(form.id ? "transaction_update" : "transaction_create", payload);
      const message = form.id ? "Transaction updated." : "Transaction added.";
      setForm(null);
      await refresh();
      setNotice(message);
    } catch (e) { setError(errorMessage(e)); }
    finally { setSaving(false); }
  }
  async function deleteTransaction(tx: Transaction) {
    if (!window.confirm(`Delete this ${tx.inOutCode === "0" ? "income" : "expense"} transaction for ${money(tx.mbCash)}? This cannot be undone.`)) return;
    setError(""); setNotice("");
    try { await api("transaction_delete", { ids: [tx.id] }); await refresh(); setNotice("Transaction deleted."); }
    catch (e) { setError(errorMessage(e)); }
  }

  const accountGroups = accountsData?.assetGroups || [];
  const flattenedAccounts = accountGroups.flatMap(group => (group.children || []).map(account => ({ ...account, assetGroupId: group.assetGroupId, groupName: group.assetName })));

  function openAccountCreate() {
    setAccountForm({ assetGroupId: accountGroups[0]?.assetGroupId || "", assetName: "", assetMoney: "0" });
    setError("");
  }

  function openAccountEdit(account: Account & { groupName?: string }) {
    setAccountForm({ assetId: account.assetId, assetGroupId: account.assetGroupId || accountGroups[0]?.assetGroupId || "", assetName: account.assetName, assetMoney: String(account.assetMoney ?? 0) });
    setError("");
  }

  async function saveAccount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!accountForm) return;
    const group = accountGroups.find(item => item.assetGroupId === accountForm.assetGroupId);
    if (!group) { setError("Choose a valid account group."); return; }
    const balance = Number(accountForm.assetMoney);
    if (!Number.isFinite(balance)) { setError("Enter a valid balance."); return; }
    if (!accountForm.assetName.trim()) { setError("Enter an account name."); return; }
    const payload = { ...(accountForm.assetId ? { assetId: accountForm.assetId } : {}), assetGroupId: group.assetGroupId, assetGroupName: group.assetName, assetName: accountForm.assetName.trim(), assetMoney: balance };
    setAccountSaving(true); setError(""); setNotice("");
    try {
      await api(accountForm.assetId ? "asset_update" : "asset_create", payload);
      setAccountForm(null);
      await loadAccounts();
      await refresh();
      setNotice(accountForm.assetId ? "Account updated." : "Account created.");
    } catch (e) { setError(errorMessage(e)); }
    finally { setAccountSaving(false); }
  }

  async function deleteAccount(account: Account & { groupName?: string }) {
    if (!window.confirm(`Delete account “${account.assetName}”? This action cannot be undone and may be rejected if the account is in use.`)) return;
    setError(""); setNotice("");
    try {
      await api("asset_delete", { assetId: account.assetId });
      await loadAccounts();
      await refresh();
      setNotice("Account deleted.");
    } catch (e) { setError(errorMessage(e)); }
  }

  const pageCount = Math.max(1, Math.ceil(visibleTransactions.length / pageSize));
  const pageRows = visibleTransactions.slice((pageNo - 1) * pageSize, pageNo * pageSize);
  const assets = dashboard?.assetSummary;
  const totals = summary?.summary;
  const incomeCategories = init?.categories?.income || [];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-icon"><Wallet size={22} /></div><div><strong>Money</strong><span>PERSONAL FINANCE</span></div></div>
        <div className="nav-label">WORKSPACE</div>
        <button className={`nav-item ${page === "Overview" ? "active" : ""}`} onClick={() => setPage("Overview")}><Activity size={18} /> Overview</button>
        <button className={`nav-item ${page === "Transactions" ? "active" : ""}`} onClick={() => setPage("Transactions")}><ArrowDownLeft size={18} /> Transactions</button>
        <button className={`nav-item ${page === "Accounts" ? "active" : ""}`} onClick={() => setPage("Accounts")}><Landmark size={18} /> Accounts</button>
        <div className="sidebar-bottom"><span className={`status-dot ${connected ? "online" : ""}`} />{connected ? "Phone connected" : "Not connected"}</div>
      </aside>

      <section className="workspace">
        <header className="topbar"><div><div className="eyebrow">PERSONAL FINANCE</div><h1>{page}</h1><p>{page === "Overview" ? "A live snapshot of your financial position." : page === "Transactions" ? "Create, find, update and remove income or expense records." : "Manage your bank accounts, cash wallets and account balances."}</p></div>
          <button className="refresh-button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh</button>
        </header>
        {error && <div className="error-banner"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError("")}><X size={15} /></button></div>}
        {notice && <div className="success-banner"><Check size={16} /><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice("")}><X size={15} /></button></div>}

        {page === "Overview" ? <>
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
          <section className="panel transactions-panel"><div className="panel-heading"><div><h2>Recent transactions</h2><p>{transactions.length} records loaded for the selected period</p></div><button className="secondary-button" onClick={() => setPage("Transactions")}>Manage transactions <ArrowDownUp size={15} /></button></div><TransactionTable rows={transactions.slice(0, 8)} accountName={accountName} onEdit={openEdit} onDelete={tx => void deleteTransaction(tx)} /></section>
        </> : page === "Transactions" ? <>
          <section className="section-heading tx-toolbar"><div><h2>Transaction register</h2><p>{visibleTransactions.length} of {transactions.length} records · {startDate} to {endDate}</p></div><button className="primary-button" onClick={openCreate}><CirclePlus size={17} /> Add transaction</button></section>
          <section className="panel filter-panel">
            <div className="filter-row"><label className="search-field"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search description, category, account…" /></label>
              <label className="compact-field"><span>From</span><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label><label className="compact-field"><span>To</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
            </div>
            <div className="filter-row secondary-filters"><label><Filter size={14} /><select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="all">All types</option><option value="0">Income</option><option value="1">Expense</option><option value="transfer">Transfers</option></select></label>
              <label><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="all">All categories</option>{allCategories.map(c => <option key={c.mcid} value={c.mcid}>{c.mcname}</option>)}</select></label>
              <label><select value={accountFilter} onChange={e => setAccountFilter(e.target.value)}><option value="all">All accounts</option>{(init?.assetNames || []).map(a => <option key={a.assetId} value={a.assetId}>{a.assetName}</option>)}</select></label>
              <label><select value={sortOrder} onChange={e => setSortOrder(e.target.value as typeof sortOrder)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Amount: high to low</option><option value="lowest">Amount: low to high</option></select><ChevronDown size={13} /></label>
              <button className="text-button" onClick={() => { setQuery(""); setTypeFilter("all"); setCategoryFilter("all"); setAccountFilter("all"); setSortOrder("newest"); }}>Clear filters</button>
            </div>
          </section>
          <section className="panel transactions-panel"><div className="panel-heading"><div><h2>All transactions</h2><p>{txLoading ? "Loading records…" : `${visibleTransactions.length} matching records`}</p></div><button className="secondary-button" onClick={() => void loadTx()} disabled={txLoading}><RefreshCw size={14} className={txLoading ? "spin" : ""} /> Reload</button></div><TransactionTable rows={pageRows} accountName={accountName} onEdit={openEdit} onDelete={tx => void deleteTransaction(tx)} loading={txLoading} /><div className="pagination-bar"><span>Showing {visibleTransactions.length ? (pageNo - 1) * pageSize + 1 : 0}–{Math.min(pageNo * pageSize, visibleTransactions.length)} of {visibleTransactions.length}</span><label>Rows <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></label><div><button className="secondary-button" disabled={pageNo <= 1} onClick={() => setPageNo(n => Math.max(1, n - 1))}>Previous</button><span>Page {pageNo} / {pageCount}</span><button className="secondary-button" disabled={pageNo >= pageCount} onClick={() => setPageNo(n => Math.min(pageCount, n + 1))}>Next</button></div></div></section>
        </> : <>
          <section className="section-heading tx-toolbar"><div><h2>Accounts & balances</h2><p>{flattenedAccounts.length} accounts across {accountGroups.length} groups</p></div><button className="primary-button" onClick={openAccountCreate}><CirclePlus size={17} /> Add account</button></section>
          <section className="stats-grid account-stats"><article className="stat-card primary-card"><span className="stat-label">TOTAL ACCOUNT BALANCE</span><Wallet size={19} /><strong>{money(Number(accountsData?.totalBalance ?? flattenedAccounts.reduce((sum, a) => sum + (Number(a.assetMoney) || 0), 0)))}</strong><small>Balance reported by Money Manager</small></article><article className="stat-card"><span className="stat-label">ACCOUNT GROUPS</span><Landmark size={19} /><strong>{accountGroups.length}</strong><small>Groups from your Money Manager setup</small></article><article className="stat-card"><span className="stat-label">ACCOUNTS</span><Wallet size={19} /><strong>{flattenedAccounts.length}</strong><small>Individual accounts and wallets</small></article><article className="stat-card"><span className="stat-label">DATA SOURCE</span><Activity size={19} /><strong>Live</strong><small>Fetched from your connected server</small></article></section>
          {accountGroups.length ? accountGroups.map(group => <section className="panel transactions-panel account-group-panel" key={group.assetGroupId}><div className="panel-heading"><div><h2>{group.assetName}</h2><p>{(group.children || []).length} accounts in this group</p></div><strong className="group-total">{money(Number(group.assetMoney) || (group.children || []).reduce((sum, a) => sum + (Number(a.assetMoney) || 0), 0))}</strong></div><div className="table-wrap"><table><thead><tr><th>Account name</th><th>Account ID</th><th className="amount">Balance</th><th className="actions-heading">Actions</th></tr></thead><tbody>{(group.children || []).map(account => <tr key={account.assetId}><td><strong className="tx-title">{account.assetName}</strong></td><td><span className="muted-id">{account.assetId}</span></td><td className="amount">{money(Number(account.assetMoney) || 0)}</td><td><div className="row-actions"><button className="icon-button" onClick={() => openAccountEdit({ ...account, assetGroupId: group.assetGroupId })} title="Edit account" aria-label={`Edit ${account.assetName}`}><Pencil size={15} /></button><button className="icon-button danger-action" onClick={() => void deleteAccount({ ...account, assetGroupId: group.assetGroupId })} title="Delete account" aria-label={`Delete ${account.assetName}`}><Trash2 size={15} /></button></div></td></tr>)}{!group.children?.length && <tr><td colSpan={4} className="empty-state">No accounts in this group.</td></tr>}</tbody></table></div></section>) : <section className="panel empty-state">{loading ? "Loading accounts…" : "No account groups were returned by Money Manager."}</section>}
          <section className="panel account-note"><strong>Account changes affect your real Money Manager data.</strong><p>Deleting an account may be blocked if it is linked to transactions or other records. If a change fails, the server error will be shown above.</p></section>
        </>}
      </section>

      {accountForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !accountSaving) setAccountForm(null); }}><section className="transaction-modal account-modal" role="dialog" aria-modal="true" aria-labelledby="account-modal-title"><header className="modal-header"><div><div className="eyebrow">ACCOUNT DETAILS</div><h2 id="account-modal-title">{accountForm.assetId ? "Edit account" : "Add account"}</h2></div><button className="icon-button" onClick={() => setAccountForm(null)} disabled={accountSaving} aria-label="Close"><X size={18} /></button></header><form onSubmit={e => void saveAccount(e)} className="transaction-form"><label className="full-field">Account group<select required value={accountForm.assetGroupId} onChange={e => setAccountForm(f => f ? { ...f, assetGroupId: e.target.value } : f)}><option value="">Select group</option>{accountGroups.map(group => <option key={group.assetGroupId} value={group.assetGroupId}>{group.assetName}</option>)}</select></label><label className="full-field">Account name<input required maxLength={100} value={accountForm.assetName} onChange={e => setAccountForm(f => f ? { ...f, assetName: e.target.value } : f)} placeholder="e.g. Main savings account" /></label><label className="full-field">Balance (INR)<input required type="number" step="0.01" value={accountForm.assetMoney} onChange={e => setAccountForm(f => f ? { ...f, assetMoney: e.target.value } : f)} /></label><div className="account-warning full-field">Use the balance field carefully. This updates the balance recorded by Money Manager; it does not create a transaction.</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setAccountForm(null)} disabled={accountSaving}>Cancel</button><button type="submit" className="primary-button" disabled={accountSaving || !accountGroups.length}>{accountSaving ? <><RefreshCw size={15} className="spin" /> Saving…</> : <><Check size={15} /> {accountForm.assetId ? "Save changes" : "Create account"}</>}</button></div></form></section></div>}

      {form && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !saving) setForm(null); }}><section className="transaction-modal" role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title"><header className="modal-header"><div><div className="eyebrow">TRANSACTION DETAILS</div><h2 id="transaction-modal-title">{form.id ? "Edit transaction" : "Add transaction"}</h2></div><button className="icon-button" onClick={() => setForm(null)} disabled={saving} aria-label="Close"><X size={18} /></button></header>
        <form onSubmit={e => void saveTransaction(e)} className="transaction-form">
          <div className="kind-switch"><button type="button" className={form.kind === "1" ? "selected expense-choice" : ""} onClick={() => setForm(f => f ? { ...f, kind: "1", inOutType: transactions.find(tx => tx.inOutCode === "1")?.inOutType || "Expense", mcid: "", mcscid: "" } : f)}>Expense</button><button type="button" className={form.kind === "0" ? "selected income-choice" : ""} onClick={() => setForm(f => f ? { ...f, kind: "0", inOutType: transactions.find(tx => tx.inOutCode === "0")?.inOutType || "Income", mcid: "", mcscid: "" } : f)}>Income</button></div>
          <label>Date<input required type="date" value={form.mbDate} onChange={e => setForm(f => f ? { ...f, mbDate: e.target.value } : f)} /></label>
          <label>Amount (INR)<input required type="number" min="0.01" step="0.01" placeholder="0.00" value={form.mbCash} onChange={e => setForm(f => f ? { ...f, mbCash: e.target.value } : f)} /></label>
          <label>Account<select required value={form.assetId} onChange={e => setForm(f => f ? { ...f, assetId: e.target.value } : f)}><option value="">Select account</option>{(init?.assetNames || []).map(a => <option key={a.assetId} value={a.assetId}>{a.assetName}</option>)}</select></label>
          <label>Category<select required value={form.mcid} onChange={e => setForm(f => f ? { ...f, mcid: e.target.value, mcscid: "" } : f)}><option value="">Select category</option>{currentCategories.map(c => <option key={c.mcid} value={c.mcid}>{c.mcname}</option>)}</select></label>
          {subcategories.length > 0 && <label>Subcategory<select value={form.mcscid} onChange={e => setForm(f => f ? { ...f, mcscid: e.target.value } : f)}><option value="">No subcategory</option>{subcategories.map(s => <option key={s.mcscid} value={s.mcscid}>{s.mcscname}</option>)}</select></label>}
          <label>Payment method<select required value={form.payType} onChange={e => setForm(f => f ? { ...f, payType: e.target.value } : f)}><option value="">Select payment method</option>{(init?.paymentTypes || []).map(p => <option key={p.ptid} value={p.ptname}>{p.ptname}</option>)}</select></label>
          <label className="full-field">Description<input value={form.mbContent} onChange={e => setForm(f => f ? { ...f, mbContent: e.target.value } : f)} placeholder="e.g. Groceries, salary, electricity bill" /></label>
          <label className="full-field">Notes<textarea rows={3} value={form.mbDetailContent} onChange={e => setForm(f => f ? { ...f, mbDetailContent: e.target.value } : f)} placeholder="Optional details" /></label>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setForm(null)} disabled={saving}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? <><RefreshCw size={15} className="spin" /> Saving…</> : <><Check size={15} /> {form.id ? "Save changes" : "Save transaction"}</>}</button></div>
        </form></section></div>}
    </main>
  );
}

function TransactionTable({ rows, accountName, onEdit, onDelete, loading = false }: {
  rows: Transaction[]; accountName: (id: string) => string; onEdit: (tx: Transaction) => void; onDelete: (tx: Transaction) => void; loading?: boolean;
}) {
  return <div className="table-wrap"><table><thead><tr><th>Date</th><th>Transaction</th><th>Account</th><th>Category</th><th>Payment</th><th>Type</th><th className="amount">Amount</th><th className="actions-heading">Actions</th></tr></thead><tbody>
    {rows.map(tx => { const income = tx.inOutCode === "0"; const expense = tx.inOutCode === "1"; const editable = income || expense; return <tr key={tx.id}><td>{String(tx.mbDate || "").slice(0, 10)}</td><td><strong className="tx-title">{tx.mbContent || tx.mbDetailContent || "Untitled transaction"}</strong>{tx.mbDetailContent && tx.mbContent && <small className="tx-note">{tx.mbDetailContent}</small>}</td><td>{accountName(tx.assetId)}</td><td>{tx.subCategory ? `${tx.mbCategory} / ${tx.subCategory}` : tx.mbCategory || "Uncategorised"}</td><td>{tx.payType || "—"}</td><td><span className={`type-pill ${income ? "income-pill" : expense ? "expense-pill" : "transfer-pill"}`}>{income ? "Income" : expense ? "Expense" : "Transfer"}</span></td><td className={`amount ${income ? "positive-amount" : expense ? "negative-amount" : ""}`}>{income ? "+" : expense ? "−" : ""}{money(tx.mbCash)}</td><td><div className="row-actions"><button className="icon-button" onClick={() => onEdit(tx)} disabled={!editable} title={editable ? "Edit transaction" : "Edit transfers in the Transfers module"} aria-label="Edit transaction"><Pencil size={15} /></button><button className="icon-button danger-action" onClick={() => onDelete(tx)} title="Delete transaction" aria-label="Delete transaction"><Trash2 size={15} /></button></div></td></tr>; })}
    {!rows.length && <tr><td colSpan={8} className="empty-state">{loading ? "Loading transactions…" : "No transactions match these filters."}</td></tr>}
  </tbody></table></div>;
}