"use client";

import { act, useState } from "react";
import clsx from "clsx";
import Direct from "@/components/lotto/Direct";
import Grouping from "@/components/lotto/Grouping";

const LottoPage = () => {
  const [activeTab, setActiveTab] = useState<"result" | "fixtures">("fixtures");
  const [gameMode, setGameMode] = useState<"nap_perm" | "grouping">("nap_perm");

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-10 animate-slide-up">
          {/* <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            Number Matching
          </div> */}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Pick Your Lucky Numbers</h1>
          <p className="text-muted-foreground">Select numbers from 1-49. Match them to win!</p>
        </div>

        {/* Top Header with Tabs and Info */}
        <div className="mb-6 p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Left: Tab Buttons */}
            <div className="bg-muted flex gap-1 rounded-lg overflow-hidden">
              <button
                onClick={() => setActiveTab("result")}
                className={clsx(
                  "cursor-pointer px-4 py-2 rounded-lg font-medium transition-all",
                  activeTab === "result"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Result
              </button>
              <button
                onClick={() => setActiveTab("fixtures")}
                className={clsx(
                  "cursor-pointer px-4 py-2 rounded-lg font-medium transition-all",
                  activeTab === "fixtures"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Fixtures
              </button>
            </div>

            {/* Right: Info Display (not buttons) */}
            <div className="flex items-center gap-2 text-sm text-center">
              <div className="text-muted-foreground">
                <div className="font-semibold">12:00:00</div>
                <div>14-12-25</div>
              </div>
              <div className="text-muted-foreground border-l-2 border-r-2 border-border px-2">
                <div>Week</div>
                <div className="font-bold">25</div>
              </div>
              <div className="text-muted-foreground">
                <div className="font-semibold">16:00:00</div>
                <div>20-12-25</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          {gameMode === "nap_perm" && (
            <Direct
              activeTab={activeTab}
              gameMode={gameMode}
              setGameMode={setGameMode}
            />
          )}
          {gameMode === "grouping" && (
            <Grouping
              activeTab={activeTab}
              gameMode={gameMode}
              setGameMode={setGameMode}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default LottoPage;
