import { GameModeType, GameType } from "./gameMode";

export interface Staff {
  id: string;
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  staff_id: string;
  phone?: string;
  address?: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface Terminal {
  id: string;
  serial_number: string;
  agent_id: string;
  password: string;
  credit_limit: number;
  max_stake?: number;
  game_types?: GameModeType[];
  game_modes?: GameType[];
  prizes?: Array<{ prize_id: string; commission: number }> | { prizes?: Array<{ prize_id: string; commission: number }> };
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export type UserRole = "admin" | "staff" | "agent" | "terminal" | "user";
