"use client";

import clsx from "clsx";
import { Clock } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OPTION_KEYS, optionLabels, SportsMatchRow } from "./types";
import { SportOptionKey } from "@/lib/bets/sportsCombinations";

interface Props {
  matches: SportsMatchRow[];
  groupedMatches: Record<string, SportsMatchRow[]>;
  matchNumberMap: Map<string, number>;
  isSelected: (matchId: string, option: SportOptionKey) => boolean;
  onToggle: (matchId: string, matchNumber: number, option: SportOptionKey, odds: number) => void;
  disabledMatchIds?: Set<string>;
}

export default function SportsMatchTable({
  matches,
  groupedMatches,
  matchNumberMap,
  isSelected,
  onToggle,
  disabledMatchIds,
}: Props) {
  return (
    <Accordion
      type="multiple"
      className="mt-2 space-y-1"
      defaultValue={Object.entries(groupedMatches).map((_, index) => `league-${index}`)}
    >
      {Object.entries(groupedMatches).map(([league, leagueMatches], index) => (
        <AccordionItem key={`league-acc-${index}`} className="border-0" value={`league-${index}`}>
          <AccordionTrigger className="bg-muted/50 px-3 py-4 rounded-md text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="flex items-center justify-between w-full">
              <span className="font-bold">{league}</span>
              <span className="text-[10px] text-muted-foreground">{leagueMatches.length} matches</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 max-w-full overflow-x-auto">
            <div className="overflow-x-auto max-w-[calc(100vw-2rem)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead className="text-center p-1">Time</TableHead>
                    {OPTION_KEYS.map((key) => (
                      <TableHead key={key} className="text-center p-1">
                        {optionLabels[key]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leagueMatches.map((match) => {
                    const matchNumber = matchNumberMap.get(match.id) ?? 0;
                    const isDisabled = disabledMatchIds?.has(match.id);
                    return (
                      <TableRow key={match.id} className="border-0">
                        <TableCell className="p-1 border border-border font-semibold text-xs text-foreground">
                          <div className="flex items-center gap-2">
                            <div>{matchNumber}.</div>
                            <div className="flex flex-col gap-1">
                              <span>{match.homeTeam}</span>
                              <span>{match.awayTeam}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="p-1 border border-border">
                          <div className="flex flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground">
                            {match.end_time ? (
                              <div className="flex items-center gap-1 text-center">
                                <Clock className="w-3 h-3 shrink-0" />
                                {new Date(match.end_time).toLocaleString("en-US", {
                                  year: "numeric",
                                  month: "numeric",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> TBD
                              </span>
                            )}
                          </div>
                        </TableCell>
                        {OPTION_KEYS.map((key, idx) => {
                          const odds = match.prizes[idx] || 0;
                          return (
                            <TableCell key={`${match.id}-${key}`} className="text-center p-1 border border-border">
                              <button
                                type="button"
                                disabled={isDisabled}
                                onClick={() => onToggle(match.id, matchNumber, key, odds)}
                                className={clsx(
                                  "inline-flex items-center justify-center px-2 py-1 rounded-md text-sm font-semibold",
                                  isDisabled
                                    ? "cursor-not-allowed opacity-40 bg-muted text-muted-foreground"
                                    : isSelected(match.id, key)
                                      ? "cursor-pointer bg-primary text-primary-foreground shadow"
                                      : "cursor-pointer bg-muted hover:bg-muted/80 text-foreground",
                                )}
                              >
                                {odds.toFixed(2)}
                              </button>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
