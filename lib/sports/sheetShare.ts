import { SportsMatchRow } from "@/components/sports/types";

export type ActiveSportsMatchRaw = {
  id: string;
  number: number;
  league: string;
  home?: string;
  away?: string;
  homeTeam?: string;
  awayTeam?: string;
  prizes: number[];
  status?: "active" | "void";
  processed?: boolean;
  start_time?: string;
  end_time?: string;
  sports_leagues?: {
    name?: string;
    sports_countries?: { name?: string } | null;
  } | null;
};

export function formatSportsMatchForSheet(m: ActiveSportsMatchRaw): SportsMatchRow {
  const nestedLeague = m.sports_leagues?.name;
  const nestedCountry = m.sports_leagues?.sports_countries?.name;
  const leagueLabel =
    nestedCountry && nestedLeague
      ? `${nestedCountry}/${nestedLeague}`
      : m.league;

  return {
    id: m.id,
    number: m.number,
    league: leagueLabel,
    homeTeam: m.homeTeam ?? m.home ?? "",
    awayTeam: m.awayTeam ?? m.away ?? "",
    prizes: m.prizes ?? [],
    status: m.status,
    processed: m.processed,
    start_time: m.start_time,
    end_time: m.end_time,
  };
}

export function groupSportsMatchesByLeague(matches: SportsMatchRow[]) {
  const map: Record<string, SportsMatchRow[]> = {};
  matches.forEach((m) => {
    if (!map[m.league]) map[m.league] = [];
    map[m.league].push(m);
  });
  Object.values(map).forEach((list) => {
    list.sort((a, b) => {
      if (!a.end_time || !b.end_time) return a.number - b.number;
      return new Date(a.end_time).getTime() - new Date(b.end_time).getTime();
    });
  });
  return map;
}

export function normalizeWhatsAppPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

export function getSiteBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return "https://bet2star.net";
}

export function getSportsSheetUrl() {
  return `${getSiteBaseUrl()}/sports/sheet`;
}

/** @deprecated Prefer the uploaded PDF public URL from whatsapp-export */
export function getSportsSheetMessage(link: string) {
  return `Bet2Star Sports Betting fixtures\n\nView & download PDF:\n${link}`;
}
