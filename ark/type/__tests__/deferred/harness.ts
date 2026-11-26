import { $ark } from "@ark/schema"
import { hasOwn } from "@ark/util"
import { configure, scope, type } from "arktype"

// what a generated program runs against, in a process of its own: it records
// what each definition throws and calls as it's created and what each Type says
// once it's read, which building it at its call or at its first read must agree on

// what it observes is the definition, so that's at its call
if (process.env.ARK_FUZZ_EAGER) $ark.eagerTypes = true

export { configure, scope, type }

export const sym: symbol = Symbol.for("fuzzed")

// units a definition and its data share
export const unitObject: object = Object.freeze({ a: "x" })
export const unitArray: object = Object.freeze(["x"])

// a RegExp that isn't written as what it matches
export const keyword: RegExp = new (class extends RegExp {
	override toString(): string {
		return "string"
	}
})("^a$")

/** a stable string for any value, where JSON.stringify would lose or reorder it */
const encode = (value: unknown, seen: unknown[] = []): string => {
	if (typeof value === "string") return JSON.stringify(value)
	if (typeof value === "number") return Object.is(value, -0) ? "-0" : `${value}`
	if (typeof value === "bigint") return `${value}n`
	if (typeof value === "symbol") return value.toString()
	if (typeof value === "function") return `function ${value.name}`
	if (typeof value !== "object" || value === null) return `${value}`
	if (value instanceof Date) return `Date(${value.getTime()})`
	if (value instanceof RegExp) return `${value}`
	if (seen.includes(value)) return "(cycle)"
	const within = [...seen, value]
	return Array.isArray(value) ?
			`[${value.map(item => encode(item, within)).join()}]`
		:	`{${Reflect.ownKeys(value)
				.map(
					k =>
						`${String(k)}:${encode((value as Record<PropertyKey, unknown>)[k], within)}`
				)
				.join()}}`
}

// a union of morphs with overlapping inputs can name its branches either way around
const indeterminate =
	/^(An unordered union[^\n]*\n)Left: ([^\n]*)\nRight: ([^\n]*)\n/

const thrown = (e: unknown): string => {
	// an alias without a name is numbered as it's parsed
	const message = (e instanceof Error ? e.message : encode(e)).replace(
		/\btype\d+\b/g,
		"type"
	)
	const sides = indeterminate.exec(message)
	const text =
		sides ? `${sides[1]}${[sides[2], sides[3]].sort().join("\n")}` : message
	return `throws ${e instanceof Error ? e.constructor.name : "value"}: ${text}`
}

const attempt = (read: () => unknown): string => {
	try {
		const result = read()
		return typeof result === "string" ? result : encode(result)
	} catch (e) {
		return thrown(e)
	}
}

const calls: string[] = []

// what a definition called before, which nodes of equal Types can cache apart
const called = new Set<string>()

/** the calls a definition is the first to make */
const firstCalls = (): string[] => {
	const first = [...new Set(calls)].filter(call => !called.has(call)).sort()
	for (const call of first) called.add(call)
	return first
}

const named = <fn extends Function>(name: string, fn: fn): fn =>
	Object.defineProperty(fn, "name", { value: name })

const predicate = (name: string, allows: (data: any) => boolean) =>
	named(name, (data: unknown) => {
		calls.push(`${name}(${encode(data)})`)
		return allows(data)
	})

const morph = (name: string, to: (data: any) => unknown) =>
	named(name, (data: unknown) => {
		calls.push(`${name}(${encode(data)})`)
		return to(data)
	})

const thunk = (name: string, value: () => unknown) =>
	named(name, () => {
		calls.push(`${name}()`)
		return value()
	})

/** functions a definition holds, each named so its reference is the same in any process */
export const f: Record<string, Function> = {
	pass: predicate("pass", () => true),
	fail: predicate("fail", () => false),
	positive: predicate("positive", n => typeof n === "number" && n > 0),
	short: predicate("short", s => typeof s === "string" && s.length < 3),
	hasA: predicate("hasA", o => typeof o === "object" && o !== null && "a" in o),
	toLength: morph("toLength", s => `${s}`.length),
	toBox: morph("toBox", data => ({ boxed: data })),
	toText: morph("toText", data => `${typeof data}`),
	same: morph("same", data => data),
	zero: thunk("zero", () => 0),
	text: thunk("text", () => "x"),
	list: thunk("list", () => []),
	box: thunk("box", () => ({ a: "x" }))
}

type ScopeName = "shadow" | "cyclic" | "strict"

interface Scoped {
	type: Function
	export: () => any
}

const scopes: Record<ScopeName, () => unknown> = {
	// aliases shadowing what a definition is scanned for
	shadow: () => scope({ string: "number", boolean: "'a' | 'b'", id: "string" }),
	cyclic: () =>
		scope({
			user: { name: "string", "friend?": "user" },
			tree: { v: "number", "kids?": "tree[]" },
			trimmed: "string.trim",
			pos: "number > 0"
		}),
	strict: () => scope({ o: { a: "string", "+": "reject" }, n: "number" })
}

const scoped: Partial<Record<ScopeName, Scoped>> = {}

/** a Type parsed in a scope that isn't the one a definition is scanned against */
export const sc = (name: ScopeName, def: unknown): unknown =>
	(scoped[name] ??= scopes[name]() as never).type(def)

/** an alias of one */
export const alias = (name: ScopeName, alias: string): unknown =>
	(scoped[name] ??= scopes[name]() as never).export()[alias]

class Unavailable extends Error {}

const results: unknown[] = []

/** what an earlier statement defined, if it didn't throw */
export const ref = (id: number): unknown => {
	if (!(id in results)) throw new Unavailable()
	return results[id]
}

const events: object[] = []

// a program's only functions, which asking more of would read
const isType = (value: unknown): value is type.Any =>
	typeof value === "function"

const isUnread = (value: unknown) => isType(value) && !hasOwn(value, "kind")

/** forgets a program, where one process defines many to learn which throw */
export const reset = (): void => {
	results.length = 0
	events.length = 0
	called.clear()
}

/** whether it defined anything */
export const define = (id: number, create: () => unknown): boolean => {
	calls.length = 0
	try {
		const result = create()
		// before anything reads it
		const unread = isUnread(result)
		results[id] = result
		events.push({
			id,
			result:
				isType(result) ? "Type"
				: Array.isArray(result) ? `[${result.length},${encode(result[1])}]`
				: typeof result,
			calls: firstCalls(),
			unread
		})
		return true
	} catch (e) {
		if (e instanceof Unavailable) events.push({ id, unavailable: true })
		else events.push({ id, threw: thrown(e), calls: firstCalls() })
		return false
	}
}

let data: (() => unknown)[] = []

/** values to check each Type against, each made anew since a morph can change one */
export const check = (values: (() => unknown)[]): void => {
	data = values
}

const checked = (t: type.Any, datum: unknown): string =>
	`${attempt(() => t.allows(datum))} ${attempt(() => {
		const out = t(datum)
		return out instanceof type.errors ?
				`errors ${out.summary}`
			:	`${out === datum ? "same" : "out"} ${encode(out)}`
	})}`

// a first read is whatever a program does first with a Type
const firstReads: Record<string, (t: type.Any) => unknown> = {
	expression: t => t.expression,
	description: t => t.description,
	json: t => t.json,
	call: t => t(undefined),
	allows: t => t.allows("a"),
	assert: t => t.assert({}),
	in: t => t.in,
	equals: t => t.equals(type.raw("string")),
	keys: t => Object.keys(t)
}

// what holds an alias orders a union's branches by the number the alias is
// registered with, and an intersection's operands by their nodes' ids: each
// counts what was built before it, so what it says is compared in any order
const aliased = (t: type.Any): boolean => {
	try {
		return t.internal.hasAlias
	} catch {
		// one that can't be built says nothing to order
		return false
	}
}

export const read = (id: number, first: string): void => {
	if (!(id in results)) return void events.push({ id, unavailable: true })
	const t = results[id]
	if (!isType(t)) return void events.push({ id, read: null })
	const firstRead = attempt(() => void firstReads[first](t))
	const cold = data.map(make => checked(t, make()))
	const warm = data.map(make => checked(t, make()))
	events.push({
		id,
		aliased: aliased(t),
		read: {
			firstRead,
			expression: attempt(() => t.expression),
			description: attempt(() => t.description),
			json: attempt(() => JSON.stringify(t.json)),
			in: attempt(() => t.in.expression),
			out: attempt(() => t.out.expression),
			jsonSchema: attempt(() => JSON.stringify(t.toJsonSchema())),
			keyof: attempt(() => t.internal.keyof().expression),
			cold,
			// compiled from its second use
			warm: warm.map((result, i) => (result === cold[i] ? "" : result))
		}
	})
}

const fixed = ["string", "number", "object", "unknown", "string[]"]

/** how Types relate, once nothing more is defined */
export const relate = (pairs: [number, number][]): void => {
	for (const [l, r] of pairs) {
		const a = results[l]
		const b = results[r]
		if (!isType(a) || !isType(b)) continue
		events.push({
			relate: [l, r],
			equals: attempt(() => a.equals(b)),
			extends: attempt(() => a.extends(b)),
			extended: attempt(() => b.extends(a)),
			and: attempt(() => a.and(b).expression),
			or: attempt(() => a.or(b).expression),
			aliased: aliased(a) || aliased(b)
		})
	}
	const bases = fixed.map(def => type.raw(def))
	for (const [id, t] of results.entries()) {
		if (!isType(t)) continue
		events.push({
			id,
			fixed: bases.map(
				base =>
					`${attempt(() => t.extends(base))} ${attempt(() => base.extends(t))}`
			)
		})
	}
	process.stdout.write(JSON.stringify(events))
}
