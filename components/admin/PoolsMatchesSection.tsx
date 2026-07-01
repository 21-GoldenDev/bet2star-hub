"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/admin/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit2, Loader2, Eye, EyeOff, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Match } from "@/lib/types/matches";

interface Props {
  gameId: string;
  gameWeek: number;
  refreshKey?: number;
}

const EMPTY_FORM = {
  number: 1,
  home: "",
  away: "",
  status: "enable" as "enable" | "disable",
};

export default function PoolsMatchesSection({ gameId, gameWeek, refreshKey = 0 }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const { toast } = useToast();

  useEffect(() => {
    fetchMatches();
  }, [gameId, gameWeek, refreshKey]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/games/${gameId}/pools/matches`);
      const data = await response.json();

      if (response.ok) {
        setMatches(data.matches || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch matches",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching matches:", error);
      toast({
        title: "Error",
        description: "Failed to fetch matches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (match: Match) => {
    setSelectedMatch(match);
    setFormData({
      number: match.number,
      home: match.home,
      away: match.away,
      status: match.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedMatch) return;

    try {
      setSubmitting(true);
      const response = await fetch(
        `/api/admin/games/${gameId}/pools/matches/${selectedMatch.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: formData.number,
            home: formData.home,
            away: formData.away,
            status: formData.status,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Match updated successfully",
        });
        setIsEditDialogOpen(false);
        fetchMatches();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update match",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating match:", error);
      toast({
        title: "Error",
        description: "Failed to update match",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (match: Match) => {
    try {
      const newStatus = match.status === "enable" ? "disable" : "enable";
      const response = await fetch(
        `/api/admin/games/${gameId}/pools/matches/${match.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: match.number,
            home: match.home,
            away: match.away,
            status: newStatus,
          }),
        }
      );
      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: `Match ${newStatus === "enable" ? "enabled" : "disabled"} successfully`,
        });
        fetchMatches();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update match status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating match status:", error);
      toast({
        title: "Error",
        description: "Failed to update match status",
        variant: "destructive",
      });
    }
  };

  const filteredMatches = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return matches;

    const isNumeric = /^\d+$/.test(term);
    return matches.filter((m) => {
      if (isNumeric) {
        return String(m.number) === term;
      }
      return (
        m.home.toLowerCase().includes(term) ||
        m.away.toLowerCase().includes(term)
      );
    });
  }, [matches, searchTerm]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Pools Match Fixtures</h2>
        <p className="text-muted-foreground mt-2">
          Edit week {gameWeek} pool matches (1–49) for this game.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Matches</p>
          <p className="text-2xl font-bold">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : matches.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Enabled Matches</p>
          <p className="text-2xl font-bold">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              matches.filter((m) => m.status === "enable").length
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Disabled Matches</p>
          <p className="text-2xl font-bold">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              matches.filter((m) => m.status === "disable").length
            )}
          </p>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by match #, home or away team..."
                className="pl-9 pr-10"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <DataTable<Match>
            columns={[
              { key: "number", label: "Match #", sortable: true },
              { key: "home", label: "Home Team", sortable: true },
              { key: "away", label: "Away Team", sortable: true },
              { key: "week", label: "Week", sortable: true },
              {
                key: "status",
                label: "Status",
                render: (status) => (
                  <Badge
                    variant={status === "enable" ? "default" : "outline"}
                    className={clsx("capitalize", { "bg-green-600": status === "enable" })}
                  >
                    {status}
                  </Badge>
                ),
                sortable: true,
              },
            ]}
            data={filteredMatches}
            actions={(match) => (
              <div className="flex gap-2">
                <Button
                  variant={match.status === "enable" ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleToggleStatus(match)}
                  title={match.status === "enable" ? "Disable" : "Enable"}
                >
                  {match.status === "enable" ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleOpenEdit(match)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          />
        </>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Match</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Match Number</Label>
              <Input type="number" value={formData.number} disabled />
            </div>
            <div>
              <Label>Home Team</Label>
              <Input
                type="text"
                placeholder="e.g., Manchester United"
                value={formData.home}
                onChange={(e) => setFormData({ ...formData, home: e.target.value })}
                disabled={submitting}
              />
            </div>
            <div>
              <Label>Away Team</Label>
              <Input
                type="text"
                placeholder="e.g., Liverpool"
                value={formData.away}
                onChange={(e) => setFormData({ ...formData, away: e.target.value })}
                disabled={submitting}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v: "enable" | "disable") =>
                  setFormData({ ...formData, status: v })
                }
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enable">Enable</SelectItem>
                  <SelectItem value="disable">Disable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Week</Label>
              <Input type="number" value={gameWeek} disabled />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
