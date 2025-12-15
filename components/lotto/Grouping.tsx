"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import clsx from "clsx";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface USelection {
  id: string;
  u: number;
}

const Grouping = () => {
  const [selectedUs, setSelectedUs] = useState<USelection[]>([]);
  const [activeUId, setActiveUId] = useState<string | null>(null);
  const [groupSelections, setGroupSelections] = useState<Record<string, number[]>>({});
  const [betAmount, setBetAmount] = useState(5000);

  const numbers = Array.from({ length: 49 }, (_, i) => i + 1);

  const currentSum = selectedUs.reduce((acc, sel) => acc + sel.u, 0);

  const handleClickU = (u: number) => {
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
      const selNumbers = groupSelections[sel.id] ?? [];
      if (selNumbers.length !== sel.u) {
        toast.error(`U${sel.u} requires ${sel.u} numbers`);
        return;
      }
    }
    if (betAmount <= 0) {
      toast.error("Enter a valid bet amount");
      return;
    }

    const groups = selectedUs
      .map((sel) => `U${sel.u}:[${(groupSelections[sel.id] ?? []).sort((a, b) => a - b).join(",")}]`)
      .join(" ");

    toast.success(`Bet placed! ${groups} | Bet: $${betAmount}`);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6 p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-4 justify-between flex-wrap">
          <div className="text-sm text-muted-foreground">Select groups (sum ≤ 7):</div>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7].map((u) => (
              <button
                key={u}
                onClick={() => handleClickU(u)}
                className="px-3 py-1 rounded-lg font-medium cursor-pointer transition-all bg-muted text-muted-foreground hover:text-foreground"
              >
                U{u}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 justify-between flex-wrap">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">Selected:</div>
            <div className="flex gap-2">
              {selectedUs.length === 0 ? (
                <span className="px-3 py-1 rounded-lg bg-muted border border-border/50 text-muted-foreground">None</span>
              ) : (
                selectedUs.map((sel) => (
                  <div
                    key={sel.id}
                    className="flex items-center gap-2"
                  >
                    <button
                      onClick={() => setActiveUId(sel.id)}
                      className={clsx(
                        "px-3 py-1 rounded-lg font-medium cursor-pointer",
                        activeUId === sel.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      U{sel.u} ({(groupSelections[sel.id] ?? []).length})
                    </button>
                    <span
                      onClick={() => removeU(sel.id)}
                      className="ml-1 cursor-pointer hover:opacity-70 font-medium"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          removeU(sel.id);
                        }
                      }}
                    >
                      ×
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearAll}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          </div>
        </div>
      </div>

      <div className="text-sm mb-4">Active Group: {activeUId ? `U${selectedUs.find((sel) => sel.id === activeUId)?.u}` : "—"}</div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side - Numbers */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-7 sm:grid-cols-10 gap-2">
            {numbers.map((num) => {
              const inActiveGroup = activeUId !== null && (groupSelections[activeUId] ?? []).includes(num);
              const inOtherGroup = Object.entries(groupSelections).some(([id, arr]) => id !== activeUId && arr.includes(num));
              return (
                <button
                  key={num}
                  onClick={() => toggleNumberForActive(num)}
                  className={clsx(
                    "aspect-square rounded-xl font-bold text-lg transition-all duration-300",
                    inActiveGroup
                      ? "cursor-pointer bg-primary text-primary-foreground shadow-[0_0_20px_hsl(43_96%_56%/0.3)] scale-105"
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

        {/* Right side - Selected numbers, bet amount, and stake button */}
        <div className="flex flex-col gap-4">
          {/* Selected numbers and all numbers */}
          <div className="p-4 rounded-xl bg-card border border-border flex flex-col h-full">
            <div className="text-sm font-semibold mb-3 text-muted-foreground">Selected Numbers</div>
            <div
              className="space-y-3 overflow-y-auto flex-1"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#20283c transparent",
                msOverflowStyle: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {selectedUs.length === 0 ? (
                <div className="text-xs text-muted-foreground">No selections yet</div>
              ) : (
                selectedUs.map((sel) => (
                  <div key={sel.id} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">U{sel.u}</div>
                      <Button variant="ghost" size="sm" onClick={() => clearGroup(sel.id)} className="h-6 w-6 p-0">
                        ×
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
                ))
              )}
            </div>
          </div>

          {/* Bet amount */}
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-sm font-semibold mb-3 text-muted-foreground">Bet Amount</div>
            <div className="flex flex-col gap-2">
              <Input
                type="number"
                min={1}
                step={1}
                value={betAmount.toString()}
                onChange={(e) => setBetAmount(Number(e.target.value || 0))}
                className="w-full"
              />
              <div className="grid grid-cols-2 gap-1">
                {[1000, 2000, 5000, 10000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setBetAmount(amount)}
                    className={clsx(
                      "px-2 py-1 rounded text-xs font-medium cursor-pointer transition-all",
                      betAmount === amount
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {amount / 1000}k
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stake button */}
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

