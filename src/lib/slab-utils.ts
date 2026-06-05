export function slabAreaSqft(lengthMm: number | null, widthMm: number | null): number {
  if (!lengthMm || !widthMm) return 0;
  return (lengthMm * widthMm) / 92903.04; // mm² to sqft
}

export function computeStockValue(
  lengthMm: number | null,
  widthMm: number | null,
  rateSqft: number | null | { toString(): string }
): number {
  const area = slabAreaSqft(lengthMm, widthMm);
  const rate = rateSqft ? Number(rateSqft) : 0;
  return Math.round(area * rate);
}

export function formatDimensions(
  l: number | null,
  w: number | null,
  h?: number | null
): string {
  if (!l && !w) return "—";
  const parts = [l, w].filter(Boolean).map((n) => `${(n! / 1000).toFixed(2)}m`);
  if (h) parts.push(`${h}mm`);
  return parts.join(" × ");
}
