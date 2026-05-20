/**
 * Returns whether a bet can still be voided based on the game's void window (minutes after bet_time).
 * When voidWindowMinutes is null/undefined, voiding is not time-limited.
 */
export function canVoidBetWithinWindow(
  betTime: string | Date | null | undefined,
  voidWindowMinutes: number | null | undefined,
  now: Date = new Date()
): boolean {
  if (voidWindowMinutes == null) {
    return true;
  }

  if (voidWindowMinutes <= 0) {
    return false;
  }

  if (!betTime) {
    return false;
  }

  const betMs = new Date(betTime).getTime();
  if (Number.isNaN(betMs)) {
    return false;
  }

  const elapsedMs = now.getTime() - betMs;
  return elapsedMs <= voidWindowMinutes * 60 * 1000;
}

export function voidWindowExpiredMessage(voidWindowMinutes: number): string {
  return `This bet can no longer be voided. Time to void bets is ${voidWindowMinutes} minute(s) after placement.`;
}
