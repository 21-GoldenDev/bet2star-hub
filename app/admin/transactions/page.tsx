"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/admin/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, X, Eye } from "lucide-react";

interface Transaction {
  id: number;
  userId: string;
  userName: string;
  type: "deposit" | "withdrawal";
  amount: number;
  status: "pending" | "completed" | "failed";
  method: string;
  date: string;
  time: string;
}

// Mock data
const mockTransactions: Transaction[] = [
  {
    id: 1,
    userId: "USR001",
    userName: "John Doe",
    type: "deposit",
    amount: 50000,
    status: "completed",
    method: "bank_transfer",
    date: "2024-12-20",
    time: "14:30",
  },
  {
    id: 2,
    userId: "USR002",
    userName: "Jane Smith",
    type: "withdrawal",
    amount: 25000,
    status: "pending",
    method: "bank_transfer",
    date: "2024-12-20",
    time: "15:45",
  },
  {
    id: 3,
    userId: "USR003",
    userName: "Bob Johnson",
    type: "deposit",
    amount: 100000,
    status: "completed",
    method: "card",
    date: "2024-12-20",
    time: "16:20",
  },
  {
    id: 4,
    userId: "USR004",
    userName: "Alice Williams",
    type: "withdrawal",
    amount: 75000,
    status: "failed",
    method: "bank_transfer",
    date: "2024-12-19",
    time: "10:15",
  },
  {
    id: 5,
    userId: "USR005",
    userName: "Charlie Brown",
    type: "deposit",
    amount: 30000,
    status: "pending",
    method: "wallet",
    date: "2024-12-19",
    time: "11:30",
  },
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const handleApprove = (id: number) => {
    setTransactions(
      transactions.map((t) =>
        t.id === id ? { ...t, status: "completed" as const } : t
      )
    );
  };

  const handleReject = (id: number) => {
    setTransactions(
      transactions.map((t) =>
        t.id === id ? { ...t, status: "failed" as const } : t
      )
    );
  };

  let filteredTransactions = transactions;
  if (statusFilter !== "all") {
    filteredTransactions = filteredTransactions.filter(
      (t) => t.status === statusFilter
    );
  }
  if (typeFilter !== "all") {
    filteredTransactions = filteredTransactions.filter(
      (t) => t.type === typeFilter
    );
  }

  const stats = {
    total: transactions.length,
    pending: transactions.filter((t) => t.status === "pending").length,
    completed: transactions.filter((t) => t.status === "completed").length,
    failed: transactions.filter((t) => t.status === "failed").length,
    totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage user deposits and withdrawals
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Transactions</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Failed</p>
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Amount</p>
          <p className="text-2xl font-bold">₦{stats.totalAmount.toLocaleString()}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="deposit">Deposits</SelectItem>
              <SelectItem value="withdrawal">Withdrawals</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transactions Table */}
      <DataTable<Transaction>
        columns={[
          { key: "userName", label: "User", sortable: true },
          {
            key: "type",
            label: "Type",
            render: (type) => (
              <Badge variant={type === "deposit" ? "default" : "secondary"}>
                {type === "deposit" ? "Deposit" : "Withdrawal"}
              </Badge>
            ),
            sortable: true,
          },
          {
            key: "amount",
            label: "Amount",
            render: (amount) => `₦${Number(amount).toLocaleString()}`,
            sortable: true,
          },
          {
            key: "status",
            label: "Status",
            render: (status) => (
              <Badge
                variant={
                  status === "completed"
                    ? "default"
                    : status === "pending"
                    ? "secondary"
                    : "destructive"
                }
              >
                {status}
              </Badge>
            ),
            sortable: true,
          },
          { key: "method", label: "Method", sortable: true },
          { key: "date", label: "Date", sortable: true },
          { key: "time", label: "Time" },
        ]}
        data={filteredTransactions}
        searchKey="userName"
        searchPlaceholder="Search by user name..."
        actions={(transaction) => (
          <div className="flex gap-2">
            {transaction.status === "pending" && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleApprove(transaction.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReject(transaction.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
            {transaction.status !== "pending" && (
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      />
    </div>
  );
}
