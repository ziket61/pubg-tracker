/**
 * Pulls a subset of pubg/api-assets into public/assets via the GitHub Contents API.
 * Run with: npm run sync-assets
 *
 * Without GITHUB_TOKEN, GitHub limits unauthenticated requests to 60/hour.
 * Set GITHUB_TOKEN in .env.local to bump that to 5000/hour.
 */
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_ASSETS = join(ROOT, "public", "assets");
const PUBLIC_DICT = join(PUBLIC_ASSETS, "dictionaries");

const manifestPath = join(ROOT, "scripts", "asset-manifest.json");

interface Manifest {
  repo: string;
  branch: string;
  paths: string[];
  files: string[];
}

interface GhEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url: string | null;
  sha: string;
}

const token = process.env.GITHUB_TOKEN || "";
const headers: Record<string, string> = {
  "User-Agent": "pubg-tracker-sync",
  Accept: "application/vnd.github+json",
};
if (token) headers.Authorization = `Bearer ${token}`;

async function gh(repo: string, path: string, ref: string): Promise<GhEntry[]> {
  const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${ref}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub ${res.status} for ${path}: ${await res.text()}`);
  }
  const data = (await res.json()) as GhEntry | GhEntry[];
  return Array.isArray(data) ? data : [data];
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, buf);
}

async function loadManifestSha(): Promise<Record<string, string>> {
  const file = join(PUBLIC_ASSETS, ".manifest.json");
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(await readFile(file, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

async function saveManifestSha(map: Record<string, string>): Promise<void> {
  const file = join(PUBLIC_ASSETS, ".manifest.json");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(map, null, 2));
}

function localPathFor(remotePath: string): string {
  // Strip "Assets/" prefix → goes under public/assets/
  if (remotePath.startsWith("Assets/")) {
    return join(PUBLIC_ASSETS, remotePath.slice("Assets/".length));
  }
  // Dictionaries / root files → public/assets/dictionaries/
  if (remotePath.startsWith("Dictionaries/")) {
    return join(PUBLIC_DICT, remotePath.slice("Dictionaries/".length));
  }
  return join(PUBLIC_DICT, remotePath);
}

async function syncDir(
  repo: string,
  ref: string,
  remoteDir: string,
  shaMap: Record<string, string>,
  stats: { added: number; skipped: number; failed: number },
): Promise<void> {
  const entries = await gh(repo, remoteDir, ref);
  for (const entry of entries) {
    if (entry.type === "dir") {
      await syncDir(repo, ref, entry.path, shaMap, stats);
      continue;
    }
    if (entry.type !== "file" || !entry.download_url) continue;

    const dest = localPathFor(entry.path);
    if (shaMap[entry.path] === entry.sha && existsSync(dest)) {
      stats.skipped += 1;
      continue;
    }
    try {
      await downloadFile(entry.download_url, dest);
      shaMap[entry.path] = entry.sha;
      stats.added += 1;
    } catch (err) {
      stats.failed += 1;
      console.warn(`  ! failed: ${entry.path}: ${(err as Error).message}`);
    }
  }
}

async function syncFile(
  repo: string,
  ref: string,
  remotePath: string,
  shaMap: Record<string, string>,
  stats: { added: number; skipped: number; failed: number },
): Promise<void> {
  const list = await gh(repo, remotePath, ref);
  const entry = list[0];
  if (!entry || entry.type !== "file" || !entry.download_url) return;

  const dest = localPathFor(entry.path);
  if (shaMap[entry.path] === entry.sha && existsSync(dest)) {
    stats.skipped += 1;
    return;
  }
  try {
    await downloadFile(entry.download_url, dest);
    shaMap[entry.path] = entry.sha;
    stats.added += 1;
  } catch (err) {
    stats.failed += 1;
    console.warn(`  ! failed: ${remotePath}: ${(err as Error).message}`);
  }
}

async function main() {
  const manifest: Manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  console.log(`Syncing assets from ${manifest.repo}@${manifest.branch}`);
  if (!token) {
    console.log("(No GITHUB_TOKEN set — limited to 60 requests/hour)");
  }

  const shaMap = await loadManifestSha();
  const stats = { added: 0, skipped: 0, failed: 0 };

  for (const dir of manifest.paths) {
    console.log(`→ ${dir}`);
    try {
      await syncDir(manifest.repo, manifest.branch, dir, shaMap, stats);
    } catch (err) {
      console.error(`  ! ${dir}: ${(err as Error).message}`);
      stats.failed += 1;
    }
  }

  for (const file of manifest.files) {
    console.log(`→ ${file}`);
    try {
      await syncFile(manifest.repo, manifest.branch, file, shaMap, stats);
    } catch (err) {
      console.error(`  ! ${file}: ${(err as Error).message}`);
      stats.failed += 1;
    }
  }

  await saveManifestSha(shaMap);
  console.log(
    `\nDone. Added: ${stats.added}, skipped (cached): ${stats.skipped}, failed: ${stats.failed}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// quiet unused-import warning when stat-only runs
void stat;
