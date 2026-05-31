"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Paperclip, X } from "lucide-react";
import type { ManualFundingAttachment } from "@/lib/manualFunding";

interface ManualWithdrawFormProps {
  userBalance: number;
  onSuccess?: () => void;
}

export default function ManualWithdrawForm({ userBalance, onSuccess }: ManualWithdrawFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const minWithdrawal = 100;
  const maxWithdrawal = userBalance;

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
    if (!Number.isFinite(parsedAmount) || parsedAmount < minWithdrawal) {
      toast({
        title: "Invalid amount",
        description: `Minimum withdrawal amount is ₦${minWithdrawal}`,
        variant: "destructive",
      });
      return;
    }

    if (parsedAmount > userBalance) {
      toast({
        title: "Insufficient balance",
        description: "You do not have enough balance for this withdrawal",
        variant: "destructive",
      });
      return;
    }

    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      toast({
        title: "Bank details required",
        description: "Provide your bank name, account number, and account name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const attachments = await uploadFiles();

      const response = await fetch("/api/manual-funding/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          message: message.trim(),
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
          attachments,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to submit withdrawal request");
      }

      toast({
        title: "Request submitted",
        description: "Your withdrawal request has been sent to admin for processing",
      });

      setAmount("");
      setMessage("");
      setBankName("");
      setAccountNumber("");
      setAccountName("");
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
        Enter the amount and your bank details. Admin will process the transfer manually.
      </p>

      <div className="space-y-2">
        <Label htmlFor="manual-withdraw-amount">Amount (₦)</Label>
        <Input
          id="manual-withdraw-amount"
          type="number"
          min={minWithdrawal}
          max={maxWithdrawal}
          step={1}
          placeholder={`Min ₦${minWithdrawal}`}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Available: ₦{userBalance.toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="manual-withdraw-bank">Bank Name</Label>
          <Input
            id="manual-withdraw-bank"
            // placeholder="e.g. GTBank"
            value={bankName}
            onChange={(event) => setBankName(event.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="manual-withdraw-account-number">Account Number</Label>
          <Input
            id="manual-withdraw-account-number"
            placeholder="10-digit account number"
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="manual-withdraw-account-name">Account Name</Label>
        <Input
          id="manual-withdraw-account-name"
          placeholder="Name on bank account"
          value={accountName}
          onChange={(event) => setAccountName(event.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="manual-withdraw-message">Note to Admin (optional)</Label>
        <Textarea
          id="manual-withdraw-message"
          placeholder="Any additional instructions for the admin..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={loading}
          rows={3}
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
          Attach supporting documents
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

      <Button type="submit" className="w-full" disabled={loading || userBalance < minWithdrawal}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Withdrawal Request"
        )}
      </Button>
    </form>
  );
}
