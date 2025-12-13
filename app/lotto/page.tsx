"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Hash, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const NumberMatch = () => {
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [betAmount, setBetAmount] = useState(10);
  const maxSelections = 6;

  const numbers = Array.from({ length: 49 }, (_, i) => i + 1);

  const toggleNumber = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== num));
    } else if (selectedNumbers.length < maxSelections) {
      setSelectedNumbers([...selectedNumbers, num]);
    } else {
      toast.error(`Maximum ${maxSelections} numbers allowed`);
    }
  };

  const clearSelection = () => {
    setSelectedNumbers([]);
  };

  const quickPick = () => {
    const shuffled = [...numbers].sort(() => Math.random() - 0.5);
    setSelectedNumbers(shuffled.slice(0, maxSelections));
  };

  const placeBet = () => {
    if (selectedNumbers.length < maxSelections) {
      toast.error(`Please select ${maxSelections} numbers`);
      return;
    }
    toast.success(`Bet placed! Numbers: ${selectedNumbers.sort((a, b) => a - b).join(", ")}`);
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Hash className="w-4 h-4" />
            Number Matching
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Pick Your Lucky Numbers
          </h1>
          <p className="text-muted-foreground">
            Select {maxSelections} numbers from 1-49. Match them to win!
          </p>
        </div>

        {/* Selection Info */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 rounded-xl bg-card border border-border animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Selected: <span className="text-primary font-bold">{selectedNumbers.length}/{maxSelections}</span>
            </div>
            <div className="flex gap-2">
              {selectedNumbers.sort((a, b) => a - b).map((num) => (
                <span
                  key={num}
                  className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm"
                >
                  {num}
                </span>
              ))}
              {Array.from({ length: maxSelections - selectedNumbers.length }).map((_, i) => (
                <span
                  key={`empty-${i}`}
                  className="w-10 h-10 rounded-lg bg-muted border border-border/50 flex items-center justify-center text-muted-foreground text-sm"
                >
                  ?
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearSelection}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Clear
            </Button>
            <Button variant="cyan" size="sm" onClick={quickPick}>
              <Sparkles className="w-4 h-4 mr-1" />
              Quick Pick
            </Button>
          </div>
        </div>

        {/* Number Grid */}
        <div className="grid grid-cols-7 sm:grid-cols-10 gap-2 mb-8 animate-slide-up" style={{ animationDelay: "200ms" }}>
          {numbers.map((num) => (
            <button
              key={num}
              onClick={() => toggleNumber(num)}
              className={`aspect-square rounded-xl font-bold text-lg transition-all duration-300 ${
                selectedNumbers.includes(num)
                  ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(43_96%_56%/0.3)] scale-105"
                  : "bg-muted border border-border hover:border-primary/50 hover:bg-muted/80 text-foreground"
              }`}
            >
              {num}
            </button>
          ))}
        </div>

        {/* Bet Controls */}
        <div className="p-6 rounded-2xl bg-card border border-border animate-slide-up" style={{ animationDelay: "300ms" }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">Bet Amount:</span>
              <div className="flex items-center gap-2">
                {[5, 10, 25, 50, 100].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setBetAmount(amount)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      betAmount === amount
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Potential Win</div>
                <div className="text-2xl font-bold text-primary">${(betAmount * 100).toLocaleString()}</div>
              </div>
              <Button variant="gold" size="lg" onClick={placeBet} disabled={selectedNumbers.length < maxSelections}>
                Place Bet
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NumberMatch;
