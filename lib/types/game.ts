import { GameType } from "./gameMode";
import { Prize } from "./prize";

export interface Game {
  id: string;
  week: number;
  type: GameType;
  start_time?: string; // from database
  end_time?: string; // from database
  startTime?: string; // for form compatibility
  endTime?: string; // for form compatibility
  prizes?: Prize[];
  results?: number[] | string[] | object[] | null;
  max_stake?: any; // JSONB field
}
