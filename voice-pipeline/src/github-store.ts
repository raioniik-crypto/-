// Minimal GitHub Contents API helpers for non-vault files (e.g. job ledger).
// Vault writes for voice memos stay in pipeline.ts.

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!token) throw new Error("GITHUB_TOKEN not set");
  if (!repo) throw new Error("GITHUB_REPO not set");
  return { token, repo, branch };
}

function encodeRepoPath(p: string): string {
  return p.split("/").map((s) => encodeURIComponent(s)).join("/");
}

export async function putFile(
  repoPath: string,
  content: string,
  message: string
): Promise<void> {
  const { token, repo, branch } = getConfig();
  const b64 = Buffer.from(content, "utf-8").toString("base64");
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${encodeRepoPath(repoPath)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, content: b64, branch }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub PUT ${res.status}: ${body.slice(0, 200)}`);
  }
}

/** Returns file content as UTF-8 string, or null if not found (404). */
export async function getFile(repoPath: string): Promise<string | null> {
  const { token, repo, branch } = getConfig();
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${encodeRepoPath(repoPath)}?ref=${encodeURIComponent(branch)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub GET ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { content?: string; encoding?: string };
  if (!data.content || data.encoding !== "base64") {
    throw new Error(`GitHub GET: unexpected payload (encoding=${data.encoding})`);
  }
  return Buffer.from(data.content, "base64").toString("utf-8");
}

/** Delete a file. Returns true if deleted, false if not found. */
export async function deleteFile(
  repoPath: string,
  message: string
): Promise<boolean> {
  const { token, repo, branch } = getConfig();
  // Need the file's sha to delete it
  const metaRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${encodeRepoPath(repoPath)}?ref=${encodeURIComponent(branch)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
  if (metaRes.status === 404) return false;
  if (!metaRes.ok) {
    const body = await metaRes.text();
    throw new Error(`GitHub GET (for delete) ${metaRes.status}: ${body.slice(0, 200)}`);
  }
  const meta = (await metaRes.json()) as { sha?: string };
  if (!meta.sha) throw new Error("GitHub GET: no sha in response");

  const delRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${encodeRepoPath(repoPath)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, sha: meta.sha, branch }),
    }
  );
  if (!delRes.ok) {
    const body = await delRes.text();
    throw new Error(`GitHub DELETE ${delRes.status}: ${body.slice(0, 200)}`);
  }
  return true;
}

/** List file names in a directory. Returns empty array if dir not found. */
export async function listDir(repoPath: string): Promise<string[]> {
  const { token, repo, branch } = getConfig();
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${encodeRepoPath(repoPath)}?ref=${encodeURIComponent(branch)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
  if (res.status === 404) return [];
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub LIST ${res.status}: ${body.slice(0, 200)}`);
  }
  const items = (await res.json()) as Array<{ name: string; type: string }>;
  if (!Array.isArray(items)) return [];
  return items.filter((i) => i.type === "file").map((i) => i.name);
}
