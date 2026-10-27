import { fromHere } from "@ark/fs"
import { scope, type } from "arktype"

console.log(
	"⏱️  Checking for V8 fast properties (https://v8.dev/blog/fast-properties) on Type...\n"
)

const T = type({
	name: "string",
	age: "number"
})

let hasFastProperties

try {
	hasFastProperties = eval("%HasFastProperties(T)")
} catch {
	throw new Error(`This test must be run in a V8-based runtime with the --allow-natives-syntax flag, e.g.:
node --allow-natives-syntax ${fromHere()}`)
}

if (!hasFastProperties) {
	throw new Error("⚠️  Type instance has been deoptimized.")
}

console.log("🏎️  Type instance has fast properties!\n")

console.log("⏱️  Checking that every node of a kind has one V8 map...\n")

// each checked kind occurs with and without some inner key, e.g. a pattern's flags
const definitions = [
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
const groupOf = node =>
	node.is("optional") && node.hasDef() ?
		"defaulted optional"
	:	node.kind

const nodesByKind = {}
for (const def of definitions) {
	for (const node of type(def).internal.references)
		(nodesByKind[groupOf(node)] ??= new Set()).add(node)
}

for (const kind of checkedKinds) {
	if ((nodesByKind[kind]?.size ?? 0) < 2)
		throw new Error(`Expected at least two ${kind} nodes to compare.`)
}

const assertOneMapPerKind = when => {
	for (const [kind, nodes] of Object.entries(nodesByKind)) {
		const [first, ...rest] = nodes
		for (const node of nodes) {
			if (!eval("%HasFastProperties(node)"))
				throw new Error(`⚠️  A ${kind} node has slow properties ${when}.`)
		}
		for (const node of rest) {
			if (!eval("%HaveSameMap(first, node)")) {
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
		node.description
		node.in
		node.out
		if (node.is("sequence")) node.element
		if (node.is("optional")) node.outProp
	}
}

assertOneMapPerKind("after reading cached getters")

// a Type is compiled when it's called again, binding its nodes' traversals
for (const [i, def] of definitions.entries()) {
	if (i % 2 === 0) continue
	const t = type(def)
	t(undefined)
	t(undefined)
}

// these Types compile their divisor and pattern nodes inline, binding none
for (const kind of checkedKinds) {
	if (kind === "divisor" || kind === "pattern") continue
	const bound = [...nodesByKind[kind]].filter(node => node.unitFn)
	if (!bound.length || bound.length === nodesByKind[kind].size)
		throw new Error(`Expected both bound and unbound ${kind} nodes to compare.`)
}

assertOneMapPerKind("after binding some of them")

const uncalledCaches = Object.values(nodesByKind).flatMap(nodes =>
	[...nodes]
		.filter(node => !("rootApply" in node.c))
		.map(node => node.c)
)
for (const cache of uncalledCaches) {
	if (!eval("%HaveSameMap(uncalledCaches[0], cache)"))
		throw new Error("⚠️  Bound and unbound nodes' caches have different maps.")
}

console.log(
	`🏎️  ${Object.keys(nodesByKind).length} node kinds each have one map!`
)

console.log(
	"\n⏱️  Checking that ArkErrors have one V8 map per kind: eager, unread and read...\n"
)

let emptyErrors
type("unknown").narrow((data, ctx) => {
	emptyErrors = ctx.errors
	return true
})(0)

const readEagerErrors = type("string").pipe(s => s)(0)
readEagerErrors.summary

const readErrors = [type("string")(0), type({ a: "string" })({})]
for (const errors of readErrors) errors.summary

// a Type calling no user code finds its errors' issues when they're first read
const errorsByKind = {
	eager: [
		emptyErrors,
		type("string").pipe(s => s)(0),
		type({ a: "string" }).narrow(() => true)({}),
		readEagerErrors
	],
	unread: [
		type("string")(0),
		type({ a: "string", b: "string", c: "string" })({}),
		type("number[]")(Array.from({ length: 20 }, String))
	],
	read: readErrors
}

for (const [kind, errors] of Object.entries(errorsByKind)) {
	for (const e of errors) {
		if (!eval("%HaveSameMap(errors[0], e)"))
			throw new Error(
				`⚠️  ${kind} ArkErrors with ${e.count} errors has a different map.`
			)
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
	if (!eval("%HasFastProperties(config)"))
		throw new Error(`⚠️  The resolved config of ${name} has slow properties.`)
}

console.log("🏎️  Resolved scope configs have fast properties!")
