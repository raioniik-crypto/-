import { execFile } from "child_process";
import { rm, mkdir } from "fs/promises";
import { existsSync } from "fs";

export function getWorkspacePath(jobId: string): string {
  return `/tmp/commander-work/${jobId}`;
}

export function buildAuthenticatedRepoUrl(repo: string, token: string): string {
  return `https://x-access-token:${token}@github.com/${repo}.git`;
}

function exec(cmd: string, args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`${cmd} ${args.join(" ")} failed: ${stderr || err.message}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export async function shallowClone(
  repo: string,
  targetPath: string,
  branch?: string,
  depth = 50
): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set");

  await mkdir(targetPath, { recursive: true });
  const url = buildAuthenticatedRepoUrl(repo, token);
  const args = ["clone", "--depth", String(depth)];
  if (branch) args.push("--branch", branch);
  args.push(url, targetPath);
  await exec("git", args);
}

export async function cleanupWorkspace(targetPath: string): Promise<void> {
  if (existsSync(targetPath)) {
    await rm(targetPath, { recursive: true, force: true });
  }
}

export async function currentCommitHash(cwd: string): Promise<string> {
  return exec("git", ["rev-parse", "HEAD"], cwd);
}
