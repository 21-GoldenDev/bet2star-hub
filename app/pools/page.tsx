"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Type, Sparkles, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";

const words = [
  "FORTUNE", "JACKPOT", "WINNER", "LUCKY", "DIAMOND", "GOLD",
  "STAR", "CROWN", "ROYAL", "MEGA", "SUPER", "BONUS",
  "CASH", "PRIZE", "VAULT", "GEMS", "COINS", "WEALTH"
];

const WordMatch = () => {
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [betAmount, setBetAmount] = useState(10);
  const maxSelections = 3;

  const toggleWord = (word: string) => {
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter((w) => w !== word));
    } else if (selectedWords.length < maxSelections) {
      setSelectedWords([...selectedWords, word]);
    } else {
      toast.error(`Maximum ${maxSelections} words allowed`);
    }
  };

  const clearSelection = () => {
    setSelectedWords([]);
  };

  const quickPick = () => {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setSelectedWords(shuffled.slice(0, maxSelections));
  };

  const placeBet = () => {
    if (selectedWords.length < maxSelections) {
      toast.error(`Please select ${maxSelections} words`);
      return;
    }
    toast.success(`Bet placed! Words: ${selectedWords.join(", ")}`);
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-sm font-medium mb-4">
            <Type className="w-4 h-4" />
            Pools
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Match the Winning Words
          </h1>
          <p className="text-muted-foreground">
            Select {maxSelections} words and match them to multiply your winnings!
          </p>
        </div>

        {/* Selection Display */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-4 rounded-xl bg-card border border-border animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-sm text-muted-foreground">
              Selected: <span className="text-secondary font-bold">{selectedWords.length}/{maxSelections}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedWords.map((word) => (
                <span
                  key={word}
                  className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-bold text-sm"
                >
                  {word}
                </span>
              ))}
              {Array.from({ length: maxSelections - selectedWords.length }).map((_, i) => (
                <span
                  key={`empty-${i}`}
                  className="px-4 py-2 rounded-lg bg-muted border border-border/50 text-muted-foreground text-sm"
                >
                  ???
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

        {/* Word Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-8 animate-slide-up" style={{ animationDelay: "200ms" }}>
          {words.map((word) => {
            const isSelected = selectedWords.includes(word);
            return (
              <button
                key={word}
                onClick={() => toggleWord(word)}
                className={`relative p-4 rounded-xl font-bold text-sm transition-all duration-300 ${
                  isSelected
                    ? "bg-secondary text-secondary-foreground shadow-[0_0_25px_hsl(187_92%_50%/0.3)] scale-105"
                    : "bg-muted border border-border hover:border-secondary/50 hover:bg-muted/80 text-foreground"
                }`}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-success flex items-center justify-center">
                    <Check className="w-4 h-4 text-success-foreground" />
                  </div>
                )}
                {word}
              </button>
            );
          })}
        </div>

        {/* Payout Table */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8 animate-slide-up" style={{ animationDelay: "250ms" }}>
          <div className="p-4 rounded-xl bg-card/50 border border-border text-center">
            <div className="text-muted-foreground text-sm mb-1">1 Match</div>
            <div className="text-xl font-bold text-foreground">2x</div>
          </div>
          <div className="p-4 rounded-xl bg-card/50 border border-border text-center">
            <div className="text-muted-foreground text-sm mb-1">2 Matches</div>
            <div className="text-xl font-bold text-secondary">10x</div>
          </div>
          <div className="p-4 rounded-xl bg-card/50 border border-border text-center">
            <div className="text-muted-foreground text-sm mb-1">3 Matches</div>
            <div className="text-xl font-bold text-primary">100x</div>
          </div>
        </div>

        {/* Bet Controls */}
        <div className="p-6 rounded-2xl bg-card border border-border animate-slide-up" style={{ animationDelay: "300ms" }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-muted-foreground">Bet Amount:</span>
              <div className="flex flex-wrap items-center gap-2">
                {[5, 10, 25, 50, 100].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setBetAmount(amount)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      betAmount === amount
                        ? "bg-secondary text-secondary-foreground"
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
                <div className="text-sm text-muted-foreground">Max Potential Win</div>
                <div className="text-2xl font-bold text-secondary">${(betAmount * 100).toLocaleString()}</div>
              </div>
              <Button variant="cyan" size="lg" onClick={placeBet} disabled={selectedWords.length < maxSelections}>
                Place Bet
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordMatch;
