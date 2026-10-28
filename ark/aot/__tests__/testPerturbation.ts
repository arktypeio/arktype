import { fromHere } from "@ark/fs"
import {
	createNodeHost,
	Precompiler,
	type Diagnostic,
	type PrecompiledModule,
	type PrecompileOptions
} from "@ark/aot"
import { hasArkKind } from "@ark/schema"
import { errorWritersByCode } from "@ark/schema/internal"
import { arkKindOf } from "@ark/util"
import { isTypedFn, keyOf, type Foldable } from "arktype/internal/standalone.ts"
import { bindingOfFunction, isArk } from "@ark/aot/internal/graph.ts"
import { SourceModule } from "@ark/aot/internal/module.ts"
import {
	specifierOf,
	type PrecompileMode
} from "@ark/aot/internal/precompile.ts"
import MagicString from "magic-string"
import { execFile, spawnSync } from "node:child_process"
import {
	existsSync,
	globSync,
	readFileSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { join, relative } from "node:path"
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
import { detailsErrors, testedOptions } from "./contract.ts"
import { tempDir } from "./utils.ts"

// a value a folded site reads, changed before the site runs, makes the
// precompiled program throw at creation or agree with arktype:
// pnpm testPerturbation [file...]

const root = fromHere("..", "..", "..")

export interface BuildOptions {
	mode: PrecompileMode
	// a standalone build's options, which cache mode doesn't take
	standalone?: PrecompileOptions
	// run a file where no site folds, as a program recording its own does
	runsUnfolded?: boolean
}

const perturbingPrecompiler = (opts: BuildOptions) =>
	new Precompiler(
		createNodeHost({ conditions: ["ark-ts", "import", "default"] }),
		{
			cwd: root,
			inline: true,
			// a ParseError's thrower is compared with arktype's
			allowUnsafe: true,
			...(opts.mode === "cache" ?
				{ runtime: "arktype" }
			:	{ creationChecks: "helpers", ...opts.standalone })
		}
	)

interface PerturbedBuild {
	manifest: Manifest
	sitesById: Record<number, string>
	// what fails a standalone build, which then has no program to run
	errors: Diagnostic[]
	// those a corpus file's program meets, its own or a module's it imports
	errorsByPath: Record<string, Diagnostic[]>
}

// sites are wrapped where standalone folds them, so each mode wraps alike
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
	const errorsByPath: Record<string, Diagnostic[]> = {}
	const importedErrorsByPath: Record<string, Diagnostic[]> = {}
	const reachedByPath: Record<string, string[]> = {}
	// nothing swaps what a factory doesn't check, as it's what the build read
	const checks = opts.standalone?.creationChecks ?? "helpers"
	const helpers = new Set<string>()
	const collectHelpers = (precompiled: PrecompiledModule) => {
		for (const site of precompiled.sites) {
			for (const helper of site.helpers)
				helpers.add(`${helper.file}:${helper.name}`)
		}
	}

	for (const path of corpus) {
		const source = readFileSync(path, "utf8")
		const precompiler = perturbingPrecompiler({ ...opts, mode: "standalone" })
		const { sites } = precompiler.analyzeSites(source, path)
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
		// what its imports hold or passed arktype, passed before its sites run
		const loaded = [
			...Object.values(module.scopes.root.bindings).flatMap(binding => {
				if (binding.kind !== "import") return []
				const value = precompiler.interpreter.valueOfBinding(binding, module)
				return isHolder(value) ? keyOf(value)[1] : []
			}),
			...precompiler.graph
				.dependenciesOf(module.id)
				.slice(1)
				.flatMap(id => {
					const imported = precompiler.graph.moduleOf(id)
					return imported instanceof SourceModule ?
							precompiler
								.analyzeSites(imported.source, id)
								.sites.flatMap(site => site.holes.map(hole => hole.value))
						:	[]
				})
		]
		const valueOrUndefined = (
			binding: Parameters<typeof precompiler.interpreter.valueOfBinding>[0]
		) => {
			try {
				return precompiler.interpreter.valueOfBinding(binding, module)
			} catch {
				return undefined
			}
		}
		// a comment beside a site survives its transform, so worlds wrap alike
		const marked = new MagicString(source)
		const wrappers: [start: string, end: string, replacement: string][] = []
		const heldImports: string[] = []
		for (const site of folded) {
			const id = Object.keys(sitesById).length
			sitesById[id] = `${relative(root, path)}:${site.line}:${site.column}`
			// arktype keeps the name and length it read of a function it holds
			const passed = new Set([
				...loaded,
				...site.references.flatMap(({ value, isOwnHole }) =>
					isOwnHole ? [value]
					: value !== site.value && isHolder(value) ? keyOf(value)[1]
					: []
				)
			])
			const passedNames = new Set<string>()
			const names = new Set<string>()
			for (const [node, reference] of module.scopes.byId) {
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
			// what a Type the site reads holds can change too, through its binding
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
		// the last of each marker, since a factory's labels quote what it receives
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
		// one writer for the file and its imports, as a build's is, so a Scope a
		// refused site reads is left to arktype in the module holding it
		const writer = perturbingPrecompiler(opts)
		const precompiled = writer.precompile(marked.toString(), path)
		errors.push(...errorsOf(precompiled))
		errorsByPath[path] = errorsOf(precompiled)
		collectHelpers(precompiled)
		files.push({
			path,
			original: wrap(marked.toString()),
			precompiled: wrap(precompiled.code)
		})
		const reached = [path]
		reachedByPath[path] = reached
		for (const importer of reached) {
			for (const target of precompiler.textImportsOf(
				importer === path ? marked.toString() : readFileSync(importer, "utf8"),
				importer
			)) {
				if (!isPerturbable(target) || reached.includes(target)) continue
				reached.push(target)
				if (target in precompiledByPath) continue
				const targetPrecompiled = writer.precompile(
					readFileSync(target, "utf8"),
					target
				)
				errors.push(...errorsOf(targetPrecompiled))
				importedErrorsByPath[target] = errorsOf(targetPrecompiled)
				collectHelpers(targetPrecompiled)
				precompiledByPath[target] = targetPrecompiled.code
				const graph = writer.graph
				const targetModule = graph.moduleOf(target) as SourceModule
				swapsByPath[target] =
					checks === "none" ? {} : swapsOf(writer, targetModule)
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
	for (const [path, reached] of Object.entries(reachedByPath)) {
		for (const target of reached.slice(1))
			errorsByPath[path].push(...(importedErrorsByPath[target] ?? []))
	}
	if (checks !== "helpers") {
		for (const path in exportNamesByPath) {
			exportNamesByPath[path] = exportNamesByPath[path].filter(
				name => !helpers.has(`${path}:${name}`)
			)
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
		errors,
		errorsByPath
	}
}

// an arktype value, which holds the functions a definition passed it
const isHolder = (value: unknown): value is Foldable =>
	(["root", "module", "scope", "generic"] as const).some(kind =>
		hasArkKind(value, kind)
	) || isTypedFn(value)

const errorsOf = (precompiled: PrecompiledModule) =>
	precompiled.diagnostics.filter(diagnostic => diagnostic.severity === "error")

// a mock can export another value of a kind, so each swaps for the next
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

// each world runs in a process of its own, reading and writing in `out`
export const runWorld = async (
	world: World,
	manifest: Manifest,
	out: string
): Promise<WorldResults> => {
	const manifestPath = join(out, `${world}.manifest.json`)
	const resultPath = join(out, `${world}.json`)
	writeFileSync(manifestPath, JSON.stringify(manifest))
	rmSync(resultPath, { force: true })
	const { stderr } = await execFileAsync(
		process.execPath,
		[
			"--conditions",
			"ark-ts",
			"--no-warnings",
			...(world === "standalone" && !detailsErrors ?
				["--import", fromHere("issuesNone.ts")]
			:	[]),
			fromHere("perturbationWorker.ts"),
			world,
			manifestPath,
			resultPath
		],
		{ cwd: root, maxBuffer: 1 << 30 }
	).catch(e => {
		throw new Error(
			`the ${world} world exited with ${e.signal ?? e.code}: ${e.message}`
		)
	})
	// a world that exits 0 without writing its results failed all the same
	if (!existsSync(resultPath)) {
		throw new Error(
			`the ${world} world exited with 0 without writing ${resultPath}:\n${stderr}`
		)
	}
	return JSON.parse(readFileSync(resultPath, "utf8"))
}

// the names arktype registers values and nodes by depend on process history
export const comparable = (observation: unknown): string =>
	(JSON.stringify(observation) ?? "undefined")
		.replace(/\btype\d+\b/g, "type")
		.replace(/\$ark\.[\w$&|]+/g, "$ark")

// under errors "first", the original world lists the issues errors "all"
// finds, any one of which a precompiled validator agrees reporting
const reportedOf = (expected: unknown, actual: unknown): unknown => {
	if (Array.isArray(expected))
		return expected.map((v, i) => reportedOf(v, (actual as any)?.[i]))
	if (typeof expected !== "object" || expected === null) return expected
	const { anyOf, ...rest } = expected as Record<string, unknown>
	const errors = (actual as { errors?: unknown } | undefined)?.errors
	if (
		Array.isArray(anyOf) &&
		Array.isArray(errors) &&
		errors.length === 1 &&
		anyOf.some(issue => comparable(issue) === comparable(errors[0]))
	) {
		rest.errors = errors
		// a check errors "all" throws at, run after the issue it reports
		if (!("threw" in (actual as object))) delete rest.threw
	}
	return Object.fromEntries(
		Object.entries(rest).map(([k, v]) => [
			k,
			reportedOf(v, (actual as any)?.[k])
		])
	)
}

// what a factory's checks throw for a value unlike what the build read
const isCreationCheck = (observation: Observation | undefined) =>
	typeof observation?.threw === "string" &&
	/ but was precompiled as |, which it was at build$/.test(observation.threw)

// a disagreement precompiling doesn't promise to avoid, counted by why
const exclusions: [
	reason: string,
	matches: (original: string, precompiled: string) => boolean
][] = [
	[
		"reads what arktype/runtime lacks, so the build refuses the module",
		(_, precompiled) => precompiled.includes(" is not in arktype/runtime")
	],
	[
		"raises a code arktype lacks, whose writers arktype throws reading",
		(original, precompiled) =>
			original.includes("TypeError: Cannot read properties of undefined") &&
			[...precompiled.matchAll(/"code":"([^"]*)"/g)].some(
				([, code]) => !(code in errorWritersByCode)
			)
	],
	[
		"reads what an arktype module it doesn't import adds, which the build installs",
		original => original.includes(" requires import ")
	]
]

export interface Disagreement {
	perturbation: Perturbation
	site: string
	original: Observation
	precompiled: Observation
}

interface WorldComparison {
	counts: Record<string, number>
	disagreements: Disagreement[]
	// what the precompiled program never observed, though nothing it met threw
	unobserved: string[]
	observedSites: Set<string>
}

// a site key's id and occurrence, ordered as the program runs them
const orderOf = (key: string) => key.split(":").map(Number)

const isBefore = (l: number[], r: number[]) =>
	l[0] < r[0] || (l[0] === r[0] && l[1] < r[1])

// a program's own observation is labeled by its key, and a site's by position
export const compareWorlds = (
	build: PerturbedBuild,
	original: WorldResults,
	precompiled: WorldResults
): WorldComparison => {
	const counts: Record<string, number> = {}
	const disagreements: Disagreement[] = []
	const unobserved: string[] = []
	const observedSites = new Set<string>()
	for (const file of build.manifest.files) {
		const buildErrors = build.errorsByPath[file.path] ?? []
		for (const kind of perturbations) {
			const originals = original[file.path][kind]
			if (!originals) continue
			const actuals = precompiled[file.path][kind] ?? {}
			// sites that threw, after which the rest of their test or module doesn't run
			const thrown = Object.entries(actuals).flatMap(([key, observation]) =>
				key.includes(":") && observation.threw !== undefined ?
					[orderOf(key)]
				:	[]
			)
			for (const [key, observed] of Object.entries(originals)) {
				const actual = actuals[key]
				const expected = reportedOf(observed, actual) as Observation
				const [id, occurrence] = key.split(":")
				const site =
					occurrence ? build.sitesById[Number(id)]
					: key === "import" ? `${relative(root, file.path)} as it loads`
					: key
				const line =
					occurrence ? Number(site.split(":").slice(-2)[0]) : Infinity
				const outcome =
					!actual ?
						(
							buildErrors.some(
								error => error.file !== file.path || error.line <= line
							)
						) ?
							"unobserved precompiled after a build error"
						: occurrence && thrown.some(l => isBefore(l, orderOf(key))) ?
							"unobserved precompiled after a site threw"
						: isCreationCheck(actuals.import) ?
							"unobserved precompiled after an import threw at creation"
						:	"unobserved precompiled"
					: comparable(actual) === comparable(expected) ?
						(
							comparable(expected) ===
							comparable(reportedOf(original[file.path].none?.[key], actual))
						) ?
							"agrees"
						:	"agrees with the change"
					: isCreationCheck(actual) ? "throws at creation"
					: key === "import" && buildErrors.length ?
						"throws as it loads after a build error"
					:	(exclusions.find(([, matches]) =>
							matches(comparable(expected), comparable(actual))
						)?.[0] ?? "disagrees")
				counts[`${kind}: ${outcome}`] = (counts[`${kind}: ${outcome}`] ?? 0) + 1
				if (actual) observedSites.add(site)
				if (outcome === "unobserved precompiled")
					unobserved.push(`${kind} ${site}`)
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
	return { counts, disagreements, unobserved, observedSites }
}

if (import.meta.main) {
	const positionals = process.argv.slice(2)
	const corpus = globSync(
		[
			"ark/{type,schema}/__tests__/**/*.test.ts",
			"ark/docs/components/snippets/*.ts",
			"ark/aot/__tests__/{app,checked,checks,defaults,environments,held,islands,swapped}/*.ts"
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
	// each world observes a validator's expression and description
	const build = buildPerturbed(corpus, {
		mode: "standalone",
		standalone: {
			...testedOptions,
			members: {
				expression: true,
				description: true,
				...testedOptions.members
			}
		}
	})
	const out = tempDir("ark-perturbation-")
	const { counts, disagreements, unobserved, observedSites } = compareWorlds(
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
				unobserved: unobserved.length,
				counts
			},
			null,
			2
		)
	)
	if (disagreements.length || unobserved.length) {
		console.error(
			[
				...disagreements.map(
					({ perturbation, site, original, precompiled }) =>
						`${perturbation} ${site}\n  original: ${JSON.stringify(original).slice(0, 400)}\n  precompiled: ${JSON.stringify(precompiled).slice(0, 400)}`
				),
				...unobserved.map(
					observation => `${observation}: never observed precompiled`
				)
			].join("\n\n")
		)
		process.exit(1)
	}
}
