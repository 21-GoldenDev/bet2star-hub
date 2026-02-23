"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/admin/DataTable";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Eye } from "lucide-react";
import { SportsBet } from "@/lib/types/sports-bet";
import { useToast } from "@/hooks/use-toast";

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
  D: "X",
};

export default function SportsDrawPage() {
  const [dataSports, setDataSports] = useState<SportsBet[]>([]);
  const [dataMatches, setDataMatches] = useState<Record<string, MatchInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [weekFilter, setWeekFilter] = useState<number | "">("");
  const [weeksAll, setWeeksAll] = useState<number[]>([]);
  const { toast } = useToast();
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [betToDelete, setBetToDelete] = useState<SportsBet | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedBet, setSelectedBet] = useState<SportsBet | null>(null);

  useEffect(() => {
    async function fetchWeeks() {
      try {
        const response = await fetch("/api/admin/bets/sports-draw/weeks");
        const data = await response.json();

        if (data.data && data.data.length > 0) {
          setWeeksAll(data.data.map((g: any) => g.week));
          if (data.latest) {
            setWeekFilter(data.latest);
          }
        }
      } catch (error) {
        console.error("Error fetching sports draw weeks:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchWeeks();
  }, []);

  async function fetchBets() {
    if (weekFilter === "") {
      setDataSports([]);
      return;
    }

    try {
      const response = await fetch(`/api/admin/bets/sports-draw?week=${weekFilter}`);
      const data = await response.json();
      setDataSports(data.bets || []);
      setDataMatches(data.matches || {});
    } catch (error) {
      console.error("Error fetching sports draw bets:", error);
    }
  }

  useEffect(() => {
    if (!loading) {
      fetchBets();
    }
  }, [weekFilter, loading]);

  const openDeleteDialog = (row: SportsBet) => {
    setBetToDelete(row);
    setIsDeleteAlertOpen(true);
  };

  async function deleteBet() {
    if (!betToDelete) return;

    try {
      const response = await fetch(`/api/admin/bets/sports-draw/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: betToDelete.id }),
      });

      if (!response.ok) throw new Error("Failed to delete");
      setDataSports((d) => d.filter((b) => b.id !== betToDelete.id));
      toast({
        title: "Success",
        description: "Sports Draw bet deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting sports draw bet:", error);
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

  function renderStatus(status: string | undefined) {
    switch (status) {
      case "active": return <span className="text-green-600 font-medium">Active</span>;
      case "void": return <span className="text-red-600 font-medium">Void</span>;
      default: return <span className="text-muted-foreground">N/A</span>;
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Bets — Sports Draw</h1>
      <p className="text-sm text-muted-foreground mt-2">Manage sports draw bets here.</p>

      <section className="mt-6 space-y-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <Label>Week</Label>
              <Select
                value={weekFilter === "" ? undefined : String(weekFilter)}
                onValueChange={(val) => setWeekFilter(val === "all" ? "" : Number(val))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  {weeksAll.map((w) => (
                    <SelectItem key={w} value={String(w)}>
                      Week {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{dataSports.length} results</div>
              <Button variant="outline" size="sm" onClick={() => setWeekFilter("")}>
                Reset Filters
              </Button>
            </div>
          </div>
        </div>

        <DataTable
          title="Sports Draw Bets"
          data={dataSports}
          itemsPerPage={10}
          columns={[
            { key: "number", label: "Bet ID" },
            {
              key: "player",
              label: "Player",
              render: (player) =>
                player ? (
                  <div>
                    <div className="font-medium">{player.fullName}</div>
                    <div className="text-xs text-muted-foreground">{player.userName}</div>
                  </div>
                ) : (
                  <div>Agent</div>
                ),
            },
            { key: "mode", label: "Mode", render: (value: string) => <div className="capitalize">{value}</div> },
            { key: "under", label: "Under" },
            { key: "staked", label: "Staked", render: (value: number) => value.toFixed(2) },
            {
              key: "award",
              label: "Award",
              render: (value: number) => value ? value.toFixed(2) : "0.00"
            },
            { key: "terminal", label: "Terminal", render: (value: { serial_number: string } | undefined) => value ? value.serial_number : "—" },
            { key: "status", label: "Status", render: renderStatus },
            { key: "bet_time", label: "Bet Time", render: (value: string) => formatDateIso(value) },
          ]}
          actions={(row) => (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                title="View details"
                size="sm"
                onClick={() => {
                  setSelectedBet(row as SportsBet);
                  setIsDetailsOpen(true);
                }}
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button variant="outline" title="Delete bet" size="sm" onClick={() => openDeleteDialog(row as SportsBet)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        />
      </section>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bet?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete bet #{betToDelete?.number.toString()}?
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

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bet Details</DialogTitle>
            <DialogDescription>
              Bet #{selectedBet?.number}
            </DialogDescription>
          </DialogHeader>

          {selectedBet && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Bet ID</Label>
                  <p className="mt-1 font-medium">{selectedBet.number}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Mode</Label>
                  <p className="mt-1 font-medium capitalize">{selectedBet.mode}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                  <p className="mt-1">{renderStatus(selectedBet.status)}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Bet Time</Label>
                  <p className="mt-1 font-medium text-sm">{formatDateIso(selectedBet.bet_time)}</p>
                </div>
              </div>

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

              <div className="border-t pt-4">
                <Label className="text-xs font-semibold text-muted-foreground block mb-3">Selections</Label>
                <div className="space-y-2">
                  {Object.entries(selectedBet.selections || {})
                    .map(([matchNum, odds]) => {
                      const matches = dataMatches[selectedBet.game_id] || [];
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
                              return (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-semibold whitespace-nowrap"
                                >
                                  {label}: {match?.prizes?.[0] ? match.prizes[0] : "—"}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Under</Label>
                  <p className="mt-1 font-medium">{selectedBet.under || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Terminal</Label>
                  <p className="mt-1 font-medium">
                    {(selectedBet.terminal as any)?.serial_number || "—"}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Staked</Label>
                  <p className="mt-1 font-medium text-lg">{selectedBet.staked.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Award</Label>
                  <p className="mt-1 font-medium text-lg">{selectedBet.award ? selectedBet.award.toFixed(2) : "0.00"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
