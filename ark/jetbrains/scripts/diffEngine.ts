import { execFileSync } from "node:child_process"
import {
	copyFileSync,
	createReadStream,
	existsSync,
	mkdtempSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { extname, join, resolve } from "node:path"
import { createInterface } from "node:readline"
import {
	createOracle,
	defaultGrammarDir,
	dumpFile,
	parseVariants,
	type DumpedFile
} from "./dumpTokens.ts"

// Tokenizes files with both the Kotlin engine (core's DumpTokens.kt, through
// Gradle) and the vscode-textmate oracle (dumpTokens.ts), and prints every
// line whose tokens differ. Exits 1 on any difference.
//
// node ./scripts/diffEngine.ts [--ark true|false|both] [--max n] [files...]
//
// Without files, it compares every git-tracked source file the plugin
// highlights, the editor conformance corpus and core's test samples. Extra
// Gradle arguments go in JETBRAINS_GRADLE_ARGS.

const jetbrainsDir = resolve(import.meta.dirname, "..")
const repoRoot = resolve(jetbrainsDir, "../..")

const extensions = [
	".ts",
	".tsx",
	".js",
	".jsx",
	".md",
	".mdx",
	".vue",
	".svelte",
	".astro"
]

const maxFileSize = 1024 * 1024

const corpusDir = join(repoRoot, "ark/editor-conformance/highlighting/corpus")

const samplesDir = join(jetbrainsDir, "core/src/test/resources/samples")

const listDir = (dir: string): string[] =>
	existsSync(dir) ?
		readdirSync(dir, { recursive: true, withFileTypes: true })
			.filter(entry => entry.isFile())
			.map(entry => join(entry.parentPath, entry.name))
	:	[]

const defaultFiles = (): string[] => {
	const tracked = execFileSync("git", ["ls-files", "-z"], {
		cwd: repoRoot,
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024
	})
		.split("\0")
		.filter(
			path =>
				path &&
				extensions.includes(extname(path)) &&
				!path.split("/").includes("node_modules")
		)
		.map(path => join(repoRoot, path))
	const extra = [...listDir(corpusDir), ...listDir(samplesDir)]
	return [...new Set([...tracked, ...extra])].filter(
		path =>
			existsSync(path) &&
			extensions.includes(extname(path)) &&
			statSync(path).size <= maxFileSize
	)
}

const args = process.argv.slice(2)
let variants = [true, false]
let maxReported = 50
const files: string[] = []
for (let i = 0; i < args.length; i++) {
	if (args[i] === "--ark") variants = parseVariants(args[++i])
	else if (args[i] === "--max") maxReported = Number(args[++i])
	else files.push(resolve(args[i]))
}
if (!files.length) files.push(...defaultFiles())

const tempDir = mkdtempSync(join(tmpdir(), "ark-diff-engine-"))
try {
	// both engines read a snapshot, so files edited mid-run (the conformance
	// corpus grows while other threads work) can't differ between them
	const snapshots = files.map((path, i) => {
		const snapshot = join(tempDir, `${i}${extname(path)}`)
		copyFileSync(path, snapshot)
		return snapshot
	})
	const listFile = join(tempDir, "files.txt")
	const ourFile = join(tempDir, "kotlin.ndjson")
	writeFileSync(listFile, snapshots.join("\n"))
	const ark =
		variants.length === 2 ? "both"
		: variants[0] ? "true"
		: "false"
	console.log(`Tokenizing ${files.length} files with the Kotlin engine...`)
	const kotlinStart = Date.now()
	execFileSync(
		"./gradlew",
		[
			":core:dumpTokens",
			"-q",
			...(process.env.JETBRAINS_GRADLE_ARGS?.split(" ").filter(Boolean) ?? []),
			`--args=--out ${ourFile} --ark ${ark} @${listFile}`
		],
		{ cwd: jetbrainsDir, stdio: "inherit" }
	)
	const kotlinSeconds = (Date.now() - kotlinStart) / 1000

	console.log("Tokenizing them with the oracle...")
	const tokenize = await createOracle(defaultGrammarDir)

	let lines = 0
	let mismatchedLines = 0
	let mismatchedFiles = 0
	let reported = 0
	let record = 0
	const describe = (file: DumpedFile, line: number) =>
		JSON.stringify(
			(file.lines?.[line] ?? []).map(([start, end, scopes]) => [
				start,
				end,
				file.scopes![scopes].join(" ")
			])
		)
	const ours = createInterface({ input: createReadStream(ourFile) })
	for await (const json of ours) {
		const our: DumpedFile = JSON.parse(json)
		const index = Math.floor(record / variants.length)
		const path = files[index]
		const variant = variants[record % variants.length]
		record++
		const oracle = dumpFile(tokenize, snapshots[index], variant)
		const label = `${path.startsWith(repoRoot) ? path.slice(repoRoot.length + 1) : path}${variant ? "" : " (no ark)"}`
		if (oracle.error || our.error) {
			if (oracle.error !== our.error) {
				mismatchedFiles++
				mismatchedLines++
				if (reported++ < maxReported) {
					console.log(
						`\n${label}\n  oracle: ${oracle.error ?? "ok"}\n  ours:   ${our.error ?? "ok"}`
					)
				}
			}
			continue
		}
		const count = Math.max(oracle.lines!.length, our.lines!.length)
		let fileMismatched = false
		for (let line = 0; line < count; line++) {
			lines++
			const expected = describe(oracle, line)
			const actual = describe(our, line)
			if (expected === actual) continue
			mismatchedLines++
			fileMismatched = true
			if (reported++ < maxReported) {
				console.log(
					`\n${label}:${line + 1}\n  oracle: ${expected}\n  ours:   ${actual}`
				)
			}
		}
		if (fileMismatched) mismatchedFiles++
	}
	console.log(
		`\n${files.length} files (${variants.map(v => (v ? "ark" : "no ark")).join(", ")}), ${lines} lines compared: ${mismatchedLines} mismatched lines in ${mismatchedFiles} files. Kotlin engine (with Gradle startup) took ${kotlinSeconds}s.`
	)
	process.exitCode = mismatchedLines ? 1 : 0
} finally {
	rmSync(tempDir, { recursive: true, force: true })
}
