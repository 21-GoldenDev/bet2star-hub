"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/admin/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, Loader2, ArrowLeft, Power, PowerOff } from "lucide-react";
import { XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GamePrize, PrizeInfo } from "@/lib/types/gameMode";
import { SportsMatch } from "@/lib/types/sports";

interface GameInfo {
  id: string;
  week: number;
  type: string;
  start_time: string;
  end_time: string;
  results?: string[] | number[] | null;
}

interface GamePrizeWithInfo extends GamePrize {
  prize_name?: string;
}

interface MatchInfo {
  league: string;
  number: number;
  home: string;
  away: string;
  prizes: number[];
  status: "active" | "void";
  start_time?: string;
  end_time?: string;
}

interface MatchEditInfo extends MatchInfo {
  home_goal: number;
  away_goal: number;
}

const PRIZE_LABELS = ["1", "X", "2", "1X", "12", "X2", "Over 2.5", "Under 2.5", "GG"];
const EMPTY_PRIZES = [0, 0, 0, 0, 0, 0, 0, 0, 0];
const DEFAULT_MATCH = {
  league: "",
  number: 1,
  home: "",
  away: "",
  prizes: [...EMPTY_PRIZES],
  status: "active" as "active" | "void",
  start_time: "",
  end_time: "",
};

export default function GameSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.id as string;

  const [game, setGame] = useState<GameInfo | null>(null);
  const [gamePrizes, setGamePrizes] = useState<GamePrizeWithInfo[]>([]);
  const [allPrizes, setAllPrizes] = useState<PrizeInfo[]>([]);
  const [selectedGamePrize, setSelectedGamePrize] = useState<GamePrizeWithInfo | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const [isPrizeDeleteAlertOpen, setIsPrizeDeleteAlertOpen] = useState(false);
  const [prizeToDelete, setPrizeToDelete] = useState<string | null>(null);
  const [isMatchDeleteAlertOpen, setIsMatchDeleteAlertOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<SportsMatch | null>(null);
  const { toast } = useToast();

  // Sports state
  const [sports, setSports] = useState<SportsMatch[]>([]);
  const [stats, setStats] = useState<{ totalBetAmount: number; totalReward: number }>({ totalBetAmount: 0, totalReward: 0 });
  const [isAddSportsOpen, setIsAddSportsOpen] = useState(false);
  const [editingSportsId, setEditingSportsId] = useState<string | null>(null);
  const [sportsForm, setSportsForm] = useState<MatchInfo>(DEFAULT_MATCH);
  const [editRowForm, setEditRowForm] = useState<MatchEditInfo>({ ...DEFAULT_MATCH, home_goal: 0, away_goal: 0 });
  // Result update state for lotto/pools
  const [weekResult, setWeekResult] = useState<Array<number | string>>([]);

  const [formData, setFormData] = useState<{
    prize_id: string;
    commission: number;
    status: "active" | "inactive";
  }>({
    prize_id: "",
    commission: 100,
    status: "active",
  });

  // Fetch game info, game prizes, and all prizes
  useEffect(() => {
    fetchData();
  }, [gameId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch game info first
      const gameRes = await fetch(`/api/admin/games/${gameId}`);
      if (!gameRes.ok) throw new Error("Failed to fetch game");
      const gameData = await gameRes.json();
      setGame(gameData.game);
      if (Array.isArray(gameData.game?.results)) {
        setWeekResult(gameData.game.results as Array<number | string>);
      } else {
        setWeekResult([]);
      }

      // Fetch stats for all game types
      const gameType = gameData.game?.type;
      if (gameType) {
        const statsRes = await fetch(`/api/admin/games/${gameId}/${gameType}/stats`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      }

      // If sports type, fetch sports list; otherwise fetch prizes as before
      if (gameType === "sports") {
        const sportsRes = await fetch(`/api/admin/games/${gameId}/sports`);
        if (!sportsRes.ok) throw new Error("Failed to fetch sports matches");
        const sportsData = await sportsRes.json();
        setSports(
          (sportsData.matches || []).map((m: SportsMatch) => ({
            ...m,
            prizes: Array.isArray(m.prizes) && m.prizes.length === PRIZE_LABELS.length ? m.prizes : [...EMPTY_PRIZES],
          }))
        );
      } else {
        const [prizesRes, gamePrizesRes] = await Promise.all([
          fetch("/api/admin/prize"),
          fetch(`/api/admin/games/${gameId}/prizes`),
        ]);

        if (!prizesRes.ok) throw new Error("Failed to fetch prizes");
        const prizesData = await prizesRes.json();
        setAllPrizes(prizesData.prizes || []);

        if (!gamePrizesRes.ok) throw new Error("Failed to fetch game prizes");
        const gamePrizesData = await gamePrizesRes.json();

        const gamePrizesWithNames = gamePrizesData.game_prizes.map((gp: GamePrize) => {
          const prize = (prizesData.prizes || []).find((p: PrizeInfo) => p.id === gp.prize_id);
          return {
            ...gp,
            prize_name: prize?.name || "Unknown Prize",
          };
        });
        setGamePrizes(gamePrizesWithNames);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load game settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedGamePrize(null);
    setFormData({
      prize_id: "",
      commission: 100,
      status: "active",
    });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (gamePrize: GamePrizeWithInfo) => {
    setSelectedGamePrize(gamePrize);
    setFormData({
      prize_id: gamePrize.prize_id,
      commission: gamePrize.commission,
      status: gamePrize.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.prize_id) {
      toast({
        title: "Error",
        description: "Please select a prize",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/games/${gameId}/prizes/${selectedGamePrize?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commission: formData.commission,
          status: formData.status,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Prize updated successfully",
        });
        setIsEditDialogOpen(false);
        fetchData();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update prize",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating prize:", error);
      toast({
        title: "Error",
        description: "Failed to update prize",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdd2 = async () => {
    if (!formData.prize_id) {
      toast({
        title: "Error",
        description: "Please select a prize",
        variant: "destructive",
      });
      return;
    }

    // Check if prize is already added
    if (gamePrizes.some(gp => gp.prize_id === formData.prize_id)) {
      toast({
        title: "Error",
        description: "This prize is already added to the game",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/games/${gameId}/prizes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prize_id: formData.prize_id,
          commission: formData.commission,
          status: formData.status,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Prize added successfully",
        });
        setIsAddDialogOpen(false);
        setFormData({
          prize_id: "",
          commission: 100,
          status: "active",
        });
        fetchData();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add prize",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding prize:", error);
      toast({
        title: "Error",
        description: "Failed to add prize",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (gamePrize: GamePrizeWithInfo) => {
    try {
      setTogglingStatus(gamePrize.id);
      const newStatus = gamePrize.status === "active" ? "inactive" : "active";

      const response = await fetch(`/api/admin/games/${gameId}/prizes/${gamePrize.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: `Prize ${newStatus === "active" ? "enabled" : "disabled"} successfully`,
        });
        fetchData();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setTogglingStatus(null);
    }
  };

  const openPrizeDeleteDialog = (gamePrizeId: string) => {
    setPrizeToDelete(gamePrizeId);
    setIsPrizeDeleteAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!prizeToDelete) return;

    try {
      const response = await fetch(`/api/admin/games/${gameId}/prizes/${prizeToDelete}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Prize removed successfully",
        });
        fetchData();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to remove prize",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing prize:", error);
      toast({
        title: "Error",
        description: "Failed to remove prize",
        variant: "destructive",
      });
    } finally {
      setIsPrizeDeleteAlertOpen(false);
      setPrizeToDelete(null);
    }
  };

  // Sports handlers
  const handleOpenAddSports = () => {
    setSportsForm({ ...DEFAULT_MATCH, number: Math.max(...sports.map(s => s.number)) + 1 });
    setIsAddSportsOpen(true);
  };

  const formatDateTimeLocal = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const addSportsMatch = async () => {
    if (!sportsForm.league || !sportsForm.home || !sportsForm.away) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      const startIso = sportsForm.start_time ? new Date(sportsForm.start_time).toISOString() : null;
      const endIso = sportsForm.end_time ? new Date(sportsForm.end_time).toISOString() : null;
      const res = await fetch(`/api/admin/games/${gameId}/sports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sportsForm,
          prizes: sportsForm.prizes,
          status: sportsForm.status || "active",
          start_time: startIso,
          end_time: endIso,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add match");
      toast({ title: "Success", description: "Match added" });
      setIsAddSportsOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to add match", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const startInlineEdit = (row: SportsMatch) => {
    setEditingSportsId(row.id);
    setEditRowForm({
      league: row.league,
      number: row.number,
      home: row.home,
      away: row.away,
      home_goal: row.home_goal ?? 0,
      away_goal: row.away_goal ?? 0,
      prizes: Array.isArray(row.prizes) && row.prizes.length === PRIZE_LABELS.length ? [...row.prizes] : [...EMPTY_PRIZES],
      status: (row as any).status ?? "active",
      start_time: row.start_time ?? "",
      end_time: row.end_time ?? "",
    });
  };

  const cancelInlineEdit = () => {
    setEditingSportsId(null);
  };

  const saveInlineEdit = async () => {
    if (!editingSportsId) return;
    try {
      setSubmitting(true);
      const startIso = editRowForm.start_time ? new Date(editRowForm.start_time).toISOString() : null;
      const endIso = editRowForm.end_time ? new Date(editRowForm.end_time).toISOString() : null;
      const res = await fetch(`/api/admin/games/${gameId}/sports/${editingSportsId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          league: editRowForm.league,
          number: editRowForm.number,
          home: editRowForm.home,
          away: editRowForm.away,
          home_goal: editRowForm.home_goal,
          away_goal: editRowForm.away_goal,
          prizes: editRowForm.prizes,
          status: editRowForm.status,
          start_time: startIso,
          end_time: endIso,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update match");

      // Update local sports state
      setSports((prev) =>
        prev.map((m) =>
          m.id === editingSportsId
            ? {
              ...m,
              league: editRowForm.league,
              number: editRowForm.number,
              home: editRowForm.home,
              away: editRowForm.away,
              home_goal: editRowForm.home_goal,
              away_goal: editRowForm.away_goal,
              prizes: editRowForm.prizes,
              status: editRowForm.status,
              start_time: startIso ?? "",
              end_time: endIso ?? "",
            }
            : m
        )
      );

      // Fetch updated stats
      const statsRes = await fetch(`/api/admin/games/${gameId}/sports/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      toast({ title: "Success", description: "Match updated" });
      setEditingSportsId(null);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to update match", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const openMatchDeleteDialog = (row: SportsMatch) => {
    setMatchToDelete(row);
    setIsMatchDeleteAlertOpen(true);
  };

  const deleteSportsMatch = async () => {
    if (!matchToDelete) return;

    try {
      const res = await fetch(`/api/admin/games/${gameId}/sports/${matchToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete match");
      toast({ title: "Deleted", description: "Match removed" });
      fetchData();
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to delete match", variant: "destructive" });
    } finally {
      setIsMatchDeleteAlertOpen(false);
      setMatchToDelete(null);
    }
  };
  // Handler for updating week results (lotto/pools) similar to admin bets pages
  const updateWeekResult = async (result: Array<number | string>) => {
    if (!game?.type) {
      toast({ title: "Error", description: "Game type not found", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/bets/${game.type}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_id: gameId, result }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update result");
      toast({ title: "Success", description: "Week result updated and awards recomputed" });
      setWeekResult(result);
      fetchData();
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to update result", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Game Settings</h1>
          {game && (
            <p className="text-muted-foreground mt-2">
              Week {game.week} • {game.type.toUpperCase()} •{" "}
              {new Date(game.start_time).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Game Info Card */}
      {game && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Game Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Week</p>
              <p className="text-lg font-semibold">{game.week}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="text-lg font-semibold capitalize">{game.type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Start Time</p>
              <p className="text-sm">{new Date(game.start_time).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End Time</p>
              <p className="text-sm">{new Date(game.end_time).toLocaleString()}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Cards for All Game Types */}
      {game && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Betting Amount</p>
                <p className="text-3xl font-bold mt-2">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(stats.totalBetAmount)}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reward Payable</p>
                <p className="text-3xl font-bold mt-2">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(stats.totalReward)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Week Result Update Section for Lotto/Pools */}
      {game && (game.type === "lotto" || game.type === "pools") && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Week Result</h2>
          <Label className="text-sm text-muted-foreground">Enter-separated values and press Enter to add</Label>
          <div className="mt-2 flex items-center gap-2">
            <Input
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const value = e.currentTarget.value.trim();
                  if (!value) return;
                  if (game.type === "lotto") {
                    const num = Number(value);
                    if (isNaN(num)) return;
                    const newSet = new Set(weekResult.map((v) => Number(v)));
                    newSet.add(num);
                    const updatedResult = Array.from(newSet).sort((a, b) => Number(a) - Number(b));
                    setWeekResult(updatedResult);
                    updateWeekResult(updatedResult);
                  } else {
                    const newSet = new Set(weekResult.map((v) => String(v)));
                    newSet.add(value);
                    const updatedResult = Array.from(newSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                    setWeekResult(updatedResult);
                    updateWeekResult(updatedResult);
                  }
                  e.currentTarget.value = "";
                }
              }}
              className="w-32"
              placeholder={game.type === "lotto" ? "e.g. 25" : "e.g. 12"}
              disabled={submitting}
            />
            <div className="flex flex-wrap items-center gap-1">
              {weekResult.map((num, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium flex items-center gap-1"
                >
                  {num}
                  <XCircle
                    className="w-3 h-3 cursor-pointer hover:text-red-600"
                    onClick={() => {
                      const updatedResult = weekResult.filter((_, i) => i !== idx);
                      setWeekResult(updatedResult);
                      updateWeekResult(updatedResult);
                    }}
                  />
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Sports vs Prizes Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          {game?.type === "sports" ? (
            <>
              <div>
                <h2 className="text-2xl font-bold">Sports Matches</h2>
                <p className="text-muted-foreground mt-1">Manage matches and goals for this sports game</p>
              </div>
              <Dialog open={isAddSportsOpen} onOpenChange={setIsAddSportsOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" disabled={loading} onClick={handleOpenAddSports}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Match
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-125 max-h-screen overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Match</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>League</Label>
                      <Input value={sportsForm.league} onChange={(e) => setSportsForm({ ...sportsForm, league: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Number</Label>
                        <Input type="number" min="1" value={sportsForm.number} onChange={(e) => setSportsForm({ ...sportsForm, number: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select value={sportsForm.status} onValueChange={(value) => setSportsForm({ ...sportsForm, status: value as "active" | "void" })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="void">Void</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label>Start Time</Label>
                        <Input
                          type="datetime-local"
                          value={formatDateTimeLocal(sportsForm.start_time)}
                          onChange={(e) => setSportsForm({ ...sportsForm, start_time: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>End Time</Label>
                        <Input
                          type="datetime-local"
                          value={formatDateTimeLocal(sportsForm.end_time)}
                          onChange={(e) => setSportsForm({ ...sportsForm, end_time: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Home Team</Label>
                        <Input value={sportsForm.home} onChange={(e) => setSportsForm({ ...sportsForm, home: e.target.value })} />
                      </div>
                      <div>
                        <Label>Away Team</Label>
                        <Input value={sportsForm.away} onChange={(e) => setSportsForm({ ...sportsForm, away: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Label>Prizes</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {PRIZE_LABELS.map((label, idx) => (
                          <div key={label} className="flex items-center gap-2">
                            <span className="w-24 text-sm text-muted-foreground">{label}</span>
                            <Input
                              type="number"
                              min="0"
                              value={sportsForm.prizes[idx] ?? 0}
                              onChange={(e) => {
                                const value = Math.max(0, Number(e.target.value));
                                const updated = [...sportsForm.prizes];
                                updated[idx] = value;
                                setSportsForm({ ...sportsForm, prizes: updated });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setIsAddSportsOpen(false)} disabled={submitting}>Cancel</Button>
                      <Button className="flex-1" onClick={addSportsMatch} disabled={submitting}>
                        {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>) : ("Add Match")}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-2xl font-bold">Prizes Management</h2>
                <p className="text-muted-foreground mt-1">Add, update, or remove prizes for this game with commission settings</p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" disabled={loading}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Prize
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Prize to Game</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Prize</Label>
                      <Select
                        value={formData.prize_id}
                        onValueChange={(value) => setFormData({ ...formData, prize_id: value })}
                        disabled={submitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a prize" />
                        </SelectTrigger>
                        <SelectContent>
                          {allPrizes.map((prize) => (
                            <SelectItem key={prize.id} value={prize.id}>{prize.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Commission (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.commission}
                        onChange={(e) => setFormData({ ...formData, commission: Math.min(100, Math.max(0, Number(e.target.value))) })}
                        disabled={submitting}
                      />
                      <p className="text-xs text-muted-foreground mt-1">0-100</p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: "active" | "inactive") => setFormData({ ...formData, status: value })}
                        disabled={submitting}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setIsAddDialogOpen(false)} disabled={submitting}>Cancel</Button>
                      <Button className="flex-1" onClick={handleAdd2} disabled={submitting}>
                        {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>) : ("Add Prize")}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : game?.type === "sports" ? (
          sports.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No matches added yet</p>
              <Button className="mt-4" onClick={handleOpenAddSports}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Match
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {sports.map((match) => (
                <Card key={match.id} className="p-4">
                  {editingSportsId === match.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Number</Label>
                          <Input
                            type="number"
                            min="1"
                            className="h-9"
                            value={editRowForm.number}
                            onChange={(e) => setEditRowForm({ ...editRowForm, number: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Status</Label>
                          <Select value={editRowForm.status} onValueChange={(value) => setEditRowForm({ ...editRowForm, status: value as "active" | "void" })}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="void">Void</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">League</Label>
                        <Input
                          className="h-9"
                          value={editRowForm.league}
                          onChange={(e) => setEditRowForm({ ...editRowForm, league: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Teams</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Home Team"
                            className="h-9"
                            value={editRowForm.home}
                            onChange={(e) => setEditRowForm({ ...editRowForm, home: e.target.value })}
                          />
                          <Input
                            placeholder="Away Team"
                            className="h-9"
                            value={editRowForm.away}
                            onChange={(e) => setEditRowForm({ ...editRowForm, away: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Start Time</Label>
                          <Input
                            type="datetime-local"
                            className="h-9 text-xs"
                            value={formatDateTimeLocal(editRowForm.start_time)}
                            onChange={(e) => setEditRowForm({ ...editRowForm, start_time: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">End Time</Label>
                          <Input
                            type="datetime-local"
                            className="h-9 text-xs"
                            value={formatDateTimeLocal(editRowForm.end_time)}
                            onChange={(e) => setEditRowForm({ ...editRowForm, end_time: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Score</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            className="h-9"
                            placeholder="Home"
                            value={editRowForm.home_goal}
                            onChange={(e) => setEditRowForm({ ...editRowForm, home_goal: Math.max(0, Number(e.target.value)) })}
                          />
                          <span>-</span>
                          <Input
                            type="number"
                            min="0"
                            className="h-9"
                            placeholder="Away"
                            value={editRowForm.away_goal}
                            onChange={(e) => setEditRowForm({ ...editRowForm, away_goal: Math.max(0, Number(e.target.value)) })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs mb-2 block">Prizes</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
                          {PRIZE_LABELS.map((label, idx) => (
                            <div key={label} className="flex items-center gap-2">
                              <span className="w-16 text-xs text-muted-foreground">{label}</span>
                              <Input
                                type="number"
                                min="0"
                                className="h-9 text-xs"
                                value={editRowForm.prizes[idx] ?? 0}
                                onChange={(e) => {
                                  const value = Math.max(0, Number(e.target.value));
                                  const updated = [...editRowForm.prizes];
                                  updated[idx] = value;
                                  setEditRowForm({ ...editRowForm, prizes: updated });
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={saveInlineEdit} disabled={submitting}>
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={cancelInlineEdit} disabled={submitting}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline" className="text-sm font-bold px-2.5 py-0.5 bg-primary/10 border-primary/30">
                              #{match.number}
                            </Badge>
                            <Badge 
                              variant={(match as any).status === "void" ? "secondary" : "default"} 
                              className={`text-xs font-semibold px-2.5 py-0.5 capitalize ${
                                (match as any).status === "void" 
                                  ? "bg-gray-500" 
                                  : "bg-green-600 hover:bg-green-700"
                              }`}
                            >
                              {(match as any).status ?? "active"}
                            </Badge>
                            <span className="text-xs font-medium text-primary/80 truncate">{match.league}</span>
                          </div>
                          <div className="bg-linear-to-r from-primary/5 to-transparent rounded px-2 py-1.5 mb-1.5">
                            <p className="font-bold text-sm truncate">{match.home} <span className="text-primary font-extrabold mx-1">vs</span> {match.away}</p>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="font-semibold text-nowrap">Score: <span className="text-primary font-bold">{(match.home_goal ?? 0)} - {(match.away_goal ?? 0)}</span></span>
                            <span>Start: {match.start_time ? new Date(match.start_time).toLocaleString('en-NG', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : "-"}</span>
                            <span>End: {match.end_time ? new Date(match.end_time).toLocaleString('en-NG', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : "-"}</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => startInlineEdit(match)}
                            className="h-8 w-8 p-0 hover:bg-primary hover:text-primary-foreground"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openMatchDeleteDialog(match)}
                            className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="pt-1.5 border-t border-black/10">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-foreground">Betting Odds</span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-9 gap-1.5">
                          {PRIZE_LABELS.map((label, idx) => (
                            <div 
                              key={label} 
                              className="bg-linear-to-br from-primary/10 to-primary/5 rounded px-2 py-1 border border-primary/20 flex items-center justify-between"
                            >
                              <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                              <span className="text-sm font-bold text-primary">{match.prizes?.[idx] ?? 0}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )
        ) : (
          gamePrizes.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No prizes added to this game yet</p>
              <Button className="mt-4" onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Prize
              </Button>
            </Card>
          ) : (
            <DataTable<GamePrizeWithInfo>
              columns={[
                { key: "prize_name", label: "Prize Name", sortable: true },
                { key: "commission", label: "Commission (%)", render: (commission) => <span>{commission}%</span>, sortable: true },
                {
                  key: "status",
                  label: "Status",
                  render: (status) => (
                    <Badge variant={status === "active" ? "default" : "secondary"} className="capitalize">{status}</Badge>
                  ),
                  sortable: true,
                },
              ]}
              data={gamePrizes}
              searchKey="prize_name"
              searchPlaceholder="Search by prize name..."
              actions={(gamePrize) => (
                <div className="flex gap-2">
                  <Button
                    variant={gamePrize.status === "active" ? "default" : "secondary"}
                    size="sm"
                    onClick={() => handleToggleStatus(gamePrize)}
                    disabled={togglingStatus === gamePrize.id}
                    title={gamePrize.status === "active" ? "Disable" : "Enable"}
                  >
                    {togglingStatus === gamePrize.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : gamePrize.status === "active" ? (
                      <PowerOff className="w-4 h-4" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(gamePrize)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openPrizeDeleteDialog(gamePrize.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            />
          )
        )}
      </div>

      {/* Edit Prize Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Prize Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Prize</Label>
              <Input
                value={selectedGamePrize?.prize_name || ""}
                disabled
              />
            </div>
            <div>
              <Label>Commission (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.commission}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    commission: Math.min(100, Math.max(0, Number(e.target.value))),
                  })
                }
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground mt-1">0-100</p>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "active" | "inactive") =>
                  setFormData({ ...formData, status: value })
                }
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
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
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={submitting}
              >
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

      {/* Prize Delete Confirmation Dialog */}
      <AlertDialog open={isPrizeDeleteAlertOpen} onOpenChange={setIsPrizeDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the prize from this game.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sports Match Delete Confirmation Dialog */}
      <AlertDialog open={isMatchDeleteAlertOpen} onOpenChange={setIsMatchDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the match.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteSportsMatch}
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
