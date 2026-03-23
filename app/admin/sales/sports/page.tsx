"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const ITEMS_PER_PAGE = 10;

export default function PoolsSalesPage() {
  const [weeks, setWeeks] = useState<GameWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>();
  const [activeTab, setActiveTab] = useState("total");
  const [staffFilter, setStaffFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [terminalFilter, setTerminalFilter] = useState("all");
  const [staffPage, setStaffPage] = useState(1);
  const [agentPage, setAgentPage] = useState(1);
  const [terminalPage, setTerminalPage] = useState(1);
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

  const totalTerminalSales = terminalResults.reduce(
    (sum, r) => sum + r.sales.reduce((s, sale) => s + sale.amount, 0),
    0
  );
  const totalTerminalWin = terminalResults.reduce(
    (sum, r) => sum + r.win.reduce((s, w) => s + w.amount, 0),
    0
  );

  const staffOptions = useMemo(
    () => Array.from(new Set(terminalResults.map((r) => r.staff))).sort((a, b) => a.localeCompare(b)),
    [terminalResults]
  );

  const agentOptions = useMemo(() => {
    const source =
      staffFilter === "all"
        ? terminalResults
        : terminalResults.filter((r) => r.staff === staffFilter);

    return Array.from(new Set(source.map((r) => r.agent))).sort((a, b) => a.localeCompare(b));
  }, [terminalResults, staffFilter]);

  const terminalOptions = useMemo(() => {
    const source = terminalResults.filter((r) => {
      if (staffFilter !== "all" && r.staff !== staffFilter) return false;
      if (agentFilter !== "all" && r.agent !== agentFilter) return false;
      return true;
    });

    return Array.from(new Set(source.map((r) => r.terminal))).sort((a, b) => a.localeCompare(b));
  }, [terminalResults, staffFilter, agentFilter]);

  useEffect(() => {
    setStaffFilter("all");
    setAgentFilter("all");
    setTerminalFilter("all");
    setStaffPage(1);
    setAgentPage(1);
    setTerminalPage(1);
  }, [selectedWeek]);

  useEffect(() => {
    setStaffPage(1);
  }, [staffFilter]);

  useEffect(() => {
    setAgentPage(1);
  }, [staffFilter, agentFilter]);

  useEffect(() => {
    setTerminalPage(1);
  }, [staffFilter, agentFilter, terminalFilter]);

  useEffect(() => {
    if (staffFilter !== "all" && !staffOptions.includes(staffFilter)) {
      setStaffFilter("all");
    }
  }, [staffFilter, staffOptions]);

  useEffect(() => {
    if (agentFilter !== "all" && !agentOptions.includes(agentFilter)) {
      setAgentFilter("all");
    }
  }, [agentFilter, agentOptions]);

  useEffect(() => {
    if (terminalFilter !== "all" && !terminalOptions.includes(terminalFilter)) {
      setTerminalFilter("all");
    }
  }, [terminalFilter, terminalOptions]);

  const staffFilteredResults = useMemo(() => {
    if (staffFilter === "all") return terminalResults;
    return terminalResults.filter((r) => r.staff === staffFilter);
  }, [terminalResults, staffFilter]);

  const agentFilteredResults = useMemo(() => {
    return terminalResults.filter((r) => {
      if (staffFilter !== "all" && r.staff !== staffFilter) return false;
      if (agentFilter !== "all" && r.agent !== agentFilter) return false;
      return true;
    });
  }, [terminalResults, staffFilter, agentFilter]);

  const terminalFilteredResults = useMemo(() => {
    return terminalResults.filter((r) => {
      if (staffFilter !== "all" && r.staff !== staffFilter) return false;
      if (agentFilter !== "all" && r.agent !== agentFilter) return false;
      if (terminalFilter !== "all" && r.terminal !== terminalFilter) return false;
      return true;
    });
  }, [terminalResults, staffFilter, agentFilter, terminalFilter]);

  const staffTabTotalSales = staffFilteredResults.reduce(
    (sum, r) => sum + r.sales.reduce((s, sale) => s + sale.amount, 0),
    0
  );
  const staffTabTotalWin = staffFilteredResults.reduce(
    (sum, r) => sum + r.win.reduce((s, w) => s + w.amount, 0),
    0
  );

  const agentTabTotalSales = agentFilteredResults.reduce(
    (sum, r) => sum + r.sales.reduce((s, sale) => s + sale.amount, 0),
    0
  );
  const agentTabTotalWin = agentFilteredResults.reduce(
    (sum, r) => sum + r.win.reduce((s, w) => s + w.amount, 0),
    0
  );

  const terminalTabTotalSales = terminalFilteredResults.reduce(
    (sum, r) => sum + r.sales.reduce((s, sale) => s + sale.amount, 0),
    0
  );
  const terminalTabTotalWin = terminalFilteredResults.reduce(
    (sum, r) => sum + r.win.reduce((s, w) => s + w.amount, 0),
    0
  );

  const staffRows = useMemo(() => {
    const grouped: Record<string, TerminalResult[]> = {};
    staffFilteredResults.forEach((result) => {
      if (!grouped[result.staff]) grouped[result.staff] = [];
      grouped[result.staff].push(result);
    });

    return Object.entries(grouped)
      .map(([staff, terminals]) => ({
        staff,
        sales: terminals.reduce((sum, r) => sum + r.sales.reduce((s, sale) => s + sale.amount, 0), 0),
        payable: terminals.reduce(
          (sum, r) =>
            sum + r.sales.reduce((s, sale) => s + (sale.amount * sale.prize.commission) / 100, 0),
          0
        ),
        win: terminals.reduce((sum, r) => sum + r.win.reduce((s, w) => s + w.amount, 0), 0),
      }))
      .sort((a, b) => a.staff.localeCompare(b.staff));
  }, [staffFilteredResults]);

  const agentRows = useMemo(() => {
    const grouped: Record<string, Record<string, TerminalResult[]>> = {};
    agentFilteredResults.forEach((result) => {
      if (!grouped[result.staff]) grouped[result.staff] = {};
      if (!grouped[result.staff][result.agent]) grouped[result.staff][result.agent] = [];
      grouped[result.staff][result.agent].push(result);
    });

    const rows: Array<{ staff: string; agent: string; sales: number; payable: number; win: number }> = [];
    Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([staff, agents]) => {
        Object.entries(agents)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([agent, terminals]) => {
            rows.push({
              staff,
              agent,
              sales: terminals.reduce((sum, r) => sum + r.sales.reduce((s, sale) => s + sale.amount, 0), 0),
              payable: terminals.reduce(
                (sum, r) =>
                  sum + r.sales.reduce((s, sale) => s + (sale.amount * sale.prize.commission) / 100, 0),
                0
              ),
              win: terminals.reduce((sum, r) => sum + r.win.reduce((s, w) => s + w.amount, 0), 0),
            });
          });
      });

    return rows;
  }, [agentFilteredResults]);

  const agentStaffTotalWinMap = useMemo(() => {
    return agentRows.reduce((acc, row) => {
      acc[row.staff] = (acc[row.staff] || 0) + row.win;
      return acc;
    }, {} as Record<string, number>);
  }, [agentRows]);

  const terminalRows = useMemo(() => {
    return [...terminalFilteredResults]
      .sort((a, b) => {
        const staffSort = a.staff.localeCompare(b.staff);
        if (staffSort !== 0) return staffSort;
        const agentSort = a.agent.localeCompare(b.agent);
        if (agentSort !== 0) return agentSort;
        return a.terminal.localeCompare(b.terminal);
      })
      .map((result) => ({
        staff: result.staff,
        agent: result.agent,
        terminal: result.terminal,
        sales: result.sales.reduce((s, sale) => s + sale.amount, 0),
        payable: result.sales.reduce((s, sale) => s + (sale.amount * sale.prize.commission) / 100, 0),
        win: result.win.reduce((s, w) => s + w.amount, 0),
      }));
  }, [terminalFilteredResults]);

  const terminalStaffTotalWinMap = useMemo(() => {
    return terminalRows.reduce((acc, row) => {
      acc[row.staff] = (acc[row.staff] || 0) + row.win;
      return acc;
    }, {} as Record<string, number>);
  }, [terminalRows]);

  const staffTotalPages = Math.max(1, Math.ceil(staffRows.length / ITEMS_PER_PAGE));
  const agentTotalPages = Math.max(1, Math.ceil(agentRows.length / ITEMS_PER_PAGE));
  const terminalTotalPages = Math.max(1, Math.ceil(terminalRows.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (staffPage > staffTotalPages) setStaffPage(staffTotalPages);
  }, [staffPage, staffTotalPages]);

  useEffect(() => {
    if (agentPage > agentTotalPages) setAgentPage(agentTotalPages);
  }, [agentPage, agentTotalPages]);

  useEffect(() => {
    if (terminalPage > terminalTotalPages) setTerminalPage(terminalTotalPages);
  }, [terminalPage, terminalTotalPages]);

  const paginatedStaffRows = useMemo(() => {
    const start = (staffPage - 1) * ITEMS_PER_PAGE;
    return staffRows.slice(start, start + ITEMS_PER_PAGE);
  }, [staffRows, staffPage]);

  const paginatedAgentRows = useMemo(() => {
    const start = (agentPage - 1) * ITEMS_PER_PAGE;
    return agentRows.slice(start, start + ITEMS_PER_PAGE);
  }, [agentRows, agentPage]);

  const paginatedTerminalRows = useMemo(() => {
    const start = (terminalPage - 1) * ITEMS_PER_PAGE;
    return terminalRows.slice(start, start + ITEMS_PER_PAGE);
  }, [terminalRows, terminalPage]);

  const selectedWeekNumber = weeks.find((w) => w.id === selectedWeek)?.week || "-";

  const renderPagination = (
    currentPage: number,
    totalPages: number,
    totalItems: number,
    setPage: (page: number) => void
  ) => (
    <div className="flex flex-wrap items-center justify-between gap-3 border rounded-md px-3 py-2">
      <p className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages} ({totalItems} records)
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );

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
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading sales data...</p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="total">Total Sales</TabsTrigger>
            <TabsTrigger value="staff">Staff Sales</TabsTrigger>
            <TabsTrigger value="agent">Agent Sales</TabsTrigger>
            <TabsTrigger value="terminal">Terminal Sales</TabsTrigger>
          </TabsList>

          {(activeTab === "staff" || activeTab === "agent" || activeTab === "terminal") && (
            <div className="flex flex-wrap gap-3 items-center border rounded-md p-3">
              <div className="w-56">
                <Select
                  value={staffFilter}
                  onValueChange={(value) => {
                    setStaffFilter(value);
                    setAgentFilter("all");
                    setTerminalFilter("all");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {staffOptions.map((staff) => (
                      <SelectItem key={staff} value={staff}>
                        {staff}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(activeTab === "agent" || activeTab === "terminal") && (
                <div className="w-56">
                  <Select
                    value={agentFilter}
                    onValueChange={(value) => {
                      setAgentFilter(value);
                      setTerminalFilter("all");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {agentOptions.map((agent) => (
                        <SelectItem key={agent} value={agent}>
                          {agent}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {activeTab === "terminal" && (
                <div className="w-56">
                  <Select value={terminalFilter} onValueChange={setTerminalFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by terminal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Terminals</SelectItem>
                      {terminalOptions.map((terminal) => (
                        <SelectItem key={terminal} value={terminal}>
                          {terminal}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <TabsContent value="total" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="staff" className="space-y-4">
            <Table className="text-center border">
              <TableHeader>
                <TableRow>
                  <TableHead className="border text-center">Week</TableHead>
                  <TableHead className="border text-center">Staff</TableHead>
                  <TableHead className="border text-center">Sales</TableHead>
                  <TableHead className="border text-center">Payable</TableHead>
                  <TableHead className="border text-center">Win</TableHead>
                  <TableHead className="border text-center">Total Win</TableHead>
                  <TableHead className="border text-center">Bal Company</TableHead>
                  <TableHead className="border text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStaffRows.map((row, idx) => (
                  <TableRow key={`${row.staff}-${idx}`}>
                    {idx === 0 && (
                      <TableCell className="border" rowSpan={paginatedStaffRows.length}>
                        {selectedWeekNumber}
                      </TableCell>
                    )}
                    <TableCell className="border">{row.staff}</TableCell>
                    <TableCell className="border">{row.sales.toLocaleString()}</TableCell>
                    <TableCell className="border">{row.payable.toLocaleString()}</TableCell>
                    <TableCell className="border">{row.win.toLocaleString()}</TableCell>
                    <TableCell className="border">{row.win.toLocaleString()}</TableCell>
                    <TableCell className="border">{(row.sales - row.win).toLocaleString()}</TableCell>
                    <TableCell className="border">
                      {row.sales - row.win > 0 ? (
                        <Badge className="bg-green-600 hover:bg-green-700">Green</Badge>
                      ) : (
                        <Badge variant="destructive">Red</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!staffRows.length && (
                  <TableRow>
                    <TableCell className="border" colSpan={10}>
                      No staff sales data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {renderPagination(staffPage, staffTotalPages, staffRows.length, setStaffPage)}
          </TabsContent>

          <TabsContent value="agent" className="space-y-4">
            <Table className="text-center border">
              <TableHeader>
                <TableRow>
                  <TableHead className="border text-center">Week</TableHead>
                  <TableHead className="border text-center">Staff</TableHead>
                  <TableHead className="border text-center">Agent</TableHead>
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
                  const groupedRows = paginatedAgentRows.reduce((acc, row) => {
                    if (!acc[row.staff]) acc[row.staff] = [];
                    acc[row.staff].push(row);
                    return acc;
                  }, {} as Record<string, typeof paginatedAgentRows>);

                  const rows: React.ReactElement[] = [];
                  let globalIdx = 0;

                  Object.entries(groupedRows).forEach(([staff, agents]) => {
                    agents.forEach((row, idx) => {
                      const rowIndex = globalIdx;
                      globalIdx += 1;

                      rows.push(
                        <TableRow key={`${staff}-${row.agent}-${idx}`}>
                          {rowIndex === 0 && (
                            <TableCell className="border" rowSpan={paginatedAgentRows.length}>
                              {selectedWeekNumber}
                            </TableCell>
                          )}
                          {idx === 0 && (
                            <TableCell className="border" rowSpan={agents.length}>
                              {staff}
                            </TableCell>
                          )}
                          <TableCell className="border">{row.agent}</TableCell>
                          <TableCell className="border">{row.sales.toLocaleString()}</TableCell>
                          <TableCell className="border">{row.payable.toLocaleString()}</TableCell>
                          <TableCell className="border">{row.win.toLocaleString()}</TableCell>
                          {idx === 0 && (
                            <TableCell className="border" rowSpan={agents.length}>
                              {(agentStaffTotalWinMap[staff] || 0).toLocaleString()}
                            </TableCell>
                          )}
                          <TableCell className="border">{(row.sales - row.win).toLocaleString()}</TableCell>
                          <TableCell className="border">
                            {row.sales - row.win > 0 ? (
                              <Badge className="bg-green-600 hover:bg-green-700">Green</Badge>
                            ) : (
                              <Badge variant="destructive">Red</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    });
                  });

                  return rows;
                })()}
                {!agentRows.length && (
                  <TableRow>
                    <TableCell className="border" colSpan={10}>
                      No agent sales data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {renderPagination(agentPage, agentTotalPages, agentRows.length, setAgentPage)}
          </TabsContent>

          <TabsContent value="terminal" className="space-y-4">
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
                  const groupedRows = paginatedTerminalRows.reduce((acc, row) => {
                    if (!acc[row.staff]) acc[row.staff] = {};
                    if (!acc[row.staff][row.agent]) acc[row.staff][row.agent] = [];
                    acc[row.staff][row.agent].push(row);
                    return acc;
                  }, {} as Record<string, Record<string, typeof paginatedTerminalRows>>);

                  const rows: React.ReactElement[] = [];
                  let globalIdx = 0;

                  Object.entries(groupedRows).forEach(([staff, agents]) => {
                    const staffRowSpan = Object.values(agents).reduce((sum, terminals) => sum + terminals.length, 0);

                    Object.entries(agents).forEach(([agent, terminals], agentIdx) => {
                      terminals.forEach((row, terminalIdx) => {
                        const rowIndex = globalIdx;
                        globalIdx += 1;

                        rows.push(
                          <TableRow key={`${staff}-${agent}-${row.terminal}-${terminalIdx}`}>
                            {rowIndex === 0 && (
                              <TableCell className="border" rowSpan={paginatedTerminalRows.length}>
                                {selectedWeekNumber}
                              </TableCell>
                            )}
                            {agentIdx === 0 && terminalIdx === 0 && (
                              <TableCell className="border" rowSpan={staffRowSpan}>
                                {staff}
                              </TableCell>
                            )}
                            {terminalIdx === 0 && (
                              <TableCell className="border" rowSpan={terminals.length}>
                                {agent}
                              </TableCell>
                            )}
                            <TableCell className="border">{row.terminal}</TableCell>
                            <TableCell className="border">{row.sales.toLocaleString()}</TableCell>
                            <TableCell className="border">{row.payable.toLocaleString()}</TableCell>
                            <TableCell className="border">{row.win.toLocaleString()}</TableCell>
                            {agentIdx === 0 && terminalIdx === 0 && (
                              <TableCell className="border" rowSpan={staffRowSpan}>
                                {(terminalStaffTotalWinMap[staff] || 0).toLocaleString()}
                              </TableCell>
                            )}
                            <TableCell className="border">{(row.sales - row.win).toLocaleString()}</TableCell>
                            <TableCell className="border">
                              {row.sales - row.win > 0 ? (
                                <Badge className="bg-green-600 hover:bg-green-700">Green</Badge>
                              ) : (
                                <Badge variant="destructive">Red</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      });
                    });
                  });

                  return rows;
                })()}
                {!terminalRows.length && (
                  <TableRow>
                    <TableCell className="border" colSpan={10}>
                      No terminal sales data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {renderPagination(terminalPage, terminalTotalPages, terminalRows.length, setTerminalPage)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
