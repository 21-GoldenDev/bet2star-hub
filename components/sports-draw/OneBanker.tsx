"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DrawMatchList from "./DrawMatchList";
import { DrawBetSelection, DrawMatchRow } from "./types";
import { Game } from "@/lib/types/game";
import {
  calcSportsGroupedApl,
  previewSportsGroupedWinnings,
} from "@/lib/bets/sportsCombinations";
import { useSupabaseUser } from "@/hooks/use-supabase-user";

interface Props {
  matches: DrawMatchRow[];
  drawOddsMap: Record<number, number>;
  matchNumberMap: Map<string, number>;
  activeGame: Game;
  onBetPlaced: () => void;
}

const OneBanker = ({ matches, drawOddsMap, matchNumberMap, activeGame, onBetPlaced }: Props) => {
  const { user } = useSupabaseUser();
  const [selections, setSelections] = useState<DrawBetSelection[]>([]);
  const [bankerMatchId, setBankerMatchId] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(5000);
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  const groupABets = selections.filter((b) => b.matchId === bankerMatchId);
  const groupBBets = selections.filter((b) => b.matchId !== bankerMatchId);

  const toggleBet = (matchId: string, matchNumber: number, odds: number) => {
    const existing = selections.find((b) => b.matchId === matchId);
    if (existing) {
      const next = selections.filter((b) => b.matchId !== matchId);
      setSelections(next);
      if (bankerMatchId === matchId) setBankerMatchId(null);
      return;
    }
    setSelections([...selections, { matchId, matchNumber, option: "D", odds }]);
  };

  const isSelected = (matchId: string) => selections.some((b) => b.matchId === matchId);

  const storageGroups = useMemo(() => {
    if (!bankerMatchId || groupABets.length !== 1) return null;
    return {
      "1-groupA": groupABets.map((b) => String(b.matchNumber)),
      "2-groupB": groupBBets.map((b) => String(b.matchNumber)),
    };
  }, [bankerMatchId, groupABets, groupBBets]);

  const winningsPreview = useMemo(() => {
    if (!storageGroups || groupBBets.length < 2) return null;
    const groups: Record<string, Record<string, string[]>> = {
      "1-groupA": {},
      "2-groupB": {},
    };
    const oddsMap: Record<string, number> = {};
    groupABets.forEach((b) => {
      groups["1-groupA"][String(b.matchNumber)] = ["D"];
      oddsMap[String(b.matchNumber)] = b.odds;
    });
    groupBBets.forEach((b) => {
      groups["2-groupB"][String(b.matchNumber)] = ["D"];
      oddsMap[String(b.matchNumber)] = b.odds;
    });
    return previewSportsGroupedWinnings(betAmount, groups, oddsMap);
  }, [storageGroups, groupABets, groupBBets, betAmount]);

  const isReady = bankerMatchId !== null && groupABets.length === 1 && groupBBets.length >= 2 && betAmount > 0;

  const placeBet = async () => {
    if (!isReady || !storageGroups) return;
    if (!user) {
      toast.error("Please sign in to place a bet");
      return;
    }
    if (activeGame.max_stake?.amount && betAmount > activeGame.max_stake.amount) {
      toast.error(`Maximum stake is ₦${activeGame.max_stake.amount.toLocaleString()}`);
      return;
    }

    const selectionsObj: Record<string, Record<string, string[]>> = {
      "1-groupA": {},
      "2-groupB": {},
    };
    groupABets.forEach((b) => {
      selectionsObj["1-groupA"][String(b.matchNumber)] = ["D"];
    });
    groupBBets.forEach((b) => {
      selectionsObj["2-groupB"][String(b.matchNumber)] = ["D"];
    });

    setIsPlacingBet(true);
    try {
      const response = await fetch("/api/bets/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          betType: "sports_draw",
          gameId: activeGame.id,
          betAmount,
          betData: {
            mode: "one_banker",
            under: [2],
            onebanker: { bankerMatchId },
            selections: selectionsObj,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to place bet");
      toast.success(
        `Bet placed! Bet #${result.data.betNumber} - ₦${betAmount.toLocaleString()} deducted. New balance: ₦${result.data.newBalance.toLocaleString()}`,
      );
      setSelections([]);
      setBankerMatchId(null);
      setBetAmount(5000);
      onBetPlaced();
    } catch (error: any) {
      toast.error(error.message || "Failed to place bet");
    } finally {
      setIsPlacingBet(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-2">
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-sm font-semibold text-center mb-3 text-muted-foreground">Under</div>
          <div className="px-2 py-1 rounded text-xs bg-muted border border-border text-center font-medium">
            Under 2 (Fixed)
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Banker draw must win. At least 2 of the remaining draws must win.
          </p>
        </div>
      </div>

      <div className="lg:col-span-7">
        <div className="p-4 pr-2 rounded-xl bg-card border border-border">
          <div className="pr-2 max-h-150 lg:max-h-[calc(100vh-18rem)] overflow-auto scrollbar">
            <DrawMatchList
              matches={matches}
              drawOddsMap={drawOddsMap}
              matchNumberMap={matchNumberMap}
              isSelected={isSelected}
              onToggle={toggleBet}
            />
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 flex flex-col gap-4">
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-sm font-semibold mb-3 text-muted-foreground">Groups</div>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary">
              <div className="font-bold text-sm mb-2">Group A — Banker</div>
              {groupABets.length === 0 ? (
                <p className="text-xs text-muted-foreground">Set banker from selections below</p>
              ) : (
                groupABets.map((b) => (
                  <span key={b.matchId} className="px-2 py-1 rounded bg-card border text-xs">
                    {b.matchNumber} X @{b.odds.toFixed(2)}
                  </span>
                ))
              )}
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <div className="font-bold text-sm mb-2">Group B — Variables (2 of {groupBBets.length})</div>
              {groupBBets.length === 0 ? (
                <p className="text-xs text-muted-foreground">Select 2+ more draws</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {groupBBets.map((b) => (
                    <span key={b.matchId} className="px-2 py-1 rounded bg-card border text-xs">
                      {b.matchNumber} X @{b.odds.toFixed(2)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {selections.length > 0 && (
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-sm font-semibold mb-2 text-muted-foreground">Set Banker</div>
            <div className="flex flex-wrap gap-2">
              {selections.map((b) => (
                <button
                  key={b.matchId}
                  type="button"
                  onClick={() => setBankerMatchId(b.matchId)}
                  className={clsx(
                    "px-2 py-1 rounded text-xs border",
                    bankerMatchId === b.matchId
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted border-border",
                  )}
                >
                  #{b.matchNumber}
                </button>
              ))}
            </div>
          </div>
        )}

        {isReady && storageGroups && (
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-sm font-semibold mb-2 text-muted-foreground">APL</div>
            <div className="text-lg font-bold text-center">
              ₦{calcSportsGroupedApl(betAmount, storageGroups).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        )}

        {winningsPreview && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Min Winning</span>
              <span className="font-semibold">
                ₦{winningsPreview.min.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">Max Winning</span>
              <span className="font-bold text-primary">
                ₦{winningsPreview.max.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        <div className="p-4 rounded-xl bg-card border border-border">
          <label className="text-sm text-muted-foreground" htmlFor="draw-banker-amount">
            Bet Amount
          </label>
          <Input
            id="draw-banker-amount"
            type="number"
            min={0}
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value)))}
          />
        </div>

        <Button variant="gold" size="lg" className="w-full" disabled={!isReady || isPlacingBet} onClick={placeBet}>
          {isPlacingBet ? "Placing..." : "Place Bet"}
        </Button>
      </div>
    </div>
  );
};

export default OneBanker;
