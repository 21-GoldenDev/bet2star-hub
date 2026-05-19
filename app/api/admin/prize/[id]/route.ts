import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(
  supabaseUrl ?? "",
  supabaseServiceKey ?? ""
);

const PRIZE_IN_USE_MESSAGE =
  "Cannot delete this prize because it is used by existing lotto or pools bets. Edit the prize and set its status to inactive instead.";

const PRIZE_BET_TABLES = ["bets_lotto", "bets_pools"] as const;

async function hasBetsForPrize(prizeId: string) {
  for (const table of PRIZE_BET_TABLES) {
    const { error, count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("prize_id", prizeId)
      .limit(1);

    if (error) {
      throw error;
    }

    if ((count ?? 0) > 0) {
      return true;
    }
  }

  return false;
}

function isForeignKeyViolation(error: { code?: string; message?: string }) {
  return (
    error.code === "23503" ||
    (error.message?.includes("foreign key constraint") ?? false)
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("prize")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Prize not found" }, { status: 404 });
    }

    return NextResponse.json({ prize: data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching prize:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, data, commission, status } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (data !== undefined) {
      // Validate data structure
      if (!data.columns || !Array.isArray(data.columns) || !data.data || typeof data.data !== "object") {
        return NextResponse.json(
          { error: "Invalid data structure. Expected { columns: string[], data: { [key: string]: number[] } }" },
          { status: 400 }
        );
      }
      updateData.data = data;
    }

    if (commission !== undefined) {
      if (typeof commission !== "number" || commission < 0 || commission > 100) {
        return NextResponse.json({ error: "Invalid commission. Must be a number between 0 and 100" }, { status: 400 });
      }
      updateData.commission = commission;
    }

    if (status !== undefined) {
      if (status !== "active" && status !== "inactive") {
        return NextResponse.json({ error: "Invalid status. Must be 'active' or 'inactive'" }, { status: 400 });
      }
      updateData.status = status;
    }

    updateData.updated_at = new Date().toISOString();

    const { data: prizeData, error } = await supabase
      .from("prize")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!prizeData) {
      return NextResponse.json({ error: "Prize not found" }, { status: 404 });
    }

    return NextResponse.json({ prize: prizeData }, { status: 200 });
  } catch (error) {
    console.error("Error updating prize:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { password } = await request.json();
    const deletePassword = process.env.ADMIN_PRIZE_DELETE_PASSWORD;

    if (!deletePassword) {
      return NextResponse.json(
        { error: "Password is not configured" },
        { status: 500 }
      );
    }

    if (typeof password !== "string" || password !== deletePassword) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    if (await hasBetsForPrize(id)) {
      return NextResponse.json({ error: PRIZE_IN_USE_MESSAGE }, { status: 400 });
    }

    const { error } = await supabase.from("prize").delete().eq("id", id);

    if (error) {
      if (isForeignKeyViolation(error)) {
        return NextResponse.json({ error: PRIZE_IN_USE_MESSAGE }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Prize deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting prize:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
