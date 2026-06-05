"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface GeneratedEntry {
  numbers: number[];
  totalPayable: number;
  targetWin: number;
  projectedWin: number;
  winPayableGap: number;
  generatedAt: string;
}

interface Props {
  gameId: string;
  showHeading?: boolean;
}

type GenerateMode = "win_equals" | "win_above" | "win_below" | null;

const storageKey = (gameId: string) => `lotto-generated-result:${gameId}`;

function loadStoredResult(gameId: string): GeneratedEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(gameId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GeneratedEntry;
    if (!Array.isArray(parsed?.numbers)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveStoredResult(gameId: string, entry: GeneratedEntry) {
  try {
    localStorage.setItem(storageKey(gameId), JSON.stringify(entry));
  } catch {
    // Ignore storage quota or privacy mode errors.
  }
}

export default function LottoResultGeneratorSection({
  gameId,
  showHeading = true,
}: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<GenerateMode>(null);
  const [aboveDifference, setAboveDifference] = useState("");
  const [belowDifference, setBelowDifference] = useState("");
  const [count, setCount] = useState("6");
  const [rangeMin, setRangeMin] = useState("1");
  const [rangeMax, setRangeMax] = useState("99");
  const [generating, setGenerating] = useState(false);
  const [latestResult, setLatestResult] = useState<GeneratedEntry | null>(() =>
    loadStoredResult(gameId),
  );

  useEffect(() => {
    setLatestResult(loadStoredResult(gameId));
  }, [gameId]);

  const handleModeChange = (nextMode: GenerateMode, checked: boolean) => {
    setMode(checked ? nextMode : null);
  };

  const handleGenerate = async () => {
    if (!mode) {
      toast({
        title: "Select a target",
        description: "Choose how total winning should relate to total payable.",
        variant: "destructive",
      });
      return;
    }

    const diffValue = mode === "win_above" ? Number(aboveDifference) : Number(belowDifference);
    const countValue = Number(count);
    const minValue = Number(rangeMin);
    const maxValue = Number(rangeMax);

    if (mode !== "win_equals" && (!Number.isFinite(diffValue) || diffValue <= 0)) {
      toast({
        title: "Invalid difference",
        description: "Enter a positive amount for the win vs payable difference.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isInteger(countValue) || countValue <= 0) {
      toast({
        title: "Invalid count",
        description: "How many numbers must be a positive whole number.",
        variant: "destructive",
      });
      return;
    }

    if (
      !Number.isInteger(minValue) ||
      !Number.isInteger(maxValue) ||
      minValue < 1 ||
      maxValue > 99 ||
      minValue >= maxValue
    ) {
      toast({
        title: "Invalid range",
        description: "Range must be whole numbers with 1 ≤ min < max ≤ 99.",
        variant: "destructive",
      });
      return;
    }

    try {
      setGenerating(true);
      const res = await fetch(`/api/admin/games/${gameId}/lotto/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          ...(mode !== "win_equals" ? { difference: diffValue } : {}),
          count: countValue,
          rangeMin: minValue,
          rangeMax: maxValue,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate result");

      const entry: GeneratedEntry = {
        numbers: data.numbers,
        totalPayable: data.totalPayable,
        targetWin: data.targetWin,
        projectedWin: data.projectedWin,
        winPayableGap: data.winPayableGap,
        generatedAt: new Date().toLocaleString(),
      };

      setLatestResult(entry);
      saveStoredResult(gameId, entry);
      toast({
        title: "Result generated",
        description: "Numbers saved on this page only — not applied as the week result.",
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Could not generate result",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(value);

  return (
    <Card className="p-6">
      {showHeading && (
        <>
          <h2 className="text-lg font-semibold mb-4">Lotto Result Generator</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Generate candidate numbers based on the gap between total winning and total payable.
            Results are previewed here only and are not applied automatically.
          </p>
        </>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Checkbox
            id="win-equals"
            checked={mode === "win_equals"}
            onCheckedChange={(checked) => handleModeChange("win_equals", checked === true)}
            disabled={generating}
          />
          <Label htmlFor="win-equals" className="cursor-pointer">
            Total Winning approx equals Payable
          </Label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Checkbox
            id="win-above"
            checked={mode === "win_above"}
            onCheckedChange={(checked) => handleModeChange("win_above", checked === true)}
            disabled={generating}
          />
          <Label htmlFor="win-above" className="cursor-pointer">
            Total Winning approx greater than payable
          </Label>
          <Input
            type="number"
            min={0}
            placeholder="Input the amount"
            value={aboveDifference}
            onChange={(e) => setAboveDifference(e.target.value)}
            className="w-36"
            disabled={generating || mode !== "win_above"}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Checkbox
            id="win-below"
            checked={mode === "win_below"}
            onCheckedChange={(checked) => handleModeChange("win_below", checked === true)}
            disabled={generating}
          />
          <Label htmlFor="win-below" className="cursor-pointer">
            Total Winning less than Payable
          </Label>
          <Input
            type="number"
            min={0}
            placeholder="Input the amount"
            value={belowDifference}
            onChange={(e) => setBelowDifference(e.target.value)}
            className="w-36"
            disabled={generating || mode !== "win_below"}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Label htmlFor="count">How many numbers</Label>
          <Input
            id="count"
            type="number"
            min={1}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="w-24"
            disabled={generating}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Label>Range</Label>
          <Input
            type="number"
            min={1}
            max={99}
            value={rangeMin}
            onChange={(e) => setRangeMin(e.target.value)}
            className="w-24"
            disabled={generating}
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="number"
            min={1}
            max={99}
            value={rangeMax}
            onChange={(e) => setRangeMax(e.target.value)}
            className="w-24"
            disabled={generating}
          />
        </div>

        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate"
          )}
        </Button>
      </div>

      {latestResult && (
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold">Generated Result</h3>
          <div className="rounded-lg border border-border p-4 space-y-2">
            <p className="text-xs text-muted-foreground">{latestResult.generatedAt}</p>
            <div className="flex flex-wrap gap-1">
              {latestResult.numbers.map((num, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium"
                >
                  {num}
                </span>
              ))}
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Total payable: {formatCurrency(latestResult.totalPayable)}</p>
              <p>Target win: {formatCurrency(latestResult.targetWin)}</p>
              <p>Projected win: {formatCurrency(latestResult.projectedWin)}</p>
              <p>
                Projected gap (Payable - Winning): {formatCurrency(
                  latestResult.totalPayable - latestResult.projectedWin,
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
