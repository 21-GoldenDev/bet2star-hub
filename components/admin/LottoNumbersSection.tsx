"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import clsx from "clsx";
import {
  DEFAULT_LOTTO_VISIBLE_NUMBERS,
  toDisabledLottoNumbers,
  toVisibleLottoNumbers,
} from "@/lib/bets/lottoNumbers";

interface Props {
  gameId: string;
  loading: boolean;
}

export default function LottoNumbersSection({ gameId, loading }: Props) {
  const [disabledNumbers, setDisabledNumbers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { toast } = useToast();

  const numbers = DEFAULT_LOTTO_VISIBLE_NUMBERS;

  useEffect(() => {
    fetchDisabledNumbers();
  }, [gameId]);

  const fetchDisabledNumbers = async () => {
    try {
      setInitialLoading(true);
      const res = await fetch(`/api/admin/games/${gameId}/lotto/numbers`);
      if (res.ok) {
        const data = await res.json();
        setDisabledNumbers(toDisabledLottoNumbers(data.visibleNumbers));
      } else {
        setDisabledNumbers([]);
      }
    } catch (error) {
      console.error("Error fetching disabled numbers:", error);
      setDisabledNumbers([]);
    } finally {
      setInitialLoading(false);
    }
  };

  const toggleNumber = (num: number) => {
    setDisabledNumbers((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };

  const handleDisableAll = () => {
    setDisabledNumbers(numbers);
  };

  const handleEnableAll = () => {
    setDisabledNumbers([]);
  };

  const handleSave = async () => {
    const visibleNumbers = toVisibleLottoNumbers(disabledNumbers);

    if (visibleNumbers.length === 0) {
      toast({
        title: "Error",
        description: "At least one number must remain enabled",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/games/${gameId}/lotto/numbers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleNumbers }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update numbers");

      toast({
        title: "Success",
        description:
          disabledNumbers.length === 0
            ? "All numbers are enabled"
            : `${disabledNumbers.length} number${disabledNumbers.length === 1 ? "" : "s"} disabled`,
      });
    } catch (error) {
      console.error("Error updating numbers:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update numbers",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || initialLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Disable Numbers</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select numbers to disable for players. {disabledNumbers.length} of {numbers.length} disabled
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisableAll}
              disabled={submitting}
            >
              Disable All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnableAll}
              disabled={submitting}
            >
              Enable All
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 bg-muted/50 rounded-lg p-4">
          {numbers.map((num) => {
            const isDisabled = disabledNumbers.includes(num);
            return (
              <button
                key={num}
                onClick={() => toggleNumber(num)}
                className={clsx(
                  "aspect-square w-12 rounded-lg font-bold text-sm transition-all duration-200",
                  isDisabled
                    ? "cursor-pointer bg-destructive text-destructive-foreground shadow-md line-through"
                    : "cursor-pointer bg-primary text-primary-foreground shadow-md"
                )}
                disabled={submitting}
              >
                {num}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="default"
            onClick={handleSave}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Disabled Numbers"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
