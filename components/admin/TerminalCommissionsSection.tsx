"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

interface TerminalCommission {
  terminal: string;
  commission: number;
}

interface TerminalCommissionsSectionProps {
  gameId: string;
  initialCommissions?: TerminalCommission[];
  loading: boolean;
  onRefresh: () => void;
}

export default function TerminalCommissionsSection({
  gameId,
  initialCommissions = [],
  loading,
  onRefresh,
}: TerminalCommissionsSectionProps) {
  const { toast } = useToast();
  const [commissions, setCommissions] = useState<TerminalCommission[]>(() => {
    // Initialize with default commissions for Under 1 to Under 18
    return Array.from({ length: 18 }, (_, i) => ({
      terminal: `Under ${i + 1}`,
      commission: 100,
    }));
  });
  const [submitting, setSubmitting] = useState(false);

  // Update commissions when initialCommissions prop changes
  useEffect(() => {
    if (initialCommissions.length > 0) {
      setCommissions(initialCommissions);
    }
  }, [initialCommissions]);

  const handleCommissionChange = (index: number, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) return;

    const updated = [...commissions];
    updated[index].commission = numValue;
    setCommissions(updated);
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/games/${gameId}/commissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissions }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update commissions");

      toast({
        title: "Success",
        description: "Terminal commissions updated successfully",
      });
      onRefresh();
    } catch (error) {
      console.error("Error updating commissions:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update commissions",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Terminal Commissions</CardTitle>
          <CardDescription>Loading commissions...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Terminal Commissions</CardTitle>
        <CardDescription>
          Set commission percentages for each terminal (0-100%)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {commissions.map((item, index) => (
            <div key={item.terminal} className="space-y-2">
              <Label htmlFor={`commission-${index}`}>{item.terminal}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`commission-${index}`}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={item.commission}
                  onChange={(e) => handleCommissionChange(index, e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={submitting}
          >
            <Save className="w-4 h-4 mr-2" />
            {submitting ? "Saving..." : "Save Commissions"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
