export interface SportsMatch {
  id: string;
  game_id: string;
  league: string;
  number: number;
  home: string;
  away: string;
  home_goal: number;
  away_goal: number;
  prizes: number[]; // length 9: [1, X, 2, 1X, 12, X2, Over2.5, Under2.5, GG]
  status?: "active" | "void";
  start_time?: string;
  end_time?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSportsMatchInput {
  league: string;
  number: number;
  home: string;
  away: string;
  prizes?: number[];
  status?: "active" | "void";
  start_time?: string;
  end_time?: string;
}

export interface UpdateSportsMatchInput {
  league?: string;
  number?: number;
  home?: string;
  away?: string;
  home_goal?: number;
  away_goal?: number;
  prizes?: number[];
  status?: "active" | "void";
  start_time?: string;
  end_time?: string;
}
