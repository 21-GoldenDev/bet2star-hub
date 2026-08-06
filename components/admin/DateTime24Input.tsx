"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const TIME_24H = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ITEM_H = 36;

function todayLocal() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Convert YYYY-MM-DD → DD/mm/yyyy for display only. */
function toDisplayDate(isoDate: string) {
  if (!ISO_DATE.test(isoDate)) return "";
  const [yyyy, mm, dd] = isoDate.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

function parseTime(value: string) {
  if (!TIME_24H.test(value)) return { hour: "", minute: "" };
  const [hour, minute] = value.split(":");
  return { hour, minute };
}

function TimeColumn({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected || !listRef.current) return;
    const index = values.indexOf(selected);
    if (index < 0) return;
    const top = Math.max(0, index * ITEM_H - listRef.current.clientHeight / 2 + ITEM_H / 2);
    listRef.current.scrollTop = top;
  }, [selected, values]);

  return (
    <div className="flex flex-col items-center">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div
        ref={listRef}
        className="h-48 w-14 overflow-y-auto overscroll-contain rounded-md border bg-background scroll-smooth"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="flex flex-col py-1">
          {values.map((v) => (
            <button
              key={v}
              type="button"
              style={{ height: ITEM_H }}
              className={cn(
                "shrink-0 w-full text-sm font-mono tabular-nums transition-colors hover:bg-muted",
                selected === v && "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold",
              )}
              onClick={() => onSelect(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Value format: `YYYY-MM-DDTHH:mm`, with date picker + clickable 24h time picker. */
export default function DateTime24Input({
  value,
  onChange,
  className,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [datePart = "", timePart = ""] = value ? value.split("T") : ["", ""];
  const timeHm = TIME_24H.test(timePart.slice(0, 5)) ? timePart.slice(0, 5) : "";
  const { hour: selectedHour, minute: selectedMinute } = parseTime(timeHm);

  const displayDate = useMemo(
    () => (datePart ? toDisplayDate(datePart) : "DD/mm/yyyy"),
    [datePart],
  );
  const displayTime = useMemo(() => timeHm || "HH:mm", [timeHm]);

  const openDatePicker = () => {
    const el = dateInputRef.current;
    if (!el || disabled) return;
    try {
      el.showPicker();
    } catch {
      el.click();
    }
  };

  const commit = (hour: string, minute: string) => {
    if (!hour || !minute) return;
    onChange(`${datePart || todayLocal()}T${hour}:${minute}`);
  };

  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-2">
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start font-mono tabular-nums font-normal px-3",
            !datePart && "text-muted-foreground",
            className,
          )}
          onClick={openDatePicker}
          aria-label="Select date"
        >
          <CalendarIcon className="mr-1 size-4 shrink-0 opacity-70" />
          {displayDate}
        </Button>
        {/* Native calendar kept for selection; value stays YYYY-MM-DD internally */}
        <input
          ref={dateInputRef}
          type="date"
          disabled={disabled}
          value={datePart}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
          onChange={(e) => {
            const date = e.target.value;
            if (!date) {
              onChange("");
              return;
            }
            onChange(`${date}T${timeHm || "00:00"}`);
          }}
        />
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "justify-start font-mono tabular-nums font-normal px-3",
              !timeHm && "text-muted-foreground",
              className,
            )}
            aria-label="Select time (24-hour)"
          >
            <Clock className="mr-1 size-4 shrink-0 opacity-70" />
            {displayTime}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          <div className="mb-2 flex items-center justify-center gap-2">
            <p className="text-sm font-medium">Time (24h)</p>
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
              {selectedHour || "--"}:{selectedMinute || "--"}
            </span>
          </div>
          <div className="flex items-start justify-center gap-3">
            <TimeColumn
              label="H"
              values={HOURS}
              selected={selectedHour}
              onSelect={(h) => {
                const minute = selectedMinute || "00";
                commit(h, minute);
              }}
            />
            <div className="flex h-48 items-center pt-5 text-lg font-semibold text-muted-foreground">:</div>
            <TimeColumn
              label="M"
              values={MINUTES}
              selected={selectedMinute}
              onSelect={(m) => {
                const hour = selectedHour || "00";
                commit(hour, m);
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
