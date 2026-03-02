"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { gameModes, GameModeType } from "@/lib/types/gameMode";
import { calcAplGrouping } from "@/lib/helpers";
import PrizeTable from "../PrizeTable";
import { Prize } from "@/lib/types/prize";

interface Props {
  activeTab: "result" | "fixtures";
  gameMode: GameModeType;
  gameId: string;
  prizes?: Prize[];
  setGameMode: (mode: GameModeType) => void;
  visibleNumbers?: number[];
  maxStake?: number;
}

const TwoBanker = ({ gameMode, gameId, prizes, setGameMode, visibleNumbers = [], maxStake }: Props) => {
  const [totalUnder, setTotalUnder] = useState<number>(2);
  const [groupAU, setGroupAU] = useState<number>(0);
  const [groupANumbers, setGroupANumbers] = useState<number[]>([]);
  const [betAmount, setBetAmount] = useState(5000);
  const [odd, setOdd] = useState<string>("");
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  const numbers = visibleNumbers.length > 0 ? visibleNumbers : Array.from({ length: 99 }, (_, i) => i + 1);
  const prize = prizes?.find((p) => p.id === odd);
  const groupBU = totalUnder - groupAU;
  const groupBNumbers = numbers.filter((n) => !groupANumbers.includes(n));

  useEffect(() => {
    if (!odd && prizes && prizes.length > 0) {
      setOdd(prizes[0].id);
    }
  }, [prizes]);

  const toggleNumberForGroupA = (num: number) => {
    if (groupANumbers.includes(num)) {
      setGroupANumbers(groupANumbers.filter((n) => n !== num));
      return;
    }
    if (groupANumbers.length >= 2) {
      toast.error(`Group A requires exactly 2 numbers`);
      return;
    }
    setGroupANumbers([...groupANumbers, num]);
  };

  const clearGroupA = () => {
    setGroupANumbers([]);
  };

  const placeBet = async () => {
    if (!totalUnder) {
      toast.error("Select a total U value");
      return;
    }
    if (groupAU === 0) {
      toast.error("Select U value for Group A");
      return;
    }
    if (groupANumbers.length < 2) {
      toast.error(`Select 2 numbers for Group A`);
      return;
    }
    if (betAmount <= 0) {
      toast.error("Enter a valid bet amount");
      return;
    }
    if (maxStake && betAmount > maxStake) {
      toast.error(`Maximum stake is ₦${maxStake.toLocaleString()}`);
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
            twobanker: { totalUnder, groupAU, groupANumbers },
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
      setTotalUnder(3);
      setGroupAU(0);
      setGroupANumbers([]);
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
              <div className="px-2 py-1 rounded text-xs bg-muted border border-border text-foreground text-center font-medium">
                Under 3 (Fixed)
              </div>
            </div>
          </div>
          {!!prize && (
            <div className="mt-4">
              <PrizeTable prize={prize} />
            </div>
          )}
        </div>
        <div className="lg:col-span-6">
          <div className="grid grid-cols-4 gap-2 bg-card border border-border rounded-xl p-4">
            {numbers.map((num) => {
              const inGroupA = groupANumbers.includes(num);
              return (
                <button
                  key={num}
                  onClick={() => toggleNumberForGroupA(num)}
                  className={clsx(
                    "p-3 rounded-xl font-medium text-sm transition-all duration-300",
                    inGroupA
                      ? "cursor-pointer bg-primary text-primary-foreground shadow-[0_0_20px_hsl(43_96%_56%/0.3)]"
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
            <div className="text-sm font-semibold mb-3 text-muted-foreground">Selected Groups</div>
            <div className="space-y-3 overflow-y-auto min-h-30 flex-1 scrollbar">
              {/* Group A */}
              <div
                className={clsx(
                  "p-3 rounded-lg transition-all",
                  totalUnder && groupAU ? "bg-muted/50 border border-border/50" : "bg-muted/30 border border-border/30 opacity-50"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">A</span>
                    <div className="px-2 py-0.5 rounded text-xs bg-muted border border-border text-foreground">
                      {groupAU}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {groupANumbers.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Auto-filled</div>
                  ) : (
                    groupANumbers.sort((a, b) => a - b).map((n) => (
                      <div key={n} className="px-2 py-1 rounded bg-card border border-border text-xs font-medium">
                        {n}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Group B */}
              <div
                className={clsx(
                  "p-3 rounded-lg transition-all",
                  totalUnder && groupAU ? "bg-muted/50 border border-border/50" : "bg-muted/30 border border-border/30 opacity-50"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">B</span>
                    <div className="px-2 py-0.5 rounded text-xs bg-muted border border-border text-foreground">
                      {groupBU}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {groupBNumbers.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Auto-filled</div>
                  ) : (
                    groupBNumbers.sort((a, b) => a - b).map((n) => (
                      <div key={n} className="px-2 py-1 rounded bg-card border border-border text-xs font-medium">
                        {n}
                      </div>
                    ))
                  )}
                </div>
              </div>
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

          {totalUnder && groupAU > 0 && groupANumbers.length === 2 && (
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="text-sm font-semibold mb-3 text-muted-foreground">APL</div>
              <div className="flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">
                  {calcAplGrouping(betAmount, {
                    [`${groupAU}-groupA`]: groupANumbers,
                    [`${groupBU}-groupB`]: groupBNumbers
                  }).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-muted-foreground">Amount</div>
              {maxStake && (
                <div className="text-xs text-muted-foreground">
                  Max: ₦{maxStake.toLocaleString()}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Input
                type="number"
                min={1}
                max={maxStake}
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
            disabled={!totalUnder || groupAU === 0 || groupANumbers.length !== 2 || isPlacingBet || betAmount <= 0}
            className="w-full py-3"
          >
            {isPlacingBet ? "Placing..." : "Stake"}
          </Button>

          {(!totalUnder || groupAU === 0 || groupANumbers.length !== 2 || betAmount <= 0) && (
            <div className="text-xs text-red-400 text-left space-y-1 ml-2">
              {!totalUnder && <div>• Select a total U value</div>}
              {totalUnder && groupAU === 0 && <div>• Select U value for Group A</div>}
              {totalUnder && groupAU > 0 && groupANumbers.length < 2 && <div>• Select {2 - groupANumbers.length} more matches for Group A</div>}
              {betAmount <= 0 && <div>• Enter a valid bet amount</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoBanker;

