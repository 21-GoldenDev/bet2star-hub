export interface SportsBetSelection {
  [match_number: number]: string[];
}

export type SportsBetMode = "direct" | "permutation" | "grouping" | "one_banker";

export type SportsFlatSelections = Record<string, string[]>;
export type SportsGroupedSelections = Record<string, SportsFlatSelections>;
export type SportsBetSelections = SportsFlatSelections | SportsGroupedSelections;

export interface SportsBet {
  id: string;
  game_id: string;
  week: number;
  number: number;
  player?: {
    fullName: string;
    userName: string;
  };
  mode: SportsBetMode;
  under: number[];
  staked: number;
  terminal: string;
  bet_time: string;
  status: string;
  selections: SportsBetSelections;
  award?: number;
  same?: number;
  tsn?: string;
  agent?: string;
  voidWindowMinutes?: number | null;
}

export interface CreateSportsBetInput {
  game_id: string;
  number: number;
  player?: string;
  mode: SportsBetMode;
  under: number[];
  staked: number;
  terminal: string;
  bet_time: string;
  status: string;
  selections: SportsBetSelections;
}
