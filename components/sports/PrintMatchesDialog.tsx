"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchCount: number;
  leagueCount: number;
  onPrint: () => void;
}

type Step = "menu" | "whatsapp";

export default function PrintMatchesDialog({
  open,
  onOpenChange,
  matchCount,
  leagueCount,
  onPrint,
}: Props) {
  const [step, setStep] = useState<Step>("menu");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);

  const sheetLabel = matchCount === 1 ? "1 match" : `${matchCount} matches`;
  const leagueLabel = leagueCount === 1 ? "1 league" : `${leagueCount} leagues`;

  const resetAndClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep("menu");
      setPhone("");
      setSending(false);
    }
    onOpenChange(nextOpen);
  };

  const handleExportWhatsApp = async () => {
    if (!phone.trim()) {
      toast.error("Enter a WhatsApp number with country code");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/sports/whatsapp-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to export");
      }

      if (data.sent) {
        toast.success("Fixtures link sent on WhatsApp");
        resetAndClose(false);
        return;
      }

      if (data.waMeUrl) {
        if (data.warning) {
          toast.message("Opening WhatsApp…", { description: data.warning });
        } else {
          toast.success("Opening WhatsApp with the fixtures link");
        }
        window.open(data.waMeUrl, "_blank", "noopener,noreferrer");
        resetAndClose(false);
        return;
      }

      if (data.link) {
        await navigator.clipboard.writeText(data.link);
        toast.success("Link copied — paste it into WhatsApp");
        resetAndClose(false);
        return;
      }

      throw new Error("No link returned");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-sm gap-0 border-[#3c4043] bg-[#202124] p-0 text-[#e8eaed] shadow-2xl sm:rounded-xl [&>button]:hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b border-[#3c4043] px-5 py-4">
          <DialogTitle className="text-base font-medium text-[#e8eaed]">
            {step === "whatsapp" ? "Export to WhatsApp" : "Print"}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#9aa0a6]">
            {sheetLabel} · {leagueLabel}
          </DialogDescription>
        </DialogHeader>

        {step === "menu" ? (
          <>
            <div className="space-y-3 px-5 py-4 text-sm text-[#9aa0a6]">
              <p>
                Print today&apos;s sports matches and odds, or send a view &amp; download
                link on WhatsApp.
              </p>
              <ul className="space-y-1 text-xs">
                <li>· Markets: 1 / X / 2 / 1X / 12 / X2 / Ov2.5 / Un2.5 / GG</li>
                <li>· Layout defaults to Landscape — keep that for best fit</li>
                <li>· Tip: choose Black and white for clearest odds tables</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 border-t border-[#3c4043] px-5 py-4">
              <button
                type="button"
                onClick={onPrint}
                className="w-full cursor-pointer rounded-full bg-[#8ab4f8] px-5 py-2 text-sm font-medium text-[#202124] transition-opacity hover:opacity-90"
              >
                Print
              </button>
              <button
                type="button"
                onClick={() => setStep("whatsapp")}
                className="w-full cursor-pointer rounded-full border border-[#5f6368] bg-[#25D366]/15 px-5 py-2 text-sm font-medium text-[#25D366] transition-colors hover:bg-[#25D366]/25"
              >
                Export to WhatsApp
              </button>
              <button
                type="button"
                onClick={() => resetAndClose(false)}
                className="w-full cursor-pointer rounded-full border border-[#5f6368] bg-transparent px-5 py-2 text-sm font-medium text-[#e8eaed] transition-colors hover:bg-[#3c4043]"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3 px-5 py-4 text-sm text-[#9aa0a6]">
              <p>
                Enter the recipient&apos;s WhatsApp number (with country code). We generate a
                fixtures PDF and send a direct download link (like a media CDN file).
              </p>
              <label className="block space-y-1.5">
                <span className="text-xs text-[#e8eaed]">WhatsApp number</span>
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="e.g. 2348012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="border-[#5f6368] bg-[#292a2d] text-[#e8eaed] placeholder:text-[#9aa0a6]"
                  autoFocus
                />
              </label>
              <p className="text-[11px] text-[#9aa0a6]">
                Include country code, no + or spaces required.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#3c4043] px-5 py-4">
              <button
                type="button"
                disabled={sending}
                onClick={handleExportWhatsApp}
                className="min-w-[88px] cursor-pointer rounded-full bg-[#25D366] px-5 py-2 text-sm font-medium text-[#052e16] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send"}
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => setStep("menu")}
                className="min-w-[88px] cursor-pointer rounded-full border border-[#5f6368] bg-transparent px-5 py-2 text-sm font-medium text-[#e8eaed] transition-colors hover:bg-[#3c4043]"
              >
                Back
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
