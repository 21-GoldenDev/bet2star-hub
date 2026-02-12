"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
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

interface GameWeek {
  id: string;
  week: number;
}

interface TotalResult {
  sales: Record<string, number>;
  agentPayable: number;
  onlinePayable: number;
  win: Record<string, number>;
  agentWin: number;
  onlineWin: number;
}

interface OnlineResult {
  sales: Record<string, number>;
  win: Record<string, number>;
}

interface TerminalResult {
  staff: string;
  agent: string;
  terminal: string;
  sales: Array<{
    prize: { name: string; commission: number };
    amount: number;
  }>;
  win: Array<{
    prize: string;
    amount: number;
  }>;
}

const gameTypes = {
  agent: "Agent Sales",
  online: "Online Sales",
}

const defaultSales = {
  agent: 0,
  online: 0,
}

export default function PoolsSalesPage() {
  const [weeks, setWeeks] = useState<GameWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>();
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedTerminal, setSelectedTerminal] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [totalResult, setTotalResult] = useState<TotalResult>({
    sales: defaultSales,
    agentPayable: 0,
    onlinePayable: 0,
    win: defaultSales,
    agentWin: 0,
    onlineWin: 0,
  });
  const [onlineResult, setOnlineResult] = useState<OnlineResult>({
    sales: defaultSales,
    win: defaultSales,
  });
  const [terminalResults, setTerminalResults] = useState<TerminalResult[]>([]);

  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const res = await fetch("/api/admin/bets/sports/weeks");
        if (res.ok) {
          const data = await res.json();
          setWeeks(data.data);
          if (data.data.length > 0) {
            setSelectedWeek(data.data[0].id || undefined);
          } else {
            setLoading(false);
          }
        } else {
          console.error("Failed to fetch weeks");
        }
      } catch (error) {
        console.error("Error fetching weeks:", error);
      }
    };
    fetchWeeks();
  }, []);

  useEffect(() => {
    const fetchSalesData = async () => {
      if (!selectedWeek) return;

      try {
        setLoading(true);
        const res = await fetch(`/api/admin/sales/sports?game_id=${selectedWeek}`);
        if (res.ok) {
          const data = await res.json();
          setTotalResult(data.totalResult || {
            sales: defaultSales,
            agentPayable: 0,
            onlinePayable: 0,
            win: defaultSales,
            agentWin: 0,
            onlineWin: 0,
          });
          setOnlineResult(data.onlineResult || {
            sales: defaultSales,
            win: defaultSales,
          });
          setTerminalResults(data.terminalResults || []);
          setSelectedStaff("all");
          setSelectedAgent("all");
          setSelectedTerminal("all");
        } else {
          console.error("Failed to fetch sales data");
        }
      } catch (error) {
        console.error("Error fetching sales data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [selectedWeek]);

  const totalPayable = totalResult.agentPayable + totalResult.onlinePayable;
  const totalWin = totalResult.agentWin + totalResult.onlineWin;
  const totalOnlineSales = Object.values(onlineResult.sales).reduce((a, b) => a + b, 0);
  const totalOnlineWin = Object.values(onlineResult.win).reduce((a, b) => a + b, 0);
  const filteredTerminalResults = useMemo(() => {
    return terminalResults.filter((result) => {
      if (selectedStaff !== "all" && result.staff !== selectedStaff) return false;
      if (selectedAgent !== "all" && result.agent !== selectedAgent) return false;
      if (selectedTerminal !== "all" && result.terminal !== selectedTerminal) return false;
      return true;
    });
  }, [terminalResults, selectedStaff, selectedAgent, selectedTerminal]);

  const totalTerminalSales = filteredTerminalResults.reduce(
    (sum, r) => sum + r.sales.reduce((s, sale) => s + (sale.amount * sale.prize.commission) / 100, 0),
    0
  );
  const totalTerminalWin = filteredTerminalResults.reduce(
    (sum, r) => sum + r.win.reduce((s, w) => s + w.amount, 0),
    0
  );

  const staffOptions = useMemo(() => {
    return Array.from(new Set(terminalResults.map((result) => result.staff))).sort();
  }, [terminalResults]);

  const agentOptions = useMemo(() => {
    const filtered = terminalResults.filter((result) => selectedStaff === "all" || result.staff === selectedStaff);
    return Array.from(new Set(filtered.map((result) => result.agent))).sort();
  }, [terminalResults, selectedStaff]);

  const terminalOptions = useMemo(() => {
    const filtered = terminalResults.filter((result) => {
      if (selectedStaff !== "all" && result.staff !== selectedStaff) return false;
      if (selectedAgent !== "all" && result.agent !== selectedAgent) return false;
      return true;
    });
    return Array.from(new Set(filtered.map((result) => result.terminal))).sort();
  }, [terminalResults, selectedStaff, selectedAgent]);

  const filtersActive = selectedStaff !== "all" || selectedAgent !== "all" || selectedTerminal !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <h1 className="text-3xl font-bold">Sports Betting Sales Report</h1>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="w-48">
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger>
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((week) => (
                  <SelectItem key={week.id} value={week.id}>
                    Week {week.week}
                  </SelectItem>
                ))}
                {!weeks.length && (
                  <SelectItem value="no" disabled>
                    No weeks available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="w-44">
            <Select
              value={selectedStaff}
              onValueChange={(value) => {
                setSelectedStaff(value);
                setSelectedAgent("all");
                setSelectedTerminal("all");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All staff</SelectItem>
                {staffOptions.map((staff) => (
                  <SelectItem key={staff} value={staff}>
                    {staff}
                  </SelectItem>
                ))}
                {!staffOptions.length && (
                  <SelectItem value="none" disabled>
                    No staff
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="w-44">
            <Select
              value={selectedAgent}
              onValueChange={(value) => {
                setSelectedAgent(value);
                setSelectedTerminal("all");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agents</SelectItem>
                {agentOptions.map((agent) => (
                  <SelectItem key={agent} value={agent}>
                    {agent}
                  </SelectItem>
                ))}
                {!agentOptions.length && (
                  <SelectItem value="none" disabled>
                    No agents
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="w-44">
            <Select value={selectedTerminal} onValueChange={setSelectedTerminal}>
              <SelectTrigger>
                <SelectValue placeholder="Terminal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All terminals</SelectItem>
                {terminalOptions.map((terminal) => (
                  <SelectItem key={terminal} value={terminal}>
                    {terminal}
                  </SelectItem>
                ))}
                {!terminalOptions.length && (
                  <SelectItem value="none" disabled>
                    No terminals
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading sales data...</p>
        </div>
      ) : (
        <>
          {!filtersActive && (
            <Table className="text-center border">
              <TableHeader>
                <TableRow>
                  <TableHead className="border text-center">Sales</TableHead>
                  <TableHead className="border text-center">Agent Payable</TableHead>
                  <TableHead className="border text-center">Online Payable</TableHead>
                  <TableHead className="border text-center">Total Payable</TableHead>
                  <TableHead className="border text-center">Agent Win</TableHead>
                  <TableHead className="border text-center">Online Win</TableHead>
                  <TableHead className="border text-center">Total Win</TableHead>
                  <TableHead className="border text-center">Bal Company</TableHead>
                  <TableHead className="border text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="border">
                    {Object.entries(gameTypes).map(([key, label]) => (
                      <div key={key} className="text-nowrap">{label}={(totalResult.sales[key] || 0).toLocaleString()}</div>
                    ))}
                  </TableCell>
                  <TableCell className="border">{totalResult.agentPayable.toLocaleString()}</TableCell>
                  <TableCell className="border">{totalResult.onlinePayable.toLocaleString()}</TableCell>
                  <TableCell className="border">{totalPayable.toLocaleString()}</TableCell>
                  <TableCell className="border">{totalResult.agentWin.toLocaleString()}</TableCell>
                  <TableCell className="border">{totalResult.onlineWin.toLocaleString()}</TableCell>
                  <TableCell className="border">{totalWin.toLocaleString()}</TableCell>
                  <TableCell className="border">{(totalPayable - totalWin).toLocaleString()}</TableCell>
                  <TableCell className="border">
                    {totalPayable - totalWin > 0 ? (
                      <Badge className="bg-green-600 hover:bg-green-700">Green</Badge>
                    ) : (
                      <Badge variant="destructive">Red</Badge>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}

          {!filtersActive && (
            <>
              <div className="font-semibold text-2xl">Online Sales</div>
              <Table className="text-center border">
                <TableHeader>
                  <TableRow>
                    <TableHead className="border text-center">Sales</TableHead>
                    <TableHead className="border text-center">Win</TableHead>
                    <TableHead className="border text-center">Bal Company</TableHead>
                    <TableHead className="border text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="border">{totalOnlineSales.toLocaleString()}</TableCell>
                    <TableCell className="border">{totalOnlineWin.toLocaleString()}</TableCell>
                    <TableCell className="border">{(totalOnlineSales - totalOnlineWin).toLocaleString()}</TableCell>
                    <TableCell className="border">
                      {totalOnlineSales - totalOnlineWin > 0 ? (
                        <Badge className="bg-green-600 hover:bg-green-700">Green</Badge>
                      ) : (
                        <Badge variant="destructive">Red</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </>
          )}

          <div className="font-semibold text-2xl">Agents Sales</div>
          <Table className="text-center border">
            <TableHeader>
              <TableRow>
                <TableHead className="border text-center">Week</TableHead>
                <TableHead className="border text-center">Staff</TableHead>
                <TableHead className="border text-center">Agent</TableHead>
                <TableHead className="border text-center">Terminal</TableHead>
                <TableHead className="border text-center">Sales</TableHead>
                <TableHead className="border text-center">Payable</TableHead>
                <TableHead className="border text-center">Win</TableHead>
                <TableHead className="border text-center">Total Win</TableHead>
                <TableHead className="border text-center">Bal Company</TableHead>
                <TableHead className="border text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const grouped: { [staff: string]: { [agent: string]: TerminalResult[] } } = {};
                filteredTerminalResults.forEach((result) => {
                  if (!grouped[result.staff]) grouped[result.staff] = {};
                  if (!grouped[result.staff][result.agent]) grouped[result.staff][result.agent] = [];
                  grouped[result.staff][result.agent].push(result);
                });

                const rows: React.ReactElement[] = [];
                const terminalRowspan = filteredTerminalResults.length;
                let globalIdx = 0;

                Object.entries(grouped).forEach(([staff, agents]) => {
                  const staffRowspan = Object.values(agents).reduce((sum, terminals) => sum + terminals.length, 0);
                  let isFirstStaffRow = true;

                  Object.entries(agents).forEach(([agent, terminals]) => {
                    const agentRowspan = terminals.length;
                    let isFirstAgentRow = true;

                    terminals.forEach((result) => {
                      const rowIndex = globalIdx;
                      globalIdx += 1;

                      rows.push(
                        <TableRow key={rowIndex}>
                          {rowIndex === 0 && (
                            <TableCell className="border" rowSpan={terminalRowspan}>
                              {weeks.find((w) => w.id === selectedWeek)?.week || "-"}
                            </TableCell>
                          )}
                          {isFirstStaffRow && (
                            <TableCell className="border" rowSpan={staffRowspan}>
                              {staff}
                            </TableCell>
                          )}
                          {isFirstAgentRow && (
                            <TableCell className="border" rowSpan={agentRowspan}>
                              {agent}
                            </TableCell>
                          )}
                          <TableCell className="border">{result.terminal}</TableCell>
                          <TableCell className="border">
                            {result.sales.map((sale, i) => (
                              <div key={i} className="text-nowrap">{sale.prize.name} = {sale.amount.toLocaleString()}</div>
                            ))}
                          </TableCell>
                          <TableCell className="border">
                            {result.sales.map((sale, i) => (
                              <div key={i} className="text-nowrap">{sale.prize.name} = {(sale.amount * sale.prize.commission / 100).toLocaleString()}</div>
                            ))}
                          </TableCell>
                          <TableCell className="border">
                            {result.win.map((win, i) => (
                              <div key={i}>{win.prize} = {win.amount.toLocaleString()}</div>
                            ))}
                          </TableCell>
                          {rowIndex === 0 && (
                            <TableCell className="border" rowSpan={terminalRowspan}>
                              {totalTerminalWin.toLocaleString()}
                            </TableCell>
                          )}
                          {rowIndex === 0 && (
                            <TableCell className="border" rowSpan={terminalRowspan}>
                              {(totalTerminalSales - totalTerminalWin).toLocaleString()}
                            </TableCell>
                          )}
                          {rowIndex === 0 && (
                            <TableCell className="border" rowSpan={terminalRowspan}>
                              {totalTerminalSales - totalTerminalWin > 0 ? (
                                <Badge className="bg-green-600 hover:bg-green-700">Green</Badge>
                              ) : (
                                <Badge variant="destructive">Red</Badge>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );

                      isFirstStaffRow = false;
                      isFirstAgentRow = false;
                    });
                  });
                });

                return rows;
              })()}
              {!filteredTerminalResults.length && (
                <TableRow>
                  <TableCell className="border" colSpan={10}>
                    No terminal sales data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
