"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Edit2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MaxStake } from "@/lib/types/maxStake";

interface Props {
  gameId: string;
  gameType: "lotto" | "pools" | "sports" | "sports_draw";
  maxStakes: MaxStake[];
  loading: boolean;
  onRefresh: () => void;
}

export default function MaxStakeSection({
  gameId,
  gameType,
  maxStakes,
  loading,
  onRefresh,
}: Props) {
  const isSportsLike = gameType === "sports" || gameType === "sports_draw";
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  // For lotto: single max stake
  const [singleMaxStake, setSingleMaxStake] = useState<string>(
    maxStakes.length > 0 && gameType === "lotto" ? maxStakes[0].max_amount.toString() : ""
  );

  // For pools and sports: multiple max stakes based on matchAtLeast
  const [multipleMaxStakes, setMultipleMaxStakes] = useState(() => {
    if (gameType === "pools") {
      return {
        match1: maxStakes.find((s) => s.match_at_least === 1)?.max_amount || "",
        match2: maxStakes.find((s) => s.match_at_least === 2)?.max_amount || "",
        match3plus: maxStakes.find((s) => (s.match_at_least ?? null) === null || (s.match_at_least ?? 0) >= 3)
          ?.max_amount || "",
      };
    } else if (isSportsLike) {
      return {
        match1: maxStakes.find((s) => s.match_at_least === 1)?.max_amount || "",
        match2: maxStakes.find((s) => s.match_at_least === 2)?.max_amount || "",
        match3: maxStakes.find((s) => s.match_at_least === 3)?.max_amount || "",
        match4plus: maxStakes.find((s) => (s.match_at_least ?? null) === null || (s.match_at_least ?? 0) >= 4)
          ?.max_amount || "",
      };
    }
    return {};
  });

  const updateMaxStakes = async () => {
    try {
      setSubmitting(true);

      let stakesToUpdate: any[] = [];

      if (gameType === "pools" || isSportsLike) {
        const stakes = multipleMaxStakes as any;
        const requiredFields = gameType === "pools"
          ? ["match1", "match2", "match3plus"]
          : ["match1", "match2", "match3", "match4plus"];

        if (requiredFields.some((field) => !stakes[field])) {
          toast({
            title: "Error",
            description: "Please fill in all maximum stake amounts",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }

        if (gameType === "pools") {
          stakesToUpdate = [
            { match_at_least: 1, max_amount: Number(stakes.match1) },
            { match_at_least: 2, max_amount: Number(stakes.match2) },
            { match_at_least: 3, max_amount: Number(stakes.match3plus) },
          ];
        } else {
          stakesToUpdate = [
            { match_at_least: 1, max_amount: Number(stakes.match1) },
            { match_at_least: 2, max_amount: Number(stakes.match2) },
            { match_at_least: 3, max_amount: Number(stakes.match3) },
            { match_at_least: 4, max_amount: Number(stakes.match4plus) },
          ];
        }
      } else {
        if (!singleMaxStake) {
          toast({
            title: "Error",
            description: "Please enter a maximum stake amount",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }

        stakesToUpdate = [{ max_amount: Number(singleMaxStake) }];
      }

      const res = await fetch(`/api/admin/games/${gameId}/max-stakes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_type: gameType,
          max_stakes: stakesToUpdate,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to update max stakes");

      toast({
        title: "Success",
        description: "Maximum stakes updated successfully",
      });

      setIsEditing(false);
      onRefresh();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update max stakes",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Maximum Stake Management</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {gameType === "pools"
                ? "Set maximum stake amounts for different match requirements"
                  : isSportsLike
                    ? "Set maximum stake amounts for different match requirements"
                    : "Set the maximum stake amount for this game"}
            </p>
          </div>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            {gameType === "pools" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="match1">Maximum Stake (Match At Least = 1)</Label>
                  <Input
                    id="match1"
                    type="number"
                    min="0"
                    step="1"
                    value={(multipleMaxStakes as any).match1}
                    onChange={(e) =>
                      setMultipleMaxStakes({
                        ...(multipleMaxStakes as any),
                        match1: e.target.value,
                      })
                    }
                    placeholder="e.g., 10000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="match2">Maximum Stake (Match At Least = 2)</Label>
                  <Input
                    id="match2"
                    type="number"
                    min="0"
                    step="1"
                    value={(multipleMaxStakes as any).match2}
                    onChange={(e) =>
                      setMultipleMaxStakes({
                        ...(multipleMaxStakes as any),
                        match2: e.target.value,
                      })
                    }
                    placeholder="e.g., 50000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="match3plus">
                    Maximum Stake (Match At Least ≥ 3)
                  </Label>
                  <Input
                    id="match3plus"
                    type="number"
                    min="0"
                    step="1"
                    value={(multipleMaxStakes as any).match3plus}
                    onChange={(e) =>
                      setMultipleMaxStakes({
                        ...(multipleMaxStakes as any),
                        match3plus: e.target.value,
                      })
                    }
                    placeholder="e.g., 100000"
                  />
                </div>
              </>
            ) : isSportsLike ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="match1">Maximum Stake (Match At Least = 1)</Label>
                  <Input
                    id="match1"
                    type="number"
                    min="0"
                    step="1"
                    value={(multipleMaxStakes as any).match1}
                    onChange={(e) =>
                      setMultipleMaxStakes({
                        ...(multipleMaxStakes as any),
                        match1: e.target.value,
                      })
                    }
                    placeholder="e.g., 10000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="match2">Maximum Stake (Match At Least = 2)</Label>
                  <Input
                    id="match2"
                    type="number"
                    min="0"
                    step="1"
                    value={(multipleMaxStakes as any).match2}
                    onChange={(e) =>
                      setMultipleMaxStakes({
                        ...(multipleMaxStakes as any),
                        match2: e.target.value,
                      })
                    }
                    placeholder="e.g., 50000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="match3">Maximum Stake (Match At Least = 3)</Label>
                  <Input
                    id="match3"
                    type="number"
                    min="0"
                    step="1"
                    value={(multipleMaxStakes as any).match3}
                    onChange={(e) =>
                      setMultipleMaxStakes({
                        ...(multipleMaxStakes as any),
                        match3: e.target.value,
                      })
                    }
                    placeholder="e.g., 75000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="match4plus">
                    Maximum Stake (Match At Least ≥ 4)
                  </Label>
                  <Input
                    id="match4plus"
                    type="number"
                    min="0"
                    step="1"
                    value={(multipleMaxStakes as any).match4plus}
                    onChange={(e) =>
                      setMultipleMaxStakes({
                        ...(multipleMaxStakes as any),
                        match4plus: e.target.value,
                      })
                    }
                    placeholder="e.g., 100000"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="maxStake">Maximum Stake Amount</Label>
                <Input
                  id="maxStake"
                  type="number"
                  min="0"
                  step="1"
                  value={singleMaxStake}
                  onChange={(e) => setSingleMaxStake(e.target.value)}
                  placeholder="e.g., 100000"
                />
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  setIsEditing(false);
                  // Reset to original values
                  if (gameType === "pools") {
                    setMultipleMaxStakes({
                      match1: maxStakes.find((s) => s.match_at_least === 1)?.max_amount.toString() || "",
                      match2: maxStakes.find((s) => s.match_at_least === 2)?.max_amount.toString() || "",
                      match3plus: maxStakes.find((s) => (s.match_at_least ?? null) === null || (s.match_at_least ?? 0) >= 3)
                        ?.max_amount.toString() || "",
                    });
                  } else if (isSportsLike) {
                    setMultipleMaxStakes({
                      match1: maxStakes.find((s) => s.match_at_least === 1)?.max_amount.toString() || "",
                      match2: maxStakes.find((s) => s.match_at_least === 2)?.max_amount.toString() || "",
                      match3: maxStakes.find((s) => s.match_at_least === 3)?.max_amount.toString() || "",
                      match4plus: maxStakes.find((s) => (s.match_at_least ?? null) === null || (s.match_at_least ?? 0) >= 4)
                        ?.max_amount.toString() || "",
                    });
                  } else {
                    setSingleMaxStake(
                      maxStakes.length > 0 && gameType === "lotto" ? maxStakes[0].max_amount.toString() : ""
                    );
                  }
                }}
                variant="outline"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={submitting}
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {gameType === "pools" ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      U1
                    </div>
                    <div className="text-2xl font-bold">
                      ₦{maxStakes.find((s) => s.match_at_least === 1)?.max_amount?.toLocaleString() || "—"}
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      U2
                    </div>
                    <div className="text-2xl font-bold">
                      ₦{maxStakes.find((s) => s.match_at_least === 2)?.max_amount?.toLocaleString() || "—"}
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      U3+
                    </div>
                    <div className="text-2xl font-bold">
                      ₦{(maxStakes.find((s) => (s.match_at_least ?? null) === null || (s.match_at_least ?? 0) >= 3))?.max_amount?.toLocaleString() || "—"}
                    </div>
                  </div>
                </div>
              </>
            ) : isSportsLike ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      U1
                    </div>
                    <div className="text-2xl font-bold">
                      ₦{maxStakes.find((s) => s.match_at_least === 1)?.max_amount?.toLocaleString() || "—"}
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      U2
                    </div>
                    <div className="text-2xl font-bold">
                      ₦{maxStakes.find((s) => s.match_at_least === 2)?.max_amount?.toLocaleString() || "—"}
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      U3
                    </div>
                    <div className="text-2xl font-bold">
                      ₦{maxStakes.find((s) => s.match_at_least === 3)?.max_amount?.toLocaleString() || "—"}
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">
                      U4+
                    </div>
                    <div className="text-2xl font-bold">
                      ₦{(maxStakes.find((s) => (s.match_at_least ?? null) === null || (s.match_at_least ?? 0) >= 4))?.max_amount?.toLocaleString() || "—"}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">
                  Maximum Stake Amount
                </div>
                <div className="text-3xl font-bold">
                  ₦{maxStakes.length > 0 ? maxStakes[0].max_amount.toLocaleString() : "—"}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Update</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update the maximum stake
              {gameType === "pools" ? "s" : ""} for this game? This will affect
              all future bets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={updateMaxStakes}
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
