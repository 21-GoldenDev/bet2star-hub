"use client";

import clsx from "clsx";
import { DrawMatchRow } from "./types";

interface Props {
  matches: DrawMatchRow[];
  drawOddsMap: Record<number, number>;
  matchNumberMap: Map<string, number>;
  isSelected: (matchId: string) => boolean;
  onToggle: (matchId: string, matchNumber: number, odds: number) => void;
  disabledMatchIds?: Set<string>;
}

export default function DrawMatchList({
  matches,
  drawOddsMap,
  matchNumberMap,
  isSelected,
  onToggle,
  disabledMatchIds,
}: Props) {
  const sortedMatches = [...matches].sort((a, b) => a.number - b.number);

  return (
    <div className="space-y-2">
      {sortedMatches.map((match) => {
        const matchNumber = matchNumberMap.get(match.id) ?? 0;
        const drawOdds = drawOddsMap[matchNumber] ?? match.prizes[0] ?? 0;
        const selected = isSelected(match.id);
        const isDisabled = disabledMatchIds?.has(match.id);

        return (
          <div
            key={match.id}
            onClick={() => !isDisabled && onToggle(match.id, matchNumber, drawOdds)}
            className={clsx(
              "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
              isDisabled
                ? "cursor-not-allowed opacity-40 border-border bg-muted/20"
                : "cursor-pointer",
              !isDisabled && selected
                ? "border-primary bg-primary/10"
                : !isDisabled
                  ? "border-border bg-muted/30 hover:bg-muted/50"
                  : "border-border",
            )}
          >
            <div className="shrink-0 w-8 text-center">
              <span className="text-sm font-bold text-muted-foreground">{matchNumber}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-foreground truncate">{match.homeTeam}</span>
                <span className="text-xs text-muted-foreground truncate">{match.awayTeam}</span>
              </div>
            </div>
            <div
              className={clsx(
                "shrink-0 px-3 py-2 rounded-lg font-semibold text-sm transition-all",
                selected ? "bg-primary text-primary-foreground shadow-lg" : "bg-muted text-foreground",
              )}
            >
              {drawOdds.toFixed(2)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
