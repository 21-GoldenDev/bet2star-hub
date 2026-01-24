"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit2, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SportsMatch } from "@/lib/types/sports";

const PRIZE_LABELS = ["1", "X", "2", "1X", "12", "X2", "Over 2.5", "Under 2.5", "GG"];
const EMPTY_PRIZES = [0, 0, 0, 0, 0, 0, 0, 0, 0];

interface MatchEditInfo {
  league: string;
  number: number;
  home: string;
  away: string;
  home_goal: number;
  away_goal: number;
  prizes: number[];
  status: "active" | "void";
  start_time?: string;
  end_time?: string;
}

interface Props {
  match: SportsMatch;
  gameId: string;
  onDelete: (match: SportsMatch) => void;
  onRefresh: () => void;
}

export default function MatchCard({ match, gameId, onDelete, onRefresh }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editRowForm, setEditRowForm] = useState<MatchEditInfo>({
    league: match.league,
    number: match.number,
    home: match.home,
    away: match.away,
    home_goal: match.home_goal ?? 0,
    away_goal: match.away_goal ?? 0,
    prizes: Array.isArray(match.prizes) && match.prizes.length === PRIZE_LABELS.length
      ? [...match.prizes]
      : [...EMPTY_PRIZES],
    status: (match as any).status ?? "active",
    start_time: match.start_time ?? "",
    end_time: match.end_time ?? "",
  });
  const { toast } = useToast();

  const formatDateTimeLocal = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const startInlineEdit = () => {
    setIsEditing(true);
    setEditRowForm({
      league: match.league,
      number: match.number,
      home: match.home,
      away: match.away,
      home_goal: match.home_goal ?? 0,
      away_goal: match.away_goal ?? 0,
      prizes: Array.isArray(match.prizes) && match.prizes.length === PRIZE_LABELS.length
        ? [...match.prizes]
        : [...EMPTY_PRIZES],
      status: (match as any).status ?? "active",
      start_time: match.start_time ?? "",
      end_time: match.end_time ?? "",
    });
  };

  const cancelInlineEdit = () => {
    setIsEditing(false);
  };

  const saveInlineEdit = async () => {
    try {
      setSubmitting(true);
      const startIso = editRowForm.start_time ? new Date(editRowForm.start_time).toISOString() : null;
      const endIso = editRowForm.end_time ? new Date(editRowForm.end_time).toISOString() : null;
      const res = await fetch(`/api/admin/games/${gameId}/sports/${match.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          league: editRowForm.league,
          number: editRowForm.number,
          home: editRowForm.home,
          away: editRowForm.away,
          home_goal: editRowForm.home_goal,
          away_goal: editRowForm.away_goal,
          prizes: editRowForm.prizes,
          status: editRowForm.status,
          start_time: startIso,
          end_time: endIso,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update match");

      toast({ title: "Success", description: "Match updated" });
      setIsEditing(false);
      onRefresh();
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to update match",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-4">
      {isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Number</Label>
              <Input
                type="number"
                min="1"
                className="h-9"
                value={editRowForm.number}
                onChange={(e) => setEditRowForm({ ...editRowForm, number: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={editRowForm.status}
                onValueChange={(value) =>
                  setEditRowForm({ ...editRowForm, status: value as "active" | "void" })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">League</Label>
            <Input
              className="h-9"
              value={editRowForm.league}
              onChange={(e) => setEditRowForm({ ...editRowForm, league: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Teams</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Home Team"
                className="h-9"
                value={editRowForm.home}
                onChange={(e) => setEditRowForm({ ...editRowForm, home: e.target.value })}
              />
              <Input
                placeholder="Away Team"
                className="h-9"
                value={editRowForm.away}
                onChange={(e) => setEditRowForm({ ...editRowForm, away: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Start Time</Label>
              <Input
                type="datetime-local"
                className="h-9 text-xs"
                value={formatDateTimeLocal(editRowForm.start_time)}
                onChange={(e) => setEditRowForm({ ...editRowForm, start_time: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">End Time</Label>
              <Input
                type="datetime-local"
                className="h-9 text-xs"
                value={formatDateTimeLocal(editRowForm.end_time)}
                onChange={(e) => setEditRowForm({ ...editRowForm, end_time: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Score</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                className="h-9"
                placeholder="Home"
                value={editRowForm.home_goal}
                onChange={(e) =>
                  setEditRowForm({ ...editRowForm, home_goal: Math.max(0, Number(e.target.value)) })
                }
              />
              <span>-</span>
              <Input
                type="number"
                min="0"
                className="h-9"
                placeholder="Away"
                value={editRowForm.away_goal}
                onChange={(e) =>
                  setEditRowForm({ ...editRowForm, away_goal: Math.max(0, Number(e.target.value)) })
                }
              />
            </div>
          </div>
          <div>
            <Label className="text-xs mb-2 block">Prizes</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
              {PRIZE_LABELS.map((label, idx) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-16 text-xs text-muted-foreground">{label}</span>
                  <Input
                    type="number"
                    min="0"
                    className="h-9 text-xs"
                    value={editRowForm.prizes[idx] ?? 0}
                    onChange={(e) => {
                      const value = Math.max(0, Number(e.target.value));
                      const updated = [...editRowForm.prizes];
                      updated[idx] = value;
                      setEditRowForm({ ...editRowForm, prizes: updated });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={saveInlineEdit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={cancelInlineEdit}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-sm font-bold px-2.5 py-0.5 bg-primary/10 border-primary/30">
                  #{match.number}
                </Badge>
                <Badge
                  variant={(match as any).status === "void" ? "secondary" : "default"}
                  className={`text-xs font-semibold px-2.5 py-0.5 capitalize ${(match as any).status === "void" ? "bg-gray-500" : "bg-green-600 hover:bg-green-700"
                    }`}
                >
                  {(match as any).status ?? "active"}
                </Badge>
                <span className="text-xs font-medium text-primary/80 truncate">{match.league}</span>
              </div>
              <div className="bg-linear-to-r from-primary/5 to-transparent rounded px-2 py-1.5 mb-1.5">
                <p className="font-bold text-sm truncate">
                  {match.home} <span className="text-primary font-extrabold mx-1">vs</span> {match.away}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-semibold text-nowrap">
                  Score:{" "}
                  <span className="text-primary font-bold">
                    {match.home_goal ?? 0} - {match.away_goal ?? 0}
                  </span>
                </span>
                <span>
                  Start:{" "}
                  {match.start_time
                    ? new Date(match.start_time).toLocaleString("en-NG", {
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    : "-"}
                </span>
                <span>
                  End:{" "}
                  {match.end_time
                    ? new Date(match.end_time).toLocaleString("en-NG", {
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    : "-"}
                </span>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={startInlineEdit}
                className="h-8 w-8 p-0 hover:bg-primary hover:text-primary-foreground"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(match)}
                className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="pt-1.5 border-t border-black/10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-foreground">Betting Odds</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-9 gap-1.5">
              {PRIZE_LABELS.map((label, idx) => (
                <div
                  key={label}
                  className="bg-linear-to-br from-primary/10 to-primary/5 rounded px-2 py-1 border border-primary/20 flex items-center justify-between"
                >
                  <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                  <span className="text-sm font-bold text-primary">{match.prizes?.[idx] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
