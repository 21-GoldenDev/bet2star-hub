"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Eye, X, ExternalLink } from "lucide-react";
import DepositBankDetailsEditor from "@/components/admin/DepositBankDetailsEditor";

type ManualFundingRow = {
  id: string;
  type: "deposit" | "withdrawal";
  amount: number;
  status: string;
  reference: string | null;
  balance_amount: number;
  created_at: string;
  metadata: {
    message?: string;
    attachments?: { name?: string; path?: string; url?: string | null }[];
    account_number?: string;
    account_name?: string;
    bank_name?: string;
    reviewed_at?: string;
    reviewed_by?: string;
  };
  user: {
    full_name: string | null;
    username: string | null;
    phone: string | null;
    email: string | null;
  };
};

type PendingAction = {
  id: string;
  status: "completed" | "cancelled";
  label: string;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayUser(row: ManualFundingRow) {
  return row.user.full_name || row.user.username || row.user.email || "Unknown user";
}

export default function ManualFundingPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ManualFundingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<ManualFundingRow | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);

      const response = await fetch(`/api/admin/manual-funding?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load requests");
      }

      setRequests(result.data || []);
    } catch (error: unknown) {
      toast({
        title: "Failed to load requests",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((row) => row.status === "pending").length,
      completed: requests.filter((row) => row.status === "completed").length,
      cancelled: requests.filter((row) => row.status === "cancelled").length,
    };
  }, [requests]);

  const handleStatusUpdate = async () => {
    if (!pendingAction) return;

    setUpdating(true);
    try {
      const response = await fetch("/api/admin/manual-funding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: pendingAction.id,
          status: pendingAction.status,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update request");
      }

      toast({
        title: "Request updated",
        description: `Marked as ${pendingAction.status}`,
      });

      setPendingAction(null);
      setSelectedRequest(null);
      await fetchRequests();
    } catch (error: unknown) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Online Manual Funding</h1>
        <p className="text-muted-foreground mt-2">
          Review player deposit and withdrawal requests submitted outside Paystack
        </p>
      </div>

      <DepositBankDetailsEditor />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Requests</p>
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
          <p className="text-sm text-muted-foreground">Cancelled</p>
          <p className="text-2xl font-bold text-muted-foreground">{stats.cancelled}</p>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="md:w-56">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="md:w-56">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="deposit">Deposits</SelectItem>
            <SelectItem value="withdrawal">Withdrawals</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading requests...</Card>
      ) : (
        <DataTable<ManualFundingRow>
          columns={[
            {
              key: "user",
              label: "User",
              render: (_, row) => displayUser(row),
              sortable: true,
            },
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
                        : "outline"
                  }
                >
                  {status}
                </Badge>
              ),
              sortable: true,
            },
            {
              key: "created_at",
              label: "Submitted",
              render: (value) => formatDateTime(String(value)),
              sortable: true,
            },
            {
              key: "reference",
              label: "Reference",
              render: (value) => String(value || "-"),
            },
            {
              key: "balance_amount",
              label: "Balance Amount",
              render: (value) => `₦${Number(value || 0).toLocaleString()}`,
              sortable: true,
            },
          ]}
          data={requests}
          searchKey="reference"
          searchPlaceholder="Search by reference..."
          actions={(row) => (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedRequest(row)}>
                <Eye className="w-4 h-4" />
              </Button>
              {row.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() =>
                      setPendingAction({
                        id: row.id,
                        status: "completed",
                        label: "complete",
                      })
                    }
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      setPendingAction({
                        id: row.id,
                        status: "cancelled",
                        label: "cancel",
                      })
                    }
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          )}
        />
      )}

      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">User</p>
                  <p className="font-medium">{displayUser(selectedRequest)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedRequest.user.email || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{selectedRequest.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium">₦{Number(selectedRequest.amount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{selectedRequest.status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reference</p>
                  <p className="font-medium">{selectedRequest.reference || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Balance Amount</p>
                  <p className="font-medium">₦{Number(selectedRequest.balance_amount || 0).toLocaleString()}</p>
                </div>
              </div>

              {selectedRequest.type === "withdrawal" && (
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="font-medium">Bank Details</p>
                  <p>Bank: {selectedRequest.metadata.bank_name || "-"}</p>
                  <p>Account Number: {selectedRequest.metadata.account_number || "-"}</p>
                  <p>Account Name: {selectedRequest.metadata.account_name || "-"}</p>
                </div>
              )}

              <div>
                <p className="text-muted-foreground mb-1">Message</p>
                <p className="rounded-lg bg-muted p-3 whitespace-pre-wrap">
                  {selectedRequest.metadata.message || "No message provided"}
                </p>
              </div>

              {selectedRequest.metadata.attachments &&
                selectedRequest.metadata.attachments.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-2">Attachments</p>
                    <ul className="space-y-2">
                      {selectedRequest.metadata.attachments.map((attachment, index) => (
                        <li key={`${attachment.path || attachment.name}-${index}`}>
                          {attachment.url ? (
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-primary hover:underline"
                            >
                              {attachment.name || "Attachment"}
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          ) : (
                            <span>{attachment.name || "Attachment"}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {selectedRequest.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() =>
                      setPendingAction({
                        id: selectedRequest.id,
                        status: "completed",
                        label: "complete",
                      })
                    }
                  >
                    Mark Completed
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      setPendingAction({
                        id: selectedRequest.id,
                        status: "cancelled",
                        label: "cancel",
                      })
                    }
                  >
                    Cancel Request
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.status === "completed" ? "Complete request?" : "Cancel request?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.status === "completed"
                ? "This will finalize the request and update the player's balance if needed."
                : "This will cancel the request and refund the player's balance for withdrawals."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusUpdate} disabled={updating}>
              {updating ? "Updating..." : `Yes, ${pendingAction?.label}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
