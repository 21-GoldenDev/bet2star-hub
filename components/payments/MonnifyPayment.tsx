"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface MonnifyPaymentProps {
  userEmail: string;
  customerName?: string;
  onSuccess?: (data: {
    reference: string;
    amount: number;
    newBalance: number;
    paidAt?: string;
  }) => void;
}

export default function MonnifyPayment({
  userEmail,
  customerName,
}: MonnifyPaymentProps) {
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!amount || parseFloat(amount) < 100) {
      toast({
        title: "Invalid Amount",
        description: "Minimum deposit amount is ₦100",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/payments/monnify/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          amount: parseFloat(amount),
          customerName,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to initialize payment");
      }

      const checkoutUrl = result.data.checkoutUrl as string | undefined;
      if (!checkoutUrl) {
        throw new Error("Monnify checkout URL was not returned");
      }

      // Hosted checkout → redirects back to /payment-status
      window.location.href = checkoutUrl;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to process payment";
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Amount (₦)
        </label>
        <Input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="100"
          step="100"
          disabled={loading}
          className="text-lg"
        />
        <p className="text-sm text-muted-foreground mt-1">Minimum: ₦100</p>
      </div>

      <Button
        onClick={handlePayment}
        disabled={!amount || parseFloat(amount) < 100 || loading}
        className="w-full"
        variant="gold"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redirecting to Monnify...
          </>
        ) : (
          `Pay ₦${amount || "0"}`
        )}
      </Button>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span>Secured by</span>
        <span className="font-semibold text-foreground">Monnify</span>
      </div>
    </div>
  );
}
