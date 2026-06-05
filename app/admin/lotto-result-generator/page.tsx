"use client";

import { useEffect, useState } from "react";
import LottoResultGeneratorGate from "@/components/admin/LottoResultGeneratorGate";
import LottoResultGeneratorSection from "@/components/admin/LottoResultGeneratorSection";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface LottoWeek {
  id: string;
  week: number;
}

export default function LottoResultGeneratorPage() {
  const { toast } = useToast();
  const [weeks, setWeeks] = useState<LottoWeek[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/admin/bets/lotto/weeks");
        if (!response.ok) throw new Error("Failed to fetch weeks");
        const result = await response.json();
        const weekValues: LottoWeek[] = result.data || [];
        setWeeks(weekValues);
        if (weekValues.length > 0) {
          setSelectedWeekId(weekValues[0].id);
        }
      } catch (error) {
        console.error("Error fetching weeks:", error);
        toast({
          title: "Error",
          description: "Failed to load lotto weeks.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWeeks();
  }, []);

  const selectedWeek = weeks.find((week) => week.id === selectedWeekId);

  return (
    <LottoResultGeneratorGate>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lotto Result Generator</h1>
        <p className="text-muted-foreground mt-2">
          Generate candidate lotto numbers based on the gap between total winning and total
          payable. Results are saved on this page only and are not applied automatically.
        </p>
      </div>

      <div className="max-w-xs space-y-2">
        <Label htmlFor="week-select">Week</Label>
        <Select
          value={selectedWeekId || undefined}
          onValueChange={setSelectedWeekId}
          disabled={loading || weeks.length === 0}
        >
          <SelectTrigger id="week-select">
            <SelectValue placeholder={loading ? "Loading weeks..." : "Select week"} />
          </SelectTrigger>
          <SelectContent>
            {weeks.map((week) => (
              <SelectItem key={week.id} value={week.id}>
                Week {week.week}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedWeek ? (
        <LottoResultGeneratorSection gameId={selectedWeek.id} showHeading={false} />
      ) : (
        !loading && (
          <p className="text-sm text-muted-foreground">No lotto weeks available.</p>
        )
      )}
    </div>
    </LottoResultGeneratorGate>
  );
}
