// SMS provider abstraction with multi-provider fallback.
// Order: primary (env SMS_PROVIDER, default "twilio"), then any others that have credentials.
// Swap the implementation file or add a new provider object to plug a different gateway.
// SECURITY: server-only. Never import from browser code.

export interface SmsResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface SmsProvider {
  name: string;
  isConfigured(): boolean;
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
    const data = (await res.json()) as { sid?: string; message?: string };
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
  isConfigured: () =>
    Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
  send: sendViaTwilio,
};

// Sends a single SMS through Africa's Talking REST API.
// Reads AT_USERNAME, AT_API_KEY, AT_FROM (optional sender ID) from env.
// Useful as a fallback in West/East Africa when Twilio is rate-limited or down.
async function sendViaAfricasTalking(to: string, body: string): Promise<SmsResult> {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  const from = process.env.AT_FROM;
  if (!username || !apiKey) {
    return { success: false, error: "Africa's Talking env vars missing" };
  }
  const url =
    username === "sandbox"
      ? "https://api.sandbox.africastalking.com/version1/messaging"
      : "https://api.africastalking.com/version1/messaging";
  try {
    const params = new URLSearchParams({ username, to, message: body });
    if (from) params.set("from", from);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });
    const data = (await res.json()) as {
      SMSMessageData?: { Recipients?: { messageId?: string; status?: string; statusCode?: number }[] };
    };
    const recipient = data.SMSMessageData?.Recipients?.[0];
    if (!res.ok || !recipient || (recipient.statusCode && recipient.statusCode >= 400)) {
      return { success: false, error: `AT ${res.status}: ${recipient?.status ?? "unknown"}` };
    }
    return { success: true, providerMessageId: recipient.messageId };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export const africasTalkingProvider: SmsProvider = {
  name: "africastalking",
  isConfigured: () => Boolean(process.env.AT_USERNAME && process.env.AT_API_KEY),
  send: sendViaAfricasTalking,
};

const ALL_PROVIDERS: SmsProvider[] = [twilioProvider, africasTalkingProvider];

// Returns providers in the order they should be attempted.
// Honors SMS_PROVIDER env (e.g. "twilio" or "africastalking") for the primary.
export function getSmsProviders(): SmsProvider[] {
  const primaryName = (process.env.SMS_PROVIDER ?? "twilio").toLowerCase();
  const ordered = [...ALL_PROVIDERS].sort((a) => (a.name === primaryName ? -1 : 1));
  return ordered.filter((p) => p.isConfigured());
}

// Single-call helper: tries each configured provider until one succeeds.
// Returns the last error if all fail, with `provider` set to the one used (or the last attempted).
export async function sendSmsWithFallback(
  to: string,
  body: string,
): Promise<SmsResult & { provider: string }> {
  const providers = getSmsProviders();
  if (providers.length === 0) {
    return { success: false, error: "No SMS provider configured", provider: "none" };
  }
  let last: SmsResult & { provider: string } = { success: false, error: "no attempt", provider: providers[0].name };
  for (const p of providers) {
    const r = await p.send(to, body);
    last = { ...r, provider: p.name };
    if (r.success) return last;
  }
  return last;
}

// Backward-compat shim. New code should use sendSmsWithFallback().
export function getSmsProvider(): SmsProvider {
  return getSmsProviders()[0] ?? twilioProvider;
}
