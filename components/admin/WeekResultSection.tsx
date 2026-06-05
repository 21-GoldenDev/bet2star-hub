import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LOTTO_RESULT_MIN = 1;
const LOTTO_RESULT_MAX = 49;
const POOLS_RESULT_MIN = 1;
const POOLS_RESULT_MAX = 99;

function isValidLottoResultNumber(value: string): number | null {
  const num = Number(value);
  if (!Number.isInteger(num) || num < LOTTO_RESULT_MIN || num > LOTTO_RESULT_MAX) {
    return null;
  }
  return num;
}

function isValidPoolsResultNumber(value: string): number | null {
  const num = Number(value);
  if (!Number.isInteger(num) || num < POOLS_RESULT_MIN || num > POOLS_RESULT_MAX) {
    return null;
  }
  return num;
}

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
  const { toast } = useToast();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const value = e.currentTarget.value.trim();
      if (!value) return;

      if (gameType === "lotto") {
        const num = isValidLottoResultNumber(value);
        if (num === null) {
          toast({
            title: "Invalid number",
            description: `Lotto result numbers must be between ${LOTTO_RESULT_MIN} and ${LOTTO_RESULT_MAX}.`,
            variant: "destructive",
          });
          return;
        }
        if (weekResult.some((v) => Number(v) === num)) return;
        const updatedResult = [...weekResult.map((v) => Number(v)), num];
        onChangeResult(updatedResult);
      } else {
        const num = isValidPoolsResultNumber(value);
        if (num === null) {
          toast({
            title: "Invalid number",
            description: `Pools result numbers must be between ${POOLS_RESULT_MIN} and ${POOLS_RESULT_MAX}.`,
            variant: "destructive",
          });
          return;
        }
        const numStr = String(num);
        if (weekResult.some((v) => String(v) === numStr)) return;
        const newSet = new Set(weekResult.map((v) => String(v)));
        newSet.add(numStr);
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
        {gameType === "lotto"
          ? "Enter numbers between 1 and 49, then press Enter to add"
          : "Enter numbers between 1 and 99, then press Enter to add"}
      </Label>
      <div className="mt-2 flex items-center gap-2">
        <Input
          onKeyDown={handleKeyDown}
          className="w-32"
          type="number"
          min={gameType === "lotto" ? LOTTO_RESULT_MIN : POOLS_RESULT_MIN}
          max={gameType === "lotto" ? LOTTO_RESULT_MAX : POOLS_RESULT_MAX}
          placeholder={gameType === "lotto" ? "1-49" : "1-99"}
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
      <div className="mt-4">
        <Button
          onClick={onApplyResult}
          disabled={applying || !hasPendingChanges}
        >
          {applying ? "Applying..." : "Apply this result now"}
        </Button>
        {hasPendingChanges && !applying && (
          <p className="mt-2 text-sm text-muted-foreground">
            {weekResult.length > 0
              ? "Unsaved changes — click apply to update winnings and player balances."
              : "Unsaved changes — click apply to clear the week result and reset winnings."}
          </p>
        )}
      </div>
    </Card>
  );
}
