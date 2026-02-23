"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SportsMatch } from "@/lib/types/sports";
import { Loader2 } from "lucide-react";

interface Props {
  sports: SportsMatch[];
  oddsMap: Record<number, number>;
  loading: boolean;
  submitting: boolean;
  onSave: (oddsMap: Record<number, number>) => Promise<void>;
}

export default function SportsDrawOddsSection({
  sports,
  oddsMap,
  loading,
  submitting,
  onSave,
}: Props) {
  const [draftOddsMap, setDraftOddsMap] = useState<Record<number, number>>({});

  useEffect(() => {
    setDraftOddsMap(oddsMap);
  }, [oddsMap]);

  const hasChanges = useMemo(() => {
    const allMatchNumbers = sports.map((m) => Number(m.number));
    return allMatchNumbers.some((matchNumber) => {
      const current = Number(draftOddsMap[matchNumber] ?? 0);
      const original = Number(oddsMap[matchNumber] ?? 0);
      return current !== original;
    });
  }, [draftOddsMap, oddsMap, sports]);

  const updateOdd = (matchNumber: number, value: string) => {
    const parsed = Number(value);
    setDraftOddsMap((prev) => ({
      ...prev,
      [matchNumber]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
    }));
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Sports Draw Odds</h2>
          <p className="text-muted-foreground mt-1">
            Set draw (X) odds for Sports Draw game.
          </p>
        </div>
        <Button
          onClick={() => onSave(draftOddsMap)}
          disabled={loading || submitting || !hasChanges || sports.length === 0}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Odds"
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : sports.length === 0 ? (
        <p className="text-sm text-muted-foreground">No imported sports matches found for this game.</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-auto pr-1">
          {sports.map((match) => (
            <div key={match.id} className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-3 items-center p-3 rounded border">
              <div className="text-sm">
                <div className="font-medium">{match.number}. {match.home} vs {match.away}</div>
                <div className="text-muted-foreground">{match.league}</div>
              </div>
              <div>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draftOddsMap[match.number] ?? 0}
                  onChange={(e) => updateOdd(match.number, e.target.value)}
                  placeholder="Draw odd"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}