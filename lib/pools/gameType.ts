import type { GameType } from "@/lib/types/gameMode";

export const POOLS_LIKE_GAME_TYPES = ["pools", "daily_pools"] as const;

export type PoolsLikeGameType = (typeof POOLS_LIKE_GAME_TYPES)[number];

export function isPoolsLikeGameType(type: unknown): type is PoolsLikeGameType {
  return type === "pools" || type === "daily_pools";
}

export function getPoolsGameTypeLabel(type: string): string {
  if (type === "daily_pools") return "Daily/Mid-week Pools";
  if (type === "pools") return "Pools";
  return type;
}

export function getPoolsPlayPath(type: PoolsLikeGameType): string {
  return type === "daily_pools" ? "/daily-pools" : "/pools";
}

export function toPoolsLikeGameType(type: GameType | string | null | undefined): PoolsLikeGameType {
  return type === "daily_pools" ? "daily_pools" : "pools";
}
