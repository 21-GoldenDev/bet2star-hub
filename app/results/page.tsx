"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type GameTab = "lotto" | "pools" | "sports" | "sports-draw";

type SportsMatch = {
  number: number;
  league: string;
  home: string;
  away: string;
  home_goal: number | null;
  away_goal: number | null;
  status: string;
  start_time: string | null;
  end_time: string | null;
};

type WeekResult = {
  id: string;
  week: number;
  start_time: string | null;
  end_time: string | null;
  results: Array<number | string>;
  matches: SportsMatch[];
};

const TAB_LABELS: Record<GameTab, string> = {
  lotto: "Lotto",
  pools: "Pools",
  sports: "Sports Betting",
  "sports-draw": "Football Pool",
};

const EMPTY_DATA: Record<GameTab, WeekResult[]> = {
  lotto: [],
  pools: [],
  sports: [],
  "sports-draw": [],
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getPrimaryOutcome = (homeGoal: number, awayGoal: number) => {
  if (homeGoal > awayGoal) return "1";
  if (homeGoal === awayGoal) return "X";
  return "2";
};

const hasScore = (match: SportsMatch) =>
  Number.isFinite(match.home_goal) && Number.isFinite(match.away_goal);

export default function ResultsPage() {
  const [activeTab, setActiveTab] = useState<GameTab>("lotto");
  const [weekFilter, setWeekFilter] = useState("");
  const [resultsByTab, setResultsByTab] = useState<Record<GameTab, WeekResult[]>>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/results");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load results");
        }

        setResultsByTab({
          lotto: payload.data?.lotto || [],
          pools: payload.data?.pools || [],
          sports: payload.data?.sports || [],
          "sports-draw": payload.data?.["sports-draw"] || [],
        });
      } catch (loadError) {
        console.error("Failed to load results:", loadError);
        setError(loadError instanceof Error ? loadError.message : "Failed to load results");
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, []);

  const weeksForTab = useMemo(
    () =>
      Array.from(new Set((resultsByTab[activeTab] || []).map((game) => game.week)))
        .sort((a, b) => b - a),
    [resultsByTab, activeTab],
  );

  useEffect(() => {
    if (!weeksForTab.length) {
      setWeekFilter("");
      return;
    }

    if (!weekFilter || !weeksForTab.includes(Number(weekFilter))) {
      setWeekFilter(String(weeksForTab[0]));
    }
  }, [weeksForTab, weekFilter]);

  const selectedGame = useMemo(() => {
    const week = Number(weekFilter);
    if (!Number.isFinite(week)) return null;
    return (resultsByTab[activeTab] || []).find((game) => game.week === week) || null;
  }, [resultsByTab, activeTab, weekFilter]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as GameTab);
    setWeekFilter("");
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-10 animate-slide-up">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Game Results</h1>
          <p className="text-muted-foreground">
            Browse results for every week across Lotto, Pools, Sports Betting, and Football Pool.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4 h-auto flex-wrap">
            {(Object.keys(TAB_LABELS) as GameTab[]).map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {TAB_LABELS[tab]}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="bg-card border border-border rounded-2xl p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Week</p>
                <Select value={weekFilter} onValueChange={setWeekFilter} disabled={!weeksForTab.length}>
                  <SelectTrigger className="bg-muted border-border w-full">
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent>
                    {weeksForTab.map((week) => (
                      <SelectItem key={week} value={String(week)}>
                        Week {week}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedGame && (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Start</p>
                    <p className="mt-1 text-sm">{formatDateTime(selectedGame.start_time)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">End</p>
                    <p className="mt-1 text-sm">{formatDateTime(selectedGame.end_time)}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
                <p className="mt-4 text-muted-foreground">Loading results...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <p className="text-destructive">{error}</p>
            </div>
          ) : (
            (Object.keys(TAB_LABELS) as GameTab[]).map((tab) => (
              <TabsContent key={tab} value={tab}>
                {!selectedGame ? (
                  <div className="bg-card border border-border rounded-2xl p-12 text-center">
                    <p className="text-muted-foreground">No results available for {TAB_LABELS[tab]} yet.</p>
                  </div>
                ) : tab === "lotto" || tab === "pools" ? (
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <h2 className="text-lg font-semibold mb-4">
                      Week {selectedGame.week} Result
                    </h2>
                    {selectedGame.results.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedGame.results.map((num, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-semibold"
                          >
                            {num}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No result set for this week yet.</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/60">
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>League</TableHead>
                          <TableHead>Home</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Away</TableHead>
                          <TableHead>Result</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedGame.matches.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                              No fixtures found for this week.
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedGame.matches.map((match) => {
                            const scored = hasScore(match);
                            const outcome = scored
                              ? getPrimaryOutcome(match.home_goal as number, match.away_goal as number)
                              : null;

                            return (
                              <TableRow key={match.number}>
                                <TableCell className="font-medium">{match.number}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{match.league}</TableCell>
                                <TableCell>{match.home}</TableCell>
                                <TableCell className="font-semibold">
                                  {scored ? `${match.home_goal} - ${match.away_goal}` : "-"}
                                </TableCell>
                                <TableCell>{match.away}</TableCell>
                                <TableCell>
                                  {scored ? (
                                    <Badge
                                      variant="outline"
                                      className={clsx(
                                        "font-semibold",
                                        outcome === "X"
                                          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                          : "border-primary/30 bg-primary/10 text-primary",
                                      )}
                                    >
                                      {tab === "sports-draw" ? (outcome === "X" ? "X" : "—") : outcome}
                                    </Badge>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">Pending</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={clsx(
                                      match.status === "void"
                                        ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                                        : scored
                                          ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                                          : "border-muted-foreground/30",
                                    )}
                                  >
                                    {match.status === "void" ? "Void" : scored ? "Finished" : "Scheduled"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            ))
          )}
        </Tabs>
      </div>
    </div>
  );
}
