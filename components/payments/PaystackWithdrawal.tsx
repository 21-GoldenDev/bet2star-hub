"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface Bank {
  id: number;
  name: string;
  code: string;
  slug: string;
}

interface PaystackWithdrawalProps {
  userId: string;
  userBalance: number;
  onSuccess?: (data: any) => void;
}

export default function PaystackWithdrawal({
  userId,
  userBalance,
  onSuccess,
}: PaystackWithdrawalProps) {
  const [amount, setAmount] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [accountVerified, setAccountVerified] = useState(false);

  const minWithdrawal = 100;
  const maxWithdrawal = Math.min(5000000, userBalance);

  // Fetch banks on mount
  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const response = await fetch("/api/payments/paystack/banks");
      const result = await response.json();

      if (result.success) {
        setBanks(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch banks:", error);
      toast({
        title: "Error",
        description: "Failed to load banks list",
        variant: "destructive",
      });
    }
  };

  const verifyAccountNumber = async () => {
    if (!accountNumber || !bankCode) {
      toast({
        title: "Missing Information",
        description: "Please enter account number and select bank",
        variant: "destructive",
      });
      return;
    }

    if (accountNumber.length !== 10) {
      toast({
        title: "Invalid Account Number",
        description: "Account number must be 10 digits",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);
    setAccountName("");
    setAccountVerified(false);

    try {
      const response = await fetch("/api/payments/paystack/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountNumber,
          bankCode,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAccountName(result.data.account_name);
        setAccountVerified(true);
        toast({
          title: "Account Verified",
          description: `${result.data.account_name}`,
        });
      } else {
        throw new Error(result.error || "Failed to verify account");
      }
    } catch (error: any) {
      console.error("Account verification error:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Could not verify account details",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleWithdrawal = async () => {
    const withdrawAmount = parseFloat(amount);

    // Validation
    if (!withdrawAmount || withdrawAmount < minWithdrawal) {
      toast({
        title: "Invalid Amount",
        description: `Minimum withdrawal amount is ₦${minWithdrawal}`,
        variant: "destructive",
      });
      return;
    }

    if (withdrawAmount > maxWithdrawal) {
      toast({
        title: "Invalid Amount",
        description: `Maximum withdrawal amount is ₦${maxWithdrawal.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }

    if (!accountVerified || !accountName) {
      toast({
        title: "Account Not Verified",
        description: "Please verify your account details first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/payments/paystack/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          amount: withdrawAmount,
          accountNumber,
          bankCode,
          accountName,
          reason: "Withdrawal from Bet2Star",
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Withdrawal Initiated",
          description: `₦${withdrawAmount.toLocaleString()} will be transferred to ${accountName}`,
        });
        
        // Reset form
        setAmount("");
        setAccountNumber("");
        setBankCode("");
        setAccountName("");
        setAccountVerified(false);
        
        onSuccess?.(result.data);
      } else {
        throw new Error(result.error || "Failed to process withdrawal");
      }
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to process withdrawal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isValidAmount =
    amount && parseFloat(amount) >= minWithdrawal && parseFloat(amount) <= maxWithdrawal;

  return (
    <div className="space-y-4">
      {/* Amount Input */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Amount (₦)
        </label>
        <Input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min={minWithdrawal}
          max={maxWithdrawal}
          step="100"
          disabled={loading}
          className="text-lg"
        />
        <p className="text-sm text-muted-foreground mt-1">
          Min: ₦{minWithdrawal} • Max: ₦{maxWithdrawal.toLocaleString()}
        </p>
        {amount && !isValidAmount && (
          <div className="flex items-center gap-2 mt-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>
              {parseFloat(amount) < minWithdrawal
                ? `Minimum withdrawal is ₦${minWithdrawal}`
                : `Maximum withdrawal is ₦${maxWithdrawal.toLocaleString()}`}
            </span>
          </div>
        )}
      </div>

      {/* Bank Selection */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Select Bank
        </label>
        <Select
          value={bankCode}
          onValueChange={(value) => {
            setBankCode(value);
            setAccountName("");
            setAccountVerified(false);
          }}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose your bank" />
          </SelectTrigger>
          <SelectContent>
            {banks.map((bank) => (
              <SelectItem key={bank.code} value={bank.code}>
                {bank.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Account Number */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Account Number
        </label>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter 10-digit account number"
            value={accountNumber}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 10);
              setAccountNumber(value);
              setAccountName("");
              setAccountVerified(false);
            }}
            maxLength={10}
            disabled={loading}
          />
          <Button
            onClick={verifyAccountNumber}
            disabled={
              !accountNumber ||
              !bankCode ||
              accountNumber.length !== 10 ||
              verifying ||
              loading
            }
            variant="outline"
          >
            {verifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Verify"
            )}
          </Button>
        </div>
      </div>

      {/* Account Name Display */}
      {accountName && (
        <div className="flex items-center gap-2 p-3 bg-secondary/10 border border-secondary rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-secondary" />
          <div>
            <p className="text-sm text-muted-foreground">Account Name</p>
            <p className="font-medium text-foreground">{accountName}</p>
          </div>
        </div>
      )}

      {/* Withdraw Button */}
      <Button
        onClick={handleWithdrawal}
        disabled={!isValidAmount || !accountVerified || loading}
        className="w-full"
        variant="cyan"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Withdraw ₦${amount || "0"}`
        )}
      </Button>

      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Withdrawals are processed within 24 hours
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          🔒 Secured by Paystack
        </p>
      </div>
    </div>
  );
}
