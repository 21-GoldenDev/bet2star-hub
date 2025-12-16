"use client";

import { useState } from "react";
import clsx from "clsx"
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Odd_40_1A from "../odds/40_1A";
import Odd_100_1 from "../odds/100_1";

interface Props {
  matches: string[];
  activeTab: "result" | "fixtures";
  gameMode: "nap_perm" | "grouping";
  setGameMode: (mode: "nap_perm" | "grouping") => void;
}

const Direct = ({ matches, gameMode, setGameMode }: Props) => {
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [betAmount, setBetAmount] = useState(5000);
  const [matchAtLeast, setMatchAtLeast] = useState<number[]>([]);
  const [odd, setOdd] = useState<string>("");

  const toggleMatch = (match: string) => {
    if (selectedMatches.includes(match)) {
      setSelectedMatches(selectedMatches.filter((m) => m !== match));
    } else {
      setSelectedMatches([...selectedMatches, match]);
    }
  };

  const clearSelection = () => {
    setSelectedMatches([]);
  };

  const toggleU = (m: number) => {
    if (matchAtLeast.includes(m)) setMatchAtLeast(matchAtLeast.filter((x) => x !== m));
    else setMatchAtLeast([...matchAtLeast, m]);
  };

  const placeBet = () => {
    if (matchAtLeast.length === 0) {
      toast.error("Select at least one 'Match at least' option (U1..U7)");
      return;
    }
    if (selectedMatches.length === 0) {
      toast.error("Select at least one match");
      return;
    }
    if (betAmount <= 0) {
      toast.error("Enter a valid bet amount");
      return;
    }

    const maxU = Math.max(...matchAtLeast);
    if (selectedMatches.length < maxU) {
      toast.error(`To match U${maxU}, select at least ${maxU} matches`);
      return;
    }

    const matchesStr = matchAtLeast.map((m) => `U${m}`).join(", ");
    toast.success(`Bet placed! Matches: ${selectedMatches.length} selected | Match: ${matchesStr} | Bet: $${betAmount}`);
  };

  return (
    <div className="min-h-75">
      {/* 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
        {/* Column 1: Match at Least */}
        <div className="lg:col-span-3">
          <div className="p-4 rounded-xl bg-card border border-border space-y-2 mb-4">
            <RadioGroup value={gameMode} onValueChange={setGameMode}>
              {["nap_perm", "grouping"].map((mode) => (
                <label
                  key={mode}
                  className="cursor-pointer flex items-center gap-2"
                >
                  <RadioGroupItem key={mode} value={mode} />
                  <span className="text-sm font-medium">
                    {mode === "nap_perm" ? "NAP/PERM" : "Grouping"}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-sm font-semibold text-center mb-3 text-muted-foreground">Under</div>
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((u) => (
                <label
                  key={u}
                  onClick={() => toggleU(u)}
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
            <Button variant="outline" size="sm" onClick={clearSelection} className="w-full mt-4">
              <RefreshCw className="w-4 h-4 mr-1" />
              Clear
            </Button>
            {!!odd && (
              <div className="mt-4">
                {odd === "40-1 A" && <Odd_40_1A />}
                {odd === "100-1" && <Odd_100_1 />}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Matches Grid */}
        <div className="lg:col-span-6">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="grid grid-cols-7 lg:grid-cols-10 gap-2">
              {matches.map((match, index) => (
                <button
                  key={index}
                  onClick={() => toggleMatch(match)}
                  className={clsx(
                    "p-3 rounded-xl font-medium text-sm cursor-pointer transition-all duration-300 flex items-center justify-center gap-2",
                    selectedMatches.includes(match)
                      ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(43_96%_56%/0.3)]"
                      : "bg-muted border border-border hover:border-primary/50 hover:bg-muted/80 text-foreground"
                  )}
                >
                  <div>{match}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Controls and Selected Matches */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-sm font-semibold mb-3 text-muted-foreground">
              Selected Matches ({selectedMatches.length})
            </div>
            <div
              className="space-y-3 overflow-y-auto min-h-30 max-h-30"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#20283c transparent",
                msOverflowStyle: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {selectedMatches.length === 0 ? (
                <div className="text-xs text-muted-foreground">No matches selected</div>
              ) : (
                <div className="flex flex-col gap-1">
                  {matches.map((m, i) => (
                    selectedMatches.includes(m) ? (
                      <div key={`${i}-${m}`} className="px-2 py-1 rounded bg-card border border-border text-xs font-medium">
                        {m}
                      </div>
                    ) : null
                  ))}
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
              <div className="grid grid-cols-4 gap-2">
                {[1000, 2000, 5000, 10000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setBetAmount(amount)}
                    className={clsx(
                      "px-3 py-2 rounded text-sm font-medium cursor-pointer transition-all",
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

          <Button
            variant="gold"
            size="lg"
            onClick={placeBet}
            disabled={selectedMatches.length <= 0 || matchAtLeast.length === 0 || betAmount <= 0}
            className="w-full py-3"
          >
            Stake
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Direct;

