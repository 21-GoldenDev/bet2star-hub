export interface Match {
  id: string;
  number: number;
  home: string;
  away: string;
  status: "enable" | "disable";
  week: number;
  created_at?: string;
  updated_at?: string;
}
