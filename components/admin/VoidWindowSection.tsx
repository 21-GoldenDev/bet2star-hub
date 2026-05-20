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
  voidWindowMinutes: number | null;
  loading: boolean;
  onRefresh: () => void;
}

export default function VoidWindowSection({
  gameId,
  voidWindowMinutes,
  loading,
  onRefresh,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [unlimited, setUnlimited] = useState(voidWindowMinutes == null);
  const [minutes, setMinutes] = useState(
    voidWindowMinutes != null ? String(voidWindowMinutes) : "30"
  );
  const { toast } = useToast();

  useEffect(() => {
    setUnlimited(voidWindowMinutes == null);
    setMinutes(voidWindowMinutes != null ? String(voidWindowMinutes) : "30");
  }, [voidWindowMinutes]);

  const saveVoidWindow = async () => {
    try {
      setSubmitting(true);

      let value: number | null = null;
      if (!unlimited) {
        const parsed = Number(minutes);
        if (!Number.isFinite(parsed) || parsed < 0) {
          toast({
            title: "Invalid value",
            description: "Enter a non-negative number of minutes, or enable unlimited voiding.",
            variant: "destructive",
          });
          return;
        }
        value = parsed;
      }

      const res = await fetch(`/api/admin/games/${gameId}/void-window`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voidWindowMinutes: value }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update time to void bets");
      }

      toast({
        title: "Success",
        description: unlimited
          ? "Time to void bets removed — staff can void bets without a time limit."
          : `Time to void bets set to ${value} minute(s) after each bet is placed.`,
      });

      setIsEditing(false);
      onRefresh();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update time to void bets",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const displayValue =
    voidWindowMinutes == null
      ? "No limit"
      : `${voidWindowMinutes} minute${voidWindowMinutes === 1 ? "" : "s"}`;

  return (
    <>
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Time to void bets</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Admin can only void bets within this time after placement.
            </p>
          </div>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} disabled={loading}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="mt-4 space-y-4 max-w-md">
            <div className="flex items-center gap-2">
              <input
                id="void-unlimited"
                type="checkbox"
                checked={unlimited}
                onChange={(e) => setUnlimited(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="void-unlimited">No time limit</Label>
            </div>
            {!unlimited && (
              <div>
                <Label htmlFor="void-minutes">Minutes after bet placement</Label>
                <Input
                  id="void-minutes"
                  type="number"
                  min={0}
                  step={1}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => setShowConfirm(true)} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setUnlimited(voidWindowMinutes == null);
                  setMinutes(voidWindowMinutes != null ? String(voidWindowMinutes) : "30");
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-lg font-semibold">{displayValue}</p>
        )}
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update time to void bets?</AlertDialogTitle>
            <AlertDialogDescription>
              {unlimited
                ? "Bets can be voided by admins, staff, and agents at any time (no window)."
                : `Bets can only be voided within ${minutes} minute(s) after they are placed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveVoidWindow} disabled={submitting}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
