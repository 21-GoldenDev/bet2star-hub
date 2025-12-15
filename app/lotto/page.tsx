"use client";

import Direct from "@/components/lotto/Direct";
import Grouping from "@/components/lotto/Grouping";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const LottoPage = () => {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-10 animate-slide-up">
          {/* <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            Number Matching
          </div> */}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Pick Your Lucky Numbers</h1>
          <p className="text-muted-foreground">Select numbers from 1-49. Match them to win!</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <Tabs defaultValue="direct">
            <TabsList>
              <TabsTrigger className="cursor-pointer" value="direct">NAP / PERM</TabsTrigger>
              <TabsTrigger className="cursor-pointer" value="grouping">Grouping</TabsTrigger>
            </TabsList>

            <TabsContent className="mt-10" value="direct">
              <Direct />
            </TabsContent>

            <TabsContent className="mt-10" value="grouping">
              <Grouping />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default LottoPage;
