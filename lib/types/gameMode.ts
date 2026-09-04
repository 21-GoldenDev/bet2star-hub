export const gameModes = {
  "nap_perm": "NAP/PERM",
  "grouping": "Grouping",
  "one_banker": "1 Against",
  "two_banker": "2 Banker",
  "turbo": "Turbo",
  "under1": "Under 1",
  "under2": "Under 2",
}
export type GameModeType = keyof typeof gameModes;

export type GameType = "lotto" | "pools" | "daily_pools" | "sports" | "sports_draw";

export function supportsGameName(type: unknown): boolean {
  return type === "lotto" || type === "daily_pools";
}

export interface PrizeInfo {
  id: string;
  name: string;
}
