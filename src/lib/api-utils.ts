import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiError(e: unknown) {
  if (e instanceof ZodError) {
    return NextResponse.json({ error: e.flatten() }, { status: 400 });
  }
  if (e instanceof Error) {
    if (e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (e.message === "SEAT_LIMIT") {
      return NextResponse.json({ error: "Seat limit reached. Upgrade your plan or deactivate a member." }, { status: 403 });
    }
    if (e.message === "INVITE_EXPIRED") {
      return NextResponse.json({ error: "This invitation has expired" }, { status: 410 });
    }
    if (e.message === "INVITE_ACCEPTED") {
      return NextResponse.json({ error: "This invitation was already accepted" }, { status: 409 });
    }
    if (e.message === "INVITE_INVALID") {
      return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
    }
    if (e.message === "EMAIL_MISMATCH") {
      return NextResponse.json({ error: "Sign in with the invited email address" }, { status: 403 });
    }
    if (e.message === "ALREADY_MEMBER") {
      return NextResponse.json({ error: "You are already a member of this workspace" }, { status: 409 });
    }
    if (e.message === "INVALID_CREDENTIALS") {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    if (e.message === "USER_EXISTS") {
      return NextResponse.json({ error: "An account exists. Sign in instead." }, { status: 409 });
    }
    if (e.message === "NAME_REQUIRED") {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }
    if (e.message === "STRIPE_NOT_CONFIGURED") {
      return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });
    }
  }
  console.error(e);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}
