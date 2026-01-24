"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Plus, Edit2, Trash2, Loader2, Eye, EyeOff, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Match } from "@/lib/types/matches";

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [formData, setFormData] = useState<{
    number: number;
    home: string;
    away: string;
    status: "enable" | "disable";
    week: number;
  }>({
    number: 1,
    home: "",
    away: "",
    status: "enable",
    week: 1,
  });

  // Fetch matches from API
  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/matches");
      const data = await response.json();

      if (response.ok) {
        setMatches(data.matches);
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

  const handleEdit = (match: Match) => {
    setSelectedMatch(match);
    setFormData({
      number: match.number,
      home: match.home,
      away: match.away,
      status: match.status,
      week: match.week,
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedMatch) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/matches/${selectedMatch.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: formData.number,
          home: formData.home,
          away: formData.away,
          status: formData.status,
          week: formData.week,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Match updated successfully",
        });
        setIsEditDialogOpen(false);
        fetchMatches(); // Refresh the list
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

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      const response = await fetch("/api/admin/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: formData.number,
          home: formData.home,
          away: formData.away,
          status: formData.status,
          week: formData.week,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Match created successfully",
        });
        setIsCreateOpen(false);
        setFormData({ number: 1, home: "", away: "", status: "enable", week: 1 });
        fetchMatches(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create match",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating match:", error);
      toast({
        title: "Error",
        description: "Failed to create match",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteDialog = (matchId: string) => {
    setMatchToDelete(matchId);
    setIsDeleteAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!matchToDelete) return;

    try {
      const response = await fetch(`/api/admin/matches/${matchToDelete}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Match deleted successfully",
        });
        fetchMatches(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete match",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting match:", error);
      toast({
        title: "Error",
        description: "Failed to delete match",
        variant: "destructive",
      });
    } finally {
      setIsDeleteAlertOpen(false);
      setMatchToDelete(null);
    }
  };

  const handleToggleStatus = async (match: Match) => {
    try {
      const newStatus = match.status === "enable" ? "disable" : "enable";
      const response = await fetch(`/api/admin/matches/${match.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: match.number,
          home: match.home,
          away: match.away,
          status: newStatus,
          week: match.week,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: `Match ${newStatus === "enable" ? "enabled" : "disabled"} successfully`,
        });
        fetchMatches(); // Refresh the list
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
    return matches.filter((m) =>
      m.home.toLowerCase().includes(term) || m.away.toLowerCase().includes(term)
    );
  }, [matches, searchTerm]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Matches Management</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage sports matches
          </p>
        </div>
        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="lg" disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              Create Match
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Match</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Match Number</Label>
                <Input
                  type="number"
                  value={formData.number}
                  onChange={(e) =>
                    setFormData({ ...formData, number: Number(e.target.value) })
                  }
                  disabled={submitting}
                />
              </div>
              <div>
                <Label>Home Team</Label>
                <Input
                  type="text"
                  placeholder="e.g., Manchester United"
                  value={formData.home}
                  onChange={(e) =>
                    setFormData({ ...formData, home: e.target.value })
                  }
                  disabled={submitting}
                />
              </div>
              <div>
                <Label>Away Team</Label>
                <Input
                  type="text"
                  placeholder="e.g., Liverpool"
                  value={formData.away}
                  onChange={(e) =>
                    setFormData({ ...formData, away: e.target.value })
                  }
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
                <Input
                  type="number"
                  value={formData.week}
                  onChange={(e) =>
                    setFormData({ ...formData, week: Number(e.target.value) })
                  }
                  disabled={submitting}
                />
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
                    "Create Match"
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
          <p className="text-sm text-muted-foreground">Total Matches</p>
          <p className="text-2xl font-bold">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              matches.length
            )}
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

      {/* Matches Table */}
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
                placeholder="Search by home or away team..."
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
                    className={clsx(
                      "capitalize",
                      { "bg-green-600": status === "enable" },
                    )}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(match)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDeleteDialog(match.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          />
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Match</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Match Number</Label>
              <Input
                type="number"
                value={formData.number}
                onChange={(e) =>
                  setFormData({ ...formData, number: Number(e.target.value) })
                }
                disabled={submitting}
              />
            </div>
            <div>
              <Label>Home Team</Label>
              <Input
                type="text"
                placeholder="e.g., Manchester United"
                value={formData.home}
                onChange={(e) =>
                  setFormData({ ...formData, home: e.target.value })
                }
                disabled={submitting}
              />
            </div>
            <div>
              <Label>Away Team</Label>
              <Input
                type="text"
                placeholder="e.g., Liverpool"
                value={formData.away}
                onChange={(e) =>
                  setFormData({ ...formData, away: e.target.value })
                }
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
              <Input
                type="number"
                value={formData.week}
                onChange={(e) =>
                  setFormData({ ...formData, week: Number(e.target.value) })
                }
                disabled={submitting}
              />
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the match.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
