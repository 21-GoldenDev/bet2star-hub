import type { PoolsLikeGameType } from "@/lib/pools/gameType";

export type PoolsPlayExtraProps = {
  matchLabels?: Record<string, string>;
  betType?: PoolsLikeGameType;
  playPath?: string;
};
