/** Aclara (amount > 0) u oscurece (amount < 0) un color #rrggbb. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const p = Math.min(1, Math.abs(amount));
  const r = Math.round(((n >> 16) & 0xff) + (target - ((n >> 16) & 0xff)) * p);
  const g = Math.round(((n >> 8) & 0xff) + (target - ((n >> 8) & 0xff)) * p);
  const b = Math.round((n & 0xff) + (target - (n & 0xff)) * p);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
