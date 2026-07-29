"use client";

import { useState } from "react";
import {
  formatSelectionGroupLabel,
  sortedSelectionGroupEntries,
} from "@/lib/bets/groupSelections";
import {
  calcSportsGroupedApl,
  flattenSportsMatchNumbers,
  isGroupedSportsSelections,
} from "@/lib/bets/sportsCombinations";
import { calcAplDirect, calcAplGrouping } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PublicBetProduct = "lotto" | "pools" | "sports" | "sports-draw";

type SportsMatchInfo = {
  league?: string;
  number: number;
  home: string;
  away: string;
  home_goal?: number | null;
  away_goal?: number | null;
  prizes?: number[];
  status?: string;
  start_time?: string;
  end_time?: string;
};

type PublicBet = {
  product: PublicBetProduct;
  betNumber: number;
  status: string;
  gameType: string | null;
  mode: string | null;
  under: unknown;
  numbers: unknown;
  matches: unknown;
  selections: unknown;
  staked: number;
  award: number;
  betTime: string | null;
  week: string;
  option: string | null;
  weekResult: Array<number | string>;
  sportsMatches: SportsMatchInfo[];
};

const PRODUCT_LABELS: Record<PublicBetProduct, string> = {
  lotto: "Lotto",
  pools: "Pools",
  sports: "Sports",
  "sports-draw": "Football Pool",
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

const compareMixed = (a: string | number, b: string | number) => {
  const aNum = Number(a);
  const bNum = Number(b);
  if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
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

const formatArrayText = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) return "-";
  return value.join(", ");
};

const formatMode = (mode?: string | null) => {
  if (!mode) return "-";
  const labels: Record<string, string> = {
    direct: "Direct",
    permutation: "Permutation",
    grouping: "Grouping",
    one_banker: "1 Against",
  };
  return labels[mode.toLowerCase()] || mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
};

const getGameLabel = (gameType?: string | null) => {
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

const getUnderValue = (gameType: string | null, under: unknown) => {
  if (gameType === "under1" || gameType === "under2") {
    return gameType.replace("under", "");
  }
  return formatArrayText(under);
};

const resolveApl = (bet: PublicBet) => {
  const staked = Number(bet.staked) || 0;

  if (bet.product === "sports" || bet.product === "sports-draw") {
    const selections = bet.selections as Record<string, unknown> | undefined;
    if (selections && isGroupedSportsSelections(selections as never)) {
      const groups: Record<string, string[]> = {};
      for (const [key, group] of Object.entries(selections)) {
        groups[key] = Object.keys(group as Record<string, unknown>);
      }
      return calcSportsGroupedApl(staked, groups);
    }
    const flatCount = flattenSportsMatchNumbers((selections || {}) as never).length;
    if (flatCount > 0 && Array.isArray(bet.under)) {
      return calcAplDirect(staked, bet.under as number[], flatCount);
    }
    return staked;
  }

  const gameType = (bet.gameType || "").toLowerCase();
  if (["turbo", "under1", "under2"].includes(gameType)) {
    return staked;
  }

  if (bet.product === "lotto") {
    if (Array.isArray(bet.numbers)) {
      return calcAplDirect(staked, Array.isArray(bet.under) ? (bet.under as number[]) : [], bet.numbers.length);
    }
    if (bet.numbers && typeof bet.numbers === "object") {
      return calcAplGrouping(staked, bet.numbers as Record<string, string[] | number[]>);
    }
  }

  if (bet.product === "pools") {
    if (Array.isArray(bet.matches)) {
      return calcAplDirect(staked, Array.isArray(bet.under) ? (bet.under as number[]) : [], bet.matches.length);
    }
    if (bet.matches && typeof bet.matches === "object") {
      return calcAplGrouping(staked, bet.matches as Record<string, string[] | number[]>);
    }
  }

  return staked;
};

const renderStatus = (status?: string) => {
  const normalized = (status || "active").toLowerCase();
  const isVoid = normalized === "void";
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
        isVoid ? "bg-gray-500 text-white" : "bg-green-600 text-white"
      }`}
    >
      {isVoid ? "VOID" : normalized.toUpperCase()}
    </span>
  );
};

const renderDetailedSelection = (bet: PublicBet) => {
  const value = bet.product === "lotto" ? bet.numbers : bet.product === "pools" ? bet.matches : bet.selections;

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
        {sortedSelectionGroupEntries(value as Record<string, unknown>).map(([gid, items], index) => {
          const list = Array.isArray(items) ? [...items] : [];
          list.sort((a, b) => compareMixed(a as string | number, b as string | number));

          return (
            <div key={gid} className="space-y-2">
              <p className="text-sm font-semibold">
                {formatSelectionGroupLabel(gid, index)}: Under {gid.split("-")[0] || "-"}
              </p>
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

const renderSportsSelectionDetails = (bet: PublicBet) => {
  const selections = bet.selections;
  const optionLabels = bet.product === "sports-draw" ? sportsDrawOptionLabels : sportsOptionLabels;
  const matchList = bet.sportsMatches || [];

  if (selections && isGroupedSportsSelections(selections as never)) {
    return (
      <div className="space-y-4">
        {sortedSelectionGroupEntries(selections as Record<string, Record<string, string[]>>).map(
          ([gid, group], index) => (
            <div key={gid} className="space-y-2">
              <p className="text-sm font-semibold">
                {formatSelectionGroupLabel(gid, index)}: Under {gid.split("-")[0] || "-"}
              </p>
              <div className="space-y-2 ml-2">
                {Object.entries(group).map(([matchNum, options]) => {
                  const match = matchList.find((item) => item.number.toString() === matchNum.toString());
                  return (
                    <div key={matchNum} className="border rounded-md p-3 bg-card text-sm">
                      <span className="font-semibold text-primary">#{matchNum}</span>
                      {match && (
                        <span className="text-muted-foreground ml-2">
                          {match.home} vs {match.away}
                        </span>
                      )}
                      <div className="mt-1 flex gap-2">
                        {(options as string[]).map((opt) => (
                          <span
                            key={opt}
                            className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-xs"
                          >
                            {optionLabels[opt] || opt}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ),
        )}
      </div>
    );
  }

  const flatSelections = (selections && typeof selections === "object" ? selections : {}) as Record<
    string,
    string[]
  >;

  return (
    <div className="space-y-2">
      {Object.entries(flatSelections)
        .map(([matchNum, odds]) => {
          const match = matchList.find((item) => item.number.toString() === matchNum.toString());
          return { matchNum, odds, match };
        })
        .sort((a, b) => {
          if (!a.match?.start_time || !b.match?.start_time) return 0;
          return new Date(a.match.start_time).getTime() - new Date(b.match.start_time).getTime();
        })
        .map(({ matchNum, odds, match }) => (
          <div key={matchNum} className="border rounded-md p-3 bg-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    #{matchNum}
                  </span>
                  {match && (
                    <>
                      <span className="text-xs text-muted-foreground truncate">{match.league}</span>
                      {match.start_time && (
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
                      )}
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
                  const price =
                    bet.product === "sports-draw"
                      ? (match?.prizes?.[0] ?? "—")
                      : priceIndex >= 0
                        ? (match?.prizes?.[priceIndex] ?? "—")
                        : "—";

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

export default function CheckBetTicket({
  variant = "page",
  className,
  onChecked,
}: {
  variant?: "page" | "navbar" | "mobile";
  className?: string;
  onChecked?: () => void;
}) {
  const [betId, setBetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bet, setBet] = useState<PublicBet | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleCheck = async (event?: React.FormEvent) => {
    event?.preventDefault();

    const trimmed = betId.trim();
    if (!trimmed) {
      setError("Insert a valid Bet ID to check status.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/bets/lookup?betId=${encodeURIComponent(trimmed)}`, {
        method: "GET",
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        setBet(null);
        setError(result?.error || "No bet found for this Bet ID");
        setIsOpen(false);
        return;
      }

      setBet(result.bet as PublicBet);
      setIsOpen(true);
      onChecked?.();
    } catch {
      setBet(null);
      setError("Failed to check bet. Please try again.");
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const apl = bet ? resolveApl(bet) : null;

  return (
    <>
      {variant === "page" ? (
        <section className={className ?? "px-4 pb-8"}>
          <div className="container mx-auto max-w-2xl">
            <form onSubmit={handleCheck} className="space-y-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Check bet:</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Insert a valid Bet ID to check status.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={betId}
                  onChange={(e) => {
                    setBetId(e.target.value);
                    if (error) setError(null);
                  }}
                  inputMode="numeric"
                  placeholder="Bet ID"
                  className="h-11 bg-background text-foreground border-border"
                  aria-label="Bet ID"
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 px-8 bg-green-600 hover:bg-green-700 text-white font-semibold shrink-0"
                >
                  {loading ? "Checking..." : "Check"}
                </Button>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </form>
          </div>
        </section>
      ) : (
        <form
          onSubmit={handleCheck}
          className={
            className ??
            (variant === "navbar"
              ? "hidden lg:flex flex-col gap-1 min-w-[220px]"
              : "flex flex-col gap-2 w-full")
          }
        >
          <div className={variant === "navbar" ? "leading-tight" : "px-1"}>
            <p className={variant === "navbar" ? "text-sm font-bold text-foreground" : "text-sm font-semibold text-foreground"}>
              Check bet:
            </p>
            <p className={variant === "navbar" ? "text-[11px] text-muted-foreground" : "text-xs text-muted-foreground mt-0.5"}>
              Insert a valid Bet ID to check status.
            </p>
          </div>
          <div className={variant === "navbar" ? "flex items-center gap-2" : "flex gap-2 w-full"}>
            <Input
              value={betId}
              onChange={(e) => {
                setBetId(e.target.value);
                if (error) setError(null);
              }}
              inputMode="numeric"
              placeholder="Bet ID"
              className={
                variant === "navbar"
                  ? "h-8 w-28 xl:w-36 bg-background text-foreground border-border"
                  : "h-10 flex-1 bg-background text-foreground border-border"
              }
              aria-label="Bet ID"
            />
            <Button
              type="submit"
              disabled={loading}
              size="sm"
              className={
                variant === "navbar"
                  ? "h-8 px-3 bg-green-600 hover:bg-green-700 text-white font-semibold shrink-0"
                  : "h-10 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold shrink-0"
              }
            >
              {loading ? "..." : "Check"}
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bet Ticket</DialogTitle>
            <DialogDescription>
              Bet #{bet?.betNumber}
              {bet ? ` · ${PRODUCT_LABELS[bet.product]}` : ""}
            </DialogDescription>
          </DialogHeader>

          {bet && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Bet ID</Label>
                  <p className="mt-1 font-medium">{bet.betNumber}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Product</Label>
                  <p className="mt-1 font-medium">{PRODUCT_LABELS[bet.product]}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Game Type</Label>
                  <p className="mt-1 font-medium">
                    {bet.product === "sports" || bet.product === "sports-draw"
                      ? formatMode(bet.mode)
                      : getGameLabel(bet.gameType)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                  <p className="mt-1">{renderStatus(bet.status)}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Bet Time</Label>
                  <p className="mt-1 font-medium text-sm">{formatDateTime(bet.betTime)}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <Label className="text-xs font-semibold text-muted-foreground block mb-3">
                  {bet.product === "lotto"
                    ? "Numbers"
                    : bet.product === "pools"
                      ? "Matches"
                      : "Selections"}
                </Label>
                {bet.product === "sports" || bet.product === "sports-draw"
                  ? renderSportsSelectionDetails(bet)
                  : renderDetailedSelection(bet)}
              </div>

              <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Under</Label>
                  <p className="mt-1 font-medium">{getUnderValue(bet.gameType, bet.under)}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Week</Label>
                  <p className="mt-1 font-medium">{bet.week || "-"}</p>
                </div>
              </div>

              {(bet.product === "lotto" || bet.product === "pools") && (
                <div className="border-t border-border pt-4">
                  <Label className="text-xs font-semibold text-muted-foreground block mb-3">
                    Week Result
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {bet.weekResult.length > 0 ? (
                      bet.weekResult.map((num, idx) => (
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

              <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Staked</Label>
                  <p className="mt-1 font-medium text-lg">{Number(bet.staked).toFixed(0)}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">APL</Label>
                  <p className="mt-1 font-medium text-lg">
                    {apl !== null ? apl.toFixed(2) : "-"}
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Option</Label>
                  <p className="mt-1 font-medium text-nowrap">
                    {bet.product === "lotto" || bet.product === "pools"
                      ? bet.option || "-"
                      : formatMode(bet.mode)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Award</Label>
                  <p className="mt-1 font-medium text-lg">{Number(bet.award).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

