"use client";

import { useState, useEffect } from "react";
import { Users, Gamepad2, DollarSign, TrendingUp, Building2, CheckCircle2, XCircle } from "lucide-react";
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

interface DashboardStats {
  totalUsers: number;
  onlinePlayers: number;
  offlinePlayers: number;
  staffMembers: number;
  totalBetsCount: number;
  totalSalesAmount: number;
  totalCommission: number;
  totalWinningsAmount: number;
  balanceProfitOrLoss: number;
}

interface VoidStats {
  totalRequests: number;
  approvedRequests: number;
  dismissedRequests: number;
}

interface RecentUser {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  phone?: string | null;
  created_at: string;
}

interface ChartDataPoint {
  date: string;
  users: number;
  revenue: number;
  bets: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    onlinePlayers: 0,
    offlinePlayers: 0,
    staffMembers: 0,
    totalBetsCount: 0,
    totalSalesAmount: 0,
    totalCommission: 0,
    totalWinningsAmount: 0,
    balanceProfitOrLoss: 0,
  });
  const [voidStats, setVoidStats] = useState<VoidStats>({
    totalRequests: 0,
    approvedRequests: 0,
    dismissedRequests: 0,
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/dashboard");
      if (!response.ok) throw new Error("Failed to fetch dashboard data");

      const data = await response.json();
      setStats(data.stats);
      setVoidStats(data.voidStats);
      setChartData(data.chartData);
      setRecentUsers(data.recentUsers);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-20 bg-muted rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Admin Panel!
        </p>
      </div>

      {/* Stats Grid - General */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
        <StatCard
          title="Total Bets"
          value={stats.totalBetsCount}
          icon={DollarSign}
        />
        <StatCard
          title="Total Agents"
          value={stats.onlinePlayers + stats.offlinePlayers}
          icon={Users}
        />
        <StatCard
          title="Total Terminals"
          value={stats.offlinePlayers}
          icon={Building2}
        />
      </div>

      {/* Finance Dashboard */}
      <div>
        <h2 className="text-xl font-bold mb-4 px-4 py-2 bg-primary/20 rounded">
          FINANCE DASHBOARD FOR THE WEEK
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
          <StatCard
            title="Total Sales Amount"
            value={`₦${stats.totalSalesAmount.toLocaleString()}`}
            icon={DollarSign}
            description="All bets placed"
          />
          <StatCard
            title="Total Commission paid to Agents"
            value={`₦${stats.totalCommission.toLocaleString()}`}
            icon={TrendingUp}
            description="Agent commissions"
          />
          <StatCard
            title="Winnings paid to Agents"
            value={`₦${stats.totalWinningsAmount.toLocaleString()}`}
            icon={Gamepad2}
            description="Player winnings"
          />
          <StatCard
            title="Balance Profit or Loss"
            value={`₦${stats.balanceProfitOrLoss.toLocaleString()}`}
            icon={TrendingUp}
            description="Net profit/loss"
          />
        </div>
      </div>

      {/* Void Bets Dashboard */}
      <div>
        <h2 className="text-xl font-bold mb-4 px-4 py-2 bg-primary/20 rounded">
          VOID BETS DASHBOARD FOR THE WEEK
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
          <StatCard
            title="Total Requests"
            value={voidStats.totalRequests}
            icon={DollarSign}
            description="All void requests"
          />
          <StatCard
            title="Approved Requests"
            value={voidStats.approvedRequests}
            icon={CheckCircle2}
            description="Approved voids"
          />
          <StatCard
            title="Dismissed Requests"
            value={voidStats.dismissedRequests}
            icon={XCircle}
            description="Rejected voids"
          />
        </div>
      </div>

      {/* User Stats */}
      <div>
        <h2 className="text-xl font-bold mb-4">User Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            description="All user types"
          />
          <StatCard
            title="Online Players"
            value={stats.onlinePlayers}
            icon={Users}
            description="Web players"
          />
          <StatCard
            title="Offline Players"
            value={stats.offlinePlayers}
            icon={Users}
            description="Controller players"
          />
          <StatCard
            title="Staff Members"
            value={stats.staffMembers}
            icon={Users}
            description="Admin staff"
          />
        </div>
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
                <th className="text-left py-3 px-4 font-medium">Phone</th>
                <th className="text-left py-3 px-4 font-medium">User Type</th>
                <th className="text-left py-3 px-4 font-medium">Sign-up Date</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.length > 0 ? (
                recentUsers.map((user) => {
                  const typeLabels: Record<string, string> = {
                    user: "Online Player (Web)",
                    offline_player: "Offline Player (Controller)",
                    staff: "Staff",
                    admin: "Admin",
                  };
                  return (
                    <tr key={user.user_id} className="border-b border-border hover:bg-accent/50">
                      <td className="py-3 px-4">{user.full_name || "N/A"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                      <td className="py-3 px-4 text-muted-foreground">{user.phone || "--"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{typeLabels[user.role] || user.role}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No recent sign-ups
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

