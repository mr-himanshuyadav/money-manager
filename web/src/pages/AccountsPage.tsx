import { Activity, CirclePlus, Landmark, Pencil, Trash2, Wallet } from "lucide-react";
import type { Account, AccountGroup, AccountsPayload } from "../types/index.ts";
import { money } from "../utils/finance.ts";

type FlattenedAccount = Account & { assetGroupId: string; groupName: string };
type Props = {
  accountGroups: AccountGroup[]; flattenedAccounts: FlattenedAccount[]; accountsData: AccountsPayload | null; loading: boolean;
  onCreate: () => void; onEdit: (account: Account & { groupName?: string }) => void; onDelete: (account: Account & { groupName?: string }) => void;
};

export default function AccountsPage({ accountGroups, flattenedAccounts, accountsData, loading, onCreate, onEdit, onDelete }: Props) {
  return (
    <>
      <section className="section-heading tx-toolbar"><div><h2>Accounts & balances</h2><p>{flattenedAccounts.length} accounts across {accountGroups.length} groups</p></div><button className="primary-button" onClick={onCreate}><CirclePlus size={17} /> Add account</button></section>
                <section className="stats-grid account-stats"><article className="stat-card primary-card"><span className="stat-label">TOTAL ACCOUNT BALANCE</span><Wallet size={19} /><strong>{money(Number(accountsData?.totalBalance ?? flattenedAccounts.reduce((sum, a) => sum + (Number(a.assetMoney) || 0), 0)))}</strong><small>Balance reported by Money Manager</small></article><article className="stat-card"><span className="stat-label">ACCOUNT GROUPS</span><Landmark size={19} /><strong>{accountGroups.length}</strong><small>Groups from your Money Manager setup</small></article><article className="stat-card"><span className="stat-label">ACCOUNTS</span><Wallet size={19} /><strong>{flattenedAccounts.length}</strong><small>Individual accounts and wallets</small></article><article className="stat-card"><span className="stat-label">DATA SOURCE</span><Activity size={19} /><strong>Live</strong><small>Fetched from your connected server</small></article></section>
                {accountGroups.length ? accountGroups.map(group => <section className="panel transactions-panel account-group-panel" key={group.assetGroupId}><div className="panel-heading"><div><h2>{group.assetName}</h2><p>{(group.children || []).length} accounts in this group</p></div><strong className="group-total">{money(Number(group.assetMoney) || (group.children || []).reduce((sum, a) => sum + (Number(a.assetMoney) || 0), 0))}</strong></div><div className="table-wrap"><table><thead><tr><th>Account name</th><th>Account ID</th><th className="amount">Balance</th><th className="actions-heading">Actions</th></tr></thead><tbody>{(group.children || []).map(account => <tr key={account.assetId}><td><strong className="tx-title">{account.assetName}</strong></td><td><span className="muted-id">{account.assetId}</span></td><td className="amount">{money(Number(account.assetMoney) || 0)}</td><td><div className="row-actions"><button className="icon-button" onClick={() => onEdit({ ...account, assetGroupId: group.assetGroupId })} title="Edit account" aria-label={`Edit ${account.assetName}`}><Pencil size={15} /></button><button className="icon-button danger-action" onClick={() => onDelete({ ...account, assetGroupId: group.assetGroupId })} title="Delete account" aria-label={`Delete ${account.assetName}`}><Trash2 size={15} /></button></div></td></tr>)}{!group.children?.length && <tr><td colSpan={4} className="empty-state">No accounts in this group.</td></tr>}</tbody></table></div></section>) : <section className="panel empty-state">{loading ? "Loading accounts…" : "No account groups were returned by Money Manager."}</section>}
                <section className="panel account-note"><strong>Account changes affect your real Money Manager data.</strong><p>Deleting an account may be blocked if it is linked to transactions or other records. If a change fails, the server error will be shown above.</p></section>
    </>
  );
}
