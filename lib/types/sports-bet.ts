export interface SportsBetSelection {
  [match_number: number]: string[];
}

export interface SportsBet {
  id: string;
  game_id: string;
  number: number;
  player?: {
    fullName: string;
    userName: string;
  };
  under: number[];
  staked: number;
  terminal: string;
  bet_time: string;
  status: string;
  selections: SportsBetSelection;
  award?: number;
}

export interface CreateSportsBetInput {
  game_id: string;
  number: number;
  player?: string;
  under: number[];
  staked: number;
  terminal: string;
  bet_time: string;
  status: string;
  selections: SportsBetSelection;
}
