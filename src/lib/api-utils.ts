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
  }
  console.error(e);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}
