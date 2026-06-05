import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getLabourProductivity } from "@/lib/reports";
import { apiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const session = await requireSession();
    const productivity = await getLabourProductivity(session.tenantId);
    return NextResponse.json(productivity);
  } catch (e) {
    return apiError(e);
  }
}
