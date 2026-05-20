import { GameModeType } from "./gameMode";

export type Player = { fullName: string; userName: string };

export type BaseBet = {
  id: string;
  gameId: string;
  betId: bigint;
  week?: number | null;
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
  voidWindowMinutes?: number | null;
};

export type NapPermBet = BaseBet & {
  gameType: "nap_perm";
  numbers: number[];
};

export type GroupingBet = BaseBet & {
  gameType: "grouping";
  numbers: Record<string, number[]>;
};

export type TwoBankerBet = BaseBet & {
  gameType: "two_banker";
  numbers: Record<string, number[]>;
};

export type OneBankerBet = BaseBet & {
  gameType: "one_banker";
  numbers: Record<string, number[]>;
};

export type TurboBet = BaseBet & {
  gameType: "turbo";
  numbers: number[];
};

export type Under1Bet = BaseBet & {
  gameType: "under1";
  numbers: number[];
};

export type Under2Bet = BaseBet & {
  gameType: "under2";
  numbers: number[];
};

export type LottoBet = NapPermBet | GroupingBet | TwoBankerBet | OneBankerBet | TurboBet | Under1Bet | Under2Bet;

export type LottoBetFilters = {
  week?: number;
  prize?: string;
  gameType?: GameModeType;
  dateFrom?: string;
  dateTo?: string;
};
