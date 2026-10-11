import { fromHere } from "@ark/fs"
import {
	createNodeHost,
	Precompiler,
	type Diagnostic,
	type PrecompiledModule,
	type PrecompileMode
} from "@ark/precompile"
import { hasArkKind } from "@ark/schema"
import { arkKindOf } from "@ark/util"
import type { IntrospectionMember } from "arktype/internal/runtime.ts"
import { isTypedFn, keyOf, type Foldable } from "arktype/internal/standalone.ts"
import { bindingOfFunction, isArk } from "@ark/precompile/internal/graph.ts"
import type { SourceModule } from "@ark/precompile/internal/module.ts"
import { specifierOf } from "@ark/precompile/internal/precompile.ts"
import MagicString from "magic-string"
import { execFile, spawnSync } from "node:child_process"
import {
	globSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import {
	isPerturbable,
	perturbations,
	type Manifest,
	type Observation,
	type Perturbation,
	type PerturbedFile,
	type World,
	type WorldResults
} from "./perturbationWorker.ts"

// checks invariant I of the precompilation design (design/precompile.md §12): a value a folded site
// reads, changed before the site runs, makes the precompiled program throw at creation or agree with the original:
// pnpm testPerturbation [file...]

const root = fromHere("..", "..", "..")

// the define the checks fixture's moded.ts is built with, which the worker sets unless it stubs it
const define = { "process.env.ARK_MODE": "loose" }

export interface BuildOptions {
	mode: PrecompileMode
	introspection?: readonly IntrospectionMember[]
	// run a file where no site folds, as for a program that records its own observations
	runsUnfolded?: boolean
}

const createPrecompiler = (opts: BuildOptions) =>
	new Precompiler(
		createNodeHost({ conditions: ["ark-ts", "import", "default"] }),
		{
			cwd: root,
			checkHelpers: true,
			inline: true,
			define,
			runtime: opts.mode === "cache" ? "arktype" : undefined,
			introspection: opts.introspection
		}
	)

export interface PerturbedBuild {
	manifest: Manifest
	sitesById: Record<number, string>
	// what fails a standalone build, which then has no program to run
	errors: Diagnostic[]
}

// sites are wrapped where a standalone build folds them, so each mode's program wraps the same expressions
export const buildPerturbed = (
	corpus: string[],
	opts: BuildOptions
): PerturbedBuild => {
	const files: PerturbedFile[] = []
	const sitesById: Record<number, string> = {}
	const precompiledByPath: Record<string, string> = {}
	const exportNamesByPath: Record<string, string[]> = {}
	const swapsByPath: Record<string, Record<string, string>> = {}
	const errors: Diagnostic[] = []

	for (const path of corpus) {
		const source = readFileSync(path, "utf8")
		const precompiler = createPrecompiler({ ...opts, mode: "standalone" })
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
		if (!folded.length && !opts.runsUnfolded) continue
		const module = precompiler.graph.moduleOf(path) as SourceModule
		// what the arktype values of the modules it imports hold was passed to arktype before any of its own sites runs
		const loaded = Object.values(module.scopes.root.bindings).flatMap(
			binding => {
				if (binding.kind !== "import") return []
				const value = precompiler.interpreter.valueOfBinding(binding, module)
				return isHolder(value) ? keyOf(value)[1] : []
			}
		)
		const valueOrUndefined = (
			binding: Parameters<typeof precompiler.interpreter.valueOfBinding>[0]
		) => {
			try {
				return precompiler.interpreter.valueOfBinding(binding, module)
			} catch {
				return undefined
			}
		}
		// a comment beside a site survives its transform, so each world wraps the same expression
		const marked = new MagicString(source)
		const wrappers: [start: string, end: string, replacement: string][] = []
		const heldImports: string[] = []
		for (const site of folded) {
			const id = Object.keys(sitesById).length
			sitesById[id] = `${relative(root, path)}:${site.line}:${site.column}`
			// arktype keeps the name and length it read of a function it already holds, which it may read only once the site runs
			const passed = new Set([
				...loaded,
				...site.references.flatMap(({ value }) =>
					value !== site.value && isHolder(value) ? keyOf(value)[1] : []
				)
			])
			const passedNames = new Set<string>()
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
					isArk(precompiler.graph.bindingKindOf(binding, module))
				)
					continue
				names.add(binding.name)
				// a function the site reads, whose Type may no longer hold it
				if (passed.has(valueOrUndefined(binding))) passedNames.add(binding.name)
			}
			// what a Type the site reads holds can change too, through the binding declaring it, imported if another module exports it
			const held = new Set(
				[site.value, ...site.references.map(reference => reference.value)]
					.filter(value => hasArkKind(value, "root"))
					.flatMap(root => keyOf(root)[1])
			)
			for (const value of held) {
				const [node, declaring] = precompiler.interpreter.sourceOf(value) ?? []
				const binding = node && bindingOfFunction(node, declaring!)
				if (!binding || binding.scope.parent) continue
				let name = binding.name
				if (declaring !== module) {
					if (!binding.exportNames.length) continue
					name = `$arkHeld${heldImports.length}`
					heldImports.push(
						`import { ${binding.exportNames[0]} as ${name} } from ${JSON.stringify(specifierOf(path, declaring!.id))}`
					)
				}
				names.add(name)
				if (passed.has(value)) passedNames.add(name)
			}
			marked.appendLeft(site.start, `/*@${id}(*/`)
			marked.prependRight(site.end, `/*)@${id}*/`)
			wrappers.push([
				`/*@${id}(*/`,
				`/*)@${id}*/`,
				`$arkSite(${id}, () => [${[...names].map(name => `() => ${name}`).join(", ")}], [${[
					...names
				]
					.flatMap((name, i) => (passedNames.has(name) ? [i] : []))
					.join(", ")}], () => (`
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
		marked.append(heldImports.map(statement => `\n${statement}`).join(""))
		const precompiled = createPrecompiler(opts).precompile(
			marked.toString(),
			path
		)
		errors.push(...errorsOf(precompiled))
		files.push({
			path,
			original: wrap(marked.toString()),
			precompiled: wrap(precompiled.code)
		})
		const reached = [path]
		for (const importer of reached) {
			for (const target of precompiler.localImportsOf(
				importer === path ? marked.toString() : readFileSync(importer, "utf8"),
				importer
			)) {
				if (!isPerturbable(target) || reached.includes(target)) continue
				reached.push(target)
				if (target in precompiledByPath) continue
				const targetPrecompiler = createPrecompiler(opts)
				const targetPrecompiled = targetPrecompiler.precompile(
					readFileSync(target, "utf8"),
					target
				)
				errors.push(...errorsOf(targetPrecompiled))
				precompiledByPath[target] = targetPrecompiled.code
				const graph = targetPrecompiler.graph
				const targetModule = graph.moduleOf(target) as SourceModule
				swapsByPath[target] = swapsOf(targetPrecompiler, targetModule)
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
							isArk(graph.bindingKindOf(exported.binding, exported.module)))
					)
				})
			}
		}
	}
	return {
		manifest: {
			files,
			precompiledByPath,
			exportNamesByPath,
			swapsByPath,
			...runtimeOf()
		},
		sitesById,
		errors
	}
}

// an arktype value, which holds the functions a definition passed it
const isHolder = (value: unknown): value is Foldable =>
	(["root", "module", "scope", "generic"] as const).some(kind =>
		hasArkKind(value, kind)
	) || isTypedFn(value)

const errorsOf = (precompiled: PrecompiledModule) =>
	precompiled.diagnostics.filter(diagnostic => diagnostic.severity === "error")

// a mock can export another Type, Scope, Module, Generic or TypedFn in place of one, so each is swapped for the next of its kind
function swapsOf(
	precompiler: Precompiler,
	module: SourceModule
): Record<string, string> {
	const namesByKind: Record<string, string[]> = {}
	for (const name of Object.keys(module.scopes.exportsByName)) {
		const exported = precompiler.graph.exportOf(module, name)
		if (!/^[$A-Z_a-z][\w$]*$/.test(name) || exported.kind !== "binding")
			continue
		let value: unknown
		try {
			value = precompiler.interpreter.valueOfBinding(
				exported.binding,
				exported.module
			)
		} catch {
			continue
		}
		const kind = isTypedFn(value) ? "fn" : arkKindOf(value)
		if (typeof kind === "string") (namesByKind[kind] ??= []).push(name)
	}
	const swaps: Record<string, string> = {}
	for (const names of Object.values(namesByKind)) {
		if (names.length < 2) continue
		for (let i = 0; i < names.length; i++)
			swaps[names[i]] = names[(i + 1) % names.length]
	}
	return swaps
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

let runtime: Pick<Manifest, "runtimeUrl" | "arktypeOnlyNames"> | undefined

const runtimeOf = () => {
	if (runtime) return runtime
	const runtimeNames = namesOf("arktype/runtime")
	return (runtime = {
		runtimeUrl: evaluate(`console.log(import.meta.resolve("arktype/runtime"))`),
		arktypeOnlyNames: namesOf("arktype").filter(
			name => !runtimeNames.includes(name)
		)
	})
}

const execFileAsync = promisify(execFile)

// each world runs in a process of its own, reading its manifest from and writing its results to `out`
export const runWorld = async (
	world: World,
	manifest: Manifest,
	out: string
): Promise<WorldResults> => {
	const manifestPath = join(out, `${world}.manifest.json`)
	const resultPath = join(out, `${world}.json`)
	writeFileSync(manifestPath, JSON.stringify(manifest))
	await execFileAsync(
		process.execPath,
		[
			"--conditions",
			"ark-ts",
			"--no-warnings",
			fromHere("perturbationWorker.ts"),
			world,
			manifestPath,
			resultPath
		],
		{ cwd: root, maxBuffer: 1 << 30 }
	).catch(e => {
		throw new Error(`the ${world} world exited with ${e.code}:\n${e.stderr}`)
	})
	return JSON.parse(readFileSync(resultPath, "utf8"))
}

// a name arktype registers a value or node by follows the history of the process, as a name when first registered and a counter
export const comparable = (observation: unknown): string =>
	(JSON.stringify(observation) ?? "undefined")
		.replace(/\btype\d+\b/g, "type")
		.replace(/\$ark\.[\w$&|]+/g, "$ark")

// what a factory's checks throw, a mismatch with what the build read, a hole renamed since its validator was created, or two values where it read one
const isCreationCheck = (observation: Observation | undefined) =>
	typeof observation?.threw === "string" &&
	/ but was (?:precompiled as |named .* when .* was created$)|, which it was at build$/.test(
		observation.threw
	)

export interface Disagreement {
	perturbation: Perturbation
	site: string
	original: Observation
	precompiled: Observation
}

export interface WorldComparison {
	counts: Record<string, number>
	disagreements: Disagreement[]
	observedSites: Set<string>
}

// an observation a program records itself is labeled by its key, and a site's by where it is
export const compareWorlds = (
	build: PerturbedBuild,
	original: WorldResults,
	precompiled: WorldResults
): WorldComparison => {
	const counts: Record<string, number> = {}
	const disagreements: Disagreement[] = []
	const observedSites = new Set<string>()
	for (const file of build.manifest.files) {
		for (const kind of perturbations) {
			const originals = original[file.path][kind]
			if (!originals) continue
			for (const [key, expected] of Object.entries(originals)) {
				const actual = precompiled[file.path][kind]?.[key]
				const [id, occurrence] = key.split(":")
				const site = occurrence ? build.sitesById[Number(id)] : key
				const outcome =
					!actual ? "unobserved precompiled"
					: comparable(actual) === comparable(expected) ?
						(
							comparable(expected) ===
							comparable(original[file.path].none?.[key])
						) ?
							"agrees"
						:	"agrees with the change"
					: isCreationCheck(actual) ? "throws at creation"
					: "disagrees"
				counts[`${kind}: ${outcome}`] = (counts[`${kind}: ${outcome}`] ?? 0) + 1
				if (actual) observedSites.add(site)
				if (outcome === "disagrees") {
					disagreements.push({
						perturbation: kind,
						site,
						original: expected,
						precompiled: actual!
					})
				}
			}
		}
	}
	return { counts, disagreements, observedSites }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const positionals = process.argv.slice(2)
	const corpus = globSync(
		[
			"ark/{type,schema}/__tests__/**/*.test.ts",
			"ark/docs/components/snippets/*.ts",
			"ark/precompile/__tests__/{app,checked,checks,defaults,environments,held,islands,swapped}/*.ts"
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
	const build = buildPerturbed(corpus, { mode: "standalone" })
	const out = mkdtempSync(join(tmpdir(), "ark-perturbation-"))
	// a run that fails keeps its worlds for inspection
	process.once("exit", code => {
		if (code) console.error(`results: ${out}`)
		else rmSync(out, { recursive: true, force: true })
	})
	const { counts, disagreements, observedSites } = compareWorlds(
		build,
		await runWorld("original", build.manifest, out),
		await runWorld("standalone", build.manifest, out)
	)
	console.log(
		JSON.stringify(
			{
				files: build.manifest.files.length,
				foldedSites: Object.keys(build.sitesById).length,
				observedSites: observedSites.size,
				counts
			},
			null,
			2
		)
	)
	if (disagreements.length) {
		console.error(
			disagreements
				.map(
					({ perturbation, site, original, precompiled }) =>
						`${perturbation} ${site}\n  original: ${JSON.stringify(original).slice(0, 400)}\n  precompiled: ${JSON.stringify(precompiled).slice(0, 400)}`
				)
				.join("\n\n")
		)
		process.exit(1)
	}
}
