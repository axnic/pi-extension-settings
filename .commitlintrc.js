/*
 * Copyright (C) 2024 Alexandre Nicolaie (xunleii@users.noreply.github.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ----------------------------------------------------------------------------
 */

/**
 * Allowed commit types, following the Conventional Commits convention.
 *
 * @see {@link https://www.conventionalcommits.org/}
 */
const types = [
	{
		value: "feat",
		name: "feat:      Introduce new features",
	},
	{
		value: "fix",
		name: "fix:       Fix a bug",
	},
	{
		value: "docs",
		name: "docs:      Documentation only changes",
	},
	{
		value: "style",
		name: "style:     Code style changes (formatting, no logic change)",
	},
	{
		value: "refactor",
		name: "refactor:  Code restructuring (no feature, no bug fix)",
	},
	{
		value: "perf",
		name: "perf:      Performance improvements",
	},
	{
		value: "test",
		name: "test:      Add or update tests",
	},
	{
		value: "build",
		name: "build:     Build system or external dependency changes",
	},
	{
		value: "ci",
		name: "ci:        CI/CD configuration changes",
	},
	{
		value: "chore",
		name: "chore:     Maintenance not touching src or tests",
	},
	{
		value: "revert",
		name: "revert:    Revert a previous commit",
	},
];

/**
 * Allowed commit scopes, matching the project's top-level code areas.
 */
const scopes = [
	{
		name: "sdk      - SDK library (sdk/)",
		value: "sdk",
	},
	{
		name: "ui       - TUI settings panel (src/ui/)",
		value: "ui",
	},
	{
		name: "core     - Core extension logic (src/core/)",
		value: "core",
	},
	{
		name: "settings - Own-settings schema (src/settings.ts)",
		value: "settings",
	},
	{
		name: "docs     - Documentation",
		value: "docs",
	},
	{
		name: "deps     - Dependency updates",
		value: "deps",
	},
	{
		name: "tooling  - Dev tooling (mise, biome, lefthook, commitlint, etc.)",
		value: "tooling",
	},
];

/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
	rules: {
		"body-full-stop": [0, "always", "."],
		"body-leading-blank": [2, "always"],
		"body-empty": [0, "always"],
		"body-max-length": [2, "always", "Infinity"],
		"body-max-line-length": [2, "always", 80],
		"body-min-length": [2, "always", 0],
		"body-case": [2, "always", "sentence-case"],
		// Footer is intentionally allowed — Co-authored-by trailers live here.
		"footer-leading-blank": [2, "always"],
		"footer-empty": [0, "always"],
		"footer-max-length": [2, "always", "Infinity"],
		"footer-max-line-length": [2, "always", 80],
		"footer-min-length": [2, "always", 0],
		// The header starts with a lowercase type, so header-case is disabled.
		"header-case": [0, "always"],
		"header-full-stop": [2, "never", "."],
		"header-max-length": [2, "always", 100],
		"header-min-length": [2, "always", 0],
		"header-trim": [2, "always"],
		"references-empty": [0, "never"],
		"scope-enum": [2, "always", scopes.map((scope) => scope.value)],
		"scope-case": [2, "always", "lower-case"],
		"scope-empty": [2, "never"],
		"scope-max-length": [2, "always", "Infinity"],
		"scope-min-length": [2, "always", 0],
		"subject-case": [2, "always", "sentence-case"],
		"subject-empty": [2, "never"],
		"subject-full-stop": [2, "never", "."],
		"subject-max-length": [2, "always", 100],
		"subject-min-length": [2, "always", 0],
		"subject-exclamation-mark": [0, "never"],
		"type-enum": [2, "always", types.map((type) => type.value)],
		"type-case": [2, "always", "lower-case"],
		"type-empty": [2, "never"],
		"type-max-length": [2, "always", "Infinity"],
		"type-min-length": [2, "always", 0],
	},
	parserPreset: {
		parserOpts: {
			// Matches: type(scope)!: Subject (#ref)
			headerPattern:
				/^(?<type>[a-z]+)(\((?<scope>[^()]+)\))?!?:\s(?<subject>(?:(?!#).)*(?:(?!\s).))(\s\(?(?<references>#\d*)\)?)?$/,
			breakingHeaderPattern:
				/^(?<type>[a-z]+)(\((?<scope>[^()]+)\))?!:\s(?<subject>(?:(?!#).)*(?:(?!\s).))(\s\(?(?<references>#\d*)\)?)?$/,
			headerCorrespondence: ["type", "scope", "subject", "references"],
		},
	},
	prompt: {
		allowBreakingChanges: ["feat", "fix", "refactor", "build"],
		allowCustomScopes: false,
		allowEmptyScopes: false,
		enableMultipleScopes: false,
		scopes: scopes,
		types: types,
		typesSearchValue: false,
		upperCaseSubject: true,
	},
};
