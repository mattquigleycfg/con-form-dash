type RevenueInspectable = {
  name?: string | null;
  product_id?: [number, string] | false;
};

export const ANALYTIC_REVENUE_KEYWORDS = [
  "INVOICE",
  "PROGRESS PAYMENT",
  "PROGRESS CLAIM",
  "PROGRESS INVOICE",
  "PAYMENT RECEIVED",
  "DOWN PAYMENT",
  "DEPOSIT"
];

export const isRevenueAnalyticEntry = (entry: RevenueInspectable) => {
  const productName = Array.isArray(entry.product_id) ? entry.product_id?.[1] || "" : "";
  const description = `${entry.name || ""} ${productName}`.toUpperCase();
  return ANALYTIC_REVENUE_KEYWORDS.some(keyword => description.includes(keyword));
};

