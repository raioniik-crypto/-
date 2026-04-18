const SUPABASE_URL = () => process.env.SUPABASE_URL;
const SERVICE_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers(): Record<string, string> {
  const key = SERVICE_KEY();
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

function rpcUrl(fn: string): string {
  const url = SUPABASE_URL();
  if (!url) throw new Error("SUPABASE_URL not set");
  return `${url}/rest/v1/rpc/${fn}`;
}

export interface AcquireLockResult {
  success: boolean;
  lock_id: string | null;
  existing_job_id: string | null;
  expires_at: string | null;
}

export async function acquireLock(
  scope: string,
  routineName: string,
  jobId: string,
  workerId: string,
  ttlSeconds: number
): Promise<AcquireLockResult> {
  const res = await fetch(rpcUrl("acquire_lock"), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      p_scope: scope,
      p_routine_name: routineName,
      p_job_id: jobId,
      p_worker_id: workerId,
      p_ttl_seconds: ttlSeconds,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`acquire_lock ${res.status}: ${body.slice(0, 200)}`);
  }

  const rows = (await res.json()) as Array<{
    success: boolean;
    lock_id: string;
    existing_job_id: string;
    expires_at: string;
  }>;
  const row = rows[0];
  if (!row) return { success: false, lock_id: null, existing_job_id: null, expires_at: null };
  return row;
}

export async function releaseLock(scope: string, jobId: string): Promise<boolean> {
  const res = await fetch(rpcUrl("release_lock"), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ p_scope: scope, p_job_id: jobId }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`release_lock ${res.status}: ${body.slice(0, 200)}`);
  }
  return true;
}

export async function checkLock(scope: string): Promise<unknown> {
  const res = await fetch(rpcUrl("check_lock"), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ p_scope: scope }),
  });
  if (!res.ok) return null;
  return res.json();
}
