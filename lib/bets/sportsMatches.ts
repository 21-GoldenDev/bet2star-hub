import {
  flattenSportsMatchNumbers,
  type SportsFlatSelections,
  type SportsGroupedSelections,
} from "@/lib/bets/sportsCombinations";

export function betIncludesVoidSportsMatches(
  selections: unknown,
  gameId: string | null | undefined,
  voidMatchNumbersByGameId: Record<string, number[]>,
): boolean {
  if (!gameId) return false;

  const voidNumbers = voidMatchNumbersByGameId[gameId] || [];
  if (voidNumbers.length === 0) return false;

  const voidSet = new Set(voidNumbers);
  const betNumbers = flattenSportsMatchNumbers(
    (selections || {}) as SportsFlatSelections | SportsGroupedSelections,
  );

  return betNumbers.some((number) => voidSet.has(number));
}
