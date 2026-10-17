import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarClock, Check, CreditCard as CardIcon, Landmark, Pencil, Plus, RefreshCw, Wallet, X } from "lucide-react";
import type { AssetName, CardGroup, CardsPayload, CreditCard } from "../types/index.ts";
import { api, errorMessage, money } from "../utils/finance.ts";

type CardForm = {
  assetId?: string;
  cardName: string;
  linkAssetId: string;
  notPayMoney: string;
  jungsanDay: string;
  paymentDay: string;
};

type Props = {
  assetNames: AssetName[];
  onError: (message: string) => void;
  onNotice: (message: string) => void;
};

const emptyForm = (assetNames: AssetName[]): CardForm => ({
  cardName: "",
  linkAssetId: assetNames[0]?.assetId || "",
  notPayMoney: "0",
  jungsanDay: "1",
  paymentDay: "1",
});

export default function CreditCardsPage({ assetNames, onError, onNotice }: Props) {
  const [data, setData] = useState<CardsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CardForm | null>(null);

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<CardsPayload>("card_list"));
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { void loadCards(); }, [loadCards]);

  const groups: CardGroup[] = data?.cardGroups || [];
  const cards = useMemo(() => groups.flatMap(group => group.children || []), [groups]);
  const totalUnpaid = Number(data?.totalUnpaid ?? cards.reduce((sum, card) => sum + Math.abs(Number(card.notPayMoney) || 0), 0));

  function openCreate() {
    if (!assetNames.length) {
      onError("No payment accounts are available. Refresh Money Manager data and create an account before adding a credit card.");
      return;
    }
    onError("");
    onNotice("");
    setForm(emptyForm(assetNames));
  }

  function openEdit(card: CreditCard) {
    if (!assetNames.length) {
      onError("No payment accounts are available. Refresh Money Manager data before editing this card.");
      return;
    }
    onError("");
    onNotice("");
    setForm({
      assetId: card.assetId,
      cardName: card.assetName,
      linkAssetId: card.linkAssetId || assetNames.find(item => item.assetName === card.linkAssetName)?.assetId || assetNames[0].assetId,
      notPayMoney: String(Math.abs(Number(card.notPayMoney) || 0)),
      jungsanDay: String(card.jungsanDay || 1),
      paymentDay: String(card.paymentDay || 1),
    });
  }

  async function saveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    const linkedAccount = assetNames.find(item => item.assetId === form.linkAssetId);
    const jungsanDay = Number(form.jungsanDay);
    const paymentDay = Number(form.paymentDay);
    const unpaid = Number(form.notPayMoney);
    if (!form.cardName.trim()) { onError("Enter a credit card name."); return; }
    if (!linkedAccount) { onError("Choose a linked payment account."); return; }
    if (!Number.isInteger(jungsanDay) || jungsanDay < 1 || jungsanDay > 31) { onError("Billing calculation day must be between 1 and 31."); return; }
    if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) { onError("Payment due day must be between 1 and 31."); return; }
    if (!Number.isFinite(unpaid) || unpaid < 0) { onError("Enter a valid non-negative unpaid balance."); return; }

    setSaving(true);
    onError("");
    onNotice("");
    try {
      const payload = {
        ...(form.assetId ? { assetId: form.assetId } : {}),
        cardName: form.cardName.trim(),
        linkAssetId: linkedAccount.assetId,
        linkAssetName: linkedAccount.assetName,
        notPayMoney: -Math.abs(unpaid),
        jungsanDay,
        paymentDay,
      };
      const result = await api<{ success?: boolean; message?: string }>(form.assetId ? "card_update" : "card_create", payload);
      if (result.success === false) throw new Error(result.message || "Money Manager could not save this credit card.");
      const wasEdit = Boolean(form.assetId);
      setForm(null);
      await loadCards();
      onNotice(wasEdit ? "Credit card updated." : "Credit card created.");
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="section-heading tx-toolbar credit-card-toolbar">
        <div><h2>Credit cards</h2><p>Manage linked payment accounts, unpaid balances and billing dates.</p></div>
        <button className="primary-button" onClick={openCreate} disabled={!assetNames.length}><Plus size={17} /> Add credit card</button>
      </section>

      <section className="stats-grid credit-card-stats">
        <article className="stat-card primary-card"><span className="stat-label">TOTAL UNPAID</span><CardIcon size={19} /><strong>{money(totalUnpaid)}</strong><small>Combined unpaid balance across cards</small></article>
        <article className="stat-card"><span className="stat-label">CREDIT CARDS</span><CardIcon size={19} /><strong>{cards.length}</strong><small>Cards registered in Money Manager</small></article>
        <article className="stat-card"><span className="stat-label">LINKED ACCOUNTS</span><Landmark size={19} /><strong>{new Set(cards.map(card => card.linkAssetId).filter(Boolean)).size}</strong><small>Payment accounts currently linked</small></article>
        <article className="stat-card"><span className="stat-label">DATA SOURCE</span><Wallet size={19} /><strong>Live</strong><small>Fetched from your connected server</small></article>
      </section>

      <section className="panel credit-card-list-panel">
        <div className="panel-heading"><div><h2>Card register</h2><p>{loading ? "Loading credit cards…" : cards.length + " cards across " + groups.length + " groups"}</p></div><button className="secondary-button" onClick={() => void loadCards()} disabled={loading}><RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh cards</button></div>
        {!loading && !cards.length && <div className="credit-card-empty"><CardIcon size={28} /><strong>No credit cards found</strong><p>Add a card to track its unpaid balance, linked account and billing schedule.</p></div>}
        {groups.map(group => (
          <div className="credit-card-group" key={group.assetGroupId}>
            <div className="credit-card-group-heading"><div><h3>{group.assetName}</h3><p>{(group.children || []).length} cards</p></div><strong>{money(Math.abs(Number(group.notPayMoney) || 0))}</strong></div>
            <div className="credit-card-grid">
              {(group.children || []).map(card => (
                <article className="credit-card-item" key={card.assetId}>
                  <div className="credit-card-item-top"><span className="credit-card-chip"><CardIcon size={19} /></span><button className="icon-button" onClick={() => openEdit(card)} title="Edit credit card" aria-label={"Edit " + card.assetName}><Pencil size={15} /></button></div>
                  <div className="credit-card-name">{card.assetName}</div>
                  <div className="credit-card-balance-label">UNPAID BALANCE</div>
                  <div className="credit-card-balance">{money(Math.abs(Number(card.notPayMoney) || 0))}</div>
                  <div className="credit-card-meta"><span><Landmark size={14} /> Linked account</span><strong>{card.linkAssetName || assetNames.find(item => item.assetId === card.linkAssetId)?.assetName || card.linkAssetId || "Not linked"}</strong></div>
                  <div className="credit-card-schedule">
                    <div><span><CalendarClock size={14} /> Billing day</span><strong>{card.jungsanDay || "—"}</strong></div>
                    <div><span><CalendarClock size={14} /> Payment day</span><strong>{card.paymentDay || "—"}</strong></div>
                  </div>
                  <div className="credit-card-previous"><span>Previous balance</span><strong>{money(Number(card.assetMoney) || 0)}</strong></div>
                </article>
              ))}
            </div>
          </div>
        ))}
        {!loading && !groups.length && <div className="credit-card-empty"><p>No card groups were returned by Money Manager.</p></div>}
      </section>

      <section className="panel account-note credit-card-note"><strong>Important</strong><p>Money Manager does not expose a credit-card deletion endpoint, so cards can be created and edited here but not deleted. Unpaid balance is sent to Money Manager as a negative value, matching its API.</p></section>

      {form && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setForm(null); }}><section className="transaction-modal account-modal" role="dialog" aria-modal="true" aria-labelledby="credit-card-modal-title">
        <header className="modal-header"><div><div className="eyebrow">CREDIT CARD DETAILS</div><h2 id="credit-card-modal-title">{form.assetId ? "Edit credit card" : "Add credit card"}</h2></div><button className="icon-button" onClick={() => setForm(null)} disabled={saving} aria-label="Close"><X size={18} /></button></header>
        <form onSubmit={event => void saveCard(event)} className="transaction-form">
          <label className="full-field">Card name<input required maxLength={100} value={form.cardName} onChange={event => setForm(current => current ? { ...current, cardName: event.target.value } : current)} placeholder="e.g. Everyday Rewards" /></label>
          <label className="full-field">Linked payment account<select required value={form.linkAssetId} onChange={event => setForm(current => current ? { ...current, linkAssetId: event.target.value } : current)}><option value="">Select payment account</option>{assetNames.map(account => <option key={account.assetId} value={account.assetId}>{account.assetName}</option>)}</select></label>
          <label className="full-field">Unpaid balance (INR)<input required type="number" min="0" step="0.01" value={form.notPayMoney} onChange={event => setForm(current => current ? { ...current, notPayMoney: event.target.value } : current)} /><small className="field-hint">Enter the positive amount you still owe; it will be stored using Money Manager’s expected sign.</small></label>
          <label>Billing calculation day<input required type="number" min="1" max="31" step="1" value={form.jungsanDay} onChange={event => setForm(current => current ? { ...current, jungsanDay: event.target.value } : current)} /></label>
          <label>Payment due day<input required type="number" min="1" max="31" step="1" value={form.paymentDay} onChange={event => setForm(current => current ? { ...current, paymentDay: event.target.value } : current)} /></label>
          <div className="account-warning full-field">Both billing days are required by Money Manager. The card will be created only after all fields are supplied.</div>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setForm(null)} disabled={saving}>Cancel</button><button type="submit" className="primary-button" disabled={saving || !assetNames.length}>{saving ? <><RefreshCw size={15} className="spin" /> Saving…</> : <><Check size={15} /> {form.assetId ? "Save changes" : "Create credit card"}</>}</button></div>
        </form>
      </section></div>}
    </>
  );
}
