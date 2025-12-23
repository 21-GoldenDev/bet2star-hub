"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/auth-client";

const ConfirmContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        if (!tokenHash || !type) {
          setError("Invalid confirmation link");
          return;
        }

        const { error: err } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "email" | "recovery" | "magiclink",
        });

        if (err) throw err;

        toast({ title: "Email confirmed successfully!", description: "You can now sign in." });

        setTimeout(() => {
          router.push("/auth");
        }, 2000);
      } catch (err: any) {
        setError(err?.message || "Failed to confirm email");
        toast({ title: "Confirmation failed", description: err?.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    confirmEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen pt-16 flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <Image
              src="/logo2.png"
              alt="Bet2Star Logo"
              width={250}
              height={33}
              className="mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-foreground">
              {loading ? "Confirming Email..." : error ? "Confirmation Failed" : "Email Confirmed!"}
            </h1>
            <p className="text-muted-foreground mt-4">
              {loading
                ? "Please wait while we confirm your email address..."
                : error
                  ? error
                  : "Your email has been successfully confirmed. Redirecting to sign in..."}
            </p>
          </div>

          {loading && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className="text-center">
              <Link
                href="/auth"
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Confirm = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-16 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_hsl(43_96%_56%/0.3)]">
                <span className="text-primary-foreground font-bold text-2xl">B2</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">Loading...</h1>
            </div>
          </div>
        </div>
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
};

export default Confirm;
