"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchCount: number;
  leagueCount: number;
  onPrint: () => void;
}

export default function PrintMatchesDialog({
  open,
  onOpenChange,
  matchCount,
  leagueCount,
  onPrint,
}: Props) {
  const sheetLabel =
    matchCount === 1 ? "1 match" : `${matchCount} matches`;
  const leagueLabel =
    leagueCount === 1 ? "1 league" : `${leagueCount} leagues`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 border-[#3c4043] bg-[#202124] p-0 text-[#e8eaed] shadow-2xl sm:rounded-xl [&>button]:hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b border-[#3c4043] px-5 py-4">
          <DialogTitle className="text-base font-medium text-[#e8eaed]">Print</DialogTitle>
          <DialogDescription className="text-xs text-[#9aa0a6]">
            {sheetLabel} · {leagueLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4 text-sm text-[#9aa0a6]">
          <p>
            Print today&apos;s sports matches and odds as a compact sheet. Use your
            browser print dialog to choose printer, pages, and color.
          </p>
          <ul className="space-y-1 text-xs">
            <li>· Markets: 1 / X / 2 / 1X / 12 / X2 / Over 2.5 / Under 2.5 / GG</li>
            <li>· Tip: choose Black and white for clearest odds tables</li>
          </ul>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#3c4043] px-5 py-4">
          <button
            type="button"
            onClick={onPrint}
            className="min-w-[88px] cursor-pointer rounded-full bg-[#8ab4f8] px-5 py-2 text-sm font-medium text-[#202124] transition-opacity hover:opacity-90"
          >
            Print
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="min-w-[88px] cursor-pointer rounded-full border border-[#5f6368] bg-transparent px-5 py-2 text-sm font-medium text-[#e8eaed] transition-colors hover:bg-[#3c4043]"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
