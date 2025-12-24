export const gameModes = {
  "nap_perm": "NAP/PERM",
  "grouping": "Grouping",
  "2banker": "2 Banker",
}
export type GameModeType = keyof typeof gameModes;

export type GameType = "lotto" | "pools" | "sports";

export interface GamePrize {
  id: string;
  game_id: string;
  prize_id: string;
  commission: number; // 0-100
  status: "active" | "inactive"; // "active" | "inactive"
  created_at?: string;
  updated_at?: string;
}

export interface PrizeInfo {
  id: string;
  name: string;
}
