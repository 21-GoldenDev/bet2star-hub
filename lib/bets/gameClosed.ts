/**
 * A game is closed once its End Time has passed.
 * Missing or invalid end times are treated as not closed.
 */
export function isGameClosed(
  endTime: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!endTime) return false;

  const end = new Date(endTime).getTime();
  if (!Number.isFinite(end)) return false;

  return now.getTime() > end;
}

export const GAME_CLOSED_DELETE_MESSAGE =
  "This bet cannot be deleted because the game has closed.";

export function canPlayerDeleteBet(
  status: string | null | undefined,
  endTime: string | Date | null | undefined,
  extraBlocked = false,
): boolean {
  if (String(status || "").toLowerCase() === "void") return false;
  if (isGameClosed(endTime)) return false;
  if (extraBlocked) return false;
  return true;
}

function joinedGame(games: unknown): Record<string, unknown> | null {
  if (!games) return null;
  const game = Array.isArray(games) ? games[0] : games;
  if (!game || typeof game !== "object") return null;
  return game as Record<string, unknown>;
}

export function joinedGameEndTime(games: unknown): string | null {
  const endTime = joinedGame(games)?.end_time;
  return typeof endTime === "string" && endTime ? endTime : null;
}

export function joinedGameWeek(games: unknown): number | null {
  const week = joinedGame(games)?.week;
  return typeof week === "number" && Number.isFinite(week) ? week : null;
}
