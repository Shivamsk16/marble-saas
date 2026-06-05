import { NextResponse } from "next/server";
import { lookupInvitation } from "@/lib/invitations";
import { apiError } from "@/lib/api-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const result = await lookupInvitation(token);

    if (result.status === "invalid") {
      return NextResponse.json({ status: "invalid" });
    }

    return NextResponse.json({
      status: result.status,
      invitation: {
        email: result.preview.email,
        workspaceName: result.preview.workspaceName,
        workspaceSlug: result.preview.workspaceSlug,
        roleName: result.preview.roleName,
        inviterName: result.preview.inviterName,
        expiresAt: result.preview.expiresAt,
      },
      userExists: result.status === "pending" ? result.userExists : undefined,
    });
  } catch (e) {
    return apiError(e);
  }
}
