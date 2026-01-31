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

    const { error } = await supabase.from("prize").delete().eq("id", id);

    if (error) {
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
