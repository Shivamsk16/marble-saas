import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  buildMorningDigest,
  carryForwardTasks,
  sendReminderLog,
} from "@/lib/reminders";

/** Cron endpoint: GET /api/reminders/run?secret=CRON_SECRET */
export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  const expected = process.env.CRON_SECRET || "dev-cron";
  if (secret !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenants = await prisma.tenant.findMany({
    where: { status: "active" },
    include: { reminderSettings: true, settings: true },
  });

  let processed = 0;
  for (const tenant of tenants) {
    await carryForwardTasks(tenant.id);
    const digest = await buildMorningDigest(tenant.id);
    const phone =
      tenant.reminderSettings?.ownerPhone ?? tenant.settings?.phone ?? "owner";

    await sendReminderLog(tenant.id, "in_app", phone, digest.body);
    if (tenant.reminderSettings?.smsEnabled) {
      await sendReminderLog(tenant.id, "sms", phone, digest.body);
    }
    processed++;
  }

  return NextResponse.json({ ok: true, tenants: processed });
}
