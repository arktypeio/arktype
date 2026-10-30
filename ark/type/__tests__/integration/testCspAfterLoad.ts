// loaded before arktype so DynamicFunction extends the proxy
import { csp, evaluatedBodies } from "./csp.ts"

import { scope, type } from "arktype"
import {
	deepStrictEqual,
	notStrictEqual,
	strictEqual
} from "node:assert/strict"
import { cases } from "./util.ts"

// workerd allows eval as a Worker loads, then refuses it within a request
csp.refusesEval = false

const jitless = scope({}, { jitless: true })

const user = { name: "string > 0", age: "number.integer >= 0" } as const
const User = type(user)

const linked = { node: { value: "number", "next?": "node" } } as const
// aliases compile on export, so its root applies compile within the request
const Linked = scope(linked).export()

const loaded = evaluatedBodies.length

csp.refusesEval = true

// any Type, whatever its scope
type Checker = (data: unknown) => unknown

const resultOf = (T: Checker, data: unknown) => {
	const out = T(data)
	return out instanceof type.errors ? out.summary : out
}

const checksAsJitless = (
	T: Checker,
	Jitless: Checker,
	...inputs: unknown[]
) => {
	for (const data of inputs)
		deepStrictEqual(resultOf(T, data), resultOf(Jitless, data))
}

cases({
	compiledAtLoad: () => {
		notStrictEqual(Linked.node.precompilation, undefined)
	},
	jitsWithinRequest: () => {
		const Jitless = jitless.type(user)
		checksAsJitless(
			User,
			Jitless,
			{ name: "a", age: 1 },
			{ name: "", age: 1.5 },
			{ name: "b", age: 2 },
			null
		)
		strictEqual(User.precompilation, undefined)
	},
	appliesCompiledAtLoad: () => {
		const Jitless = scope(linked, { jitless: true }).export()
		checksAsJitless(
			Linked.node,
			Jitless.node,
			{ value: 1, next: { value: 2 } },
			{ value: 1, next: { value: "2" } },
			{ value: 1, next: { value: 2 } }
		)
	},
	exportsWithinRequest: () => {
		const tree = {
			tree: { value: "string.numeric.parse", children: "tree[]" }
		} as const
		const Tree = scope(tree).export().tree
		const Jitless = scope(tree, { jitless: true }).export().tree
		const inputs = [
			{ value: "1", children: [{ value: "2", children: [] }] },
			{ value: "1", children: [{ value: "two", children: [] }] }
		]
		checksAsJitless(Tree, Jitless, ...inputs, ...inputs)
		strictEqual(Tree.precompilation, undefined)
	},
	definesWithinRequest: () => {
		const $ = scope(linked)
		const Pair = $.type(["node", "node"])
		const Jitless = scope(linked, { jitless: true }).type(["node", "node"])
		const inputs = [
			[{ value: 1 }, { value: 2 }],
			[{ value: 1 }, { next: {} }]
		]
		checksAsJitless(Pair, Jitless, ...inputs, ...inputs)
		strictEqual(Pair.precompilation, undefined)
	},
	refusesOnce: () => {
		strictEqual(evaluatedBodies.length, loaded + 1)
	}
})
