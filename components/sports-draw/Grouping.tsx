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

const groupLabels = ["A", "B", "C", "D", "E", "F", "G"];

interface USelection {
  id: string;
  u: number;
}

interface Props {
  matches: DrawMatchRow[];
  drawOddsMap: Record<number, number>;
  matchNumberMap: Map<string, number>;
  activeGame: Game;
  onBetPlaced: () => void;
}

const Grouping = ({ matches, drawOddsMap, matchNumberMap, activeGame, onBetPlaced }: Props) => {
  const { user } = useSupabaseUser();
  const [totalUnder, setTotalUnder] = useState(3);
  const [selectedUs, setSelectedUs] = useState<USelection[]>([]);
  const [activeUId, setActiveUId] = useState<string | null>(null);
  const [groupSelections, setGroupSelections] = useState<Record<string, DrawBetSelection[]>>({});
  const [betAmount, setBetAmount] = useState(5000);
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  const currentSum = selectedUs.reduce((acc, sel) => acc + sel.u, 0);

  const handleUpdateU = (id: string, newU: number) => {
    const index = selectedUs.findIndex((sel) => sel.id === id);
    if (index === -1) return;
    const newSelectedUs = selectedUs.slice(0, index);
    newSelectedUs.push({ id, u: newU });
    setSelectedUs(newSelectedUs);
  };

  const handleAddU = (u: number) => {
    const newId = `${u}-${Date.now()}`;
    if (currentSum + u > 7) {
      toast.error("Total of selected U values cannot exceed 7");
      return;
    }
    setSelectedUs([...selectedUs, { id: newId, u }]);
    setActiveUId(newId);
    setGroupSelections({ ...groupSelections, [newId]: [] });
  };

  const removeU = (id: string) => {
    setSelectedUs(selectedUs.filter((sel) => sel.id !== id));
    const copy = { ...groupSelections };
    delete copy[id];
    setGroupSelections(copy);
    if (activeUId === id) {
      setActiveUId(selectedUs.filter((sel) => sel.id !== id)[0]?.id ?? null);
    }
  };

  const toggleBetForActive = (matchId: string, matchNumber: number, odds: number) => {
    if (!activeUId) {
      toast.error("Select a group first");
      return;
    }
    for (const id of Object.keys(groupSelections)) {
      if (id !== activeUId && groupSelections[id]?.some((b) => b.matchId === matchId)) {
        toast.error("Match already selected in another group");
        return;
      }
    }
    const current = groupSelections[activeUId] ?? [];
    const existing = current.find((b) => b.matchId === matchId);
    if (existing) {
      setGroupSelections({
        ...groupSelections,
        [activeUId]: current.filter((b) => b.matchId !== matchId),
      });
      return;
    }
    setGroupSelections({
      ...groupSelections,
      [activeUId]: [...current, { matchId, matchNumber, option: "D", odds }],
    });
  };

  const isSelected = (matchId: string) => {
    if (!activeUId) return false;
    return (groupSelections[activeUId] ?? []).some((b) => b.matchId === matchId);
  };

  const matchesInOtherGroups = useMemo(() => {
    const set = new Set<string>();
    if (!activeUId) return set;
    for (const [id, bets] of Object.entries(groupSelections)) {
      if (id === activeUId) continue;
      bets.forEach((b) => set.add(b.matchId));
    }
    return set;
  }, [activeUId, groupSelections]);

  const storageGroups = useMemo(() => {
    const obj: Record<string, string[]> = {};
    selectedUs.forEach((sel) => {
      obj[`${sel.u}-${sel.id}`] = (groupSelections[sel.id] ?? []).map((b) => String(b.matchNumber));
    });
    return obj;
  }, [selectedUs, groupSelections]);

  const winningsPreview = useMemo(() => {
    if (selectedUs.length < 2 || currentSum !== totalUnder) return null;
    const groups: Record<string, Record<string, string[]>> = {};
    const oddsMap: Record<string, number> = {};
    selectedUs.forEach((sel) => {
      const key = `${sel.u}-${sel.id}`;
      groups[key] = {};
      (groupSelections[sel.id] ?? []).forEach((b) => {
        groups[key][String(b.matchNumber)] = ["D"];
        oddsMap[String(b.matchNumber)] = b.odds;
      });
    });
    return previewSportsGroupedWinnings(betAmount, groups, oddsMap);
  }, [selectedUs, currentSum, totalUnder, groupSelections, betAmount]);

  const nextGroup = useMemo(() => {
    const remaining = totalUnder - currentSum;
    if (remaining <= 0) return null;
    return {
      label: groupLabels[selectedUs.length],
      values: Array.from({ length: remaining }, (_, i) => i + 1),
    };
  }, [totalUnder, selectedUs, currentSum]);

  const getMatchesGroup = (id: string) => {
    const index = selectedUs.findIndex((sel) => sel.id === id);
    if (index === -1) return [];
    const sum = selectedUs.slice(0, index).reduce((acc, sel) => acc + sel.u, 0);
    if (totalUnder - sum <= 0) return [];
    return Array.from({ length: totalUnder - sum }, (_, i) => i + 1);
  };

  const isReady =
    selectedUs.length >= 2 &&
    currentSum === totalUnder &&
    !selectedUs.some((sel) => (groupSelections[sel.id] ?? []).length < sel.u) &&
    betAmount > 0;

  const placeBet = async () => {
    if (!isReady) return;
    if (!user) {
      toast.error("Please sign in to place a bet");
      return;
    }
    if (activeGame.max_stake?.amount && betAmount > activeGame.max_stake.amount) {
      toast.error(`Maximum stake is ₦${activeGame.max_stake.amount.toLocaleString()}`);
      return;
    }

    const selections: Record<string, Record<string, string[]>> = {};
    selectedUs.forEach((sel) => {
      const key = `${sel.u}-${sel.id}`;
      selections[key] = {};
      (groupSelections[sel.id] ?? []).forEach((b) => {
        selections[key][String(b.matchNumber)] = ["D"];
      });
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
            mode: "grouping",
            under: [totalUnder],
            grouping: { selectedUs, groupSelections: selections },
            selections,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to place bet");
      toast.success(
        `Bet placed! Bet #${result.data.betNumber} - ₦${betAmount.toLocaleString()} deducted. New balance: ₦${result.data.newBalance.toLocaleString()}`,
      );
      setSelectedUs([]);
      setActiveUId(null);
      setGroupSelections({});
      setBetAmount(5000);
      setTotalUnder(3);
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
          <div className="flex flex-col gap-2">
            {[2, 3, 4, 5, 6, 7].map((u) => (
              <label key={u} className="cursor-pointer flex items-center gap-2">
                <input
                  type="radio"
                  name="draw-total-under"
                  checked={totalUnder === u}
                  onChange={() => setTotalUnder(u)}
                  className="accent-primary"
                />
                <span className="text-sm font-medium">{u}</span>
              </label>
            ))}
          </div>
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
              onToggle={toggleBetForActive}
              disabledMatchIds={matchesInOtherGroups}
            />
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 flex flex-col gap-4">
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-sm font-semibold mb-3 text-muted-foreground">Groups</div>
          <div className="space-y-3 max-h-80 overflow-y-auto scrollbar">
            {selectedUs.map((sel, index) => (
              <div
                key={sel.id}
                onClick={() => setActiveUId(sel.id)}
                className={clsx(
                  "p-3 rounded-lg cursor-pointer transition-all",
                  activeUId === sel.id
                    ? "bg-primary/10 border border-primary"
                    : "bg-muted/50 border border-border/50 hover:bg-muted",
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">Group {groupLabels[index]}</span>
                    <select
                      value={sel.u}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleUpdateU(sel.id, Number(e.target.value))}
                      className="px-2 py-0.5 rounded text-xs bg-muted border border-border"
                    >
                      {getMatchesGroup(sel.id).map((val) => (
                        <option key={val} value={val}>
                          U{val}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeU(sel.id);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    ✕
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(groupSelections[sel.id] ?? []).length === 0 ? (
                    <span className="text-xs text-muted-foreground">Select draws from list</span>
                  ) : (
                    (groupSelections[sel.id] ?? []).map((b) => (
                      <span key={b.matchId} className="px-2 py-1 rounded bg-card border border-border text-xs">
                        {b.matchNumber} X @{b.odds.toFixed(2)}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
            {nextGroup && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">Group {nextGroup.label}</span>
                  <select
                    value=""
                    onChange={(e) => e.target.value && handleAddU(Number(e.target.value))}
                    className="px-2 py-0.5 rounded text-xs bg-muted border border-border"
                  >
                    <option value="">Add group (U)</option>
                    {nextGroup.values.map((val) => (
                      <option key={val} value={val}>
                        U{val}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {isReady && (
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
          <label className="text-sm text-muted-foreground" htmlFor="draw-grouping-amount">
            Bet Amount
          </label>
          <Input
            id="draw-grouping-amount"
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

export default Grouping;
