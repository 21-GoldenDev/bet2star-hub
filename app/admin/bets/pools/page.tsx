"use client";

import { useMemo, useState } from "react";
import DataTable from "@/components/admin/DataTable";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { Trash2 } from "lucide-react";
import { calcAplDirect, calcAplGrouping } from "@/lib/helpers";

type Player = { id: string; fullName: string; email: string };

type BaseBet = {
  id: string; // uuid, database only (not displayed)
  betId: bigint; // auto-increment
  week: number;
  player?: Player; // offline players may not have user
  under: number[];
  staked: number;
  terminal: string;
  betTime: string; // ISO
  prize?: string; // optional prize/category for pools
};

type DirectBet = BaseBet & {
  gameType: "direct";
  matches: string[];
};

type GroupingBet = BaseBet & {
  gameType: "grouping";
  matches: Record<string, string[]>; // groupId -> matches
};

type TwoBankerBet = BaseBet & {
  gameType: "two_banker";
  matches: Record<string, string[]>; // groupId -> banker pairs (as strings)
};

const samplePrizes = ["40_1A", "100_1"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function generateUValues(len: number, maxSum = 7): number[] {
  if (len < 2) len = 2;
  let vals: number[] = [];
  do {
    vals = Array.from({ length: len }, () => 1 + Math.floor(Math.random() * 6));
  } while (vals.reduce((s, v) => s + v, 0) < 2 || vals.reduce((s, v) => s + v, 0) > maxSum);
  return vals;
}

function generateMockDirectBets(n = 36): DirectBet[] {
  const bets: DirectBet[] = [];
  for (let i = 0; i < n; i++) {
    const count = 6; // sample size
    const matches = Array.from({ length: count }, () => String(Math.floor(Math.random() * 49) + 1)).sort((a, b) => Number(a) - Number(b));
    const isOffline = Math.random() <= 0.2;
    const underValues = generateUValues(2 + (i % 2), 7);
    bets.push({
      gameType: "direct",
      id: uid() + i,
      betId: BigInt(1000 + i),
      week: 1 + (i % 4),
      player: !isOffline ? { id: uid(), fullName: `Player ${i + 1}`, email: `player${i + 1}@example.com` } : undefined,
      under: underValues,
      matches,
      staked: +(Math.random() * 10000).toFixed(0),
      terminal: isOffline ? `T-${Math.floor(Math.random() * 9999)}` : "",
      betTime: new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30)).toISOString(),
      prize: samplePrizes[i % samplePrizes.length],
    });
  }
  return bets;
}

function generateMockGroupingBets(n = 24): GroupingBet[] {
  const bets: GroupingBet[] = [];
  for (let i = 0; i < n; i++) {
    const isOffline = Math.random() <= 0.2;
    const groupCount = 2 + (i % 2); // ensure length >= 2 (2 or 3)
    const uValues = generateUValues(groupCount, 7); // each 1-6; sum 2-7
    const groups: Record<string, string[]> = {};
    for (let g = 0; g < groupCount; g++) {
      const count = 3 + (g % 3); // 3-5 matches per group (sample)
      const ms = Array.from({ length: count }, () => String(Math.floor(Math.random() * 49) + 1)).sort((a, b) => Number(a) - Number(b));
      const dt = new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7)).toISOString();
      groups[`${uValues[g]}-${dt}`] = ms;
    }
    bets.push({
      gameType: "grouping",
      id: uid() + "g" + i,
      betId: BigInt(2000 + i),
      week: 1 + (i % 4),
      player: !isOffline ? { id: uid(), fullName: `Player ${i + 1}`, email: `player${i + 1}@example.com` } : undefined,
      under: [uValues.reduce((s, v) => s + v, 0)],
      matches: groups,
      staked: +(Math.random() * 10000).toFixed(0),
      terminal: isOffline ? `T-${Math.floor(Math.random() * 9999)}` : "",
      betTime: new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30)).toISOString(),
      prize: samplePrizes[i % samplePrizes.length],
    });
  }
  return bets;
}

function generateMockTwoBankerBets(n = 24): TwoBankerBet[] {
  const bets: TwoBankerBet[] = [];
  for (let i = 0; i < n; i++) {
    const isOffline = Math.random() <= 0.2;
    const groups: Record<string, string[]> = {};
    const under = Math.floor(Math.random() * 5) + 2;
    const u1 = under > 2 ? Math.floor(Math.random() * 2) + 1 : 1;
    const uValues = [u1, under - u1];
    for (let g = 0; g < 2; g++) {
      const ms = Array.from({ length: 2 }, () => String(Math.floor(Math.random() * 49) + 1)).sort((a, b) => Number(a) - Number(b));
      const dt = new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7)).toISOString();
      groups[`${uValues[g]}-${dt}`] = ms;
    }
    bets.push({
      gameType: "two_banker",
      id: uid() + "b" + i,
      betId: BigInt(3000 + i),
      week: 1 + (i % 4),
      player: !isOffline ? { id: uid(), fullName: `Player ${i + 1}`, email: `player${i + 1}@example.com` } : undefined,
      under: [under],
      matches: groups,
      staked: +(Math.random() * 10000).toFixed(0),
      terminal: isOffline ? `T-${Math.floor(Math.random() * 9999)}` : "",
      betTime: new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30)).toISOString(),
      prize: samplePrizes[i % samplePrizes.length],
    });
  }
  return bets;
}

function formatDateIso(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

export default function PoolsPage() {
  // Data per game type
  const [dataDirect, setDataDirect] = useState<DirectBet[]>(() => generateMockDirectBets(42));
  const [dataGrouping, setDataGrouping] = useState<GroupingBet[]>(() => generateMockGroupingBets(24));
  const [dataTwo, setDataTwo] = useState<TwoBankerBet[]>(() => generateMockTwoBankerBets(24));

  // Unified filters
  const [weekFilter, setWeekFilter] = useState<number | "">("");
  const [prizeFilter, setPrizeFilter] = useState<string | "">("");
  const [gameFilter, setGameFilter] = useState<
    | "all"
    | DirectBet["gameType"]
    | GroupingBet["gameType"]
    | TwoBankerBet["gameType"]
  >("all");
  const [rangeFilter, setRangeFilter] = useState<DateRange | undefined>(undefined);

  const allData = useMemo(() => [...dataDirect, ...dataGrouping, ...dataTwo], [dataDirect, dataGrouping, dataTwo]);
  const weeksAll = useMemo(() => Array.from(new Set(allData.map((d) => d.week))).sort(), [allData]);
  const prizesAll = useMemo(
    () => Array.from(new Set(allData.map((d) => d.prize).filter(Boolean) as string[])).sort(),
    [allData]
  );
  const gameOptions: Array<{ value: string; label: string }> = [
    { value: "all", label: "All games" },
    { value: "direct", label: "Direct" },
    { value: "grouping", label: "Grouping" },
    { value: "two_banker", label: "2 Banker" },
  ];

  const filteredAll = useMemo(() => {
    const fromTime = rangeFilter?.from ? new Date(rangeFilter.from).setHours(0, 0, 0, 0) : undefined;
    const toTime = rangeFilter?.to ? new Date(rangeFilter.to).setHours(23, 59, 59, 999) : undefined;
    return allData
      .filter((b) => {
        if (weekFilter !== "" && b.week !== weekFilter) return false;
        if (prizeFilter !== "" && b.prize !== prizeFilter) return false;
        if (gameFilter !== "all" && b.gameType !== gameFilter) return false;
        const bt = new Date(b.betTime).getTime();
        if (fromTime !== undefined && bt < fromTime) return false;
        if (toTime !== undefined && bt > toTime) return false;
        return true;
      })
      .map((b) => {
        if (b.gameType === "direct") {
          return { ...b, apl: calcAplDirect(b.staked, b.under, b.matches.length) } as any;
        }
        return { ...b, apl: calcAplGrouping(b.staked, b.matches) } as any;
      });
  }, [allData, weekFilter, prizeFilter, gameFilter, rangeFilter]);

  function deleteDirect(id: string) {
    setDataDirect((d) => d.filter((b) => b.id !== id));
  }

  function deleteGrouping(id: string) {
    setDataGrouping((d) => d.filter((b) => b.id !== id));
  }

  function deleteTwo(id: string) {
    setDataTwo((d) => d.filter((b) => b.id !== id));
  }

  function deleteBet(row: DirectBet | GroupingBet | TwoBankerBet) {
    if (row.gameType === "direct") {
      deleteDirect(row.id);
    } else if (row.gameType === "grouping") {
      deleteGrouping(row.id);
    } else {
      deleteTwo(row.id);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Bets — Pools</h1>
      <p className="text-sm text-muted-foreground mt-2">Manage pool bets here.</p>

      <section className="mt-6 space-y-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <Label>Game</Label>
              <Select
                value={gameFilter}
                onValueChange={(val) => setGameFilter(val as typeof gameFilter)}
              >
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

            <div>
              <Label>Prize</Label>
              <Select
                value={prizeFilter || undefined}
                onValueChange={(val) => setPrizeFilter(val === "all" ? "" : val)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All prizes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {prizesAll.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
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
              <div className="text-sm text-muted-foreground">{filteredAll.length} results</div>
              <Button variant="outline" size="sm" onClick={() => { setGameFilter("all"); setWeekFilter(""); setPrizeFilter(""); setRangeFilter(undefined); }}>
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
            { key: "gameType", label: "Game", render: (value: string) => (value === "direct" ? "Direct" : value === "grouping" ? "Grouping" : "2 Banker") },
            { key: "betId", label: "Bet#", render: (value: bigint) => value.toString() },
            { key: "week", label: "Week" },
            {
              key: "player",
              label: "Player",
              render: (_: Player | undefined, row) =>
                row.player ? (
                  <div>
                    <div className="font-medium">{row.player.fullName}</div>
                    <div className="text-xs text-muted-foreground">{row.player.email}</div>
                  </div>
                ) : (
                  <div>Agent</div>
                ),
            },
            { key: "under", label: "Under" },
            {
              key: "matches",
              label: "Matches",
              render: (value: string[] | Record<string, string[]>) => {
                if (Array.isArray(value)) {
                  return value.join(", ");
                }
                return (
                  <div className="space-y-1">
                    {Object.entries(value).map(([gid, ms]) => (
                      <div key={gid} className="text-sm">
                        <span className="font-medium mr-1">{gid.split('-')[0]}:</span>
                        <span className="text-muted-foreground">{ms.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                );
              },
            },
            { key: "apl", label: "APL", render: (value: number) => value.toFixed(2) },
            { key: "prize", label: "Prize" },
            { key: "staked", label: "Staked", render: (value: number) => value.toFixed(0) },
            { key: "terminal", label: "Terminal" },
            { key: "betTime", label: "Bet Time", render: (value: string) => formatDateIso(value) },
          ]}
          actions={(row) => (
            <Button variant="outline" size="sm" onClick={() => deleteBet(row)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        />
      </section>
    </div>
  );
}
