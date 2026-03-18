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
  league_id: string;
  number: number;
  home: string;
  away: string;
  prizes: number[];
  status: "active" | "void";
  start_time?: string;
  end_time?: string;
}

const DEFAULT_MATCH = {
  league_id: "",
  number: 1,
  home: "",
  away: "",
  prizes: [],
  status: "void" as "active" | "void",
  start_time: "",
  end_time: "",
};

interface Props {
  gameId: string;
  sports: SportsMatch[];
  maxPrize: Record<string, number>;
  loading: boolean;
  drawMode: boolean;
  onRefresh: () => void;
}

export default function SportsMatchesSection({ gameId, sports, maxPrize, loading, drawMode, onRefresh }: Props) {
  type MatchTabKey = "active" | "expired" | "processed";
  const [isAddSportsOpen, setIsAddSportsOpen] = useState(false);
  const [isManageMetaOpen, setIsManageMetaOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MatchTabKey>("active");
  const [submitting, setSubmitting] = useState(false);
  const [addSportsCountryId, setAddSportsCountryId] = useState("");
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

  const MAX_PRIZE_KEYS = ["1", "X", "2", "1X", "12", "X2", "OV 2.5", "UN 2.5", "GG"] as const;
  const SPORTS_DEFAULT_MAX_PRIZE: Record<string, number> = {
    "1": 2,
    X: 1.6,
    "2": 1.9,
    "1X": 1.1,
    "12": 2.1,
    X2: 3.2,
    "OV 2.5": 3,
    "UN 2.5": 3.5,
    GG: 3.1,
  };
  const SPORTS_DRAW_DEFAULT_MAX_PRIZE: Record<string, number> = { X: 1.6 };

  const getPrizeLimitByIndex = (index: number) => {
    if (drawMode) {
      const configured = Number(maxPrize.X);
      return Number.isFinite(configured) && configured > 1 ? configured : SPORTS_DRAW_DEFAULT_MAX_PRIZE.X;
    }

    const key = MAX_PRIZE_KEYS[index];
    const configured = Number(maxPrize[key]);
    return Number.isFinite(configured) && configured > 1 ? configured : SPORTS_DEFAULT_MAX_PRIZE[key];
  };

  const clampPrizeValue = (value: number, index: number) => {
    const safeValue = Number.isFinite(value) ? Math.max(1, value) : 1;
    return Math.min(safeValue, getPrizeLimitByIndex(index));
  };

  const PRIZE_LABELS = drawMode ? ["X"] : ["1", "X", "2", "1X", "12", "X2", "Over 2.5", "Under 2.5", "GG"];
  const addDialogLeagueOptions = leagues.filter((league) => league.country_id === addSportsCountryId);
  const leaguesForSelectedCountry = leagueCountryId
    ? leagues.filter((league) => league.country_id === leagueCountryId)
    : leagues;

  const handleOpenAddSports = () => {
    const defaultCountryId = countries[0]?.id ?? "";
    const defaultLeagueId = leagues.find((league) => league.country_id === defaultCountryId)?.id ?? "";

    setAddSportsCountryId(defaultCountryId);
    setSportsForm({
      ...DEFAULT_MATCH,
      league_id: defaultLeagueId,
      number: Math.max(...sports.map(s => s.number), 0) + 1,
      prizes: drawMode ? [1] : [1, 1, 1, 1, 1, 1, 1, 1, 1],
    });
    setIsAddSportsOpen(true);
  };

  useEffect(() => {
    if (!addSportsCountryId) {
      setSportsForm((prev) => ({ ...prev, league_id: "" }));
      return;
    }

    const firstLeagueForCountryId = leagues.find((league) => league.country_id === addSportsCountryId)?.id ?? "";
    setSportsForm((prev) => {
      const leagueStillValid = leagues.some(
        (league) => league.country_id === addSportsCountryId && league.id === prev.league_id
      );
      if (leagueStillValid) return prev;
      return { ...prev, league_id: firstLeagueForCountryId };
    });
  }, [addSportsCountryId, leagues]);

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
    if (!addSportsCountryId || !sportsForm.league_id || !sportsForm.home || !sportsForm.away) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    const firstExceeded = sportsForm.prizes.findIndex((value, index) => Number(value) > getPrizeLimitByIndex(index));
    if (firstExceeded >= 0) {
      const label = drawMode ? "X" : PRIZE_LABELS[firstExceeded];
      toast({
        title: "Error",
        description: `${label} prize cannot be greater than max prize`,
        variant: "destructive",
      });
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
          status: sportsForm.status || "void",
          home_goal: drawMode ? 1 : undefined,
          away_goal: drawMode ? 0 : undefined,
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

  const now = new Date();
  const hasStarted = (match: SportsMatch) => {
    if (!match.start_time) return false;
    const start = new Date(match.start_time);
    if (isNaN(start.getTime())) return false;
    return start <= now;
  };

  const activeMatches = sports.filter((match) => !(match as any).processed && !hasStarted(match));
  const expiredMatches = sports.filter((match) => !(match as any).processed && hasStarted(match));
  const processedMatches = sports.filter((match) => Boolean((match as any).processed));

  const tabMatches = drawMode
    ? sports
    : activeTab === "active"
      ? activeMatches
      : activeTab === "expired"
        ? expiredMatches
        : processedMatches;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Sports Matches</h2>
          <p className="text-muted-foreground mt-1">Manage matches and goals for this sports game</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isManageMetaOpen} onOpenChange={setIsManageMetaOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Manage Countries & Leagues</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-screen overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Countries & Leagues</DialogTitle>
              </DialogHeader>
              <Card className="p-4">
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
                      ) : leagueCountryId && leaguesForSelectedCountry.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No leagues for selected country.</p>
                      ) : (
                        leaguesForSelectedCountry.map((league) => (
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
            </DialogContent>
          </Dialog>

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
                  <Label>Country</Label>
                  <Select value={addSportsCountryId} onValueChange={setAddSportsCountryId}>
                    <SelectTrigger>
                      <SelectValue placeholder={countries.length > 0 ? "Select country" : "No countries available"} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {countries.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Create a country before adding matches.</p>
                  )}
                </div>
                <div>
                  <Label>League</Label>
                  <Select
                    value={sportsForm.league_id}
                    onValueChange={(value) => setSportsForm({ ...sportsForm, league_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={addDialogLeagueOptions.length > 0 ? "Select league" : "No leagues available"} />
                    </SelectTrigger>
                    <SelectContent>
                      {addDialogLeagueOptions.map((league) => (
                      <SelectItem key={league.id} value={league.id}>
                        {league.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {addSportsCountryId && addDialogLeagueOptions.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">No leagues found for selected country.</p>
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
                        max={getPrizeLimitByIndex(0)}
                        value={sportsForm.prizes[0] ?? 1}
                        onChange={(e) => {
                          const value = clampPrizeValue(Number(e.target.value), 0);
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
                            max={getPrizeLimitByIndex(idx)}
                            value={sportsForm.prizes[idx] ?? 1}
                            onChange={(e) => {
                              const value = clampPrizeValue(Number(e.target.value), idx);
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
                  <Button
                    className="flex-1"
                    onClick={addSportsMatch}
                    disabled={submitting || countries.length === 0 || addDialogLeagueOptions.length === 0}
                  >
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
      </div>

      {!drawMode && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            variant={activeTab === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("active")}
          >
            Actives ({activeMatches.length})
          </Button>
          <Button
            variant={activeTab === "expired" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("expired")}
          >
            Expired ({expiredMatches.length})
          </Button>
          <Button
            variant={activeTab === "processed" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("processed")}
          >
            Processed Matches ({processedMatches.length})
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : tabMatches.length === 0 ? (
        <Card className="p-8 text-center">
          {!drawMode ? (
            <p className="text-muted-foreground">
              {activeTab === "active" ? "No active matches" : activeTab === "expired" ? "No expired matches" : "No processed matches"}
            </p>
          ) : (
            <p className="text-muted-foreground">No matches added yet</p>
          )}
          {(drawMode || activeTab === "active") && (
            <Button className="mt-4" onClick={handleOpenAddSports}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Match
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {tabMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              countries={countries}
              leagues={leagues}
              gameId={gameId}
              maxPrize={maxPrize}
              drawMode={drawMode}
              showFinishButton={!drawMode && activeTab === "expired"}
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
