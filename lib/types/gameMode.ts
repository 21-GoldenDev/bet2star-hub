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

export type GameType = "lotto" | "pools" | "sports";

export interface PrizeInfo {
  id: string;
  name: string;
}
