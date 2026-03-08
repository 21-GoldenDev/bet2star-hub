export interface SportsMatch {
  id: string;
  game_id: string;
  league: string;
  league_id?: string;
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

export interface SportsCountry {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface SportsLeague {
  id: string;
  country_id: string;
  name: string;
  country?: Pick<SportsCountry, "id" | "name">;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSportsMatchInput {
  league_id: string;
  number: number;
  home: string;
  away: string;
  prizes?: number[];
  status?: "active" | "void";
  start_time?: string;
  end_time?: string;
}

export interface UpdateSportsMatchInput {
  league_id?: string;
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
