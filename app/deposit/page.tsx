"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  Smartphone,
  Building2,
  Check,
  Plus,
} from "lucide-react";

const Deposit = () => {
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const quickAmounts = [50, 100, 250, 500, 1000];

  const paymentMethods = [
    {
      id: "card",
      name: "Credit/Debit Card",
      icon: CreditCard,
      description: "Visa, Mastercard, AMEX",
      fee: "No fees",
    },
    {
      id: "crypto",
      name: "Cryptocurrency",
      icon: Wallet,
      description: "BTC, ETH, USDT",
      fee: "No fees",
    },
    {
      id: "mobile",
      name: "Mobile Payment",
      icon: Smartphone,
      description: "Apple Pay, Google Pay",
      fee: "No fees",
    },
    {
      id: "bank",
      name: "Bank Transfer",
      icon: Building2,
      description: "Direct bank transfer",
      fee: "1-3 business days",
    },
  ];

  const handleDeposit = () => {
    if (!amount || !selectedMethod) return;
    console.log("Depositing:", { amount, method: selectedMethod });
  };

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
          <p className="text-4xl font-bold text-foreground">$1,250.00</p>
        </div>

        {/* Amount Selection */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Select Amount
          </h2>

          <div className="grid grid-cols-5 gap-2 mb-4">
            {quickAmounts.map((quickAmount) => (
              <button
                key={quickAmount}
                onClick={() => setAmount(quickAmount.toString())}
                className={`py-3 rounded-lg font-medium transition-all ${
                  amount === quickAmount.toString()
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                ${quickAmount}
              </button>
            ))}
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              placeholder="Enter custom amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-10 h-14 text-xl bg-muted border-border"
            />
          </div>

          <p className="text-sm text-muted-foreground mt-2">
            Min: $10 • Max: $10,000
          </p>
        </div>

        {/* Payment Methods */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Payment Method
          </h2>

          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  selectedMethod === method.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-border/80 hover:bg-muted/50"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedMethod === method.id
                      ? "bg-primary text-primary-foreground"
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
                  <p className="text-sm text-secondary">{method.fee}</p>
                  {selectedMethod === method.id && (
                    <Check className="w-5 h-5 text-primary ml-auto mt-1" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Add New Card */}
          {selectedMethod === "card" && (
            <button className="w-full flex items-center justify-center gap-2 p-4 mt-4 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-muted-foreground hover:text-foreground">
              <Plus className="w-5 h-5" />
              Add New Card
            </button>
          )}
        </div>

        {/* Deposit Summary */}
        {amount && selectedMethod && (
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-muted-foreground">
                <span>Deposit Amount</span>
                <span className="text-foreground">${amount}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Processing Fee</span>
                <span className="text-secondary">$0.00</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-primary text-xl">${amount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Deposit Button */}
        <Button
          variant="gold"
          className="w-full h-14 text-lg"
          disabled={!amount || !selectedMethod}
          onClick={handleDeposit}
        >
          Deposit ${amount || "0"}
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-4">
          🔒 Secure payment powered by Stripe
        </p>
      </div>
    </div>
  );
};

export default Deposit;
