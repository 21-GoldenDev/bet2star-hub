export const gameModes = {
  "nap_perm": "NAP/PERM",
  "grouping": "Grouping",
  "2banker": "2 Banker",
}
export type GameModeType = keyof typeof gameModes;

export type GameType = "lotto" | "pools" | "sports";
