export type CategoryChild = { mcscid: string; mcscname: string };
export type Category = { mcid: string; mcname: string; mcsc?: CategoryChild[] };
export type PaymentType = { ptid: string; ptname: string };
export type AssetName = { assetId: string; assetType: string; assetName: string };
export type Account = { assetId: string; assetGroupId?: string; assetType: "group" | "item"; assetName: string; assetMoney: number; linkAssetId?: string; linkAssetName?: string };
export type AccountGroup = { assetGroupId: string; assetType: "group"; assetName: string; assetMoney: number; color?: string; children: Account[] };
export type AccountsPayload = { assetGroups?: AccountGroup[]; totalBalance?: number };
export type AccountFormState = { assetId?: string; assetGroupId: string; assetName: string; assetMoney: string };
export type TransferFormState = { id?: string; moveDate: string; fromAssetId: string; toAssetId: string; moveMoney: string; moneyContent: string; mbDetailContent: string };
export type InitPayload = {
  initData: { mbid: string; initStartDate?: string; initEndDate?: string };
  categories?: { income?: Category[]; expense?: Category[] };
  paymentTypes?: PaymentType[];
  assetNames?: AssetName[];
};
export type Transaction = {
  id: string; mbDate: string; assetId: string; toAssetId?: string; targetAssetId?: string;
  payType: string; mcid: string; mbCategory: string; mcscid?: string; subCategory?: string;
  mbContent?: string; mbCash: number; inOutCode: string; inOutType: string; mbDetailContent?: string;
};
export type DashboardData = {
  assetSummary?: { totalAsset: number; asset: number; debt: number };
  monthlyTrend?: { month: string; total: number; asset: number; debt: number }[];
};
export type SummaryData = {
  summary?: { income: number; outcome: number; sum: number };
  incomeByCategory?: unknown[]; expenseByCategory?: unknown[];
};
export type FormState = {
  id?: string; mbDate: string; kind: "0" | "1"; inOutType: string; assetId: string; payType: string;
  mcid: string; mcscid: string; mbCash: string; mbContent: string; mbDetailContent: string;
};
export type SortOrder = "newest" | "oldest" | "highest" | "lowest";
