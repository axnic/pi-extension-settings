import { describe, expect, it } from "vitest";
import {
  buildChangeLine,
  buildContributorsSection,
  generateReleaseNotes,
  parseCommits,
  parseConventionalSubject,
  typeToPrefix,
} from "./generate-release-notes.mjs";

// ── parseCommits ─────────────────────────────────────────────────────────────

describe("parseCommits", () => {
  it("parses a single well-formed record", () => {
    const sha = "a".repeat(40);
    const raw = `${sha}\x1ffeat(sdk): Add thing\x1fBody text\x1fAlice\x1falice@example.com\x1e`;
    const commits = parseCommits(raw);
    expect(commits).toHaveLength(1);
    expect(commits[0]).toMatchObject({
      sha,
      subject: "feat(sdk): Add thing",
      body: "Body text",
      authorName: "Alice",
      authorEmail: "alice@example.com",
    });
  });

  it("parses multiple records", () => {
    const sha1 = "a".repeat(40);
    const sha2 = "b".repeat(40);
    const raw = `${sha1}\x1ffeat(sdk): A\x1f\x1fAlice\x1falice@x.com\x1e${sha2}\x1ffix(ui): B\x1f\x1fBob\x1fbob@x.com\x1e`;
    expect(parseCommits(raw)).toHaveLength(2);
  });

  it("filters out records with invalid sha length", () => {
    const raw = `short\x1fsubject\x1f\x1fAuthor\x1femail\x1e`;
    expect(parseCommits(raw)).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    expect(parseCommits("")).toHaveLength(0);
  });

  it("trims whitespace around fields", () => {
    const sha = "c".repeat(40);
    const raw = `  ${sha}  \x1f  subject  \x1f  body  \x1f  Name  \x1f  email  \x1e`;
    const [c] = parseCommits(raw);
    expect(c.sha).toBe(sha);
    expect(c.subject).toBe("subject");
    expect(c.body).toBe("body");
  });
});

// ── typeToPrefix ─────────────────────────────────────────────────────────────

describe("typeToPrefix", () => {
  it.each([
    ["feat", "✦"],
    ["fix", "✔"],
    ["refactor", "↻"],
    ["perf", "⇧"],
    ["security", "⛨"],
    ["docs", "¶"],
    ["chore", "⚙"],
    ["build", "⚙"],
    ["ci", "⚙"],
    ["deps", "⚙"],
    ["tooling", "⚙"],
    ["test", "⚙"],
    ["style", "⚙"],
    ["unknown", "⚙"],
  ])("maps %s → %s", (type, expected) => {
    expect(typeToPrefix(type)).toBe(expected);
  });
});

// ── parseConventionalSubject ──────────────────────────────────────────────────

describe("parseConventionalSubject", () => {
  it("parses type + scope + description", () => {
    expect(
      parseConventionalSubject("feat(sdk): Add S.struct() builder"),
    ).toEqual({
      type: "feat",
      scope: "sdk",
      description: "Add S.struct() builder",
    });
  });

  it("parses type without scope", () => {
    expect(parseConventionalSubject("chore: Bump deps")).toEqual({
      type: "chore",
      scope: null,
      description: "Bump deps",
    });
  });

  it("handles breaking change marker", () => {
    const result = parseConventionalSubject("feat(core)!: Remove legacy API");
    expect(result?.type).toBe("feat");
    expect(result?.scope).toBe("core");
    expect(result?.description).toBe("Remove legacy API");
  });

  it("returns null for non-conventional subject", () => {
    expect(parseConventionalSubject("random commit message")).toBeNull();
  });
});

// ── buildChangeLine ───────────────────────────────────────────────────────────

describe("buildChangeLine", () => {
  it("builds a simple line without PR", () => {
    const line = buildChangeLine(
      "✔",
      "sdk",
      "Fix URL validator",
      null,
      "Alice",
    );
    expect(line).toBe("- `✔ **sdk**: Fix URL validator`");
  });

  it("includes PR link and author login when provided", () => {
    const pr = {
      number: 42,
      url: "https://github.com/x/y/pull/42",
      login: "alice",
    };
    const line = buildChangeLine("✦", "ui", "Add keyboard nav", pr, "Alice");
    expect(line).toContain("[#42](https://github.com/x/y/pull/42)");
    expect(line).toContain("[@alice](https://github.com/alice)");
  });

  it("uses double backticks when description contains backticks", () => {
    const line = buildChangeLine(
      "✦",
      "sdk",
      "Add `S.struct()` builder",
      null,
      "Alice",
    );
    expect(line).toMatch(/^- ``✦ \*\*sdk\*\*: Add `S\.struct\(\)` builder``$/);
  });

  it("omits scope part when scope is null", () => {
    const line = buildChangeLine(
      "⚙",
      null,
      "Bump TypeScript to 5.5",
      null,
      "Alice",
    );
    expect(line).toBe("- `⚙ Bump TypeScript to 5.5`");
  });

  it("includes PR link without login when login is null", () => {
    const pr = { number: 7, url: "https://github.com/x/y/pull/7", login: null };
    const line = buildChangeLine("✔", "core", "Fix registry", pr, "Alice");
    expect(line).toContain("[#7]");
    expect(line).not.toContain("@");
  });
});

// ── buildContributorsSection ──────────────────────────────────────────────────

describe("buildContributorsSection", () => {
  it("returns empty string when no contributors", () => {
    expect(buildContributorsSection([])).toBe("");
  });

  it("renders contributor with login and PRs", () => {
    const section = buildContributorsSection([
      {
        login: "alice",
        name: "Alice",
        prs: [
          { number: 1, url: "https://github.com/x/y/pull/1" },
          { number: 2, url: "https://github.com/x/y/pull/2" },
        ],
      },
    ]);
    expect(section).toContain("[@alice](https://github.com/alice)");
    expect(section).toContain("[#1]");
    expect(section).toContain("[#2]");
  });

  it("renders contributor without login using author name", () => {
    const section = buildContributorsSection([
      { login: null, name: "Bob Smith", prs: [] },
    ]);
    expect(section).toContain("Bob Smith");
    expect(section).not.toContain("@");
  });
});

// ── generateReleaseNotes ──────────────────────────────────────────────────────

describe("generateReleaseNotes", () => {
  const makeSha = (n) => String(n).padStart(40, "0");

  it("returns a minimal note when commits list is empty", () => {
    const result = generateReleaseNotes("1.0.0", [], new Map());
    expect(result).toContain("## What's new in v1.0.0");
    expect(result).toContain("No changes recorded.");
  });

  it("includes the version in the heading", () => {
    const commit = {
      sha: makeSha(1),
      subject: "feat(sdk): Add thing",
      body: "",
      authorName: "Alice",
      authorEmail: "alice@x.com",
    };
    const result = generateReleaseNotes("2.3.4", [commit], new Map());
    expect(result).toContain("## What's new in v2.3.4");
  });

  it("contains the summary placeholder", () => {
    const commit = {
      sha: makeSha(1),
      subject: "feat(sdk): Add thing",
      body: "",
      authorName: "Alice",
      authorEmail: "alice@x.com",
    };
    const result = generateReleaseNotes("1.0.0", [commit], new Map());
    expect(result).toContain("<!-- SUMMARY_PLACEHOLDER:");
  });

  it("includes the Changes section header", () => {
    const commit = {
      sha: makeSha(1),
      subject: "fix(core): Fix bug",
      body: "",
      authorName: "Bob",
      authorEmail: "bob@x.com",
    };
    const result = generateReleaseNotes("1.0.0", [commit], new Map());
    expect(result).toContain("### ▸ Changes");
  });

  it("maps conventional commit types to correct prefix symbols", () => {
    const commits = [
      {
        sha: makeSha(1),
        subject: "feat(sdk): New feature",
        body: "",
        authorName: "A",
        authorEmail: "",
      },
      {
        sha: makeSha(2),
        subject: "fix(ui): Bug fix",
        body: "",
        authorName: "A",
        authorEmail: "",
      },
      {
        sha: makeSha(3),
        subject: "docs(docs): Update readme",
        body: "",
        authorName: "A",
        authorEmail: "",
      },
      {
        sha: makeSha(4),
        subject: "chore(tooling): Bump deps",
        body: "",
        authorName: "A",
        authorEmail: "",
      },
    ];
    const result = generateReleaseNotes("1.0.0", commits, new Map());
    expect(result).toContain("✦");
    expect(result).toContain("✔");
    expect(result).toContain("¶");
    expect(result).toContain("⚙");
  });

  it("links PR numbers when PR data is provided", () => {
    const sha = makeSha(1);
    const commit = {
      sha,
      subject: "feat(sdk): Add thing",
      body: "",
      authorName: "Alice",
      authorEmail: "",
    };
    const prBySha = new Map([
      [
        sha,
        { number: 42, url: "https://github.com/x/y/pull/42", login: "alice" },
      ],
    ]);
    const result = generateReleaseNotes("1.0.0", [commit], prBySha);
    expect(result).toContain("[#42]");
    expect(result).toContain("[@alice]");
  });

  it("includes the Contributors section with unique contributors", () => {
    const sha1 = makeSha(1);
    const sha2 = makeSha(2);
    const commits = [
      {
        sha: sha1,
        subject: "feat(sdk): A",
        body: "",
        authorName: "Alice",
        authorEmail: "",
      },
      {
        sha: sha2,
        subject: "fix(ui): B",
        body: "",
        authorName: "Bob",
        authorEmail: "",
      },
    ];
    const prBySha = new Map([
      [
        sha1,
        { number: 1, url: "https://github.com/x/y/pull/1", login: "alice" },
      ],
      [sha2, { number: 2, url: "https://github.com/x/y/pull/2", login: "bob" }],
    ]);
    const result = generateReleaseNotes("1.0.0", commits, prBySha);
    expect(result).toContain("### ◈ Contributors");
    expect(result).toContain("[@alice]");
    expect(result).toContain("[@bob]");
  });

  it("deduplicates PR entries when same PR appears for multiple commits", () => {
    const sha1 = makeSha(1);
    const sha2 = makeSha(2);
    const commits = [
      {
        sha: sha1,
        subject: "feat(sdk): A",
        body: "",
        authorName: "Alice",
        authorEmail: "",
      },
      {
        sha: sha2,
        subject: "feat(sdk): B",
        body: "",
        authorName: "Alice",
        authorEmail: "",
      },
    ];
    // Both commits associated with the same PR
    const prBySha = new Map([
      [
        sha1,
        { number: 10, url: "https://github.com/x/y/pull/10", login: "alice" },
      ],
      [
        sha2,
        { number: 10, url: "https://github.com/x/y/pull/10", login: "alice" },
      ],
    ]);
    const result = generateReleaseNotes("1.0.0", commits, prBySha);
    // PR #10 should appear only once in the contributors section
    const contributorsSection = result.split("### ◈ Contributors")[1];
    const occurrences = (contributorsSection.match(/\[#10\]/g) || []).length;
    expect(occurrences).toBe(1);
  });

  it("handles non-conventional commit subjects gracefully", () => {
    const commit = {
      sha: makeSha(1),
      subject: "fix some random thing without conventional format",
      body: "",
      authorName: "Alice",
      authorEmail: "",
    };
    const result = generateReleaseNotes("1.0.0", [commit], new Map());
    expect(result).toContain("⚙");
    expect(result).toContain(
      "fix some random thing without conventional format",
    );
  });
});
