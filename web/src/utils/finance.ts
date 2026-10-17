import type { FormState } from "../types/index.ts";

const today = new Date();
export const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const initialEnd = iso(today);
export const initialStart = iso(new Date(today.getFullYear(), today.getMonth(), 1));

export async function api<T>(name: string, args: object = {}): Promise<T> {
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
export function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value) || 0);
}
export function errorMessage(e: unknown) { return e instanceof Error ? e.message : "Something went wrong"; }
export function blankForm(kind: "0" | "1" = "1"): FormState {
  return { mbDate: iso(new Date()), kind, inOutType: kind === "0" ? "Income" : "Expense", assetId: "", payType: "", mcid: "", mcscid: "", mbCash: "", mbContent: "", mbDetailContent: "" };
}
