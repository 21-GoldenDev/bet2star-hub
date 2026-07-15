"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "failed" | "pending">("loading");
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    const reference = searchParams.get("reference");

    if (!reference) {
      setStatus("failed");
      setMessage("Invalid payment reference");
      return;
    }

    verifyPayment(reference);
  }, [searchParams]);

  const verifyPayment = async (reference: string) => {
    try {
      const response = await fetch(
        `/api/payments/monnify/verify?reference=${encodeURIComponent(reference)}`
      );
      const result = await response.json();

      if (result.success && result.status === "success") {
        setStatus("success");
        setMessage(result.message || "Payment completed successfully!");
        setDetails(result.data);
      } else if (result.status === "pending") {
        setStatus("pending");
        setMessage(result.message || "Payment is being processed");
        setDetails(result.data);
      } else {
        setStatus("failed");
        setMessage(result.message || "Payment verification failed");
        setDetails(result.data);
      }
    } catch (error: any) {
      console.error("Payment verification error:", error);
      setStatus("failed");
      setMessage(error.message || "Failed to verify payment");
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="w-20 h-20 text-primary animate-spin" />;
      case "success":
        return <CheckCircle2 className="w-20 h-20 text-secondary" />;
      case "pending":
        return <AlertCircle className="w-20 h-20 text-primary" />;
      case "failed":
        return <XCircle className="w-20 h-20 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case "loading":
        return "Verifying Payment...";
      case "success":
        return "Payment Successful!";
      case "pending":
        return "Payment Pending";
      case "failed":
        return "Payment Failed";
      default:
        return "";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "text-secondary";
      case "pending":
        return "text-primary";
      case "failed":
        return "text-destructive";
      default:
        return "text-foreground";
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="bg-card border border-border rounded-2xl p-8">
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {getStatusIcon()}
          </div>

          {/* Status Title */}
          <h1 className={`text-3xl font-bold text-center mb-4 ${getStatusColor()}`}>
            {getStatusTitle()}
          </h1>

          {/* Status Message */}
          <p className="text-center text-muted-foreground mb-6">
            {message}
          </p>

          {/* Payment Details */}
          {details && status === "success" && (
            <div className="bg-muted rounded-xl p-6 mb-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-semibold text-foreground text-lg">
                  ₦{details.amount?.toLocaleString()}
                </span>
              </div>
              {details.reference && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono text-sm text-foreground">
                    {details.reference}
                  </span>
                </div>
              )}
              {details.newBalance !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">New Balance</span>
                  <span className="font-semibold text-secondary text-lg">
                    ₦{details.newBalance?.toLocaleString()}
                  </span>
                </div>
              )}
              {details.paidAt && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Date</span>
                  <span className="text-foreground">
                    {new Date(details.paidAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Pending Details */}
          {status === "pending" && (
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-6 mb-6">
              <p className="text-center text-sm text-muted-foreground">
                Your payment is being processed. This may take a few minutes.
                <br />
                You will receive a notification once it's complete.
              </p>
            </div>
          )}

          {/* Failed Details */}
          {status === "failed" && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 mb-6">
              <p className="text-center text-sm text-muted-foreground">
                If money was deducted from your account, please contact support with your
                transaction reference.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {status === "success" && (
              <>
                <Button
                  onClick={() => router.push("/")}
                  variant="gold"
                  className="flex-1"
                >
                  Continue Betting
                </Button>
                <Button
                  onClick={() => router.push("/profile")}
                  variant="outline"
                  className="flex-1"
                >
                  View Profile
                </Button>
              </>
            )}

            {status === "pending" && (
              <>
                <Button
                  onClick={() => router.push("/profile")}
                  variant="default"
                  className="flex-1"
                >
                  Go to Profile
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex-1"
                >
                  Refresh Status
                </Button>
              </>
            )}

            {status === "failed" && (
              <>
                <Button
                  onClick={() => router.push("/deposit")}
                  variant="default"
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Go Home
                  </Button>
                </Link>
              </>
            )}

            {status === "loading" && (
              <Button disabled className="w-full">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </Button>
            )}
          </div>

          {/* Support Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              Need help?{" "}
              <Link href="#" className="text-primary hover:underline">
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentStatus() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-20 pb-8 px-4 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    }>
      <PaymentStatusContent />
    </Suspense>
  );
}
