#!/usr/bin/env node
/**
 * Deterministic release notes generator.
 *
 * Reads structured commit data (written by git log) and optional PR metadata
 * (written by the workflow's github-script step) and produces a fully-formatted
 * Markdown release note that follows the same structure as the Copilot-enhanced
 * version — minus the LLM-written summary paragraph, which is left as a
 * placeholder for the `copilot` CLI to fill in.
 *
 * Usage:
 *   node scripts/generate-release-notes.mjs \
 *     --version 1.2.3 \
 *     --commits-file git-commits.txt \
 *     --prs-file pr-data.json \
 *     --output release-notes-deterministic.md
 *
 * --prs-file is optional. When absent (or when a commit has no PR entry),
 * the PR link and author @login are omitted gracefully.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

// ── Main (only runs when executed directly, not when imported by tests) ──────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values: args } = parseArgs({
    options: {
      version: { type: "string" },
      "commits-file": { type: "string" },
      "prs-file": { type: "string" },
      output: { type: "string" },
    },
  });

  const version = args["version"];
  const commitsFile = args["commits-file"];
  const prsFile = args["prs-file"];
  const outputFile = args["output"];

  if (!version || !commitsFile || !outputFile) {
    console.error(
      "Usage: node generate-release-notes.mjs --version <v> --commits-file <path> --output <path> [--prs-file <path>]",
    );
    process.exit(1);
  }

  const rawCommits = readFileSync(commitsFile, "utf8");
  const commits = parseCommits(rawCommits);

  /** @type {Map<string, { number: number, url: string, login: string | null }>} */
  const prBySha = new Map();
  if (prsFile) {
    try {
      const prData = JSON.parse(readFileSync(prsFile, "utf8"));
      for (const [sha, pr] of Object.entries(prData)) {
        if (pr) prBySha.set(sha, pr);
      }
    } catch {
      // PR data is best-effort; missing file or parse error is non-fatal.
    }
  }

  // Exclude bump commits and commits authored by github-actions[bot]
  const filteredCommits = commits.filter((c) => !isGithubActionsBot(c));
  const excludedCount = commits.reduce(
    (acc, c) => (acc + isGithubActionsBot(c) ? 1 : 0),
    0,
  );
  const output = generateReleaseNotes(version, filteredCommits, prBySha);
  writeFileSync(outputFile, output, "utf8");
  console.log(
    `✔ Deterministic release notes written to ${outputFile} (${filteredCommits.length} commit(s) included, ${excludedCount} excluded as github-actions[bot])`,
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parses the structured git log output (records separated by 0x1E, fields by
 * 0x1F) produced by:
 *   git log --format="%H%x1f%s%x1f%b%x1f%an%x1f%ae%x1e"
 *
 * @param {string} raw
 * @returns {{ sha: string, subject: string, body: string, authorName: string, authorEmail: string }[]}
 */
export function parseCommits(raw) {
  return raw
    .split("\x1e")
    .filter((r) => r.trim())
    .map((r) => {
      const [
        sha = "",
        subject = "",
        body = "",
        authorName = "",
        authorEmail = "",
      ] = r.split("\x1f");
      return {
        sha: sha.trim(),
        subject: subject.trim(),
        body: body.trim(),
        authorName: authorName.trim(),
        authorEmail: authorEmail.trim(),
      };
    })
    .filter((c) => c.sha.length === 40);
}

/**
 * Maps a conventional commit type to the prefix symbol used in the changelog.
 *
 * @param {string} type
 * @returns {string}
 */
export function typeToPrefix(type) {
  switch (type) {
    case "feat":
      return "✦";
    case "fix":
      return "✔";
    case "refactor":
      return "↻";
    case "perf":
      return "⇧";
    case "security":
      return "⛨";
    case "docs":
      return "¶";
    case "chore":
    case "build":
    case "ci":
    case "deps":
    case "tooling":
    case "test":
    case "style":
      return "⚙";
    default:
      return "⚙";
  }
}

/**
 * Parses a conventional commit subject line.
 *
 * Returns `{ type, scope, description }` on success, or `null` when the
 * subject does not match the `type(scope): description` pattern.
 *
 * @param {string} subject
 * @returns {{ type: string, scope: string | null, description: string } | null}
 */
export function parseConventionalSubject(subject) {
  const match = subject.match(/^([a-z]+)(?:\(([^)]+)\))?!?:\s*(.+)$/);
  if (!match) return null;
  return {
    type: match[1],
    scope: match[2] ?? null,
    description: match[3],
  };
}

export function isGithubActionsBot(commit) {
  const name = (commit.authorName || "").toLowerCase();
  const email = (commit.authorEmail || "").toLowerCase();
  // Match author name like 'github-actions[bot]' or email containing 'github-actions'
  if (/github-actions(?:\[bot\])?/.test(name)) return true;
  if (email.includes("github-actions")) return true;
  return false;
}

/**
 * Builds a single bullet line for the Changes section.
 *
 * The description is always wrapped in a code span. When the description
 * itself contains backticks, double-backtick code spans are used to avoid
 * breaking the Markdown rendering.
 *
 * @param {string} prefix  Symbol (e.g. "✦")
 * @param {string | null} scope  Scope from the commit (e.g. "sdk") or null
 * @param {string} description  The human-readable change description
 * @param {{ number: number, url: string, login: string | null } | null} pr
 * @param {string} authorName
 * @returns {string}
 */
export function buildChangeLine(prefix, scope, description, pr, authorName) {
  // Escape description for code-span: use double backticks when description
  // contains backticks, otherwise single backticks.
  const needsDouble = description.includes("`");
  const tick = needsDouble ? "``" : "`";
  const scopePart = scope ? ` ❲${scope}❳:` : "";
  const inner = `${prefix}${scopePart} ${description}`;
  const codeSpan = `${tick}${inner}${tick}`;

  const prPart = pr
    ? ` ([#${pr.number}](${pr.url})${pr.login ? ` by [@${pr.login}](https://github.com/${pr.login})` : ""})`
    : "";

  return `- ${codeSpan}${prPart}`;
}

/**
 * Builds the `### ◈ Contributors` section from a list of contributors.
 *
 * @param {{ login: string | null, name: string, prs: { number: number, url: string }[] }[]} contributors
 * @returns {string}
 */
export function buildContributorsSection(contributors) {
  if (contributors.length === 0) return "";

  const lines = contributors.map((c) => {
    const handle = c.login
      ? `[@${c.login}](https://github.com/${c.login})`
      : c.name;
    const prLinks = c.prs.map((p) => `[#${p.number}](${p.url})`).join(", ");
    return `- ${handle}${prLinks ? ` (${prLinks})` : ""}`;
  });

  return [
    "### ◈ Contributors",
    "",
    "Thanks to all the contributors to this release:",
    "",
    ...lines,
  ].join("\n");
}

// ── Core generation ─────────────────────────────────────────────────────────

/**
 * Generates a deterministic Markdown release note from commit and PR data.
 *
 * The LLM-written summary paragraph is replaced by a placeholder comment so
 * the `copilot` CLI knows where to inject the polished text.
 *
 * @param {string} version  Version string without leading "v" (e.g. "1.2.3")
 * @param {ReturnType<typeof parseCommits>} commits
 * @param {Map<string, { number: number, url: string, login: string | null }>} prBySha
 * @returns {string}
 */
export function generateReleaseNotes(version, commits, prBySha) {
  if (commits.length === 0) {
    return `## What's new in v${version}\n\nNo changes recorded.\n`;
  }

  // ── Build change lines ───────────────────────────────────────────────────
  const changeLines = [];
  for (const commit of commits) {
    const parsed = parseConventionalSubject(commit.subject);
    const pr = prBySha.get(commit.sha) ?? null;

    if (parsed) {
      const prefix = typeToPrefix(parsed.type);
      changeLines.push(
        buildChangeLine(
          prefix,
          parsed.scope,
          parsed.description,
          pr,
          commit.authorName,
        ),
      );
    } else {
      // Non-conventional commit: treat as tooling
      changeLines.push(
        buildChangeLine("⚙", null, commit.subject, pr, commit.authorName),
      );
    }
  }

  // ── Build contributors map ────────────────────────────────────────────────
  // Keyed by login (preferred) or authorName. PRs are deduplicated.
  const contribMap = new Map();
  for (const commit of commits) {
    const pr = prBySha.get(commit.sha) ?? null;
    const key = pr?.login ?? commit.authorName;
    if (!contribMap.has(key)) {
      contribMap.set(key, {
        login: pr?.login ?? null,
        name: commit.authorName,
        prs: [],
      });
    }
    if (pr) {
      const existing = contribMap.get(key);
      if (!existing.prs.some((p) => p.number === pr.number)) {
        existing.prs.push({ number: pr.number, url: pr.url });
      }
    }
  }
  const contributors = [...contribMap.values()];

  // ── Assemble ─────────────────────────────────────────────────────────────
  const sections = [
    `## What's new in v${version}`,
    "",
    // Placeholder for the LLM summary paragraph. The copilot CLI is instructed
    // to replace this with a proper 2–4 sentence summary.
    "<!-- SUMMARY_PLACEHOLDER: Replace this comment with a concise 2–4 sentence summary of the most important user-facing changes. -->",
    "",
    "### ▸ Changes",
    "",
    ...changeLines,
  ];

  if (contributors.length > 0) {
    sections.push("", buildContributorsSection(contributors));
  }

  return sections.join("\n");
}
