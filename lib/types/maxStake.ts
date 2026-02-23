export interface MaxStake {
  id: string;
  game_id: string;
  game_type: "lotto" | "pools" | "sports" | "sports_draw";
  match_at_least?: number; // Only for pools
  max_amount: number;
  created_at?: string;
  updated_at?: string;
}
