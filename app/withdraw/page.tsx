"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  Building2,
  Check,
  AlertCircle,
  Clock,
} from "lucide-react";

const Withdraw = () => {
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const currentBalance = 1250.0;
  const minWithdraw = 20;
  const maxWithdraw = 5000;

  const withdrawMethods = [
    {
      id: "card",
      name: "Credit/Debit Card",
      icon: CreditCard,
      description: "Visa •••• 4242",
      time: "1-3 business days",
    },
    {
      id: "crypto",
      name: "Cryptocurrency",
      icon: Wallet,
      description: "Bitcoin Wallet",
      time: "Within 24 hours",
    },
    {
      id: "bank",
      name: "Bank Transfer",
      icon: Building2,
      description: "Chase Bank •••• 1234",
      time: "3-5 business days",
    },
  ];

  const recentWithdrawals = [
    { id: 1, amount: 200, method: "Bank Transfer", status: "completed", date: "Dec 10, 2024" },
    { id: 2, amount: 500, method: "Crypto", status: "pending", date: "Dec 8, 2024" },
    { id: 3, amount: 150, method: "Card", status: "completed", date: "Dec 5, 2024" },
  ];

  const handleWithdraw = () => {
    if (!amount || !selectedMethod) return;
    console.log("Withdrawing:", { amount, method: selectedMethod });
  };

  const isValidAmount =
    amount &&
    parseFloat(amount) >= minWithdraw &&
    parseFloat(amount) <= Math.min(maxWithdraw, currentBalance);

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
            Transfer your winnings to your preferred account
          </p>
        </div>

        {/* Available Balance */}
        <div className="bg-linear-to-r from-secondary/20 to-accent/20 border border-secondary/30 rounded-2xl p-6 mb-6">
          <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
          <p className="text-4xl font-bold text-foreground">
            ${currentBalance.toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Pending: $500.00
          </p>
        </div>

        {/* Amount Input */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Withdrawal Amount
          </h2>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setAmount((currentBalance * 0.25).toFixed(0))}
              className="flex-1 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors text-sm"
            >
              25%
            </button>
            <button
              onClick={() => setAmount((currentBalance * 0.5).toFixed(0))}
              className="flex-1 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors text-sm"
            >
              50%
            </button>
            <button
              onClick={() => setAmount((currentBalance * 0.75).toFixed(0))}
              className="flex-1 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors text-sm"
            >
              75%
            </button>
            <button
              onClick={() => setAmount(currentBalance.toFixed(0))}
              className="flex-1 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors text-sm"
            >
              Max
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-10 h-14 text-xl bg-muted border-border"
            />
          </div>

          <p className="text-sm text-muted-foreground mt-2">
            Min: ${minWithdraw} • Max: ${Math.min(maxWithdraw, currentBalance)}
          </p>

          {amount && !isValidAmount && (
            <div className="flex items-center gap-2 mt-3 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>
                {parseFloat(amount) < minWithdraw
                  ? `Minimum withdrawal is $${minWithdraw}`
                  : `Maximum withdrawal is $${Math.min(maxWithdraw, currentBalance)}`}
              </span>
            </div>
          )}
        </div>

        {/* Withdrawal Methods */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Withdraw To
          </h2>

          <div className="space-y-3">
            {withdrawMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  selectedMethod === method.id
                    ? "border-secondary bg-secondary/10"
                    : "border-border hover:border-border/80 hover:bg-muted/50"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedMethod === method.id
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <method.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">{method.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {method.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {method.time}
                  </div>
                  {selectedMethod === method.id && (
                    <Check className="w-5 h-5 text-secondary ml-auto mt-1" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Withdraw Button */}
        <Button
          variant="cyan"
          className="w-full h-14 text-lg"
          disabled={!isValidAmount || !selectedMethod}
          onClick={handleWithdraw}
        >
          Withdraw ${amount || "0"}
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Withdrawals are processed within 24 hours
        </p>

        {/* Recent Withdrawals */}
        <div className="bg-card border border-border rounded-2xl p-6 mt-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Recent Withdrawals
          </h2>
          <div className="space-y-3">
            {recentWithdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted"
              >
                <div>
                  <p className="font-medium text-foreground">
                    -${withdrawal.amount}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {withdrawal.method} • {withdrawal.date}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    withdrawal.status === "completed"
                      ? "bg-secondary/20 text-secondary"
                      : "bg-primary/20 text-primary"
                  }`}
                >
                  {withdrawal.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Withdraw;
