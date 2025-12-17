"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import clsx from "clsx"
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Odd_40_1A from "../odds/40_1A";
import Odd_100_1 from "../odds/100_1";
import { gameModes, GameModeType } from "@/types/gameMode";

interface Props {
  activeTab: "result" | "fixtures";
  gameMode: GameModeType;
  setGameMode: (mode: GameModeType) => void;
}

const Direct = ({ gameMode, setGameMode }: Props) => {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [betAmount, setBetAmount] = useState(5000);
  const [odd, setOdd] = useState<string>("");
  const [matchAtLeast, setMatchAtLeast] = useState<number[]>([]);

  const numbers = Array.from({ length: 49 }, (_, i) => i + 1);

  const toggleNumber = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== num));
    } else {
      setSelectedNumbers([...selectedNumbers, num]);
    }
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
      {/* 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
        {/* Column 1: Match at Least */}
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
              {[1, 2, 3, 4, 5, 6, 7].map((u) => (
                <label
                  key={u}
                  onClick={() => toggleMatch(u)}
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
          </div>
          {!!odd && (
            <div className="mt-4">
              {odd === "40-1 A" && <Odd_40_1A />}
              {odd === "100-1" && <Odd_100_1 />}
            </div>
          )}
        </div>

        {/* Column 2: Number Grid */}
        <div className="lg:col-span-6">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="grid grid-cols-7 lg:grid-cols-10 gap-2">
              {numbers.map((num) => (
                <button
                  key={num}
                  onClick={() => toggleNumber(num)}
                  className={clsx(
                    "aspect-square rounded-xl font-bold text-lg cursor-pointer transition-all duration-300",
                    selectedNumbers.includes(num)
                      ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(43_96%_56%/0.3)]"
                      : "bg-muted border border-border hover:border-primary/50 hover:bg-muted/80 text-foreground"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Selected Numbers, Bet Amount, Stake Button */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-sm font-semibold mb-3 text-muted-foreground">
              Selected Numbers ({selectedNumbers.length})
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
              {selectedNumbers.length === 0 ? (
                <div className="text-xs text-muted-foreground">No numbers selected</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {[...selectedNumbers].sort((a, b) => a - b).map((n) => (
                    <span key={n} className="px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium">
                      {n}
                    </span>
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

