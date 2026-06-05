import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getLabourProductivity } from "@/lib/reports";
import { apiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const session = await requirePermission(PERMISSIONS.labour_read);
    const productivity = await getLabourProductivity(session.tenantId);
    return NextResponse.json(productivity);
  } catch (e) {
    return apiError(e);
  }
}
