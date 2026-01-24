"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import clsx from "clsx";

interface Props {
  gameId: string;
  loading: boolean;
}

export default function LottoNumbersSection({ gameId, loading }: Props) {
  const [visibleNumbers, setVisibleNumbers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { toast } = useToast();

  const numbers = Array.from({ length: 99 }, (_, i) => i + 1);

  useEffect(() => {
    fetchVisibleNumbers();
  }, [gameId]);

  const fetchVisibleNumbers = async () => {
    try {
      setInitialLoading(true);
      const res = await fetch(`/api/admin/games/${gameId}/lotto/numbers`);
      if (res.ok) {
        const data = await res.json();
        setVisibleNumbers(data.visibleNumbers || numbers);
      } else {
        setVisibleNumbers(numbers);
      }
    } catch (error) {
      console.error("Error fetching visible numbers:", error);
      setVisibleNumbers(numbers);
    } finally {
      setInitialLoading(false);
    }
  };

  const toggleNumber = (num: number) => {
    setVisibleNumbers((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };

  const handleSelectAll = () => {
    setVisibleNumbers(numbers);
  };

  const handleDeselectAll = () => {
    setVisibleNumbers([]);
  };

  const handleSave = async () => {
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
        description: `${visibleNumbers.length} numbers are now visible`,
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Lotto Numbers</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Show or hide numbers for players. {visibleNumbers.length} of {numbers.length} visible
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={submitting}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              disabled={submitting}
            >
              Deselect All
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 bg-muted/50 rounded-lg p-4">
          {numbers.map((num) => {
            const isVisible = visibleNumbers.includes(num);
            return (
              <button
                key={num}
                onClick={() => toggleNumber(num)}
                className={clsx(
                  "aspect-square w-12 rounded-lg font-bold text-sm transition-all duration-200",
                  isVisible
                    ? "cursor-pointer bg-primary text-primary-foreground shadow-md"
                    : "cursor-pointer bg-muted border border-border hover:bg-muted/80 text-muted-foreground line-through"
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
              "Save Visible Numbers"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
