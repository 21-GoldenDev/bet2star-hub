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
import MaxPrizeSection from "@/components/admin/MaxPrizeSection";
import PoolsMatchesSection from "@/components/admin/PoolsMatchesSection";
import VoidWindowSection from "@/components/admin/VoidWindowSection";

interface GamePrizeWithInfo {
  id: string;
  name: string;
  status: "active" | "inactive";
  commission?: number;
}

interface GameInfo {
  id: string;
  week: number;
  type: string;
  start_time: string;
  end_time: string;
  prize_ids?: GamePrizeWithInfo[];
  results?: string[] | number[] | null;
  void_window_minutes?: number | null;
}

export default function GameSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.id as string;

  const [game, setGame] = useState<GameInfo | null>(null);
  const [allPrizes, setAllPrizes] = useState<PrizeInfo[]>([]);
  const [gamePrizes, setGamePrizes] = useState<GamePrizeWithInfo[]>([]);
  const [maxStakes, setMaxStakes] = useState<MaxStake[]>([]);
  const [maxPrize, setMaxPrize] = useState<Record<string, number>>({});
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

  useEffect(() => {
    fetchData();
  }, [gameId]);

  useEffect(() => {
    if (game && game.type !== "sports" && game.type !== "sports_draw") {
      const gamePrizeIds = Array.isArray(game.prize_ids)
        ? (game.prize_ids as Array<{
            id: string;
            status: "active" | "inactive";
            commission?: number;
          }>)
        : [];
      const prizes = gamePrizeIds.map((gp) => {
        const prizeInfo = allPrizes.find((p) => p.id === gp.id) as
          | (PrizeInfo & { commission?: number })
          | undefined;
        const masterCommission = Number(prizeInfo?.commission);
        return {
          id: gp.id,
          name: prizeInfo ? prizeInfo.name : "Unknown Prize",
          status: gp.status,
          commission:
            typeof gp.commission === "number"
              ? gp.commission
              : Number.isFinite(masterCommission)
                ? masterCommission
                : 100,
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

        if (gameType === "sports" || gameType === "sports_draw") {
          const maxPrizeRes = await fetch(`/api/admin/games/${gameId}/max-prize`);
          if (maxPrizeRes.ok) {
            const maxPrizeData = await maxPrizeRes.json();
            setMaxPrize(maxPrizeData.maxPrize || {});
          }
        }
      }

      if (gameType === "sports" || gameType === "sports_draw") {
        const sportsRes = await fetch(`/api/admin/games/${gameId}/sports`);
        if (!sportsRes.ok) throw new Error("Failed to fetch sports matches");
        const sportsData = await sportsRes.json();
        const matches = sportsData.matches || [];
        setSports(matches);

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
      {game && (
        <VoidWindowSection
          gameId={gameId}
          voidWindowMinutes={game.void_window_minutes ?? null}
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
      {game?.type === "pools" && (
        <PoolsMatchesSection gameId={gameId} gameWeek={game.week} />
      )}
      {game?.type === "lotto" && (
        <LottoNumbersSection gameId={gameId} loading={loading} />
      )}
      {(game?.type === "sports" || game?.type === "sports_draw") ? (
        <>
          <MaxPrizeSection
            gameId={gameId}
            gameType={game.type as "sports" | "sports_draw"}
            maxPrize={maxPrize}
            loading={loading}
            onRefresh={fetchData}
          />
          <TerminalCommissionsSection
            gameId={gameId}
            initialCommissions={terminalCommissions}
            loading={loading}
            onRefresh={fetchData}
          />
          <SportsMatchesSection
            gameId={gameId}
            sports={sports}
            maxPrize={maxPrize}
            loading={loading}
            drawMode={game.type === "sports_draw"}
            onRefresh={fetchData}
          />
        </>
      ) : (
        <PrizesSection
          gameId={gameId}
          gamePrizes={gamePrizes}
          allPrizes={allPrizes}
          loading={loading}
          onRefresh={fetchData}
          manageCommission={game?.type === "pools"}
        />
      )}
    </div>
  );
}
