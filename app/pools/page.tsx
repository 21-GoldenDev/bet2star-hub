"use client";

import Direct from "@/components/pools/Direct";
import Grouping from "@/components/pools/Grouping";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const matches = [
  "Arsenal vs Everton", "Burnley vs Brighton", "Arsenal vs Brighton",
  "Chelsea vs Liverpool", "Man United vs Man City", "Tottenham vs Newcastle",
  "Aston Villa vs West Ham", "Wolves vs Leicester", "Southampton vs Crystal Palace",
  "Brentford vs Fulham", "Nottm Forest vs Bournemouth", "Luton vs Sheffield Utd",
  "Arsenal vs Chelsea", "Liverpool vs Tottenham", "Man City vs Newcastle",
  "Brighton vs Aston Villa", "Everton vs West Ham", "Leicester vs Wolves",
  "Crystal Palace vs Southampton", "Fulham vs Brentford", "Bournemouth vs Nottm Forest",
  "Sheffield Utd vs Luton", "Arsenal vs Liverpool", "Chelsea vs Man City",
  "Tottenham vs Man United", "Newcastle vs Brighton", "West Ham vs Aston Villa",
  "Wolves vs Everton", "Leicester vs Southampton", "Crystal Palace vs Fulham",
  "Brentford vs Bournemouth", "Nottm Forest vs Sheffield Utd", "Luton vs Arsenal",
  "Liverpool vs Chelsea", "Man City vs Tottenham", "Man United vs Newcastle",
  "Brighton vs West Ham", "Aston Villa vs Wolves", "Everton vs Leicester",
  "Southampton vs Brentford", "Fulham vs Nottm Forest", "Bournemouth vs Luton",
  "Sheffield Utd vs Arsenal", "Chelsea vs Man United", "Liverpool vs Man City",
  "Tottenham vs Brighton", "Newcastle vs Aston Villa", "West Ham vs Everton",
  "Wolves vs Crystal Palace"
];

const PoolsPage = () => {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-10 animate-slide-up">
          {/* <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-sm font-medium mb-4">
            <Type className="w-4 h-4" />
            Pools
          </div> */}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Pick Your Match Predictions
          </h1>
          <p className="text-muted-foreground">Select Premier League matches and predict the outcomes!</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <Tabs defaultValue="direct">
            <TabsList>
              <TabsTrigger className="cursor-pointer" value="direct">NAP / PERM</TabsTrigger>
              <TabsTrigger className="cursor-pointer" value="grouping">Grouping</TabsTrigger>
            </TabsList>

            <TabsContent className="mt-10" value="direct">
              <Direct matches={matches} />
            </TabsContent>

            <TabsContent className="mt-10" value="grouping">
              <Grouping matches={matches} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default PoolsPage;
