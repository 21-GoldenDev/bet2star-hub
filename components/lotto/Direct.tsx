"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import clsx from "clsx"
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

const Direct = () => {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [betAmount, setBetAmount] = useState(5000);
  const [matchAtLeast, setMatchAtLeast] = useState<number[]>([]);

  const numbers = Array.from({ length: 49 }, (_, i) => i + 1);

  const toggleNumber = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== num));
    } else {
      setSelectedNumbers([...selectedNumbers, num]);
    }
  };

  const clearSelection = () => {
    setSelectedNumbers([]);
  };

  const toggleMatch = (m: number) => {
    if (matchAtLeast.includes(m)) setMatchAtLeast(matchAtLeast.filter((x) => x !== m));
    else setMatchAtLeast([...matchAtLeast, m]);
  };

  const placeBet = () => {
    if (matchAtLeast.length === 0) {
      toast.error("Select at least one 'Match at least' option (U1..U7)");
      return;
    }
    if (selectedNumbers.length === 0) {
      toast.error("Select at least one number");
      return;
    }
    if (betAmount <= 0) {
      toast.error("Enter a valid bet amount");
      return;
    }

    const maxU = Math.max(...matchAtLeast);
    if (selectedNumbers.length < maxU) {
      toast.error(`To match U${maxU}, select at least ${maxU} numbers`);
      return;
    }

    const numbersSorted = [...selectedNumbers].sort((a, b) => a - b);
    const matches = matchAtLeast.map((m) => `U${m}`).join(", ");
    toast.success(`Bet placed! Numbers: ${numbersSorted.join(", ")} | Match: ${matches} | Bet: $${betAmount}`);
  };

  return (
    <div className="min-h-75">
      <div className="flex flex-col gap-4 mb-6 p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-sm text-muted-foreground">
            Match at least:
          </div>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7].map((u) => (
              <button
                key={u}
                onClick={() => toggleMatch(u)}
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
              Selected: <span className="text-primary font-bold">{selectedNumbers.length} numbers</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Number grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-7 sm:grid-cols-10 gap-2">
            {numbers.map((num) => (
              <button
                key={num}
                onClick={() => toggleNumber(num)}
                className={clsx(
                  "aspect-square rounded-xl font-bold text-lg cursor-pointer transition-all duration-300",
                  selectedNumbers.includes(num)
                    ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(43_96%_56%/0.3)] scale-105"
                    : "bg-muted border border-border hover:border-primary/50 hover:bg-muted/80 text-foreground"
                )}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Selected numbers, Bet, Stake */}
        <div className="flex flex-col gap-4">
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
              {selectedNumbers.length === 0 ? (
                <div className="text-xs text-muted-foreground">No numbers selected</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {[...selectedNumbers].sort((a, b) => a - b).map((n) => (
                    <span key={n} className="px-2 py-1 rounded bg-card border border-border text-xs font-medium">
                      {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

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

          <Button
            variant="gold"
            size="lg"
            onClick={placeBet}
            disabled={selectedNumbers.length <= 0 || matchAtLeast.length === 0 || betAmount <= 0}
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

