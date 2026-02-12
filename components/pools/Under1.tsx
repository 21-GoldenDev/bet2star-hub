"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import clsx from "clsx"
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { gameModes, GameModeType } from "@/lib/types/gameMode";
import { Prize } from "@/lib/types/prize";
import PrizeTable from "../PrizeTable";

interface Props {
  matches: string[];
  activeTab: "result" | "fixtures";
  gameMode: GameModeType;
  gameId: string;
  prizes?: Prize[];
  setGameMode: (mode: GameModeType) => void;
  maxStakes?: { "1"?: number; "2"?: number; "3"?: number };
}

const Under1 = ({ gameMode, gameId, prizes, setGameMode, matches, maxStakes }: Props) => {
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [betAmount, setBetAmount] = useState(5000);
  const [odd, setOdd] = useState<string>("");
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  const prize = prizes?.find((p) => p.id === odd);

  const currentMaxStake = maxStakes?.["1"];

  useEffect(() => {
    if (!odd && prizes && prizes.length > 0) {
      setOdd(prizes[0].id);
    }
  }, [prizes]);

  const toggleMatch = (match: string) => {
    setSelectedMatches([match]);
  };

  const placeBet = async () => {
    if (selectedMatches.length !== 1) {
      toast.error("Select only 1 match");
      return;
    }
    if (betAmount <= 0) {
      toast.error("Enter a valid bet amount");
      return;
    }
    if (currentMaxStake && betAmount > currentMaxStake) {
      toast.error(`Maximum stake is ₦${currentMaxStake.toLocaleString()}`);
      return;
    }

    setIsPlacingBet(true);
    try {
      const response = await fetch("/api/bets/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          betType: 'pools',
          gameId,
          betAmount,
          betData: {
            selectedMatches,
            gameMode,
            prize: odd,
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
      setSelectedMatches([]);
      setBetAmount(5000);
      if (prizes && prizes.length > 0) {
        setOdd(prizes[0].id);
      } else {
        setOdd("");
      }
    } catch (error) {
      toast.error("Error placing bet");
      console.error(error);
    } finally {
      setIsPlacingBet(false);
    }
  };

  const compareMatches = (a: string, b: string) => {
    const aNum = Number(a);
    const bNum = Number(b);
    const aIsNum = !isNaN(aNum);
    const bIsNum = !isNaN(bNum);
    if (aIsNum && bIsNum) {
      return aNum - bNum;
    } else if (aIsNum) {
      return -1;
    } else if (bIsNum) {
      return 1;
    }
    return a.localeCompare(b);
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
          {!!prize && (
            <div className="mt-4">
              <PrizeTable prize={prize} />
            </div>
          )}
        </div>

        {/* Column 2: Match Grid */}
        <div className="lg:col-span-6">
          <div className="grid grid-cols-4 gap-2 bg-card border border-border rounded-xl p-4">
            {matches.map((match) => (
              <button
                key={match}
                onClick={() => toggleMatch(match)}
                className={clsx(
                  "p-3 rounded-xl font-medium text-sm transition-all duration-300",
                  selectedMatches.includes(match)
                    ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(43_96%_56%/0.3)]"
                    : "bg-muted border border-border hover:border-primary/50 hover:bg-muted/80 text-foreground"
                )}
              >
                {match}
              </button>
            ))}
          </div>
        </div>

        {/* Column 3: Selected Matches, Bet Amount, Stake Button */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-sm font-semibold text-muted-foreground">
              <span>Selected Match: </span>
              <span className="px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium">
                {selectedMatches[0] || "None"}
              </span>
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

          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-muted-foreground">Amount</div>
              {currentMaxStake && (
                <div className="text-xs text-muted-foreground">
                  Max: ₦{currentMaxStake.toLocaleString()}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Input
                type="number"
                min={1}
                max={currentMaxStake}
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
            disabled={selectedMatches.length !== 1 || betAmount <= 0 || isPlacingBet}
            className="w-full py-3"
          >
            {isPlacingBet ? "Placing..." : "Stake"}
          </Button>

          {(selectedMatches.length !== 1 || betAmount <= 0) && (
            <div className="text-xs text-red-400 text-left list-disc ml-4">
              {selectedMatches.length !== 1 && <li>Select only 1 match</li>}
              {betAmount <= 0 && <li>Enter a valid bet amount</li>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Under1;

