"use client";

import { useState } from "react";
import clsx from "clsx"
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { gameModes, GameModeType } from "@/lib/types/gameMode";
import { calcAplDirect } from "@/lib/helpers";
import { Prize } from "@/lib/types/prize";
import PrizeTable from "../PrizeTable";

interface Props {
  matches: string[];
  activeTab: "result" | "fixtures";
  gameMode: GameModeType;
  gameId: string;
  prizes?: Prize[];
  setGameMode: (mode: GameModeType) => void;
}

const Direct = ({ matches, gameMode, gameId, prizes, setGameMode }: Props) => {
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [betAmount, setBetAmount] = useState(5000);
  const [matchAtLeast, setMatchAtLeast] = useState<number[]>([]);
  const [odd, setOdd] = useState<string>("");
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  const prize = prizes?.find((p) => p.id === odd);

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

  const placeBet = async () => {
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
            matchAtLeast,
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
      setMatchAtLeast([]);
      setBetAmount(5000);
      setOdd("");
    } catch (error) {
      toast.error("Error placing bet");
      console.error(error);
    } finally {
      setIsPlacingBet(false);
    }
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
            {!!prize && (
              <div className="mt-4">
                <PrizeTable prize={prize} />
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Matches Grid */}
        <div className="lg:col-span-6">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="grid grid-cols-4 gap-2">
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
            <div className="space-y-3 overflow-y-auto min-h-30 max-h-30 scrollbar">
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
            <div className="text-sm font-semibold mb-3 text-muted-foreground">APL</div>
            <div className="flex items-center justify-center">
              <span className="text-lg font-bold text-foreground">
                {calcAplDirect(betAmount, matchAtLeast, selectedMatches.length).toFixed(2)}
              </span>
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
            </div>
          </div>

          <Button
            variant="gold"
            size="lg"
            onClick={placeBet}
            disabled={selectedMatches.length <= 0 || matchAtLeast.length === 0 || betAmount <= 0 || isPlacingBet}
            className="w-full py-3"
          >
            {isPlacingBet ? "Placing..." : "Stake"}
          </Button>

          {(selectedMatches.length < Math.max(...matchAtLeast) || betAmount <= 0) && (
            <div className="text-xs text-red-400 text-left list-disc ml-4">
              {selectedMatches.length < Math.max(...matchAtLeast) && <li>Select at least {Math.max(...matchAtLeast)} matches</li>}
              {betAmount <= 0 && <li>Enter a valid bet amount</li>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Direct;

