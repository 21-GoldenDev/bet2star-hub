"use client";

import { OPTION_KEYS, optionLabels, SportsMatchRow } from "./types";

interface Props {
  matches: SportsMatchRow[];
  groupedMatches: Record<string, SportsMatchRow[]>;
  gameWeek?: number | null;
  gameName?: string | null;
}

function formatKickoff(endTime?: string) {
  if (!endTime) return "TBD";
  return new Date(endTime).toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PrintableMatchSheet({
  matches,
  groupedMatches,
  gameWeek,
  gameName,
}: Props) {
  const printedAt = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="sports-print-sheet hidden print:block text-black bg-white">
      <header className="mb-3 border-b border-black pb-2">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Bet2Star — Sports Betting</h1>
            <p className="text-xs">
              {gameName ? `${gameName} · ` : ""}
              {gameWeek != null ? `Week ${gameWeek} · ` : ""}
              {matches.length} matches
            </p>
          </div>
          <p className="text-[10px] text-right">Printed {printedAt}</p>
        </div>
      </header>

      {Object.entries(groupedMatches).map(([league, leagueMatches]) => (
        <section key={league} className="mb-3 break-inside-avoid">
          <h2 className="mb-1 bg-black px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            {league}
          </h2>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr>
                <th className="border border-black px-1 py-0.5 text-left font-semibold">#</th>
                <th className="border border-black px-1 py-0.5 text-left font-semibold">Match</th>
                <th className="border border-black px-1 py-0.5 text-center font-semibold">Time</th>
                {OPTION_KEYS.map((key) => (
                  <th key={key} className="border border-black px-1 py-0.5 text-center font-semibold">
                    {optionLabels[key]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leagueMatches.map((match) => (
                <tr key={match.id}>
                  <td className="border border-black px-1 py-0.5 font-semibold">{match.number}</td>
                  <td className="border border-black px-1 py-0.5">
                    <div>{match.homeTeam}</div>
                    <div>{match.awayTeam}</div>
                  </td>
                  <td className="border border-black px-1 py-0.5 text-center whitespace-nowrap">
                    {formatKickoff(match.end_time)}
                  </td>
                  {OPTION_KEYS.map((key, idx) => {
                    const odds = match.prizes[idx] || 0;
                    return (
                      <td key={`${match.id}-${key}`} className="border border-black px-1 py-0.5 text-center font-semibold">
                        {odds.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
