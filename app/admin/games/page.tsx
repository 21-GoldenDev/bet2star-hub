"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { GameType } from "@/lib/types/gameMode";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Game {
  id: string;
  week: number;
  type: GameType;
  start_time?: string; // from database
  end_time?: string; // from database
  startTime?: string; // for form compatibility
  endTime?: string; // for form compatibility
  prize: string[];
  results?: number[] | string[] | object[] | null;
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState<{
    week: number;
    type: GameType;
    startTime: string;
    endTime: string;
    prize: string[];
  }>({
    week: 1,
    type: "lotto",
    startTime: "",
    endTime: "",
    prize: [],
  });

  // Fetch games from API
  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/games");
      const data = await response.json();
      
      if (response.ok) {
        // Normalize the data to handle both snake_case and camelCase
        const normalizedGames = data.games.map((game: any) => ({
          ...game,
          startTime: game.start_time || game.startTime,
          endTime: game.end_time || game.endTime,
        }));
        setGames(normalizedGames);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch games",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching games:", error);
      toast({
        title: "Error",
        description: "Failed to fetch games",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (game: Game) => {
    setSelectedGame(game);
    setFormData({
      week: game.week,
      type: game.type,
      startTime: game.startTime || game.start_time || "",
      endTime: game.endTime || game.end_time || "",
      prize: game.prize,
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedGame) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/games/${selectedGame.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          week: formData.week,
          type: formData.type,
          startTime: formData.startTime,
          endTime: formData.endTime,
          prize: formData.prize,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Game updated successfully",
        });
        setIsEditDialogOpen(false);
        fetchGames(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update game",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating game:", error);
      toast({
        title: "Error",
        description: "Failed to update game",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      const response = await fetch("/api/admin/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          week: formData.week,
          type: formData.type,
          startTime: formData.startTime,
          endTime: formData.endTime,
          prize: formData.prize,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Game created successfully",
        });
        setIsCreateOpen(false);
        setFormData({ week: 1, type: "lotto", startTime: "", endTime: "", prize: [] });
        fetchGames(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create game",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating game:", error);
      toast({
        title: "Error",
        description: "Failed to create game",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (gameId: string) => {
    if (!confirm("Are you sure you want to delete this game?")) return;

    try {
      const response = await fetch(`/api/admin/games/${gameId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Game deleted successfully",
        });
        fetchGames(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete game",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting game:", error);
      toast({
        title: "Error",
        description: "Failed to delete game",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Games Management</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage games, draws, and prizes
          </p>
        </div>
        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="lg" disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              Create Game
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Game</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Week</Label>
                <Input
                  type="number"
                  value={formData.week}
                  onChange={(e) => setFormData({ ...formData, week: Number(e.target.value) })}
                  disabled={submitting}
                />
              </div>
              <div>
                <Label>Game Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v: GameType) => setFormData({ ...formData, type: v })}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lotto">Lotto</SelectItem>
                    <SelectItem value="pools">Pools</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  disabled={submitting}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  disabled={submitting}
                />
              </div>
              <div>
                <Label>Prize Modes</Label>
                <div className="flex gap-2">
                  {["40_1a", "100_1"].map((odd) => (
                    <label key={odd} className="inline-flex items-center gap-2">
                      <Checkbox
                        checked={formData.prize.includes(odd)}
                        disabled={submitting}
                        onCheckedChange={(checked) => {
                          if (checked) setFormData({ ...formData, prize: Array.from(new Set([...formData.prize, odd])) });
                          else setFormData({ ...formData, prize: formData.prize.filter((p) => p !== odd) });
                        }}
                      />
                      <span className="uppercase">{odd.replace("_", " ")}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setIsCreateOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleCreate}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Game"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Games</p>
          <p className="text-2xl font-bold">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : games.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">This Week's Games</p>
          <p className="text-2xl font-bold">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              games.filter((g) => {
                const now = new Date();
                const startTime = new Date(g.startTime || g.start_time || "");
                const endTime = new Date(g.endTime || g.end_time || "");
                return now >= startTime && now <= endTime;
              }).length
            )}
          </p>
        </Card>
      </div>

      {/* Games Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <DataTable<Game>
          columns={[
            { key: "week", label: "Week", sortable: true },
            {
              key: "type",
              label: "Type",
              render: (type) => (
                <Badge variant="outline" className="capitalize">
                  {type}
                </Badge>
              ),
              sortable: true,
            },
            { 
              key: "start_time", 
              label: "Start Time", 
              render: (_v, game) => new Date(game.startTime || game.start_time || "").toLocaleString(), 
              sortable: true 
            },
            { 
              key: "end_time", 
              label: "End Time", 
              render: (_v, game) => new Date(game.endTime || game.end_time || "").toLocaleString(), 
              sortable: true 
            },
            {
              key: "prize", 
              label: "Prize Modes", 
              render: (prizes: string[]) => (
                <div className="flex gap-2">
                  {prizes?.map(p => (
                    <Badge key={p} variant="outline" className="uppercase text-nowrap">{p.replace("_", " ")}</Badge>
                  ))}
                </div>
              )
            },
          ]}
          data={games}
          searchKey="week"
          searchPlaceholder="Search by game week..."
          actions={(game) => (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(game)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(game.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        />
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Game</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Week</Label>
              <Input
                type="number"
                value={formData.week}
                onChange={(e) => setFormData({ ...formData, week: Number(e.target.value) })}
                disabled={submitting}
              />
            </div>
            <div>
              <Label>Game Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v: GameType) => setFormData({ ...formData, type: v })}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lotto">Lotto</SelectItem>
                  <SelectItem value="pools">Pools</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Time</Label>
              <Input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                disabled={submitting}
              />
            </div>
            <div>
              <Label>End Time</Label>
              <Input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                disabled={submitting}
              />
            </div>
            <div>
              <Label>Prize Modes</Label>
              <div className="flex gap-2">
                {["40_1a", "100_1"].map((odd) => (
                  <label key={odd} className="inline-flex items-center gap-2">
                    <Checkbox
                      checked={formData.prize.includes(odd)}
                      disabled={submitting}
                      onCheckedChange={(checked) => {
                        if (checked) setFormData({ ...formData, prize: Array.from(new Set([...formData.prize, odd])) });
                        else setFormData({ ...formData, prize: formData.prize.filter((p) => p !== odd) });
                      }}
                    />
                    <span className="uppercase">{odd.replace("_", " ")}</span>
                  </label>
                ))}
              </div>
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
    </div>
  );
}
