"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import {
  getValidBanks,
  hasDepositBankDetails,
  type DepositBankAccount,
} from "@/lib/depositBankDetails.shared";

export default function DepositBankDetailsCard() {
  const [banks, setBanks] = useState<DepositBankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const response = await fetch("/api/settings/deposit-bank");
        const result = await response.json();
        if (response.ok) {
          const loaded = Array.isArray(result.banks) ? result.banks : [];
          setBanks(getValidBanks(loaded));
        }
      } catch (error) {
        console.error("Failed to load deposit bank details:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        Loading bank details...
      </div>
    );
  }

  if (!hasDepositBankDetails(banks)) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        Bank transfer details are not available yet. Please contact support.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Transfer To These Accounts</h3>
      </div>

      {banks.map((bank, index) => (
        <div
          key={bank.id}
          className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3"
        >
          <p className="text-sm font-medium text-foreground">Account {index + 1}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Bank Name</p>
              <p className="font-medium text-foreground">{bank.bankName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Account Number</p>
              <p className="font-medium text-foreground">{bank.accountNumber}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Account Name</p>
              <p className="font-medium text-foreground">{bank.accountName}</p>
            </div>
          </div>

          {bank.note && (
            <p className="text-sm text-muted-foreground border-t border-border pt-3 whitespace-pre-wrap">
              {bank.note}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
