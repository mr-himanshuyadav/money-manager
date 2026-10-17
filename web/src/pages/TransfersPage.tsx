import { Activity, ArrowLeftRight, Landmark, Pencil, RefreshCw, Wallet, Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { InitPayload, Transaction } from "../types/index.ts";
import { money } from "../utils/finance.ts";

type Props = {
  transferRows: Transaction[]; startDate: string; endDate: string; setStartDate: Dispatch<SetStateAction<string>>; setEndDate: Dispatch<SetStateAction<string>>;
  init: InitPayload | null; accountName: (id: string) => string; txLoading: boolean; loadTx: () => Promise<void>;
  onCreate: () => void; onEdit: (tx: Transaction) => void; onDelete: (tx: Transaction) => void;
};

export default function TransfersPage({ transferRows, startDate, endDate, setStartDate, setEndDate, init, accountName, txLoading, loadTx, onCreate, onEdit, onDelete }: Props) {
  return (
    <>
      <section className="section-heading tx-toolbar"><div><h2>Transfer register</h2><p>{transferRows.length} transfers in the selected period · {startDate} to {endDate}</p></div><button className="primary-button" onClick={onCreate}><CirclePlus size={17} /> New transfer</button></section>
                <section className="stats-grid account-stats">
                  <article className="stat-card primary-card"><span className="stat-label">TRANSFERS SHOWN</span><ArrowLeftRight size={19} /><strong>{transferRows.length}</strong><small>Transfers in the selected date range</small></article>
                  <article className="stat-card"><span className="stat-label">TOTAL TRANSFER VALUE</span><Wallet size={19} /><strong>{money(transferRows.reduce((sum, tx) => sum + (Number(tx.mbCash) || 0), 0))}</strong><small>Sum of transfer records shown</small></article>
                  <article className="stat-card"><span className="stat-label">ACCOUNTS</span><Landmark size={19} /><strong>{init?.assetNames?.length || 0}</strong><small>Available source and destination accounts</small></article>
                  <article className="stat-card"><span className="stat-label">DATA SOURCE</span><Activity size={19} /><strong>Live</strong><small>Fetched from Money Manager</small></article>
                </section>
                <section className="panel filter-panel">
                  <div className="filter-row"><label className="compact-field"><span>From</span><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label><label className="compact-field"><span>To</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></label><button className="secondary-button" onClick={() => void loadTx()} disabled={txLoading}><RefreshCw size={14} className={txLoading ? "spin" : ""} /> Reload transfers</button></div>
                </section>
                <section className="panel transactions-panel"><div className="panel-heading"><div><h2>Transfer history</h2><p>{transferRows.length} matching records</p></div></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>From account</th><th>To account</th><th>Description</th><th className="amount">Amount</th><th className="actions-heading">Actions</th></tr></thead><tbody>
                  {transferRows.map(tx => <tr key={tx.id}><td>{String(tx.mbDate || "").slice(0, 10)}</td><td>{accountName(tx.assetId)}</td><td>{accountName(tx.toAssetId || tx.targetAssetId || "")}</td><td><strong className="tx-title">{tx.mbContent || "Account transfer"}</strong>{tx.mbDetailContent && <small className="tx-note">{tx.mbDetailContent}</small>}</td><td className="amount">{money(Number(tx.mbCash) || 0)}</td><td><div className="row-actions"><button className="icon-button" onClick={() => onEdit(tx)} title="Edit transfer" aria-label="Edit transfer"><Pencil size={15} /></button><button className="icon-button danger-action" onClick={() => onDelete(tx)} title="Delete transfer" aria-label="Delete transfer"><Trash2 size={15} /></button></div></td></tr>)}
                  {!transferRows.length && <tr><td colSpan={6} className="empty-state">{txLoading ? "Loading transfers…" : "No transfers found for this period."}</td></tr>}
                </tbody></table></div></section>
                <section className="panel account-note"><strong>Transfers affect both account balances.</strong><p>Editing a transfer may create a new transfer ID in Money Manager rather than updating the existing record. Delete and edit actions affect your real financial data.</p></section>
    </>
  );
}
