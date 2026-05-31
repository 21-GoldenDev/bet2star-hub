import { NextRequest, NextResponse } from "next/server";
import { getAdminRoleFromRequest } from "@/lib/admin/role";
import {
  getServiceClient,
  MANUAL_PAYMENT_METHOD,
  updateManualFundingStatus,
  type ManualFundingStatus,
} from "@/lib/manualFunding";
import { createSupabaseServer } from "@/lib/supabase/server";

async function requireAdmin(request: NextRequest) {
  const roleInfo = await getAdminRoleFromRequest(request);
  if (!roleInfo || roleInfo.role !== "admin") {
    return null;
  }
  return roleInfo;
}

export async function GET(request: NextRequest) {
  try {
    const roleInfo = await requireAdmin(request);
    if (!roleInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const service = getServiceClient();
    let query = service
      .from("transactions")
      .select("*")
      .eq("payment_method", MANUAL_PAYMENT_METHOD)
      .order("created_at", { ascending: false })
      .limit(200);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (type && type !== "all") {
      query = query.eq("type", type);
    }

    const { data: transactions, error } = await query;
    if (error) {
      throw error;
    }

    const userIds = Array.from(new Set((transactions || []).map((tx) => tx.user_id).filter(Boolean)));
    let profilesByUserId: Record<string, { full_name?: string; username?: string; phone?: string; balance?: number }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await service
        .from("profiles")
        .select("user_id, full_name, username, phone, balance")
        .in("user_id", userIds);

      profilesByUserId = Object.fromEntries(
        (profiles || []).map((profile) => [profile.user_id, profile])
      );
    }

    const enriched = await Promise.all(
      (transactions || []).map(async (tx) => {
        const metadata =
          tx.metadata && typeof tx.metadata === "object" ? tx.metadata : {};
        const attachments = Array.isArray(metadata.attachments) ? metadata.attachments : [];
        const signedAttachments = await Promise.all(
          attachments.map(async (attachment: { name?: string; path?: string }) => {
            if (!attachment?.path) {
              return attachment;
            }

            const { data: signed } = await service.storage
              .from("manual-funding")
              .createSignedUrl(attachment.path, 3600);

            return {
              ...attachment,
              url: signed?.signedUrl || null,
            };
          })
        );

        const profile = profilesByUserId[tx.user_id] || {};
        const { data: authData } = await service.auth.admin.getUserById(tx.user_id);

        return {
          ...tx,
          balance_amount: Number(profile.balance) || 0,
          metadata: {
            ...metadata,
            attachments: signedAttachments,
          },
          user: {
            full_name: profile.full_name || null,
            username: profile.username || null,
            phone: profile.phone || null,
            email: authData?.user?.email || metadata.submitted_by || null,
          },
        };
      })
    );

    return NextResponse.json({ data: enriched });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load manual funding requests";
    console.error("Admin manual funding GET error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const roleInfo = await requireAdmin(request);
    if (!roleInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body as { id?: string; status?: ManualFundingStatus };

    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }

    if (status !== "completed" && status !== "cancelled") {
      return NextResponse.json({ error: "Status must be completed or cancelled" }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const service = getServiceClient();
    const result = await updateManualFundingStatus(service, id, status, user?.email || undefined);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update request";
    console.error("Admin manual funding PATCH error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
