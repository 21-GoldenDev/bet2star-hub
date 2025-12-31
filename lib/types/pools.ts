import { GameModeType } from "./gameMode";

export type Player = { fullName: string; userName: string };

export type BaseBet = {
  id: string;
  gameId: string;
  betId: bigint;
  week: number;
  player?: Player;
  under: number[];
  staked: number;
  terminal: string;
  betTime: string;
  prize?: string;
  status?: string; // "active", "closed", "void"
};

export type DirectBet = BaseBet & {
  gameType: "nap_perm";
  matches: string[];
};

export type GroupingBet = BaseBet & {
  gameType: "grouping";
  matches: Record<string, string[]>;
};

export type TwoBankerBet = BaseBet & {
  gameType: "two_banker";
  matches: Record<string, string[]>;
};

export type PoolsBet = DirectBet | GroupingBet | TwoBankerBet;

export type PoolsBetFilters = {
  week?: number;
  prize?: string;
  gameType?: GameModeType;
  dateFrom?: string;
  dateTo?: string;
};
