import { config } from "./simpleConfig.ts"

import { schemaScope } from "@ark/schema"
import { scope, type } from "arktype"
import { deepStrictEqual, strictEqual } from "node:assert/strict"
import { cases } from "./util.ts"

cases({
	NaN: () => {
		strictEqual(type("number").allows(Number.NaN), true)
		strictEqual(type.module({ n: "number" }).n.allows(Number.NaN), true)
		strictEqual(
			schemaScope({ n: "number" }).export().n.allows(Number.NaN),
			true
		)
	},
	Infinity: () => {
		strictEqual(type("number").allows(Number.POSITIVE_INFINITY), true)
		strictEqual(type("number").allows(Number.NEGATIVE_INFINITY), true)
	},
	onUndeclaredKey: () => {
		const O = type({ a: "number" })
		const out = O.assert({ a: 1, b: 2 })
		deepStrictEqual(out, { a: 1 })
	},
	shallowLeafKeyword: () => {
		const expected = config.keywords.null.description
		strictEqual(type.null.description, expected)
		strictEqual(type.null(undefined)?.toString(), `must be ${expected}`)
	},
	shallowModuleKeyword: () => {
		const expected = config.keywords.string.description
		strictEqual(type.string.description, expected)
		strictEqual(type.string(5).toString(), `must be ${expected}`)
	},
	deepModuleKeyword: () => {
		const numeric = type.keywords.string.numeric.root
		const expected = config.keywords["string.numeric"].description
		strictEqual(numeric.description, expected)
		strictEqual(numeric("abc").toString(), `must be ${expected}`)
		// configured text replaces the keyword's phrase
		strictEqual(
			numeric.internal.select({ kind: "pattern", method: "assertFind" }).meta
				.keyword,
			undefined
		)
	},
	deepLeafKeyword: () => {
		const pretrimmed = type.keywords.string.trim.preformatted
		const expected = config.keywords["string.trim.preformatted"].description
		strictEqual(pretrimmed.description, expected)
		strictEqual(pretrimmed(" ").toString(), `must be ${expected}`)
	},
	codeMessageIsCustom: () => {
		const T = type({ count: "number % 3", name: "string" })
		const out = T({ count: 4, name: 0 }) as type.errors
		// a summary sets a configured message apart from its path with a colon
		strictEqual(
			out.summary,
			`count: Enter a multiple of 3\nname must be ${config.keywords.string.description}`
		)
		strictEqual(out.issues[0].message, "Enter a multiple of 3")
		strictEqual(type("number % 3")(4).toString(), "Enter a multiple of 3")
	},
	scopeNamedLikeObjectPrototypeMember: () => {
		const types = scope({ root: "string" }, { name: "valueOf" }).export()
		strictEqual(types.root.description, config.keywords.string.description)
	}
})
