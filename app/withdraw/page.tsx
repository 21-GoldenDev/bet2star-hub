"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft } from "lucide-react";
import useSupabaseUser from "@/hooks/use-supabase-user";
import { getUserProfile } from "@/lib/auth";
import ManualWithdrawForm from "@/components/payments/ManualWithdrawForm";
import supabase from "@/lib/supabase/client";

const Withdraw = () => {
  const { user } = useSupabaseUser();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recentWithdrawals, setRecentWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      const { data: profile } = await getUserProfile(user.id);
      setBalance(profile?.balance || 0);

      // Load actual withdrawal transactions from database
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'withdrawal')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Failed to load withdrawals:', error);
        setRecentWithdrawals([]);
      } else {
        const formattedWithdrawals = (transactions || []).map((tx: any) => ({
          id: tx.id,
          amount: tx.amount,
          method: tx.payment_method === "manual" ? "Manual Request" : (tx.payment_method || "Bank Transfer"),
          status: tx.status,
          date: new Date(tx.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          reference: tx.reference,
        }));
        setRecentWithdrawals(formattedWithdrawals);
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
      setRecentWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawalSuccess = async () => {
    await loadUserData();
  };
  if (!user) {
    return (
      <div className="min-h-screen pt-20 pb-8 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Please Sign In
          </h1>
          <p className="text-muted-foreground mb-6">
            You need to be signed in to make a withdrawal
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
            Withdraw Funds
          </h1>
          <p className="text-muted-foreground">
            Submit a withdrawal request with your bank details for admin processing
          </p>
        </div>

        {/* Available Balance */}
        <div className="bg-linear-to-r from-secondary/20 to-accent/20 border border-secondary/30 rounded-2xl p-6 mb-6">
          <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
          <p className="text-4xl font-bold text-foreground">
            {loading ? "..." : `₦${balance.toLocaleString()}`}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Request Withdrawal
          </h2>
          <ManualWithdrawForm userBalance={balance} onSuccess={handleWithdrawalSuccess} />
        </div>

        {/* Recent Withdrawals */}
        <div className="bg-card border border-border rounded-2xl p-6 mt-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Recent Withdrawals
          </h2>
          <div className="space-y-3">
            {recentWithdrawals.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No withdrawals yet</p>
            ) : (
              recentWithdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted"
              >
                <div>
                  <p className="font-medium text-foreground">
                    -₦{withdrawal.amount}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {withdrawal.method} • {withdrawal.date}
                  </p>
                </div>
                <span
                  className={clsx(
                    "px-3 py-1 rounded-full text-xs font-medium",
                    withdrawal.status === "completed"
                      ? "bg-secondary/20 text-secondary"
                      : withdrawal.status === "pending"
                        ? "bg-primary/20 text-primary"
                        : withdrawal.status === "cancelled"
                          ? "bg-muted text-muted-foreground"
                          : "bg-destructive/20 text-destructive"
                  )}
                >
                  {withdrawal.status}
                </span>
              </div>
            ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Withdraw;
