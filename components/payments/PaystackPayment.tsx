"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface PaystackPaymentProps {
  userEmail: string;
  onSuccess?: (data: any) => void;
  onClose?: () => void;
}

export default function PaystackPayment({
  userEmail,
  onSuccess,
  onClose,
}: PaystackPaymentProps) {
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
      // Initialize payment
      const response = await fetch("/api/payments/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          amount: parseFloat(amount),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to initialize payment");
      }

      // Wait for Paystack script to be available
      let attempts = 0;
      while (!window.PaystackPop && attempts < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.PaystackPop) {
        throw new Error("Paystack script failed to load. Please refresh the page and try again.");
      }

      // Open Paystack payment modal
      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
        email: userEmail,
        amount: parseFloat(amount) * 100, // Convert to kobo
        ref: result.data.reference,
        onClose: async () => {
          try {
            const cancelResponse = await fetch(
              `/api/payments/paystack/cancel?reference=${result.data.reference}`,
              { method: 'PUT' }
            );
            if (!cancelResponse.ok) {
              console.error('Failed to cancel transaction');
            }
          } catch (error) {
            console.error('Error cancelling transaction:', error);
          }

          toast({
            title: "Payment Cancelled",
            description: "You closed the payment window",
          });
          setLoading(false);
          if (onClose) onClose();
        },
        callback: (response: any) => {
          (async () => {
            try {
              const verifyResponse = await fetch(
                `/api/payments/paystack/verify?reference=${response.reference}`
              );
              const verifyResult = await verifyResponse.json();

              if (verifyResult.success && verifyResult.status === "success") {
                toast({
                  title: "Payment Successful!",
                  description: `₦${amount} has been added to your account`,
                });
                if (onSuccess) onSuccess(verifyResult.data);
              } else {
                toast({
                  title: "Payment Verification Failed",
                  description:
                    verifyResult.message || "Please contact support if money was deducted",
                  variant: "destructive",
                });
              }
            } catch (error) {
              console.error("Verification error:", error);
              toast({
                title: "Verification Error",
                description: "Failed to verify payment. Please contact support.",
                variant: "destructive",
              });
            } finally {
              setLoading(false);
            }
          })();
        },
      });

      handler.openIframe();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to process payment",
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
        <p className="text-sm text-muted-foreground mt-1">
          Minimum: ₦100
        </p>
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
            Processing...
          </>
        ) : (
          `Pay ₦${amount || "0"}`
        )}
      </Button>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span>🔒 Secured by</span>
        <span className="font-semibold text-foreground">Paystack</span>
      </div>
    </div>
  );
}

// Extend Window interface to include PaystackPop
declare global {
  interface Window {
    PaystackPop: any;
  }
}
