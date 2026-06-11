import { extractPoolsMatchNumbers } from "@/lib/bets/poolsMatches";

export const DEFAULT_LOTTO_VISIBLE_NUMBERS = Array.from({ length: 99 }, (_, i) => i + 1);

export function resolveVisibleLottoNumbers(visibleNumbers: unknown): number[] {
  if (Array.isArray(visibleNumbers) && visibleNumbers.length > 0) {
    return visibleNumbers
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
  }

  return DEFAULT_LOTTO_VISIBLE_NUMBERS;
}

export function betIncludesInvisibleNumbers(numbers: unknown, visibleNumbers: unknown): boolean {
  const visibleSet = new Set(resolveVisibleLottoNumbers(visibleNumbers));
  const betNumbers = extractPoolsMatchNumbers(numbers);

  return betNumbers.some((number) => !visibleSet.has(number));
}
