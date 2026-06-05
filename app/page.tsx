"use client";

import { useEffect } from "react";
import { Hash, Type, Trophy, Sparkles, TrendingUp, Shield } from "lucide-react";
import GameCard from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import useAdminRole from "@/hooks/use-admin-role";

const Home = () => {
  const router = useRouter();
  const { roleInfo, loadingRole } = useAdminRole();

  useEffect(() => {
    if (!loadingRole && roleInfo?.role) {
      if (roleInfo.role === "staff") {
        router.replace("/admin/agents");
      } else if (roleInfo.role === "agent") {
        router.replace("/admin/terminals");
      }
    }
  }, [loadingRole, roleInfo, router]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-linear-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-72 h-72 bg-secondary/5 rounded-full blur-3xl" />

        <div className="container mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 animate-slide-up">
              <Sparkles className="w-4 h-4" />
              Welcome to the future of betting
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
              Experience Premium{" "}
              <span className="bg-clip-text text-transparent bg-linear-to-r from-primary via-primary to-amber-500">
                Betting
              </span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 animate-slide-up" style={{ animationDelay: "200ms" }}>
              Join thousands of players on bet2star. Play number matching, word games, or bet on your favorite football matches.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "300ms" }}>
              <Link href="/lotto">
                <Button variant="gold" size="xl">
                  Start Playing
                </Button>
              </Link>
              <Link href="/results">
                <Button variant="outline" size="xl">
                  View Results
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Games Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Choose Your Game</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Multiple ways to play and win. Select your favorite game type and start betting.
            </p>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <GameCard
              title="Lotto"
              description="Pick your numbers and win amazing prizes. Quick, thrilling, and easy to play."
              icon={Hash}
              path="/lotto"
              gradient="gold"
              delay={0}
            />
            <GameCard
              title="Pools"
              description="Guess winning combinations and earn big rewards. Strategic and fun gameplay."
              icon={Type}
              path="/pools"
              gradient="cyan"
              delay={100}
            />
            <GameCard
              title="Sports Betting"
              description="Wager on your favorite sports teams and matches. Live odds and fast payouts."
              icon={Trophy}
              path="/sports"
              gradient="purple"
              delay={200}
            />
            <GameCard
              title="Football Pool"
              description="Bet only on draw outcomes from the same sports fixtures."
              icon={Trophy}
              path="/sports-draw"
              gradient="purple"
              delay={300}
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-linear-to-b from-muted/30 to-transparent">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6 rounded-2xl bg-card/50 border border-border/50 animate-slide-up">
              <TrendingUp className="w-8 h-8 text-primary mx-auto mb-4" />
              <div className="text-3xl font-bold text-foreground mb-2">$2.5M+</div>
              <div className="text-muted-foreground text-sm">Total Winnings Paid</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-card/50 border border-border/50 animate-slide-up" style={{ animationDelay: "100ms" }}>
              <Shield className="w-8 h-8 text-secondary mx-auto mb-4" />
              <div className="text-3xl font-bold text-foreground mb-2">100%</div>
              <div className="text-muted-foreground text-sm">Secure & Fair Play</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-card/50 border border-border/50 animate-slide-up" style={{ animationDelay: "200ms" }}>
              <Sparkles className="w-8 h-8 text-accent mx-auto mb-4" />
              <div className="text-3xl font-bold text-foreground mb-2">50K+</div>
              <div className="text-muted-foreground text-sm">Active Players</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border/50">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/logo2.png"
                alt="Logo"
                width={250}
                height={33}
              />
            </div>
            <p className="text-muted-foreground text-sm">
              © 2025 bet2star. All rights reserved. Play responsibly.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
