"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable from "@/components/admin/DataTable";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
import { Trash2, RotateCcw, Eye, Check, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import { calcAplDirect, calcAplGrouping } from "@/lib/helpers";
import { cn } from "@/lib/utils";

interface DeletedBet {
  id: string;
  betId?: bigint;
  number?: number;
  week?: number;
  gameType?: string;
  mode?: string;
  player?: {
    fullName: string;
    userName: string;
  };
  staked: number;
  award: number;
  tsn?: string;
  agent?: string;
  same?: number;
  betTime?: string;
  bet_time?: string;
  terminal?: {
    serial_number: string;
  };
  deletedAt: string;
  status?: string;
  under?: any;
  numbers?: number[] | Record<string, number[]>;
  matches?: string[] | Record<string, string[]>;
  selections?: Record<string, string[]>;
  prize?: {
    name: string;
  };
  game_id?: string;
}

interface GameWeek {
  id: string;
  week: number;
  results?: unknown;
}

interface MatchInfo {
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
}

function formatDateIso(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

function getPrizeName(prize: unknown): string {
  if (!prize) return "";
  if (typeof prize === "string") return prize;
  if (typeof prize === "object") {
    const value = (prize as Record<string, unknown>).name;
    if (typeof value === "string") return value;
  }
  return "";
}

const optionLabels: Record<string, string> = {
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

export default function VoidBetsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("lotto");
  const [lottoBets, setLottoBets] = useState<DeletedBet[]>([]);
  const [poolsBets, setPoolsBets] = useState<DeletedBet[]>([]);
  const [sportsBets, setSportsBets] = useState<DeletedBet[]>([]);
  const [sportsDrawBets, setSportsDrawBets] = useState<DeletedBet[]>([]);
  const [dataMatches, setDataMatches] = useState<Record<string, MatchInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [isRestoreAlertOpen, setIsRestoreAlertOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedBet, setSelectedBet] = useState<{ bet: DeletedBet; type: string } | null>(null);

  // Filters (modeled after pools/lotto bets pages)
  const [weeksLotto, setWeeksLotto] = useState<GameWeek[]>([]);
  const [weeksPools, setWeeksPools] = useState<GameWeek[]>([]);
  const [weeksSports, setWeeksSports] = useState<GameWeek[]>([]);
  const [weeksSportsDraw, setWeeksSportsDraw] = useState<GameWeek[]>([]);
  const [weekFilter, setWeekFilter] = useState<string>("all");
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [rangeFilter, setRangeFilter] = useState<DateRange | undefined>(undefined);
  const [sameBetFilter, setSameBetFilter] = useState<string>("");
  const [tsnFilter, setTsnFilter] = useState<string>("");
  const [betIdFilter, setBetIdFilter] = useState<string>("");
  const [betAboveFilter, setBetAboveFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [terminalFilter, setTerminalFilter] = useState<string>("all");
  const [optionFilter, setOptionFilter] = useState<string>("all");

  useEffect(() => {
    fetchWeeks();
    fetchVoidBets();
  }, []);

  const weeksForTab = useMemo(() => {
    switch (activeTab) {
      case "lotto":
        return weeksLotto;
      case "pools":
        return weeksPools;
      case "sports":
        return weeksSports;
      case "sports-draw":
        return weeksSportsDraw;
      default:
        return [];
    }
  }, [activeTab, weeksLotto, weeksPools, weeksSports, weeksSportsDraw]);

  const supportsGameTypeFilter = activeTab === "lotto" || activeTab === "pools";

  const activeTabBets = useMemo(() => {
    switch (activeTab) {
      case "lotto":
        return lottoBets;
      case "pools":
        return poolsBets;
      case "sports":
        return sportsBets;
      case "sports-draw":
        return sportsDrawBets;
      default:
        return [];
    }
  }, [activeTab, lottoBets, poolsBets, sportsBets, sportsDrawBets]);

  useEffect(() => {
    if (weeksForTab.length === 0) return;
    setWeekFilter((prev) => {
      if (prev === "all") return "all";
      if (weeksForTab.some((w) => w.id === prev)) return prev;
      return weeksForTab[0]?.id ?? "all";
    });
  }, [activeTab, weeksForTab]);

  async function fetchWeeks() {
    try {
      const [lottoRes, poolsRes, sportsRes, sportsDrawRes] = await Promise.all([
        fetch("/api/admin/bets/lotto/weeks"),
        fetch("/api/admin/bets/pools/weeks"),
        fetch("/api/admin/bets/sports/weeks"),
        fetch("/api/admin/bets/sports-draw/weeks"),
      ]);

      const [lottoData, poolsData, sportsData, sportsDrawData] = await Promise.all([
        lottoRes.json(),
        poolsRes.json(),
        sportsRes.json(),
        sportsDrawRes.json(),
      ]);

      setWeeksLotto((lottoData.data || []) as GameWeek[]);
      setWeeksPools((poolsData.data || []) as GameWeek[]);
      setWeeksSports((sportsData.data || []) as GameWeek[]);
      setWeeksSportsDraw((sportsDrawData.data || []) as GameWeek[]);
    } catch (error) {
      console.error("Error fetching weeks:", error);
      toast({
        title: "Error",
        description: "Failed to fetch weeks.",
        variant: "destructive",
      });
    }
  }

  const gameOptions: Array<{ value: string; label: string }> = [
    { value: "all", label: "All games" },
    { value: "nap_perm", label: "NAP/PERM" },
    { value: "grouping", label: "Grouping" },
    { value: "two_banker", label: "2 Banker" },
    { value: "one_banker", label: "1 Against" },
    { value: "turbo", label: "Turbo" },
    { value: "under1", label: "Under 1" },
    { value: "under2", label: "Under 2" },
  ];

  const fromTime = rangeFilter?.from ? new Date(rangeFilter.from).setHours(0, 0, 0, 0) : undefined;
  const toTime = rangeFilter?.to ? new Date(rangeFilter.to).setHours(23, 59, 59, 999) : undefined;

  const matchesWeek = (bet: any) => {
    if (weekFilter === "all") return true;
    const betGameId = bet?.gameId ?? bet?.game_id ?? bet?.gameID;
    return String(betGameId || "") === String(weekFilter);
  };

  const matchesGameType = (bet: any) => {
    if (!supportsGameTypeFilter) return true;
    if (gameFilter === "all") return true;
    return String(bet?.gameType || bet?.game_type || "") === String(gameFilter);
  };

  const matchesDateRange = (bet: any) => {
    if (fromTime === undefined && toTime === undefined) return true;
    const timeIso = bet?.betTime ?? bet?.bet_time ?? bet?.betTimeIso ?? bet?.deletedAt;
    if (!timeIso) return false;
    const time = new Date(timeIso).getTime();
    if (Number.isNaN(time)) return false;
    if (fromTime !== undefined && time < fromTime) return false;
    if (toTime !== undefined && time > toTime) return false;
    return true;
  };

  const getBetIdText = (bet: any) => String(bet?.betId?.toString?.() || bet?.number || "");
  const getTerminalText = (bet: any) => {
    const terminal = bet?.terminal;
    if (!terminal) return "";
    if (typeof terminal === "string") return terminal;
    if (typeof terminal === "object" && typeof terminal.serial_number === "string") return terminal.serial_number;
    return "";
  };
  const getAgentText = (bet: any) => String(bet?.agent || "");
  const getStatusText = (bet: any) => String(bet?.status || "");
  const getOptionText = (bet: any) => getPrizeName(bet?.prize);

  const matchesExtraFilters = (bet: any) => {
    const sameBetValue = sameBetFilter.trim() === "" ? undefined : Number(sameBetFilter);
    const betAboveValue = betAboveFilter.trim() === "" ? undefined : Number(betAboveFilter);
    const tsnValue = tsnFilter.trim().toLowerCase();
    const betIdValue = betIdFilter.trim().toLowerCase();

    if (Number.isFinite(sameBetValue) && Number(bet?.same ?? 0) !== sameBetValue) return false;
    if (typeof betAboveValue === "number" && Number.isFinite(betAboveValue) && Number(bet?.staked ?? 0) <= betAboveValue) return false;
    if (tsnValue && !String(bet?.tsn || "").toLowerCase().includes(tsnValue)) return false;
    if (betIdValue && !getBetIdText(bet).toLowerCase().includes(betIdValue)) return false;
    if (statusFilter !== "all" && getStatusText(bet) !== statusFilter) return false;
    if (agentFilter !== "all" && getAgentText(bet) !== agentFilter) return false;
    if (terminalFilter !== "all" && getTerminalText(bet) !== terminalFilter) return false;
    if (optionFilter !== "all" && getOptionText(bet) !== optionFilter) return false;

    return true;
  };

  const statusOptions = useMemo(
    () => Array.from(new Set(activeTabBets.map((b: any) => getStatusText(b)).filter((v) => v.length > 0))).sort(),
    [activeTabBets],
  );

  const agentOptions = useMemo(
    () => Array.from(new Set(activeTabBets.map((b: any) => getAgentText(b)).filter((v) => v.length > 0))).sort(),
    [activeTabBets],
  );

  const terminalOptions = useMemo(
    () => Array.from(new Set(activeTabBets.map((b: any) => getTerminalText(b)).filter((v) => v.length > 0))).sort(),
    [activeTabBets],
  );

  const optionOptions = useMemo(
    () => Array.from(new Set(activeTabBets.map((b: any) => getOptionText(b)).filter((v) => v.length > 0))).sort(),
    [activeTabBets],
  );

  const filteredLottoBets = useMemo(
    () => lottoBets.filter((b: any) => matchesWeek(b) && matchesGameType(b) && matchesDateRange(b) && matchesExtraFilters(b)),
    [lottoBets, weekFilter, gameFilter, fromTime, toTime, activeTab, sameBetFilter, tsnFilter, betIdFilter, betAboveFilter, statusFilter, agentFilter, terminalFilter, optionFilter]
  );

  const filteredPoolsBets = useMemo(
    () => poolsBets.filter((b: any) => matchesWeek(b) && matchesGameType(b) && matchesDateRange(b) && matchesExtraFilters(b)),
    [poolsBets, weekFilter, gameFilter, fromTime, toTime, activeTab, sameBetFilter, tsnFilter, betIdFilter, betAboveFilter, statusFilter, agentFilter, terminalFilter, optionFilter]
  );

  const filteredSportsBets = useMemo(
    () => sportsBets.filter((b: any) => matchesWeek(b) && matchesDateRange(b) && matchesExtraFilters(b)),
    [sportsBets, weekFilter, fromTime, toTime, activeTab, sameBetFilter, tsnFilter, betIdFilter, betAboveFilter, statusFilter, agentFilter, terminalFilter, optionFilter]
  );

  const filteredSportsDrawBets = useMemo(
    () => sportsDrawBets.filter((b: any) => matchesWeek(b) && matchesDateRange(b) && matchesExtraFilters(b)),
    [sportsDrawBets, weekFilter, fromTime, toTime, activeTab, sameBetFilter, tsnFilter, betIdFilter, betAboveFilter, statusFilter, agentFilter, terminalFilter, optionFilter]
  );

  const activeFilteredCount = useMemo(() => {
    switch (activeTab) {
      case "lotto":
        return filteredLottoBets.length;
      case "pools":
        return filteredPoolsBets.length;
      case "sports":
        return filteredSportsBets.length;
      case "sports-draw":
        return filteredSportsDrawBets.length;
      default:
        return 0;
    }
  }, [activeTab, filteredLottoBets.length, filteredPoolsBets.length, filteredSportsBets.length, filteredSportsDrawBets.length]);

  async function fetchVoidBets() {
    setLoading(true);
    try {
      const [lottoRes, poolsRes, sportsRes, sportsDrawRes] = await Promise.all([
        fetch("/api/admin/bets/lotto/void"),
        fetch("/api/admin/bets/pools/void"),
        fetch("/api/admin/bets/sports/void"),
        fetch("/api/admin/bets/sports-draw/void"),
      ]);

      const lottoData = await lottoRes.json();
      const poolsData = await poolsRes.json();
      const sportsData = await sportsRes.json();
      const sportsDrawData = await sportsDrawRes.json();

      // Transform betId strings back to BigInt for lotto and pools
      const transformedLotto = (lottoData.data || []).map((bet: any) => ({
        ...bet,
        betId: bet.betId ? BigInt(bet.betId) : undefined,
      }));

      const transformedPools = (poolsData.data || []).map((bet: any) => ({
        ...bet,
        betId: bet.betId ? BigInt(bet.betId) : undefined,
      }));

      setLottoBets(transformedLotto);
      setPoolsBets(transformedPools);
      setSportsBets(sportsData.data || []);
      setSportsDrawBets(sportsDrawData.data || []);

      // Set match data for sports bets
      setDataMatches({
        ...(sportsData.matches || {}),
        ...(sportsDrawData.matches || {}),
      });
    } catch (error) {
      console.error("Error fetching void bets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch void bets.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function restoreBet() {
    if (!selectedBet) return;

    try {
      const response = await fetch(`/api/admin/bets/${selectedBet.type}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedBet.bet.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to restore bet");
      }

      // Remove from the appropriate list
      if (selectedBet.type === "lotto") {
        setLottoBets((prev) => prev.filter((b) => b.id !== selectedBet.bet.id));
      } else if (selectedBet.type === "pools") {
        setPoolsBets((prev) => prev.filter((b) => b.id !== selectedBet.bet.id));
      } else if (selectedBet.type === "sports") {
        setSportsBets((prev) => prev.filter((b) => b.id !== selectedBet.bet.id));
      } else if (selectedBet.type === "sports-draw") {
        setSportsDrawBets((prev) => prev.filter((b) => b.id !== selectedBet.bet.id));
      }

      toast({
        title: "Success",
        description: "Bet restored successfully.",
      });
    } catch (error) {
      console.error("Error restoring bet:", error);
      toast({
        title: "Error",
        description: "Failed to restore bet.",
        variant: "destructive",
      });
    } finally {
      setIsRestoreAlertOpen(false);
      setSelectedBet(null);
    }
  }

  function getGameLabel(gameType: string) {
    switch (gameType) {
      case "nap_perm": return "NAP/PERM";
      case "grouping": return "Grouping";
      case "two_banker": return "2 Banker";
      case "one_banker": return "1 Against";
      case "turbo": return "Turbo";
      case "under1": return "Under 1";
      case "under2": return "Under 2";
      default: return gameType;
    }
  }

  function renderStatus(status: string | undefined) {
    switch (status) {
      case "active": return <span className="text-green-600 font-medium">Active</span>;
      case "closed": return <span className="text-blue-600 font-medium">Closed</span>;
      case "void": return <span className="text-red-600 font-medium">Void</span>;
      default: return <span className="text-muted-foreground">N/A</span>;
    }
  }

  function getTerminalLabel(terminal: DeletedBet["terminal"] | string | undefined) {
    if (!terminal) return "—";
    if (typeof terminal === "string") return terminal;
    return terminal.serial_number || "—";
  }

  function compareStringOrNumber(a: string | number, b: string | number) {
    if (typeof a === "number" && typeof b === "number") return a - b;
    const aNum = Number(a);
    const bNum = Number(b);
    const aIsNum = !Number.isNaN(aNum);
    const bIsNum = !Number.isNaN(bNum);
    if (aIsNum && bIsNum) return aNum - bNum;
    if (aIsNum) return -1;
    if (bIsNum) return 1;
    return String(a).localeCompare(String(b));
  }

  function calculateAplForVoidBet(row: DeletedBet) {
    if (row.gameType === "turbo" || row.gameType === "under1" || row.gameType === "under2") {
      return row.staked;
    }

    if (row.gameType === "nap_perm") {
      const list = Array.isArray(row.numbers)
        ? row.numbers
        : Array.isArray(row.matches)
          ? row.matches
          : row.numbers && typeof row.numbers === "object"
            ? Object.values(row.numbers).flat()
            : row.matches && typeof row.matches === "object"
              ? Object.values(row.matches).flat()
              : [];
      return calcAplDirect(row.staked, row.under as any, list.length);
    }

    if (row.numbers) {
      return calcAplGrouping(row.staked, row.numbers as any);
    }

    if (row.matches) {
      return calcAplGrouping(row.staked, row.matches as any);
    }

    return 0;
  }

  const renderActions = (row: DeletedBet, type: string) => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        title="View details"
        size="sm"
        onClick={() => {
          setSelectedBet({ bet: row, type });
          setIsDetailsOpen(true);
        }}
      >
        <Eye className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        title="Restore bet"
        size="sm"
        onClick={() => {
          setSelectedBet({ bet: row, type });
          setIsRestoreAlertOpen(true);
        }}
      >
        <RotateCcw className="w-4 h-4" />
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Void Bets</h1>
        <div className="mt-12 flex items-center justify-center">
          <div className="text-muted-foreground">Loading void bets...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Void Bets</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Manage bets that have been voided by players or agents.
      </p>

      <section className="mt-6 space-y-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <Label>Week</Label>
              <Select value={weekFilter} onValueChange={(val) => setWeekFilter(val)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All weeks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All weeks</SelectItem>
                  {weeksForTab.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      Week {w.week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* {supportsGameTypeFilter ? (
              <div>
                <Label>Game</Label>
                <Select value={gameFilter} onValueChange={(val) => setGameFilter(val)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All games" />
                  </SelectTrigger>
                  <SelectContent>
                    {gameOptions.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="hidden md:block" />
            )} */}

            {/* <div className="md:col-span-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="mt-1 w-full justify-start">
                    {rangeFilter?.from && rangeFilter?.to
                      ? `${new Date(rangeFilter.from).toLocaleDateString()} – ${new Date(rangeFilter.to).toLocaleDateString()}`
                      : "Pick a range"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-3">
                    <Calendar
                      mode="range"
                      selected={rangeFilter}
                      onSelect={setRangeFilter}
                      numberOfMonths={2}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button variant="outline" size="sm" onClick={() => setRangeFilter(undefined)}>
                        Clear
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div> */}

            <div>
              <Label>Same Bet Repeated</Label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                placeholder="e.g. 2"
                value={sameBetFilter}
                onChange={(e) => setSameBetFilter(e.target.value)}
              />
            </div>

            <div>
              <Label>TSN</Label>
              <Input
                className="mt-1"
                placeholder="Search TSN"
                value={tsnFilter}
                onChange={(e) => setTsnFilter(e.target.value)}
              />
            </div>

            <div>
              <Label>Bet ID</Label>
              <Input
                className="mt-1"
                placeholder="Search Bet ID"
                value={betIdFilter}
                onChange={(e) => setBetIdFilter(e.target.value)}
              />
            </div>

            <div>
              <Label>Bet Above</Label>
              <Input
                className="mt-1"
                placeholder="e.g. 5000"
                value={betAboveFilter}
                onChange={(e) => setBetAboveFilter(e.target.value)}
              />
            </div>

            {/* <div>
              <Label>Bet Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> */}

            <div>
              <Label>Agent</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="mt-1 w-full justify-between font-normal"
                  >
                    {agentFilter === "all" ? "All agents" : agentFilter}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search agent..." />
                    <CommandList>
                      <CommandEmpty>No agent found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="all" onSelect={() => setAgentFilter("all")}>
                          <Check className={cn("mr-2 h-4 w-4", agentFilter === "all" ? "opacity-100" : "opacity-0")} />
                          All agents
                        </CommandItem>
                        {agentOptions.map((agent) => (
                          <CommandItem key={agent} value={agent} onSelect={() => setAgentFilter(agent)}>
                            <Check className={cn("mr-2 h-4 w-4", agentFilter === agent ? "opacity-100" : "opacity-0")} />
                            {agent}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Terminal</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="mt-1 w-full justify-between font-normal"
                  >
                    {terminalFilter === "all" ? "All terminals" : terminalFilter}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search terminal..." />
                    <CommandList>
                      <CommandEmpty>No terminal found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="all" onSelect={() => setTerminalFilter("all")}>
                          <Check className={cn("mr-2 h-4 w-4", terminalFilter === "all" ? "opacity-100" : "opacity-0")} />
                          All terminals
                        </CommandItem>
                        {terminalOptions.map((terminal) => (
                          <CommandItem key={terminal} value={terminal} onSelect={() => setTerminalFilter(terminal)}>
                            <Check className={cn("mr-2 h-4 w-4", terminalFilter === terminal ? "opacity-100" : "opacity-0")} />
                            {terminal}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Options</Label>
              <Select value={optionFilter} onValueChange={setOptionFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All options" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All options</SelectItem>
                  {optionOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {loading ? "Loading..." : `${activeFilteredCount} results`}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setGameFilter("all");
                  setRangeFilter(undefined);
                  setWeekFilter("all");
                  setSameBetFilter("");
                  setTsnFilter("");
                  setBetIdFilter("");
                  setBetAboveFilter("");
                  setStatusFilter("all");
                  setAgentFilter("all");
                  setTerminalFilter("all");
                  setOptionFilter("all");
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="lotto">
            Lotto ({lottoBets.length})
          </TabsTrigger>
          <TabsTrigger value="pools">
            Pools ({poolsBets.length})
          </TabsTrigger>
          <TabsTrigger value="sports">
            Sports ({sportsBets.length})
          </TabsTrigger>
          <TabsTrigger value="sports-draw">
            Football Pool ({sportsDrawBets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lotto" className="mt-4">
          <DataTable
            title="Lotto Bets"
            data={filteredLottoBets}
            itemsPerPage={10}
            columns={[
              { key: "week", label: "Week" },
              // { key: "gameType", label: "Game", render: (value: string) => getGameLabel(value) },
              { key: "betId", label: "Bet#", render: (value: bigint) => value?.toString() || "" },
              {
                key: "player",
                label: "Player",
                render: (_: any | undefined, row) =>
                  row.player ? (
                    <div>
                      <div className="font-medium">{row.player.fullName}</div>
                      <div className="text-xs text-muted-foreground">{row.player.userName}</div>
                    </div>
                  ) : (
                    <div>Agent</div>
                  ),
              },
              {
                key: "prize",
                label: "Option",
                render: (value: { name?: string } | undefined) => value?.name || "",
              },
              {
                key: "under",
                label: "Under",
                render: (value: number | number[] | undefined) =>
                  Array.isArray(value) ? (value.length ? value.join(", ") : "") : (value || ""),
              },
              {
                key: "numbers",
                label: "Numbers",
                render: (value: number[] | Record<string, number[]> | undefined) => {
                  if (!value) return "";
                  if (Array.isArray(value)) {
                    const display = value.slice(0, 3).sort((a, b) => a - b).join(", ");
                    return <div className="text-sm text-muted-foreground">{display}{value.length > 3 ? "..." : ""}</div>;
                  }
                  const groups = Object.keys(value).length;
                  return <div className="text-sm text-muted-foreground">{groups} group{groups !== 1 ? "s" : ""}</div>;
                },
              },
              {
                key: "id",
                label: "APL",
                render: (_: string, row: DeletedBet) => calculateAplForVoidBet(row).toFixed(2),
              },
              { key: "staked", label: "Staked", render: (value: number) => value.toFixed(0) },
              { key: "award", label: "Winning", render: (value: number) => value.toFixed(2) },
              { key: "tsn", label: "TSN", render: (value) => value || "" },
              { key: "terminal", label: "Terminal", render: (value) => value || "" },
              { key: "agent", label: "Agent", render: (value) => value || "" },
              { key: "betTime", label: "Bet Time", render: (value: string) => formatDateIso(value) },
              { key: "deletedAt", label: "Deleted At", render: (value: string) => formatDateIso(value) },
              { key: "same", label: "SameBet", render: (value?: number) => value ?? 0 },
            ]}
            actions={(row) => renderActions(row, "lotto")}
          />
        </TabsContent>

        <TabsContent value="pools" className="mt-4">
          <DataTable
            title="Pools Bets"
            data={filteredPoolsBets}
            itemsPerPage={10}
            columns={[
              { key: "week", label: "Week" },
              // { key: "gameType", label: "Game", render: (value: string) => getGameLabel(value) },
              { key: "betId", label: "Bet#", render: (value: bigint) => value?.toString() || "" },
              {
                key: "player",
                label: "Player",
                render: (_: any | undefined, row) =>
                  row.player ? (
                    <div>
                      <div className="font-medium">{row.player.fullName}</div>
                      <div className="text-xs text-muted-foreground">{row.player.userName}</div>
                    </div>
                  ) : (
                    <div>Agent</div>
                  ),
              },
              {
                key: "prize",
                label: "Option",
                render: (value: { name?: string } | undefined) => value?.name || "",
              },
              {
                key: "under",
                label: "Under",
                render: (value: string | string[] | undefined) =>
                  Array.isArray(value) ? (value.length ? value.join(", ") : "") : (value || ""),
              },
              {
                key: "matches",
                label: "Matches",
                render: (value: string[] | Record<string, string[]> | undefined) => {
                  if (!value) return "";
                  if (Array.isArray(value)) {
                    const display = value.slice(0, 3).sort((a, b) => compareStringOrNumber(a, b)).join(", ");
                    return <div className="text-sm text-muted-foreground">{display}{value.length > 3 ? "..." : ""}</div>;
                  }
                  const groups = Object.keys(value).length;
                  return <div className="text-sm text-muted-foreground">{groups} group{groups !== 1 ? "s" : ""}</div>;
                },
              },
              {
                key: "id",
                label: "APL",
                render: (_: string, row: DeletedBet) => calculateAplForVoidBet(row).toFixed(2),
              },
              { key: "staked", label: "Staked", render: (value: number) => value.toFixed(0) },
              { key: "award", label: "Winning", render: (value: number) => value.toFixed(2) },
              { key: "tsn", label: "TSN", render: (value) => value || "" },
              { key: "terminal", label: "Terminal", render: (value) => value || "" },
              { key: "agent", label: "Agent", render: (value) => value || "" },
              { key: "betTime", label: "Bet Time", render: (value: string) => formatDateIso(value) },
              { key: "deletedAt", label: "Deleted At", render: (value: string) => formatDateIso(value) },
              { key: "same", label: "SameBet", render: (value?: number) => value ?? 0 },
            ]}
            actions={(row) => renderActions(row, "pools")}
          />
        </TabsContent>

        <TabsContent value="sports" className="mt-4">
          <DataTable
            title="Sports Bets"
            data={filteredSportsBets}
            itemsPerPage={10}
            columns={[
              { key: "week", label: "Week" },
              { key: "number", label: "Bet ID" },
              // { key: "mode", label: "Mode", render: (value: string) => <div className="capitalize">{value}</div> },
              {
                key: "player",
                label: "Player",
                render: (_: any | undefined, row) =>
                  row.player ? (
                    <div>
                      <div className="font-medium">{row.player.fullName}</div>
                      <div className="text-xs text-muted-foreground">{row.player.userName}</div>
                    </div>
                  ) : (
                    <div>Agent</div>
                  ),
              },
              { key: "under", label: "Under" },
              { key: "staked", label: "Staked", render: (value: number) => value.toFixed(0) },
              { key: "award", label: "Winning", render: (value: number) => value.toFixed(2) },
              { key: "tsn", label: "TSN", render: (value) => value || "" },
              { key: "terminal", label: "Terminal", render: (value) => value || "" },
              { key: "agent", label: "Agent", render: (value) => value || "" },
              { key: "bet_time", label: "Bet Time", render: (value: string) => formatDateIso(value) },
              { key: "deletedAt", label: "Deleted At", render: (value: string) => formatDateIso(value) },
              { key: "same", label: "SameBet", render: (value?: number) => value ?? 0 },
            ]}
            actions={(row) => renderActions(row, "sports")}
          />
        </TabsContent>

        <TabsContent value="sports-draw" className="mt-4">
          <DataTable
            title="Football Pool Bets"
            data={filteredSportsDrawBets}
            itemsPerPage={10}
            columns={[
              { key: "week", label: "Week" },
              { key: "number", label: "Bet ID" },
              // { key: "mode", label: "Mode", render: (value: string) => <div className="capitalize">{value}</div> },
              {
                key: "player",
                label: "Player",
                render: (_: any | undefined, row) =>
                  row.player ? (
                    <div>
                      <div className="font-medium">{row.player.fullName}</div>
                      <div className="text-xs text-muted-foreground">{row.player.userName}</div>
                    </div>
                  ) : (
                    <div>Agent</div>
                  ),
              },
              { key: "under", label: "Under" },
              { key: "staked", label: "Staked", render: (value: number) => value.toFixed(0) },
              { key: "award", label: "Winning", render: (value: number) => value.toFixed(2) },
              { key: "tsn", label: "TSN", render: (value) => value || "" },
              { key: "terminal", label: "Terminal", render: (value) => value || "" },
              { key: "agent", label: "Agent", render: (value) => value || "" },
              { key: "bet_time", label: "Bet Time", render: (value: string) => formatDateIso(value) },
              { key: "deletedAt", label: "Deleted At", render: (value: string) => formatDateIso(value) },
              { key: "same", label: "SameBet", render: (value?: number) => value ?? 0 },
            ]}
            actions={(row) => renderActions(row, "sports-draw")}
          />
        </TabsContent>
      </Tabs>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={isRestoreAlertOpen} onOpenChange={setIsRestoreAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Bet?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the bet and make it visible in the active bets list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={restoreBet}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bet Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bet Details</DialogTitle>
            <DialogDescription>
              {selectedBet?.bet.betId
                ? `Bet #${selectedBet.bet.betId.toString()}`
                : selectedBet?.bet.number
                  ? `Bet #${selectedBet.bet.number}`
                  : "Bet Details"}
            </DialogDescription>
          </DialogHeader>

          {selectedBet && (
            <div className="space-y-6">
              {(() => {
                const bet = selectedBet.bet;
                const isSportsType = selectedBet.type === "sports" || selectedBet.type === "sports-draw";

                return (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Bet ID</Label>
                        <p className="mt-1 font-medium">{bet.betId?.toString() || bet.number || "—"}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">
                          {isSportsType ? "Mode" : "Game Type"}
                        </Label>
                        <p className="mt-1 font-medium capitalize">
                          {isSportsType ? (bet.mode || "—") : getGameLabel(bet.gameType || "")}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                        <p className="mt-1">{renderStatus(bet.status)}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Bet Time</Label>
                        <p className="mt-1 font-medium text-sm">{formatDateIso(bet.betTime || bet.bet_time)}</p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <Label className="text-xs font-semibold text-muted-foreground block mb-2">Player</Label>
                      {bet.player ? (
                        <div>
                          <p className="font-medium">{bet.player.fullName}</p>
                          <p className="text-sm text-muted-foreground">{bet.player.userName}</p>
                        </div>
                      ) : (
                        <p className="font-medium">Agent</p>
                      )}
                    </div>

                    {(selectedBet.type === "lotto" || selectedBet.type === "pools") && (
                      <div className="border-t pt-4">
                        <Label className="text-xs font-semibold text-muted-foreground block mb-3">
                          {selectedBet.type === "lotto" ? "Numbers" : "Matches"}
                        </Label>
                        {(() => {
                          const value = selectedBet.type === "lotto" ? bet.numbers : bet.matches;
                          if (!value) return <p className="text-sm text-muted-foreground">—</p>;

                          if (Array.isArray(value)) {
                            return (
                              <div className="flex flex-wrap gap-2">
                                {value.sort((a, b) => compareStringOrNumber(a, b)).map((item, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1 rounded bg-primary/10 border border-primary/20 text-sm font-medium"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-3">
                              {Object.entries(value).map(([gid, items], index) => (
                                <div key={gid} className="space-y-2">
                                  <p className="text-sm font-semibold">Group {index + 1}: Under {gid.split("-")[0]}</p>
                                  <div className="flex flex-wrap gap-2 ml-2">
                                    {items
                                      .sort((a: string | number, b: string | number) => compareStringOrNumber(a, b))
                                      .map((item: string | number, idx: number) => (
                                        <span
                                          key={idx}
                                          className="px-2 py-1 rounded bg-primary/10 border border-primary/20 text-sm"
                                        >
                                          {item}
                                        </span>
                                      ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {isSportsType && bet.selections && (
                      <div className="border-t pt-4">
                        <Label className="text-xs font-semibold text-muted-foreground block mb-3">Selections</Label>
                        <div className="space-y-2">
                          {Object.entries(bet.selections)
                            .map(([matchNum, odds]) => {
                              const matches = dataMatches[bet.game_id || ""] || [];
                              const match = matches.find((m) => m.number.toString() === matchNum.toString());
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
                                      const prizeIndex = selectedBet.type === "sports-draw" ? 0 : Object.keys(optionLabels).indexOf(opt);
                                      return (
                                        <span
                                          key={idx}
                                          className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-semibold whitespace-nowrap"
                                        >
                                          {label}: {match?.prizes?.[prizeIndex] ? match.prizes[prizeIndex] : "—"}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-4 grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Under</Label>
                        <p className="mt-1 font-medium">
                          {Array.isArray(bet.under)
                            ? bet.under.length > 0
                              ? bet.under.join(", ")
                              : "-"
                            : bet.under || "-"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Terminal</Label>
                        <p className="mt-1 font-medium">{getTerminalLabel(bet.terminal)}</p>
                      </div>
                    </div>

                    <div className="border-t pt-4 grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Staked</Label>
                        <p className="mt-1 font-medium text-lg">{bet.staked.toFixed(2)}</p>
                      </div>
                      {!isSportsType && (
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground">APL</Label>
                          <p className="mt-1 font-medium text-lg">{calculateAplForVoidBet(bet).toFixed(2)}</p>
                        </div>
                      )}
                      {isSportsType && (
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground">Award</Label>
                          <p className="mt-1 font-medium text-lg">{bet.award.toFixed(2)}</p>
                        </div>
                      )}
                    </div>

                    {!isSportsType && (
                      <div className="border-t pt-4 grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground">Prize</Label>
                          <p className="mt-1 font-medium text-nowrap">{bet.prize?.name || "—"}</p>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground">Award</Label>
                          <p className="mt-1 font-medium text-lg">{bet.award.toFixed(2)}</p>
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <Label className="text-xs font-semibold text-muted-foreground">Deleted At</Label>
                      <p className="mt-1 font-medium text-sm">{formatDateIso(bet.deletedAt)}</p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
