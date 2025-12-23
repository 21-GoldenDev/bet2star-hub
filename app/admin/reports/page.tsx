"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Download, Filter } from "lucide-react";

const revenueByGame = [
  { name: "Lotto", value: 450000, percentage: 45 },
  { name: "Pools", value: 350000, percentage: 35 },
  { name: "Sports", value: 200000, percentage: 20 },
];

const monthlyRevenue = [
  { month: "Aug", revenue: 450000 },
  { month: "Sep", revenue: 520000 },
  { month: "Oct", revenue: 615000 },
  { month: "Nov", revenue: 720000 },
  { month: "Dec", revenue: 890000 },
];

const gameStats = [
  {
    name: "Lotto",
    players: 2500,
    bets: 4200,
    revenue: 450000,
    conversionRate: "28%",
  },
  {
    name: "Pools",
    players: 1800,
    bets: 3100,
    revenue: 350000,
    conversionRate: "24%",
  },
  {
    name: "Sports",
    players: 1200,
    bets: 2500,
    revenue: 200000,
    conversionRate: "18%",
  },
];

const COLORS = ["#FFD700", "#00D4FF", "#9E7BFF"];

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("2024-12-01");
  const [dateTo, setDateTo] = useState("2024-12-20");

  const handleExport = () => {
    alert("Exporting report...");
    // TODO: Implement actual export functionality
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Detailed analytics and performance metrics
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <Label className="mb-2 block">From Date</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Label className="mb-2 block">To Date</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Apply Filter
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="games">Games Performance</TabsTrigger>
          <TabsTrigger value="users">User Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">₦1,890,000</p>
              <p className="text-xs text-green-600 mt-2">↑ 23.5% vs last period</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total Players</p>
              <p className="text-2xl font-bold">5,500</p>
              <p className="text-xs text-green-600 mt-2">↑ 15.2% vs last period</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total Bets</p>
              <p className="text-2xl font-bold">9,800</p>
              <p className="text-xs text-green-600 mt-2">↑ 18.7% vs last period</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Avg. Bet Value</p>
              <p className="text-2xl font-bold">₦193</p>
              <p className="text-xs text-red-600 mt-2">↓ 2.1% vs last period</p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A2332" />
                  <XAxis dataKey="month" stroke="#6B8BA8" />
                  <YAxis stroke="#6B8BA8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F1419",
                      border: "1px solid #1A2332",
                      color: "#E6EDF3",
                    }}
                    labelStyle={{ color: "#E6EDF3" }}
                    itemStyle={{ color: "#E6EDF3" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#FFD700"
                    strokeWidth={2}
                    dot={{ fill: "#FFD700" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Revenue by Game Type */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">Revenue by Game Type</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={revenueByGame}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueByGame.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₦${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>

        {/* Games Performance Tab */}
        <TabsContent value="games" className="space-y-6">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent">
                    <th className="text-left py-4 px-6 font-bold">Game</th>
                    <th className="text-left py-4 px-6 font-bold">Players</th>
                    <th className="text-left py-4 px-6 font-bold">Bets</th>
                    <th className="text-left py-4 px-6 font-bold">Revenue</th>
                    <th className="text-left py-4 px-6 font-bold">Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {gameStats.map((stat, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-accent/50">
                      <td className="py-4 px-6 font-medium">{stat.name}</td>
                      <td className="py-4 px-6">{stat.players.toLocaleString()}</td>
                      <td className="py-4 px-6">{stat.bets.toLocaleString()}</td>
                      <td className="py-4 px-6 font-bold">
                        ₦{stat.revenue.toLocaleString()}
                      </td>
                      <td className="py-4 px-6">{stat.conversionRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* User Analytics Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">New Users</p>
              <p className="text-2xl font-bold">450</p>
              <p className="text-xs text-green-600 mt-2">↑ 22% vs last period</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Active Users</p>
              <p className="text-2xl font-bold">3,200</p>
              <p className="text-xs text-green-600 mt-2">↑ 18% vs last period</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Retention Rate</p>
              <p className="text-2xl font-bold">68%</p>
              <p className="text-xs text-red-600 mt-2">↓ 3% vs last period</p>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">User Distribution</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Age 18-25</span>
                  <span className="text-sm font-bold">35%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: "35%" }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Age 26-35</span>
                  <span className="text-sm font-bold">40%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-secondary h-2 rounded-full"
                    style={{ width: "40%" }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Age 36+</span>
                  <span className="text-sm font-bold">25%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full"
                    style={{ width: "25%" }}
                  ></div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
