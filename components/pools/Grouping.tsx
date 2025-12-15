"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import clsx from "clsx";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  matches: string[];
}

interface USelection {
  id: string;
  u: number;
}

const Grouping = ({ matches }: Props) => {
  const [selectedUs, setSelectedUs] = useState<USelection[]>([]);
  const [activeUId, setActiveUId] = useState<string | null>(null);
  const [groupSelections, setGroupSelections] = useState<Record<string, string[]>>({});
  const [betAmount, setBetAmount] = useState(5000);

  const currentSum = selectedUs.reduce((acc, sel) => acc + sel.u, 0);

  const toggleU = (u: number) => {
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
      .map((sel) => `U${sel.u}:[${(groupSelections[sel.id] ?? []).length} matches]`)
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
                  selectedUs.some((sel) => sel.u === u) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
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

      <div className="text-sm mb-2">Active Group: {activeUId ? `U${selectedUs.find((sel) => sel.id === activeUId)?.u}` : "—"}</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
        {matches.map((match, index) => {
          const inActiveGroup = activeUId !== null && (groupSelections[activeUId] ?? []).includes(match);
          const inOtherGroup = Object.entries(groupSelections).some(([id, arr]) => id !== activeUId && arr.includes(match));
          return (
            <button
              key={index}
              onClick={() => toggleMatchForActive(match)}
              className={clsx(
                "p-3 rounded-xl font-medium text-sm transition-all duration-300 text-left",
                inActiveGroup
                  ? "cursor-pointer bg-primary text-primary-foreground shadow-[0_0_20px_hsl(43_96%_56%/0.3)] scale-[1.02]"
                  : inOtherGroup
                    ? "cursor-not-allowed bg-secondary text-secondary-foreground"
                    : "cursor-pointer bg-muted border border-border hover:border-primary/50 hover:bg-muted/80 text-foreground"
              )}
            >
              {index + 1}. {match}
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
              disabled={selectedUs.length < 2 || currentSum > 7 || betAmount <= 0 || selectedUs.some((sel) => (groupSelections[sel.id] ?? []).length < sel.u)}
            >
              Stake
            </Button>
          </div>
        </div>
      </div>

      {/* Show per-group selections */}
      <div className="mt-4">
        {selectedUs.map((sel) => (
          <div key={sel.id} className="mb-4 p-4 rounded-lg bg-muted/10 border border-border">
            <div className="flex items-center justify-between">
              <div className="font-semibold">U{sel.u} — {((groupSelections[sel.id] ?? []).length)}</div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => clearGroup(sel.id)}>Clear</Button>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap mt-3">
              {(groupSelections[sel.id] ?? []).map((m) => (
                <div key={m} className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs">{m}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Grouping;

