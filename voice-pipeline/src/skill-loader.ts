import * as fs from "fs";
import * as path from "path";

export interface SkillLoadResult {
  combinedPrompt: string;
  appliedSkillIds: string[];
}

interface SkillEntry {
  path: string;
  type: string;
  applies_to: string[];
  forbidden_for: string[];
  notes?: string;
}

interface SkillManifest {
  skills: Record<string, SkillEntry>;
  routines: Record<string, { skills: string[] }>;
}

function resolveSkillsDir(): string {
  // skills/ is at the repo root alongside src/
  return path.resolve(__dirname, "..", "skills");
}

function readManifest(): SkillManifest {
  const manifestPath = path.join(resolveSkillsDir(), "skill-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`skill-manifest.json not found at ${manifestPath}`);
  }
  const raw = fs.readFileSync(manifestPath, "utf-8");
  return JSON.parse(raw) as SkillManifest;
}

export function loadSkillsForRoutine(routineType: string): SkillLoadResult {
  const manifest = readManifest();
  const skillsDir = resolveSkillsDir();

  // Get skill ids for this routine from the routines map
  const routineEntry = manifest.routines[routineType];
  const candidateIds = routineEntry?.skills ?? [];

  if (candidateIds.length === 0) {
    return { combinedPrompt: "", appliedSkillIds: [] };
  }

  const appliedSkillIds: string[] = [];
  const parts: string[] = [];

  for (const skillId of candidateIds) {
    const skill = manifest.skills[skillId];
    if (!skill) {
      console.warn(`[skill-loader] Skill "${skillId}" referenced in routines.${routineType} but not defined in manifest`);
      continue;
    }

    // forbidden check
    if (skill.forbidden_for.includes(routineType)) {
      console.warn(`[skill-loader] Skill "${skillId}" is forbidden for ${routineType}, skipping`);
      continue;
    }

    // applies_to check (if non-empty, routine must be listed)
    if (skill.applies_to.length > 0 && !skill.applies_to.includes(routineType)) {
      console.warn(`[skill-loader] Skill "${skillId}" does not apply to ${routineType}, skipping`);
      continue;
    }

    // Read the skill file
    const filePath = path.join(skillsDir, skill.path);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Skill file not found: ${filePath} (skill_id: ${skillId})`);
    }
    const content = fs.readFileSync(filePath, "utf-8");

    parts.push(`### Skill: ${skillId}\n\n${content}`);
    appliedSkillIds.push(skillId);
  }

  if (parts.length === 0) {
    return { combinedPrompt: "", appliedSkillIds: [] };
  }

  const combinedPrompt = `\n\n## Loaded Skills\n\n${parts.join("\n\n---\n\n")}`;
  return { combinedPrompt, appliedSkillIds };
}
