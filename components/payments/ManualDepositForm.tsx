"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Paperclip, X } from "lucide-react";
import type { ManualFundingAttachment } from "@/lib/manualFunding.types";

interface ManualDepositFormProps {
  onSuccess?: () => void;
}

export default function ManualDepositForm({ onSuccess }: ManualDepositFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length + files.length > 5) {
      toast({
        title: "Too many files",
        description: "You can attach up to 5 files",
        variant: "destructive",
      });
      return;
    }
    setFiles((prev) => [...prev, ...selected]);
    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<ManualFundingAttachment[]> => {
    if (files.length === 0) return [];

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await fetch("/api/manual-funding/upload", {
      method: "POST",
      body: formData,
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to upload files");
    }

    return result.attachments || [];
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 100) {
      toast({
        title: "Invalid amount",
        description: "Minimum deposit amount is ₦100",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Tell the admin about your transfer",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const attachments = await uploadFiles();

      const response = await fetch("/api/manual-funding/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          message: message.trim(),
          attachments,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to submit deposit request");
      }

      toast({
        title: "Request submitted",
        description: "Your manual deposit request has been sent to admin for review",
      });

      setAmount("");
      setMessage("");
      setFiles([]);
      onSuccess?.();
    } catch (error: unknown) {
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Transfer money outside the website, then send the admin your transfer details below.
      </p>

      <div className="space-y-2">
        <Label htmlFor="manual-deposit-amount">Amount (₦)</Label>
        <Input
          id="manual-deposit-amount"
          type="number"
          min={100}
          step={1}
          placeholder="Enter amount transferred"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="manual-deposit-message">Message to Admin</Label>
        <Textarea
          id="manual-deposit-message"
          placeholder="Include transfer reference, bank used, date/time, and any other details..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={loading}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Attachments (optional)</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading || files.length >= 5}
        >
          <Paperclip className="w-4 h-4 mr-2" />
          Attach receipt or proof
        </Button>
        {files.length > 0 && (
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"
              >
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Deposit Request"
        )}
      </Button>
    </form>
  );
}
