"use client";

import { useState, useEffect } from "react";
import { Users, Gamepad2, DollarSign, TrendingUp } from "lucide-react";
import StatCard from "@/components/admin/StatCard";
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// Mock data - replace with real API calls
const chartData = [
  { date: "Jan 1", users: 400, revenue: 2400, bets: 240 },
  { date: "Jan 8", users: 520, revenue: 2210, bets: 221 },
  { date: "Jan 15", users: 750, revenue: 2290, bets: 229 },
  { date: "Jan 22", users: 920, revenue: 2000, bets: 200 },
  { date: "Jan 29", users: 1200, revenue: 2181, bets: 218 },
  { date: "Feb 5", users: 1450, revenue: 2500, bets: 250 },
];

const recentUsers = [
  { id: 1, name: "John Doe", email: "john@example.com", type: "online_player", signupDate: "2024-12-20" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", type: "online_player", signupDate: "2024-12-20" },
  { id: 3, name: "Bob Johnson", email: "bob@example.com", type: "offline_player", signupDate: "2024-12-19" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 1250,
    onlinePlayers: 750,
    offlinePlayers: 400,
    staffMembers: 100,
    activeGames: 45,
    totalRevenue: 15420,
  });

  useEffect(() => {
    // TODO: Fetch real data from API
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          description="All user types"
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatCard
          title="Online Players"
          value={stats.onlinePlayers}
          icon={Users}
          description="Web players"
          trend={{ value: 8.2, isPositive: true }}
        />
        <StatCard
          title="Offline Players"
          value={stats.offlinePlayers}
          icon={Users}
          description="Controller players"
          trend={{ value: 5.1, isPositive: true }}
        />
        <StatCard
          title="Staff Members"
          value={stats.staffMembers}
          icon={Users}
          description="Admin staff"
          trend={{ value: 2.0, isPositive: true }}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2332" />
              <XAxis dataKey="date" stroke="#6B8BA8" />
              <YAxis stroke="#6B8BA8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0F1419",
                  border: "1px solid #1A2332",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#FFD700"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* User & Bet Activity */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Activity Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2332" />
              <XAxis dataKey="date" stroke="#6B8BA8" />
              <YAxis stroke="#6B8BA8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0F1419",
                  border: "1px solid #1A2332",
                }}
              />
              <Legend />
              <Bar dataKey="users" fill="#FFD700" />
              <Bar dataKey="bets" fill="#00D4FF" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Users */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Recent Sign-ups</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium">Name</th>
                <th className="text-left py-3 px-4 font-medium">Email</th>
                <th className="text-left py-3 px-4 font-medium">User Type</th>
                <th className="text-left py-3 px-4 font-medium">Sign-up Date</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((user) => {
                const typeLabels: Record<string, string> = {
                  online_player: "Online Player (Web)",
                  offline_player: "Offline Player (Controller)",
                  staff: "Staff",
                };
                return (
                  <tr key={user.id} className="border-b border-border hover:bg-accent/50">
                    <td className="py-3 px-4">{user.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                    <td className="py-3 px-4 text-muted-foreground">{typeLabels[user.type]}</td>
                    <td className="py-3 px-4 text-muted-foreground">{user.signupDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

