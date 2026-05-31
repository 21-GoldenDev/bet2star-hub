"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import type { DepositBankDetails } from "@/lib/depositBankDetails.shared";

const emptyDetails: DepositBankDetails = {
  bankName: "",
  accountNumber: "",
  accountName: "",
  note: "",
};

export default function DepositBankDetailsEditor() {
  const { toast } = useToast();
  const [details, setDetails] = useState<DepositBankDetails>(emptyDetails);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadDetails = async () => {
      try {
        const response = await fetch("/api/admin/settings/deposit-bank");
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to load bank details");
        }
        if (!cancelled) {
          setDetails(result);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          toast({
            title: "Failed to load bank details",
            description: error instanceof Error ? error.message : "Please try again",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/deposit-bank", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(details),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save bank details");
      }

      setDetails(result);
      toast({
        title: "Bank details saved",
        description: "Players will see these details on the deposit page.",
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

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Deposit Bank Details</h2>
        <p className="text-sm text-muted-foreground mt-1">
          These details are shown to players on the manual deposit page.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading bank details...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deposit-bank-name">Bank Name</Label>
              <Input
                id="deposit-bank-name"
                value={details.bankName}
                onChange={(event) => setDetails({ ...details, bankName: event.target.value })}
                // placeholder="e.g. Zenith Bank"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deposit-account-number">Account Number</Label>
              <Input
                id="deposit-account-number"
                value={details.accountNumber}
                onChange={(event) => setDetails({ ...details, accountNumber: event.target.value })}
                // placeholder="Account number"
                disabled={saving}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="deposit-account-name">Account Name</Label>
              <Input
                id="deposit-account-name"
                value={details.accountName}
                onChange={(event) => setDetails({ ...details, accountName: event.target.value })}
                // placeholder="Name on bank account"
                disabled={saving}
              />
            </div>
            {/* <div className="space-y-2 md:col-span-4">
              <Label htmlFor="deposit-note">Note to Players (optional)</Label>
              <Textarea
                id="deposit-note"
                value={details.note}
                onChange={(event) => setDetails({ ...details, note: event.target.value })}
                // placeholder="Extra instructions for players after transfer..."
                rows={1}
                disabled={saving}
              />
            </div> */}
          </div>

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
        </>
      )}
    </Card>
  );
}
