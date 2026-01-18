"use client";

import { useMemo, useState, useEffect } from "react";
import DataTable from "@/components/admin/DataTable";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
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
import { DateRange } from "react-day-picker";
import { Trash2, XCircle } from "lucide-react";
import { calcAplDirect, calcAplGrouping } from "@/lib/helpers";
import type { LottoBet, Player } from "@/lib/types/lotto";
import { useToast } from "@/hooks/use-toast";
import { GameModeType } from "@/lib/types/gameMode";
import { Game } from "@/lib/types/game";

function formatDateIso(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

export default function LottoPage() {
  const { toast } = useToast();
  const [allData, setAllData] = useState<LottoBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeksAll, setWeeksAll] = useState<Game[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [betToDelete, setBetToDelete] = useState<LottoBet | null>(null);

  // Unified filters
  const [weekFilter, setWeekFilter] = useState<string | undefined>(undefined);
  const [weekResult, setWeekResult] = useState<number[]>([]);
  const [gameFilter, setGameFilter] = useState<"all" | GameModeType>("all");
  const [rangeFilter, setRangeFilter] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const response = await fetch(`/api/admin/bets/lotto/weeks`);
        const result = await response.json();
        const weekValues = result.data || [];
        setWeeksAll(weekValues);
        if (weekValues.length > 0) {
          setWeekFilter(weekValues[0].id);
          if (weekValues[0].results) {
            setWeekResult(weekValues[0].results as number[]);
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
      setWeekResult(selectedWeek.results as number[]);
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
      params.append("game_id", weekFilter);
      if (gameFilter !== "all") {
        params.append("gameType", gameFilter);
      }
      if (rangeFilter?.from) {
        params.append("dateFrom", rangeFilter.from.toISOString());
      }
      if (rangeFilter?.to) {
        params.append("dateTo", rangeFilter.to.toISOString());
      }

      const response = await fetch(`/api/admin/bets/lotto?${params.toString()}`);

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

  const gameOptions: Array<{ value: string; label: string }> = [
    { value: "all", label: "All games" },
    { value: "nap_perm", label: "NAP/PERM" },
    { value: "grouping", label: "Grouping" },
    { value: "two_banker", label: "2 Banker" },
  ];

  const filteredAll = useMemo(() => {
    const fromTime = rangeFilter?.from ? new Date(rangeFilter.from).setHours(0, 0, 0, 0) : undefined;
    const toTime = rangeFilter?.to ? new Date(rangeFilter.to).setHours(23, 59, 59, 999) : undefined;

    return allData
      .filter((b) => {
        if (weekFilter !== undefined && b.gameId !== weekFilter) return false;
        if (gameFilter !== "all" && b.gameType !== gameFilter) return false;
        const bt = new Date(b.betTime).getTime();
        if (fromTime !== undefined && bt < fromTime) return false;
        if (toTime !== undefined && bt > toTime) return false;
        return true;
      })
      .map((b) => {
        const isNapPerm = b.gameType === "nap_perm";
        const apl = isNapPerm ? calcAplDirect(b.staked, b.under, b.numbers.length) : calcAplGrouping(b.staked, b.numbers);
        return { ...b, apl };
      });
  }, [allData, weekFilter, gameFilter, rangeFilter]);

  const openDeleteDialog = (row: LottoBet) => {
    setBetToDelete(row);
    setIsDeleteAlertOpen(true);
  };

  async function deleteBet() {
    if (!betToDelete) return;

    try {
      const response = await fetch(`/api/admin/bets/lotto/${betToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete bet");
      }

      setAllData((prev) => prev.filter((b) => b.id !== betToDelete.id));

      toast({
        title: "Success",
        description: "Bet deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting bet:", error);
      toast({
        title: "Error",
        description: "Failed to delete bet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteAlertOpen(false);
      setBetToDelete(null);
    }
  }

  async function voidBet(betId: string) {
    try {
      const response = await fetch(`/api/admin/bets/lotto/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: betId }),
      });

      if (!response.ok) {
        throw new Error("Failed to void bet");
      }

      fetchBets();

      toast({
        title: "Success",
        description: "Bet voided successfully.",
      });
    } catch (error) {
      console.error("Error voiding bet:", error);
      toast({
        title: "Error",
        description: "Failed to void bet. Please try again.",
        variant: "destructive",
      });
    }
  }

  function getGameLabel(gameType: string) {
    switch (gameType) {
      case "nap_perm": return "NAP/PERM";
      case "grouping": return "Grouping";
      case "two_banker": return "2 Banker";
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

  // Refetch when filters change
  useEffect(() => {
    fetchBets();
  }, [weekFilter, gameFilter, rangeFilter]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Bets — Lotto</h1>
      <p className="text-sm text-muted-foreground mt-2">Manage lotto bets here.</p>

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

            <div>
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
            </div>

            <div className="md:col-span-2">
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
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </div>

        <DataTable
          title="Lotto Bets"
          data={filteredAll}
          itemsPerPage={10}
          columns={[
            { key: "gameType", label: "Game", render: (value: string) => getGameLabel(value) },
            { key: "betId", label: "Bet#", render: (value: bigint) => value.toString() },
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
            { key: "under", label: "Under", render: (value: number | number[]) => (Array.isArray(value) ? value.join(", ") : value) },
            {
              key: "numbers",
              label: "Numbers",
              render: (value: number[] | Record<string, number[]>) => {
                if (Array.isArray(value)) {
                  return value.sort((a, b) => a - b).join(", ");
                }
                return (
                  <div className="space-y-1">
                    {Object.entries(value).map(([gid, nums]) => (
                      <div key={gid} className="text-sm">
                        <span className="font-medium mr-1">{gid.split("-")[0]}:</span>
                        <span className="text-muted-foreground">{nums.sort((a, b) => a - b).join(", ")}</span>
                      </div>
                    ))}
                  </div>
                );
              },
            },
            { key: "apl", label: "APL", render: (value: number) => value.toFixed(2) },
            { key: "staked", label: "Staked", render: (value: number) => value.toFixed(0) },
            {
              key: "prize",
              label: "Prize",
              render: (value: { name: string; commission: number } | undefined) => (
                value ? <div className="text-nowrap">{value.name}</div> : "—"
              )
            },
            { key: "award", label: "Award", render: (value: number) => value.toFixed(2) },
            { key: "terminal", label: "Terminal" },
            { key: "betTime", label: "Bet Time", render: (value: string) => formatDateIso(value) },
            { key: "status", label: "Status", render: (value: string | undefined) => renderStatus(value) },
          ]}
          actions={(row) => (
            <div className="flex items-center gap-2">
              {row.status !== "void" && (
                <Button variant="outline" title="Void bet" size="sm" onClick={() => voidBet(row.id)}>
                  <XCircle className="w-4 h-4" />
                </Button>
              )}
              <Button variant="outline" title="Delete bet" size="sm" onClick={() => openDeleteDialog(row)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        />
      </section>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the bet.
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
    </div>
  );
}
