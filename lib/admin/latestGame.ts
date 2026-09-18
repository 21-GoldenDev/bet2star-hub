import type { SupabaseClient } from "@supabase/supabase-js";

export const LATEST_GAME_DELETE_ERROR =
  "The latest game of this type cannot be deleted. Create a new game first.";

export type GameRecencyFields = {
  id: string;
  type: string;
  week?: number | null;
  start_time?: string | null;
  created_at?: string | null;
};

function timeValue(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isNewerGame(a: GameRecencyFields, b: GameRecencyFields): boolean {
  const aStart = timeValue(a.start_time);
  const bStart = timeValue(b.start_time);
  if (aStart !== bStart) return aStart > bStart;

  const aWeek = typeof a.week === "number" ? a.week : Number.NEGATIVE_INFINITY;
  const bWeek = typeof b.week === "number" ? b.week : Number.NEGATIVE_INFINITY;
  if (aWeek !== bWeek) return aWeek > bWeek;

  const aCreated = timeValue(a.created_at);
  const bCreated = timeValue(b.created_at);
  if (aCreated !== bCreated) return aCreated > bCreated;

  return a.id > b.id;
}

export function getLatestGameIdsByType<T extends GameRecencyFields>(games: T[]): Set<string> {
  const latestByType = new Map<string, T>();

  for (const game of games) {
    const current = latestByType.get(game.type);
    if (!current || isNewerGame(game, current)) {
      latestByType.set(game.type, game);
    }
  }

  return new Set(Array.from(latestByType.values()).map((game) => game.id));
}

export async function findLatestGameIdOfType(
  supabase: SupabaseClient,
  type: string
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("games")
    .select("id")
    .eq("type", type)
    .order("start_time", { ascending: false })
    .order("week", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { id: null, error: error.message };
  }

  return { id: data?.id ?? null, error: null };
}
