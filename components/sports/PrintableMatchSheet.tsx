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
  /** Show on screen (share page). Default: print-only. */
  visible?: boolean;
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
  visible = false,
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
    <div
      className={
        visible
          ? "sports-print-sheet block text-black bg-white p-4"
          : "sports-print-sheet hidden print:block text-black bg-white"
      }
    >
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

      <div className="print-table-wrap w-full">
        <table className="w-full border-collapse text-[13px] leading-snug">
          <colgroup>
            <col style={{ width: "6%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "28%" }} />
            {OPTION_KEYS.map((key) => (
              <col key={key} style={{ width: `${54 / OPTION_KEYS.length}%` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="print-cell print-qbet border border-black px-1 py-1.5 text-center font-bold">
                Qbet
              </th>
              <th className="print-cell print-time border border-black px-1 py-1.5 text-center font-bold">
                Time
              </th>
              <th className="print-cell print-event border border-black px-1 py-1.5 text-left font-bold">
                Event
              </th>
              {OPTION_KEYS.map((key) => (
                <th
                  key={key}
                  className="print-cell print-odds border border-black px-0.5 py-1.5 text-center font-bold"
                >
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
                    className="print-cell border border-black bg-neutral-100 px-1.5 py-1.5 text-left text-[14px] font-bold"
                  >
                    {league}
                  </td>
                </tr>
                {leagueMatches.map((match) => (
                  <tr key={match.id}>
                    <td className="print-cell print-qbet border border-black px-1 py-1.5 text-center font-bold align-middle">
                      {match.number}
                    </td>
                    <td className="print-cell print-time border border-black px-1 py-1.5 text-center font-semibold align-middle">
                      {formatKickoff(match.start_time ?? match.end_time)}
                    </td>
                    <td className="print-cell print-event border border-black px-1.5 py-1.5 font-semibold align-middle">
                      <span className="block">{match.homeTeam}</span>
                      <span className="block">- {match.awayTeam}</span>
                    </td>
                    {OPTION_KEYS.map((key, idx) => {
                      const odds = match.prizes[idx] || 0;
                      return (
                        <td
                          key={`${match.id}-${key}`}
                          className="print-cell print-odds border border-black px-0.5 py-1.5 text-center font-bold align-middle"
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
    </div>
  );
}
