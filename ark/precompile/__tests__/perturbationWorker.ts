import type { PrecompileMode } from "@ark/precompile"
import type { ArkErrors } from "@ark/schema/runtime"
import { hasDomain } from "@ark/util"
import { readFileSync, writeFileSync } from "node:fs"
import { registerHooks } from "node:module"
import { fileURLToPath, pathToFileURL } from "node:url"
import { inspect } from "node:util"
import {
	keptIssuesOf,
	keptParseMessageOf,
	thrownErrorsOf,
	type KeptIssue
} from "@ark/precompile/internal/issues.ts"
import {
	freezes,
	hasMember,
	lackedMembers,
	comparedDataOf,
	detailsErrors,
	lacks,
	mutatesInput,
	traverse
} from "./contract.ts"

// runs each file of a perturbation manifest once per perturbation, as written (P) or precompiled (P') in standalone
// or cache mode, recording what each folded site creates

export const perturbations = [
	"none",
	"addKey",
	"setValue",
	"deleteKey",
	"arity",
	"name",
	"prototype",
	"detach",
	"mock",
	"mockKind",
	"swap"
] as const

export type Perturbation = (typeof perturbations)[number]

export type World = "original" | PrecompileMode

export interface PerturbedFile {
	path: string
	original: string
	precompiled: string
}

export interface Manifest {
	files: PerturbedFile[]
	// each module a file imports, as the build precompiled it
	precompiledByPath: Record<string, string>
	exportNamesByPath: Record<string, string[]>
	// each ark export a mock swaps for another of its kind
	swapsByPath: Record<string, Record<string, string>>
	runtimeUrl: string
	// what a program importing arktype in place of arktype/runtime reads
	arktypeOnlyNames: string[]
}

export type Observation = Record<string, unknown>

export type WorldResults = Record<
	string,
	Partial<Record<Perturbation, Record<string, Observation>>>
>

export const isPerturbable = (path: string): boolean =>
	/\/ark\/(?:type|schema)\/__tests__\/|\/ark\/docs\/components\/snippets\/|\/ark\/precompile\/__tests__\//.test(
		path
	)

const run = async (world: World, manifest: Manifest, outPath: string) => {
	const isPrecompiled = world !== "original"
	const filesByPath: Record<string, PerturbedFile> = {}
	for (const file of manifest.files) filesByPath[file.path] = file
	let perturbation: Perturbation = "none"
	let perturbed = new WeakSet<object>()
	let run = 0
	const firstRunOf = new WeakMap<object, number>()

	registerHooks({
		resolve: (specifier, context, next) => {
			if (specifier === "@ark/attest")
				return { url: "perturbation:attest", shortCircuit: true }
			if (world === "standalone" && specifier === "arktype")
				return { url: "perturbation:arktype", shortCircuit: true }
			const resolved = next(specifier, context)
			// what @ark/schema/runtime/none bundles in place of issues.ts, which its source re-exports as is
			if (
				world === "standalone" &&
				!detailsErrors &&
				resolved.url.endsWith("/ark/schema/shared/issues.ts")
			) {
				return {
					...resolved,
					url: resolved.url.replace(/issues\.ts$/, "issuesNone.ts")
				}
			}
			const runId =
				context.parentURL && new URL(context.parentURL).searchParams.get("run")
			if (
				!runId ||
				!resolved.url.startsWith("file:") ||
				resolved.url.includes("?") ||
				!isPerturbable(fileURLToPath(resolved.url))
			)
				return resolved
			// each run imports a graph of its own, so a module evaluates once per run as in a test runner, and an import cycle reaches the run's file as it was imported
			const isRoot =
				filesByPath[fileURLToPath(resolved.url)] ===
				manifest.files[Number.parseInt(runId)]
			return {
				...resolved,
				url: `${resolved.url}?run=${runId}${isRoot ? "&root" : ""}`
			}
		},
		load: (url, context, next) => {
			if (url === "perturbation:attest")
				return { format: "module", shortCircuit: true, source: attestSource }
			if (url === "perturbation:arktype") {
				return {
					format: "module",
					shortCircuit: true,
					source: `export * from ${JSON.stringify(manifest.runtimeUrl)}\n${manifest.arktypeOnlyNames
						.map(
							name =>
								`export const ${name} = () => { throw new Error("${name} is not in arktype/runtime") }`
						)
						.join("\n")}`
				}
			}
			if (!url.startsWith("file:") || !url.includes("run="))
				return next(url, context)
			const { searchParams } = new URL(url)
			const path = fileURLToPath(url)
			if (searchParams.has("root")) {
				const file = filesByPath[path]
				return {
					format: "module-typescript",
					shortCircuit: true,
					source: isPrecompiled ? file.precompiled : file.original
				}
			}
			const exportNames = manifest.exportNamesByPath[path]
			if (
				(perturbation === "mock" || perturbation === "mockKind") &&
				!searchParams.has("original") &&
				exportNames
			) {
				const original = JSON.stringify(`${url}&original`)
				return {
					format: "module",
					shortCircuit: true,
					source: `import * as original from ${original}\nexport * from ${original}\n${exportNames
						.map(name =>
							name === "default" ?
								`export default globalThis.$arkMock(original.default)`
							:	`export const ${name} = globalThis.$arkMock(original.${name})`
						)
						.join("\n")}`
				}
			}
			const swaps = manifest.swapsByPath[path]
			if (
				perturbation === "swap" &&
				!searchParams.has("original") &&
				swaps &&
				Object.keys(swaps).length
			) {
				const original = JSON.stringify(`${url}&original`)
				return {
					format: "module",
					shortCircuit: true,
					source: `import * as original from ${original}\nexport * from ${original}\n${Object.entries(
						swaps
					)
						.map(
							([name, swapped]) => `export const ${name} = original.${swapped}`
						)
						.join("\n")}`
				}
			}
			if (isPrecompiled && path in manifest.precompiledByPath) {
				return {
					format: "module-typescript",
					shortCircuit: true,
					source: manifest.precompiledByPath[path]
				}
			}
			return next(url, context)
		}
	})

	const perturbFunction = (fn: Function): boolean => {
		if (perturbation === "arity")
			Object.defineProperty(fn, "length", { value: fn.length + 1 })
		else if (perturbation === "name")
			Object.defineProperty(fn, "name", { value: "perturbed" })
		else if (
			perturbation === "prototype" &&
			hasDomain(fn.prototype, "object")
		) {
			Object.setPrototypeOf(
				fn.prototype,
				fn.prototype instanceof Date ? RegExp.prototype : Date.prototype
			)
		} else if (
			perturbation === "detach" &&
			hasDomain(fn.prototype, "object") &&
			Object.getPrototypeOf(fn.prototype) !== Object.prototype
		)
			Object.setPrototypeOf(fn.prototype, Object.prototype)
		else return false
		return true
	}

	const setValue = (
		o: Record<PropertyKey, unknown>,
		depth: number
	): boolean => {
		const [k] = Object.keys(o)
		if (k === undefined) return false
		const v = o[k]
		if (isPlain(v) && depth < 3 && !perturbed.has(v)) {
			perturbed.add(v)
			return setValue(v, depth + 1)
		}
		if (hasDomain(v, "object")) return false
		o[k] = changePrimitive(v)
		return true
	}

	// a write a program could make before the site runs, which the build didn't see
	const perturb = (value: unknown): boolean => {
		if (!hasDomain(value, "object") || isArk(value) || perturbed.has(value))
			return false
		perturbed.add(value)
		if (typeof value === "function") return perturbFunction(value)
		if (!isPlain(value)) return false
		if (perturbation === "setValue") return setValue(value, 0)
		if (perturbation === "addKey") {
			if (Array.isArray(value)) value.push(value.length ? value[0] : "string")
			else value.perturbed = "string"
			return true
		}
		if (perturbation !== "deleteKey") return false
		const keys = Object.keys(value)
		if (!keys.length) return false
		if (Array.isArray(value)) value.pop()
		else delete value[keys[keys.length - 1]]
		return true
	}

	// a module mock's replacement for an export, as a test runner's is
	const mock = (value: unknown): unknown => {
		if (isArk(value)) return value
		if (perturbation === "mockKind") {
			return (
				typeof value === "function" ?
					isClass(value) ? () => {}
					:	Symbol(value.name)
				: Array.isArray(value) ? {}
				: hasDomain(value, "object") ? []
				: typeof value === "string" ? 1
				: typeof value === "symbol" ? String(value.description)
				: value === undefined ? value
				: String(value)
			)
		}
		if (typeof value === "function") {
			const mocked =
				isClass(value) ?
					class extends (value as new () => object) {}
				:	function (this: unknown, ...args: unknown[]) {
						return value.apply(this, args)
					}
			Object.defineProperty(mocked, "name", { value: value.name })
			Object.defineProperty(mocked, "length", { value: value.length + 1 })
			return mocked
		}
		return (
			Array.isArray(value) ? [...value, value.length ? value[0] : "string"]
			: isPlain(value) ? { ...value, perturbed: "string" }
			: typeof value === "symbol" ? Symbol(`${value.description}!`)
			: changePrimitive(value)
		)
	}

	const results: WorldResults = {}
	let observations: Record<string, Observation> = {}
	let occurrencesBySite: Record<number, number> = {}
	let tests: Function[] = []
	let beforeEachHooks: Function[] = []

	const record = (id: number, observation: Observation) => {
		const occurrence = (occurrencesBySite[id] ??= 0)
		occurrencesBySite[id]++
		if (occurrence < 4) observations[`${id}:${occurrence}`] = observation
	}

	const context = {
		timeout: () => context,
		slow: () => context,
		skip: () => {},
		retries: () => {}
	}
	const chainable = { timeout: () => chainable, skip: () => chainable }
	const it = Object.assign(
		(_: string, test?: Function) => {
			if (test) tests.push(test)
			return chainable
		},
		{
			skip: () => chainable,
			only: (name: string, test?: Function) => it(name, test)
		}
	)
	const describe = Object.assign(
		(_: string, body?: Function) =>
			body && valueOrError(() => body.call(context)),
		{
			skip: () => {},
			only: (name: string, body?: Function) => describe(name, body)
		}
	)
	Object.assign(globalThis, {
		it,
		describe,
		before: (hook: Function) => valueOrError(() => hook.call(context)),
		beforeEach: (hook: Function) => beforeEachHooks.push(hook),
		after: () => {},
		afterEach: () => {},
		$arkMock: mock,
		// a generated program's record of what one of its sites creates, and how that validates data generated for it
		$arkObserve: (
			key: string,
			create: () => unknown,
			inputsOf: () => unknown[]
		) => {
			try {
				observations[key] = observeValidation(create(), inputsOf, world)
			} catch (e) {
				observations[key] = { threw: messageOf(e) }
			}
		},
		$arkSite: (
			id: number,
			readsOf: () => (() => unknown)[],
			// the reads an arktype value the site reads already holds, whose name and length arktype keeps as it read them
			passed: number[],
			create: () => unknown
		) => {
			let isPerturbed = false
			// a binding read before its declaration throws as the site would, so it isn't perturbed
			const values = readsOf().map(valueOrError)
			const kept =
				perturbation === "arity" || perturbation === "name" ?
					new Set(passed.map(i => values[i]))
				:	new Set()
			for (const value of values) {
				if (!hasDomain(value, "object")) continue
				if (!firstRunOf.has(value)) firstRunOf.set(value, run)
				// a value an earlier run read is shared by runs, so a write to it would leak into later ones and meet what arktype cached in earlier ones
				if (
					firstRunOf.get(value) === run &&
					!kept.has(value) &&
					perturbation !== "none"
				)
					isPerturbed = perturb(value) || isPerturbed
			}
			try {
				const value = create()
				record(id, { ...observe(value), isPerturbed })
				return value
			} catch (e) {
				record(id, { threw: messageOf(e), isPerturbed })
				throw e
			}
		}
	})
	process.on("unhandledRejection", () => {})

	for (const [index, file] of manifest.files.entries()) {
		const byPerturbation: WorldResults[string] = (results[file.path] = {})
		const source = isPrecompiled ? file.precompiled : file.original
		const readsBindings = /\$arkSite\(\d+, \(\) => \[\(\)/.test(source)
		const importsModules = /from "\.\.?\//.test(source)
		for (const kind of perturbations) {
			if (
				kind === "mock" || kind === "mockKind" || kind === "swap" ?
					!importsModules
				:	kind !== "none" && !readsBindings
			)
				continue
			perturbation = kind
			perturbed = new WeakSet()
			run++
			observations = byPerturbation[kind] = {}
			occurrencesBySite = {}
			tests = []
			beforeEachHooks = []
			// a test's own failures are its suite's to report, so a world records only what each site creates
			await import(
				`${pathToFileURL(file.path).href}?run=${index}.${kind}&root`
			).catch(e => e)
			for (const test of tests) {
				for (const hook of beforeEachHooks)
					await settle(valueOrError(() => hook.call(context)))
				await settle(valueOrError(() => test.call(context)))
			}
		}
	}
	writeFileSync(outPath, JSON.stringify(results))
	process.exit()
}

const attestSource = `
const chain = value => new Proxy(function () {}, {
	get: (_, k) => {
		if (typeof k === "string" && k.startsWith("throws") && typeof value === "function") {
			try { value() } catch (e) { return chain(e) }
		}
		return chain()
	},
	apply: () => chain()
})
export const attest = value => chain(value)
export const bench = () => chain()
export const contextualize = Object.assign(
	(first, tests) =>
		tests ?
			describe("", () => tests((name, test) => it(name, () => test(first()))))
		:	describe("", first),
	{ each: (name, createCtx, tests) => describe(name, () => tests((name, test) => it(name, () => test(createCtx())))) }
)
`

const isArk = (value: unknown): boolean =>
	hasDomain(value, "object") &&
	(" arkKind" in value ||
		(typeof value === "function" && "expression" in value && "allows" in value))

const isPlain = (value: unknown): value is Record<PropertyKey, unknown> => {
	if (typeof value !== "object" || value === null || isArk(value)) return false
	const prototype = Object.getPrototypeOf(value)
	return (
		prototype === Object.prototype || prototype === null || Array.isArray(value)
	)
}

const isClass = (fn: Function) =>
	/^class\b/.test(Function.prototype.toString.call(fn))

const changePrimitive = (value: unknown): unknown =>
	typeof value === "string" ? `${value}[]`
	: typeof value === "number" ? value + 1
	: typeof value === "boolean" ? !value
	: typeof value === "bigint" ? value + 1n
	: value

const valueOrError = (read: () => unknown): unknown => {
	try {
		return read()
	} catch (e) {
		return e
	}
}

const settle = (result: unknown) =>
	result instanceof Promise ?
		Promise.race([
			result.catch(e => e),
			new Promise(resolve => setTimeout(resolve, 5000).unref())
		])
	:	result

// a build without error detail returns one issue at the root where arktype's errors hold their own, which don't hold its data
const keptOf = (errors: ArkErrors): KeptIssue[] =>
	!detailsErrors && errors._merge ?
		[{ code: "predicate", path: [], data: undefined }]
	:	keptIssuesOf(errors as never)

const thrownKeptOf = (e: unknown): KeptIssue[] | undefined => {
	const errors = thrownErrorsOf(e)
	return errors && keptOf(errors)
}

const messageOf = (e: unknown) => {
	const issues = thrownKeptOf(e)
	return (
		issues ? `TraversalError: ${JSON.stringify(serializeIssues(issues))}`
		: e instanceof Error ?
			`${e.constructor.name}: ${detailsErrors ? keptParseMessageOf(e.message) : undetailedDefaultOf(e.message)}`
		:	String(e)
	)
}

// a default's ParseError, which a build without error detail writes from one issue at its key, as arktype's "value at [0]" is "[0]"
const undetailedDefaultOf = (message: string) =>
	message.replace(
		/^Default (?:for (?:value at )?(\[\d+]|[^\s.[]+)|(?=must |is ))[^]*$/,
		(_, key: string | undefined) =>
			`Default ${key ? `for ${key} ` : ""}is invalid`
	)

const serializeIssues = (issues: KeptIssue[]) =>
	issues.map(({ code, path, data }) => ({
		code,
		path: path.map(String),
		...(detailsErrors && { data: serialize(comparedDataOf(data)) })
	}))

const samples = (): unknown[] => [
	undefined,
	null,
	true,
	0,
	1,
	-1,
	1.5,
	5,
	100,
	Number.NaN,
	1n,
	"",
	"a",
	" a ",
	"abc",
	"abcdefghijk",
	"1",
	"2020-01-01",
	"ada@example.com",
	[],
	[1],
	["a", 1],
	{},
	{ a: "a" },
	{ a: 1, b: "b" },
	{ name: "Ada" },
	new Date(0)
]

// a Type a morph returns is compared by its expression, since a precompiled program's is a validator
export const serialize = (out: unknown): unknown =>
	(
		hasDomain(out, "object") &&
		(out as { " arkKind"?: string })[" arkKind"] === "errors"
	) ?
		{ errors: serializeIssues(keptOf(out as never)) }
	: typeof out === "function" && isArk(out) ?
		{ type: (out as Function & { expression: string }).expression }
	:	inspect(out, {
			depth: 4,
			breakLength: Infinity,
			maxArrayLength: 10,
			sorted: mutatesInput
		})

// a precompiled Module is a frozen object of validators, as json is of data, so a Module is told and compared by its members
const isModule = (value: unknown): value is Record<string, unknown> =>
	hasDomain(value, "object") &&
	((value as { " arkKind"?: unknown })[" arkKind"] === "module" ||
		(isPlain(value) &&
			!Array.isArray(value) &&
			Object.values(value).every(
				member => typeof member === "function" || isModule(member)
			)))

// a precompiled Scope or Generic is an empty object, so either is compared as one
const isStandIn = (value: unknown): boolean =>
	hasDomain(value, "object") &&
	((value as { " arkKind"?: unknown })[" arkKind"] === "scope" ||
		(value as { " arkKind"?: unknown })[" arkKind"] === "generic")

// a TypedFn holds its parameters' and return's Types, as validators in a precompiled program
const isTypedFn = (
	value: unknown
): value is ((...args: unknown[]) => unknown) & {
	expression: string
	params: unknown
	returns: unknown
} => typeof value === "function" && "params" in value && "returns" in value

const sample = (validate: (data: unknown) => unknown) =>
	samples().map(data => {
		try {
			return serialize(validate(data))
		} catch (e) {
			return { threw: messageOf(e) }
		}
	})

// the result of a call, as design/precompile.md §2 observes it: its output, what a standalone validator keeps of each error, or what it throws
const outcomeOf = (call: () => unknown, input?: unknown): Observation => {
	try {
		const out: any = call()
		return (
			(
				hasDomain(out, "object") &&
					(out as { " arkKind"?: string })[" arkKind"] === "errors"
			) ?
				{ errors: serializeIssues(keptOf(out)) }
			: mutatesInput ? { out: serialize(out) }
			: { out: serialize(out), isInput: out === input }
		)
	} catch (e) {
		const issues = thrownKeptOf(e)
		return issues ?
				{ threw: "TraversalError", errors: serializeIssues(issues) }
			:	{ threw: String(e) }
	}
}

// each call gets its own copy of an input, so what one mutates the next doesn't see
const observeValidation = (
	value: unknown,
	inputsOf: () => unknown[],
	world: World
): Observation => {
	if (isStandIn(value)) return { module: {} }
	if (isModule(value)) {
		return {
			module: Object.fromEntries(
				Object.entries(value).map(([k, v]) => [
					k,
					observeValidation(v, inputsOf, world)
				])
			)
		}
	}
	if (typeof value !== "function") return { value: serialize(value) }
	const calls = (method: (fn: any, input: unknown) => unknown) =>
		inputsOf().map((_, i) => {
			const input = inputsOf()[i]
			return outcomeOf(() => method(value, input), input)
		})
	if (!isArk(value) || isTypedFn(value)) {
		return {
			...(isTypedFn(value) && observe(value)),
			calls: calls((fn, input) => fn(input))
		}
	}
	const t = value as any
	return {
		expression: t.expression,
		description: t.description,
		...(!lacks("methods") && { string: String(t) }),
		...(!lacks("meta") && { meta: serialize(t.meta) }),
		json: outcomeOf(() => t.json),
		toJsonSchema: outcomeOf(() => t.toJsonSchema()),
		...(!lacks("~standard") && {
			standardJsonSchema: (["input", "output"] as const).map(io =>
				outcomeOf(() =>
					t["~standard"].jsonSchema[io]({ target: "draft-2020-12" })
				)
			)
		}),
		traverse: inputsOf().map((_, i) => {
			const input = inputsOf()[i]
			const outcome = outcomeOf(() => traverse(t, input), input)
			return {
				...outcome,
				...(!mutatesInput &&
					(detailsErrors || !outcome.errors) && { mutated: serialize(input) })
			}
		}),
		allows: calls((fn, input) => fn.allows(input)),
		...(!lacks("assert") && { assert: calls((fn, input) => fn.assert(input)) }),
		...(!lacks("~standard") && {
			standard: calls((fn, input) => fn["~standard"].validate(input))
		}),
		frozen: world === "standalone" ? Object.isFrozen(t) : freezes,
		// what a standalone build's options drop, which arktype's Type has
		...(lackedMembers.length && {
			unlacked:
				world === "standalone" ?
					lackedMembers.filter(member => hasMember(t, member))
				:	[]
		})
	}
}

const observe = (value: unknown): Observation => {
	if (isStandIn(value)) return { module: {} }
	if (isTypedFn(value)) {
		return {
			name: value.name,
			expression: value.expression,
			params: observe(value.params),
			returns: observe(value.returns),
			samples: sample(value)
		}
	}
	if (isModule(value)) {
		return {
			module: Object.fromEntries(
				Object.entries(value).map(([k, v]) => [k, observe(v)])
			)
		}
	}
	if (typeof value !== "function" || !isArk(value))
		return { value: inspect(value, { depth: 1 }) }
	const validate = value as ((data: unknown) => unknown) & {
		expression: string
		description: string
	}
	return {
		expression: validate.expression,
		description: validate.description,
		samples: sample(validate)
	}
}

// a path to this file through a symlink differs from its URL, which resolves the link
if (import.meta.main) {
	const [world, manifestPath, outPath] = process.argv.slice(2)
	await run(
		world as World,
		JSON.parse(readFileSync(manifestPath, "utf8")),
		outPath
	)
}
