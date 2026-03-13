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
};

const defaultSales = {
  agent: 0,
  online: 0,
};

export default function SportsDrawSalesPage() {
  const [weeks, setWeeks] = useState<GameWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>();
  const [activeTab, setActiveTab] = useState("total");
  const [staffFilter, setStaffFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [terminalFilter, setTerminalFilter] = useState("all");
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
        const res = await fetch("/api/admin/bets/sports-draw/weeks");
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
        const res = await fetch(`/api/admin/sales/sports-draw?game_id=${selectedWeek}`);
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
  }, [selectedWeek]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <h1 className="text-3xl font-bold">Football Pool Sales Report</h1>
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
                {(() => {
                  const grouped: { [staff: string]: { [agent: string]: TerminalResult[] } } = {};
                  staffFilteredResults.forEach((result) => {
                    if (!grouped[result.staff]) grouped[result.staff] = {};
                    if (!grouped[result.staff][result.agent]) grouped[result.staff][result.agent] = [];
                    grouped[result.staff][result.agent].push(result);
                  });

                  const rows: React.ReactElement[] = [];
                  const terminalRowspan = staffFilteredResults.length;
                  let globalIdx = 0;

                  Object.entries(grouped).forEach(([staff, agents]) => {
                    globalIdx += 1;

                    const staffTerminals = Object.values(agents).flat();

                    const staffTerminalSales = staffTerminals.reduce(
                      (sum, r) => sum + r.sales.reduce((s, sale) => s + sale.amount, 0),
                      0
                    );
                    const staffTerminalPayable = staffTerminals.reduce(
                      (sum, r) => sum + r.sales.reduce((s, sale) => s + (sale.amount * sale.prize.commission) / 100, 0),
                      0
                    );
                    const staffTerminalWin = staffTerminals.reduce(
                      (sum, r) => sum + r.win.reduce((s, w) => s + w.amount, 0),
                      0
                    );

                    rows.push(
                      <TableRow key={globalIdx}>
                        {globalIdx === 1 && (
                          <TableCell className="border" rowSpan={terminalRowspan}>
                            {weeks.find((w) => w.id === selectedWeek)?.week || "-"}
                          </TableCell>
                        )}
                        <TableCell className="border">
                          {staff}
                        </TableCell>
                        <TableCell className="border">
                          {staffTerminalSales.toLocaleString()}
                        </TableCell>
                        <TableCell className="border">
                          {staffTerminalPayable.toLocaleString()}
                        </TableCell>
                        <TableCell className="border">
                          {staffTerminalWin.toLocaleString()}
                        </TableCell>
                        {globalIdx === 1 && (
                          <>
                            <TableCell className="border" rowSpan={terminalRowspan}>
                              {staffTabTotalWin.toLocaleString()}
                            </TableCell>
                            <TableCell className="border" rowSpan={terminalRowspan}>
                              {(staffTabTotalSales - staffTabTotalWin).toLocaleString()}
                            </TableCell>
                            <TableCell className="border" rowSpan={terminalRowspan}>
                              {staffTabTotalSales - staffTabTotalWin > 0 ? (
                                <Badge className="bg-green-600 hover:bg-green-700">Green</Badge>
                              ) : (
                                <Badge variant="destructive">Red</Badge>
                              )}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  });

                  return rows;
                })()}
                {!staffFilteredResults.length && (
                  <TableRow>
                    <TableCell className="border" colSpan={10}>
                      No staff sales data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
                  const grouped: { [staff: string]: { [agent: string]: TerminalResult[] } } = {};
                  agentFilteredResults.forEach((result) => {
                    if (!grouped[result.staff]) grouped[result.staff] = {};
                    if (!grouped[result.staff][result.agent]) grouped[result.staff][result.agent] = [];
                    grouped[result.staff][result.agent].push(result);
                  });

                  const rows: React.ReactElement[] = [];
                  const agentRowSpan = Object.entries(grouped).reduce((sum, [, agents]) => sum + Object.values(agents).length, 0);
                  let globalIdx = 0;

                  Object.entries(grouped).forEach(([staff, agents]) => {
                    const staffRowspan = Object.values(agents).length;
                    let isFirstStaffRow = true;

                    Object.entries(agents).forEach(([agent, terminals]) => {
                      const rowIndex = globalIdx;
                      globalIdx += 1;

                      const agentTerminalSales = terminals.reduce(
                        (sum, r) => sum + r.sales.reduce((s, sale) => s + sale.amount, 0),
                        0
                      );
                      const agentTerminalPayable = terminals.reduce(
                        (sum, r) => sum + r.sales.reduce((s, sale) => s + (sale.amount * sale.prize.commission) / 100, 0),
                        0
                      );
                      const agentTerminalWin = terminals.reduce(
                        (sum, r) => sum + r.win.reduce((s, w) => s + w.amount, 0),
                        0
                      );

                      rows.push(
                        <TableRow key={rowIndex}>
                          {rowIndex === 0 && (
                            <TableCell className="border" rowSpan={agentRowSpan}>
                              {weeks.find((w) => w.id === selectedWeek)?.week || "-"}
                            </TableCell>
                          )}
                          {isFirstStaffRow && (
                            <TableCell className="border" rowSpan={staffRowspan}>
                              {staff}
                            </TableCell>
                          )}
                          <TableCell className="border">
                            {agent}
                          </TableCell>
                          <TableCell className="border">
                            {agentTerminalSales.toLocaleString()}
                          </TableCell>
                          <TableCell className="border">
                            {agentTerminalPayable.toLocaleString()}
                          </TableCell>
                          <TableCell className="border">
                            {agentTerminalWin.toLocaleString()}
                          </TableCell>
                          {rowIndex === 0 && (
                            <TableCell className="border" rowSpan={agentRowSpan}>
                              {agentTabTotalWin.toLocaleString()}
                            </TableCell>
                          )}
                          {rowIndex === 0 && (
                            <TableCell className="border" rowSpan={agentRowSpan}>
                              {(agentTabTotalSales - agentTabTotalWin).toLocaleString()}
                            </TableCell>
                          )}
                          {rowIndex === 0 && (
                            <TableCell className="border" rowSpan={agentRowSpan}>
                              {agentTabTotalSales - agentTabTotalWin > 0 ? (
                                <Badge className="bg-green-600 hover:bg-green-700">Green</Badge>
                              ) : (
                                <Badge variant="destructive">Red</Badge>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );

                      isFirstStaffRow = false;
                    });
                  });

                  return rows;
                })()}
                {!agentFilteredResults.length && (
                  <TableRow>
                    <TableCell className="border" colSpan={10}>
                      No agent sales data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
                  const grouped: { [staff: string]: { [agent: string]: TerminalResult[] } } = {};
                  terminalFilteredResults.forEach((result) => {
                    if (!grouped[result.staff]) grouped[result.staff] = {};
                    if (!grouped[result.staff][result.agent]) grouped[result.staff][result.agent] = [];
                    grouped[result.staff][result.agent].push(result);
                  });

                  const rows: React.ReactElement[] = [];
                  const terminalRowspan = terminalFilteredResults.length;
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
                              {result.sales.reduce((s, sale) => s + sale.amount, 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="border">
                              {result.sales.reduce((s, sale) => s + (sale.amount * sale.prize.commission) / 100, 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="border">
                              {result.win.reduce((s, w) => s + w.amount, 0).toLocaleString()}
                            </TableCell>
                            {rowIndex === 0 && (
                              <TableCell className="border" rowSpan={terminalRowspan}>
                                {terminalTabTotalWin.toLocaleString()}
                              </TableCell>
                            )}
                            {rowIndex === 0 && (
                              <TableCell className="border" rowSpan={terminalRowspan}>
                                {(terminalTabTotalSales - terminalTabTotalWin).toLocaleString()}
                              </TableCell>
                            )}
                            {rowIndex === 0 && (
                              <TableCell className="border" rowSpan={terminalRowspan}>
                                {terminalTabTotalSales - terminalTabTotalWin > 0 ? (
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
                {!terminalFilteredResults.length && (
                  <TableRow>
                    <TableCell className="border" colSpan={10}>
                      No terminal sales data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
