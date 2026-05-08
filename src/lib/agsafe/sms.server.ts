// SMS provider abstraction. Swap the implementation file to plug a different gateway.
// All provider implementations must accept (to, body) and return a normalized result.
// SECURITY: server-only. Never import from browser code.

export interface SmsResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface SmsProvider {
  name: string;
  send(to: string, body: string): Promise<SmsResult>;
}

// Sends a single SMS through Twilio's REST API using Basic auth.
// Reads TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER from env.
async function sendViaTwilio(to: string, body: string): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    return { success: false, error: "Twilio env vars missing" };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = btoa(`${sid}:${token}`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    });
    const data = await res.json() as { sid?: string; message?: string };
    if (!res.ok) {
      return { success: false, error: `Twilio ${res.status}: ${data.message ?? "unknown"}` };
    }
    return { success: true, providerMessageId: data.sid };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export const twilioProvider: SmsProvider = {
  name: "twilio",
  send: sendViaTwilio,
};

// Returns the active SMS provider. Future: read env / DB to choose.
export function getSmsProvider(): SmsProvider {
  return twilioProvider;
}
