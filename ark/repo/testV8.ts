import { fromHere } from "@ark/fs"
import type { ArkErrors, BaseNode } from "@ark/schema"
import { scope, type } from "arktype"

// natives are parsed from these strings, so only the process needs
// --allow-natives-syntax
const hasFastProperties = new Function("o", "return %HasFastProperties(o)") as (
	o: object
) => boolean
const haveSameMap = new Function("a", "b", "return %HaveSameMap(a, b)") as (
	a: object,
	b: object
) => boolean

console.log(
	"⏱️  Checking for V8 fast properties (https://v8.dev/blog/fast-properties) on Type...\n"
)

const T = type({
	name: "string",
	age: "number"
})

let fastType: boolean

try {
	fastType = hasFastProperties(T)
} catch {
	throw new Error(`This test must be run in a V8-based runtime with the --allow-natives-syntax flag, e.g.:
node --allow-natives-syntax ${fromHere()}`)
}

if (!fastType) throw new Error("⚠️  Type instance has been deoptimized.")

console.log("🏎️  Type instance has fast properties!\n")

console.log("⏱️  Checking that every node of a kind has one V8 map...\n")

// each checked kind occurs with and without some inner key, e.g. a pattern's flags
const definitions: unknown[] = [
	T,
	{ name: "string", "nickname?": "string", rank: "number = 1", "+": "reject" },
	{ id: "string", count: ["number", "=", 0], "flags?": "string[]" },
	{ "[string]": "number" },
	{ "[string]": "string", "[symbol]": "number" },
	["string", "number?", "boolean?"],
	["string", "...", "number[]", "boolean"],
	"(number % 2) | 'even' | null",
	"(number % 3) < 10",
	"0 < number <= 100",
	"number >= 1 | bigint",
	"string <= 5",
	"string < 10",
	"/^a/ | Date | Map",
	/^b/i,
	type("'x'").describe("an x"),
	"string.trim",
	type("string").pipe(s => s.length)
]

const checkedKinds = [
	"intersection",
	"structure",
	"required",
	"optional",
	"defaulted optional",
	"index",
	"sequence",
	"union",
	"morph",
	"domain",
	"unit",
	"proto",
	"min",
	"max",
	"minLength",
	"maxLength",
	"divisor",
	"pattern"
]

// a default is a key only of the optional nodes that have one
const groupOf = (node: BaseNode): string =>
	node.is("optional") && node.hasDef() ? "defaulted optional" : node.kind

const nodesByKind: Record<string, Set<BaseNode>> = {}
for (const def of definitions) {
	for (const node of type.raw(def).internal.references)
		(nodesByKind[groupOf(node)] ??= new Set()).add(node)
}

for (const kind of checkedKinds) {
	if ((nodesByKind[kind]?.size ?? 0) < 2)
		throw new Error(`Expected at least two ${kind} nodes to compare.`)
}

const assertOneMapPerKind = (when: string): void => {
	for (const [kind, nodes] of Object.entries(nodesByKind)) {
		const [first, ...rest] = nodes
		for (const node of nodes) {
			if (!hasFastProperties(node))
				throw new Error(`⚠️  A ${kind} node has slow properties ${when}.`)
		}
		for (const node of rest) {
			if (!haveSameMap(first, node)) {
				throw new Error(
					`⚠️  ${kind} nodes ${first.expression} and ${node.expression} have different maps ${when}.`
				)
			}
		}
	}
}

assertOneMapPerKind("after construction")

// a getter that adds a slot splits the read nodes' map from the first node's
for (const nodes of Object.values(nodesByKind)) {
	for (const node of [...nodes].slice(1)) {
		void node.description
		void node.in
		void node.out
		if (node.is("sequence")) void node.element
		if (node.is("optional")) void node.outProp
	}
}

assertOneMapPerKind("after reading cached getters")

// a Type is compiled when it's called again, binding its nodes' traversals
for (const [i, def] of definitions.entries()) {
	if (i % 2 === 0) continue
	const t = type.raw(def)
	t(undefined)
	t(undefined)
}

// a unit binds only the nodes its code calls, so the rest of these kinds
// are compiled inline, binding none
for (const kind of ["intersection", "structure", "union", "morph", "unit"]) {
	const bound = [...nodesByKind[kind]].filter(node => node.unitFn)
	if (!bound.length || bound.length === nodesByKind[kind].size)
		throw new Error(`Expected both bound and unbound ${kind} nodes to compare.`)
}

assertOneMapPerKind("after binding some of them")

const uncalledCaches = Object.values(nodesByKind).flatMap(nodes =>
	[...nodes].filter(node => !("rootApply" in node.c)).map(node => node.c)
)
for (const cache of uncalledCaches) {
	if (!haveSameMap(uncalledCaches[0], cache))
		throw new Error("⚠️  Bound and unbound nodes' caches have different maps.")
}

console.log(
	`🏎️  ${Object.keys(nodesByKind).length} node kinds each have one map!`
)

console.log(
	"\n⏱️  Checking that ArkErrors have one V8 map per kind: eager, unread and read...\n"
)

let emptyErrors!: ArkErrors
type("unknown").narrow((data, ctx) => {
	emptyErrors = ctx.errors
	return true
})(0)

const failing = (t: (data: unknown) => unknown, data: unknown): ArkErrors => {
	const result = t(data)
	if (!(result instanceof type.errors))
		throw new Error(`Expected ${t} to fail on ${data}.`)
	return result
}

const readEagerErrors = failing(
	type("string").pipe(s => s),
	0
)
void readEagerErrors.summary

const readErrors = [
	failing(type("string"), 0),
	failing(type({ a: "string" }), {})
]
for (const errors of readErrors) void errors.summary

// a Type calling no user code finds its errors' issues when they're first read
const errorsByKind: Record<string, ArkErrors[]> = {
	eager: [
		emptyErrors,
		failing(
			type("string").pipe(s => s),
			0
		),
		failing(
			type({ a: "string" }).narrow(() => true),
			{}
		),
		readEagerErrors
	],
	unread: [
		failing(type("string"), 0),
		failing(type({ a: "string", b: "string", c: "string" }), {}),
		failing(type("number[]"), Array.from({ length: 20 }, String))
	],
	read: readErrors
}

for (const [kind, errors] of Object.entries(errorsByKind)) {
	for (const e of errors) {
		if (!haveSameMap(errors[0], e)) {
			throw new Error(
				`⚠️  ${kind} ArkErrors with ${e.count} errors has a different map.`
			)
		}
	}
}

console.log("🏎️  ArkErrors have one map per kind!")

console.log(
	"\n⏱️  Checking that resolved scope configs have fast properties...\n"
)

const configs = {
	"the default scope": type("string").internal.$.cfg,
	"a configured scope": scope({}, { exactOptionalPropertyTypes: false }).type(
		"string"
	).internal.$.cfg
}

for (const [name, config] of Object.entries(configs)) {
	if (!hasFastProperties(config))
		throw new Error(`⚠️  The resolved config of ${name} has slow properties.`)
}

console.log("🏎️  Resolved scope configs have fast properties!")
