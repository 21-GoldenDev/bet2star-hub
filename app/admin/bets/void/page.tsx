"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/admin/DataTable";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Trash2, RotateCcw, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface DeletedBet {
  id: string;
  betId?: bigint;
  number?: number;
  gameType?: string;
  mode?: string;
  player?: {
    fullName: string;
    userName: string;
  };
  staked: number;
  award: number;
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

  useEffect(() => {
    fetchVoidBets();
  }, []);

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

  const commonColumns: {
    key: keyof DeletedBet;
    label: string;
    render?: (value: any) => React.ReactNode
  }[] = [
      {
        key: "player",
        label: "Player",
        render: (player: any) =>
          player ? (
            <div>
              <div className="font-medium">{player.fullName}</div>
              <div className="text-xs text-muted-foreground">{player.userName}</div>
            </div>
          ) : (
            <div>Agent</div>
          ),
      },
      { key: "staked", label: "Staked", render: (value: number) => value.toFixed(2) },
      { key: "award", label: "Award", render: (value: number) => value.toFixed(2) },
      {
        key: "terminal",
        label: "Terminal",
        render: (value: { serial_number: string } | undefined) => value?.serial_number || "—"
      },
      { key: "deletedAt", label: "Deleted At", render: (value: string) => formatDateIso(value) },
    ];

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
            data={lottoBets}
            itemsPerPage={10}
            columns={[
              { key: "gameType", label: "Game", render: (value: string) => getGameLabel(value) },
              { key: "betId", label: "Bet#", render: (value: bigint) => value?.toString() || "-" },
              ...commonColumns,
              { key: "betTime", label: "Bet Time", render: (value: string) => formatDateIso(value) },
            ]}
            actions={(row) => renderActions(row, "lotto")}
          />
        </TabsContent>

        <TabsContent value="pools" className="mt-4">
          <DataTable
            title="Pools Bets"
            data={poolsBets}
            itemsPerPage={10}
            columns={[
              { key: "gameType", label: "Game", render: (value: string) => getGameLabel(value) },
              { key: "betId", label: "Bet#", render: (value: bigint) => value?.toString() || "-" },
              ...commonColumns,
              { key: "betTime", label: "Bet Time", render: (value: string) => formatDateIso(value) },
            ]}
            actions={(row) => renderActions(row, "pools")}
          />
        </TabsContent>

        <TabsContent value="sports" className="mt-4">
          <DataTable
            title="Sports Bets"
            data={sportsBets}
            itemsPerPage={10}
            columns={[
              { key: "number", label: "Bet ID" },
              { key: "mode", label: "Mode", render: (value: string) => <div className="capitalize">{value}</div> },
              ...commonColumns,
              { key: "bet_time", label: "Bet Time", render: (value: string) => formatDateIso(value) },
            ]}
            actions={(row) => renderActions(row, "sports")}
          />
        </TabsContent>

        <TabsContent value="sports-draw" className="mt-4">
          <DataTable
            title="Football Pool Bets"
            data={sportsDrawBets}
            itemsPerPage={10}
            columns={[
              { key: "number", label: "Bet ID" },
              { key: "mode", label: "Mode", render: (value: string) => <div className="capitalize">{value}</div> },
              ...commonColumns,
              { key: "bet_time", label: "Bet Time", render: (value: string) => formatDateIso(value) },
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
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Bet Type</Label>
                  <p className="mt-1 font-medium capitalize">{selectedBet.type}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Bet ID</Label>
                  <p className="mt-1 font-medium">
                    {selectedBet.bet.betId?.toString() || selectedBet.bet.number || "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">
                    {selectedBet.type === "sports" ? "Mode" : "Game Type"}
                  </Label>
                  <p className="mt-1 font-medium capitalize">
                    {selectedBet.type === "sports"
                      ? selectedBet.bet.mode
                      : getGameLabel(selectedBet.bet.gameType || "")}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                  <p className="mt-1">
                    <span className="text-red-600 font-medium">Deleted</span>
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Bet Time</Label>
                  <p className="mt-1 font-medium text-sm">
                    {formatDateIso(selectedBet.bet.betTime || selectedBet.bet.bet_time)}
                  </p>
                </div>
              </div>

              {/* Player Info */}
              <div className="border-t pt-4">
                <Label className="text-xs font-semibold text-muted-foreground block mb-2">Player</Label>
                {selectedBet.bet.player ? (
                  <div>
                    <p className="font-medium">{selectedBet.bet.player.fullName}</p>
                    <p className="text-sm text-muted-foreground">{selectedBet.bet.player.userName}</p>
                  </div>
                ) : (
                  <p className="font-medium">Agent</p>
                )}
              </div>

              {/* Content based on bet type */}
              {(selectedBet.type === "lotto" || selectedBet.type === "pools") && selectedBet.bet.numbers && (
                <div className="border-t pt-4">
                  <Label className="text-xs font-semibold text-muted-foreground block mb-3">
                    {selectedBet.type === "lotto" ? "Numbers" : "Matches"}
                  </Label>
                  {Array.isArray(selectedBet.bet.numbers || selectedBet.bet.matches) ? (
                    <div className="flex flex-wrap gap-2">
                      {(selectedBet.bet.numbers as number[] || selectedBet.bet.matches as string[] || [])
                        .sort((a, b) => {
                          if (typeof a === "number" && typeof b === "number") return a - b;
                          return String(a).localeCompare(String(b));
                        })
                        .map((item, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded bg-primary/10 border border-primary/20 text-sm font-medium"
                          >
                            {item}
                          </span>
                        ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries((selectedBet.bet.numbers || selectedBet.bet.matches) as Record<string, any[]>).map(([gid, items], index) => (
                        <div key={gid} className="space-y-2">
                          <p className="text-sm font-semibold">Group {index + 1}: Under {gid.split("-")[0]}</p>
                          <div className="flex flex-wrap gap-2 ml-2">
                            {items
                              .sort((a, b) => {
                                if (typeof a === "number" && typeof b === "number") return a - b;
                                return String(a).localeCompare(String(b));
                              })
                              .map((item, idx) => (
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
                  )}
                </div>
              )}

              {selectedBet.type === "sports" && selectedBet.bet.selections && (
                <div className="border-t pt-4">
                  <Label className="text-xs font-semibold text-muted-foreground block mb-3">Selections</Label>
                  <div className="space-y-2">
                    {Object.entries(selectedBet.bet.selections)
                      .map(([matchNum, odds]) => {
                        const matches = dataMatches[selectedBet.bet.game_id || ""] || [];
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
                            {/* Left: Match Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">#{matchNum}</span>
                                {match && (
                                  <>
                                    <span className="text-xs text-muted-foreground truncate">{match.league}</span>
                                    <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                                      {new Date(match.start_time).toLocaleString(undefined, {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false,
                                      })}
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Teams & Score */}
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

                            {/* Right: Bet Selections */}
                            <div className="flex flex-col gap-1 items-end">
                              {(odds || []).map((opt: string, idx: number) => {
                                const label = optionLabels[opt] || opt;
                                return (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-semibold whitespace-nowrap"
                                  >
                                    {label}:{" "}
                                    {match?.prizes?.[Object.keys(optionLabels).indexOf(opt)]
                                      ? match.prizes[Object.keys(optionLabels).indexOf(opt)]
                                      : "—"}
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

              {/* Under & Terminal */}
              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Under</Label>
                  <p className="mt-1 font-medium">
                    {Array.isArray(selectedBet.bet.under)
                      ? selectedBet.bet.under.length > 0
                        ? selectedBet.bet.under.join(", ")
                        : "-"
                      : selectedBet.bet.under || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Terminal</Label>
                  <p className="mt-1 font-medium">
                    {(selectedBet.bet.terminal as any)?.serial_number || "—"}
                  </p>
                </div>
              </div>

              {/* Financial Info */}
              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Staked</Label>
                  <p className="mt-1 font-medium text-lg">{selectedBet.bet.staked.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Award</Label>
                  <p className="mt-1 font-medium text-lg">{selectedBet.bet.award.toFixed(2)}</p>
                </div>
              </div>

              {/* Prize (if available) */}
              {selectedBet.bet.prize && (
                <div className="border-t pt-4">
                  <Label className="text-xs font-semibold text-muted-foreground">Prize</Label>
                  <p className="mt-1 font-medium">{selectedBet.bet.prize.name}</p>
                </div>
              )}

              {/* Deleted At */}
              <div className="border-t pt-4">
                <Label className="text-xs font-semibold text-muted-foreground">Deleted At</Label>
                <p className="mt-1 font-medium text-sm">{formatDateIso(selectedBet.bet.deletedAt)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
