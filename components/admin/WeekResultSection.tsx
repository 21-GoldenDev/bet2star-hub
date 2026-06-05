import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

interface Props {
  gameType: "lotto" | "pools";
  weekResult: Array<number | string>;
  applying: boolean;
  hasPendingChanges: boolean;
  onChangeResult: (result: Array<number | string>) => void;
  onApplyResult: () => void;
}

export default function WeekResultSection({
  gameType,
  weekResult,
  applying,
  hasPendingChanges,
  onChangeResult,
  onApplyResult,
}: Props) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const value = e.currentTarget.value.trim();
      if (!value) return;

      if (gameType === "lotto") {
        const num = Number(value);
        if (isNaN(num)) return;
        if (weekResult.some((v) => Number(v) === num)) return;
        const updatedResult = [...weekResult.map((v) => Number(v)), num];
        onChangeResult(updatedResult);
      } else {
        const newSet = new Set(weekResult.map((v) => String(v)));
        newSet.add(value);
        const updatedResult = Array.from(newSet).sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true })
        );
        onChangeResult(updatedResult);
      }
      e.currentTarget.value = "";
    }
  };

  const handleRemoveResult = (idx: number) => {
    const updatedResult = weekResult.filter((_, i) => i !== idx);
    onChangeResult(updatedResult);
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-3">Week Result</h2>
      <Label className="text-sm text-muted-foreground">
        Enter-separated values and press Enter to add
      </Label>
      <div className="mt-2 flex items-center gap-2">
        <Input
          onKeyDown={handleKeyDown}
          className="w-32"
          placeholder={gameType === "lotto" ? "e.g. 25" : "e.g. 12"}
          disabled={applying}
        />
        <div className="flex flex-wrap items-center gap-1">
          {weekResult.map((num, idx) => (
            <span
              key={idx}
              className="px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium flex items-center gap-1"
            >
              {num}
              <XCircle
                className="w-3 h-3 cursor-pointer hover:text-red-600"
                onClick={() => !applying && handleRemoveResult(idx)}
              />
            </span>
          ))}
        </div>
      </div>
      {weekResult.length > 0 && (
        <div className="mt-4">
          <Button
            onClick={onApplyResult}
            disabled={applying || !hasPendingChanges}
          >
            {applying ? "Applying..." : "Apply this result now"}
          </Button>
          {hasPendingChanges && !applying && (
            <p className="mt-2 text-sm text-muted-foreground">
              Unsaved changes — click apply to update winnings and player balances.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
