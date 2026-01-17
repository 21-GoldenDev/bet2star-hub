"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import useSupabaseUser from "@/hooks/use-supabase-user";
import { getUserProfile } from "@/lib/auth";
import PaystackPayment from "@/components/payments/PaystackPayment";
import { useToast } from "@/hooks/use-toast";

const Deposit = () => {
  const { user, isLoading: userLoading } = useSupabaseUser();
  const toast = useToast();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserBalance();
    }
  }, [user]);

  const loadUserBalance = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await getUserProfile(user.id);
      setBalance(profile?.balance || 0);
    } catch (error) {
      toast.toast({
        title: "Error",
        description: "Failed to load balance",
        variant: "destructive",
      });
      console.error("Failed to load balance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (data: any) => {
    // Reload user balance after successful payment
    await loadUserBalance();
    toast.toast({
      title: "Deposit Successful!",
      description: `₦${data.amount} has been added to your account`,
    });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen pt-20 pb-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-20 pb-8 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Please Sign In
          </h1>
          <p className="text-muted-foreground mb-6">
            You need to be signed in to make a deposit
          </p>
          <Link
            href="/auth"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Deposit Funds
          </h1>
          <p className="text-muted-foreground">
            Add money to your account to start betting
          </p>
        </div>

        {/* Current Balance */}
        <div className="bg-linear-to-r from-primary/20 to-secondary/20 border border-primary/30 rounded-2xl p-6 mb-6">
          <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
          <p className="text-4xl font-bold text-foreground">
            {loading ? "..." : `₦${balance.toLocaleString()}`}
          </p>
        </div>

        {/* Paystack Payment */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Make a Deposit
          </h2>
          <PaystackPayment
            userEmail={user.email!}
            onSuccess={handlePaymentSuccess}
          />
        </div>

        {/* Payment Info */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Payment Information
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Instant deposits with cards</li>
            <li>• Support for bank transfers and USSD</li>
            <li>• Secure payment processing</li>
            <li>• No hidden fees</li>
            <li>• 24/7 customer support</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Deposit;
