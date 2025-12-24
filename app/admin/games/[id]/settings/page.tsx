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
import { useToast } from "@/hooks/use-toast";
import { GamePrize, PrizeInfo } from "@/lib/types/gameMode";

interface GameInfo {
  id: string;
  week: number;
  type: string;
  start_time: string;
  end_time: string;
}

interface GamePrizeWithInfo extends GamePrize {
  prize_name?: string;
}

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
  const { toast } = useToast();

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
      const [gameRes, prizesRes, gamePrizesRes] = await Promise.all([
        fetch(`/api/admin/games/${gameId}`),
        fetch("/api/admin/prize"),
        fetch(`/api/admin/games/${gameId}/prizes`),
      ]);

      // Fetch game info
      if (!gameRes.ok) throw new Error("Failed to fetch game");
      const gameData = await gameRes.json();
      setGame(gameData.game);

      // Fetch all available prizes
      if (!prizesRes.ok) throw new Error("Failed to fetch prizes");
      const prizesData = await prizesRes.json();
      setAllPrizes(prizesData.prizes || []);

      // Fetch game prizes with their names
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

  const handleDelete = async (gamePrizeId: string) => {
    if (!confirm("Are you sure you want to remove this prize from the game?")) return;

    try {
      const response = await fetch(`/api/admin/games/${gameId}/prizes/${gamePrizeId}`, {
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

      {/* Prizes Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Prizes Management</h2>
            <p className="text-muted-foreground mt-1">
              Add, update, or remove prizes for this game with commission settings
            </p>
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
                    onValueChange={(value) =>
                      setFormData({ ...formData, prize_id: value })
                    }
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a prize" />
                    </SelectTrigger>
                    <SelectContent>
                      {allPrizes.map((prize) => (
                        <SelectItem key={prize.id} value={prize.id}>
                          {prize.name}
                        </SelectItem>
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
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleAdd2}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Prize"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Prizes Table */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : gamePrizes.length === 0 ? (
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
              {
                key: "commission",
                label: "Commission (%)",
                render: (commission) => <span>{commission}%</span>,
                sortable: true,
              },
              {
                key: "status",
                label: "Status",
                render: (status) => (
                  <Badge
                    variant={status === "active" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {status}
                  </Badge>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(gamePrize)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(gamePrize.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          />
        )}
      </div>

      {/* Edit Dialog */}
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
    </div>
  );
}
