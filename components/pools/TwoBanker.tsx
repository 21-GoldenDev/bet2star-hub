"use client";

import { useState } from "react";
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
  matches: string[];
  activeTab: "result" | "fixtures";
  gameMode: GameModeType;
  prizes?: Prize[];
  setGameMode: (mode: GameModeType) => void;
}

const TwoBanker = ({ matches, gameMode, prizes, setGameMode }: Props) => {
  const [totalUnder, setTotalUnder] = useState<number>(0);
  const [groupAU, setGroupAU] = useState<number>(0);
  const [groupAMatches, setGroupAMatches] = useState<string[]>([]);
  const [betAmount, setBetAmount] = useState(5000);
  const [odd, setOdd] = useState<string>("");
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  const prize = prizes?.find((p) => p.id === odd);
  const groupBU = totalUnder - groupAU;
  const groupBMatches = matches.filter((m) => !groupAMatches.includes(m));

  const toggleMatchForGroupA = (match: string) => {
    if (groupAMatches.includes(match)) {
      setGroupAMatches(groupAMatches.filter((n) => n !== match));
      return;
    }
    if (groupAMatches.length >= 2) {
      toast.error(`Group A requires exactly 2 matches`);
      return;
    }
    setGroupAMatches([...groupAMatches, match]);
  };

  const clearGroupA = () => {
    setGroupAMatches([]);
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
    if (groupAMatches.length < 2) {
      toast.error(`Select 2 matches for Group A`);
      return;
    }
    if (betAmount <= 0) {
      toast.error("Enter a valid bet amount");
      return;
    }

    setIsPlacingBet(true);
    try {
      const response = await fetch("/api/bets/pools/twobanker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalUnder,
          groupAU,
          groupAMatches,
          betAmount,
          gameMode,
          prize: odd,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to place bet");
        return;
      }

      toast.success(data.message);
      // Reset form
      setTotalUnder(0);
      setGroupAU(0);
      setGroupAMatches([]);
      setBetAmount(5000);
      setOdd("");
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
                {[3, 4, 5, 6, 7].map((u) => (
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
          {!!prize && (
            <div className="mt-4">
              <PrizeTable prize={prize} />
            </div>
          )}
        </div>
        <div className="lg:col-span-6">
          <div className="grid grid-cols-7 lg:grid-cols-10 gap-2 bg-card border border-border rounded-xl p-4">
            {matches.map((match) => {
              const inGroupA = groupAMatches.includes(match);
              return (
                <button
                  key={match}
                  onClick={() => toggleMatchForGroupA(match)}
                  className={clsx(
                    "aspect-square rounded-xl font-bold text-lg transition-all duration-300",
                    inGroupA
                      ? "cursor-pointer bg-primary text-primary-foreground shadow-[0_0_20px_hsl(43_96%_56%/0.3)]"
                      : "cursor-pointer bg-muted border border-border hover:border-primary/50 hover:bg-muted/80 text-foreground"
                  )}
                >
                  {match}
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
                  "p-3 rounded-lg cursor-pointer transition-all",
                  "bg-primary/10 border border-primary"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">A</span>
                    <div onClick={(e) => e.stopPropagation()}>
                      <select
                        value={groupAU}
                        onChange={(e) => {
                          const newU = Number(e.target.value);
                          setGroupAU(newU);
                        }}
                        className="px-2 py-0.5 rounded text-xs bg-muted border border-primary text-foreground cursor-pointer"
                      >
                        <option value="0">Select</option>
                        {[1, 2].map((val) => (
                          <option key={val} value={val} disabled={val >= totalUnder}>
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
                      clearGroupA();
                    }}
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <span className="text-sm font-semibold">✕</span>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {groupAMatches.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No numbers selected</div>
                  ) : (
                    groupAMatches.sort((a, b) => compareMatches(a, b)).map((n) => (
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
                  {groupBMatches.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Auto-filled</div>
                  ) : (
                    groupBMatches.sort((a, b) => compareMatches(a, b)).map((n) => (
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

          {totalUnder && groupAU > 0 && groupAMatches.length === 2 && (
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="text-sm font-semibold mb-3 text-muted-foreground">APL</div>
              <div className="flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">
                  {calcAplGrouping(betAmount, {
                    [`${groupAU}-groupA`]: groupAMatches,
                    [`${groupBU}-groupB`]: groupBMatches
                  }).toFixed(2)}
                </span>
              </div>
            </div>
          )}

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
            disabled={!totalUnder || groupAU === 0 || groupAMatches.length !== 2 || isPlacingBet || betAmount <= 0}
            className="w-full py-3"
          >
            {isPlacingBet ? "Placing..." : "Stake"}
          </Button>

          {(!totalUnder || groupAU === 0 || groupAMatches.length !== 2 || betAmount <= 0) && (
            <div className="text-xs text-red-400 text-left space-y-1 ml-2">
              {!totalUnder && <div>• Select a total U value</div>}
              {totalUnder && groupAU === 0 && <div>• Select U value for Group A</div>}
              {totalUnder && groupAU > 0 && groupAMatches.length < 2 && <div>• Select {2 - groupAMatches.length} more matches for Group A</div>}
              {betAmount <= 0 && <div>• Enter a valid bet amount</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoBanker;

