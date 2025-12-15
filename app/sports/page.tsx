"use client";

import { Fragment, useMemo, useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Clock, Zap } from "lucide-react";
import { toast } from "sonner";

type BetOptionKey = "H" | "D" | "A" | "1X" | "12" | "O25" | "U25" | "GG";

interface Match {
  id: number;
  league: string;
  homeTeam: string;
  awayTeam: string;
  time: string;
  isLive?: boolean;
  odds: {
    H: number; // 1
    D: number; // X
    A: number; // 2
    "1X": number;
    "12": number;
    O25: number; // Over 2.5
    U25: number; // Under 2.5
    GG: number; // Both teams to score
  };
}

const matches: Match[] = [
  {
    id: 1,
    league: "Premier League",
    homeTeam: "Manchester City",
    awayTeam: "Liverpool",
    time: "15:00",
    isLive: true,
    odds: { H: 2.1, D: 3.5, A: 3.2, "1X": 1.35, "12": 1.45, O25: 1.65, U25: 2.3, GG: 1.7 },
  },
  {
    id: 2,
    league: "La Liga",
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    time: "20:00",
    odds: { H: 2.4, D: 3.3, A: 2.8, "1X": 1.42, "12": 1.47, O25: 1.75, U25: 2.2, GG: 1.8 },
  },
  {
    id: 3,
    league: "Premier League",
    homeTeam: "Juventus",
    awayTeam: "AC Milan",
    time: "17:30",
    odds: { H: 2.0, D: 3.4, A: 3.6, "1X": 1.40, "12": 1.52, O25: 1.9, U25: 1.95, GG: 1.85 },
  },
  {
    id: 4,
    league: "Bundesliga",
    homeTeam: "Bayern Munich",
    awayTeam: "Dortmund",
    time: "18:30",
    odds: { H: 1.75, D: 3.8, A: 4.2, "1X": 1.28, "12": 1.44, O25: 1.6, U25: 2.4, GG: 1.72 },
  },
  {
    id: 5,
    league: "Premier League",
    homeTeam: "PSG",
    awayTeam: "Marseille",
    time: "21:00",
    odds: { H: 1.5, D: 4.2, A: 5.5, "1X": 1.22, "12": 1.38, O25: 1.55, U25: 2.6, GG: 1.68 },
  },
  {
    id: 6,
    league: "Premier League",
    homeTeam: "Ajax",
    awayTeam: "PSV",
    time: "16:00",
    odds: { H: 2.35, D: 3.5, A: 2.9, "1X": 1.40, "12": 1.50, O25: 1.7, U25: 2.25, GG: 1.78 },
  },
  {
    id: 7,
    league: "Primeira Liga",
    homeTeam: "Benfica",
    awayTeam: "Porto",
    time: "19:15",
    odds: { H: 2.2, D: 3.25, A: 3.1, "1X": 1.36, "12": 1.49, O25: 1.68, U25: 2.32, GG: 1.83 },
  },
  {
    id: 8,
    league: "Championship",
    homeTeam: "Leeds United",
    awayTeam: "Leicester City",
    time: "14:45",
    odds: { H: 2.6, D: 3.2, A: 2.6, "1X": 1.45, "12": 1.53, O25: 1.8, U25: 2.1, GG: 1.9 },
  },
  {
    id: 9,
    league: "MLS",
    homeTeam: "LAFC",
    awayTeam: "Seattle Sounders",
    time: "22:30",
    odds: { H: 2.0, D: 3.6, A: 3.5, "1X": 1.38, "12": 1.51, O25: 1.72, U25: 2.28, GG: 1.76 },
  },
  {
    id: 10,
    league: "La Liga",
    homeTeam: "Galatasaray",
    awayTeam: "Fenerbahçe",
    time: "20:45",
    odds: { H: 2.1, D: 3.3, A: 3.2, "1X": 1.39, "12": 1.50, O25: 1.74, U25: 2.2, GG: 1.82 },
  },
  {
    id: 11,
    league: "La Liga",
    homeTeam: "Kawasaki Frontale",
    awayTeam: "Urawa Red",
    time: "11:00",
    odds: { H: 2.3, D: 3.4, A: 3.0, "1X": 1.41, "12": 1.49, O25: 1.66, U25: 2.35, GG: 1.80 },
  },
  {
    id: 12,
    league: "Belgian Pro",
    homeTeam: "Club Brugge",
    awayTeam: "Anderlecht",
    time: "13:00",
    odds: { H: 2.05, D: 3.25, A: 3.4, "1X": 1.37, "12": 1.48, O25: 1.7, U25: 2.2, GG: 1.77 },
  },
  {
    id: 13,
    league: "Bundesliga",
    homeTeam: "Celtic",
    awayTeam: "Rangers",
    time: "12:30",
    odds: { H: 2.15, D: 3.3, A: 3.1, "1X": 1.38, "12": 1.50, O25: 1.73, U25: 2.18, GG: 1.84 },
  },
  {
    id: 14,
    league: "Bundesliga",
    homeTeam: "Club América",
    awayTeam: "Chivas",
    time: "23:00",
    odds: { H: 2.4, D: 3.2, A: 2.9, "1X": 1.42, "12": 1.52, O25: 1.76, U25: 2.12, GG: 1.88 },
  },
  {
    id: 15,
    league: "A-League",
    homeTeam: "Sydney FC",
    awayTeam: "Melbourne Victory",
    time: "09:30",
    odds: { H: 2.6, D: 3.3, A: 2.5, "1X": 1.45, "12": 1.55, O25: 1.82, U25: 2.05, GG: 1.92 },
  },
];

type BetSelection = { matchId: number; option: BetOptionKey; odds: number };

const Football = () => {
  const [selectedBets, setSelectedBets] = useState<BetSelection[]>([]);
  const [betAmount, setBetAmount] = useState<number>(5000);

  const optionLabels: Record<BetOptionKey, string> = {
    H: "1",
    D: "X",
    A: "2",
    "1X": "1X",
    "12": "12",
    O25: "Over 2.5",
    U25: "Under 2.5",
    GG: "GG",
  };

  const toggleBet = (matchId: number, option: BetOptionKey, odds: number) => {
    const exists = selectedBets.some((b) => b.matchId === matchId && b.option === option);
    if (exists) {
      setSelectedBets((prev) => prev.filter((b) => !(b.matchId === matchId && b.option === option)));
    } else {
      setSelectedBets((prev) => [...prev, { matchId, option, odds }]);
    }
  };

  const isSelected = (matchId: number, option: BetOptionKey) => {
    return selectedBets.some((b) => b.matchId === matchId && b.option === option);
  };

  const totalOdds = selectedBets.reduce((acc, bet) => acc * bet.odds, 1);
  const potentialWin = typeof betAmount === "number" ? betAmount * totalOdds : 0;

  const placeBet = () => {
    if (selectedBets.length === 0) {
      toast.error("Please select at least one option");
      return;
    }
    toast.success(`Bet placed! ${selectedBets.length} selection(s) at ${totalOdds.toFixed(2)} odds`);
  };

  const clearBets = () => {
    setSelectedBets([]);
  };

  const groupedSelections = useMemo(() => {
    const map = new Map<number, BetSelection[]>();
    selectedBets.forEach((sel) => {
      const arr = map.get(sel.matchId) ?? [];
      arr.push(sel);
      map.set(sel.matchId, arr);
    });
    return map;
  }, [selectedBets]);

  const groupedMatches = useMemo(() => {
    const map: Record<string, Match[]> = {};
    for (const m of matches) {
      if (!map[m.league]) map[m.league] = [];
      map[m.league].push(m);
    }
    return map;
  }, [matches]);

  return (
    <div className="h-screen pt-24 pb-2 px-4 overflow-hidden">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10 animate-slide-up">
          {/* <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-4">
            <Trophy className="w-4 h-4" />
            Sports Betting
          </div> */}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Today's Matches
          </h1>
          <p className="text-muted-foreground">
            Select your predictions and place your bets on top matches.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Matches List */}
          <div className="lg:col-span-2">
            <ScrollArea className="p-4 rounded-xl bg-card border border-border lg:h-[calc(100vh-14rem)]">
              <div className="space-y-4 pr-1">
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
                      <AccordionContent className="pt-2">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead></TableHead>
                              <TableHead></TableHead>
                              {["H", "D", "A", "1X", "12", "O25", "U25", "GG"].map((key) => (
                                <TableHead key={key} className="text-center p-1">
                                  {optionLabels[key as BetOptionKey]}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {leagueMatches.map((match) => (
                              <TableRow key={match.id} className="border-0">
                                <TableCell className="p-1 border border-border">
                                  <div className="flex flex-col gap-1 font-semibold text-xs text-foreground">
                                    <span>{match.homeTeam}</span>
                                    <span>{match.awayTeam}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="p-1 border border-border">
                                  <div className="flex justify-center">
                                    {match.isLive ? (
                                      <span className="flex w-fit items-center gap-1 px-2 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-medium">
                                        <Zap className="w-3 h-3" /> LIVE
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                                        <Clock className="w-3 h-3" /> {match.time}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                {["H", "D", "A", "1X", "12", "O25", "U25", "GG"].map((key) => (
                                  <TableCell key={`${match.id}-${key}`} className="text-center p-1 border border-border">
                                    <button
                                      onClick={() => toggleBet(match.id, key as BetOptionKey, match.odds[key as BetOptionKey])}
                                      className={clsx(
                                        "cursor-pointer inline-flex items-center justify-center px-2 py-1 rounded-md text-sm font-semibold",
                                        isSelected(match.id, key as BetOptionKey)
                                          ? "bg-primary text-primary-foreground shadow"
                                          : "bg-muted hover:bg-muted/80 text-foreground"
                                      )}
                                    >
                                      {match.odds[key as BetOptionKey].toFixed(2)}
                                    </button>
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </ScrollArea>
          </div>

          {/* Bet Slip */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 p-5 rounded-2xl bg-card border border-border animate-slide-up" style={{ animationDelay: "200ms" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground">Selected Bets</h3>
                {selectedBets.length > 0 && (
                  <button onClick={clearBets} className="text-xs text-muted-foreground hover:text-foreground">
                    Clear All
                  </button>
                )}
              </div>

              {selectedBets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Select options to add to your slip
                </div>
              ) : (
                <div
                  className="max-h-[calc(100vh-29rem)] overflow-y-auto mb-4"
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "#20283c transparent",
                    msOverflowStyle: "auto",
                    WebkitOverflowScrolling: "touch",
                  }}
                >
                  <div className="space-y-4 pr-1">
                    {Array.from(groupedSelections.entries()).map(([matchId, selections]) => {
                      const match = matches.find((m) => m.id === matchId)!;
                      return (
                        <div key={matchId} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="text-xs text-muted-foreground">{match.league}</div>
                              <div className="text-sm font-medium text-foreground">
                                {match.homeTeam} vs {match.awayTeam}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {selections.map((sel) => (
                              <div key={`${sel.matchId}-${sel.option}`} className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-card border border-border text-sm">
                                <span className="text-muted-foreground">{optionLabels[sel.option]}</span>
                                <span className="font-semibold">{sel.odds.toFixed(2)}</span>
                                <button
                                  onClick={() => toggleBet(sel.matchId, sel.option, sel.odds)}
                                  className="text-muted-foreground hover:text-destructive text-xs"
                                  aria-label="Remove selection"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground" htmlFor="bet-amount">Bet Amount</label>
                  <Input
                    id="bet-amount"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    placeholder="Enter amount"
                    value={betAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBetAmount(Math.max(0, Number(val)));
                    }}
                  />
                </div>

                <Button
                  variant="gold"
                  className="w-full"
                  size="lg"
                  onClick={placeBet}
                >
                  Place Bet
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Football;
