import { fromHere } from "@ark/fs"
import { createNodeHost, Precompiler } from "@ark/precompile"
import type { SourceModule } from "@ark/precompile/internal/module.ts"
import MagicString from "magic-string"
import { spawnSync } from "node:child_process"
import { globSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"
import {
	isPerturbable,
	perturbations,
	type Manifest,
	type Observation,
	type PerturbedFile,
	type WorldResults
} from "./perturbationWorker.ts"

// checks invariant I of the precompilation design (design/precompile.md §12): a value a folded site
// reads, changed before the site runs, makes the precompiled program throw at creation or agree with the original:
// pnpm testPerturbation [file...]

const root = fromHere("..", "..", "..")

const positionals = process.argv.slice(2)

const corpus = globSync(
	[
		"ark/{type,schema}/__tests__/**/*.test.ts",
		"ark/docs/components/snippets/*.ts",
		"ark/precompile/__tests__/{app,checked,checks,environments,islands}/*.ts"
	],
	{ cwd: root }
)
	.filter(
		file =>
			!/gc\.test|\.spec\.ts|\.check\.ts|\.d\.ts|preload\.ts/.test(file) &&
			(!positionals.length || positionals.some(p => file.includes(p)))
	)
	.sort()
	.map(file => join(root, file))

// the define the checks fixture's moded.ts is built with, which the worker sets unless it stubs it
const define = { "process.env.ARK_MODE": "loose" }

const createPrecompiler = () =>
	new Precompiler(
		createNodeHost({ conditions: ["ark-ts", "import", "default"] }),
		{ cwd: root, checkHelpers: true, inline: true, define }
	)

const files: PerturbedFile[] = []
const sitesById: Record<number, string> = {}
const precompiledByPath: Record<string, string> = {}
const exportNamesByPath: Record<string, string[]> = {}

for (const path of corpus) {
	const source = readFileSync(path, "utf8")
	const precompiler = createPrecompiler()
	const { sites } = precompiler.analyze(source, path)
	const unsupported = new Set(
		precompiler
			.precompile(source, path)
			.diagnostics.filter(diagnostic => diagnostic.rule === "unsupported")
			.map(diagnostic => diagnostic.start)
	)
	const folded = sites.filter(
		site =>
			site.status === "accepted" &&
			!unsupported.has(site.start) &&
			!/\bawait\b|\byield\b/.test(source.slice(site.start, site.end))
	)
	if (!folded.length) continue
	const module = precompiler.graph.moduleOf(path) as SourceModule
	// a comment beside a site survives its transform, so each world wraps the same expression
	const marked = new MagicString(source)
	const wrappers: [start: string, end: string, replacement: string][] = []
	for (const site of folded) {
		const id = Object.keys(sitesById).length
		sitesById[id] = `${relative(root, path)}:${site.line}:${site.column}`
		const names = new Set<string>()
		for (const [node, reference] of module.scopes.referencesById) {
			const binding = reference.binding
			if (
				node.start < site.start ||
				node.end > site.end ||
				!binding ||
				reference.isWrite ||
				(binding.declaration.start >= site.start &&
					binding.declaration.end <= site.end) ||
				precompiler.graph.isArkBinding(binding, module)
			)
				continue
			names.add(binding.name)
		}
		marked.appendLeft(site.start, `/*@${id}(*/`)
		marked.prependRight(site.end, `/*)@${id}*/`)
		wrappers.push([
			`/*@${id}(*/`,
			`/*)@${id}*/`,
			`$arkSite(${id}, () => [${[...names].map(name => `() => ${name}`).join(", ")}], () => (`
		])
	}
	// the last of each marker, since a factory's labels quote the source of what it receives, and none for a site dropped with one it was written in
	const wrap = (code: string) => {
		for (const [start, end, replacement] of wrappers) {
			for (const [marker, text] of [
				[start, replacement],
				[end, "))"]
			]) {
				const i = code.lastIndexOf(marker)
				if (i === -1) continue
				code = code.slice(0, i) + text + code.slice(i + marker.length)
			}
		}
		return code
	}
	const precompiled = createPrecompiler().precompile(
		marked.toString(),
		path
	).code
	files.push({
		path,
		original: wrap(marked.toString()),
		precompiled: wrap(precompiled)
	})
	const reached = [path]
	for (const importer of reached) {
		for (const target of precompiler.localImportsOf(
			readFileSync(importer, "utf8"),
			importer
		)) {
			if (!isPerturbable(target) || reached.includes(target)) continue
			reached.push(target)
			if (target in precompiledByPath) continue
			const targetPrecompiler = createPrecompiler()
			precompiledByPath[target] = targetPrecompiler.precompile(
				readFileSync(target, "utf8"),
				target
			).code
			const graph = targetPrecompiler.graph
			const targetModule = graph.moduleOf(target) as SourceModule
			// arktype's own exports and Types are trusted, so a mock leaves them
			exportNamesByPath[target] = Object.keys(
				targetModule.scopes.exportsByName
			).filter(name => {
				if (!/^[$A-Z_a-z][\w$]*$/.test(name)) return false
				const exported = graph.exportOf(targetModule, name)
				return !(
					exported.kind === "arktype" ||
					exported.kind === "arktypeNamespace" ||
					(exported.kind === "binding" &&
						graph.isArkBinding(exported.binding, exported.module))
				)
			})
		}
	}
}

const evaluate = (code: string) =>
	spawnSync(
		process.execPath,
		["--conditions", "ark-ts", "--input-type=module", "-e", code],
		{ cwd: fromHere(), encoding: "utf8" }
	).stdout.trim()

const namesOf = (specifier: string): string[] =>
	JSON.parse(
		evaluate(
			`console.log(JSON.stringify(Object.keys(await import("${specifier}"))))`
		)
	)

const runtimeNames = namesOf("arktype/runtime")
const manifest: Manifest = {
	files,
	precompiledByPath,
	exportNamesByPath,
	runtimeUrl: evaluate(`console.log(import.meta.resolve("arktype/runtime"))`),
	arktypeOnlyNames: namesOf("arktype").filter(
		name => !runtimeNames.includes(name)
	)
}

const out = mkdtempSync(join(tmpdir(), "ark-perturbation-"))
writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest))

const runWorld = (world: "original" | "precompiled"): WorldResults => {
	const resultPath = join(out, `${world}.json`)
	const result = spawnSync(
		process.execPath,
		[
			"--conditions",
			"ark-ts",
			"--no-warnings",
			fromHere("perturbationWorker.ts"),
			world,
			join(out, "manifest.json"),
			resultPath
		],
		{ cwd: root, encoding: "utf8", maxBuffer: 1 << 30 }
	)
	if (result.status !== 0) {
		throw new Error(
			`the ${world} world exited with ${result.status}:\n${result.stderr}`
		)
	}
	return JSON.parse(readFileSync(resultPath, "utf8"))
}

const original = runWorld("original")
const precompiled = runWorld("precompiled")

// a name arktype registers from a counter differs between processes with different histories
const comparable = (observation: Observation | undefined) =>
	JSON.stringify(observation).replace(/\btype\d+\b/g, "type")

const isCreationCheck = (observation: Observation | undefined) =>
	typeof observation?.threw === "string" &&
	observation.threw.includes(" but was precompiled as ")

const counts: Record<string, number> = {}
const failures: string[] = []
const observedSites = new Set<string>()
for (const file of files) {
	for (const kind of perturbations) {
		const originals = original[file.path][kind]
		if (!originals) continue
		for (const [key, expected] of Object.entries(originals)) {
			const actual = precompiled[file.path][kind]?.[key]
			const site = sitesById[Number(key.split(":")[0])]
			const outcome =
				!actual ? "unobserved precompiled"
				: comparable(actual) === comparable(expected) ?
					comparable(expected) === comparable(original[file.path].none?.[key]) ?
						"agrees"
					:	"agrees with the change"
				: isCreationCheck(actual) ? "throws at creation"
				: "disagrees"
			counts[`${kind}: ${outcome}`] = (counts[`${kind}: ${outcome}`] ?? 0) + 1
			if (actual) observedSites.add(site)
			if (outcome === "disagrees") {
				failures.push(
					`${kind} ${site}\n  original: ${JSON.stringify(expected).slice(0, 400)}\n  precompiled: ${JSON.stringify(actual).slice(0, 400)}`
				)
			}
		}
	}
}

console.log(
	JSON.stringify(
		{
			files: files.length,
			foldedSites: Object.keys(sitesById).length,
			observedSites: observedSites.size,
			counts,
			results: out
		},
		null,
		2
	)
)
if (failures.length) {
	console.error(failures.join("\n\n"))
	process.exit(1)
}
