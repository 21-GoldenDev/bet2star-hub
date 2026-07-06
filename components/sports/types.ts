import { SportOptionKey } from "@/lib/bets/sportsCombinations";

export interface SportsMatchRow {
  id: string;
  number: number;
  league: string;
  homeTeam: string;
  awayTeam: string;
  prizes: number[];
  status?: "active" | "void";
  processed?: boolean;
  start_time?: string;
  end_time?: string;
}

export interface BetSelection {
  matchId: string;
  matchNumber: number;
  option: SportOptionKey;
  odds: number;
}

export const optionLabels: Record<SportOptionKey, string> = {
  H: "1",
  D: "X",
  A: "2",
  "1X": "1X",
  "12": "12",
  X2: "X2",
  O25: "Over 2.5",
  U25: "Under 2.5",
  GG: "GG",
};

export const OPTION_KEYS: SportOptionKey[] = ["H", "D", "A", "1X", "12", "X2", "O25", "U25", "GG"];
