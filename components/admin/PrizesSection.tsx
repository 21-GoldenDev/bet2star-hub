"use client";

import { useState } from "react";
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
import { Plus, Edit2, Trash2, Loader2, Power, PowerOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PrizeInfo } from "@/lib/types/gameMode";

interface GamePrizeWithInfo {
  id: string;
  name: string;
  status: "active" | "inactive";
  commission?: number;
  exception?: string;
}

interface PrizeWithCommission extends PrizeInfo {
  commission?: number;
}

interface Props {
  gameId: string;
  gamePrizes: GamePrizeWithInfo[];
  allPrizes: PrizeWithCommission[];
  loading: boolean;
  onRefresh: () => void;
  /** When true (Pools games), show commission fields and sync to all terminals on save. */
  manageCommission?: boolean;
}

export default function PrizesSection({
  gameId,
  gamePrizes,
  allPrizes,
  loading,
  onRefresh,
  manageCommission = false,
}: Props) {
  const [selectedGamePrize, setSelectedGamePrize] = useState<GamePrizeWithInfo | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const [isPrizeDeleteAlertOpen, setIsPrizeDeleteAlertOpen] = useState(false);
  const [prizeToDelete, setPrizeToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<{
    prize_id: string;
    status: "active" | "inactive";
    commission: number;
    exception: string;
  }>({
    prize_id: "",
    status: "active",
    commission: 100,
    exception: "",
  });

  const resolveDefaultCommission = (prizeId: string) => {
    const master = allPrizes.find((p) => p.id === prizeId);
    const value = Number(master?.commission);
    return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 100;
  };

  const handleAdd = () => {
    setSelectedGamePrize(null);
    setFormData({
      prize_id: "",
      status: "active",
      commission: 100,
      exception: "",
    });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (gamePrize: GamePrizeWithInfo) => {
    setSelectedGamePrize(gamePrize);
    setFormData({
      prize_id: gamePrize.id,
      status: gamePrize.status,
      commission: gamePrize.commission ?? 100,
      exception: gamePrize.exception ?? "",
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: formData.status,
          ...(manageCommission ? { commission: formData.commission } : {}),
          ...(manageCommission ? { exception: formData.exception.trim() || null } : {}),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({ title: "Success", description: "Prize updated successfully" });
        setIsEditDialogOpen(false);
        onRefresh();
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

    if (gamePrizes.some(gp => gp.id === formData.prize_id)) {
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prize_id: formData.prize_id,
          status: formData.status,
          ...(manageCommission ? { commission: formData.commission } : {}),
          ...(manageCommission ? { exception: formData.exception.trim() || null } : {}),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({ title: "Success", description: "Prize added successfully" });
        setIsAddDialogOpen(false);
        setFormData({
          prize_id: "",
          status: "active",
          commission: 100,
          exception: "",
        });
        onRefresh();
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: `Prize ${newStatus === "active" ? "enabled" : "disabled"} successfully`,
        });
        onRefresh();
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
        toast({ title: "Success", description: "Prize removed successfully" });
        onRefresh();
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Prize Management</h2>
          <p className="text-muted-foreground mt-1">
            {manageCommission
              ? "Add, update, or remove prizes, commissions, and result exceptions. Changes sync to all terminals."
              : "Add, update, or remove prizes for this game"}
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
                    setFormData({
                      ...formData,
                      prize_id: value,
                      commission: manageCommission ? resolveDefaultCommission(value) : formData.commission,
                    })
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
              {manageCommission && (
                <>
                  <div>
                    <Label>Commission (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={formData.commission}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          commission: Number(e.target.value),
                        })
                      }
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <Label>Exception</Label>
                    <Input
                      value={formData.exception}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          exception: e.target.value,
                        })
                      }
                      // placeholder="e.g. 67"
                      disabled={submitting}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Result number ignored when calculating awards for this prize
                    </p>
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAdd2} disabled={submitting}>
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
            { key: "name", label: "Prize Name", sortable: true },
            {
              key: "status",
              label: "Status",
              render: (status) => (
                <Badge variant={status === "active" ? "default" : "secondary"} className="capitalize">
                  {status}
                </Badge>
              ),
              sortable: true,
            },
            ...(manageCommission
              ? [
                  {
                    key: "commission" as const,
                    label: "Commission",
                    render: (commission: number | undefined) =>
                      `${commission ?? 100}%`,
                    sortable: true,
                  },
                  {
                    key: "exception" as const,
                    label: "Exception",
                    render: (exception: string | undefined) => exception || "—",
                    sortable: true,
                  },
                ]
              : []),
          ]}
          data={gamePrizes}
          searchKey="name"
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
      )}

      {/* Edit Prize Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Prize Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Prize</Label>
              <Input value={selectedGamePrize?.name || ""} disabled />
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
            {manageCommission && (
              <>
                <div>
                  <Label>Commission (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={formData.commission}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        commission: Number(e.target.value),
                      })
                    }
                    disabled={submitting}
                  />
                </div>
                <div>
                  <Label>Exception</Label>
                  <Input
                    value={formData.exception}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        exception: e.target.value,
                      })
                    }
                    placeholder="e.g. 67"
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Result number ignored when calculating awards for this prize
                  </p>
                </div>
              </>
            )}
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
    </div>
  );
}
