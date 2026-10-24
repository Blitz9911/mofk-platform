import { lockScreenCopy } from "./notification-policy.mjs";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
const MAX_ATTEMPTS = 3;

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function sleep(ms, sleeper) {
  const wait = sleeper || ((delay) => new Promise((resolve) => setTimeout(resolve, delay)));
  await wait(ms);
}

export async function sendExpoPushMessages(messages, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const accessToken = options.accessToken ?? process.env.EXPO_ACCESS_TOKEN;
  if (!accessToken) {
    return { skipped: true, reason: "missing_expo_access_token", tickets: [] };
  }
  const sendEnabled = options.fetchImpl
    ? true
    : process.env.MFK_PUSH_SEND_ENABLED === "true" || process.env.MFK_PUSH_SEND_ENABLED === "1";
  if (!sendEnabled) {
    return { skipped: true, reason: "push_send_disabled", tickets: [] };
  }
  if (!messages.length) {
    return { skipped: false, tickets: [] };
  }

  const headers = {
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  const tickets = [];
  for (const batch of chunk(messages, 100)) {
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetchImpl(EXPO_PUSH_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(batch),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(`expo_http_${response.status}`);
          await sleep(250 * attempt, options.sleep);
          continue;
        }
        if (!response.ok) {
          return {
            skipped: false,
            tickets: batch.map((_, index) => ({
              index,
              status: "error",
              ticketId: null,
              errorMessage: payload?.errors?.[0]?.message || `expo_http_${response.status}`,
              invalid: false,
            })),
          };
        }
        const data = Array.isArray(payload.data) ? payload.data : [];
        tickets.push(...data);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        await sleep(250 * attempt, options.sleep);
      }
    }
    if (lastError) {
      tickets.push(
        ...batch.map(() => ({
          status: "error",
          message: lastError.message || "expo_network_error",
        })),
      );
    }
  }

  return { skipped: false, tickets };
}

export async function fetchExpoReceipts(ticketIds, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const accessToken = options.accessToken ?? process.env.EXPO_ACCESS_TOKEN;
  const ids = [...new Set((ticketIds || []).filter(Boolean))];
  if (!accessToken) {
    return { skipped: true, reason: "missing_expo_access_token", receipts: {} };
  }
  if (!ids.length) return { skipped: false, receipts: {} };
  const response = await fetchImpl(EXPO_RECEIPTS_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ids }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      skipped: false,
      receipts: {},
      error: payload?.errors?.[0]?.message || `expo_receipts_http_${response.status}`,
    };
  }
  return { skipped: false, receipts: payload.data && typeof payload.data === "object" ? payload.data : {} };
}

export function buildExpoMessage({ token, type, notificationId, actionUrl }) {
  const copy = lockScreenCopy(type);
  return {
    to: token,
    sound: "default",
    title: copy.title,
    body: copy.body,
    data: {
      notificationId,
      actionUrl: actionUrl || "/(tabs)",
      type,
    },
  };
}
