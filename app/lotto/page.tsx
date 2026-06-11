"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabaseRealtime } from "@/hooks/use-supabase-realtime";
import clsx from "clsx";
import BettingAccessGate from "@/components/BettingAccessGate";
import Direct from "@/components/lotto/Direct";
import Grouping from "@/components/lotto/Grouping";
import OneBanker from "@/components/lotto/OneBanker";
import TwoBanker from "@/components/lotto/TwoBanker";
import { GameModeType } from "@/lib/types/gameMode";
import { Game } from "@/lib/types/game";
import Turbo from "@/components/lotto/Turbo";
import Under1 from "@/components/lotto/Under1";
import Under2 from "@/components/lotto/Under2";
import { formatLottoWeekLabel } from "@/lib/helpers";

const LottoPage = () => {
  const [activeTab, setActiveTab] = useState<"result" | "fixtures">("fixtures");
  const [gameMode, setGameMode] = useState<GameModeType>("nap_perm");
  const [activeGames, setActiveGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [visibleNumbers, setVisibleNumbers] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingNumbers, setIsLoadingNumbers] = useState(false);

  const activeGame =
    activeGames.find((game) => game.id === selectedGameId) ?? activeGames[0] ?? null;

  const fetchVisibleNumbers = useCallback(async (gameId: string) => {
    try {
      setIsLoadingNumbers(true);
      const numbersResponse = await fetch(`/api/games/${gameId}/lotto/numbers`);
      const numbersData = await numbersResponse.json();
      setVisibleNumbers((numbersData.visibleNumbers || []).sort((a: number, b: number) => a - b));
    } catch (error) {
      console.error("Error fetching visible numbers:", error);
      setVisibleNumbers([]);
    } finally {
      setIsLoadingNumbers(false);
    }
  }, []);

  const refreshLottoGames = useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) setIsLoading(true);
      const response = await fetch("/api/games/lotto/active");
      const data = await response.json();
      const games: Game[] = data.games || (data.game ? [data.game] : []);
      setActiveGames(games);

      setSelectedGameId((currentId) => {
        if (games.some((game) => game.id === currentId)) {
          return currentId;
        }
        return games[0]?.id || "";
      });
    } catch (error) {
      console.error("Error fetching active games:", error);
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshLottoGames();
  }, [refreshLottoGames]);

  useSupabaseRealtime({
    channelName: "lotto-page",
    subscriptions: [
      { table: "games", filter: "type=eq.lotto" },
      { table: "prize" },
    ],
    onEvent: () => {
      void refreshLottoGames({ silent: true });
      if (selectedGameId) {
        void fetchVisibleNumbers(selectedGameId);
      }
    },
  });

  useEffect(() => {
    if (!selectedGameId) {
      setVisibleNumbers([]);
      return;
    }

    fetchVisibleNumbers(selectedGameId);
  }, [selectedGameId, fetchVisibleNumbers]);

  return (
    <>
      <BettingAccessGate />
      <div className="min-h-screen pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-10 animate-slide-up">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Pick Your Lucky Numbers</h1>
            <p className="text-muted-foreground">Select numbers from 1-49. Match them to win!</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Loading games...</p>
              </div>
            </div>
          ) : activeGames.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <div className="max-w-md mx-auto">
                <svg
                  className="mx-auto h-16 w-16 text-muted-foreground mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <h2 className="text-2xl font-bold text-foreground mb-2">No Active Game</h2>
                <p className="text-muted-foreground mb-4">
                  There is currently no active lotto game available. Please check back later.
                </p>
                <p className="text-sm text-muted-foreground">
                  Games are typically scheduled weekly. Stay tuned for the next draw!
                </p>
              </div>
            </div>
          ) : activeGame ? (
            <>
              {activeGames.length > 1 && (
                <div className="mb-4 p-3 rounded-xl bg-card border border-border">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Active Games</p>
                  <div className="flex flex-wrap gap-2">
                    {activeGames.map((game) => (
                      <button
                        key={game.id}
                        type="button"
                        onClick={() => setSelectedGameId(game.id)}
                        className={clsx(
                          "cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                          selectedGameId === game.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-border hover:text-foreground",
                        )}
                      >
                        {formatLottoWeekLabel(game.week, game.game_name)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6 p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="bg-muted flex gap-1 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setActiveTab("result")}
                      className={clsx(
                        "cursor-pointer px-4 py-2 rounded-lg font-medium transition-all",
                        activeTab === "result"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Result
                    </button>
                    <button
                      onClick={() => setActiveTab("fixtures")}
                      className={clsx(
                        "cursor-pointer px-4 py-2 rounded-lg font-medium transition-all",
                        activeTab === "fixtures"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Fixtures
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-center">
                    {!!activeGame.start_time && (
                      <div className="text-muted-foreground">
                        <div className="font-semibold">
                          {new Date(activeGame.start_time).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </div>
                        <div>
                          {new Date(activeGame.start_time).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                          })}
                        </div>
                      </div>
                    )}
                    <div className="text-muted-foreground border-l-2 border-r-2 border-border px-2">
                      <div>{activeGame.game_name ? "Game" : "Week"}</div>
                      <div className="font-bold">
                        {formatLottoWeekLabel(activeGame.week, activeGame.game_name)}
                      </div>
                    </div>
                    {!!activeGame.end_time && (
                      <div className="text-muted-foreground">
                        <div className="font-semibold">
                          {new Date(activeGame.end_time).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </div>
                        <div>
                          {new Date(activeGame.end_time).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                {isLoadingNumbers ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                      <p className="mt-3 text-sm text-muted-foreground">Loading game...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {gameMode === "nap_perm" && (
                      <Direct
                        activeTab={activeTab}
                        gameMode={gameMode}
                        gameId={activeGame.id}
                        prizes={activeGame.prizes}
                        setGameMode={setGameMode}
                        visibleNumbers={visibleNumbers}
                        maxStake={activeGame.max_stake?.amount}
                      />
                    )}
                    {gameMode === "grouping" && (
                      <Grouping
                        activeTab={activeTab}
                        gameMode={gameMode}
                        gameId={activeGame.id}
                        prizes={activeGame.prizes}
                        setGameMode={setGameMode}
                        visibleNumbers={visibleNumbers}
                        maxStake={activeGame.max_stake?.amount}
                      />
                    )}
                    {gameMode === "one_banker" && (
                      <OneBanker
                        activeTab={activeTab}
                        gameMode={gameMode}
                        gameId={activeGame.id}
                        prizes={activeGame.prizes}
                        setGameMode={setGameMode}
                        visibleNumbers={visibleNumbers}
                        maxStake={activeGame.max_stake?.amount}
                      />
                    )}
                    {gameMode === "two_banker" && (
                      <TwoBanker
                        activeTab={activeTab}
                        gameMode={gameMode}
                        gameId={activeGame.id}
                        prizes={activeGame.prizes}
                        setGameMode={setGameMode}
                        visibleNumbers={visibleNumbers}
                        maxStake={activeGame.max_stake?.amount}
                      />
                    )}
                    {gameMode === "turbo" && (
                      <Turbo
                        activeTab={activeTab}
                        gameMode={gameMode}
                        gameId={activeGame.id}
                        setGameMode={setGameMode}
                        visibleNumbers={visibleNumbers}
                        maxStake={activeGame.max_stake?.amount}
                      />
                    )}
                    {gameMode === "under1" && (
                      <Under1
                        activeTab={activeTab}
                        gameMode={gameMode}
                        gameId={activeGame.id}
                        prizes={activeGame.prizes}
                        setGameMode={setGameMode}
                        visibleNumbers={visibleNumbers}
                        maxStake={activeGame.max_stake?.amount}
                      />
                    )}
                    {gameMode === "under2" && (
                      <Under2
                        activeTab={activeTab}
                        gameMode={gameMode}
                        gameId={activeGame.id}
                        prizes={activeGame.prizes}
                        setGameMode={setGameMode}
                        visibleNumbers={visibleNumbers}
                        maxStake={activeGame.max_stake?.amount}
                      />
                    )}
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default LottoPage;
