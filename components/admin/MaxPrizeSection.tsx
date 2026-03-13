"use client";

import { useEffect, useState } from "react";
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

interface Props {
  gameId: string;
  gameType: "sports" | "sports_draw";
  maxPrize: Record<string, number>;
  loading: boolean;
  onRefresh: () => void;
}

const SPORTS_KEYS = ["1", "X", "2", "1X", "12", "X2", "OV 2.5", "UN 2.5", "GG"] as const;
const SPORTS_DRAW_KEYS = ["X"] as const;

const SPORTS_DEFAULT_MAX_PRIZE: Record<string, number> = {
  "1": 2,
  X: 1.6,
  "2": 1.9,
  "1X": 1.1,
  "12": 2.1,
  X2: 3.2,
  "OV 2.5": 3,
  "UN 2.5": 3.5,
  GG: 3.1,
};

const SPORTS_DRAW_DEFAULT_MAX_PRIZE: Record<string, number> = {
  X: 1.6,
};

export default function MaxPrizeSection({ gameId, gameType, maxPrize, loading, onRefresh }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  const activeKeys = gameType === "sports" ? SPORTS_KEYS : SPORTS_DRAW_KEYS;
  const defaults = gameType === "sports" ? SPORTS_DEFAULT_MAX_PRIZE : SPORTS_DRAW_DEFAULT_MAX_PRIZE;

  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    return activeKeys.reduce((acc, key) => {
      const value = Number(maxPrize[key] ?? defaults[key]);
      acc[key] = Number.isFinite(value) ? value.toString() : defaults[key].toString();
      return acc;
    }, {} as Record<string, string>);
  });

  useEffect(() => {
    const nextValues = activeKeys.reduce((acc, key) => {
      const value = Number(maxPrize[key] ?? defaults[key]);
      acc[key] = Number.isFinite(value) ? value.toString() : defaults[key].toString();
      return acc;
    }, {} as Record<string, string>);
    setFormValues(nextValues);
  }, [gameType, maxPrize]);

  const updateMaxPrize = async () => {
    try {
      setSubmitting(true);

      const hasEmpty = activeKeys.some((key) => !formValues[key]);
      if (hasEmpty) {
        toast({
          title: "Error",
          description: "Please fill in all max prize values",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      const payload = activeKeys.reduce((acc, key) => {
        const value = Number(formValues[key]);
        acc[key] = Number.isFinite(value) && value > 0 ? value : defaults[key];
        return acc;
      }, {} as Record<string, number>);

      const res = await fetch(`/api/admin/games/${gameId}/max-prize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_type: gameType,
          max_prize: payload,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to update max prize");

      toast({
        title: "Success",
        description: "Maximum prize values updated successfully",
      });

      setIsEditing(false);
      onRefresh();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update max prize",
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

  const displayValues = activeKeys.reduce((acc, key) => {
    const value = Number(maxPrize[key] ?? defaults[key]);
    acc[key] = Number.isFinite(value) ? value : defaults[key];
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Maximum Prize Management</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Set the maximum prize multiplier values for this game
            </p>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-3">
              {activeKeys.map((key) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={`max-prize-${key}`}>{key}</Label>
                  <Input
                    id={`max-prize-${key}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={formValues[key] ?? ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    placeholder="e.g., 1.6"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  setIsEditing(false);
                  const resetValues = activeKeys.reduce((acc, key) => {
                    const value = Number(maxPrize[key] ?? defaults[key]);
                    acc[key] = Number.isFinite(value) ? value.toString() : defaults[key].toString();
                    return acc;
                  }, {} as Record<string, string>);
                  setFormValues(resetValues);
                }}
                variant="outline"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={() => setShowConfirm(true)} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-4">
            {activeKeys.map((key) => (
              <div key={key} className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">{key}</div>
                <div className="text-2xl font-bold">{displayValues[key].toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Update</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update the maximum prize values for this game?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={updateMaxPrize} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
