"use client";

import { useMemo, useState, useEffect } from "react";
import DataTable from "@/components/admin/DataTable";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { Trash2, XCircle } from "lucide-react";
import { calcAplDirect, calcAplGrouping } from "@/lib/helpers";
import type { LottoBet, Player, GameMode } from "@/lib/types/lotto";
import { useToast } from "@/hooks/use-toast";

function formatDateIso(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

export default function LottoPage() {
  const { toast } = useToast();
  const [allData, setAllData] = useState<LottoBet[]>([]);
  const [loading, setLoading] = useState(true);

  // Unified filters
  const [weekFilter, setWeekFilter] = useState<number | "">("");
  const [gameFilter, setGameFilter] = useState<"all" | GameMode>("all");
  const [rangeFilter, setRangeFilter] = useState<DateRange | undefined>(undefined);

  // Fetch data from API
  useEffect(() => {
    fetchBets();
  }, []);

  async function fetchBets() {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (weekFilter !== "") {
        params.append("week", String(weekFilter));
      }
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

  const weeksAll = useMemo(() => Array.from(new Set(allData.map((d) => d.week))).sort(), [allData]);

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
        if (weekFilter !== "" && b.week !== weekFilter) return false;
        if (gameFilter !== "all" && b.gameType !== gameFilter) return false;
        const bt = new Date(b.betTime).getTime();
        if (fromTime !== undefined && bt < fromTime) return false;
        if (toTime !== undefined && bt > toTime) return false;
        return true;
      })
      .map((b) => {
        if (b.gameType === "nap_perm") {
          return { ...b, apl: calcAplDirect(b.staked, b.under, b.numbers.length) };
        }
        return { ...b, apl: calcAplGrouping(b.staked, b.numbers) };
      });
  }, [allData, weekFilter, gameFilter, rangeFilter]);

  async function deleteBet(row: LottoBet) {
    try {
      const response = await fetch(`/api/admin/bets/lotto/${row.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete bet");
      }

      setAllData((prev) => prev.filter((b) => b.id !== row.id));

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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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

            <div>
              <Label>Week</Label>
              <Select
                value={weekFilter === "" ? undefined : String(weekFilter)}
                onValueChange={(val) => setWeekFilter(val === "all" ? "" : Number(val))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All weeks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {weeksAll.map((w) => (
                    <SelectItem key={w} value={String(w)}>
                      {w}
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

            <div className="md:col-span-5 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {loading ? "Loading..." : `${filteredAll.length} results`}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setGameFilter("all");
                  setWeekFilter("");
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
            { key: "week", label: "Week" },
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
                  return value.join(", ");
                }
                return (
                  <div className="space-y-1">
                    {Object.entries(value).map(([gid, nums]) => (
                      <div key={gid} className="text-sm">
                        <span className="font-medium mr-1">{gid.split("-")[0]}:</span>
                        <span className="text-muted-foreground">{nums.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                );
              },
            },
            { key: "apl", label: "APL", render: (value: number) => value.toFixed(2) },
            { key: "staked", label: "Staked", render: (value: number) => value.toFixed(0) },
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
              <Button variant="outline" title="Delete bet" size="sm" onClick={() => deleteBet(row)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        />
      </section>
    </div>
  );
}
