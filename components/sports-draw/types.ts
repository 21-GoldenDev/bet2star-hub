export interface DrawMatchRow {
  id: string;
  number: number;
  league: string;
  homeTeam: string;
  awayTeam: string;
  prizes: number[];
  status?: "active" | "void";
  start_time?: string;
  end_time?: string;
}

export interface DrawBetSelection {
  matchId: string;
  matchNumber: number;
  option: "D";
  odds: number;
}
