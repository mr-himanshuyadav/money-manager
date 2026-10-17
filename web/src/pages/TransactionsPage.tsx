import { ChevronDown, CirclePlus, Filter, RefreshCw, Search } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { Category, InitPayload, SortOrder, Transaction } from "../types/index.ts";
import TransactionTable from "../components/TransactionTable.tsx";

type Props = {
  visibleTransactions: Transaction[]; transactions: Transaction[]; pageRows: Transaction[];
  startDate: string; endDate: string; setStartDate: Dispatch<SetStateAction<string>>; setEndDate: Dispatch<SetStateAction<string>>;
  query: string; setQuery: Dispatch<SetStateAction<string>>; typeFilter: string; setTypeFilter: Dispatch<SetStateAction<string>>;
  categoryFilter: string; setCategoryFilter: Dispatch<SetStateAction<string>>; accountFilter: string; setAccountFilter: Dispatch<SetStateAction<string>>;
  sortOrder: SortOrder; setSortOrder: Dispatch<SetStateAction<SortOrder>>; allCategories: Category[]; init: InitPayload | null;
  pageNo: number; pageCount: number; pageSize: number; setPageNo: Dispatch<SetStateAction<number>>; setPageSize: Dispatch<SetStateAction<number>>;
  txLoading: boolean; loadTx: () => Promise<void>; onCreate: () => void; onEdit: (tx: Transaction) => void; onDelete: (tx: Transaction) => void; accountName: (id: string) => string;
};

export default function TransactionsPage({ visibleTransactions, transactions, pageRows, startDate, endDate, setStartDate, setEndDate, query, setQuery, typeFilter, setTypeFilter, categoryFilter, setCategoryFilter, accountFilter, setAccountFilter, sortOrder, setSortOrder, allCategories, init, pageNo, pageCount, pageSize, setPageNo, setPageSize, txLoading, loadTx, onCreate, onEdit, onDelete, accountName }: Props) {
  return (
    <>
      <section className="section-heading tx-toolbar"><div><h2>Transaction register</h2><p>{visibleTransactions.length} of {transactions.length} records · {startDate} to {endDate}</p></div><button className="primary-button" onClick={onCreate}><CirclePlus size={17} /> Add transaction</button></section>
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
                <section className="panel transactions-panel"><div className="panel-heading"><div><h2>All transactions</h2><p>{txLoading ? "Loading records…" : `${visibleTransactions.length} matching records`}</p></div><button className="secondary-button" onClick={() => void loadTx()} disabled={txLoading}><RefreshCw size={14} className={txLoading ? "spin" : ""} /> Reload</button></div><TransactionTable rows={pageRows} accountName={accountName} onEdit={onEdit} onDelete={onDelete} loading={txLoading} /><div className="pagination-bar"><span>Showing {visibleTransactions.length ? (pageNo - 1) * pageSize + 1 : 0}–{Math.min(pageNo * pageSize, visibleTransactions.length)} of {visibleTransactions.length}</span><label>Rows <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></label><div><button className="secondary-button" disabled={pageNo <= 1} onClick={() => setPageNo(n => Math.max(1, n - 1))}>Previous</button><span>Page {pageNo} / {pageCount}</span><button className="secondary-button" disabled={pageNo >= pageCount} onClick={() => setPageNo(n => Math.min(pageCount, n + 1))}>Next</button></div></div></section>
    </>
  );
}
