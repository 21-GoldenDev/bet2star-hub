"use client";

import { useMemo, useState, useEffect } from "react";
import DataTable from "@/components/admin/DataTable";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateRange } from "react-day-picker";
import { Trash2, Eye, Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { calcAplDirect, calcAplGrouping } from "@/lib/helpers";
import type { PoolsBet, Player } from "@/lib/types/pools";
import { useToast } from "@/hooks/use-toast";
import useAdminRole from "@/hooks/use-admin-role";
import { GameModeType } from "@/lib/types/gameMode";
import { Game } from "@/lib/types/game";
import { cn } from "@/lib/utils";
import { canVoidBetWithinWindow } from "@/lib/bets/voidWindow";

function formatDateIso(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

function getPrizeName(prize: unknown): string {
  if (typeof prize === "string") return prize;
  if (prize && typeof prize === "object") {
    const value = (prize as Record<string, unknown>).name;
    if (typeof value === "string") {
      return value;
    }
  }
  return "";
}

export default function PoolsPage() {
  const { toast } = useToast();
  const [allData, setAllData] = useState<PoolsBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeksAll, setWeeksAll] = useState<Game[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [betToDelete, setBetToDelete] = useState<PoolsBet | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedBet, setSelectedBet] = useState<PoolsBet | null>(null);

  // Unified filters
  const [weekFilter, setWeekFilter] = useState<string | undefined>(undefined);
  const [weekResult, setWeekResult] = useState<string[]>([]);
  const [gameFilter, setGameFilter] = useState<"all" | GameModeType>("all");
  const [rangeFilter, setRangeFilter] = useState<DateRange | undefined>(undefined);
  const [sameBetFilter, setSameBetFilter] = useState<string>("");
  const [tsnFilter, setTsnFilter] = useState<string>("");
  const [betIdFilter, setBetIdFilter] = useState<string>("");
  const [betAboveFilter, setBetAboveFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [terminalFilter, setTerminalFilter] = useState<string>("all");
  const [optionFilter, setOptionFilter] = useState<string>("all");
  const { roleInfo } = useAdminRole();
  const canVoidRole =
    roleInfo?.role === "admin" ||
    roleInfo?.role === "staff" ||
    roleInfo?.role === "agent";

  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const response = await fetch(`/api/admin/bets/pools/weeks`);
        const result = await response.json();
        const weekValues = result.data || [];
        setWeeksAll(weekValues);
        if (weekValues.length > 0) {
          setWeekFilter(weekValues[0].id);
          if (weekValues[0].results) {
            setWeekResult(weekValues[0].results as string[]);
          }
        }
      } catch (error) {
        console.error("Error fetching weeks:", error);
        toast({
          title: "Error",
          description: "Failed to fetch weeks. Please try again.",
          variant: "destructive",
        });
      }
    }
    fetchWeeks();
  }, []);

  useEffect(() => {
    if (!weekFilter) {
      setWeekResult([]);
      return;
    }
    const selectedWeek = weeksAll.find((w) => w.id === weekFilter);
    if (selectedWeek && selectedWeek.results) {
      setWeekResult(selectedWeek.results as string[]);
    } else {
      setWeekResult([]);
    }
  }, [weekFilter, weeksAll]);

  async function fetchBets() {
    if (!weekFilter) {
      return;
    }
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("game_id", String(weekFilter));
      if (gameFilter !== "all") {
        params.append("gameType", gameFilter);
      }
      if (rangeFilter?.from) {
        params.append("dateFrom", rangeFilter.from.toISOString());
      }
      if (rangeFilter?.to) {
        params.append("dateTo", rangeFilter.to.toISOString());
      }

      const response = await fetch(`/api/admin/bets/pools?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch bets");
      }

      const result = await response.json();

      // Convert betId strings back to BigInt
      const transformedData = result.data.map((bet: any) => ({
        ...bet,
        betId: BigInt(bet.betId),
      }));

      setAllData(transformedData);
    } catch (error) {
      console.error("Error fetching bets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch bets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // Refetch when filters change
  useEffect(() => {
    fetchBets();
  }, [weekFilter, gameFilter, rangeFilter]);

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

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(allData.map((b) => (b.status || "").trim()).filter((status) => status.length > 0)),
      ).sort(),
    [allData],
  );

  const agentOptions = useMemo(
    () =>
      Array.from(
        new Set(allData.map((b) => (b.agent || "").trim()).filter((agent) => agent.length > 0)),
      ).sort(),
    [allData],
  );

  const terminalOptions = useMemo(
    () =>
      Array.from(
        new Set(allData.map((b) => (b.terminal || "").trim()).filter((terminal) => terminal.length > 0)),
      ).sort(),
    [allData],
  );

  const prizeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allData
            .map((b) => getPrizeName(b.prize))
            .filter((name) => name.length > 0),
        ),
      ).sort(),
    [allData],
  );

  const filteredAll = useMemo(() => {
    const fromTime = rangeFilter?.from ? new Date(rangeFilter.from).setHours(0, 0, 0, 0) : undefined;
    const toTime = rangeFilter?.to ? new Date(rangeFilter.to).setHours(23, 59, 59, 999) : undefined;
    const sameBetValue = sameBetFilter.trim() === "" ? undefined : Number(sameBetFilter);
    const betAboveValue = betAboveFilter.trim() === "" ? undefined : Number(betAboveFilter);
    const tsnValue = tsnFilter.trim().toLowerCase();
    const betIdValue = betIdFilter.trim().toLowerCase();

    return allData
      .filter((b) => {
        if (weekFilter !== undefined && b.gameId !== weekFilter) return false;
        if (gameFilter !== "all" && b.gameType !== gameFilter) return false;
        if (Number.isFinite(sameBetValue) && (b.same ?? 0) !== sameBetValue) return false;
        if (typeof betAboveValue === "number" && Number.isFinite(betAboveValue) && b.staked <= betAboveValue) return false;
        if (tsnValue && !(b.tsn || "").toLowerCase().includes(tsnValue)) return false;
        if (betIdValue && !b.betId.toString().toLowerCase().includes(betIdValue)) return false;
        if (statusFilter !== "all" && (b.status || "") !== statusFilter) return false;
        if (agentFilter !== "all" && (b.agent || "") !== agentFilter) return false;
        if (terminalFilter !== "all" && (b.terminal || "") !== terminalFilter) return false;

        const optionName = getPrizeName(b.prize);
        if (optionFilter !== "all" && optionName !== optionFilter) return false;

        const bt = new Date(b.betTime).getTime();
        if (fromTime !== undefined && bt < fromTime) return false;
        if (toTime !== undefined && bt > toTime) return false;
        return true;
      })
      .map((b) => {
        if (b.gameType === "turbo" || b.gameType === "under1" || b.gameType === "under2") {
          return { ...b, apl: b.staked };
        }
        const isNapPerm = b.gameType === "nap_perm";
        const apl = isNapPerm
          ? calcAplDirect(b.staked, b.under as any, (Array.isArray(b.matches) ? b.matches : Object.values(b.matches).flat()).length)
          : calcAplGrouping(b.staked, b.matches as any);
        return { ...b, apl };
      });
  }, [
    allData,
    weekFilter,
    gameFilter,
    sameBetFilter,
    betAboveFilter,
    tsnFilter,
    betIdFilter,
    statusFilter,
    agentFilter,
    terminalFilter,
    optionFilter,
    rangeFilter,
  ]);

  const openDeleteDialog = (row: PoolsBet) => {
    setBetToDelete(row);
    setIsDeleteAlertOpen(true);
  };

  async function deleteBet() {
    if (!betToDelete) return;

    try {
      const response = await fetch(`/api/admin/bets/pools/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: betToDelete.id }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Failed to void bet");
      }

      setAllData((prev) => prev.filter((b) => b.id !== betToDelete.id));

      toast({
        title: "Success",
        description: "Bet voided successfully.",
      });
    } catch (error) {
      console.error("Error voiding bet:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to void bet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteAlertOpen(false);
      setBetToDelete(null);
    }
  }

  function getGameLabel(gameType: GameModeType) {
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

  const compareMatches = (a: string, b: string) => {
    const aNum = Number(a);
    const bNum = Number(b);
    const aIsNum = !isNaN(aNum);
    const bIsNum = !isNaN(bNum);
    if (aIsNum && bIsNum) {
      return aNum - bNum;
    } else if (aIsNum) {
      return -1;
    } else if (bIsNum) {
      return 1;
    }
    return a.localeCompare(b);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Bets — Pools</h1>
      <p className="text-sm text-muted-foreground mt-2">Manage pool bets here.</p>

      {loading ? (
        <div className="flex items-center justify-center mt-12">
          <div className="text-muted-foreground">Loading bets...</div>
        </div>
      ) : (
        <section className="mt-6 space-y-4">
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <Label>Week</Label>
                <Select
                  value={weekFilter === undefined ? undefined : weekFilter}
                  onValueChange={(val) => setWeekFilter(val)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent>
                    {weeksAll.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.week}
                      </SelectItem>
                    ))}
                    {weeksAll.length === 0 && (
                      <SelectItem value="none" disabled>No weeks available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* <div>
                <Label>Game</Label>
                <Select value={gameFilter} onValueChange={(val) => setGameFilter(val as typeof gameFilter)}>
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
                    {prizeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!!weekFilter && (
                <div className="md:col-span-4">
                  <Label>Week Result</Label>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    {weekResult.length > 0 ? (
                      weekResult.map((num, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium"
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

              <div className="md:col-span-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {loading ? "Loading..." : `${filteredAll.length} results`}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGameFilter("all");
                    setWeekFilter(undefined);
                    setRangeFilter(undefined);
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

          <DataTable
            title="Pools Bets"
            data={filteredAll}
            itemsPerPage={10}
            columns={[
              { key: "week", label: "Week" },
              // { key: "gameType", label: "Game", render: (value: string) => getGameLabel(value as GameModeType) },
              { key: "betId", label: "Bet ID", render: (value: bigint) => value.toString() },
              {
                key: "player",
                label: "Player",
                render: (_: Player | undefined, row) =>
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
                render: (value: { name: string } | undefined) => (
                  value ? <div className="text-nowrap">{value.name}</div> : ""
                )
              },
              { key: "under", label: "Under", render: (value: string | string[]) => (Array.isArray(value) ? (value.length > 0 ? value.join(", ") : "") : value || "") },
              {
                key: "matches",
                label: "Matches",
                render: (value: string[] | Record<string, string[]>) => {
                  if (Array.isArray(value)) {
                    const display = value.slice(0, 3).sort((a, b) => compareMatches(a, b)).join(", ");
                    return (
                      <div className="text-sm text-muted-foreground">
                        {display}{value.length > 3 ? "..." : ""}
                      </div>
                    );
                  }
                  const groups = Object.keys(value).length;
                  return (
                    <div className="text-sm text-muted-foreground">
                      {groups} group{groups !== 1 ? "s" : ""}
                    </div>
                  );
                },
              },
              { key: "apl", label: "APL", render: (value: number) => value ? value.toFixed(2) : "" },
              { key: "staked", label: "Staked", render: (value: number) => value.toFixed(0) },
              { key: "award", label: "Winning", render: (value: number) => value.toFixed(2) },
              { key: "tsn", label: "TSN", render: (value) => value || "" },
              { key: "terminal", label: "Terminal", render: (value) => value || "" },
              { key: "agent", label: "Agent", render: (value) => value || "" },
              { key: "betTime", label: "Bet Time", render: (value: string) => formatDateIso(value) },
              { key: "same", label: "SameBet" },
            ]}
            actions={(row) => (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  title="View details"
                  size="sm"
                  onClick={() => {
                    setSelectedBet(row);
                    setIsDetailsOpen(true);
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                {canVoidRole &&
                  canVoidBetWithinWindow(row.betTime, row.voidWindowMinutes) && (
                  <Button variant="outline" title="Void bet" size="sm" onClick={() => openDeleteDialog(row)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          />
        </section>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bet?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete bet #{betToDelete?.betId.toString()}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteBet}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
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
              Bet #{selectedBet?.betId?.toString()}
            </DialogDescription>
          </DialogHeader>

          {selectedBet && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Bet ID</Label>
                  <p className="mt-1 font-medium">{selectedBet.betId?.toString()}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Game Type</Label>
                  <p className="mt-1 font-medium">{getGameLabel(selectedBet.gameType)}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                  <p className="mt-1">{renderStatus(selectedBet.status)}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Bet Time</Label>
                  <p className="mt-1 font-medium text-sm">{formatDateIso(selectedBet.betTime)}</p>
                </div>
              </div>

              {/* Player Info */}
              <div className="border-t pt-4">
                <Label className="text-xs font-semibold text-muted-foreground block mb-2">Player</Label>
                {selectedBet.player ? (
                  <div>
                    <p className="font-medium">{selectedBet.player.fullName}</p>
                    <p className="text-sm text-muted-foreground">{selectedBet.player.userName}</p>
                  </div>
                ) : (
                  <p className="font-medium">Agent</p>
                )}
              </div>

              {/* Matches Details */}
              <div className="border-t pt-4">
                <Label className="text-xs font-semibold text-muted-foreground block mb-3">Matches</Label>
                {(() => {
                  const value = selectedBet.matches;
                  if (Array.isArray(value)) {
                    return (
                      <div className="flex flex-wrap gap-2">
                        {value.sort((a, b) => compareMatches(a, b)).map((match) => (
                          <span
                            key={match}
                            className="px-3 py-1 rounded bg-primary/10 border border-primary/20 text-sm font-medium"
                          >
                            {match}
                          </span>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {Object.entries(value).map(([gid, ms], index) => (
                        <div key={gid} className="space-y-2">
                          <p className="text-sm font-semibold">Group {index + 1}: Under {gid.split("-")[0]}</p>
                          <div className="flex flex-wrap gap-2 ml-2">
                            {ms.sort((a, b) => compareMatches(a, b)).map((match) => (
                              <span
                                key={match}
                                className="px-2 py-1 rounded bg-primary/10 border border-primary/20 text-sm"
                              >
                                {match}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Under & Terminal */}
              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Under</Label>
                  <p className="mt-1 font-medium">
                    {Array.isArray(selectedBet.under)
                      ? selectedBet.under.length > 0
                        ? selectedBet.under.join(", ")
                        : "-"
                      : selectedBet.under || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Terminal</Label>
                  <p className="mt-1 font-medium">
                    {(selectedBet.terminal as any)?.serial_number || "—"}
                  </p>
                </div>
              </div>

              {/* Financial Info */}
              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Staked</Label>
                  <p className="mt-1 font-medium text-lg">{selectedBet.staked.toFixed(0)}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">APL</Label>
                  <p className="mt-1 font-medium text-lg">
                    {(() => {
                      if (selectedBet.gameType === "turbo" || selectedBet.gameType === "under1" || selectedBet.gameType === "under2") {
                        return "0.00";
                      }
                      const isNapPerm = selectedBet.gameType === "nap_perm";
                      const apl = isNapPerm
                        ? calcAplDirect(selectedBet.staked, selectedBet.under as any, (Array.isArray(selectedBet.matches) ? selectedBet.matches : Object.values(selectedBet.matches).flat()).length)
                        : calcAplGrouping(selectedBet.staked, selectedBet.matches as any);
                      return apl.toFixed(2);
                    })()}
                  </p>
                </div>
              </div>

              {/* Prize & Award */}
              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Prize</Label>
                  <p className="mt-1 font-medium text-nowrap">
                    {(selectedBet.prize as any)?.name || "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Award</Label>
                  <p className="mt-1 font-medium text-lg">{selectedBet.award?.toFixed(2) || "0.00"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
