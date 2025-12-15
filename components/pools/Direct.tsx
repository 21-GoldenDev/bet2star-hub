"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import clsx from "clsx"
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  matches: string[];
}

const Direct = ({ matches }: Props) => {
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [betAmount, setBetAmount] = useState(5000);
  const [matchAtLeast, setMatchAtLeast] = useState<number[]>([]);

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
      <div className="flex flex-col gap-4 mb-6 p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-sm text-muted-foreground">
            Predict at least:
          </div>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7].map((u) => (
              <button
                key={u}
                onClick={() => toggleU(u)}
                className={clsx(
                  "px-3 py-1 rounded-lg font-medium cursor-pointer transition-all",
                  matchAtLeast.includes(u)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                U{u}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Selected: <span className="text-primary font-bold">{selectedMatches.length} matches</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clearSelection}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
        {matches.map((match, index) => (
          <button
            key={index}
            onClick={() => toggleMatch(match)}
            className={clsx(
              "p-3 rounded-xl font-medium text-sm cursor-pointer transition-all duration-300 text-left",
              selectedMatches.includes(match)
                ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(43_96%_56%/0.3)] scale-[1.02]"
                : "bg-muted border border-border hover:border-primary/50 hover:bg-muted/80 text-foreground"
            )}
          >
            {index + 1}. {match}
          </button>
        ))}
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
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="gold"
              size="lg"
              onClick={placeBet}
              disabled={selectedMatches.length <= 0 || matchAtLeast.length === 0 || betAmount <= 0}
            >
              Stake
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Direct;

