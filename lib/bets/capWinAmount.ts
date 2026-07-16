export const DEFAULT_MAX_WIN_AMOUNT = 10000000;

/** Cap a sports/sports-draw payout at the platform max winning amount. */
export function capWinAmount(
  amount: number,
  maxWinAmount?: number | null,
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (!Number.isFinite(maxWinAmount as number) || (maxWinAmount as number) < 0) {
    return amount;
  }
  return Math.min(amount, maxWinAmount as number);
}
