import { match, scope, type } from "arktype"
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import {
	checkStatic,
	messagesIn,
	type ProbeFile,
	type StaticResult
} from "./static.ts"

// a definition, how it runs and what TypeScript says of it

const here = import.meta.dirname

// ---- values a definition is written with, as code and as the value itself

const codeSym = Symbol("code")
export type Coded = { [codeSym]: string; value: unknown }
export const coded = (code: string, value: unknown): Coded => ({
	[codeSym]: code,
	value
})
export const isCoded = (v: unknown): v is Coded =>
	typeof v === "object" && v !== null && codeSym in v

export const fnMorph = coded("fnMorph", (x: unknown) => x)
export const fnNarrow = coded("fnNarrow", (x: unknown) => x !== 0)
export const fnThunk = coded("fnThunk", () => type("string"))
export const sym = coded("sym", Symbol("sym"))
export const ctorDate = coded("Date", Date)
export const ctorMap = coded("Map", Map)
export const typeValue = coded('type({ a: "string" })', type({ a: "string" }))
export const mod = coded(
	"mod",
	scope({ x: "string", "#y": "number", z: { a: "string" } }).export()
)
export const modRoot = coded(
	"modRoot",
	scope({ root: "boolean", x: "string" }).export()
)

const header = `import { match, scope, type } from "arktype"
const fnMorph = (x: unknown) => x
const fnNarrow = (x: unknown) => x !== 0
const fnThunk = () => type("string")
const sym: unique symbol = Symbol("sym")
const mod = scope({ x: "string", "#y": "number", z: { a: "string" } }).export()
const modRoot = scope({ root: "boolean", x: "string" }).export()
`

export const toCode = (v: unknown): string => {
	if (isCoded(v)) return v[codeSym]
	if (typeof v === "string") return JSON.stringify(v)
	if (typeof v === "number") return Object.is(v, -0) ? "-0" : String(v)
	if (typeof v === "bigint") return `${v}n`
	if (v === null || v === undefined || typeof v === "boolean") return String(v)
	if (Array.isArray(v)) return `[${v.map(toCode).join(", ")}]`
	return `{ ${Object.entries(v as object)
		.map(([k, v]) => `${JSON.stringify(k)}: ${toCode(v)}`)
		.join(", ")} }`
}

export const toValue = (v: unknown): unknown => {
	if (isCoded(v)) return v.value
	if (Array.isArray(v)) return v.map(toValue)
	if (typeof v === "object" && v !== null) {
		return Object.fromEntries(
			Object.entries(v).map(([k, v]) => [k, toValue(v)])
		)
	}
	return v
}

// ---- data each Type is asked about, as a value and as its literal type

export const samples: [tsType: string, value: unknown][] = [
	['""', ""],
	['"a"', "a"],
	['"b"', "b"],
	['"ab"', "ab"],
	['"5"', "5"],
	['"a@b.co"', "a@b.co"],
	['" "', " "],
	['"A"', "A"],
	['"2000"', "2000"],
	['"a b"', "a b"],
	['"="', "="],
	['"|"', "|"],
	['"a\'b"', "a'b"],
	["0", 0],
	["1", 1],
	["2", 2],
	["5", 5],
	["-1", -1],
	["1.5", 1.5],
	["-1.5", -1.5],
	["10", 10],
	["11", 11],
	["1000", 1000],
	["16", 16],
	["0.5", 0.5],
	["number", NaN],
	["number", Infinity],
	["5n", 5n],
	["0n", 0n],
	["-5n", -5n],
	["true", true],
	["false", false],
	["null", null],
	["undefined", undefined],
	["[]", []],
	['["a"]', ["a"]],
	["[1]", [1]],
	['["a", "b"]', ["a", "b"]],
	['["a", 1]', ["a", 1]],
	["{}", {}],
	['{ a: "x" }', { a: "x" }],
	["{ a: 5 }", { a: 5 }],
	['{ a: "x"; b: 5 }', { a: "x", b: 5 }],
	["Date", new Date(0)],
	["Date", new Date("2000")],
	["RegExp", /a/],
	["symbol", Symbol()],
	["() => void", () => {}],
	["Map<unknown, unknown>", new Map()],
	["Error", new Error()],
	['[null, "5"]', [null, "5"]],
	["[1, 2]", [1, 2]],
	['["a", 1, true]', ["a", 1, true]],
	["{ a: [] }", { a: [] }],
	["{ a: undefined }", { a: undefined }],
	['{ b: "x" }', { b: "x" }],
	['{ x: "a" }', { x: "a" }],
	["{ x: 1; y: 2 }", { x: 1, y: 2 }],
	["{ a: { b: 1 } }", { a: { b: 1 } }]
]

// values number excludes, which its literal type can't
const inexactSample = (i: number) =>
	typeof samples[i]?.[1] === "number" &&
	!Number.isFinite(samples[i][1] as number)

const probeHeader = `${header}type Samples = [${samples.map(([t]) => t).join(", ")}]
type Probe<t, s = Samples> = { [i in keyof s]: [s[i]] extends [t] ? 1 : 0 }
type ProbeProp<t, s = Samples> = { [i in keyof s]: [{ a: s[i] }] extends [t] ? 1 : 0 }
type ProbeTuple<t, s = Samples> = { [i in keyof s]: [[s[i]]] extends [t] ? 1 : 0 }
type Join<t, acc extends string = ""> = t extends readonly [infer h extends 0 | 1, ...infer r] ? Join<r, \`\${acc}\${h}\`> : acc
type Missing<t> = [{}] extends [t] ? 1 : 0
type MissingTuple<t> = [[]] extends [t] ? 1 : 0
`

// ---- cases

export type Context =
	| "root"
	| "prop"
	| "tuple"
	| "scope"
	// type(...def)
	| "args"
	// type(...def)(...args)
	| "generic"
	// type(def[0])[method](...def.slice(1))
	| "fluent"
	// type({ a: type(def[0])[method](...def.slice(1)) }), for what's only a prop
	| "fluentProp"
	// type[method](...def)
	| "nary"
	// match(def), read only for whether it throws
	| "match"
	// type.fn(...def), read only for whether it throws
	| "fn"

export type Case = {
	id: string
	context: Context
	/** what's passed to type() or scope(), as a coded value */
	def: unknown
	/** for a scope, the alias whose Type is read */
	alias?: string
	/** for a generic, what it's instantiated with */
	args?: unknown[]
	/** for a fluent call, the method */
	method?: string
}

export type RuntimeResult = RuntimeSuccess | RuntimeFailure

type RuntimeSuccess = {
	ok: true
	expression: string
	bits: string
	/** what its output allows, read where it has no morph to leave it unknown */
	outBits: string | undefined
	exact: boolean
	indexed: boolean
}

type RuntimeFailure = { ok: false; message: string; errorClass: string }

const inexactKinds = new Set([
	"min",
	"max",
	"minLength",
	"maxLength",
	"exactLength",
	"divisor",
	"pattern",
	"predicate",
	"after",
	"before",
	"notEqual",
	"notEqualLength",
	"morph",
	"proto",
	"alias",
	"index"
])

const isExact = (t: type.Any): boolean =>
	(t.internal as any).references.every(
		(n: any) =>
			!inexactKinds.has(n.kind) &&
			!(
				n.kind === "unit" &&
				(n.unit instanceof Date ||
					(typeof n.unit === "number" && !Number.isFinite(n.unit)))
			)
	)

// where the Type read is an object whose prop "a" is what's generated
const isPropContext = (context: Context) =>
	context === "prop" || context === "fluentProp"

const wrapSample = (context: Context, v: unknown): unknown =>
	isPropContext(context) ? { a: v }
	: context === "tuple" ? [v]
	: v

const thrown = (e: unknown): RuntimeFailure => ({
	ok: false,
	message: e instanceof Error ? e.message : String(e),
	errorClass: e instanceof Error ? e.constructor.name : typeof e
})

export const runRuntime = (c: Case): RuntimeResult => {
	let t: type.Any
	try {
		if (c.context === "scope") {
			const exports = (scope(toValue(c.def) as never) as any).export()
			t = exports[c.alias!]
			if (t === undefined) throw new Error(`<no alias ${c.alias}>`)
			// a generic is read by its instantiation, written as a def
		} else if (c.context === "args")
			t = (type as any)(...(toValue(c.def) as unknown[]))
		else if (c.context === "generic") {
			t = (type as any)(...(toValue(c.def) as unknown[]))(
				...(toValue(c.args) as unknown[])
			)
		} else if (c.context === "fluent") {
			const [base, ...rest] = toValue(c.def) as unknown[]
			t = (type(base as never) as any)[c.method!](...rest)
		} else if (c.context === "fluentProp") {
			const [base, ...rest] = toValue(c.def) as unknown[]
			t = type({ a: (type(base as never) as any)[c.method!](...rest) })
		} else if (c.context === "nary")
			t = (type as any)[c.method!](...(toValue(c.def) as unknown[]))
		else if (c.context === "match" || c.context === "fn") {
			if (c.context === "match") match(toValue(c.def) as never)
			else (type as any).fn(...(toValue(c.def) as unknown[]))
			return {
				ok: true,
				expression: `<${c.context}>`,
				bits: "",
				outBits: undefined,
				exact: false,
				indexed: false
			}
		} else t = type(toValue(c.def) as never) as never
	} catch (e) {
		return thrown(e)
	}
	let bits = ""
	let outBits: string | undefined
	try {
		for (const [, v] of samples)
			bits += t.allows(wrapSample(c.context, v)) ? 1 : 0
		if (isPropContext(c.context)) bits += t.allows({}) ? 1 : 0
		if (c.context === "tuple") bits += t.allows([]) ? 1 : 0
		if (!(t.internal as any).hasMorph) {
			const out = t.out as type.Any
			outBits = ""
			for (const [, v] of samples)
				outBits += out.allows(wrapSample(c.context, v)) ? 1 : 0
			if (isPropContext(c.context)) outBits += out.allows({}) ? 1 : 0
			if (c.context === "tuple") outBits += out.allows([]) ? 1 : 0
		}
	} catch (e) {
		const failure = thrown(e)
		return { ...failure, errorClass: `allows threw ${failure.errorClass}` }
	}
	let expression: string
	try {
		expression = t.expression
	} catch (e) {
		expression = `<expression threw ${e}>`
	}
	return {
		ok: true,
		expression,
		bits,
		outBits,
		exact: isExact(t),
		indexed: (t.internal as any).references.some((n: any) => n.kind === "index")
	}
}

// ---- static side

const probeType = (c: Case) =>
	isPropContext(c.context) ? "ProbeProp"
	: c.context === "tuple" ? "ProbeTuple"
	: "Probe"

export type StaticCaseResult = {
	errors: string[]
	messages: string[]
	infer: string
	inferIn: string
	bits: string
	outBits: string
	/** whether {} is assignable, so TypeScript rejects an object sharing none of its keys */
	weak: boolean
}

let fileCount = 0

const writeProbes = (cases: Case[], batchSize: number): ProbeFile[] => {
	const files: ProbeFile[] = []
	for (let b = 0; b * batchSize < cases.length; b++) {
		const batch = cases.slice(b * batchSize, (b + 1) * batchSize)
		let text = probeHeader
		const ranges: ProbeFile["ranges"] = {}
		const positions: ProbeFile["positions"] = {}
		const blocks: ProbeFile["blocks"] = {}
		for (const [i, c] of batch.entries()) {
			const v = `t${i}`
			const start = text.length
			if (c.context === "scope") {
				text += `const ${v}s = scope(${toCode(c.def)})\n`
				ranges[c.id] = [start, text.length]
				text += `const ${v} = ${v}s.export()[${JSON.stringify(c.alias)}]\n`
			} else if (c.context === "args" || c.context === "generic") {
				const list = (c.def as unknown[]).map(toCode).join(", ")
				const args =
					c.context === "generic" ?
						`(${(c.args as unknown[]).map(toCode).join(", ")})`
					:	""
				text += `const ${v} = type(${list})${args}\n`
				ranges[c.id] = [start, text.length]
			} else if (c.context === "fluent") {
				const [base, ...rest] = c.def as unknown[]
				text += `const ${v} = type(${toCode(base)}).${c.method}(${rest.map(toCode).join(", ")})\n`
				ranges[c.id] = [start, text.length]
			} else if (c.context === "fluentProp") {
				const [base, ...rest] = c.def as unknown[]
				text += `const ${v} = type({ a: type(${toCode(base)}).${c.method}(${rest.map(toCode).join(", ")}) })\n`
				ranges[c.id] = [start, text.length]
			} else if (c.context === "nary") {
				text += `const ${v} = type.${c.method}(${(c.def as unknown[]).map(toCode).join(", ")})\n`
				ranges[c.id] = [start, text.length]
			} else if (c.context === "match" || c.context === "fn") {
				text +=
					c.context === "match" ?
						`const ${v} = match(${toCode(c.def)})\n`
					:	`const ${v} = type.fn(${(c.def as unknown[]).map(toCode).join(", ")})\n`
				ranges[c.id] = [start, text.length]
				blocks[c.id] = [start, text.length]
				continue
			} else {
				text += `const ${v} = type(${toCode(c.def)})\n`
				ranges[c.id] = [start, text.length]
			}
			const at = (name: string, code: string) => {
				text += "const "
				positions[`${c.id}:${name}`] = text.length
				text += `${v}${name}: ${code} = null!\n`
			}
			at("infer", `typeof ${v}.infer`)
			at("in", `typeof ${v}.inferIn`)
			at("bits", `Join<${probeType(c)}<typeof ${v}.inferIn>>`)
			at("outbits", `Join<${probeType(c)}<typeof ${v}.infer>>`)
			if (isPropContext(c.context)) {
				at("missing", `Missing<typeof ${v}.inferIn>`)
				at("outmissing", `Missing<typeof ${v}.infer>`)
			} else if (c.context === "tuple") {
				at("missing", `MissingTuple<typeof ${v}.inferIn>`)
				at("outmissing", `MissingTuple<typeof ${v}.infer>`)
			} else at("weak", `Missing<typeof ${v}.inferIn>`)
			blocks[c.id] = [start, text.length]
		}
		files.push({
			path: join(here, `probe${fileCount++}.scratch.ts`),
			text,
			ranges,
			positions,
			blocks
		})
	}
	return files
}

const staticResultOf = (c: Case, statics: StaticResult): StaticCaseResult => {
	const errors = statics.errors[c.id] ?? []
	let bits = (statics.types[`${c.id}:bits`] ?? "").replace(/"/g, "")
	let outBits = (statics.types[`${c.id}:outbits`] ?? "").replace(/"/g, "")
	if (isPropContext(c.context) || c.context === "tuple") {
		bits += (statics.types[`${c.id}:missing`] ?? "").trim()
		outBits += (statics.types[`${c.id}:outmissing`] ?? "").trim()
	}
	return {
		errors,
		messages: messagesIn(errors.join("\n")),
		// match and fn contexts write no inference probes
		infer: statics.types[`${c.id}:infer`] ?? "",
		inferIn: statics.types[`${c.id}:in`] ?? "",
		bits,
		outBits,
		weak: statics.types[`${c.id}:weak`] === "1"
	}
}

const check = (cases: Case[], batchSize: number): StaticResult => {
	const files = writeProbes(cases, batchSize)
	if (process.env.KEEP_PROBES)
		for (const f of files) writeFileSync(f.path, f.text)
	return checkStatic(files)
}

/**
 * What TypeScript says of each case. One whose code hits a limit TypeScript
 * caches past is checked again on its own, and the rest without it, until no
 * case left together with others does
 */
export const runStatic = (
	cases: Case[],
	batchSize = 250
): Map<string, StaticCaseResult> => {
	const result = new Map<string, StaticCaseResult>()
	let together = cases
	while (together.length) {
		const statics = check(together, batchSize)
		const unreliable = together.filter(c => statics.unreliable.has(c.id))
		if (!unreliable.length || unreliable.length === together.length) {
			for (const c of together) result.set(c.id, staticResultOf(c, statics))
			break
		}
		for (const c of unreliable)
			result.set(c.id, staticResultOf(c, check([c], 1)))
		together = together.filter(c => !statics.unreliable.has(c.id))
	}
	return result
}

// ---- comparison

export type Outcome = {
	kind: string
	runtime: string
	static: string
	/** what a smaller definition must keep to be the same mismatch */
	signature: string
}

const template = (message: string) =>
	message
		.replace(/'[^']*'/g, "'_'")
		.replace(/"[^"]*"/g, '"_"')
		.replace(/\(was [^)]*\)/g, "(was _)")
		.replace(/-?\d+(\.\d+)?/g, "0")
		.slice(0, 80)

export const compare = (
	r: RuntimeResult,
	s: StaticCaseResult
): Outcome | undefined => {
	const staticOk = s.errors.length === 0
	// a Type deferred as unable to throw that throws once it's read
	if (!r.ok && r.errorClass.startsWith("allows threw")) {
		return {
			kind: "throwsAtRead",
			runtime: r.message,
			static: staticOk ? s.infer : s.messages.join(" || "),
			signature: template(r.message)
		}
	}
	if (r.ok && staticOk) {
		const st = s.bits
		if (st.length !== r.bits.length) {
			return {
				kind: "bitsUnreadable",
				runtime: r.bits,
				static: st,
				signature: "bits"
			}
		}
		const ra: string[] = []
		const sa: string[] = []
		for (let i = 0; i < r.bits.length; i++) {
			const name = i < samples.length ? sampleName(i) : "<missing>"
			// an index signature's keys are own and enumerable at runtime, where
			// TypeScript's include an array's length and a pattern's are wider
			if (r.bits[i] === "1" && st[i] === "0" && !r.indexed) ra.push(name)
			if (r.bits[i] === "0" && st[i] === "1" && r.exact && !inexactSample(i))
				sa.push(name)
		}
		// TypeScript rejects an object with none of a weak type's keys, though
		// it's just as much an instance of it
		if (ra.length && !(s.weak && raObjects(r.bits, st))) {
			return {
				kind: "runtimeAllowsStaticRejects",
				runtime: `${r.expression} allows ${ra.join(" ")}`,
				static: s.inferIn,
				signature: ra.join(" ")
			}
		}
		if (sa.length) {
			return {
				kind: "staticAllowsRuntimeRejects",
				runtime: `${r.expression} rejects ${sa.join(" ")}`,
				static: s.inferIn,
				signature: sa.join(" ")
			}
		}
		// the output, as .out allows it and .infer has it
		if (r.outBits === undefined || s.outBits.length !== r.outBits.length) return
		const ora: string[] = []
		const osa: string[] = []
		for (let i = 0; i < r.outBits.length; i++) {
			const name = i < samples.length ? sampleName(i) : "<missing>"
			if (r.outBits[i] === "1" && s.outBits[i] === "0" && !r.indexed)
				ora.push(name)
			if (
				r.outBits[i] === "0" &&
				s.outBits[i] === "1" &&
				r.exact &&
				!inexactSample(i)
			)
				osa.push(name)
		}
		if (ora.length && !(s.weak && raObjects(r.outBits, s.outBits))) {
			return {
				kind: "outRuntimeAllowsStaticRejects",
				runtime: `${r.expression} out allows ${ora.join(" ")}`,
				static: s.infer,
				signature: ora.join(" ")
			}
		}
		if (osa.length) {
			return {
				kind: "outStaticAllowsRuntimeRejects",
				runtime: `${r.expression} out rejects ${osa.join(" ")}`,
				static: s.infer,
				signature: osa.join(" ")
			}
		}
		return
	}
	if (r.ok) {
		return {
			kind: "typeErrorButRuns",
			runtime: r.expression,
			static: s.messages.join(" || ") || s.errors.join(" || "),
			signature: template(s.messages[0] ?? s.errors[0])
		}
	}
	if (staticOk) {
		return {
			kind: "typeChecksButThrows",
			runtime: `${r.errorClass}: ${r.message}`,
			static: s.infer,
			signature: template(r.message)
		}
	}
	if (r.errorClass !== "ParseError") {
		return {
			kind: "nonParseError",
			runtime: `${r.errorClass}: ${r.message}`,
			static: s.messages.join(" || "),
			signature: r.errorClass + template(r.message)
		}
	}
	if (s.messages.length === 0) {
		return {
			kind: "staticNoMessage",
			runtime: r.message,
			static: s.errors.join(" || "),
			signature: template(r.message) + "|" + template(s.errors[0])
		}
	}
	if (s.messages.includes(r.message)) return
	if (s.messages.some(m => m.startsWith("<completion>"))) {
		return {
			kind: "completion",
			runtime: r.message,
			static: s.messages.join(" || "),
			signature: template(r.message)
		}
	}
	if (s.messages.some(m => r.message.startsWith(m))) {
		return {
			kind: "messagePrefix",
			runtime: r.message,
			static: s.messages.join(" || "),
			signature: template(r.message)
		}
	}
	return {
		kind: "messageDiffers",
		runtime: r.message,
		static: s.messages.join(" || "),
		signature: template(r.message) + "|" + template(s.messages[0])
	}
}

const isObjectSample = (i: number) => {
	const v = samples[i]?.[1]
	return (typeof v === "object" && v !== null) || typeof v === "function"
}

// every sample runtime allows and TypeScript rejects is an object
const raObjects = (runtimeBits: string, staticBits: string) => {
	for (let i = 0; i < runtimeBits.length; i++) {
		if (runtimeBits[i] === "1" && staticBits[i] === "0" && !isObjectSample(i))
			return false
	}
	return true
}

const sampleName = (i: number) => {
	const v = samples[i][1]
	return (
		v instanceof Date ? `Date(${v.getTime()})`
		: typeof v === "symbol" ? "symbol"
		: typeof v === "function" ? "function"
		: v instanceof Map ? "Map"
		: v instanceof Error ? "Error"
		: v instanceof RegExp ? "RegExp"
		: typeof v === "number" ? String(v)
		: toCode(v)
	)
}

export const evaluate = (
	cases: Case[]
): Map<string, { outcome: Outcome | undefined; r: RuntimeResult }> => {
	const runtime = new Map(cases.map(c => [c.id, runRuntime(c)]))
	const statics = runStatic(cases)
	return new Map(
		cases.map(c => {
			const r = runtime.get(c.id)!
			return [c.id, { outcome: compare(r, statics.get(c.id)!), r }]
		})
	)
}
