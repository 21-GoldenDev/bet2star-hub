"use client";

import { useEffect, useState } from "react";
import clsx from "clsx"
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { gameModes, GameModeType } from "@/lib/types/gameMode";

interface Props {
  activeTab: "result" | "fixtures";
  gameMode: GameModeType;
  gameId: string;
  setGameMode: (mode: GameModeType) => void;
  matches: string[];
}

const Turbo = ({ gameMode, gameId, setGameMode, matches = [] }: Props) => {
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [betAmount, setBetAmount] = useState(5000);
  const [prize, setPrize] = useState<number[]>([50, 150, 300]);
  const [matchAtLeast, setMatchAtLeast] = useState<number>(3);
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  const requiredSelectionCount = Math.min(3, matchAtLeast || 1);

  useEffect(() => {
    const fetchTurboPrize = async () => {
      try {
        const response = await fetch("/api/admin/prize/turbo");
        const data = await response.json();
        if (data.turboPrize?.data) {
          setPrize(Object.values(data.turboPrize.data || {}));
        }
      } catch (error) {
        console.error("Error fetching turbo prize:", error);
      }
    };

    fetchTurboPrize();
  }, []);

  const toggleMatch = (match: string) => {
    if (selectedMatches.includes(match)) {
      setSelectedMatches(selectedMatches.filter((n) => n !== match));
      return;
    }

    if (selectedMatches.length >= requiredSelectionCount) {
      toast.error(`You can only select ${requiredSelectionCount} match${requiredSelectionCount > 1 ? "es" : ""} for U${requiredSelectionCount}.`);
      return;
    }

    setSelectedMatches([...selectedMatches, match]);
  };

  const toggleUnder = (m: number) => {
    if (matchAtLeast === m) return;
    setMatchAtLeast(m);
  };

  useEffect(() => {
    if (selectedMatches.length > requiredSelectionCount) {
      setSelectedMatches((prev) => prev.slice(0, requiredSelectionCount));
    }
  }, [requiredSelectionCount, selectedMatches.length]);

  const placeBet = async () => {
    if (selectedMatches.length !== requiredSelectionCount) {
      toast.error(`Select exactly ${requiredSelectionCount} match${requiredSelectionCount > 1 ? "es" : ""} for U${requiredSelectionCount}.`);
      return;
    }
    if (betAmount <= 0) {
      toast.error("Enter a valid bet amount");
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
            matchAtLeast: [matchAtLeast],
            gameMode,
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
      setMatchAtLeast(3);
      setBetAmount(5000);
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
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-sm font-semibold text-center mb-3 text-muted-foreground">Under</div>
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((u) => (
                <label
                  key={u}
                  onClick={() => toggleUnder(u)}
                  className="cursor-pointer flex items-center gap-2"
                >
                  <div>
                    <div className="size-4 rounded-full bg-transparent border border-primary flex items-center justify-center">
                      {matchAtLeast === u && (
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
          {!!prize && (
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-1 border border-gray-600 font-bold text-center">Turbo</TableHead>
                    <TableHead className="px-1 border border-gray-600 font-bold text-center">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prize.map((value, index) => (
                    <TableRow key={index}>
                      <TableCell className="px-1 border border-gray-600 text-gray-400 text-center">Turbo{index + 1}</TableCell>
                      <TableCell className="px-1 border border-gray-600 text-gray-400 text-center">{value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Column 2: Number Grid */}
        <div className="lg:col-span-6">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex flex-wrap gap-2">
              {matches.map((match) => {
                const selectionLimitReached = selectedMatches.length >= requiredSelectionCount && !selectedMatches.includes(match);
                return (
                <button
                  key={match}
                  onClick={() => toggleMatch(match)}
                    disabled={selectionLimitReached}
                  className={clsx(
                      "aspect-square w-12 rounded-xl font-bold text-lg cursor-pointer transition-all duration-300",
                    selectedMatches.includes(match)
                      ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(43_96%_56%/0.3)]"
                        : "bg-muted border border-border hover:border-primary/50 hover:bg-muted/80 text-foreground",
                      selectionLimitReached && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {match}
                </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 3: Selected Matches, Bet Amount, Stake Button */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="text-sm font-semibold mb-3 text-muted-foreground">
              Selected matches ({selectedMatches.length})
            </div>
            <div className="space-y-3 overflow-y-auto min-h-30 max-h-30 scrollbar">
              {selectedMatches.length === 0 ? (
                <div className="text-xs text-muted-foreground">No matches selected</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {[...selectedMatches].sort((a, b) => compareMatches(a, b)).map((n) => (
                    <span key={n} className="px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium">
                      {n}
                    </span>
                  ))}
                </div>
              )}
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
            disabled={selectedMatches.length !== requiredSelectionCount || betAmount <= 0 || isPlacingBet}
            className="w-full py-3"
          >
            {isPlacingBet ? "Placing..." : "Stake"}
          </Button>

          {(selectedMatches.length !== requiredSelectionCount || betAmount <= 0) && (
            <div className="text-xs text-red-400 text-left list-disc ml-4">
              {selectedMatches.length !== requiredSelectionCount && (
                <li>Select exactly {requiredSelectionCount} number{requiredSelectionCount > 1 ? "s" : ""} for U{requiredSelectionCount}</li>
              )}
              {betAmount <= 0 && <li>Enter a valid bet amount</li>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Turbo;

