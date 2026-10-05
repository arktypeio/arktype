import { fromHere } from "@ark/fs"
import { type } from "arktype"

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
	{ name: "string", "nickname?": "string", "+": "reject" },
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

const nodesByKind = {}
for (const def of definitions) {
	for (const node of type(def).internal.references)
		(nodesByKind[node.kind] ??= new Set()).add(node)
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
		if (node.hasKind("sequence")) node.element
		if (node.hasKind("optional")) node.outProp
	}
}

assertOneMapPerKind("after reading cached getters")

console.log(
	`🏎️  ${Object.keys(nodesByKind).length} node kinds each have one map!`
)
