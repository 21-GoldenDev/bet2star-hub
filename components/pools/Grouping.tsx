"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Odd_40_1A from "../odds/40_1A";
import Odd_100_1 from "../odds/100_1";
import { gameModes, GameModeType } from "@/types/gameMode";

const groupLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

interface Props {
  matches: string[];
  activeTab: "result" | "fixtures";
  gameMode: GameModeType;
  setGameMode: (mode: GameModeType) => void;
}

interface USelection {
  id: string;
  u: number;
}

const Grouping = ({ matches, gameMode, setGameMode }: Props) => {
  const [totalUnder, setTotalUnder] = useState<number>(0);
  const [selectedUs, setSelectedUs] = useState<USelection[]>([]);
  const [activeUId, setActiveUId] = useState<string | null>(null);
  const [groupSelections, setGroupSelections] = useState<Record<string, string[]>>({});
  const [betAmount, setBetAmount] = useState(5000);
  const [odd, setOdd] = useState<string>("");

  const currentSum = selectedUs.reduce((acc, sel) => acc + sel.u, 0);

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

  const toggleMatchForActive = (match: string) => {
    if (!activeUId) {
      toast.error("Select a U group first");
      return;
    }
    for (const id of Object.keys(groupSelections)) {
      if (id !== activeUId && groupSelections[id]?.includes(match)) {
        toast.error("Match already selected in another group");
        return;
      }
    }
    const current = groupSelections[activeUId] ?? [];
    if (current.includes(match)) {
      setGroupSelections({ ...groupSelections, [activeUId]: current.filter((m) => m !== match) });
      return;
    }
    setGroupSelections({ ...groupSelections, [activeUId]: [...current, match] });
  };

  const clearAll = () => {
    setSelectedUs([]);
    setActiveUId(null);
    setGroupSelections({});
  };

  const clearGroup = (id: string) => {
    const copy = { ...groupSelections };
    copy[id] = [];
    setGroupSelections(copy);
  };

  const placeBet = () => {
    if (selectedUs.length < 2) {
      toast.error("Select at least two U options");
      return;
    }
    if (currentSum > 7) {
      toast.error("Sum of U selections must not exceed 7");
      return;
    }
    for (const sel of selectedUs) {
      const selMatches = groupSelections[sel.id] ?? [];
      if (selMatches.length !== sel.u) {
        toast.error(`U${sel.u} requires ${sel.u} matches`);
        return;
      }
    }
    if (betAmount <= 0) {
      toast.error("Enter a valid bet amount");
      return;
    }

    const groups = selectedUs
      .map((sel) => `U${sel.u}:[${(groupSelections[sel.id] ?? []).join(",")}]`)
      .join(" ");

    toast.success(`Bet placed! ${groups} | Bet: $${betAmount}`);
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

  const getMatchesGroup = (id: string) => {
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
          {!!odd && (
            <div className="mt-4">
              {odd === "40-1 A" && <Odd_40_1A />}
              {odd === "100-1" && <Odd_100_1 />}
            </div>
          )}
        </div>
        <div className="lg:col-span-6">
          <div className="max-h-screen overflow-y-auto scrollbar">
            <div className="grid grid-cols-7 lg:grid-cols-10 gap-2 bg-card border border-border rounded-xl p-4">
              {matches.map((match, index) => {
                const inActiveGroup = activeUId !== null && (groupSelections[activeUId] ?? []).includes(match);
                const inOtherGroup = Object.entries(groupSelections).some(([id, arr]) => id !== activeUId && arr.includes(match));
                return (
                  <button
                    key={index}
                    onClick={() => toggleMatchForActive(match)}
                    className={clsx(
                      "p-3 rounded-xl font-medium text-sm transition-all duration-300",
                      inActiveGroup
                        ? "cursor-pointer bg-primary text-primary-foreground shadow-[0_0_20px_hsl(43_96%_56%/0.3)]"
                        : inOtherGroup
                          ? "cursor-not-allowed bg-secondary text-secondary-foreground"
                          : "cursor-pointer bg-muted border border-border hover:border-primary/50 hover:bg-muted/80 text-foreground"
                    )}
                  >
                    {match}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-card border border-border flex flex-col">
            <div className="text-sm font-semibold mb-3 text-muted-foreground">Selected Matches</div>
            <div className="space-y-3 min-h-30 max-h-80 overflow-y-auto flex-1 scrollbar">
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
                          {getMatchesGroup(sel.id).map((val) => (
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
                      <div className="text-xs text-muted-foreground">No matches selected</div>
                    ) : (
                      matches.map((m, i) => (
                        (groupSelections[sel.id] ?? []).includes(m) ? (
                          <div key={`${i}-${m}`} className="px-2 py-1 rounded bg-card border border-border text-xs font-medium">
                            {m}
                          </div>
                        ) : null
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
                {['40-1 A', '100-1'].map((oddsValue) => (
                  <label key={oddsValue} className="cursor-pointer flex items-center gap-2">
                    <RadioGroupItem key={oddsValue} value={oddsValue} />
                    <span className="text-sm font-medium">{oddsValue}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>

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
            disabled={selectedUs.length < 2 || currentSum > 7 || betAmount <= 0 || selectedUs.some((sel) => (groupSelections[sel.id] ?? []).length < sel.u)}
            className="w-full py-3"
          >
            Stake
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Grouping;

