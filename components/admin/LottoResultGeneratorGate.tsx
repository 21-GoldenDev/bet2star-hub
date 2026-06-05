"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export default function LottoResultGeneratorGate({ children }: Props) {
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/admin/lotto-result-generator/auth");
        if (!response.ok) throw new Error("Failed to check access");
        const data = await response.json();
        setUnlocked(Boolean(data.unlocked));
      } catch (error) {
        console.error("Error checking lotto result generator access:", error);
        setUnlocked(false);
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, []);

  const handleUnlock = async () => {
    if (!password.trim()) {
      toast({
        title: "Password required",
        description: "Enter the password to access this page.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/admin/lotto-result-generator/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid password");
      }

      setUnlocked(true);
      setPassword("");
      toast({
        title: "Access granted",
        description: "You can now use the Lotto Result Generator.",
      });
    } catch (error) {
      toast({
        title: "Access denied",
        description: error instanceof Error ? error.message : "Invalid password",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <div>
              <h1 className="text-xl font-semibold">Lotto Result Generator</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the password to access this page.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lotto-generator-password">Password</Label>
            <Input
              id="lotto-generator-password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUnlock();
              }}
              disabled={submitting}
            />
          </div>

          <Button onClick={handleUnlock} disabled={submitting} className="w-full">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Unlock"
            )}
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
