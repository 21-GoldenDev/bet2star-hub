"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { gameModes, GameModeType } from "@/lib/types/gameMode";
import { calcAplGrouping } from "@/lib/helpers";
import PrizeTable from "../PrizeTable";
import { Prize } from "@/lib/types/prize";

const groupLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

interface USelection {
  id: string;
  u: number;
}

interface Props {
  activeTab: "result" | "fixtures";
  gameMode: GameModeType;
  gameId: string;
  prizes?: Prize[];
  setGameMode: (mode: GameModeType) => void;
  visibleNumbers?: number[];
}

const Grouping = ({ gameMode, gameId, prizes, setGameMode, visibleNumbers = [] }: Props) => {
  const [totalUnder, setTotalUnder] = useState<number>(3);
  const [selectedUs, setSelectedUs] = useState<USelection[]>([]);
  const [activeUId, setActiveUId] = useState<string | null>(null);
  const [groupSelections, setGroupSelections] = useState<Record<string, number[]>>({});
  const [betAmount, setBetAmount] = useState(5000);
  const [odd, setOdd] = useState<string>("");
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  const numbers = visibleNumbers.length > 0 ? visibleNumbers : Array.from({ length: 99 }, (_, i) => i + 1);
  const prize = prizes?.find((p) => p.id === odd);

  const currentSum = selectedUs.reduce((acc, sel) => acc + sel.u, 0);

  useEffect(() => {
    if (!odd && prizes && prizes.length > 0) {
      setOdd(prizes[0].id);
    }
  }, [prizes]);

  const handleUpdateU = (id: string, newU: number) => {
    const index = selectedUs.findIndex((sel) => sel.id === id);
    if (index === -1) return;
    const newSelectedUs = selectedUs.slice(0, index);
    newSelectedUs.push({ id, u: newU });
    setSelectedUs(newSelectedUs);
  }

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

  const toggleNumberForActive = (num: number) => {
    if (!activeUId) {
      toast.error("Select a U group first");
      return;
    }
    for (const id of Object.keys(groupSelections)) {
      if (id !== activeUId && groupSelections[id]?.includes(num)) {
        toast.error("Number already selected in another group");
        return;
      }
    }
    const current = groupSelections[activeUId] ?? [];
    if (current.includes(num)) {
      setGroupSelections({ ...groupSelections, [activeUId]: current.filter((n) => n !== num) });
      return;
    }
    setGroupSelections({ ...groupSelections, [activeUId]: [...current, num] });
  };

  const clearAll = () => {
    setSelectedUs([]);
    setActiveUId(null);
    setGroupSelections({});
  };

  const placeBet = async () => {
    if (selectedUs.length < 2) {
      toast.error("Select at least two U options");
      return;
    }
    if (currentSum > 7) {
      toast.error("Sum of U selections must not exceed 7");
      return;
    }
    if (betAmount <= 0) {
      toast.error("Enter a valid bet amount");
      return;
    }

    setIsPlacingBet(true);
    try {
      const response = await fetch("/api/bets/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          betType: 'lotto',
          gameId,
          betAmount,
          betData: {
            selectedNumbers: [],
            matchAtLeast: [totalUnder],
            gameMode,
            prize: odd,
            grouping: { selectedUs, groupSelections },
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to place bet");
        return;
      }

      toast.success(`Bet placed! Bet #${data.data.betNumber} - ₦${betAmount.toLocaleString()} deducted. New balance: ₦${data.data.newBalance.toLocaleString()}`);
      // Reset form
      clearAll();
      setBetAmount(5000);
      if (prizes && prizes.length > 0) {
        setOdd(prizes[0].id);
      } else {
        setOdd("");
      }
      setTotalUnder(3);
    } catch (error) {
      toast.error("Error placing bet");
      console.error(error);
    } finally {
      setIsPlacingBet(false);
    }
  };

  const nextGroup = useMemo(() => {
    if (!totalUnder) return null;
    const remaining = totalUnder - currentSum;
    if (remaining <= 0) return null;
    return {
      label: groupLabels[selectedUs.length],
      values: Array.from({ length: remaining }, (_, i) => i + 1),
    }
  }, [totalUnder, selectedUs]);

  const getNumbersGroup = (id: string) => {
    const index = selectedUs.findIndex((sel) => sel.id === id);
    if (index === -1) return [];
    const sum = selectedUs.slice(0, index).reduce((acc, sel) => acc + sel.u, 0);
    if (totalUnder - sum <= 0) return [];
    return Array.from({ length: totalUnder - sum }, (_, i) => i + 1);
  }

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
        <div className="lg:col-span-3">
          <div className="p-4 rounded-xl bg-card border border-border space-y-2 mb-4">
            <RadioGroup value={gameMode} onValueChange={setGameMode}>
              {Object.keys(gameModes).map((mode) => (
                <label
                  key={mode}
                  className="cursor-pointer flex items-center gap-2"
                >
                  <RadioGroupItem key={mode} value={mode} />
                  <span className="text-sm font-medium">
                    {gameModes[mode as keyof typeof gameModes]}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-sm font-semibold text-center mb-3 text-muted-foreground">Under</div>
            <div className="flex flex-col gap-2">
              <RadioGroup
                value={totalUnder.toString()}
                onValueChange={(e) => setTotalUnder(Number(e))}
              >
                {[2, 3, 4, 5, 6, 7].map((u) => (
                  <label
                    key={u}
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <RadioGroupItem key={u} value={u.toString()} />
                    <span className="text-sm font-medium">
                      {u}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>
          {!!prize && (
            <div className="mt-4">
              <PrizeTable prize={prize} />
            </div>
          )}
        </div>
        <div className="lg:col-span-6">
          <div className="flex flex-wrap gap-2 bg-card border border-border rounded-xl p-4">
            {numbers.map((num) => {
              const inActiveGroup = activeUId !== null && (groupSelections[activeUId] ?? []).includes(num);
              const inOtherGroup = Object.entries(groupSelections).some(([id, arr]) => id !== activeUId && arr.includes(num));
              return (
                <button
                  key={num}
                  onClick={() => toggleNumberForActive(num)}
                  className={clsx(
                    "aspect-square w-12 rounded-xl font-bold text-lg transition-all duration-300",
                    inActiveGroup
                      ? "cursor-pointer bg-primary text-primary-foreground shadow-[0_0_20px_hsl(43_96%_56%/0.3)]"
                      : inOtherGroup
                        ? "cursor-not-allowed bg-secondary text-secondary-foreground"
                        : "cursor-pointer bg-muted border border-border hover:border-primary/50 hover:bg-muted/80 text-foreground"
                  )}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-card border border-border flex flex-col h-full">
            <div className="text-sm font-semibold mb-3 text-muted-foreground">Selected Numbers</div>
            <div className="space-y-3 overflow-y-auto min-h-30 flex-1 scrollbar">
              {selectedUs.map((sel, index) => (
                <div
                  key={sel.id}
                  onClick={() => setActiveUId(sel.id)}
                  className={clsx(
                    "p-3 rounded-lg cursor-pointer transition-all",
                    activeUId === sel.id
                      ? "bg-primary/10 border border-primary"
                      : "bg-muted/50 border border-border/50 hover:bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{groupLabels[index]}</span>
                      <div onClick={(e) => e.stopPropagation()}>
                        <select
                          value={sel.u}
                          onChange={(e) => handleUpdateU(sel.id, Number(e.target.value))}
                          className={clsx(
                            "px-2 py-0.5 rounded text-xs bg-muted border text-foreground cursor-pointer",
                            activeUId === sel.id ? "border-primary" : "border-border"
                          )}
                        >
                          <option value="">Select</option>
                          {getNumbersGroup(sel.id).map((val) => (
                            <option key={val} value={val}>
                              {val}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeU(sel.id);
                      }}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <span className="text-sm font-semibold">✕</span>
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(groupSelections[sel.id] ?? []).length === 0 ? (
                      <div className="text-xs text-muted-foreground">No numbers selected</div>
                    ) : (
                      (groupSelections[sel.id] ?? []).sort((a, b) => a - b).map((n) => (
                        <div key={n} className="px-2 py-1 rounded bg-card border border-border text-xs font-medium">
                          {n}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
              {!!nextGroup && (
                <div className="p-3 rounded-lg cursor-pointer transition-all bg-muted/50 border border-border/50 hover:bg-muted">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{nextGroup.label}</span>
                      <div onClick={(e) => e.stopPropagation()}>
                        <select
                          value=""
                          onChange={(e) => handleAddU(Number(e.target.value))}
                          className="px-2 py-0.5 rounded text-xs bg-muted border border-border text-foreground cursor-pointer"
                        >
                          <option value="">Select</option>
                          {nextGroup.values.map((val) => (
                            <option key={val} value={val}>
                              {val}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-sm font-semibold mb-4 text-muted-foreground">Odds</div>
            <div className="flex flex-col gap-2">
              <RadioGroup value={odd} onValueChange={setOdd}>
                {(prizes || []).map((prize) => (
                  <label key={prize.id} className="cursor-pointer flex items-center gap-2">
                    <RadioGroupItem key={prize.id} value={prize.id} />
                    <span className="text-sm font-medium">{prize.name}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>

          {selectedUs.length >= 2 && currentSum === totalUnder && !selectedUs.some((sel) => (groupSelections[sel.id] ?? []).length < sel.u) && (
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="text-sm font-semibold mb-3 text-muted-foreground">APL</div>
              <div className="flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">
                  {calcAplGrouping(betAmount, groupSelections).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-sm font-semibold mb-3 text-muted-foreground">Amount</div>
            <div className="flex flex-col gap-2">
              <Input
                type="number"
                min={1}
                step={1}
                value={betAmount.toString()}
                onChange={(e) => setBetAmount(Number(e.target.value || 0))}
                className="w-full"
              />
            </div>
          </div>

          <Button
            variant="gold"
            size="lg"
            onClick={placeBet}
            disabled={selectedUs.length < 2 || currentSum !== totalUnder || betAmount <= 0 || selectedUs.some((sel) => (groupSelections[sel.id] ?? []).length < sel.u) || isPlacingBet}
            className="w-full py-3"
          >
            {isPlacingBet ? "Placing..." : "Stake"}
          </Button>

          {(selectedUs.length < 2 || currentSum !== totalUnder || betAmount <= 0 || selectedUs.some((sel) => (groupSelections[sel.id] ?? []).length < sel.u)) && (
            <div className="text-xs text-red-400 text-left list-disc ml-4">
              {selectedUs.length < 2 && <li>Select at least 2 groups</li>}
              {selectedUs.length >= 2 && currentSum !== totalUnder && <li>Fill all groups ({currentSum}/{totalUnder})</li>}
              {currentSum === totalUnder && selectedUs.some((sel) => (groupSelections[sel.id] ?? []).length < sel.u) && <li>Select all required matches</li>}
              {betAmount <= 0 && <li>Enter valid bet amount</li>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Grouping;

