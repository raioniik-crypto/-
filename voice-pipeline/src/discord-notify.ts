const WEBHOOK_URL = () => process.env.MORNING_SUMMARY_WEBHOOK_URL;

async function fetchWithRetry(url: string, opts: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(10000) });
      if (res.ok) return res;
      if (res.status >= 500 && attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      return res;
    } catch (err: unknown) {
      if (attempt >= maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  throw new Error("fetchWithRetry: exhausted retries");
}

export async function sendToDiscordWebhook(content: string): Promise<void> {
  const url = WEBHOOK_URL();
  if (!url) {
    console.warn("[discord-notify] MORNING_SUMMARY_WEBHOOK_URL not set, skipping Discord delivery");
    return;
  }

  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content.slice(0, 1990) }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Discord webhook ${res.status}: ${body.slice(0, 200)}`);
  }
}
