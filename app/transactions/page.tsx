"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import useSupabaseUser from "@/hooks/use-supabase-user";
import { getUserProfile } from "@/lib/auth";
import supabase from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type TxType = "deposit" | "withdrawal" | "bet" | "win" | "winning" | "payout" | string;

type TransactionRecord = {
  id: string;
  type: TxType;
  amount: number;
  status: string;
  reference: string | null;
  payment_method: string | null;
  payment_channel: string | null;
  created_at: string;
  metadata: Record<string, any> | null;
};

type TransactionRow = {
  id: string;
  dateLabel: string;
  eventLabel: string;
  debit: number;
  credit: number;
  balance: number | null;
  details: string;
};

const PAGE_SIZE = 20;

const formatMoney = (value: number) => `₦${value.toLocaleString()}`;

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toTitleCase = (value: string) =>
  value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ");

const resolveBetDomain = (tx: TransactionRecord) => {
  const raw = tx.metadata?.bet_type ?? tx.metadata?.event_type ?? tx.metadata?.type;
  if (typeof raw !== "string") return "";

  const normalized = raw.toLowerCase();
  if (normalized === "sports_draw") return "sports";
  if (["sports", "lotto", "pools"].includes(normalized)) return normalized;
  return normalized;
};

const resolveEventLabel = (tx: TransactionRecord) => {
  const txType = (tx.type || "").toLowerCase();
  const betDomain = resolveBetDomain(tx);
  const readableDomain = betDomain ? toTitleCase(betDomain) : "";

  if (txType === "deposit") return "Deposit";
  if (txType === "withdrawal") return "Withdraw";
  if (txType === "bet") return readableDomain ? `${readableDomain} Bet` : "Bet";
  if (["winning", "win", "payout"].includes(txType)) {
    return readableDomain ? `${readableDomain} Winning` : "Winning";
  }

  return toTitleCase(txType || "Transaction");
};

const resolveDebitCredit = (tx: TransactionRecord) => {
  const txType = (tx.type || "").toLowerCase();
  const amount = Number(tx.amount) || 0;

  const isCredit = txType === "deposit" || ["winning", "win", "payout"].includes(txType);
  const isDebit = txType === "withdrawal" || txType === "bet";

  return {
    debit: isDebit ? amount : 0,
    credit: isCredit ? amount : 0,
  };
};

const resolveDetails = (tx: TransactionRecord) => {
  const txType = (tx.type || "").toLowerCase();
  if (txType !== "deposit" && txType !== "withdrawal") return "-";

  const method = tx.payment_method || "N/A";
  const channel = tx.payment_channel || "N/A";
  const status = tx.status || "N/A";
  return `${toTitleCase(method)} • ${toTitleCase(channel)} • ${toTitleCase(status)}`;
};

const doesStatusAffectBalance = (status: string) => {
  const normalized = (status || "").toLowerCase();
  return !["pending", "cancelled", "canceled", "failed", "reversed"].includes(normalized);
};

export default function TransactionsPage() {
  const { user, isLoading: userLoading } = useSupabaseUser();
  const [loading, setLoading] = useState(true);
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadTransactions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [{ data: profile }, { data: txs, error: txError }] = await Promise.all([
          getUserProfile(user.id),
          supabase
            .from("transactions")
            .select("id, type, amount, status, reference, payment_method, payment_channel, metadata, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100),
        ]);

        setCurrentBalance(profile?.balance ?? null);
        if (txError) {
          console.error("Failed to load transactions:", txError);
          setTransactions([]);
          setCurrentPage(1);
        } else {
          setTransactions((txs || []) as TransactionRecord[]);
          setCurrentPage(1);
        }
      } catch (error) {
        console.error("Failed to load transaction history:", error);
        setTransactions([]);
        setCurrentPage(1);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [user]);

  const rows: TransactionRow[] = useMemo(() => {
    let rollingBalance = currentBalance;

    return transactions.map((tx) => {
      const { debit, credit } = resolveDebitCredit(tx);
      const rowBalance = rollingBalance;
      const affectsBalance = doesStatusAffectBalance(tx.status);

      if (rollingBalance !== null && affectsBalance) {
        rollingBalance = rollingBalance - credit + debit;
      }

      return {
        id: tx.id,
        dateLabel: formatDateTime(tx.created_at),
        eventLabel: resolveEventLabel(tx),
        debit,
        credit,
        balance: rowBalance,
        details: resolveDetails(tx),
      };
    });
  }, [transactions, currentBalance]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return rows.slice(start, end);
  }, [rows, currentPage]);

  const startItem = rows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, rows.length);

  if (userLoading) {
    return (
      <div className="min-h-screen pt-20 pb-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-20 pb-8 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Please Sign In</h1>
          <p className="text-muted-foreground mb-6">You need to be signed in to view transactions</p>
          <Link
            href="/auth"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Transaction History</h1>
          <p className="text-muted-foreground">Track deposits, withdrawals, bets, and winnings</p>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-muted/60">
                <tr>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Transaction ID</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Event</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Debit</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Credit</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Balance</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      Loading transactions...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-4 py-3 text-sm text-foreground font-medium">{row.id}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{row.dateLabel}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{row.eventLabel}</td>
                      <td className="px-4 py-3 text-sm text-right text-destructive">
                        {row.debit > 0 ? formatMoney(row.debit) : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-secondary">
                        {row.credit > 0 ? formatMoney(row.credit) : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-foreground">
                        {row.balance !== null ? formatMoney(row.balance) : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{row.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && rows.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
              <p className="text-sm text-muted-foreground">
                Showing {startItem}-{endItem} of {rows.length}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
