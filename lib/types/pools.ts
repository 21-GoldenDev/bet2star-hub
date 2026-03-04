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
  award?: number;
  terminal: string;
  betTime: string;
  prize?: string;
  status?: string; // "active", "closed", "void"
  same?: number;
  tsn?: string;
  agent?: string;
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

export type OneBankerBet = BaseBet & {
  gameType: "one_banker";
  matches: Record<string, string[]>;
};

export type TurboBet = BaseBet & {
  gameType: "turbo";
  matches: string[];
};

export type Under1Bet = BaseBet & {
  gameType: "under1";
  matches: string[];
};

export type Under2Bet = BaseBet & {
  gameType: "under2";
  matches: string[];
};

export type PoolsBet = DirectBet | GroupingBet | TwoBankerBet | OneBankerBet | TurboBet | Under1Bet | Under2Bet;

export type PoolsBetFilters = {
  week?: number;
  prize?: string;
  gameType?: GameModeType;
  dateFrom?: string;
  dateTo?: string;
};
