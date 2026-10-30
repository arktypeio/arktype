// run `pnpm benchTypia` first; `pnpm benchCount` counts these arms' instructions
// BENCH_LIBRARIES and BENCH_CASES filter the arms, BENCH_PASSES sets the samples
// (each pass's median over BENCH_ROUNDS rounds in fresh processes),
// BENCH_ARKTYPE_CONFIG and BENCH_STANDALONE_OPTIONS configure arktype's arms
import { arktypeConfigJson } from "./arktypeConfig.ts"
import { noSuggest } from "@ark/util"
import { firstIssue } from "arktype"
import {
	precompileStandalone,
	type Optimization,
	type StandaloneOptions
} from "arktype/internal/standalone.ts"
import {
	fork as forkProcess,
	spawnSync,
	type ChildProcess
} from "node:child_process"
import { createHash } from "node:crypto"
import {
	mkdirSync,
	openSync,
	readSync,
	writeFileSync,
	writeSync
} from "node:fs"
import { registerHooks } from "node:module"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { isDeepStrictEqual } from "node:util"
import { Settings } from "typebox/system"
import * as v from "valibot"
import { z } from "zod"
import * as zm from "zod/mini"
import {
	ajvOf,
	benchedLibraries,
	isBenchedCase,
	libraries,
	type Library
} from "./libraries.ts"
import * as s from "./scenarios.ts"
import { median, pinned, standingOf, summarize } from "./stats.ts"
import type * as typiaScenarios from "./typiaScenarios.ts"

if (!process.env.BENCH_PINNED) {
	const [command, ...args] = pinned([
		process.execPath,
		...process.execArgv,
		import.meta.filename
	])
	const { status } = spawnSync(command, args, {
		stdio: "inherit",
		env: { ...process.env, BENCH_PINNED: "1" }
	})
	process.exit(status ?? 1)
}

const out = join(import.meta.dirname, "out")
mkdirSync(out, { recursive: true })

const typia = (await import(
	join(out, "typia", "typiaScenarios.js")
)) as typeof typiaScenarios

const standaloneExports = {
	Moltar: s.Moltar.arktype,
	MoltarStrict: s.MoltarStrict.arktype,
	MoltarStrip: s.MoltarStrip.arktype,
	Product: s.Product.arktype,
	ProductStrip: s.ProductStrip.arktype,
	Items: s.Items.arktype,
	Patterns: s.Patterns.arktype,
	Discriminated: s.Discriminated.arktype,
	Constraints: s.Constraints.arktype,
	Morph: s.Morph.arktype,
	Defaults: s.Defaults.arktype,
	ItemsMorph: s.ItemsMorph.arktype,
	ItemsDefaults: s.ItemsDefaults.arktype,
	MoltarMorph: s.MoltarMorph.arktype,
	Tree: s.Tree.arktype,
	...Object.fromEntries(s.Rotating.map((t, i) => [`Rotating${i}`, t.arktype]))
}

// e.g. '{"errors":"none"}', built into artifacts of their own
const optionsJson = process.env.BENCH_STANDALONE_OPTIONS
const standaloneOptions: StandaloneOptions = {
	mutatesInput: false,
	...JSON.parse(optionsJson ?? "{}")
}
const arktypeErrors = JSON.parse(arktypeConfigJson ?? "{}").errors

const artifactSuffix =
	optionsJson || arktypeConfigJson ?
		`.${createHash("sha1")
			.update(`${optionsJson}\n${arktypeConfigJson}`)
			.digest("hex")
			.slice(0, 8)}`
	:	""

const copiedPackageUrls = ["type", "schema"].map(
	name => `${pathToFileURL(join(import.meta.dirname, "..", "..", name)).href}/`
)

// an artifact built with errors "none" or for lean errors loads its own copy
// of the runtime, as published
const issuesModulesByVariant = {
	none: "issuesNone.ts",
	lean: "issuesLean.ts",
	"none-lean": "issuesNoneLean.ts"
}

type RuntimeVariant = keyof typeof issuesModulesByVariant

// errors are written for size as validators are, unless optimizeErrors says
const variantOf = (
	opts: StandaloneOptions & { optimizeErrors?: Optimization }
): RuntimeVariant | undefined =>
	(opts.optimizeErrors ?? opts.optimize) === "size" ?
		opts.errors === "none" ?
			"none-lean"
		:	"lean"
	: opts.errors === "none" ? "none"
	: undefined

const loadRuntimeVariant = (variant: RuntimeVariant) =>
	registerHooks({
		resolve: (specifier, context, nextResolve) => {
			if (!context.parentURL?.endsWith(`?${variant}`))
				return nextResolve(specifier, context)
			const resolved = nextResolve(
				specifier === "@ark/schema/runtime" ?
					`@ark/schema/runtime/${variant}`
				:	specifier,
				context
			)
			if (!copiedPackageUrls.some(url => resolved.url.startsWith(url)))
				return resolved
			const url = resolved.url.replace(
				/\/schema\/shared\/issues\.ts$/,
				`/schema/shared/${issuesModulesByVariant[variant]}`
			)
			return { ...resolved, url: `${url}?${variant}` }
		}
	})

const standaloneOf = async (errors: "all" | "first") => {
	const opts: StandaloneOptions =
		errors === "all" ?
			{ errors, ...standaloneOptions }
		:	{ errors, mutatesInput: false }
	const path = join(out, `scoreboard.standalone.${errors}${artifactSuffix}.js`)
	if (!process.env.BENCH_LIBRARY)
		writeFileSync(path, precompileStandalone(standaloneExports, opts).code)
	// standalone validators load beside arktype only once its claim is cleared
	delete (globalThis as Record<string, unknown>)[
		noSuggest("loadedArktypeEntry")
	]
	const variant = variantOf(opts)
	if (variant) loadRuntimeVariant(variant)
	// each export is a getter, creating the artifact's validators at its first call
	const artifact: Record<string, () => unknown> = await import(
		`${pathToFileURL(path).href}${variant ? `?${variant}` : ""}`
	)
	return Object.fromEntries(
		Object.entries(artifact).map(([name, get]) => [name, get()])
	)
}

const standalone = await standaloneOf("all")

// the runtime the artifacts load, whose firstIssue finds only the first of
// issues it hasn't read
const runtime = await import("arktype/runtime")

// built with errors: "first", which stops at the first issue
const standaloneFirst = await standaloneOf("first")

const arkOf = (name: string) => ({
	standalone: standalone[name],
	standaloneFirst: standaloneFirst[name]
})

const ajvFirst = ajvOf()
const ajvAll = ajvOf({ allErrors: true })
const ajvAllWithoutMessages = ajvOf({ allErrors: true, messages: false })
const ajvStrip = ajvOf({ removeAdditional: "all" })

type Mode = "parse" | "strip" | "issues" | "errors" | "first" | "allows"

interface ArmSpec {
	// assigns the result to r, calling the validator through `f`
	body: (f: string) => string
	validator: unknown
	$?: unknown
	config?: unknown
	before?: () => void
	// no API for this mode, or the schema can't compile: its closest path
	nearest?: boolean
}

interface Case {
	name: string
	mode: Mode
	inputs: readonly unknown[]
	// each input has its own validator, called from one site
	rotating?: true
	allows?: boolean
	arms: Record<Library, ArmSpec | undefined>
}

interface Validators {
	arktype: unknown
	standalone: unknown
	standaloneFirst: unknown
	zod: unknown
	zodMini: unknown
	valibot: unknown
	typia?: unknown
	ajv?: object
	typebox?: unknown
}

const abortEarly = { abortEarly: true }

const isInvalidMode = (mode: Mode) =>
	mode === "issues" || mode === "errors" || mode === "first"

// ArkErrors computes its messages when summary is read, and may find its
// issues when count is
const arkArm = (
	mode: Mode,
	validator: unknown,
	first: { firstIssue: (errors: never) => { message: string } },
	hasFirstMode: boolean
): ArmSpec =>
	mode === "allows" ? { validator, body: f => `r = ${f}.allows(data)` }
	: mode === "errors" ? { validator, body: f => `r = ${f}(data).summary` }
	: mode === "first" ?
		{
			validator,
			$: first.firstIssue,
			body: f => `r = $(${f}(data)).message`,
			nearest: !hasFirstMode
		}
	: mode === "issues" ? { validator, body: f => `r = ${f}(data).count` }
	: { validator, body: f => `r = ${f}(data)` }

const zodArm = (mode: Mode, validator: unknown): ArmSpec =>
	mode === "allows" ? { validator, body: f => `r = ${f}.validate(data)` }
	: isInvalidMode(mode) ?
		{
			validator,
			body: f => `r = ${f}.safeParse(data).error.issues`,
			nearest: mode === "first"
		}
	:	{ validator, body: f => `r = ${f}.safeParse(data)` }

// z.compile leaves what it can't compile, like recursion, on zod's runtime
const zodCompiledOf = (schema: unknown): unknown =>
	Array.isArray(schema) ?
		schema.map(zodCompiledOf)
	:	z.compile(schema as z.ZodType)

const isZodCompiled = (validator: any): boolean =>
	Array.isArray(validator) ?
		validator.every(isZodCompiled)
	:	validator._zod.bag.validator !== undefined

const zodCompiledArm = (mode: Mode, schema: unknown): ArmSpec => {
	const validator = zodCompiledOf(schema)
	const arm = zodArm(mode, validator)
	return isZodCompiled(validator) ? arm : { ...arm, nearest: true }
}

const zodMiniArm = (mode: Mode, validator: unknown): ArmSpec =>
	mode === "allows" ?
		{ validator, $: zm.validate, body: f => `r = $(${f}, data)` }
	: isInvalidMode(mode) ?
		{
			validator,
			$: zm.safeParse,
			body: f => `r = $(${f}, data).error.issues`,
			nearest: mode === "first"
		}
	:	{ validator, $: zm.safeParse, body: f => `r = $(${f}, data)` }

const valibotArm = (mode: Mode, validator: unknown): ArmSpec =>
	mode === "allows" ? { validator, $: v.is, body: f => `r = $(${f}, data)` }
	: mode === "issues" || mode === "errors" ?
		{ validator, $: v.safeParse, body: f => `r = $(${f}, data).issues` }
	: mode === "first" ?
		{
			validator,
			$: v.safeParse,
			config: abortEarly,
			body: f => `r = $(${f}, data, config).issues`
		}
	:	{ validator, $: v.safeParse, body: f => `r = $(${f}, data)` }

// typia's validators differ by mode, so each case passes the one it needs
const typiaArm = (mode: Mode, validator: unknown): ArmSpec =>
	mode === "issues" ? { validator, body: f => `r = ${f}(data).errors` }
	: mode === "errors" ?
		{
			validator,
			body: f => `r = ${f}["~standard"].validate(data).issues`
		}
	: mode === "first" ?
		{ validator, body: f => `try { ${f}(data) } catch (e) { r = e }` }
	:	{ validator, body: f => `r = ${f}(data)` }

const ajvArm = (mode: Mode, schema: object | object[]): ArmSpec => {
	const ajv =
		mode === "issues" ? ajvAllWithoutMessages
		: mode === "errors" ? ajvAll
		: mode === "strip" ? ajvStrip
		: ajvFirst
	return {
		validator:
			Array.isArray(schema) ?
				schema.map(branch => ajv.compile(branch))
			:	ajv.compile(schema),
		body: f =>
			isInvalidMode(mode) ? `r = ${f}(data) || ${f}.errors` : `r = ${f}(data)`
	}
}

const typeboxArm = (
	mode: Mode,
	validator: unknown,
	method: "Check" | "Decode" | "Default"
): ArmSpec =>
	isInvalidMode(mode) ?
		{
			validator,
			body: f => `r = ${f}.Errors(data)`,
			before: () => Settings.Set({ maxErrors: mode === "first" ? 1 : Infinity })
		}
	: mode === "strip" ?
		{ validator, body: f => `r = ${f}.Check((o = ${f}.Clean(data))) && o` }
	: method === "Default" ?
		{ validator, body: f => `r = ${f}.Check((o = ${f}.Default(data))) && o` }
	:	{ validator, body: f => `r = ${f}.${method}(data)` }

const caseOf = (
	name: string,
	mode: Mode,
	inputs: readonly unknown[],
	validators: Validators,
	opts?: Pick<Case, "rotating" | "allows"> & {
		typeboxMethod?: "Decode" | "Default"
	}
): Case => ({
	name,
	mode,
	inputs,
	...opts,
	arms: {
		valibot: valibotArm(mode, validators.valibot),
		zod: zodArm(mode, validators.zod),
		zodCompiled: zodCompiledArm(mode, validators.zod),
		zodMini: zodMiniArm(mode, validators.zodMini),
		typia:
			validators.typia === undefined ?
				undefined
			:	typiaArm(mode, validators.typia),
		ajv: validators.ajv && ajvArm(mode, validators.ajv),
		typebox:
			validators.typebox === undefined ?
				undefined
			:	typeboxArm(mode, validators.typebox, opts?.typeboxMethod ?? "Check"),
		arktype: arkArm(
			mode,
			validators.arktype,
			{ firstIssue },
			arktypeErrors === "first"
		),
		standalone: arkArm(mode, validators.standalone, runtime, true),
		// a first-error build can't collect every error
		standaloneFirst:
			mode === "issues" || mode === "errors" ?
				undefined
			:	arkArm(mode, validators.standaloneFirst, runtime, true)
	}
})

const validatorsOf = (
	name: keyof typeof standaloneExports & keyof typeof s,
	typiaValidator?: unknown
): Validators => ({ ...s[name], ...arkOf(name), typia: typiaValidator })

const invalidCases = (mode: "issues" | "errors" | "first"): Case[] =>
	(
		[
			["moltar", "Moltar", s.moltarInvalidData],
			["moltar strict", "MoltarStrict", s.moltarExtraKeysData],
			["product", "Product", s.productInvalidData],
			["items", "Items", s.itemsInvalidData],
			["patterns", "Patterns", s.patternsInvalidData]
		] as const
	).map(([caseName, name, data]) =>
		caseOf(
			caseName,
			mode,
			[data],
			validatorsOf(
				name,
				typia[mode === "first" ? (`${name}Assert` as const) : name]
			)
		)
	)

const byLibrary = (entries: readonly object[], library: Library) =>
	entries.map(entry => entry[library as never] as unknown)

const cases: Case[] = [
	caseOf(
		"moltar",
		"parse",
		[s.moltarData],
		validatorsOf("Moltar", typia.Moltar)
	),
	caseOf(
		"moltar strict",
		"parse",
		[s.moltarData],
		validatorsOf("MoltarStrict", typia.MoltarStrict)
	),
	caseOf(
		"product",
		"parse",
		[s.productData],
		validatorsOf("Product", typia.Product)
	),
	caseOf("items", "parse", [s.itemsData], validatorsOf("Items", typia.Items)),
	caseOf(
		"discriminated",
		"parse",
		s.discriminatedData,
		validatorsOf("Discriminated", typia.Discriminated)
	),
	caseOf(
		"rotating",
		"parse",
		s.rotatingData,
		{
			arktype: byLibrary(s.Rotating, "arktype"),
			standalone: s.Rotating.map((_, i) => standalone[`Rotating${i}`]),
			standaloneFirst: s.Rotating.map(
				(_, i) => standaloneFirst[`Rotating${i}`]
			),
			zod: byLibrary(s.Rotating, "zod"),
			zodMini: byLibrary(s.Rotating, "zodMini"),
			valibot: byLibrary(s.Rotating, "valibot"),
			typia: typia.Rotating,
			ajv: byLibrary(s.Rotating, "ajv"),
			typebox: byLibrary(s.Rotating, "typebox") as never
		},
		{ rotating: true }
	),
	caseOf(
		"constraints",
		"parse",
		[s.constraintsData],
		validatorsOf("Constraints", typia.Constraints)
	),
	caseOf("morph", "parse", [s.morphData], validatorsOf("Morph"), {
		typeboxMethod: "Decode"
	}),
	caseOf("defaults", "parse", [s.defaultsData], validatorsOf("Defaults"), {
		typeboxMethod: "Default"
	}),
	caseOf(
		"items morph",
		"parse",
		[s.itemsMorphData],
		validatorsOf("ItemsMorph"),
		{ typeboxMethod: "Decode" }
	),
	caseOf(
		"items defaults",
		"parse",
		[s.itemsDefaultsData],
		validatorsOf("ItemsDefaults"),
		{ typeboxMethod: "Default" }
	),
	caseOf(
		"moltar morph",
		"parse",
		[s.moltarMorphData],
		validatorsOf("MoltarMorph"),
		{ typeboxMethod: "Decode" }
	),
	caseOf("tree", "parse", [s.treeData], validatorsOf("Tree", typia.Tree)),
	caseOf(
		"moltar",
		"strip",
		[s.moltarExtraKeysData],
		validatorsOf("MoltarStrip", typia.MoltarStrip)
	),
	caseOf(
		"product",
		"strip",
		[s.productExtraKeysData],
		validatorsOf("ProductStrip", typia.ProductStrip)
	),
	...invalidCases("issues"),
	...invalidCases("errors"),
	...invalidCases("first"),
	caseOf(
		"moltar",
		"allows",
		[s.moltarData],
		validatorsOf("Moltar", typia.MoltarIs),
		{ allows: true }
	),
	caseOf(
		"moltar invalid",
		"allows",
		[s.moltarInvalidData],
		validatorsOf("Moltar", typia.MoltarIs),
		{ allows: false }
	)
]

type Loop = (
	validator: unknown,
	$: unknown,
	config: unknown,
	inputs: readonly unknown[],
	start: number,
	end: number
) => unknown

interface Arm extends ArmSpec {
	library: Library
	// a separate function per arm, so each call site sees one validator
	loop: Loop
	batchSize: number
}

const armsOf = (c: Case): Arm[] =>
	libraries.flatMap(library => {
		const spec = c.arms[library]
		if (!spec) return []
		const body = spec.body(c.rotating ? "v[i % 8]" : "v")
		// V8 shares feedback between functions with the same source
		const loop = new Function(
			"v",
			"$",
			"config",
			"inputs",
			"start",
			"end",
			`// ${library} ${c.mode} ${c.name}\nlet r, o\nfor (let i = start; i < end; i++) {\n\tconst data = inputs[i]\n\t${body}\n}\nreturn r`
		) as Loop
		return [{ ...spec, library, loop, batchSize: 0 }]
	})

// keeps its source's shapes and shares strings, unlike structuredClone
const copy = (value: unknown): unknown => {
	if (Array.isArray(value)) return value.map(copy)
	if (value instanceof Date) return new Date(value)
	if (typeof value !== "object" || value === null) return value
	const result: Record<string, unknown> = { ...value }
	for (const k in result) result[k] = copy(result[k])
	return result
}

// each call gets its own unfrozen copy, since some libraries mutate their input
const inputsOf = (c: Case, size: number) =>
	Array.from({ length: size }, (_, i) => copy(c.inputs[i % c.inputs.length]))

const callOnce = (arm: Arm, input: unknown, index: number) => {
	arm.before?.()
	const inputs = []
	inputs[index] = input
	return arm.loop(arm.validator, arm.$, arm.config, inputs, index, index + 1)
}

const failed = Symbol("failed")

const outputOf: Record<Library, (result: any, input: unknown) => unknown> = {
	valibot: result => (result.success ? result.output : failed),
	zod: result => (result.success ? result.data : failed),
	zodCompiled: result => (result.success ? result.data : failed),
	zodMini: result => (result.success ? result.data : failed),
	typia: result => (result.success ? result.data : failed),
	ajv: (result, input) => (result === true ? input : failed),
	typebox: (result, input) =>
		result === true ? input
		: result === false ? failed
		: result,
	arktype: result => (isArkErrors(result) ? failed : result),
	standalone: result => (isArkErrors(result) ? failed : result),
	standaloneFirst: result => (isArkErrors(result) ? failed : result)
}

// arktype's errors, and a standalone build's, are counted rather than an array
const isArkErrors = (result: any) =>
	typeof result?.count === "number" && "summary" in result

const hasIssues = (result: any) =>
	result instanceof Error ||
	(isArkErrors(result) && result.count > 0) ||
	// arktype's issues arm reads count
	(typeof result === "number" && result > 0) ||
	((typeof result === "string" || Array.isArray(result)) && result.length > 0)

// every arm must agree with arktype before it is timed
const verify = (c: Case, arms: Arm[]) => {
	for (let i = 0; i < c.inputs.length; i++) {
		const outputs = new Map(
			arms.map(arm => {
				const input = copy(c.inputs[i])
				const result = callOnce(arm, input, i)
				return [
					arm,
					c.mode === "allows" ? result
					: isInvalidMode(c.mode) ? hasIssues(result)
					: outputOf[arm.library](result, input)
				]
			})
		)
		const expected =
			c.mode === "allows" ? c.allows
			: isInvalidMode(c.mode) ? true
			: outputs.get(arms.find(arm => arm.library === "arktype")!)
		if (expected === failed) throw new Error(`arktype rejected ${c.name}`)
		for (const [arm, output] of outputs) {
			if (!isDeepStrictEqual(output, expected)) {
				throw new Error(
					`${arm.library} disagrees with arktype on ${c.mode} ${c.name} input ${i}: ${String(output)}`
				)
			}
		}
	}
	verifyZodCompiled(c, arms)
}

// marked on a parse context when compiled zod hands its input to zod's runtime
const zodFallback = Symbol.for("zod.compile.fallback")

// compiled zod returns what zod does, and valid data stays compiled
const verifyZodCompiled = (c: Case, arms: Arm[]) => {
	const zod = arms.find(arm => arm.library === "zod")!
	const compiled = arms.find(arm => arm.library === "zodCompiled")!
	const valid = c.mode === "parse" || c.mode === "strip" || c.allows === true
	for (let i = 0; i < c.inputs.length; i++) {
		if (
			!isDeepStrictEqual(
				callOnce(compiled, copy(c.inputs[i]), i),
				callOnce(zod, copy(c.inputs[i]), i)
			)
		)
			throw new Error(`zodCompiled disagrees with zod on ${c.mode} ${c.name}`)
		const schema: any =
			c.rotating ? (compiled.validator as unknown[])[i % 8] : compiled.validator
		if (!isZodCompiled(schema)) continue
		const ctx: Record<symbol, unknown> = {}
		schema._zod.run({ value: copy(c.inputs[i]), issues: [] }, ctx)
		if ((ctx[zodFallback] !== true) !== valid)
			throw new Error(`zodCompiled took the wrong path on ${c.mode} ${c.name}`)
	}
}

const batchMs = 0.5

// every benched case is warmed before any is timed, so no row is an arm's
// cold start: rows sharing a failure path (issues, errors and first on the
// same schema) otherwise warm it for the rows after them. arktype's
// first-error path on items, ~10 functions tiering up apart, settled after
// ~20k calls; an arm too slow to make them stops at warmMs
const warmCalls = 20_000

const warmMs = 1000

// copies few enough to stay in cache, as freshly parsed JSON is
const maxPoolSize = 256

const timeBatch = (c: Case, arm: Arm) => {
	const poolSize = Math.min(arm.batchSize, maxPoolSize)
	let elapsedMs = 0
	for (let calls = 0; calls < arm.batchSize; calls += poolSize) {
		const inputs = inputsOf(c, poolSize)
		arm.before?.()
		const start = performance.now()
		arm.loop(arm.validator, arm.$, arm.config, inputs, 0, poolSize)
		elapsedMs += performance.now() - start
	}
	return (elapsedMs * 1e6) / arm.batchSize
}

const warm = (c: Case, arm: Arm) => {
	arm.batchSize = maxPoolSize
	const warmUntil = performance.now() + warmMs
	for (
		let calls = 0;
		calls < warmCalls && performance.now() < warmUntil;
		calls += maxPoolSize
	)
		timeBatch(c, arm)
}

// the smallest batch lasting batchMs
const calibrate = (c: Case, arm: Arm) => {
	arm.batchSize = c.inputs.length
	while (timeBatch(c, arm) * arm.batchSize < batchMs * 1e6) arm.batchSize *= 2
}

// a pass forks a fresh process per library and times every arm in each of
// its rounds, so a process's own speed, like where its code landed, varies
// between passes instead of reading as its library's
const passes = Number(process.env.BENCH_PASSES ?? 10)

const rounds = Number(process.env.BENCH_ROUNDS ?? 3)

const benchedLibrary = process.env.BENCH_LIBRARY as Library | undefined

// for count.ts: BENCH_COUNT=k warms BENCH_LIBRARY's arm for BENCH_CASE, then
// copies inputs for 2n calls and calls it on k * n, printing n, as perf counts
if (process.env.BENCH_COUNT) {
	if (!process.env.BENCH_CASE) {
		console.log(JSON.stringify(cases.map(c => `${c.mode} ${c.name}`)))
		process.exit()
	}
	const c = cases.find(c => `${c.mode} ${c.name}` === process.env.BENCH_CASE)!
	const arm = armsOf(c).find(arm => arm.library === benchedLibrary)
	if (!arm) {
		console.log(JSON.stringify({ n: 0 }))
		process.exit()
	}
	const size = JSON.stringify(c.inputs).length
	// enough calls that one-off work, like a stray collection, washes out
	const n = Math.min(8_000_000, Math.max(20_000, Math.round(1.6e9 / size)))
	// a second of CPU, not wall clock, however loaded the machine is
	arm.batchSize = maxPoolSize
	const warmFrom = process.cpuUsage().user
	while (process.cpuUsage().user - warmFrom < 1e6) timeBatch(c, arm)
	const ctl = openSync(process.env.PERF_CTL!, "w")
	const ack = openSync(process.env.PERF_ACK!, "r")
	const perf = (command: string) => {
		writeSync(ctl, `${command}\n`)
		readSync(ack, Buffer.alloc(5))
	}
	const calls = Number(process.env.BENCH_COUNT) * n
	// pools of fresh copies, no forced gc, as timeBatch runs; copies for 2n
	// calls either way, so 2n less n counts n calls with their collections
	perf("enable")
	for (let done = 0; done < 2 * n; done += maxPoolSize) {
		const inputs = inputsOf(c, Math.min(maxPoolSize, 2 * n - done))
		arm.before?.()
		arm.loop(
			arm.validator,
			arm.$,
			arm.config,
			inputs,
			0,
			Math.max(0, Math.min(inputs.length, calls - done))
		)
	}
	perf("disable")
	console.log(JSON.stringify({ n }))
	process.exit()
}

// a process per library, so none shares another's JIT feedback or garbage
if (benchedLibrary) {
	const armsByCase = new Map<Case, Arm>()
	for (const c of cases) {
		const arm =
			isBenchedCase(`${c.mode} ${c.name}`) &&
			armsOf(c).find(arm => arm.library === benchedLibrary)
		if (arm) armsByCase.set(c, arm)
	}
	for (const [c, arm] of armsByCase) warm(c, arm)
	const calibrated = new Set<Case>()
	process.on("message", (caseIndex: number) => {
		const c = cases[caseIndex]
		const arm = armsByCase.get(c)!
		// warmed again, since the cases after it may have deoptimized it
		if (!calibrated.has(c)) {
			warm(c, arm)
			calibrate(c, arm)
			calibrated.add(c)
		}
		process.send!(timeBatch(c, arm))
	})
	process.on("disconnect", () => process.exit())
	process.send!("ready")
	// the parent's messages drive this process until it disconnects
	await new Promise(() => {})
}

const fork = (library: Library) =>
	forkProcess(import.meta.filename, {
		// charges each library its own collections
		execArgv: [...process.execArgv, "--single-threaded-gc"],
		env: { ...process.env, BENCH_LIBRARY: library }
	})

const sample = (child: ChildProcess, caseIndex: number) =>
	new Promise<number>(resolve => {
		child.once("message", resolve)
		child.send(caseIndex)
	})

const benched = [...cases.entries()].filter(([, c]) =>
	isBenchedCase(`${c.mode} ${c.name}`)
)
for (const [, c] of benched) verify(c, armsOf(c))

// each pass's median for each arm, paired by pass
const results: Record<string, Record<string, number[]>> = {}

for (let pass = 0; pass < passes; pass++) {
	const children = new Map(
		benchedLibraries.map(library => [library, fork(library as Library)])
	)
	await Promise.all(
		[...children.values()].map(
			child => new Promise(resolve => child.once("message", resolve))
		)
	)
	for (const [caseIndex, c] of benched) {
		const arms = armsOf(c).filter(arm => children.has(arm.library))
		const samples = new Map(arms.map(arm => [arm, [] as number[]]))
		for (let round = 0; round < rounds; round++) {
			for (let i = 0; i < arms.length; i++) {
				const arm = arms[(pass + round + i) % arms.length]
				samples
					.get(arm)!
					.push(await sample(children.get(arm.library)!, caseIndex))
			}
		}
		const byArm = (results[`${c.mode} ${c.name}`] ??= {})
		for (const arm of arms) {
			const key = `${arm.library}${arm.nearest ? "*" : ""}`
			;(byArm[key] ??= []).push(median(samples.get(arm)!))
		}
	}
	for (const child of children.values()) child.disconnect()
	process.stderr.write(".")
}
process.stderr.write("\n")

writeFileSync(join(out, "validate.json"), JSON.stringify(results))

const formatNs = (ns: number) =>
	ns < 1000 ? `${ns.toFixed(ns < 10 ? 2 : 1)}ns`
	: ns < 1e6 ? `${(ns / 1000).toFixed(2)}us`
	: `${(ns / 1e6).toFixed(2)}ms`

const modeTitles: Record<Mode, string> = {
	parse:
		"valid data, ns per call (median); zodCompiled* is a recursive schema z.compile refuses, parsed by zod's runtime",
	strip: "valid data with undeclared keys, stripped",
	issues:
		"invalid data, every error as the raw result: no message text from arktype, typia or ajv (messages: false); zod, zod/mini, valibot and TypeBox write it regardless",
	errors:
		"invalid data, every error with message text: arktype reads summary, typia ~standard.validate, ajv has messages: true",
	first:
		'invalid data, first error only, with message text: arktype reads firstIssue, which finds only the first where its issues are unread, and standaloneFirst is built with errors: "first" (* has no first-error mode: all-errors path)',
	allows: "boolean check"
}

for (const mode of Object.keys(modeTitles) as Mode[]) {
	console.log(modeTitles[mode])
	const rows = Object.entries(results).filter(([name]) =>
		name.startsWith(`${mode} `)
	)
	console.table(
		Object.fromEntries(
			rows.map(([name, samplesByArm]) => [
				name,
				Object.fromEntries(
					Object.entries(samplesByArm).map(([arm, samples]) => [
						arm,
						formatNs(median(samples))
					])
				)
			])
		)
	)
}

console.log(
	"validation standings (p: sign test against the best other, paired by pass)"
)
console.table(
	Object.fromEntries(
		Object.entries(results)
			// a filtered run can leave a case no other library to stand against
			.filter(([, samplesByArm]) =>
				Object.keys(samplesByArm).some(arm => !arm.startsWith("standalone"))
			)
			.map(([name, samplesByArm]) => [
				name,
				{
					...standingOf(
						Object.fromEntries(
							Object.entries(samplesByArm).map(([arm, samples]) => [
								arm.replace("*", ""),
								samples
							])
						),
						formatNs
					),
					"standalone IQR": summarize(
						samplesByArm.standalone ?? samplesByArm["standalone*"],
						formatNs
					)
				}
			])
	)
)

console.log(
	"every library parses the same inputs, verified to agree with arktype before timing. typia counts string length in code points, the others in UTF-16 units; the inputs are ASCII, where the two agree"
)
