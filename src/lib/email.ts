import { Resend } from "resend";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getFromAddress() {
  return process.env.EMAIL_FROM ?? "MarblePro <onboarding@resend.dev>";
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendEmailWithRetry(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping send to", params.to);
    return { ok: false, error: "Email service not configured" };
  }

  let lastError = "Send failed";
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await resend.emails.send({
        from: getFromAddress(),
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      if (result.error) {
        lastError = result.error.message;
        if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      return { ok: true, id: result.data?.id };
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Send failed";
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  return { ok: false, error: lastError };
}

function invitationEmailHtml(params: {
  workspaceName: string;
  inviterName: string;
  roleName: string;
  inviteUrl: string;
  expiresAt: Date;
}) {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1c1917; max-width: 520px; margin: 0 auto; padding: 24px;">
  <p style="font-size: 20px; font-weight: 700; color: #9a6700; margin: 0 0 8px;">MarblePro</p>
  <h1 style="font-size: 22px; margin: 0 0 16px;">You've been invited</h1>
  <p><strong>${params.inviterName}</strong> invited you to join <strong>${params.workspaceName}</strong> as <strong style="text-transform: capitalize;">${params.roleName}</strong>.</p>
  <p style="margin: 24px 0;">
    <a href="${params.inviteUrl}" style="display: inline-block; background: #9a6700; color: #fffbeb; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Accept invitation</a>
  </p>
  <p style="font-size: 13px; color: #6b6560;">This link expires ${params.expiresAt.toLocaleDateString("en-IN", { dateStyle: "long" })}.</p>
  <p style="font-size: 12px; color: #a8a29e; margin-top: 32px;">If you didn't expect this email, you can ignore it.</p>
</body>
</html>`;
}

export async function sendInvitationEmail(params: {
  to: string;
  workspaceName: string;
  inviterName: string;
  roleName: string;
  token: string;
  expiresAt: Date;
}) {
  const inviteUrl = `${getAppUrl()}/accept-invite/${params.token}`;
  const roleLabel = params.roleName.replace(/_/g, " ");

  return sendEmailWithRetry({
    to: params.to,
    subject: `Join ${params.workspaceName} on MarblePro`,
    html: invitationEmailHtml({
      workspaceName: params.workspaceName,
      inviterName: params.inviterName,
      roleName: roleLabel,
      inviteUrl,
      expiresAt: params.expiresAt,
    }),
    text: [
      `${params.inviterName} invited you to join ${params.workspaceName} on MarblePro as ${roleLabel}.`,
      `Accept: ${inviteUrl}`,
      `Expires: ${params.expiresAt.toLocaleDateString("en-IN")}`,
    ].join("\n\n"),
  });
}
