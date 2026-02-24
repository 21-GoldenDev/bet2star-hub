"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SportsCountry, SportsLeague, SportsMatch } from "@/lib/types/sports";
import MatchCard from "./MatchCard";

interface MatchInfo {
  league: string;
  number: number;
  home: string;
  away: string;
  prizes: number[];
  status: "active" | "void";
  start_time?: string;
  end_time?: string;
}

const DEFAULT_MATCH = {
  league: "",
  number: 1,
  home: "",
  away: "",
  prizes: [],
  status: "active" as "active" | "void",
  start_time: "",
  end_time: "",
};

interface Props {
  gameId: string;
  sports: SportsMatch[];
  loading: boolean;
  drawMode: boolean;
  onRefresh: () => void;
}

export default function SportsMatchesSection({ gameId, sports, loading, drawMode, onRefresh }: Props) {
  const [isAddSportsOpen, setIsAddSportsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sportsForm, setSportsForm] = useState<MatchInfo>({ ...DEFAULT_MATCH, prizes: drawMode ? [0] : [0, 0, 0, 0, 0, 0, 0, 0, 0] });
  const [isMatchDeleteAlertOpen, setIsMatchDeleteAlertOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<SportsMatch | null>(null);
  const [countries, setCountries] = useState<SportsCountry[]>([]);
  const [leagues, setLeagues] = useState<SportsLeague[]>([]);
  const [countryName, setCountryName] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [leagueCountryId, setLeagueCountryId] = useState("");
  const [metaLoading, setMetaLoading] = useState(false);
  const [managing, setManaging] = useState(false);
  const { toast } = useToast();

  const PRIZE_LABELS = drawMode ? ["X"] : ["1", "X", "2", "1X", "12", "X2", "Over 2.5", "Under 2.5", "GG"];
  const leagueOptions = Array.from(
    new Set([
      ...leagues.map((league) => league.name),
      ...sports.map((match) => match.league).filter((league): league is string => Boolean(league)),
    ])
  );

  const handleOpenAddSports = () => {
    setSportsForm({
      ...DEFAULT_MATCH,
      league: leagueOptions[0] ?? "",
      number: Math.max(...sports.map(s => s.number), 0) + 1,
      prizes: drawMode ? [0] : [0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
    setIsAddSportsOpen(true);
  };

  const fetchMetadata = async () => {
    try {
      setMetaLoading(true);
      const [countriesRes, leaguesRes] = await Promise.all([
        fetch("/api/admin/sports/countries"),
        fetch("/api/admin/sports/leagues"),
      ]);

      const countriesData = await countriesRes.json();
      const leaguesData = await leaguesRes.json();

      if (!countriesRes.ok) {
        throw new Error(countriesData.error || "Failed to fetch countries");
      }
      if (!leaguesRes.ok) {
        throw new Error(leaguesData.error || "Failed to fetch leagues");
      }

      const nextCountries = countriesData.countries ?? [];
      const nextLeagues = leaguesData.leagues ?? [];

      setCountries(nextCountries);
      setLeagues(nextLeagues);
      setLeagueCountryId((prev) => {
        if (prev && nextCountries.some((country: SportsCountry) => country.id === prev)) return prev;
        return nextCountries[0]?.id ?? "";
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch countries and leagues",
        variant: "destructive",
      });
    } finally {
      setMetaLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  const addCountry = async () => {
    if (!countryName.trim()) {
      toast({ title: "Error", description: "Country name is required", variant: "destructive" });
      return;
    }

    try {
      setManaging(true);
      const res = await fetch("/api/admin/sports/countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: countryName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create country");

      toast({ title: "Success", description: "Country created" });
      setCountryName("");
      await fetchMetadata();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create country",
        variant: "destructive",
      });
    } finally {
      setManaging(false);
    }
  };

  const addLeague = async () => {
    if (!leagueCountryId || !leagueName.trim()) {
      toast({ title: "Error", description: "Country and league name are required", variant: "destructive" });
      return;
    }

    try {
      setManaging(true);
      const res = await fetch("/api/admin/sports/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country_id: leagueCountryId, name: leagueName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create league");

      toast({ title: "Success", description: "League created" });
      setLeagueName("");
      await fetchMetadata();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create league",
        variant: "destructive",
      });
    } finally {
      setManaging(false);
    }
  };

  const deleteCountry = async (countryId: string) => {
    try {
      setManaging(true);
      const res = await fetch(`/api/admin/sports/countries/${countryId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete country");

      toast({ title: "Deleted", description: "Country removed" });
      await fetchMetadata();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete country",
        variant: "destructive",
      });
    } finally {
      setManaging(false);
    }
  };

  const deleteLeague = async (leagueId: string) => {
    try {
      setManaging(true);
      const res = await fetch(`/api/admin/sports/leagues/${leagueId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete league");

      toast({ title: "Deleted", description: "League removed" });
      await fetchMetadata();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete league",
        variant: "destructive",
      });
    } finally {
      setManaging(false);
    }
  };

  const formatDateTimeLocal = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const addSportsMatch = async () => {
    if (!sportsForm.league || !sportsForm.home || !sportsForm.away) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      const startIso = sportsForm.start_time ? new Date(sportsForm.start_time).toISOString() : null;
      const endIso = sportsForm.end_time ? new Date(sportsForm.end_time).toISOString() : null;
      const res = await fetch(`/api/admin/games/${gameId}/sports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sportsForm,
          prizes: sportsForm.prizes,
          status: sportsForm.status || "active",
          start_time: startIso,
          end_time: endIso,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add match");
      toast({ title: "Success", description: "Match added" });
      setIsAddSportsOpen(false);
      onRefresh();
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to add match",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openMatchDeleteDialog = (row: SportsMatch) => {
    setMatchToDelete(row);
    setIsMatchDeleteAlertOpen(true);
  };

  const deleteSportsMatch = async () => {
    if (!matchToDelete) return;

    try {
      const res = await fetch(`/api/admin/games/${gameId}/sports/${matchToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete match");
      toast({ title: "Deleted", description: "Match removed" });
      onRefresh();
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to delete match",
        variant: "destructive",
      });
    } finally {
      setIsMatchDeleteAlertOpen(false);
      setMatchToDelete(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Sports Matches</h2>
          <p className="text-muted-foreground mt-1">Manage matches and goals for this sports game</p>
        </div>
        <Dialog open={isAddSportsOpen} onOpenChange={setIsAddSportsOpen}>
          <DialogTrigger asChild>
            <Button size="lg" disabled={loading} onClick={handleOpenAddSports}>
              <Plus className="w-4 h-4 mr-2" />
              Add Match
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-125 max-h-screen overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Match</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>League</Label>
                <Select
                  value={sportsForm.league}
                  onValueChange={(value) => setSportsForm({ ...sportsForm, league: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={leagueOptions.length > 0 ? "Select league" : "No leagues available"} />
                  </SelectTrigger>
                  <SelectContent>
                    {leagueOptions.map((league) => (
                      <SelectItem key={league} value={league}>
                        {league}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {leagueOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Create a league before adding matches.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Number</Label>
                  <Input
                    type="number"
                    min="1"
                    value={sportsForm.number}
                    onChange={(e) => setSportsForm({ ...sportsForm, number: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={sportsForm.status}
                    onValueChange={(value) =>
                      setSportsForm({ ...sportsForm, status: value as "active" | "void" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="void">Void</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={formatDateTimeLocal(sportsForm.start_time)}
                    onChange={(e) => setSportsForm({ ...sportsForm, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="datetime-local"
                    value={formatDateTimeLocal(sportsForm.end_time)}
                    onChange={(e) => setSportsForm({ ...sportsForm, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Home Team</Label>
                  <Input
                    value={sportsForm.home}
                    onChange={(e) => setSportsForm({ ...sportsForm, home: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Away Team</Label>
                  <Input
                    value={sportsForm.away}
                    onChange={(e) => setSportsForm({ ...sportsForm, away: e.target.value })}
                  />
                </div>
              </div>
              {drawMode ? (
                <div>
                  <Label>Prize</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={sportsForm.prizes[0] ?? 0}
                      onChange={(e) => {
                        const value = Math.max(0, Number(e.target.value));
                        const updated = [...sportsForm.prizes];
                        updated[0] = value;
                        setSportsForm({ ...sportsForm, prizes: updated });
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Prizes</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRIZE_LABELS.map((label, idx) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="w-24 text-sm text-muted-foreground">{label}</span>
                        <Input
                          type="number"
                          min="0"
                          value={sportsForm.prizes[idx] ?? 0}
                          onChange={(e) => {
                            const value = Math.max(0, Number(e.target.value));
                            const updated = [...sportsForm.prizes];
                            updated[idx] = value;
                            setSportsForm({ ...sportsForm, prizes: updated });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsAddSportsOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={addSportsMatch} disabled={submitting || leagueOptions.length === 0}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Match"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4 mb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="font-semibold">Countries</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Country name"
                value={countryName}
                onChange={(e) => setCountryName(e.target.value)}
                disabled={managing}
              />
              <Button onClick={addCountry} disabled={managing || !countryName.trim()}>
                Add
              </Button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {(metaLoading && countries.length === 0) ? (
                <p className="text-sm text-muted-foreground">Loading countries...</p>
              ) : countries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No countries yet.</p>
              ) : (
                countries.map((country) => (
                  <div key={country.id} className="flex items-center justify-between border rounded-md px-2 py-1.5">
                    <span className="text-sm">{country.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCountry(country.id)}
                      disabled={managing}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Leagues</h3>
            <div className="space-y-2">
              <Select value={leagueCountryId} onValueChange={setLeagueCountryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  placeholder="League name"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  disabled={managing}
                />
                <Button onClick={addLeague} disabled={managing || !leagueCountryId || !leagueName.trim()}>
                  Add
                </Button>
              </div>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {(metaLoading && leagues.length === 0) ? (
                <p className="text-sm text-muted-foreground">Loading leagues...</p>
              ) : leagues.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leagues yet.</p>
              ) : (
                leagues.map((league) => (
                  <div key={league.id} className="flex items-center justify-between border rounded-md px-2 py-1.5 gap-2">
                    <span className="text-sm truncate">{league.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{league.country?.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteLeague(league.id)}
                      disabled={managing}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : sports.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No matches added yet</p>
          <Button className="mt-4" onClick={handleOpenAddSports}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Match
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {sports.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              gameId={gameId}
              drawMode={drawMode}
              leagueOptions={leagueOptions}
              onDelete={openMatchDeleteDialog}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {/* Sports Match Delete Confirmation Dialog */}
      <AlertDialog open={isMatchDeleteAlertOpen} onOpenChange={setIsMatchDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the match.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteSportsMatch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
