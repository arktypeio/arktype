// run `pnpm benchTypia` first
import { noSuggest } from "@ark/util"
import { precompileStandalone } from "arktype/internal/standalone.ts"
import { fork, spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { isDeepStrictEqual } from "node:util"
import { Settings } from "typebox/system"
import * as v from "valibot"
import * as zm from "zod/mini"
import { ajvOf, libraries, type Library } from "./libraries.ts"
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

const standalonePath = join(out, "scoreboard.standalone.js")

if (!process.env.BENCH_LIBRARY) {
	writeFileSync(
		standalonePath,
		precompileStandalone({
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
			Tree: s.Tree.arktype,
			...Object.fromEntries(
				s.Rotating.map((t, i) => [`Rotating${i}`, t.arktype])
			)
		}).code
	)
}

// standalone validators refuse to load beside arktype unless its claim is cleared
delete (globalThis as Record<string, unknown>)[noSuggest("loadedArktypeEntry")]

// each export is a getter, creating the artifact's validators at its first call
const standalone: Record<string, unknown> = Object.fromEntries(
	Object.entries(
		(await import(standalonePath)) as Record<string, () => unknown>
	).map(([name, get]) => [name, get()])
)

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
	// the library has no API for this mode, so the arm uses its closest one
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

// ArkErrors computes its messages when summary is read
const arkArm = (mode: Mode, validator: unknown): ArmSpec =>
	mode === "allows" ? { validator, body: f => `r = ${f}.allows(data)` }
	: mode === "errors" || mode === "first" ?
		{
			validator,
			body: f => `r = ${f}(data).summary`,
			nearest: mode === "first"
		}
	:	{ validator, body: f => `r = ${f}(data)` }

const zodArm = (mode: Mode, validator: unknown): ArmSpec =>
	mode === "allows" ?
		{ validator, body: f => `r = ${f}.safeParse(data).success`, nearest: true }
	: isInvalidMode(mode) ?
		{
			validator,
			body: f => `r = ${f}.safeParse(data).error.issues`,
			nearest: mode === "first"
		}
	:	{ validator, body: f => `r = ${f}.safeParse(data)` }

const zodMiniArm = (mode: Mode, validator: unknown): ArmSpec =>
	mode === "allows" ?
		{
			validator,
			$: zm.safeParse,
			body: f => `r = $(${f}, data).success`,
			nearest: true
		}
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
		arktype: arkArm(mode, validators.arktype),
		standalone: arkArm(mode, validators.standalone)
	}
})

const moltar = (typiaValidator: unknown): Validators => ({
	...s.Moltar,
	standalone: standalone.Moltar,
	typia: typiaValidator
})

const moltarStrict = (typiaValidator: unknown): Validators => ({
	...s.MoltarStrict,
	standalone: standalone.MoltarStrict,
	typia: typiaValidator
})

const product = (typiaValidator: unknown): Validators => ({
	...s.Product,
	standalone: standalone.Product,
	typia: typiaValidator
})

const items = (typiaValidator: unknown): Validators => ({
	...s.Items,
	standalone: standalone.Items,
	typia: typiaValidator
})

const patterns = (typiaValidator: unknown): Validators => ({
	...s.Patterns,
	standalone: standalone.Patterns,
	typia: typiaValidator
})

const invalidCases = (mode: "issues" | "errors" | "first"): Case[] => [
	caseOf(
		"moltar",
		mode,
		[s.moltarInvalidData],
		moltar(mode === "first" ? typia.MoltarAssert : typia.Moltar)
	),
	caseOf(
		"moltar strict",
		mode,
		[s.moltarExtraKeysData],
		moltarStrict(
			mode === "first" ? typia.MoltarStrictAssert : typia.MoltarStrict
		)
	),
	caseOf(
		"product",
		mode,
		[s.productInvalidData],
		product(mode === "first" ? typia.ProductAssert : typia.Product)
	),
	caseOf(
		"items",
		mode,
		[s.itemsInvalidData],
		items(mode === "first" ? typia.ItemsAssert : typia.Items)
	),
	caseOf(
		"patterns",
		mode,
		[s.patternsInvalidData],
		patterns(mode === "first" ? typia.PatternsAssert : typia.Patterns)
	)
]

const byLibrary = (entries: readonly object[], library: Library) =>
	entries.map(entry => entry[library as never] as unknown)

const cases: Case[] = [
	caseOf("moltar", "parse", [s.moltarData], moltar(typia.Moltar)),
	caseOf(
		"moltar strict",
		"parse",
		[s.moltarData],
		moltarStrict(typia.MoltarStrict)
	),
	caseOf("product", "parse", [s.productData], product(typia.Product)),
	caseOf("items", "parse", [s.itemsData], items(typia.Items)),
	caseOf("discriminated", "parse", s.discriminatedData, {
		...s.Discriminated,
		standalone: standalone.Discriminated,
		typia: typia.Discriminated
	}),
	caseOf(
		"rotating",
		"parse",
		s.rotatingData,
		{
			arktype: byLibrary(s.Rotating, "arktype"),
			standalone: s.Rotating.map((_, i) => standalone[`Rotating${i}`]),
			zod: byLibrary(s.Rotating, "zod"),
			zodMini: byLibrary(s.Rotating, "zodMini"),
			valibot: byLibrary(s.Rotating, "valibot"),
			typia: typia.Rotating,
			ajv: byLibrary(s.Rotating, "ajv"),
			typebox: byLibrary(s.Rotating, "typebox") as never
		},
		{ rotating: true }
	),
	caseOf("constraints", "parse", [s.constraintsData], {
		...s.Constraints,
		standalone: standalone.Constraints,
		typia: typia.Constraints
	}),
	caseOf(
		"morph",
		"parse",
		[s.morphData],
		{ ...s.Morph, standalone: standalone.Morph },
		{ typeboxMethod: "Decode" }
	),
	caseOf(
		"defaults",
		"parse",
		[s.defaultsData],
		{ ...s.Defaults, standalone: standalone.Defaults },
		{ typeboxMethod: "Default" }
	),
	caseOf("tree", "parse", [s.treeData], {
		...s.Tree,
		standalone: standalone.Tree,
		typia: typia.Tree
	}),
	caseOf("moltar", "strip", [s.moltarExtraKeysData], {
		...s.MoltarStrip,
		standalone: standalone.MoltarStrip,
		typia: typia.MoltarStrip
	}),
	caseOf("product", "strip", [s.productExtraKeysData], {
		...s.ProductStrip,
		standalone: standalone.ProductStrip,
		typia: typia.ProductStrip
	}),
	...invalidCases("issues"),
	...invalidCases("errors"),
	...invalidCases("first"),
	caseOf("moltar", "allows", [s.moltarData], moltar(typia.MoltarIs), {
		allows: true
	}),
	caseOf(
		"moltar invalid",
		"allows",
		[s.moltarInvalidData],
		moltar(typia.MoltarIs),
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

// e.g. BENCH_LIBRARIES=zod,standalone
const benchedLibraries =
	process.env.BENCH_LIBRARIES?.split(",") ?? (libraries as readonly string[])

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

// copies objects with their source's shape and shares strings, which structuredClone doesn't
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
	zodMini: result => (result.success ? result.data : failed),
	typia: result => (result.success ? result.data : failed),
	ajv: (result, input) => (result === true ? input : failed),
	typebox: (result, input) =>
		result === true ? input
		: result === false ? failed
		: result,
	arktype: result => (isArkErrors(result) ? failed : result),
	standalone: result => (isArkErrors(result) ? failed : result)
}

// arktype's errors are counted rather than an array
const isArkErrors = (result: any) => result?.constructor?.name === "ArkErrors"

const hasIssues = (result: any) =>
	result instanceof Error ||
	(isArkErrors(result) && result.count > 0) ||
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
}

const batchMs = 0.5

const warmMs = 1000

const warmCalls = 10_000

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

// warms the arm up first, since one cold call can outlast a whole batch
const calibrate = (c: Case, arm: Arm) => {
	arm.batchSize = c.inputs.length
	const warmUntil = performance.now() + warmMs
	// error paths span many functions, which optimize only after many calls
	for (
		let calls = 0;
		performance.now() < warmUntil && calls < warmCalls;
		calls += arm.batchSize
	)
		timeBatch(c, arm)
	while (timeBatch(c, arm) * arm.batchSize < batchMs * 1e6) arm.batchSize *= 2
}

const rounds = Number(process.env.BENCH_ROUNDS ?? 30)

const benchedLibrary = process.env.BENCH_LIBRARY as Library | undefined

// each library runs in its own process, so no library's JIT feedback or garbage reaches another's
if (benchedLibrary) {
	const armsByCase = new Map<Case, Arm>()
	process.on("message", (caseIndex: number) => {
		const c = cases[caseIndex]
		let arm = armsByCase.get(c)
		if (!arm) {
			arm = armsOf(c).find(arm => arm.library === benchedLibrary)!
			armsByCase.set(c, arm)
			calibrate(c, arm)
		}
		process.send!(timeBatch(c, arm))
	})
	process.on("disconnect", () => process.exit())
	process.send!("ready")
	// the parent's messages drive this process until it disconnects
	await new Promise(() => {})
}

const children = new Map(
	benchedLibraries.map(library => [
		library,
		fork(import.meta.filename, {
			// GC on the main thread charges each library its own collection, which helper threads would spread across the shared core
			execArgv: [
				...process.execArgv,
				"--single-threaded-gc",
				...(process.env.XF ?? "").split(" ").filter(Boolean)
			],
			env: { ...process.env, BENCH_LIBRARY: library }
		})
	])
)

await Promise.all(
	[...children.values()].map(
		child => new Promise(resolve => child.once("message", resolve))
	)
)

const sample = (library: Library, caseIndex: number) => {
	const child = children.get(library)!
	return new Promise<number>(resolve => {
		child.once("message", resolve)
		child.send(caseIndex)
	})
}

const results: Record<string, Record<string, number[]>> = {}

for (const [caseIndex, c] of cases.entries()) {
	// e.g. BENCH_CASES="parse moltar"
	if (!`${c.mode} ${c.name}`.startsWith(process.env.BENCH_CASES ?? "")) continue
	const allArms = armsOf(c)
	verify(c, allArms)
	const arms = allArms.filter(arm => benchedLibraries.includes(arm.library))
	const samples = new Map(arms.map(arm => [arm, [] as number[]]))
	for (let round = 0; round < rounds; round++) {
		for (let i = 0; i < arms.length; i++) {
			const arm = arms[(round + i) % arms.length]
			samples.get(arm)!.push(await sample(arm.library, caseIndex))
		}
	}
	results[`${c.mode} ${c.name}`] = Object.fromEntries(
		arms.map(arm => [
			`${arm.library}${arm.nearest ? "*" : ""}`,
			samples.get(arm)!
		])
	)
	process.stderr.write(".")
}
process.stderr.write("\n")

for (const child of children.values()) child.disconnect()

writeFileSync(join(out, "validate.json"), JSON.stringify(results))

const formatNs = (ns: number) =>
	ns < 1000 ? `${ns.toFixed(ns < 10 ? 2 : 1)}ns`
	: ns < 1e6 ? `${(ns / 1000).toFixed(2)}us`
	: `${(ns / 1e6).toFixed(2)}ms`

const modeTitles: Record<Mode, string> = {
	parse: "valid data, ns per call (median)",
	strip: "valid data with undeclared keys, stripped",
	issues:
		"invalid data, every error as the raw result: no message text from arktype, typia or ajv (messages: false); zod, zod/mini, valibot and TypeBox write it regardless",
	errors:
		"invalid data, every error with message text: arktype reads summary, typia ~standard.validate, ajv has messages: true",
	first:
		"invalid data, first error only, with message text (* has no first-error mode: all-errors path)",
	allows: "boolean check (* has no boolean API: parse)"
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
	"validation standings (p: sign test against the best other, paired by round)"
)
console.table(
	Object.fromEntries(
		Object.entries(results).map(([name, samplesByArm]) => [
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
