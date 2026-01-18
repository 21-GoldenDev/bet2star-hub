"use client";

import { useEffect, useState } from "react";
import DataTable from "@/components/admin/DataTable";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, XCircle } from "lucide-react";
import { SportsBet } from "@/lib/types/sports-bet";
import { useToast } from "@/hooks/use-toast";

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

export default function SportsPage() {
  const [dataSports, setDataSports] = useState<SportsBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekFilter, setWeekFilter] = useState<number | "">("");
  const [weeksAll, setWeeksAll] = useState<number[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchWeeks() {
      try {
        const response = await fetch("/api/admin/bets/sports/weeks");
        const data = await response.json();

        if (data.weeks && data.weeks.length > 0) {
          setWeeksAll(data.weeks);
          if (data.latest) {
            setWeekFilter(data.latest);
          }
        }
      } catch (error) {
        console.error("Error fetching weeks:", error);
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
      const response = await fetch(`/api/admin/bets/sports?week=${weekFilter}`);
      const data = await response.json();
      setDataSports(data.bets || []);
    } catch (error) {
      console.error("Error fetching bets:", error);
    }
  }

  useEffect(() => {
    if (!loading) {
      fetchBets();
    }
  }, [weekFilter, loading]);

  async function voidBet(betId: string) {
    try {
      const response = await fetch(`/api/admin/bets/sports/void`, {
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

  async function deleteBet(row: SportsBet) {
    try {
      const response = await fetch(`/api/admin/bets/sports?id=${row.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");
      setDataSports((d) => d.filter((b) => b.id !== row.id));
    } catch (error) {
      console.error("Error deleting bet:", error);
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
      <h1 className="text-2xl font-bold">Bets — Sports</h1>
      <p className="text-sm text-muted-foreground mt-2">Manage sports bets here.</p>

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
          title="Sports Bets"
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
            { key: "under", label: "Under" },
            {
              key: "selections",
              label: "Selections",
              render: (value: Record<number, string[]>) => (
                <div className="space-y-1">
                  {Object.entries(value || {}).map(([match, odds], idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-medium mr-1">Match {match}:</span>
                      <span className="text-muted-foreground">{(odds || []).map((opt) => optionLabels[opt]).filter(Boolean).join(", ")}</span>
                    </div>
                  ))}
                </div>
              ),
            },
            { key: "staked", label: "Staked", render: (value: number) => value.toFixed(2) },
            {
              key: "award",
              label: "Award",
              render: (value: number) => value ? value.toFixed(2) : "0.00"
            },
            { key: "terminal", label: "Terminal" },
            { key: "status", label: "Status", render: renderStatus },
            { key: "bet_time", label: "Bet Time", render: (value: string) => formatDateIso(value) },
          ]}
          actions={(row) => (
            <div className="flex items-center gap-2">
              {row.status !== "void" && (
                <Button variant="outline" title="Void bet" size="sm" onClick={() => voidBet(row.id)}>
                  <XCircle className="w-4 h-4" />
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => deleteBet(row as SportsBet)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        />
      </section>
    </div>
  );
}
