import { mkdir, writeFile } from "node:fs/promises";

const queries = [
  "multi-tenant saas language:TypeScript",
  "workforce payroll shifts language:TypeScript",
  "audit ledger sha256 language:TypeScript",
  "typescript saas authorization rbac",
  "nodejs employee scheduling",
  "react payroll management",
  "express multi tenant",
  "drizzle orm typescript",
  "stripe subscriptions typescript",
  "audit trail typescript",
  "hash chain typescript",
  "timesheet payroll nodejs",
  "workforce management typescript",
  "calendar scheduling react typescript",
  "postgres row level security saas",
];
const headers = { "User-Agent": "aion-workforce-audit/1.0", Accept: "application/vnd.github+json" };

async function getJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function visitRepo(repo) {
  try {
    const response = await fetch(repo.htmlUrl, { headers: { "User-Agent": headers["User-Agent"] }, redirect: "follow" });
    return { ...repo, pageStatus: response.status, pageVisitedAt: new Date().toISOString() };
  } catch (error) {
    return { ...repo, pageStatus: 0, pageError: String(error), pageVisitedAt: new Date().toISOString() };
  }
}

const byName = new Map();
for (const query of queries) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=100&page=1&sort=stars&order=desc`;
  const result = await getJson(url);
  for (const item of result.items ?? []) {
    if (!byName.has(item.full_name)) {
      byName.set(item.full_name, {
        fullName: item.full_name,
        htmlUrl: item.html_url,
        apiUrl: item.url,
        description: item.description ?? "",
        language: item.language ?? "",
        stars: item.stargazers_count ?? 0,
        forks: item.forks_count ?? 0,
        archived: Boolean(item.archived),
        updatedAt: item.updated_at ?? "",
        topics: item.topics ?? [],
        searchQuery: query,
      });
    }
    if (byName.size >= 260) break;
  }
  if (byName.size >= 260) break;
}

const selected = [...byName.values()].slice(0, 200);
const visited = [];
for (let index = 0; index < selected.length; index += 8) {
  const batch = selected.slice(index, index + 8);
  visited.push(...await Promise.all(batch.map(visitRepo)));
}

await mkdir("audit-evidence", { recursive: true });
const csvEscape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const columns = ["fullName", "htmlUrl", "apiUrl", "description", "language", "stars", "forks", "archived", "updatedAt", "topics", "searchQuery", "pageStatus", "pageVisitedAt", "pageError"];
const csv = [columns.join(","), ...visited.map((repo) => columns.map((column) => csvEscape(Array.isArray(repo[column]) ? repo[column].join("|") : repo[column])).join(","))].join("\n");
await writeFile("audit-evidence/github-repositories.csv", `${csv}\n`);
await writeFile("audit-evidence/github-repositories.json", JSON.stringify({ generatedAt: new Date().toISOString(), requested: 200, visited: visited.length, queries, repositories: visited }, null, 2));
await writeFile("audit-evidence/github-corpus.md", `# GitHub corpus\n\nGenerated at ${new Date().toISOString()}. The audit requested 200 public repositories and recorded ${visited.length} repository page visits. Repositories were used as reference data only; no downloaded repository code was executed.\n\n| Query | Purpose |\n|---|---|\n| multi-tenant saas TypeScript | Tenant isolation, SaaS boundaries, authorization patterns |\n| workforce payroll shifts TypeScript | Scheduling and payroll domain patterns |\n| audit ledger sha256 TypeScript | Append-only audit and cryptographic integrity patterns |\n\nThe complete evidence is in [github-repositories.csv](./github-repositories.csv) and [github-repositories.json](./github-repositories.json).\n`);
console.log(JSON.stringify({ requested: 200, visited: visited.length, uniqueCandidates: byName.size }, null, 2));
