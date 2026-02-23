"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PrizeInfo } from "@/lib/types/gameMode";
import { SportsMatch } from "@/lib/types/sports";
import { MaxStake } from "@/lib/types/maxStake";
import GameInfoCard from "@/components/admin/GameInfoCard";
import GameStatsCards from "@/components/admin/GameStatsCards";
import WeekResultSection from "@/components/admin/WeekResultSection";
import PrizesSection from "@/components/admin/PrizesSection";
import SportsMatchesSection from "@/components/admin/SportsMatchesSection";
import LottoNumbersSection from "@/components/admin/LottoNumbersSection";
import MaxStakeSection from "@/components/admin/MaxStakeSection";
import TerminalCommissionsSection from "@/components/admin/TerminalCommissionsSection";
import SportsDrawOddsSection from "@/components/admin/SportsDrawOddsSection";

interface GamePrizeWithInfo {
  id: string;
  name: string;
  status: "active" | "inactive";
}

interface GameInfo {
  id: string;
  week: number;
  type: string;
  start_time: string;
  end_time: string;
  prize_ids?: GamePrizeWithInfo[];
  results?: string[] | number[] | null;
}

const extractSportsDrawOddsMap = (prizeIds: any): Record<number, number> => {
  if (!prizeIds || typeof prizeIds !== "object" || Array.isArray(prizeIds)) return {};
  const entries = Array.isArray(prizeIds.draw_odds) ? prizeIds.draw_odds : [];
  return entries.reduce((acc: Record<number, number>, item: any) => {
    const matchNumber = Number(item?.match_number);
    const odd = Number(item?.odd);
    if (Number.isFinite(matchNumber) && Number.isFinite(odd) && matchNumber > 0 && odd >= 0) {
      acc[matchNumber] = odd;
    }
    return acc;
  }, {});
};

const buildSportsDrawPrizeConfig = (currentPrizeIds: any, drawOddsMap: Record<number, number>) => {
  const base = currentPrizeIds && typeof currentPrizeIds === "object" && !Array.isArray(currentPrizeIds)
    ? { ...currentPrizeIds }
    : {};

  base.draw_odds = Object.entries(drawOddsMap)
    .map(([matchNumber, odd]) => ({
      match_number: Number(matchNumber),
      odd: Number(odd),
    }))
    .filter((entry) => Number.isFinite(entry.match_number) && entry.match_number > 0 && Number.isFinite(entry.odd) && entry.odd >= 0)
    .sort((a, b) => a.match_number - b.match_number);

  return base;
};

export default function GameSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.id as string;

  const [game, setGame] = useState<GameInfo | null>(null);
  const [allPrizes, setAllPrizes] = useState<PrizeInfo[]>([]);
  const [gamePrizes, setGamePrizes] = useState<GamePrizeWithInfo[]>([]);
  const [maxStakes, setMaxStakes] = useState<MaxStake[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [sports, setSports] = useState<SportsMatch[]>([]);
  const [stats, setStats] = useState<{ totalBetAmount: number; totalReward: number }>({
    totalBetAmount: 0,
    totalReward: 0,
  });
  const [weekResult, setWeekResult] = useState<Array<number | string>>([]);
  const [terminalCommissions, setTerminalCommissions] = useState<Array<{ terminal: string; commission: number }>>([]);
  const [sportsDrawOdds, setSportsDrawOdds] = useState<Record<number, number>>({});
  const [savingSportsDrawOdds, setSavingSportsDrawOdds] = useState(false);

  useEffect(() => {
    fetchData();
  }, [gameId]);

  useEffect(() => {
    if (game && game.type !== "sports" && game.type !== "sports_draw") {
      const gamePrizeIds = Array.isArray(game.prize_ids)
        ? (game.prize_ids as GamePrizeWithInfo[])
        : [];
      const prizes = gamePrizeIds.map((gp) => {
        const prizeInfo = allPrizes.find((p) => p.id === gp.id);
        return {
          id: gp.id,
          name: prizeInfo ? prizeInfo.name : "Unknown Prize",
          status: gp.status,
        };
      });
      setGamePrizes(prizes);
    }
  }, [game, allPrizes]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const gameRes = await fetch(`/api/admin/games/${gameId}`);
      if (!gameRes.ok) throw new Error("Failed to fetch game");
      const gameData = await gameRes.json();
      setGame(gameData.game);
      if (Array.isArray(gameData.game?.results)) {
        setWeekResult(gameData.game.results as Array<number | string>);
      } else {
        setWeekResult([]);
      }

      const gameType = gameData.game?.type;
      if (gameType) {
        const statsRes = await fetch(`/api/admin/games/${gameId}/${gameType}/stats`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        // Fetch max stakes
        const maxStakesRes = await fetch(`/api/admin/games/${gameId}/max-stakes`);
        if (maxStakesRes.ok) {
          const maxStakesData = await maxStakesRes.json();
          setMaxStakes(maxStakesData.maxStakes || []);
        }
      }

      if (gameType === "sports" || gameType === "sports_draw") {
        const sportsRes = await fetch(`/api/admin/games/${gameId}/sports`);
        if (!sportsRes.ok) throw new Error("Failed to fetch sports matches");
        const sportsData = await sportsRes.json();
        const matches = sportsData.matches || [];
        setSports(matches);

        if (gameType === "sports_draw") {
          const configuredOdds = extractSportsDrawOddsMap(gameData.game?.prize_ids);
          const mergedOdds: Record<number, number> = {};
          for (const match of matches) {
            const matchNumber = Number(match.number);
            if (!Number.isFinite(matchNumber)) continue;
            mergedOdds[matchNumber] = Number.isFinite(configuredOdds[matchNumber])
              ? configuredOdds[matchNumber]
              : Number(match.prizes?.[1] ?? 0);
          }
          setSportsDrawOdds(mergedOdds);
        }

        const commissionsRes = await fetch(`/api/admin/games/${gameId}/commissions`);
        if (commissionsRes.ok) {
          const commissionsData = await commissionsRes.json();
          setTerminalCommissions(commissionsData.commissions || []);
        }
      } else {
        const prizesRes = await fetch(`/api/admin/prize`);

        if (!prizesRes.ok) throw new Error("Failed to fetch prizes");
        const prizesData = await prizesRes.json();
        setAllPrizes(prizesData.prizes || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load game settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSportsDrawOdds = async (oddsMap: Record<number, number>) => {
    if (!game || game.type !== "sports_draw") return;

    try {
      setSavingSportsDrawOdds(true);
      const nextPrizeIds = buildSportsDrawPrizeConfig(game.prize_ids, oddsMap);
      const res = await fetch(`/api/admin/games/${gameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prize_ids: nextPrizeIds }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save Sports Draw odds");

      setGame((prev) => (prev ? { ...prev, prize_ids: nextPrizeIds } : prev));
      setSportsDrawOdds(oddsMap);
      toast({ title: "Success", description: "Sports Draw odds saved" });
    } catch (error) {
      console.error("Error saving sports draw odds:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save Sports Draw odds",
        variant: "destructive",
      });
    } finally {
      setSavingSportsDrawOdds(false);
    }
  };

  const updateWeekResult = async (result: Array<number | string>) => {
    if (!game?.type) {
      toast({ title: "Error", description: "Game type not found", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/bets/${game.type}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_id: gameId, result }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update result");

      setWeekResult(result);

      const statsRes = await fetch(`/api/admin/games/${gameId}/${game.type}/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      toast({ title: "Success", description: "Week result updated and awards recomputed" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to update result", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Game Settings</h1>
          {game && (
            <p className="text-muted-foreground mt-2">
              Week {game.week} • {game.type.toUpperCase()} •{" "}
              {new Date(game.start_time).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {game && <GameInfoCard game={game} />}
      {game && <GameStatsCards stats={stats} />}
      {game && (
        <MaxStakeSection
          gameId={gameId}
          gameType={game.type as "lotto" | "pools" | "sports" | "sports_draw"}
          maxStakes={maxStakes}
          loading={loading}
          onRefresh={fetchData}
        />
      )}
      {game && (game.type === "lotto" || game.type === "pools") && (
        <WeekResultSection
          gameType={game.type}
          weekResult={weekResult}
          submitting={submitting}
          onUpdateResult={updateWeekResult}
        />
      )}
      {game?.type === "lotto" && (
        <LottoNumbersSection gameId={gameId} loading={loading} />
      )}
      {(game?.type === "sports" || game?.type === "sports_draw") && (
        <TerminalCommissionsSection
          gameId={gameId}
          initialCommissions={terminalCommissions}
          loading={loading}
          onRefresh={fetchData}
        />
      )}
      {game?.type === "sports_draw" && (
        <SportsDrawOddsSection
          sports={sports}
          oddsMap={sportsDrawOdds}
          loading={loading}
          submitting={savingSportsDrawOdds}
          onSave={saveSportsDrawOdds}
        />
      )}
      {game?.type === "sports" && (
        <SportsMatchesSection
          gameId={gameId}
          sports={sports}
          loading={loading}
          onRefresh={fetchData}
        />
      )}
      {!(game?.type === "sports" || game?.type === "sports_draw") && (
        <PrizesSection
          gameId={gameId}
          gamePrizes={gamePrizes}
          allPrizes={allPrizes}
          loading={loading}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
