import { Card } from "@/components/ui/card";

interface Props {
  stats: {
    totalBetAmount: number;
    totalReward: number;
  };
}

export default function GameStatsCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Betting Amount</p>
            <p className="text-3xl font-bold mt-2">
              {new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: "NGN",
              }).format(stats.totalBetAmount)}
            </p>
          </div>
        </div>
      </Card>
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Reward Payable</p>
            <p className="text-3xl font-bold mt-2">
              {new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: "NGN",
              }).format(stats.totalReward)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
