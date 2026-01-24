import { Card } from "@/components/ui/card";

interface GameInfo {
  id: string;
  week: number;
  type: string;
  start_time: string;
  end_time: string;
  results?: string[] | number[] | null;
}

interface Props {
  game: GameInfo;
}

export default function GameInfoCard({ game }: Props) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Game Information</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Week</p>
          <p className="text-lg font-semibold">{game.week}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Type</p>
          <p className="text-lg font-semibold capitalize">{game.type}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Start Time</p>
          <p className="text-sm">{new Date(game.start_time).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">End Time</p>
          <p className="text-sm">{new Date(game.end_time).toLocaleString()}</p>
        </div>
      </div>
    </Card>
  );
}
