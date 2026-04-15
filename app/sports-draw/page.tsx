"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Game } from "@/lib/types/game";
import { SportsMatch } from "@/lib/types/sports";
import BettingAccessGate from "@/components/BettingAccessGate";
import supabase from "@/lib/supabase/client";
import { useSupabaseUser } from "@/hooks/use-supabase-user";

type BetOptionKey = "D";

interface Match {
  id: string;
  number: number;
  league: string;
  homeTeam: string;
  awayTeam: string;
  prizes: number[];
  status?: "active" | "void";
  start_time?: string;
  end_time?: string;
}

type BetSelection = { matchId: string; matchNumber: number; option: BetOptionKey; odds: number };
type SportsDrawGame = Game & { prize_ids?: any };

const extractSportsDrawOddsMap = (prizeIds: any): Record<number, number> => {
  if (!prizeIds || typeof prizeIds !== "object" || Array.isArray(prizeIds)) return {};
  const entries = Array.isArray(prizeIds.draw_odds) ? prizeIds.draw_odds : [];
  return entries.reduce((acc: Record<number, number>, item: any) => {
    const matchNumber = Number(item?.match_number);
    const odd = Number(item?.odd);
    if (Number.isFinite(matchNumber) && matchNumber > 0 && Number.isFinite(odd) && odd >= 0) {
      acc[matchNumber] = odd;
    }
    return acc;
  }, {});
};

const SportsDrawPage = () => {
  const { user } = useSupabaseUser();
  const [selectedBets, setSelectedBets] = useState<BetSelection[]>([]);
  const [betAmount, setBetAmount] = useState<number>(5000);
  const [matchAtLeast, setMatchAtLeast] = useState<number[]>([]);
  const [mode, setMode] = useState<"direct" | "permutation">("direct");
  const [activeGame, setActiveGame] = useState<SportsDrawGame | null>(null);
  const [drawOddsMap, setDrawOddsMap] = useState<Record<number, number>>({});
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  useEffect(() => {
    const maxValidValue = selectedBets.length - 1;
    setMatchAtLeast((prev) => prev.filter((val) => val <= maxValidValue));
  }, [selectedBets.length]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const fetchMatches = async (gameId: string) => {
      try {
        const { data, error } = await supabase
          .from("sports")
          .select("*")
          .eq("game_id", gameId)
          .neq("status", "void")
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

        setMatches(formattedMatches.slice(0, 49));
      } catch (error) {
        console.error("Error fetching sports draw matches:", error);
      }
    };

    const fetchActiveGame = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/games/sports-draw/active");
        const data = await response.json();
        const game = data?.game as SportsDrawGame | null;
        setActiveGame(game);
        setDrawOddsMap(extractSportsDrawOddsMap(game?.prize_ids));

        // Now fetch matches directly from the sports_draw game
        if (!game?.id) {
          setMatches([]);
          if (!interval) {
            interval = setInterval(fetchActiveGame, 30000);
          }
        } else {
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
          await fetchMatches(game.id);
        }
      } catch (error) {
        console.error("Error fetching active sports draw game:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveGame();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const toggleBet = (matchId: string, matchNumber: number, odds: number) => {
    const option: BetOptionKey = "D";
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

  const isSelected = (matchId: string) => {
    return selectedBets.some((b) => b.matchId === matchId && b.option === "D");
  };

  const totalOdds = selectedBets.reduce((acc, bet) => acc * bet.odds, 1);

  const factorial = (n: number): number => {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
  };

  const combination = (n: number, r: number): number => {
    if (r > n) return 0;
    return factorial(n) / (factorial(r) * factorial(n - r));
  };

  const generateCombinations = (array: number[], length: number): number[][] => {
    if (length === 0) return [[]];
    if (length > array.length) return [];
    if (length === 1) return array.map((item) => [item]);

    const result: number[][] = [];
    for (let i = 0; i <= array.length - length; i++) {
      const head = array[i];
      const tail = generateCombinations(array.slice(i + 1), length - 1);
      result.push(...tail.map((combo) => [head, ...combo]));
    }
    return result;
  };

  const calculatePermutationWinnings = () => {
    if (selectedBets.length === 0 || matchAtLeast.length === 0 || betAmount <= 0) {
      return null;
    }

    const numLines = matchAtLeast.reduce((acc, val) => acc + combination(selectedBets.length, val), 0);
    if (numLines === 0) return null;

    const apl = betAmount / numLines;
    const allWinnings: number[] = [];
    const odds = selectedBets.map((bet) => bet.odds);

    for (const winCount of matchAtLeast) {
      if (winCount > odds.length) continue;

      const combinations = generateCombinations(odds, winCount);

      for (const combo of combinations) {
        const product = combo.reduce((acc, val) => acc * val, 1);
        allWinnings.push(product * apl);
      }
    }

    return {
      min: Math.min(...allWinnings),
      max: allWinnings.reduce((a, b) => a + b, 0),
      numLines,
      apl,
    };
  };

  const permutationWinnings = calculatePermutationWinnings();

  const toggleMatch = (m: number) => {
    if (matchAtLeast.includes(m)) setMatchAtLeast(matchAtLeast.filter((x) => x !== m));
    else setMatchAtLeast([...matchAtLeast, m]);
  };

  const placeBet = async () => {
    if (selectedBets.length === 0) {
      toast.error("Please select at least one draw option");
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

    if (activeGame.max_stake?.amount && betAmount > activeGame.max_stake.amount) {
      toast.error(`Maximum stake is ₦${activeGame.max_stake.amount.toLocaleString()}`);
      return;
    }

    if (mode === "permutation" && matchAtLeast.length === 0) {
      toast.error("Please select under value");
      return;
    }

    if (!user) {
      toast.error("Please sign in to place a bet");
      return;
    }

    setIsPlacingBet(true);
    try {
      const selections: Record<number, string[]> = {};
      selectedBets.forEach((bet) => {
        if (!selections[bet.matchNumber]) {
          selections[bet.matchNumber] = [];
        }
        selections[bet.matchNumber].push("D");
      });

      const response = await fetch("/api/bets/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          betType: "sports_draw",
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
        throw new Error(result.error || "Failed to place bet");
      }

      toast.success(`Bet placed! Bet #${result.data.betNumber} - ₦${betAmount.toLocaleString()} deducted. New balance: ₦${result.data.newBalance.toLocaleString()}`);

      setSelectedBets([]);
      setBetAmount(5000);
      setMatchAtLeast([]);
      setMode("direct");
    } catch (error: any) {
      console.error("Error placing sports draw bet:", error);
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

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => a.number - b.number);
  }, [matches]);

  const matchNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    matches.forEach((m) => {
      map.set(m.id, m.number);
    });
    return map;
  }, [matches]);

  return (
    <>
      <BettingAccessGate />
      <div className="min-h-screen pt-24 pb-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-10 animate-slide-up">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Today's Football Pool Matches</h1>
            <p className="text-muted-foreground">Choose draw (X) outcomes from the same Sports fixtures.</p>
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
                <h2 className="text-2xl font-bold text-foreground mb-2">No Active Game</h2>
                <p className="text-muted-foreground mb-4">There is currently no active Football Pool game available. Please check back later.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-2">
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <RadioGroup value={mode} onValueChange={(val) => setMode(val as "direct" | "permutation")}>
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
                        {Array.from({ length: Math.max(0, selectedBets.length - 1) }, (_, i) => i + 1).map((u) => (
                          <label key={u} onClick={() => toggleMatch(u)} className="cursor-pointer flex items-center gap-2">
                            <div className="size-4 rounded-full bg-transparent border border-primary flex items-center justify-center">
                              {matchAtLeast.includes(u) && <div className="bg-primary size-2 rounded-full" />}
                            </div>
                            <span className="text-sm font-medium">{u}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-7">
                  <div className="p-4 pr-2 rounded-xl bg-card border border-border">
                    <div className="space-y-2 pr-2 max-h-150 lg:max-h-[calc(100vh-18rem)] overflow-auto scrollbar">
                      {sortedMatches.map((match) => {
                        const matchNumber = matchNumberMap.get(match.id) ?? 0;
                        const drawOdds = drawOddsMap[matchNumber] ?? match.prizes[0] ?? 0;
                        const selected = isSelected(match.id);
                        return (
                          <div
                            key={match.id}
                            onClick={() => toggleBet(match.id, matchNumber, drawOdds)}
                            className={clsx(
                              "flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer",
                              selected
                                ? "border-primary bg-primary/10"
                                : "border-border bg-muted/30 hover:bg-muted/50"
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
                                selected
                                  ? "bg-primary text-primary-foreground shadow-lg"
                                  : "bg-muted text-foreground"
                              )}
                            >
                              {drawOdds.toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-3 flex flex-col gap-4">
                  <div className="p-5 rounded-2xl bg-card border border-border animate-slide-up" style={{ animationDelay: "200ms" }}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-foreground">Selected Draw Bets</h3>
                      {selectedBets.length > 0 && (
                        <button onClick={clearBets} className="text-xs text-muted-foreground hover:text-foreground">
                          Clear All
                        </button>
                      )}
                    </div>

                    {selectedBets.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">Select draw options to add to your slip</div>
                    ) : (
                      <div className="max-h-70 overflow-y-auto mb-4 scrollbar">
                        <div className="space-y-4 pr-1">
                          {Array.from(groupedSelections.entries()).map(([matchId, selections]) => {
                            const match = matches.find((m) => m.id === matchId)!;
                            const matchNumber = matchNumberMap.get(matchId) ?? 0;
                            return (
                              <div key={matchId} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                                <div className="text-sm font-medium text-foreground mb-2">
                                  {matchNumber}. {match.homeTeam} vs {match.awayTeam}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {selections.map((sel) => (
                                    <div key={`${sel.matchId}-${sel.option}`} className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-card border border-border text-sm">
                                      <span className="text-muted-foreground">X</span>
                                      <span className="font-semibold">{sel.odds.toFixed(2)}</span>
                                      <button
                                        onClick={() => toggleBet(sel.matchId, sel.matchNumber, sel.odds)}
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
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-muted-foreground" htmlFor="bet-amount">Bet Amount</label>
                          {activeGame?.max_stake?.amount && (
                            <div className="text-xs text-muted-foreground">Max: ₦{activeGame.max_stake.amount.toLocaleString()}</div>
                          )}
                        </div>
                        <Input
                          id="bet-amount"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={activeGame?.max_stake?.amount}
                          step={1}
                          placeholder="Enter amount"
                          value={betAmount}
                          onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value)))}
                        />
                      </div>

                      {mode === "direct" && selectedBets.length > 0 && betAmount > 0 && (
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm font-medium text-foreground">Possible Winning:</span>
                            <span className="font-bold text-lg text-primary">₦{(betAmount * totalOdds).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      )}

                      {mode === "permutation" && permutationWinnings && betAmount > 0 && (
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">APL:</span>
                            <span className="font-semibold text-foreground">₦{permutationWinnings.apl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Min Winning:</span>
                            <span className="font-semibold text-foreground">₦{permutationWinnings.min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-foreground">Max Winning:</span>
                            <span className="font-bold text-lg text-primary">₦{permutationWinnings.max.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      )}

                      <Button variant="gold" className="w-full" size="lg" onClick={placeBet} disabled={isPlacingBet || selectedBets.length === 0}>
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
    </>
  );
};

export default SportsDrawPage;
