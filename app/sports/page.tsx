"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Clock, Zap } from "lucide-react";
import { toast } from "sonner";
import { Game } from "@/lib/types/game";
import { SportsMatch } from "@/lib/types/sports";
import supabase from "@/lib/supabase/client";
import { useSupabaseUser } from "@/hooks/use-supabase-user";

type BetOptionKey = "H" | "D" | "A" | "1X" | "12" | "X2" | "O25" | "U25" | "GG";

interface Match {
  id: string;
  number: number;
  league: string;
  homeTeam: string;
  awayTeam: string;
  time?: string;
  isLive?: boolean;
  prizes: number[]; // [H, D, A, 1X, 12, O25, U25, GG]
  status?: "active" | "void";
  start_time?: string;
  end_time?: string;
}

type BetSelection = { matchId: string; matchNumber: number; option: BetOptionKey; odds: number };

const Football = () => {
  const { user } = useSupabaseUser();
  const [selectedBets, setSelectedBets] = useState<BetSelection[]>([]);
  const [betAmount, setBetAmount] = useState<number>(5000);
  const [matchAtLeast, setMatchAtLeast] = useState<number[]>([]);
  const [mode, setMode] = useState<"direct" | "permutation">("direct");
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const fetchActiveGame = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/games/sports/active");
        const data = await response.json();
        setActiveGame(data.game);

        if (!data.game) {
          setMatches([]);
          if (!interval) {
            interval = setInterval(fetchActiveGame, 30000);
          }
        } else {
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
          // Fetch matches for this game
          await fetchMatches(data.game.id);
        }
      } catch (error) {
        console.error("Error fetching active game:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchMatches = async (gameId: string) => {
      try {
        const { data, error } = await supabase
          .from("sports")
          .select("*")
          .eq("game_id", gameId)
          .order("number", { ascending: true });

        if (error) throw error;

        const formattedMatches: Match[] = (data || []).map((m: SportsMatch) => ({
          id: m.id,
          number: m.number,
          league: m.league,
          homeTeam: m.home,
          awayTeam: m.away,
          prizes: m.prizes,
          status: m.status,
          start_time: m.start_time,
          end_time: m.end_time,
        }));

        setMatches(formattedMatches);
      } catch (error) {
        console.error("Error fetching matches:", error);
      }
    };

    fetchActiveGame();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const isMatchLive = (startTime?: string, endTime?: string): boolean => {
    if (!startTime || !endTime) return false;
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    return now >= start && now <= end;
  };

  const optionLabels: Record<BetOptionKey, string> = {
    H: "1",
    D: "X",
    A: "2",
    "1X": "1X",
    "12": "12",
    X2: "X2",
    O25: "Over 2.5",
    U25: "Under 2.5",
    GG: "GG",
  };

  const toggleBet = (matchId: string, matchNumber: number, option: BetOptionKey, odds: number) => {
    const matchExists = selectedBets.some((b) => b.matchId === matchId);
    const optionExists = selectedBets.some((b) => b.matchId === matchId && b.option === option);

    if (optionExists) {
      setSelectedBets((prev) => prev.filter((b) => !(b.matchId === matchId && b.option === option)));
    } else if (matchExists) {
      setSelectedBets((prev) =>
        prev.map((b) => (b.matchId === matchId ? { matchId, matchNumber, option, odds } : b))
      );
    } else {
      setSelectedBets((prev) => [...prev, { matchId, matchNumber, option, odds }]);
    }
  };

  const isSelected = (matchId: string, option: BetOptionKey) => {
    return selectedBets.some((b) => b.matchId === matchId && b.option === option);
  };

  const totalOdds = selectedBets.reduce((acc, bet) => acc * bet.odds, 1);

  const toggleMatch = (m: number) => {
    if (matchAtLeast.includes(m)) setMatchAtLeast(matchAtLeast.filter((x) => x !== m));
    else setMatchAtLeast([...matchAtLeast, m]);
  };

  const placeBet = async () => {
    if (selectedBets.length === 0) {
      toast.error("Please select at least one option");
      return;
    }

    if (!activeGame) {
      toast.error("No active game found");
      return;
    }

    if (betAmount <= 0) {
      toast.error("Please enter a valid bet amount");
      return;
    }

    if (matchAtLeast.length === 0) {
      toast.error("Please select under value");
      return;
    }

    if (!user) {
      toast.error("Please sign in to place a bet");
      return;
    }

    setIsPlacingBet(true);
    try {
      // Build selections object: { [match_number]: ["H", "D", ...] }
      const selections: Record<number, string[]> = {};
      selectedBets.forEach((bet) => {
        if (!selections[bet.matchNumber]) {
          selections[bet.matchNumber] = [];
        }
        selections[bet.matchNumber].push(bet.option);
      });

      const response = await fetch('/api/bets/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          betType: 'sports',
          gameId: activeGame.id,
          betAmount,
          betData: {
            selections,
            under: mode === "direct" ? [selectedBets.length] : matchAtLeast,
            mode,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to place bet');
      }

      toast.success(`Bet placed! Bet #${result.data.betNumber} - ₦${betAmount.toLocaleString()} deducted. New balance: ₦${result.data.newBalance.toLocaleString()}`);

      // Clear the form
      setSelectedBets([]);
      setBetAmount(5000);
      setMatchAtLeast([]);
      setMode("direct");
    } catch (error: any) {
      console.error("Error placing bet:", error);
      toast.error(error.message || "Failed to place bet. Please try again.");
    } finally {
      setIsPlacingBet(false);
    }
  };

  const clearBets = () => {
    setSelectedBets([]);
  };

  const groupedSelections = useMemo(() => {
    const map = new Map<string, BetSelection[]>();
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

  const matchNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    matches.forEach((m) => {
      map.set(m.id, m.number);
    });
    return map;
  }, [matches]);

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
              <div className="lg:col-span-2">
                <div className="p-4 rounded-xl bg-card border border-border">
                  <RadioGroup
                    value={mode}
                    onValueChange={(val) => setMode(val as "direct" | "permutation")}
                  >
                    <label className="cursor-pointer flex items-center gap-2">
                      <RadioGroupItem id="mode-direct" value="direct" />
                      <span className="text-sm">Direct</span>
                    </label>
                    <label className="cursor-pointer flex items-center gap-2">
                      <RadioGroupItem id="mode-permutation" value="permutation" />
                      <span className="text-sm">Permutation</span>
                    </label>
                  </RadioGroup>
                </div>

                {mode === "permutation" && (
                  <div className="p-4 rounded-xl bg-card border border-border mt-3">
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
                )}
              </div>

              {/* Matches List */}
              <div className="lg:col-span-7">
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
                                      <TableHead className="text-center p-1">Time</TableHead>
                                      {["H", "D", "A", "1X", "12", "X2", "O25", "U25", "GG"].map((key) => (
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
                                            <div className="flex flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground">
                                              {isMatchLive(match.start_time, match.end_time) ? (
                                                <span className="flex w-fit items-center gap-1 px-2 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-medium">
                                                  <Zap className="w-3 h-3" /> LIVE
                                                </span>
                                              ) : (
                                                <>
                                                  {match.start_time && (
                                                    <div className="flex items-center gap-1">
                                                      Start: {new Date(match.start_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                  )}
                                                  {match.end_time && (
                                                    <div className="text-[9px]">
                                                      End: {new Date(match.end_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                  )}
                                                  {!match.start_time && !match.end_time && (
                                                    <span className="flex items-center gap-1">
                                                      <Clock className="w-3 h-3" /> TBD
                                                    </span>
                                                  )}
                                                </>
                                              )}
                                            </div>
                                          </TableCell>
                                          {["H", "D", "A", "1X", "12", "X2", "O25", "U25", "GG"].map((key, idx) => {
                                            const odds = match.prizes[idx] || 0;
                                            return (
                                              <TableCell key={`${match.id}-${key}`} className="text-center p-1 border border-border">
                                                <button
                                                  onClick={() => toggleBet(match.id, matchNumber, key as BetOptionKey, odds)}
                                                  className={clsx(
                                                    "cursor-pointer inline-flex items-center justify-center px-2 py-1 rounded-md text-sm font-semibold",
                                                    isSelected(match.id, key as BetOptionKey)
                                                      ? "bg-primary text-primary-foreground shadow"
                                                      : "bg-muted hover:bg-muted/80 text-foreground"
                                                  )}
                                                >
                                                  {odds.toFixed(2)}
                                                </button>
                                              </TableCell>
                                            );
                                          })}
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
                                      onClick={() => toggleBet(sel.matchId, sel.matchNumber, sel.option, sel.odds)}
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
                      disabled={isPlacingBet || selectedBets.length === 0}
                    >
                      {isPlacingBet ? "Placing Bet..." : "Place Bet"}
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
