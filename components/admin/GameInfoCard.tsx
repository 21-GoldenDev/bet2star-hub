import { Card } from "@/components/ui/card";

interface GameInfo {
  id: string;
  week: number;
  type: string;
  game_name?: string | null;
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
        {game.game_name ? (
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="text-lg font-semibold">{game.game_name}</p>
          </div>
        ) : null}
        <div>
          <p className="text-sm text-muted-foreground">Type</p>
          <p className="text-lg font-semibold capitalize">{game.type?.replaceAll("_", " ")}</p>
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
