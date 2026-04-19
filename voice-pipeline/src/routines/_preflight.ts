import type { RepoCapabilityReport } from "../types";

const GITHUB_TOKEN = () => process.env.GITHUB_TOKEN;

async function githubFetch(
  path: string,
  opts?: { allowNotFound?: boolean }
): Promise<{ status: number; data: unknown | null }> {
  const token = GITHUB_TOKEN();
  if (!token) throw new Error("GITHUB_TOKEN not set");

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://api.github.com${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (res.status === 404 && opts?.allowNotFound) {
        return { status: 404, data: null };
      }
      if (res.ok) {
        return { status: res.status, data: await res.json() };
      }
      if (res.status >= 500 && attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      return { status: res.status, data: null };
    } catch {
      if (attempt >= 2) return { status: 0, data: null };
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  return { status: 0, data: null };
}

export async function probeBasicInfo(repo: string): Promise<{ default_branch: string; is_private: boolean }> {
  const { status, data } = await githubFetch(`/repos/${repo}`);
  if (status !== 200 || !data) throw new Error(`Failed to fetch repo info: ${status}`);
  const d = data as { default_branch: string; private: boolean };
  return { default_branch: d.default_branch, is_private: d.private };
}

export async function probeBranchProtection(
  repo: string,
  branch: string
): Promise<RepoCapabilityReport["branch_protection"]> {
  const { status, data } = await githubFetch(
    `/repos/${repo}/branches/${encodeURIComponent(branch)}/protection`,
    { allowNotFound: true }
  );
  if (status === 404) return { enabled: false, details: null };
  if (status !== 200) return { enabled: false, details: null };
  return { enabled: true, details: (data as Record<string, unknown>) ?? null };
}

export async function probeTokenPermission(
  repo: string
): Promise<RepoCapabilityReport["github_token"]> {
  const result: RepoCapabilityReport["github_token"] = {
    authenticated_user: null,
    can_read: false,
    can_write: false,
    can_create_pr: false,
    permission_level: "none",
  };

  const { status: userStatus, data: userData } = await githubFetch("/user");
  if (userStatus === 200 && userData) {
    result.authenticated_user = (userData as { login: string }).login;
  }

  if (!result.authenticated_user) return result;

  // Owner 自己判定: 個人 repo オーナーの場合、Collaborators API は
  // 不正確な "none" を返すため、自動的に admin 扱いとする
  const [owner] = repo.split("/");
  if (result.authenticated_user === owner) {
    result.permission_level = "admin (owner)";
    result.can_read = true;
    result.can_write = true;
    result.can_create_pr = true;
    return result;
  }

  const { status: permStatus, data: permData } = await githubFetch(
    `/repos/${repo}/collaborators/${encodeURIComponent(result.authenticated_user)}/permission`,
    { allowNotFound: true }
  );

  if (permStatus === 200 && permData) {
    const perm = (permData as { permission: string }).permission;
    result.permission_level = perm;
    result.can_read = ["read", "triage", "write", "maintain", "admin"].includes(perm);
    result.can_write = ["write", "maintain", "admin"].includes(perm);
    result.can_create_pr = result.can_write;
  } else {
    result.can_read = true; // if we got here, at least basic read worked
  }

  return result;
}

export async function probeProjectStructure(
  repo: string,
  ref: string
): Promise<RepoCapabilityReport["project"]> {
  const result: RepoCapabilityReport["project"] = {
    package_manager: "unknown",
    workspace_root: ".",
    is_monorepo: false,
    test_command: null,
    test_command_note: "not detected",
  };

  // Check package.json
  const { status: pkgStatus, data: pkgData } = await githubFetch(
    `/repos/${repo}/contents/package.json?ref=${encodeURIComponent(ref)}`,
    { allowNotFound: true }
  );

  if (pkgStatus === 200 && pkgData) {
    const content = Buffer.from(
      (pkgData as { content: string }).content,
      "base64"
    ).toString("utf-8");
    try {
      const pkg = JSON.parse(content) as {
        scripts?: Record<string, string>;
        workspaces?: unknown;
      };

      // Package manager detection
      const { status: lockNpm } = await githubFetch(
        `/repos/${repo}/contents/package-lock.json?ref=${encodeURIComponent(ref)}`,
        { allowNotFound: true }
      );
      const { status: lockYarn } = await githubFetch(
        `/repos/${repo}/contents/yarn.lock?ref=${encodeURIComponent(ref)}`,
        { allowNotFound: true }
      );
      const { status: lockPnpm } = await githubFetch(
        `/repos/${repo}/contents/pnpm-lock.yaml?ref=${encodeURIComponent(ref)}`,
        { allowNotFound: true }
      );

      if (lockPnpm === 200) result.package_manager = "pnpm";
      else if (lockYarn === 200) result.package_manager = "yarn";
      else if (lockNpm === 200) result.package_manager = "npm";
      else result.package_manager = "npm"; // default for package.json

      // Test command detection
      if (pkg.scripts?.["test:ci"]) {
        result.test_command = `npm run test:ci`;
        result.test_command_note = "detected from package.json scripts.test:ci";
      } else if (pkg.scripts?.test && pkg.scripts.test !== 'echo "Error: no test specified" && exit 1') {
        result.test_command = "npm test";
        result.test_command_note = "detected from package.json scripts.test";
      }

      // Monorepo check
      if (pkg.workspaces) {
        result.is_monorepo = true;
      }
    } catch { /* malformed package.json */ }
    return result;
  }

  // Check other project types
  const { status: pyStatus } = await githubFetch(
    `/repos/${repo}/contents/pyproject.toml?ref=${encodeURIComponent(ref)}`,
    { allowNotFound: true }
  );
  if (pyStatus === 200) {
    result.package_manager = "poetry";
    result.test_command_note = "Python project detected (pyproject.toml), test command not auto-detected";
    return result;
  }

  const { status: goStatus } = await githubFetch(
    `/repos/${repo}/contents/go.mod?ref=${encodeURIComponent(ref)}`,
    { allowNotFound: true }
  );
  if (goStatus === 200) {
    result.package_manager = "go_mod";
    result.test_command_note = "Go project detected (go.mod), test command not auto-detected";
    return result;
  }

  const { status: cargoStatus } = await githubFetch(
    `/repos/${repo}/contents/Cargo.toml?ref=${encodeURIComponent(ref)}`,
    { allowNotFound: true }
  );
  if (cargoStatus === 200) {
    result.package_manager = "cargo";
    result.test_command_note = "Rust project detected (Cargo.toml), test command not auto-detected";
    return result;
  }

  return result;
}

export async function runRepoCapabilityProbe(repo: string): Promise<RepoCapabilityReport> {
  const warnings: string[] = [];
  const checks_skipped: string[] = [];

  // Basic info
  const basic = await probeBasicInfo(repo);

  // Branch protection
  let branchProtection: RepoCapabilityReport["branch_protection"] = { enabled: false, details: null };
  try {
    branchProtection = await probeBranchProtection(repo, basic.default_branch);
  } catch {
    checks_skipped.push("branch_protection");
  }

  // Token permission
  let tokenPerm: RepoCapabilityReport["github_token"] = {
    authenticated_user: null, can_read: false, can_write: false, can_create_pr: false, permission_level: "none",
  };
  try {
    tokenPerm = await probeTokenPermission(repo);
  } catch {
    checks_skipped.push("token_permission");
  }

  if (!tokenPerm.can_write) {
    warnings.push("GITHUB_TOKEN does not have write permission — PR creation will fail");
  }

  // Project structure
  let project: RepoCapabilityReport["project"] = {
    package_manager: "unknown", workspace_root: ".", is_monorepo: false, test_command: null, test_command_note: "not checked",
  };
  try {
    project = await probeProjectStructure(repo, basic.default_branch);
  } catch {
    checks_skipped.push("project_structure");
  }

  if (project.is_monorepo) {
    warnings.push("Monorepo detected — workspace_root may need manual specification");
  }

  return {
    repo,
    default_branch: basic.default_branch,
    is_private: basic.is_private,
    probed_at: new Date().toISOString(),
    branch_protection: branchProtection,
    github_token: tokenPerm,
    project,
    forbidden_paths: [],
    warnings,
    checks_skipped,
  };
}
