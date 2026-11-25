// Checks an editor target's highlighting against the TextMate oracle.
//
//   node ark/editor-conformance/highlighting/check.ts --target <name> --actual <dir> [--code] [--write-differences]
//
// `<dir>` holds one `<fixture>.json` per corpus file, shaped like the
// expected files but listing only the characters the target's ArkType support
// styles (its own layer, not the host's). For every character the oracle
// covers:
//
// - where the extension changes the color (`category` != `baseCategory`), the
//   target must style it with `category`
// - elsewhere the target must leave it to the host, or style it the same
//
// The `text` region (host strings and comments) is always checked; `--code`
// also checks the oracle's `code` spans and flags anything the target styles
// outside the oracle's spans. Every mismatch must be listed, with a reason,
// in differences/<target>.json, and every listed difference must still occur.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { formatFor } from "../format.ts"
import { toCharMap, type HighlightFixture, type Span } from "./spans.ts"

const here = new URL("./", import.meta.url)

export type Difference = {
	fixture: string
	line: number
	column: number
	length: number
	text: string
	expected: string
	actual: string
	reason: string
}

export type Skip = { fixture: string; reason: string }

export type DifferencesFile = {
	/** fixtures the target can't run, so isn't checked on */
	skipped: Skip[]
	differences: Difference[]
}

export type CheckResult = {
	/** fixtures with no output and no listed skip */
	missing: string[]
	/** listed skips the target now has output for */
	staleSkips: Skip[]

	/** mismatches no difference lists */
	unexpected: Difference[]
	/** listed differences that no longer occur */
	stale: Difference[]
	/** listed differences without a reason */
	unexplained: Difference[]
	/** every mismatch found, listed or not */
	mismatches: Difference[]
}

export const readExpected = (): Map<string, HighlightFixture> => {
	const dir = new URL("expected/", here)
	const fixtures = new Map<string, HighlightFixture>()
	for (const file of readdirSync(dir)) {
		if (file.startsWith("_")) continue
		fixtures.set(
			file.replace(/\.json$/, ""),
			JSON.parse(readFileSync(new URL(file, dir), "utf8"))
		)
	}
	return fixtures
}

export const readSource = (fixture: string): string =>
	readFileSync(new URL(`corpus/${fixture}`, here), "utf8")

export const differencesPath = (target: string): URL =>
	new URL(`differences/${target}.json`, here)

export const readDifferences = (target: string): DifferencesFile =>
	existsSync(differencesPath(target)) ?
		JSON.parse(readFileSync(differencesPath(target), "utf8"))
	:	{ skipped: [], differences: [] }

const key = (d: Omit<Difference, "reason" | "text">) =>
	`${d.fixture}:${d.line}:${d.column}:${d.length}:${d.expected}:${d.actual}`

const none = "(host)"

/** Mismatches for one fixture, merged into runs on a line. */
export const compareFixture = (
	fixture: string,
	expected: HighlightFixture,
	actual: Span[],
	options: { code?: boolean } = {}
): Omit<Difference, "reason">[] => {
	const lines = readSource(fixture).split("\n")
	const expectedChars = toCharMap(expected.spans)
	const actualChars = toCharMap(actual)
	const chars: Omit<Difference, "reason">[] = []
	const push = (line: number, column: number, exp: string, act: string) =>
		chars.push({
			fixture,
			line,
			column,
			length: 1,
			text: lines[line][column],
			expected: exp,
			actual: act
		})

	for (const [at, span] of expectedChars) {
		if (span.region === "code" && !options.code) continue
		const [line, column] = at.split(":").map(Number)
		const actualCategory = actualChars.get(at)?.category
		const changed = span.category !== span.baseCategory
		if (
			changed ?
				actualCategory !== span.category
			:	actualCategory !== undefined && actualCategory !== span.category
		)
			push(line, column, changed ? span.category : none, actualCategory ?? none)
	}
	if (options.code) {
		for (const [at, span] of actualChars) {
			if (expectedChars.has(at)) continue
			const [line, column] = at.split(":").map(Number)
			if (/\s/.test(lines[line]?.[column] ?? " ")) continue
			push(line, column, none, span.category)
		}
	}

	chars.sort((a, b) => a.line - b.line || a.column - b.column)
	const runs: Omit<Difference, "reason">[] = []
	for (const char of chars) {
		const last = runs[runs.length - 1]
		if (
			last &&
			last.line === char.line &&
			last.column + last.length === char.column &&
			last.expected === char.expected &&
			last.actual === char.actual
		) {
			last.length++
			last.text += char.text
		} else runs.push({ ...char })
	}
	return runs
}

export const checkTarget = (
	target: string,
	actual: Map<string, Span[]>,
	options: { code?: boolean } = {}
): CheckResult => {
	const { skipped, differences: listed } = readDifferences(target)
	const listedKeys = new Map(listed.map(d => [key(d), d]))
	const mismatches: Difference[] = []
	const missing: string[] = []
	for (const [fixture, expected] of readExpected()) {
		const spans = actual.get(fixture)
		if (!spans) {
			if (!skipped.some(s => s.fixture === fixture)) missing.push(fixture)
			continue
		}
		for (const m of compareFixture(fixture, expected, spans, options))
			mismatches.push({ ...m, reason: listedKeys.get(key(m))?.reason ?? "" })
	}
	const found = new Set(mismatches.map(key))
	return {
		missing,
		staleSkips: skipped.filter(s => actual.has(s.fixture)),
		mismatches,
		unexpected: mismatches.filter(m => !listedKeys.has(key(m))),
		stale: listed.filter(d => !found.has(key(d))),
		unexplained: listed.filter(d => !d.reason.trim())
	}
}

export const formatDifference = (d: Difference): string =>
	`${d.fixture}:${d.line + 1}:${d.column + 1} ${JSON.stringify(d.text)} expected ${d.expected}, got ${d.actual}${d.reason ? ` (${d.reason})` : ""}`

/** Writes the current mismatches as the target's differences, keeping existing reasons. */
export const writeDifferences = async (
	target: string,
	result: CheckResult
): Promise<void> => {
	const differences = [...result.mismatches].sort(
		(a, b) =>
			a.fixture.localeCompare(b.fixture) ||
			a.line - b.line ||
			a.column - b.column
	)
	const { skipped } = readDifferences(target)
	const path = differencesPath(target)
	writeFileSync(
		path,
		await formatFor(path, JSON.stringify({ skipped, differences }))
	)
}

export const readActualDir = (dir: string): Map<string, Span[]> => {
	const actual = new Map<string, Span[]>()
	for (const file of readdirSync(dir)) {
		if (file.endsWith(".json")) {
			actual.set(
				file.replace(/\.json$/, ""),
				JSON.parse(readFileSync(`${dir}/${file}`, "utf8")).spans
			)
		}
	}
	return actual
}

/** Prints a result and returns whether it passes. */
export const report = (target: string, result: CheckResult): boolean => {
	for (const d of result.unexpected)
		console.error(`unexpected: ${formatDifference(d)}`)
	for (const d of result.stale)
		console.error(`stale (no longer differs): ${formatDifference(d)}`)
	for (const d of result.unexplained)
		console.error(`no reason given: ${formatDifference(d)}`)
	for (const fixture of result.missing)
		console.error(`no output, and not listed as skipped: ${fixture}`)
	for (const s of result.staleSkips)
		console.error(`listed as skipped but has output: ${s.fixture}`)
	const ok =
		!result.unexpected.length &&
		!result.stale.length &&
		!result.unexplained.length &&
		!result.missing.length &&
		!result.staleSkips.length
	console.log(
		`${target}: ${result.mismatches.length} known differences, ${result.unexpected.length} unexpected, ${result.stale.length} stale`
	)
	return ok
}

if (import.meta.main) {
	const args = process.argv.slice(2)
	const flag = (name: string) => {
		const i = args.indexOf(name)
		return i === -1 ? undefined : args[i + 1]
	}
	const target = flag("--target")
	const dir = flag("--actual")
	if (!target || !dir) {
		console.error(
			"usage: check.ts --target <name> --actual <dir> [--code] [--write-differences]"
		)
		process.exit(1)
	}
	const result = checkTarget(target, readActualDir(dir), {
		code: args.includes("--code")
	})
	if (args.includes("--write-differences"))
		await writeDifferences(target, result)
	else if (!report(target, result)) process.exit(1)
}
