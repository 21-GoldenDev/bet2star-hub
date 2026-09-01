"use client";

import clsx from "clsx";
import { poolsMatchLabel } from "@/lib/pools/formatMatch";

interface Props {
  matches: string[];
  matchLabels?: Record<string, string>;
  classNameFor: (match: string) => string;
  onToggle: (match: string) => void;
  isDisabled?: (match: string) => boolean;
}

export default function MatchPickerGrid({
  matches,
  matchLabels,
  classNameFor,
  onToggle,
  isDisabled,
}: Props) {
  const showEvents = Boolean(matchLabels && Object.keys(matchLabels).length > 0);

  return (
    <div
      className={
        showEvents
          ? "grid grid-cols-1 sm:grid-cols-2 gap-2"
          : "grid grid-cols-3 sm:grid-cols-4 gap-2"
      }
    >
      {matches.map((match) => (
        <button
          key={match}
          type="button"
          onClick={() => onToggle(match)}
          disabled={isDisabled?.(match)}
          className={clsx(
            "rounded-xl font-medium text-sm cursor-pointer transition-all duration-300",
            showEvents ? "p-3 text-left leading-snug" : "p-3 flex items-center justify-center",
            classNameFor(match),
          )}
        >
          {poolsMatchLabel(match, matchLabels)}
        </button>
      ))}
    </div>
  );
}
