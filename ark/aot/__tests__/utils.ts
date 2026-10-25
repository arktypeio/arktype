import {
	precompileModule,
	Precompiler,
	renderDiagnostic,
	type ModuleAnalysis,
	type PrecompiledModule,
	type PrecompileHost,
	type PrecompileOptions
} from "@ark/aot"
import { fromHere } from "@ark/fs"
import { hasArkKind } from "@ark/schema"
import { spawnSync } from "node:child_process"
import {
	mkdirSync,
	mkdtempSync,
	realpathSync,
	rmSync,
	writeFileSync
} from "node:fs"
import type { Plugin } from "esbuild"
import { tmpdir } from "node:os"
import { dirname, join, posix } from "node:path"

const issuesPath = fromHere("..", "..", "schema", "shared", "issues.ts")

// an issues module for issues.ts, as each copy of @ark/schema/runtime bundles its own
export const issuesFrom = (file: string): Plugin => ({
	name: file,
	setup: pluginBuild =>
		pluginBuild.onResolve({ filter: /\/issues\.ts$/ }, args =>
			join(args.resolveDir, args.path) === issuesPath ?
				{ path: join(issuesPath, "..", file) }
			:	undefined
		)
})

// a bare specifier resolves to node_modules, which the build doesn't read
// its paths are POSIX's, though the precompiler joins them with \ on Windows
export const memoryHost = (files: Record<string, string>): PrecompileHost => ({
	resolve: (specifier, importer) =>
		specifier.startsWith(".") ?
			posix.join(posix.dirname(importer), specifier)
		:	`/node_modules/${specifier}/index.js`,
	readFile: path => files[path.split("\\").join("/")]
})

export const analyze = (
	source: string,
	files: Record<string, string> = {},
	opts?: PrecompileOptions
): ModuleAnalysis =>
	new Precompiler(
		memoryHost({ ...files, "/main.ts": source }),
		opts
	).analyzeSites(source, "/main.ts")

export const precompile = (
	source: string,
	files: Record<string, string> = {},
	opts?: PrecompileOptions
): PrecompiledModule =>
	precompileModule(
		source,
		"/main.ts",
		memoryHost({ ...files, "/main.ts": source }),
		opts
	)

// each site's status, with its value's expression or why it is rejected
export const statusesOf = (
	source: string,
	files?: Record<string, string>,
	opts?: PrecompileOptions
): string[] =>
	analyze(source, files, opts).sites.map(site =>
		[
			`${site.line}:${site.column} ${site.status}${
				site.parseError ? ` (${site.parseError.message})`
				: hasArkKind(site.value, "root") ? ` ${site.value.expression}`
				: ""
			}`,
			...site.reasons
		].join("\n  ")
	)

export const diagnosticsOf = (
	source: string,
	files?: Record<string, string>,
	opts?: PrecompileOptions
): string[] => analyze(source, files, opts).diagnostics.map(renderDiagnostic)

// each site's status, with the inputs it compares or why it is rejected
export const inputsOf = (
	source: string,
	files?: Record<string, string>
): string[][] =>
	analyze(source, files).sites.map(site => [
		`${site.line}:${site.column} ${site.status}`,
		...(site.status === "rejected" ?
			site.reasons
		:	site.inputs.map(
				input => `${input.kind} ${[input.name, ...input.path].join(".")}`
			))
	])

// hashes, quoted 8-char ids and configuration fingerprints. hashOf writes 8
// to 14 characters, so where only a hash goes, a shorter one is read too
const hashPattern =
	/(?<![\da-z])(\$ark\$*|ark\$+)?((?=[\da-z]*\d)(?:[\da-z]{12,}|(?<=\$ark|(?<!\$)ark\$|~arktype\/)[\da-z]{8,}|(?<=")[\da-z]{8}(?="))|(?<=")(?=[\d_a-z]*\d)[\da-z]+_[\da-z]+(?="))(?![\da-z])/g

// hashes change with the runtime's source, so they're numbered in order
export const normalized = <code extends string | string[]>(
	code: code
): code => {
	const indexByHash: Record<string, number> = {}
	const normalize = (s: string) =>
		s
			.replace(
				hashPattern,
				(_, prefix: string | undefined, hash: string) =>
					`${prefix ?? ""}#${(indexByHash[hash] ??= Object.keys(indexByHash).length)}`
			)
			// named by the version, which a release changes
			.replace(/precompiledForArktype_\w+/g, "precompiledForArktype_$version")
	return (
		typeof code === "string" ?
			normalize(code)
		:	code.map(normalize)) as never
}

// a package under node_modules, which git ignores, so tests write it
export const packageFiles = (
	name: string,
	files: Record<string, string>,
	manifest: object = {},
	dir = `node_modules/${name}`
): Record<string, string> => ({
	[`${dir}/package.json`]: JSON.stringify({
		name,
		version: "1.0.0",
		type: "module",
		exports: "./index.js",
		...manifest
	}),
	...Object.fromEntries(
		Object.entries(files).map(([path, text]) => [`${dir}/${path}`, text])
	)
})

// a program importing a package that opts in
export const writeLibrary = (): string =>
	writeFixture(
		packageFiles(
			"tagged",
			{
				"index.js":
					'import { type } from "arktype"\n\nexport const Tagged = type({ tag: "string" })\n'
			},
			{ ark: { aot: true } }
		),
		fromHere("library")
	)

// errors "none" programs, reads/ importing a package importing @ark/schema
export const writeUndetailed = (): string =>
	writeFixture(
		{
			"main.ts": `import { type } from "arktype"

const T = type({ a: "string", b: "string.json.parse" })
const errors = T({ a: 1, b: "[" })
console.log(errors instanceof type.errors, String(errors))
console.log(JSON.stringify(T({ a: "a", b: "[1]" })))
try {
	T.assert({ a: 1 })
} catch (e) {
	console.log(String(e), (e as { cause?: unknown }).cause instanceof type.errors)
}
`,
			"reads/main.ts": 'import { reads } from "reads"\n\nconsole.log(reads)\n',
			...packageFiles("reads", {
				"index.js":
					'import { hasArkKind } from "@ark/schema"\n\nexport const reads = typeof hasArkKind\n',
				"index.d.ts": "export declare const reads: string\n"
			})
		},
		fromHere("temp", "undetailed")
	)

// what that program logs, its errors saying only that data is invalid
export const undetailedOutput = `true is invalid
{"a":"a","b":[1]}
Error: is invalid true
`

const tempDirs: string[] = []

// a run that fails keeps what it wrote, printing where
process.once("exit", code => {
	if (code && tempDirs.length) console.error(`kept ${tempDirs.join(", ")}`)
	else for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true })
})

export const tempDir = (prefix = "ark-precompile-"): string => {
	// as bundlers write it: through macOS's /var symlink and Windows' 8.3 names
	const dir = realpathSync.native(mkdtempSync(join(tmpdir(), prefix)))
	tempDirs.push(dir)
	return dir
}

export const writeFixture = (
	files: Record<string, string>,
	root = tempDir()
): string => {
	for (const path in files) {
		mkdirSync(dirname(join(root, path)), { recursive: true })
		writeFileSync(join(root, path), files[path])
	}
	return root
}

// runs a bundle as an ES module
export const runBundle = (js: string) =>
	spawnSync(process.execPath, ["--input-type=module"], {
		input: js,
		encoding: "utf8"
	})

// what a bundle logs
export const run = (js: string): string => runBundle(js).stdout

export const runPlain = (cwd: string, ...args: string[]): string =>
	spawnSync(
		process.execPath,
		["--conditions", "ark-ts", ...(args.length ? args : ["main.ts"])],
		{ cwd, encoding: "utf8" }
	).stdout

export const runCli = (cwd: string, ...args: string[]) =>
	spawnSync(
		process.execPath,
		["--conditions", "ark-ts", fromHere("..", "cli.ts"), ...args],
		{ cwd, encoding: "utf8" }
	)

// Bun is optional, so its tests run where it is installed, as CI requires
export const hasBun = (): boolean => {
	if (spawnSync("bun", ["--version"]).status === 0) return true
	if (process.env.CI) throw new Error("CI must install Bun to run its tests")
	return false
}

// runs fn in a process whose arktype has neither a configuration nor a Type
export const inFreshProcess = <args extends unknown[], result>(
	fn: (...args: args) => result,
	args = [] as unknown[] as args,
	cwd = fromHere()
): Awaited<result> => {
	const passed = args.map(arg =>
		typeof arg === "function" ? String(arg) : JSON.stringify(arg)
	)
	const { status, stdout, stderr } = spawnSync(
		process.execPath,
		["--conditions", "ark-ts", "--input-type=module"],
		{
			cwd,
			encoding: "utf8",
			input: `console.log(JSON.stringify(await (${fn})(${passed.join(", ")})))`
		}
	)
	if (status) throw new Error(stderr)
	return JSON.parse(stdout)
}
