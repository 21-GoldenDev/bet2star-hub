"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Clock, Zap } from "lucide-react";
import { toast } from "sonner";
import { Game } from "@/lib/types/game";
import PrizeTable from "@/components/PrizeTable";

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
  const [matchAtLeast, setMatchAtLeast] = useState<number[]>([]);
  const [odd, setOdd] = useState<string>("");
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const fetchActiveGame = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/games/sports/active");
        const data = await response.json();
        setActiveGame(data.game);

        if (!data.game) {
          if (!interval) {
            interval = setInterval(fetchActiveGame, 30000);
          }
        } else {
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
        }
      } catch (error) {
        console.error("Error fetching active game:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveGame();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const prize = activeGame?.prizes?.find((p) => p.id === odd);

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

  const toggleMatch = (m: number) => {
    if (matchAtLeast.includes(m)) setMatchAtLeast(matchAtLeast.filter((x) => x !== m));
    else setMatchAtLeast([...matchAtLeast, m]);
  };

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
  }, []);

  const matchNumberMap = useMemo(() => {
    const map = new Map<number, number>();
    let counter = 1;
    Object.values(groupedMatches).forEach((leagueMatches) => {
      leagueMatches.forEach((m) => {
        map.set(m.id, counter++);
      });
    });
    return map;
  }, [groupedMatches]);

  return (
    <div className="min-h-screen pt-24 pb-8 px-4">
      <div className="container mx-auto max-w-7xl">
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
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Loading game...</p>
            </div>
          </div>
        ) : !activeGame ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <svg
                className="mx-auto h-16 w-16 text-muted-foreground mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <h2 className="text-2xl font-bold text-foreground mb-2">No Active Game</h2>
              <p className="text-muted-foreground mb-4">
                There is currently no active sports game available. Please check back later.
              </p>
              <p className="text-sm text-muted-foreground">
                Games are typically scheduled weekly. Stay tuned for the next draw!
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Column 1: Match at Least */}
              <div className="lg:col-span-3">
                <div className="p-4 rounded-xl bg-card border border-border">
                  <div className="text-sm font-semibold text-center mb-3 text-muted-foreground">Under</div>
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((u) => (
                      <label
                        key={u}
                        onClick={() => toggleMatch(u)}
                        className="cursor-pointer flex items-center gap-2"
                      >
                        <div>
                          <div className="size-4 rounded-full bg-transparent border border-primary flex items-center justify-center">
                            {matchAtLeast.includes(u) && (
                              <div className="bg-primary size-2 rounded-full" />
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-medium">
                          {u}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                {!!prize && (
                  <div className="mt-4">
                    <PrizeTable prize={prize} />
                  </div>
                )}
              </div>

              {/* Matches List */}
              <div className="lg:col-span-6">
                <div className="p-4 pr-2 rounded-xl bg-card border border-border">
                  <div className="space-y-4 pr-2 max-h-150 lg:max-h-[calc(100vh-18rem)] overflow-auto scrollbar">
                    <Accordion
                      type="multiple"
                      className="mt-2 space-y-1"
                      defaultValue={Object.entries(groupedMatches).map((_, index) => `league-${index}`)}
                    >
                      {Object.entries(groupedMatches).map(([league, leagueMatches], index) => {
                        return (
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
                                      <TableHead></TableHead>
                                      {["H", "D", "A", "1X", "12", "O25", "U25", "GG"].map((key) => (
                                        <TableHead key={key} className="text-center p-1">
                                          {optionLabels[key as BetOptionKey]}
                                        </TableHead>
                                      ))}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {leagueMatches.map((match) => {
                                      const matchNumber = matchNumberMap.get(match.id) ?? 0;
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
                                      )
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
                </div>
              </div>

              {/* Bet Slip */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                <div className="p-4 rounded-xl bg-card border border-border">
                  <div className="text-sm font-semibold mb-4 text-muted-foreground">Odds</div>
                  <div className="flex flex-col gap-2">
                    <RadioGroup value={odd} onValueChange={setOdd}>
                      {['40-1 A', '100-1'].map((oddsValue) => (
                        <label key={oddsValue} className="cursor-pointer flex items-center gap-2">
                          <RadioGroupItem key={oddsValue} value={oddsValue} />
                          <span className="text-sm font-medium">{oddsValue}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-card border border-border animate-slide-up" style={{ animationDelay: "200ms" }}>
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
                    <div className="max-h-70 overflow-y-auto mb-4 scrollbar">
                      <div className="space-y-4 pr-1">
                        {Array.from(groupedSelections.entries()).map(([matchId, selections]) => {
                          const match = matches.find((m) => m.id === matchId)!;
                          const matchNumber = matchNumberMap.get(matchId) ?? 0;
                          return (
                            <div key={matchId} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="text-xs text-muted-foreground">{match.league}</div>
                                  <div className="text-sm font-medium text-foreground">
                                    {matchNumber}. {match.homeTeam} vs {match.awayTeam}
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
          </>
        )}
      </div>
    </div>
  );
};

export default Football;
