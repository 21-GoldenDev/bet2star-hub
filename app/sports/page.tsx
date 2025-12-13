"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, Zap } from "lucide-react";
import { toast } from "sonner";

interface Match {
  id: number;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  time: string;
  isLive?: boolean;
}

const matches: Match[] = [
  { id: 1, league: "Premier League", homeTeam: "Manchester City", awayTeam: "Liverpool", homeOdds: 2.10, drawOdds: 3.50, awayOdds: 3.20, time: "15:00", isLive: true },
  { id: 2, league: "La Liga", homeTeam: "Real Madrid", awayTeam: "Barcelona", homeOdds: 2.40, drawOdds: 3.30, awayOdds: 2.80, time: "20:00" },
  { id: 3, league: "Serie A", homeTeam: "Juventus", awayTeam: "AC Milan", homeOdds: 2.00, drawOdds: 3.40, awayOdds: 3.60, time: "17:30" },
  { id: 4, league: "Bundesliga", homeTeam: "Bayern Munich", awayTeam: "Dortmund", homeOdds: 1.75, drawOdds: 3.80, awayOdds: 4.20, time: "18:30" },
  { id: 5, league: "Ligue 1", homeTeam: "PSG", awayTeam: "Marseille", homeOdds: 1.50, drawOdds: 4.20, awayOdds: 5.50, time: "21:00" },
];

type BetSelection = { matchId: number; selection: "home" | "draw" | "away"; odds: number };

const Football = () => {
  const [selectedBets, setSelectedBets] = useState<BetSelection[]>([]);
  const [betAmount, setBetAmount] = useState(10);

  const toggleBet = (matchId: number, selection: "home" | "draw" | "away", odds: number) => {
    const existing = selectedBets.find((b) => b.matchId === matchId);
    if (existing && existing.selection === selection) {
      setSelectedBets(selectedBets.filter((b) => b.matchId !== matchId));
    } else {
      setSelectedBets([
        ...selectedBets.filter((b) => b.matchId !== matchId),
        { matchId, selection, odds },
      ]);
    }
  };

  const isSelected = (matchId: number, selection: string) => {
    return selectedBets.some((b) => b.matchId === matchId && b.selection === selection);
  };

  const totalOdds = selectedBets.reduce((acc, bet) => acc * bet.odds, 1);
  const potentialWin = betAmount * totalOdds;

  const placeBet = () => {
    if (selectedBets.length === 0) {
      toast.error("Please select at least one bet");
      return;
    }
    toast.success(`Bet placed! ${selectedBets.length} selection(s) at ${totalOdds.toFixed(2)} odds`);
  };

  const clearBets = () => {
    setSelectedBets([]);
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-4">
            <Trophy className="w-4 h-4" />
            Sports Betting
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Today's Matches
          </h1>
          <p className="text-muted-foreground">
            Select your predictions and place your bets on top matches.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Matches List */}
          <div className="lg:col-span-2 space-y-4">
            {matches.map((match, index) => (
              <div
                key={match.id}
                className="p-4 rounded-xl bg-card border border-border animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Match Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {match.league}
                  </span>
                  <div className="flex items-center gap-2">
                    {match.isLive ? (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-medium">
                        <Zap className="w-3 h-3" />
                        LIVE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Clock className="w-3 h-3" />
                        {match.time}
                      </span>
                    )}
                  </div>
                </div>

                {/* Teams and Odds */}
                <div className="grid grid-cols-7 gap-2 items-center">
                  <div className="col-span-2 text-right">
                    <span className="font-semibold text-foreground text-sm md:text-base">{match.homeTeam}</span>
                  </div>
                  
                  <button
                    onClick={() => toggleBet(match.id, "home", match.homeOdds)}
                    className={`py-3 rounded-lg font-bold text-sm transition-all ${
                      isSelected(match.id, "home")
                        ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(43_96%_56%/0.3)]"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    {match.homeOdds.toFixed(2)}
                  </button>
                  
                  <button
                    onClick={() => toggleBet(match.id, "draw", match.drawOdds)}
                    className={`py-3 rounded-lg font-bold text-sm transition-all ${
                      isSelected(match.id, "draw")
                        ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(43_96%_56%/0.3)]"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    {match.drawOdds.toFixed(2)}
                  </button>
                  
                  <button
                    onClick={() => toggleBet(match.id, "away", match.awayOdds)}
                    className={`py-3 rounded-lg font-bold text-sm transition-all ${
                      isSelected(match.id, "away")
                        ? "bg-primary text-primary-foreground shadow-[0_0_20px_hsl(43_96%_56%/0.3)]"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    {match.awayOdds.toFixed(2)}
                  </button>
                  
                  <div className="col-span-2">
                    <span className="font-semibold text-foreground text-sm md:text-base">{match.awayTeam}</span>
                  </div>
                </div>

                {/* Odds Labels */}
                <div className="grid grid-cols-7 gap-2 mt-2">
                  <div className="col-span-2" />
                  <span className="text-xs text-muted-foreground text-center">1</span>
                  <span className="text-xs text-muted-foreground text-center">X</span>
                  <span className="text-xs text-muted-foreground text-center">2</span>
                  <div className="col-span-2" />
                </div>
              </div>
            ))}
          </div>

          {/* Bet Slip */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 p-5 rounded-2xl bg-card border border-border animate-slide-up" style={{ animationDelay: "200ms" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground">Bet Slip</h3>
                {selectedBets.length > 0 && (
                  <button onClick={clearBets} className="text-xs text-muted-foreground hover:text-foreground">
                    Clear All
                  </button>
                )}
              </div>

              {selectedBets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Select matches to add to your bet slip
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {selectedBets.map((bet) => {
                    const match = matches.find((m) => m.id === bet.matchId)!;
                    const selectionLabel = bet.selection === "home" ? match.homeTeam : bet.selection === "away" ? match.awayTeam : "Draw";
                    return (
                      <div key={bet.matchId} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs text-muted-foreground">{match.league}</span>
                          <button
                            onClick={() => toggleBet(bet.matchId, bet.selection, bet.odds)}
                            className="text-muted-foreground hover:text-destructive text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="text-sm font-medium text-foreground">{selectionLabel}</div>
                        <div className="text-xs text-muted-foreground">
                          {match.homeTeam} vs {match.awayTeam}
                        </div>
                        <div className="text-primary font-bold mt-1">{bet.odds.toFixed(2)}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-border pt-4 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {[5, 10, 25, 50].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setBetAmount(amount)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        betAmount === amount
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Odds</span>
                  <span className="font-bold text-foreground">{totalOdds.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Potential Win</span>
                  <span className="font-bold text-xl text-primary">${potentialWin.toFixed(2)}</span>
                </div>

                <Button
                  variant="gold"
                  className="w-full"
                  size="lg"
                  onClick={placeBet}
                  disabled={selectedBets.length === 0}
                >
                  Place Bet
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Football;
