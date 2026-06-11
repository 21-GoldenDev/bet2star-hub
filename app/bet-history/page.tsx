"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Trash2 } from "lucide-react";
import useSupabaseUser from "@/hooks/use-supabase-user";
import { calcAplDirect, calcAplGrouping, formatLottoWeekLabel } from "@/lib/helpers";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BetTab = "lotto" | "pools" | "sports" | "sports-draw";
const PAGE_SIZE = 20;

type BetRow = {
  id: string;
  gameId?: string;
  tab: BetTab;
  status: string;
  gameType: string;
  mode: string;
  numbers?: unknown;
  matches?: unknown;
  selections?: unknown;
  week: string;
  betId: string;
  option: string;
  under: string;
  gameList: string;
  apl: number | null;
  staked: number;
  winning: number;
  betTime: string;
  canDelete?: boolean;
};

type BetRecord = {
  id: string;
  game_id?: string;
  bet_id?: number;
  number?: number;
  gameType?: string;
  mode?: string;
  under?: unknown;
  numbers?: unknown;
  matches?: unknown;
  selections?: unknown;
  staked?: number;
  award?: number;
  bet_time?: string;
  status?: string | null;
  canDelete?: boolean;
  games?: { week?: number | null; game_name?: string | null } | Array<{ week?: number | null; game_name?: string | null }> | null;
  prize?: { name?: string } | Array<{ name?: string }> | null;
};

const TAB_LABELS: Record<BetTab, string> = {
  lotto: "Lotto",
  pools: "Pools",
  sports: "Sports",
  "sports-draw": "Football Pool",
};

const EMPTY_BETS: Record<BetTab, BetRow[]> = {
  lotto: [],
  pools: [],
  sports: [],
  "sports-draw": [],
};

const EMPTY_TOTALS: Record<BetTab, number> = {
  lotto: 0,
  pools: 0,
  sports: 0,
  "sports-draw": 0,
};

const INITIAL_PAGES: Record<BetTab, number> = {
  lotto: 1,
  pools: 1,
  sports: 1,
  "sports-draw": 1,
};

const EMPTY_WEEKS: Record<BetTab, number[]> = {
  lotto: [],
  pools: [],
  sports: [],
  "sports-draw": [],
};

type WeekGameInfo = {
  start_time: string;
  end_time: string;
  results: Array<number | string>;
};

type LottoGameOption = {
  id: string;
  week: number;
  game_name: string | null;
  start_time: string;
  end_time: string;
  results: Array<number | string>;
};

const EMPTY_WEEK_GAMES: Record<BetTab, Record<number, WeekGameInfo>> = {
  lotto: {},
  pools: {},
  sports: {},
  "sports-draw": {},
};

type PaginatedBetResult = {
  rows: BetRow[];
  total: number;
  totalPages: number;
  weeks: number[];
  appliedWeek: number | null;
  gameOptions: LottoGameOption[];
  appliedGameId: string | null;
  weekGames: Record<number, WeekGameInfo>;
  matches: Record<string, MatchInfo[]>;
  summary: { option: string; sales: number; winnings: number }[];
};

const resolveWeekGameStatus = (game?: WeekGameInfo | null): "active" | "closed" | null => {
  if (!game?.end_time) return null;

  const end = new Date(game.end_time).getTime();
  if (Number.isNaN(end)) return null;

  return Date.now() <= end ? "active" : "closed";
};

const getWeekResultForBet = (
  bet: BetRow | null,
  weekGamesByTab: Record<BetTab, Record<number, WeekGameInfo>>,
  gameOptionsByTab: Record<BetTab, LottoGameOption[]>,
): Array<number | string> => {
  if (!bet || (bet.tab !== "lotto" && bet.tab !== "pools")) return [];

  if (bet.tab === "lotto" && bet.gameId) {
    const game = gameOptionsByTab.lotto.find((g) => g.id === bet.gameId);
    return Array.isArray(game?.results) ? game.results : [];
  }

  const week = Number(bet.week);
  if (!Number.isFinite(week)) return [];

  const results = weekGamesByTab[bet.tab]?.[week]?.results;
  return Array.isArray(results) ? results : [];
};

type MatchInfo = {
  league: string;
  number: number;
  home: string;
  away: string;
  home_goal: number;
  away_goal: number;
  prizes: number[];
  status: "active" | "void";
  start_time: string;
  end_time: string;
};

const sportsOptionLabels: Record<string, string> = {
  H: "1",
  D: "X",
  A: "2",
  "1X": "1X",
  "12": "12",
  X2: "X2",
  O25: "Over 2.5",
  U25: "Under 2.5",
  GG: "GG",
};

const sportsDrawOptionLabels: Record<string, string> = {
  D: "X",
};

const formatCurrency = (value: number) => `₦${(Number(value) || 0).toLocaleString()}`;

const formatDateTime = (iso?: string) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatArrayText = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) return "-";
  return value.join(", ");
};

const compareMixed = (a: string | number, b: string | number) => {
  const aNum = Number(a);
  const bNum = Number(b);

  if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
    return aNum - bNum;
  }

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
};

const formatGameListAdminStyle = (value: unknown) => {
  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    const sorted = [...value].sort((a, b) => compareMixed(a as string | number, b as string | number));
    const display = sorted.slice(0, 3).join(", ");
    return `${display}${sorted.length > 3 ? "..." : ""}`;
  }

  if (value && typeof value === "object") {
    const groups = Object.keys(value as Record<string, unknown>).length;
    return `${groups} group${groups !== 1 ? "s" : ""}`;
  }

  return "-";
};

const formatPrize = (value: BetRecord["prize"]) => {
  if (Array.isArray(value)) return value[0]?.name || "-";
  return value?.name || "-";
};

const formatMode = (mode?: string) => {
  if (!mode) return "-";
  return mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
};

const resolveApl = (bet: BetRecord, tab: BetTab) => {
  const staked = Number(bet.staked) || 0;

  if (tab === "sports" || tab === "sports-draw") {
    return staked;
  }

  const gameType = (bet.gameType || "").toLowerCase();
  if (["turbo", "under1", "under2"].includes(gameType)) {
    return staked;
  }

  if (tab === "lotto") {
    if (Array.isArray(bet.numbers)) {
      return calcAplDirect(staked, Array.isArray(bet.under) ? (bet.under as number[]) : [], bet.numbers.length);
    }

    if (bet.numbers && typeof bet.numbers === "object") {
      return calcAplGrouping(staked, bet.numbers as Record<string, string[] | number[]>);
    }
  }

  if (tab === "pools") {
    if (Array.isArray(bet.matches)) {
      return calcAplDirect(staked, Array.isArray(bet.under) ? (bet.under as number[]) : [], bet.matches.length);
    }

    if (bet.matches && typeof bet.matches === "object") {
      return calcAplGrouping(staked, bet.matches as Record<string, string[] | number[]>);
    }
  }

  return null;
};

const mapBetToRow = (bet: BetRecord, tab: BetTab): BetRow => {
  const games = Array.isArray(bet.games) ? bet.games[0] : bet.games;
  const week = games?.week;
  const weekLabel =
    tab === "lotto" && typeof week === "number"
      ? formatLottoWeekLabel(week, games?.game_name)
      : week !== null && week !== undefined
        ? String(week)
        : "-";
  const gameList = tab === "lotto"
    ? formatGameListAdminStyle(bet.numbers)
    : tab === "pools"
      ? formatGameListAdminStyle(bet.matches)
      : formatGameListAdminStyle(bet.selections);

  return {
    id: bet.id,
    gameId: bet.game_id,
    tab,
    status: bet.status || "active",
    gameType: bet.gameType || "",
    mode: bet.mode || "",
    numbers: bet.numbers,
    matches: bet.matches,
    selections: bet.selections,
    week: weekLabel,
    betId: String(bet.bet_id ?? bet.number ?? bet.id),
    option: tab === "lotto" || tab === "pools" ? formatPrize(bet.prize) : formatMode(bet.mode),
    under: getUnderValue(bet.gameType || "", bet.under),
    gameList,
    apl: resolveApl(bet, tab),
    staked: Number(bet.staked) || 0,
    winning: Number(bet.award) || 0,
    betTime: formatDateTime(bet.bet_time),
    canDelete: bet.canDelete,
  };
};

async function fetchTabBets(
  tab: BetTab,
  page: number,
  filters: { week: string; betId: string; betAbove: string },
): Promise<PaginatedBetResult> {
  const searchParams = new URLSearchParams({
    tab,
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });

  if (filters.week.trim()) {
    if (tab === "lotto") {
      searchParams.set("game_id", filters.week.trim());
    } else {
      searchParams.set("week", filters.week.trim());
    }
  }
  if (filters.betId.trim()) searchParams.set("betId", filters.betId.trim());
  if (filters.betAbove.trim()) searchParams.set("betAbove", filters.betAbove.trim());

  const response = await fetch(`/api/bets/history?${searchParams.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error || `Failed to fetch ${tab} bets`);
  }

  return {
    rows: ((result?.data || []) as BetRecord[]).map((item) => mapBetToRow(item, tab)),
    total: Number(result?.pagination?.total || 0),
    totalPages: Number(result?.pagination?.totalPages || 1),
    weeks: Array.isArray(result?.weeks) ? result.weeks : [],
    appliedWeek: typeof result?.appliedWeek === "number" ? result.appliedWeek : null,
    gameOptions: Array.isArray(result?.gameOptions) ? result.gameOptions : [],
    appliedGameId: typeof result?.appliedGameId === "string" ? result.appliedGameId : null,
    weekGames: result?.weekGames && typeof result.weekGames === "object"
      ? Object.fromEntries(
          Object.entries(result.weekGames as Record<string, WeekGameInfo>).map(([week, game]) => [
            Number(week),
            {
              start_time: game.start_time,
              end_time: game.end_time,
              results: Array.isArray(game.results) ? game.results : [],
            },
          ]),
        )
      : {},
    matches: (result?.matches || {}) as Record<string, MatchInfo[]>,
    summary: Array.isArray(result?.summary) ? result.summary : [],
  };
}

const canDeleteBet = (_tab: BetTab, row: BetRow) => row.canDelete !== false;

const getUnderValue = (gameType: string, under: any) => {
  if (gameType === "under1" || gameType === "under2") {
    return gameType.replace("under", "");
  }
  return formatArrayText(under);
}

const getGameLabel = (gameType: string) => {
  switch (gameType) {
    case "nap_perm":
      return "NAP/PERM";
    case "grouping":
      return "Grouping";
    case "two_banker":
      return "2 Banker";
    case "one_banker":
      return "1 Against";
    case "turbo":
      return "Turbo";
    case "under1":
      return "Under 1";
    case "under2":
      return "Under 2";
    default:
      return gameType || "-";
  }
};

const renderStatus = (status?: string) => {
  const normalized = (status || "active").toLowerCase();
  const isVoid = normalized === "void";
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${isVoid ? "bg-gray-500 text-white" : "bg-green-600 text-white"
        }`}
    >
      {isVoid ? "VOID" : normalized.toUpperCase()}
    </span>
  );
};

const renderDetailedSelection = (row: BetRow) => {
  const value = row.tab === "lotto" ? row.numbers : row.tab === "pools" ? row.matches : row.selections;

  if (Array.isArray(value)) {
    const sorted = [...value].sort((a, b) => compareMixed(a as string | number, b as string | number));
    return (
      <div className="flex flex-wrap gap-2">
        {sorted.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="px-3 py-1 rounded bg-primary/10 border border-primary/20 text-sm font-medium"
          >
            {String(item)}
          </span>
        ))}
      </div>
    );
  }

  if (value && typeof value === "object") {
    return (
      <div className="space-y-3">
        {Object.entries(value as Record<string, unknown>).map(([gid, items], index) => {
          const list = Array.isArray(items) ? [...items] : [];
          list.sort((a, b) => compareMixed(a as string | number, b as string | number));

          return (
            <div key={gid} className="space-y-2">
              <p className="text-sm font-semibold">Group {index + 1}: Under {gid.split("-")[0] || "-"}</p>
              <div className="flex flex-wrap gap-2 ml-2">
                {list.map((item, itemIndex) => (
                  <span
                    key={`${gid}-${item}-${itemIndex}`}
                    className="px-2 py-1 rounded bg-primary/10 border border-primary/20 text-sm"
                  >
                    {String(item)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">No details</p>;
};

const renderSportsSelectionDetails = (row: BetRow, dataMatches: Record<string, MatchInfo[]>) => {
  const gameId = row.gameId || "";
  const selections = row.selections && typeof row.selections === "object"
    ? (row.selections as Record<string, string[]>)
    : {};
  const optionLabels = row.tab === "sports-draw" ? sportsDrawOptionLabels : sportsOptionLabels;

  return (
    <div className="space-y-2">
      {Object.entries(selections)
        .map(([matchNum, odds]) => {
          const matches = dataMatches[gameId] || [];
          const match = matches.find((item) => item.number.toString() === matchNum.toString());
          return { matchNum, odds, match };
        })
        .sort((a, b) => {
          if (!a.match || !b.match) return 0;
          return new Date(a.match.start_time).getTime() - new Date(b.match.start_time).getTime();
        })
        .map(({ matchNum, odds, match }) => (
          <div key={matchNum} className="border rounded-md p-3 bg-card hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">#{matchNum}</span>
                  {match && (
                    <>
                      <span className="text-xs text-muted-foreground truncate">{match.league}</span>
                      <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                        {new Date(match.start_time).toLocaleString(undefined, {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </span>
                    </>
                  )}
                </div>

                {match ? (
                  <div className="space-y-0.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 truncate">{match.home}</span>
                      <span className="font-bold text-base min-w-6 text-center">
                        {match.home_goal !== null && match.home_goal !== undefined ? match.home_goal : "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 truncate">{match.away}</span>
                      <span className="font-bold text-base min-w-6 text-center">
                        {match.away_goal !== null && match.away_goal !== undefined ? match.away_goal : "-"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Match details unavailable</div>
                )}
              </div>

              <div className="flex flex-col gap-1 items-end">
                {(odds || []).map((opt: string, idx: number) => {
                  const label = optionLabels[opt] || opt;
                  const priceIndex = Object.keys(optionLabels).indexOf(opt);
                  const price = row.tab === "sports-draw"
                    ? (match?.prizes?.[0] ?? "—")
                    : (priceIndex >= 0 ? (match?.prizes?.[priceIndex] ?? "—") : "—");

                  return (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-semibold whitespace-nowrap"
                    >
                      {label}: {price}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

export default function BetHistoryPage() {
  const { user, isLoading: userLoading } = useSupabaseUser();
  const [activeTab, setActiveTab] = useState<BetTab>("lotto");
  const [loading, setLoading] = useState(true);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [weekFilter, setWeekFilter] = useState("");
  const [betIdFilter, setBetIdFilter] = useState("");
  const [betAboveFilter, setBetAboveFilter] = useState("");
  const [selectedBet, setSelectedBet] = useState<BetRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ tab: BetTab; id: string; betId: string } | null>(null);
  const [betsByTab, setBetsByTab] = useState<Record<BetTab, BetRow[]>>(EMPTY_BETS);
  const [totalsByTab, setTotalsByTab] = useState<Record<BetTab, number>>(EMPTY_TOTALS);
  const [weeksByTab, setWeeksByTab] = useState<Record<BetTab, number[]>>(EMPTY_WEEKS);
  const [gameOptionsByTab, setGameOptionsByTab] = useState<Record<BetTab, LottoGameOption[]>>({
    lotto: [],
    pools: [],
    sports: [],
    "sports-draw": [],
  });
  const [weekGamesByTab, setWeekGamesByTab] = useState<Record<BetTab, Record<number, WeekGameInfo>>>(EMPTY_WEEK_GAMES);
  const [summaryByTab, setSummaryByTab] = useState<Record<BetTab, { option: string; sales: number; winnings: number }[]>>({
    lotto: [],
    pools: [],
    sports: [],
    "sports-draw": [],
  });
  const [matchesByTab, setMatchesByTab] = useState<Record<BetTab, Record<string, MatchInfo[]>>>({
    lotto: {},
    pools: {},
    sports: {},
    "sports-draw": {},
  });
  const [pagesByTab, setPagesByTab] = useState<Record<BetTab, number>>(INITIAL_PAGES);
  const [totalPagesByTab, setTotalPagesByTab] = useState<Record<BetTab, number>>(INITIAL_PAGES);

  useEffect(() => {
    const loadBets = async () => {
      if (!user) {
        setBetsByTab(EMPTY_BETS);
        setTotalsByTab(EMPTY_TOTALS);
        setPagesByTab(INITIAL_PAGES);
        setTotalPagesByTab(INITIAL_PAGES);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const page = pagesByTab[activeTab];
        const {
          rows,
          total,
          totalPages,
          weeks,
          appliedWeek,
          gameOptions,
          appliedGameId,
          weekGames,
          matches,
          summary,
        } = await fetchTabBets(activeTab, page, {
          week: weekFilter,
          betId: betIdFilter,
          betAbove: betAboveFilter,
        });

        setBetsByTab((prev) => ({ ...prev, [activeTab]: rows }));
        setTotalsByTab((prev) => ({ ...prev, [activeTab]: total }));
        setTotalPagesByTab((prev) => ({ ...prev, [activeTab]: totalPages }));
        setWeeksByTab((prev) => ({ ...prev, [activeTab]: weeks }));
        setGameOptionsByTab((prev) => ({ ...prev, [activeTab]: gameOptions }));
        setWeekGamesByTab((prev) => ({ ...prev, [activeTab]: weekGames }));
        setMatchesByTab((prev) => ({ ...prev, [activeTab]: matches }));
        setSummaryByTab((prev) => ({ ...prev, [activeTab]: summary }));

        if (!weekFilter) {
          if (activeTab === "lotto" && appliedGameId) {
            setWeekFilter(appliedGameId);
          } else if (appliedWeek != null) {
            setWeekFilter(String(appliedWeek));
          }
        }
      } catch (error) {
        console.error("Failed to load bet history:", error);
        toast({ title: "Failed to load bet history", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    loadBets();
  }, [user, activeTab, pagesByTab, weekFilter, betIdFilter, betAboveFilter]);

  useEffect(() => {
    setPagesByTab((prev) => ({
      ...prev,
      [activeTab]: 1,
    }));
  }, [activeTab, weekFilter, betIdFilter, betAboveFilter]);

  const activeRows = useMemo(() => betsByTab[activeTab] || [], [betsByTab, activeTab]);

  const selectedWeekGameStatus = useMemo(() => {
    if (!weekFilter) return null;
    if (activeTab === "lotto") {
      const game = gameOptionsByTab.lotto.find((g) => g.id === weekFilter);
      return resolveWeekGameStatus(game);
    }
    const game = weekGamesByTab[activeTab]?.[Number(weekFilter)];
    return resolveWeekGameStatus(game);
  }, [weekFilter, weekGamesByTab, gameOptionsByTab, activeTab]);

  const selectedBetWeekResult = useMemo(
    () => getWeekResultForBet(selectedBet, weekGamesByTab, gameOptionsByTab),
    [selectedBet, weekGamesByTab, gameOptionsByTab],
  );

  const handleTabChange = (value: string) => {
    setWeekFilter("");
    setActiveTab(value as BetTab);
  };

  const openDeleteDialog = (tab: BetTab, id: string, betId: string) => {
    setPendingDelete({ tab, id, betId });
    setIsDeleteAlertOpen(true);
  };

  const openDetailsDialog = (row: BetRow) => {
    setSelectedBet(row);
    setIsDetailsOpen(true);
  };

  const handleDeleteBet = async (tab: BetTab, id: string) => {
    if (!user) return;

    const key = `${tab}-${id}`;

    setDeletingKey(key);
    try {
      const response = await fetch("/api/bets/void", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tab, id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to delete bet");
      }

      setBetsByTab((prev) => ({
        ...prev,
        [tab]: prev[tab].filter((row) => row.id !== id),
      }));

      setTotalsByTab((prev) => ({
        ...prev,
        [tab]: Math.max(0, prev[tab] - 1),
      }));

      const currentPage = pagesByTab[tab];
      const currentRows = betsByTab[tab];
      if (currentRows.length <= 1 && currentPage > 1) {
        setPagesByTab((prev) => ({
          ...prev,
          [tab]: Math.max(1, prev[tab] - 1),
        }));
      }

      toast({ title: "Bet deleted" });
    } catch (error) {
      console.error("Failed to delete bet:", error);
      toast({ title: "Failed to delete bet", variant: "destructive" });
    } finally {
      setDeletingKey(null);
    }
  };

  const confirmDeleteBet = async () => {
    if (!pendingDelete) return;
    await handleDeleteBet(pendingDelete.tab, pendingDelete.id);
    setIsDeleteAlertOpen(false);
    setPendingDelete(null);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen pt-20 pb-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-20 pb-8 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Please Sign In</h1>
          <p className="text-muted-foreground mb-6">You need to be signed in to view your bet history</p>
          <Link
            href="/auth"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const currentPage = pagesByTab[activeTab];
  const currentTotalPages = totalPagesByTab[activeTab] || 1;
  const currentTotal = totalsByTab[activeTab] || 0;
  const startItem = currentTotal === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, currentTotal);

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Bet History</h1>
          <p className="text-muted-foreground">View your placed bets across all game types</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4 h-auto flex-wrap">
            <TabsTrigger value="lotto">Lotto</TabsTrigger>
            <TabsTrigger value="pools">Pools</TabsTrigger>
            <TabsTrigger value="sports">Sports</TabsTrigger>
            <TabsTrigger value="sports-draw">Football Pool</TabsTrigger>
          </TabsList>

          <div className="bg-card border border-border rounded-2xl p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-2 min-w-0">
                <Select
                  value={weekFilter}
                  onValueChange={(value) => setWeekFilter(value)}
                >
                  <SelectTrigger className="bg-muted border-border w-full">
                    <SelectValue placeholder="Filter by week" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTab === "lotto"
                      ? (gameOptionsByTab.lotto || []).map((game) => (
                          <SelectItem key={game.id} value={game.id}>
                            {formatLottoWeekLabel(game.week, game.game_name)}
                          </SelectItem>
                        ))
                      : (weeksByTab[activeTab] || []).map((week) => (
                          <SelectItem key={week} value={String(week)}>
                            Week {week}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
                {selectedWeekGameStatus && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <span className="text-xs font-medium text-muted-foreground">Game status:</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        selectedWeekGameStatus === "active"
                          ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                          : "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          selectedWeekGameStatus === "active" ? "bg-green-500" : "bg-blue-500",
                        )}
                      />
                      {selectedWeekGameStatus === "active" ? "Active" : "Closed"}
                    </Badge>
                  </div>
                )}
              </div>
              <Input
                type="text"
                placeholder="Filter by bet ID"
                value={betIdFilter}
                onChange={(e) => setBetIdFilter(e.target.value)}
                className="bg-muted border-border"
              />
              <Input
                type="number"
                min="0"
                placeholder="Filter by bet above"
                value={betAboveFilter}
                onChange={(e) => setBetAboveFilter(e.target.value)}
                className="bg-muted border-border"
              />
              <Button
                variant="outline"
                onClick={() => {
                  setWeekFilter("");
                  setBetIdFilter("");
                  setBetAboveFilter("");
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>

          {(summaryByTab[activeTab] || []).length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4 mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Sales & Winnings by Prize</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(summaryByTab[activeTab] || []).map((item) => (
                  <div key={item.option} className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-sm font-medium text-foreground truncate">{item.option || "-"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Sales: {formatCurrency(item.sales)}</p>
                    <p className="text-xs text-muted-foreground">Winnings: {formatCurrency(item.winnings)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(Object.keys(TAB_LABELS) as BetTab[]).map((tab) => (
            <TabsContent key={tab} value={tab}>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/60">
                    <TableRow>
                      <TableHead>Week</TableHead>
                      <TableHead>Bet ID</TableHead>
                      <TableHead>Option (Prizes)</TableHead>
                      <TableHead>Under</TableHead>
                      <TableHead>Game List</TableHead>
                      <TableHead className="text-right">APL</TableHead>
                      <TableHead className="text-right">Staked</TableHead>
                      <TableHead className="text-right">Winning</TableHead>
                      <TableHead>Bet Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                          Loading bet history...
                        </TableCell>
                      </TableRow>
                    ) : (betsByTab[tab] || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                          No {TAB_LABELS[tab]} bets found
                        </TableCell>
                      </TableRow>
                    ) : (
                      (betsByTab[tab] || []).map((row) => {
                        const rowDeleteKey = `${tab}-${row.id}`;
                        return (
                          <TableRow key={row.id}>
                            <TableCell>{row.week}</TableCell>
                            <TableCell className="font-medium">{row.betId}</TableCell>
                            <TableCell>{row.option}</TableCell>
                            <TableCell>{row.under}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{row.gameList}</TableCell>
                            <TableCell className="text-right">{row.apl !== null ? row.apl.toFixed(2) : "-"}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.staked)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.winning)}</TableCell>
                            <TableCell className="whitespace-nowrap">{row.betTime}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  title="View details"
                                  size="sm"
                                  onClick={() => openDetailsDialog(row)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {canDeleteBet(tab, row) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive"
                                    onClick={() => openDeleteDialog(tab, row.id, row.betId)}
                                    disabled={deletingKey === rowDeleteKey}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {!loading && activeRows.length > 0 && (
          <div className="flex items-center justify-between mt-3 gap-3">
            <p className="text-sm text-muted-foreground">
              Showing {startItem}-{endItem} of {currentTotal} {TAB_LABELS[activeTab]} bets
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagesByTab((prev) => ({
                    ...prev,
                    [activeTab]: Math.max(1, prev[activeTab] - 1),
                  }))
                }
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {currentPage} of {currentTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagesByTab((prev) => ({
                    ...prev,
                    [activeTab]: Math.min(currentTotalPages, prev[activeTab] + 1),
                  }))
                }
                disabled={currentPage >= currentTotalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
            <DialogHeader>
              <DialogTitle>Bet Details</DialogTitle>
              <DialogDescription>
                Bet #{selectedBet?.betId}
              </DialogDescription>
            </DialogHeader>

            {selectedBet && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Bet ID</Label>
                    <p className="mt-1 font-medium">{selectedBet.betId}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Game Type</Label>
                    <p className="mt-1 font-medium">
                      {selectedBet.tab === "sports" || selectedBet.tab === "sports-draw"
                        ? formatMode(selectedBet.mode)
                        : getGameLabel(selectedBet.gameType)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                    <p className="mt-1">{renderStatus(selectedBet.status)}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Bet Time</Label>
                    <p className="mt-1 font-medium text-sm">{selectedBet.betTime}</p>
                  </div>
                </div>

                <div className="border-t border-gray-600 pt-4">
                  <Label className="text-xs font-semibold text-muted-foreground block mb-3">
                    {selectedBet.tab === "lotto" ? "Numbers" : selectedBet.tab === "pools" ? "Matches" : "Selections"}
                  </Label>
                  {selectedBet.tab === "sports" || selectedBet.tab === "sports-draw"
                    ? renderSportsSelectionDetails(selectedBet, matchesByTab[selectedBet.tab] || {})
                    : renderDetailedSelection(selectedBet)}
                </div>

                <div className="border-t border-gray-600 pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Under</Label>
                    <p className="mt-1 font-medium">{selectedBet.under || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Week</Label>
                    <p className="mt-1 font-medium">{selectedBet.week || "-"}</p>
                  </div>
                </div>

                {(selectedBet.tab === "lotto" || selectedBet.tab === "pools") && (
                  <div className="border-t border-gray-600 pt-4">
                    <Label className="text-xs font-semibold text-muted-foreground block mb-3">Week Result</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedBetWeekResult.length > 0 ? (
                        selectedBetWeekResult.map((num, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium"
                          >
                            {num}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No result set</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-600 pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Staked</Label>
                    <p className="mt-1 font-medium text-lg">{selectedBet.staked.toFixed(0)}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">APL</Label>
                    <p className="mt-1 font-medium text-lg">
                      {selectedBet.apl !== null ? selectedBet.apl.toFixed(2) : "-"}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-600 pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Option</Label>
                    <p className="mt-1 font-medium text-nowrap">{selectedBet.option || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Award</Label>
                    <p className="mt-1 font-medium text-lg">{selectedBet.winning.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this bet?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete bet #{pendingDelete?.betId}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setPendingDelete(null);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteBet}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
