"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import {
  createEmptyBankAccount,
  getValidBanks,
  isValidBankAccount,
  type DepositBankAccount,
} from "@/lib/depositBankDetails.shared";

export default function DepositBankDetailsEditor() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [banks, setBanks] = useState<DepositBankAccount[]>([createEmptyBankAccount()]);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings/deposit-bank");
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to load bank details");
      }

      const loadedBanks =
        Array.isArray(result.banks) && result.banks.length > 0
          ? result.banks
          : [createEmptyBankAccount()];

      setBanks(loadedBanks);
      setSavedCount(getValidBanks(loadedBanks).length);
      setLoaded(true);
    } catch (error: unknown) {
      toast({
        title: "Failed to load bank details",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    setIsOpen(true);
    if (!loaded) {
      await loadDetails();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const updateBank = (id: string, field: keyof DepositBankAccount, value: string) => {
    setBanks((prev) =>
      prev.map((bank) => (bank.id === id ? { ...bank, [field]: value } : bank))
    );
  };

  const addBank = () => {
    setBanks((prev) => [...prev, createEmptyBankAccount()]);
  };

  const removeBank = (id: string) => {
    setBanks((prev) => {
      if (prev.length <= 1) {
        return [createEmptyBankAccount()];
      }
      return prev.filter((bank) => bank.id !== id);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/deposit-bank", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banks }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save bank details");
      }

      const savedBanks = result.banks?.length ? result.banks : [createEmptyBankAccount()];
      setBanks(savedBanks);
      setSavedCount(getValidBanks(savedBanks).length);
      setLoaded(true);
      setIsOpen(false);

      toast({
        title: "Bank details saved",
        description: "Players will see these accounts on the deposit page.",
      });
    } catch (error: unknown) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <h2 className="text-base font-semibold">Deposit Bank Details</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {savedCount === null
                  ? "Manage accounts shown to players on the deposit page."
                  : savedCount === 0
                    ? "No bank accounts configured yet."
                    : `${savedCount} bank account${savedCount === 1 ? "" : "s"} configured.`}
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleOpen}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Bank Details
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Deposit Bank Details</h2>
          <p className="text-sm text-muted-foreground mt-1">
            These accounts are shown to players on the manual deposit page.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={addBank} disabled={loading || saving}>
            <Plus className="w-4 h-4 mr-2" />
            Add Bank
          </Button>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={saving}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading bank details...
        </p>
      ) : (
        <>
          <div className="space-y-4">
            {banks.map((bank, index) => (
              <div
                key={bank.id}
                className="rounded-lg border border-border p-4 space-y-4 bg-muted/20"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">
                    Bank {index + 1}
                    {isValidBankAccount(bank) && (
                      <span className="text-muted-foreground font-normal ml-2">
                        {bank.bankName}
                      </span>
                    )}
                  </p>
                  {banks.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeBank(bank.id)}
                      disabled={saving}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`deposit-bank-name-${bank.id}`}>Bank Name</Label>
                    <Input
                      id={`deposit-bank-name-${bank.id}`}
                      value={bank.bankName}
                      onChange={(event) => updateBank(bank.id, "bankName", event.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`deposit-account-number-${bank.id}`}>Account Number</Label>
                    <Input
                      id={`deposit-account-number-${bank.id}`}
                      value={bank.accountNumber}
                      onChange={(event) =>
                        updateBank(bank.id, "accountNumber", event.target.value)
                      }
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`deposit-account-name-${bank.id}`}>Account Name</Label>
                    <Input
                      id={`deposit-account-name-${bank.id}`}
                      value={bank.accountName}
                      onChange={(event) => updateBank(bank.id, "accountName", event.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Bank Details
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
