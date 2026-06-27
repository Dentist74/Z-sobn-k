import { buildExpirySummary, summaryToText, summaryIsEmpty } from "@/lib/notifications";
import { isMailConfigured, sendNotificationMail } from "@/lib/mailer";

// Spouští se z cronu (např. 1× denně):
//   curl "https://app/api/cron/expiry-check?token=$CRON_SECRET&send=1"
// Chrání ho CRON_SECRET. Bez SMTP konfigurace jen vrátí souhrn (neodesílá).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET není nastaven – endpoint je vypnutý." },
      { status: 403 },
    );
  }
  if (searchParams.get("token") !== secret) {
    return new Response("Forbidden", { status: 403 });
  }

  const summary = await buildExpirySummary();
  const text = summaryToText(summary);
  const wantSend = searchParams.get("send") === "1";

  let sent = false;
  let mailError: string | null = null;
  if (wantSend && !summaryIsEmpty(summary) && isMailConfigured()) {
    try {
      await sendNotificationMail("Zásobník – denní souhrn", text);
      sent = true;
    } catch (e) {
      mailError = e instanceof Error ? e.message : "neznámá chyba";
    }
  }

  return Response.json({
    counts: {
      belowMin: summary.belowMin.length,
      expired: summary.expired.length,
      expiringSoon: summary.expiringSoon.length,
    },
    mailConfigured: isMailConfigured(),
    sent,
    mailError,
    text,
  });
}
