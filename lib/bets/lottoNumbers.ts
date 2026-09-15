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

export function toDisabledLottoNumbers(visibleNumbers: unknown): number[] {
  const visibleSet = new Set(resolveVisibleLottoNumbers(visibleNumbers));
  return DEFAULT_LOTTO_VISIBLE_NUMBERS.filter((number) => !visibleSet.has(number));
}

export function toVisibleLottoNumbers(disabledNumbers: unknown): number[] {
  const disabledSet = new Set(
    Array.isArray(disabledNumbers)
      ? disabledNumbers
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value))
      : []
  );

  return DEFAULT_LOTTO_VISIBLE_NUMBERS.filter((number) => !disabledSet.has(number));
}

export function betIncludesInvisibleNumbers(numbers: unknown, visibleNumbers: unknown): boolean {
  const visibleSet = new Set(resolveVisibleLottoNumbers(visibleNumbers));
  const betNumbers = extractPoolsMatchNumbers(numbers);

  return betNumbers.some((number) => !visibleSet.has(number));
}
