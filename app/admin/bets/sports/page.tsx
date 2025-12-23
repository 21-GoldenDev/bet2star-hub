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

type Player = { id: string; fullName: string; email: string };

type BaseBet = {
  id: string;
  betId: bigint;
  week: number;
  player?: Player;
  under: number;
  staked: number;
  terminal: string;
  betTime: string;
};

type Selection = { label: string; odds: number };

type SportsBet = BaseBet & {
  selections: Selection[];
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function pickOptionLabel(): string {
  const opts = ["H", "D", "A", "1X", "12", "O25", "U25", "GG"];
  return opts[Math.floor(Math.random() * opts.length)];
}

function randomMatchLabel(): string {
  const id = Math.floor(Math.random() * 30) + 1;
  const homes = ["City", "United", "Madrid", "Barca", "PSG", "Ajax", "Benfica", "Leeds", "LAFC", "Celtic", "Sydney"];
  const aways = ["Liverpool", "Arsenal", "Atletico", "Sevilla", "Marseille", "PSV", "Porto", "Leicester", "Seattle", "Rangers", "Melbourne"];
  const home = homes[Math.floor(Math.random() * homes.length)];
  const away = aways[Math.floor(Math.random() * aways.length)];
  return `${id}. ${home} vs ${away}`;
}

function generateSelections(count: number): Selection[] {
  return Array.from({ length: count }, () => {
    const label = `${randomMatchLabel()} — ${pickOptionLabel()}`;
    const odds = +(1.4 + Math.random() * 3).toFixed(2);
    return { label, odds };
  });
}

function formatDateIso(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

function calcApl(selections: Selection[]): string {
  if (!selections.length) return "-";
  const avg = selections.reduce((s, v) => s + v.odds, 0) / selections.length;
  return avg.toFixed(2);
}

function generateMockSportsBets(n = 60): SportsBet[] {
  const bets: SportsBet[] = [];
  for (let i = 0; i < n; i++) {
    const selectionCount = 1 + (i % 6); // 1-6 selections
    const selections = generateSelections(selectionCount);
    const isOffline = Math.random() <= 0.2;
    bets.push({
      id: uid() + i,
      betId: BigInt(10000 + i),
      week: 1 + (i % 4),
      player: !isOffline ? { id: uid(), fullName: `Player ${i + 1}`, email: `player${i + 1}@example.com` } : undefined,
      under: selections.length,
      selections,
      staked: +(Math.random() * 10000).toFixed(0),
      terminal: isOffline ? `T-${Math.floor(Math.random() * 9999)}` : "",
      betTime: new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30)).toISOString(),
    });
  }
  return bets;
}

export default function SportsPage() {
  const [dataSports, setDataSports] = useState<SportsBet[]>(() => generateMockSportsBets(60));

  const [weekFilter, setWeekFilter] = useState<number | "">("");
  const [rangeFilter, setRangeFilter] = useState<DateRange | undefined>(undefined);

  const weeksAll = useMemo(() => Array.from(new Set(dataSports.map((d) => d.week))).sort(), [dataSports]);

  const filteredAll = useMemo(() => {
    const fromTime = rangeFilter?.from ? new Date(rangeFilter.from).setHours(0, 0, 0, 0) : undefined;
    const toTime = rangeFilter?.to ? new Date(rangeFilter.to).setHours(23, 59, 59, 999) : undefined;
    return dataSports
      .filter((b) => {
        if (weekFilter !== "" && b.week !== weekFilter) return false;
        const bt = new Date(b.betTime).getTime();
        if (fromTime !== undefined && bt < fromTime) return false;
        if (toTime !== undefined && bt > toTime) return false;
        return true;
      })
      .map((b) => ({ ...b, apl: calcApl(b.selections) } as any));
  }, [dataSports, weekFilter, rangeFilter]);

  function deleteBet(row: SportsBet) {
    setDataSports((d) => d.filter((b) => b.id !== row.id));
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Bets — Sports</h1>
      <p className="text-sm text-muted-foreground mt-2">Manage sports bets here.</p>

      <section className="mt-6 space-y-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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

            <div className="md:col-span-3 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{filteredAll.length} results</div>
              <Button variant="outline" size="sm" onClick={() => { setWeekFilter(""); setRangeFilter(undefined); }}>
                Reset Filters
              </Button>
            </div>
          </div>
        </div>

        <DataTable
          title="Sports Bets"
          data={filteredAll}
          itemsPerPage={10}
          columns={[
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
              key: "selections",
              label: "Selections",
              render: (value: Selection[]) => (
                <div className="space-y-1">
                  {value.map((s, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium mr-1">{s.label.split(" — ")[1]} ({s.odds.toFixed(2)}):</span>
                      <span className="text-muted-foreground">{s.label.split(" — ")[0]}</span>
                    </div>
                  ))}
                </div>
              ),
            },
            { key: "apl", label: "APL" },
            { key: "staked", label: "Staked", render: (value: number) => value.toFixed(2) },
            { key: "terminal", label: "Terminal" },
            { key: "betTime", label: "Bet Time", render: (value: string) => formatDateIso(value) },
          ]}
          actions={(row) => (
            <Button variant="outline" size="sm" onClick={() => deleteBet(row as SportsBet)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        />
      </section>
    </div>
  );
}
