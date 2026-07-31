"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import PrintableMatchSheet from "@/components/sports/PrintableMatchSheet";
import { SportsMatchRow } from "@/components/sports/types";
import {
  formatSportsMatchForSheet,
  groupSportsMatchesByLeague,
} from "@/lib/sports/sheetShare";
import { Game } from "@/lib/types/game";

export default function SportsSheetPage() {
  const [game, setGame] = useState<Game | null>(null);
  const [matches, setMatches] = useState<SportsMatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/games/sports/active");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load fixtures");

      const now = Date.now();
      const formatted = (data.matches || [])
        .filter((m: any) => {
          const expired = m.end_time ? new Date(m.end_time).getTime() <= now : false;
          return !expired && !Boolean(m.processed);
        })
        .map(formatSportsMatchForSheet);

      setGame(data.game ?? null);
      setMatches(formatted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load fixtures");
      setGame(null);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groupedMatches = useMemo(
    () => groupSportsMatchesByLeague(matches),
    [matches],
  );

  const handleDownloadPdf = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden border-b border-border bg-card/95 sticky top-0 z-10">
        <div className="container mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">Sports fixtures</h1>
            <p className="text-xs text-muted-foreground">
              View matches and download as PDF
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={loading || matches.length === 0}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              type="button"
              variant="gold"
              onClick={handleDownloadPdf}
              disabled={loading || matches.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-2 py-4 print:p-0 print:max-w-none">
        {loading ? (
          <p className="text-center text-muted-foreground py-16">Loading fixtures…</p>
        ) : error ? (
          <p className="text-center text-destructive py-16">{error}</p>
        ) : !game || matches.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            No active sports fixtures available.
          </p>
        ) : (
          <PrintableMatchSheet
            visible
            matches={matches}
            groupedMatches={groupedMatches}
            gameWeek={game.week}
            gameName={game.game_name}
          />
        )}
      </div>
    </div>
  );
}
