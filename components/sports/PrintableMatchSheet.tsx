"use client";

import { Fragment } from "react";
import { OPTION_KEYS, optionLabels, SportsMatchRow } from "./types";
import { SportOptionKey } from "@/lib/bets/sportsCombinations";

const printOptionLabels: Record<SportOptionKey, string> = {
  ...optionLabels,
  O25: "Ov2.5",
  U25: "Un2.5",
};

interface Props {
  matches: SportsMatchRow[];
  groupedMatches: Record<string, SportsMatchRow[]>;
  gameWeek?: number | null;
  gameName?: string | null;
}

/** e.g. 23:30,26,Jul */
function formatKickoff(iso?: string) {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  return `${hh}:${mm},${day},${month}`;
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

  const colCount = 3 + OPTION_KEYS.length;

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

      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr>
            <th className="border border-black px-1 py-0.5 text-left font-semibold">Qbet</th>
            <th className="border border-black px-1 py-0.5 text-center font-semibold">Time</th>
            <th className="border border-black px-1 py-0.5 text-left font-semibold">Event</th>
            {OPTION_KEYS.map((key) => (
              <th key={key} className="border border-black px-1 py-0.5 text-center font-semibold">
                {printOptionLabels[key]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedMatches).map(([league, leagueMatches]) => (
            <Fragment key={league}>
              <tr>
                <td
                  colSpan={colCount}
                  className="border border-black bg-neutral-100 px-1 py-1 text-left text-[11px] font-bold"
                >
                  {league}
                </td>
              </tr>
              {leagueMatches.map((match) => (
                <tr key={match.id}>
                  <td className="border border-black px-1 py-0.5 font-semibold">{match.number}</td>
                  <td className="border border-black px-1 py-0.5 text-center whitespace-nowrap">
                    {formatKickoff(match.start_time ?? match.end_time)}
                  </td>
                  <td className="border border-black px-1 py-0.5">
                    {match.homeTeam} - {match.awayTeam}
                  </td>
                  {OPTION_KEYS.map((key, idx) => {
                    const odds = match.prizes[idx] || 0;
                    return (
                      <td
                        key={`${match.id}-${key}`}
                        className="border border-black px-1 py-0.5 text-center font-semibold"
                      >
                        {odds.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
