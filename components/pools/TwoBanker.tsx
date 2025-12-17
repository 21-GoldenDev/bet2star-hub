"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Odd_40_1A from "../odds/40_1A";
import Odd_100_1 from "../odds/100_1";
import { gameModes, GameModeType } from "@/types/gameMode";

interface Props {
  matches: string[];
  activeTab: "result" | "fixtures";
  gameMode: GameModeType;
  setGameMode: (mode: GameModeType) => void;
}

const TwoBanker = ({ matches, gameMode, setGameMode }: Props) => {
  const [totalUnder, setTotalUnder] = useState<number>(0);
  const [groupAU, setGroupAU] = useState<number>(0);
  const [groupAMatches, setGroupAMatches] = useState<string[]>([]);
  const [betAmount, setBetAmount] = useState(5000);
  const [odd, setOdd] = useState<string>("");

  const groupBU = totalUnder - groupAU;
  const groupBMatches = matches.filter((m) => !groupAMatches.includes(m));

  const toggleMatchForGroupA = (match: string) => {
    if (groupAMatches.includes(match)) {
      setGroupAMatches(groupAMatches.filter((n) => n !== match));
      return;
    }
    if (groupAMatches.length >= groupAU) {
      toast.error(`Group A requires exactly ${groupAU} matches`);
      return;
    }
    setGroupAMatches([...groupAMatches, match]);
  };

  const clearGroupA = () => {
    setGroupAMatches([]);
  };

  const placeBet = () => {
    if (!totalUnder) {
      toast.error("Select a total U value");
      return;
    }
    if (groupAU === 0) {
      toast.error("Select U value for Group A");
      return;
    }
    if (betAmount <= 0) {
      toast.error("Enter a valid bet amount");
      return;
    }

    toast.success(`Bet placed! Bet: $${betAmount}`);
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
                {[3, 4, 5, 6].map((u) => (
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
          {!!odd && (
            <div className="mt-4">
              {odd === "40-1 A" && <Odd_40_1A />}
              {odd === "100-1" && <Odd_100_1 />}
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
            <div
              className="space-y-3 overflow-y-auto min-h-30 flex-1"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#20283c transparent",
                msOverflowStyle: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
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
                          if (groupAMatches.length > newU) {
                            setGroupAMatches(groupAMatches.slice(0, newU));
                          }
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
                    groupAMatches.sort((a, b) => a.localeCompare(b)).map((n) => (
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
                    groupBMatches.sort((a, b) => a.localeCompare(b)).map((n) => (
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
            </div>
          </div>

          <Button
            variant="gold"
            size="lg"
            onClick={placeBet}
            disabled={!totalUnder || groupAU === 0 || groupAMatches.length !== groupAU}
            className="w-full py-3"
          >
            Stake
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TwoBanker;

