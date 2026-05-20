"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { Terminal, Agent, Staff } from "@/lib/types/hierarchy";
import { gameModes, GameModeType, GameType } from "@/lib/types/gameMode";
import { Prize } from "@/lib/types/prize";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Edit, Search, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  getActiveTerminalPrizeIds,
  normalizeTerminalPrizeEntries,
  serializeTerminalPrizesForDb,
  type TerminalPrizeStatus,
} from "@/lib/terminals/terminalPrize";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TerminalFormState = {
  serial_number: string;
  agent_id: string;
  password: string;
  credit_limit: number;
  max_stake: number;
  game_types: GameModeType[];
  game_modes: GameType[];
};

type PrizeRow = {
  prize_id: string;
  commission: number;
  status: TerminalPrizeStatus;
  default: boolean;
};

export default function TerminalsPage() {
  const { toast } = useToast();
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAgentId, setFilterAgentId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [formData, setFormData] = useState<TerminalFormState>({
    serial_number: "",
    agent_id: "",
    password: "",
    credit_limit: 0,
    max_stake: 2000000,
    game_types: [],
    game_modes: [],
  });
  const [prizeRows, setPrizeRows] = useState<PrizeRow[]>([
    { prize_id: "", commission: 0, status: "active", default: false },
  ]);

  const rowsToPrizeRows = (
    entries: ReturnType<typeof normalizeTerminalPrizeEntries>
  ): PrizeRow[] =>
    entries.map((row) => ({
      prize_id: row.prize_id,
      commission: Number(row.commission) || 0,
      status: row.status,
      default: row.default,
    }));

  const applySerializedRows = (rows: PrizeRow[]) => {
    const serialized = serializeTerminalPrizesForDb(
      rows.filter((row) => row.prize_id.length > 0)
    );
    return rowsToPrizeRows(serialized);
  };

  const gameTypeOptions = [["under1", "Under 1"], ["under2", "Under 2"]] as const;
  const gameModeOptions: Array<{ value: GameType; label: string }> = [
    { value: "lotto", label: "Lotto" },
    { value: "pools", label: "Pools" },
    { value: "sports", label: "Sports" },
    { value: "sports_draw", label: "Football Pool" },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [terminalRes, agentRes, staffRes, prizeRes] = await Promise.all([
        fetch("/api/agents/terminals"),
        fetch("/api/agents"),
        fetch("/api/staff"),
        fetch("/api/admin/prize"),
      ]);
      const terminalData = await terminalRes.json();
      const agentData = await agentRes.json();
      const staffData = await staffRes.json();
      const prizeData = await prizeRes.json();
      setTerminals(terminalData);
      setAgents(agentData);
      setStaff(staffData);
      setPrizes(prizeData?.prizes || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const sanitizedPrizes = serializeTerminalPrizesForDb(
        prizeRows.filter((row) => row.prize_id.length > 0)
      );
      const activeIds = getActiveTerminalPrizeIds(sanitizedPrizes);
      const hasDefault = sanitizedPrizes.some((p) => p.default && p.status === "active");
      if (activeIds.length > 0 && !hasDefault) {
        toast({
          title: "Default prize required",
          description: "Mark one active prize as default.",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        serial_number: formData.serial_number,
        agent_id: formData.agent_id,
        password: formData.password,
        credit_limit: parseFloat(formData.credit_limit.toString()),
        max_stake: Number(formData.max_stake) || 0,
        game_types: formData.game_types,
        game_modes: formData.game_modes,
        prizes: sanitizedPrizes,
      };

      const url = editingId
        ? `/api/agents/terminals/${editingId}`
        : "/api/agents/terminals";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save terminal");

      await fetchData();
      setOpenDialog(false);
      resetForm();
    } catch (error) {
      console.error("Error saving terminal:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/agents/terminals/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete terminal");
      }

      await fetchData();
      setDeleteId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete terminal";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      console.error("Error deleting terminal:", error);
    }
  };

  const handleToggleStatus = async (terminalId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const res = await fetch(`/api/agents/terminals/${terminalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to toggle status");

      await fetchData();
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleSetAllStatus = async (status: "active" | "inactive") => {
    try {
      const terminalsToUpdate = terminals.filter((terminal) => terminal.status !== status);
      if (terminalsToUpdate.length === 0) {
        toast({
          title: status === "active" ? "Nothing to enable" : "Nothing to disable",
          description: `All terminals are already ${status === "active" ? "enabled" : "disabled"}.`,
          variant: "default",
        });
        return;
      }

      const results = await Promise.all(
        terminalsToUpdate.map((terminal) =>
          fetch(`/api/agents/terminals/${terminal.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        )
      );

      const failed = results.find((res) => !res.ok);
      if (failed) {
        const errorText = await failed.text().catch(() => "Failed to update terminal status.");
        throw new Error(errorText || "Failed to update terminal status.");
      }

      await fetchData();
      toast({
        title: status === "active" ? "Enabled all terminals" : "Disabled all terminals",
        description: `All terminals are now ${status === "active" ? "active" : "inactive"}.`,
        variant: "default",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update all terminals.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      console.error("Error updating all terminal statuses:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      serial_number: "",
      agent_id: "",
      password: "",
      credit_limit: 0,
      max_stake: 2000000,
      game_types: [],
      game_modes: [],
    });
    setPrizeRows([{ prize_id: "", commission: 0, status: "active", default: false }]);
    setEditingId(null);
  };

  const handleEdit = (terminal: Terminal) => {
    const normalizedPrizes = normalizeTerminalPrizeEntries(
      terminal.prizes,
      terminal.default_prize_id
    );

    setFormData({
      serial_number: terminal.serial_number,
      agent_id: terminal.agent_id,
      password: terminal.password,
      credit_limit: terminal.credit_limit,
      max_stake: terminal.max_stake ?? 0,
      game_types: terminal.game_types || [],
      game_modes: terminal.game_modes || [],
    });
    setPrizeRows(
      normalizedPrizes.length > 0
        ? rowsToPrizeRows(normalizedPrizes)
        : [{ prize_id: "", commission: 0, status: "active", default: false }]
    );
    setEditingId(terminal.id);
    setOpenDialog(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "credit_limit" || name === "max_stake"
          ? Number(value)
          : value,
    }));
  };

  const toggleGameType = (value: GameModeType) => {
    setFormData((prev) => ({
      ...prev,
      game_types: prev.game_types.includes(value)
        ? prev.game_types.filter((item) => item !== value)
        : [...prev.game_types, value],
    }));
  };

  const toggleGameMode = (value: GameType) => {
    setFormData((prev) => ({
      ...prev,
      game_modes: prev.game_modes.includes(value)
        ? prev.game_modes.filter((item) => item !== value)
        : [...prev.game_modes, value],
    }));
  };

  const updatePrizeRow = (
    index: number,
    field: "prize_id" | "commission",
    value: string
  ) => {
    setPrizeRows((prev) => {
      const next = prev.map((row, idx) =>
        idx === index
          ? {
              ...row,
              [field]: field === "commission" ? Number(value) : value,
            }
          : row
      );
      return applySerializedRows(next);
    });
  };

  const setDefaultPrizeRow = (prizeId: string) => {
    setPrizeRows((prev) =>
      applySerializedRows(
        prev.map((row) => ({
          ...row,
          default: row.prize_id === prizeId && row.status === "active",
        }))
      )
    );
  };

  const togglePrizeRowStatus = (index: number) => {
    setPrizeRows((prev) => {
      const next: PrizeRow[] = prev.map((row, idx) =>
        idx === index
          ? {
              ...row,
              status: (row.status === "active" ? "inactive" : "active") as TerminalPrizeStatus,
              default: row.status === "active" ? false : row.default,
            }
          : row
      );
      return applySerializedRows(next);
    });
  };

  const addPrizeRow = () => {
    setPrizeRows((prev) => [
      ...prev,
      { prize_id: "", commission: 0, status: "active", default: false },
    ]);
  };

  const removePrizeRow = (index: number) => {
    setPrizeRows((prev) => {
      const next: PrizeRow[] =
        prev.length === 1
          ? [{ prize_id: "", commission: 0, status: "active", default: false }]
          : prev.filter((_, idx) => idx !== index);
      return applySerializedRows(next);
    });
  };

  const defaultPrizeId = prizeRows.find((r) => r.default && r.prize_id)?.prize_id ?? "";

  const formatGameType = (value: GameModeType) => gameModes[value] || value;

  const formatGameMode = (value: GameType) =>
    value === "lotto"
      ? "Lotto"
      : value === "pools"
        ? "Pools"
        : value === "sports"
          ? "Sports"
          : "Football Pool";

  const getAvailablePrizes = (rowIndex: number) => {
    const selectedIds = prizeRows
      .filter((_, idx) => idx !== rowIndex)
      .map((row) => row.prize_id)
      .filter(Boolean);

    return prizes.filter(
      (prize) =>
        !selectedIds.includes(prize.id) ||
        prize.id === prizeRows[rowIndex]?.prize_id
    );
  };

  const handleAgentChange = (value: string) => {
    setFormData((prev) => ({ ...prev, agent_id: value }));
  };

  const getAgentName = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    return agent ? agent.username : "-";
  };

  const getStaffName = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return "-";
    const staffMember = staff.find((s) => s.id === agent.staff_id);
    return staffMember ? staffMember.username : "-";
  };

  const filteredTerminals = terminals.filter((terminal) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = terminal.serial_number.toLowerCase().includes(query);
    const matchesAgent = filterAgentId === "all" || terminal.agent_id === filterAgentId;
    const matchesStatus = filterStatus === "all" || terminal.status === filterStatus;
    return matchesSearch && matchesAgent && matchesStatus;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Terminals Management</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSetAllStatus("active")}
          >
            Enable All
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleSetAllStatus("inactive")}
          >
            Disable All
          </Button>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  resetForm();
                  setOpenDialog(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Terminal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Terminal" : "Add New Terminal"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="serial_number">Serial Number (SN)</Label>
                    <Input
                      id="serial_number"
                      name="serial_number"
                      value={formData.serial_number}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="agent_id">Assign to Agent</Label>
                    <Select
                      value={formData.agent_id}
                      onValueChange={handleAgentChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required={!editingId}
                      placeholder={editingId ? "Leave empty to keep current" : ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="credit_limit">Credit Limit</Label>
                    <Input
                      id="credit_limit"
                      name="credit_limit"
                      type="number"
                      value={formData.credit_limit}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max_stake">Max Stake</Label>
                    <Input
                      id="max_stake"
                      name="max_stake"
                      type="number"
                      min="0"
                      value={formData.max_stake}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Game Types (Play Styles)</Label>
                  <div className="grid grid-cols-2 gap-3 rounded-md border p-3">
                    {gameTypeOptions.map(([value, label]) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`game_type_${value}`}
                          checked={formData.game_types.includes(value)}
                          onCheckedChange={() => toggleGameType(value)}
                        />
                        <Label
                          htmlFor={`game_type_${value}`}
                          className="text-sm font-normal"
                        >
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Game Modes (Products)</Label>
                  <div className="grid grid-cols-3 gap-3 rounded-md border p-3">
                    {gameModeOptions.map((mode) => (
                      <div key={mode.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`game_mode_${mode.value}`}
                          checked={formData.game_modes.includes(mode.value)}
                          onCheckedChange={() => toggleGameMode(mode.value)}
                        />
                        <Label
                          htmlFor={`game_mode_${mode.value}`}
                          className="text-sm font-normal"
                        >
                          {mode.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label>Prizes with Commissions</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Toggle active/inactive and select one default prize (active only).
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addPrizeRow}>
                      <Plus className="h-4 w-4 mr-1" /> Add Prize
                    </Button>
                  </div>
                  <div className="space-y-3 rounded-md border p-3">
                    <RadioGroup
                      value={defaultPrizeId}
                      onValueChange={setDefaultPrizeRow}
                      className="space-y-3"
                    >
                    {prizeRows.map((row, index) => (
                      <div key={`${row.prize_id}-${index}`} className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-4">
                          <Label htmlFor={`prize_select_${index}`} className="sr-only">
                            Prize
                          </Label>
                          <Select
                            value={row.prize_id}
                            onValueChange={(value) =>
                              updatePrizeRow(index, "prize_id", value)
                            }
                          >
                            <SelectTrigger id={`prize_select_${index}`}>
                              <SelectValue placeholder="Select prize" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailablePrizes(index).map((prize) => (
                                <SelectItem key={prize.id} value={prize.id}>
                                  {prize.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor={`prize_commission_${index}`} className="sr-only">
                            Commission
                          </Label>
                          <Input
                            id={`prize_commission_${index}`}
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={row.commission}
                            onChange={(e) =>
                              updatePrizeRow(index, "commission", e.target.value)
                            }
                            placeholder="Commission %"
                          />
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                          <Switch
                            id={`prize_status_${index}`}
                            checked={row.status === "active"}
                            onCheckedChange={() => togglePrizeRowStatus(index)}
                            disabled={!row.prize_id}
                          />
                          <Label
                            htmlFor={`prize_status_${index}`}
                            className="text-sm font-normal capitalize"
                          >
                            {row.status}
                          </Label>
                        </div>
                        <div className="col-span-3 flex items-center gap-2">
                          <RadioGroupItem
                            value={row.prize_id}
                            id={`prize_default_${index}`}
                            disabled={!row.prize_id || row.status === "inactive"}
                          />
                          <Label
                            htmlFor={`prize_default_${index}`}
                            className="text-sm font-normal"
                          >
                            Default
                          </Label>
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePrizeRow(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    </RadioGroup>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  {editingId ? "Update" : "Create"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search by serial number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterAgentId} onValueChange={setFilterAgentId}>
            <SelectTrigger className="w-50">
              <SelectValue placeholder="Filter by agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.first_name} {agent.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-37.5">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SN</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Credit Limit</TableHead>
                <TableHead>Max Stake</TableHead>
                <TableHead>Game Types</TableHead>
                <TableHead>Game Modes</TableHead>
                <TableHead>Prizes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTerminals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    {searchQuery || filterAgentId !== "all" || filterStatus !== "all" ? "No terminals found matching your criteria" : "No terminals found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTerminals.map((terminal) => (
                  <TableRow key={terminal.id}>
                    <TableCell className="font-mono">
                      {terminal.serial_number}
                    </TableCell>
                    <TableCell>{terminal.password}</TableCell>
                    <TableCell>{getAgentName(terminal.agent_id)}</TableCell>
                    <TableCell>{getStaffName(terminal.agent_id)}</TableCell>
                    <TableCell>{terminal.credit_limit}</TableCell>
                    <TableCell>
                      {terminal.max_stake ?? 0}
                    </TableCell>
                    <TableCell>
                      {(terminal.game_types || [])
                        .map((type, index) => <div key={index}>{formatGameType(type)}</div>)}
                    </TableCell>
                    <TableCell>
                      {(terminal.game_modes || [])
                        .map((mode, index) => <div key={index}>{formatGameMode(mode)}</div>)}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const prizeList = normalizeTerminalPrizeEntries(terminal.prizes);

                        if (prizeList.length === 0) return "-";

                        return (
                          <div className="space-y-1">
                            {prizeList.map((prizeRow, idx) => {
                              const prize = prizes.find((p) => p.id === prizeRow.prize_id);
                              const isActive = prizeRow.status !== "inactive";
                              const isDefault = prizeRow.default === true;
                              return (
                                <div key={idx} className="flex items-center gap-2 text-sm flex-wrap">
                                  <span className={isActive ? "" : "text-muted-foreground"}>
                                    {prize?.name || "Unknown"} ({prizeRow.commission}%)
                                  </span>
                                  {isDefault && (
                                    <Badge variant="outline" className="text-xs">
                                      default
                                    </Badge>
                                  )}
                                  <Badge
                                    variant={isActive ? "default" : "secondary"}
                                    className="text-xs capitalize"
                                  >
                                    {isActive ? "active" : "inactive"}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={clsx(
                          "px-2 py-1 rounded-full text-xs font-medium capitalize",
                          terminal.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        )}
                      >
                        {terminal.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(terminal.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 items-center">
                        <Button
                          variant={terminal.status === "active" ? "default" : "destructive"}
                          size="sm"
                          onClick={() => handleToggleStatus(terminal.id, terminal.status)}
                          title={terminal.status === "active" ? "Deactivate" : "Activate"}
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(terminal)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteId(terminal.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Terminal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this terminal? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive">
            Delete
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
