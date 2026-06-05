import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { getSlabInventory } from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.inventory_read);
    const { searchParams } = new URL(request.url);
    const slabs = await getSlabInventory(session.tenantId, {
      status: searchParams.get("status") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      search: searchParams.get("q") ?? undefined,
    });
    return NextResponse.json({ slabs });
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
