export type GameMode = "nap_perm" | "grouping" | "two_banker";

export type Player = { id: string; fullName: string; email: string };

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

export type LottoBet = NapPermBet | GroupingBet | TwoBankerBet;

export type LottoBetFilters = {
  week?: number;
  prize?: string;
  gameType?: GameMode;
  dateFrom?: string;
  dateTo?: string;
};
