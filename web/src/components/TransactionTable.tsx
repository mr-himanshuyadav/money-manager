import type { Transaction } from "../types/index.ts";
import { Pencil, Trash2 } from "lucide-react";
import { money } from "../utils/finance.ts";

export default function TransactionTable({ rows, accountName, onEdit, onDelete, loading = false }: {
  rows: Transaction[]; accountName: (id: string) => string; onEdit: (tx: Transaction) => void; onDelete: (tx: Transaction) => void; loading?: boolean;
}) {
  return <div className="table-wrap"><table><thead><tr><th>Date</th><th>Transaction</th><th>Account</th><th>Category</th><th>Payment</th><th>Type</th><th className="amount">Amount</th><th className="actions-heading">Actions</th></tr></thead><tbody>
    {rows.map(tx => { const income = tx.inOutCode === "0"; const expense = tx.inOutCode === "1"; const editable = income || expense; return <tr key={tx.id}><td>{String(tx.mbDate || "").slice(0, 10)}</td><td><strong className="tx-title">{tx.mbContent || tx.mbDetailContent || "Untitled transaction"}</strong>{tx.mbDetailContent && tx.mbContent && <small className="tx-note">{tx.mbDetailContent}</small>}</td><td>{accountName(tx.assetId)}</td><td>{tx.subCategory ? `${tx.mbCategory} / ${tx.subCategory}` : tx.mbCategory || "Uncategorised"}</td><td>{tx.payType || "—"}</td><td><span className={`type-pill ${income ? "income-pill" : expense ? "expense-pill" : "transfer-pill"}`}>{income ? "Income" : expense ? "Expense" : "Transfer"}</span></td><td className={`amount ${income ? "positive-amount" : expense ? "negative-amount" : ""}`}>{income ? "+" : expense ? "−" : ""}{money(tx.mbCash)}</td><td><div className="row-actions"><button className="icon-button" onClick={() => onEdit(tx)} disabled={!editable} title={editable ? "Edit transaction" : "Edit transfers in the Transfers module"} aria-label="Edit transaction"><Pencil size={15} /></button><button className="icon-button danger-action" onClick={() => onDelete(tx)} title="Delete transaction" aria-label="Delete transaction"><Trash2 size={15} /></button></div></td></tr>; })}
    {!rows.length && <tr><td colSpan={8} className="empty-state">{loading ? "Loading transactions…" : "No transactions match these filters."}</td></tr>}
  </tbody></table></div>;
}
