"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import clsx from "clsx";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

const Grouping = () => {
  const [selectedUs, setSelectedUs] = useState<number[]>([]);
  const [activeU, setActiveU] = useState<number | null>(null);
  const [groupSelections, setGroupSelections] = useState<Record<number, number[]>>({});
  const [betAmount, setBetAmount] = useState(5000);

  const numbers = Array.from({ length: 49 }, (_, i) => i + 1);

  const currentSum = selectedUs.reduce((acc, v) => acc + v, 0);

  const toggleU = (u: number) => {
    if (selectedUs.includes(u)) {
      setSelectedUs(selectedUs.filter((x) => x !== u));
      const copy = { ...groupSelections };
      delete copy[u];
      setGroupSelections(copy);
      if (activeU === u) setActiveU(selectedUs.filter((x) => x !== u)[0] ?? null);
    } else {
      if (currentSum + u > 7) {
        toast.error("Total of selected U values cannot exceed 7");
        return;
      }
      setSelectedUs([...selectedUs, u]);
      setActiveU(u);
      setGroupSelections({ ...groupSelections, [u]: [] });
    }
  };

  const toggleNumberForActive = (num: number) => {
    if (!activeU) {
      toast.error("Select a U group first");
      return;
    }
    for (const u of Object.keys(groupSelections)) {
      const k = Number(u);
      if (k !== activeU && groupSelections[k]?.includes(num)) {
        toast.error("Number already selected in another group");
        return;
      }
    }
    const current = groupSelections[activeU] ?? [];
    if (current.includes(num)) {
      setGroupSelections({ ...groupSelections, [activeU]: current.filter((n) => n !== num) });
      return;
    }
    setGroupSelections({ ...groupSelections, [activeU]: [...current, num] });
  };

  const clearAll = () => {
    setSelectedUs([]);
    setActiveU(null);
    setGroupSelections({});
  };

  const clearGroup = (u: number) => {
    const copy = { ...groupSelections };
    copy[u] = [];
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
    for (const u of selectedUs) {
      const sel = groupSelections[u] ?? [];
      if (sel.length !== u) {
        toast.error(`U${u} requires ${u} numbers`);
        return;
      }
    }
    if (betAmount <= 0) {
      toast.error("Enter a valid bet amount");
      return;
    }

    const groups = selectedUs
      .map((u) => `U${u}:[${(groupSelections[u] ?? []).sort((a, b) => a - b).join(",")}]`)
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
                onClick={() => toggleU(u)}
                className={clsx(
                  "px-3 py-1 rounded-lg font-medium cursor-pointer transition-all",
                  selectedUs.includes(u) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                )}
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
                selectedUs.map((u) => (
                  <button
                    key={u}
                    onClick={() => setActiveU(u)}
                    className={clsx(
                      "px-3 py-1 rounded-lg font-medium cursor-pointer",
                      activeU === u ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    U{u} ({(groupSelections[u] ?? []).length})
                  </button>
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

      <div className="text-sm mb-2">Active Group: {activeU ? `U${activeU}` : "—"}</div>

      <div className="grid grid-cols-7 sm:grid-cols-10 gap-2 mb-6">
        {numbers.map((num) => {
          const inActiveGroup = activeU !== null && (groupSelections[activeU] ?? []).includes(num);
          const inOtherGroup = Object.entries(groupSelections).some(([u, arr]) => Number(u) !== activeU && arr.includes(num));
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

      <div className="p-6 rounded-2xl bg-card border border-border">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">Bet Amount:</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                step={1}
                value={betAmount.toString()}
                onChange={(e) => setBetAmount(Number(e.target.value || 0))}
                className="w-28"
              />
            </div>
            {[1000, 2000, 5000, 10000, 20000].map((amount) => (
              <button
                key={amount}
                onClick={() => setBetAmount(amount)}
                className={clsx(
                  "px-4 py-2 rounded-lg font-medium cursor-pointer transition-all",
                  betAmount === amount
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {amount}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="gold"
              size="lg"
              onClick={placeBet}
              disabled={selectedUs.length < 2 || currentSum > 7 || betAmount <= 0 || selectedUs.some((u) => (groupSelections[u] ?? []).length < u)}
            >
              Stake
            </Button>
          </div>
        </div>
      </div>

      {/* Show per-group selections */}
      <div className="mt-4">
        {selectedUs.map((u) => (
          <div key={u} className="mb-4 p-4 rounded-lg bg-muted/10 border border-border">
            <div className="flex items-center justify-between">
              <div className="font-semibold">U{u} — {((groupSelections[u] ?? []).length)}</div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => clearGroup(u)}>Clear</Button>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap mt-3">
              {(groupSelections[u] ?? []).sort((a, b) => a - b).map((n) => (
                <div key={n} className="px-3 py-1 rounded-lg bg-primary text-primary-foreground">{n}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Grouping;

