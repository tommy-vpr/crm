export function formatCurrency(value: number | null | undefined) {
  if (value == null || value === 0) return "$0";

  const abs = Math.abs(value);

  // Under $1K — show exact with cents if needed: $100.99, $500
  if (abs < 1_000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  // $1K–$99K — compact with 1 decimal: $2.5K, $10K, $99.9K
  if (abs < 100_000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value);
  }

  // $100K+ — compact no decimal: $100K, $1.5M, $2B
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}
