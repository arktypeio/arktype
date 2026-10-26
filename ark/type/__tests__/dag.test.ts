import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"
import {
	precompileStandalone,
	writeUnprecompilableMessage
} from "arktype/internal/standalone.ts"

// each level references the one below twice, so written out in full, it
// would be twice as long as the level below
const levels = (
	depth: number,
	name: "string" | "number" | "string | number" = "string",
	$ = scope({})
): type.Any => {
	let T: type.Any = $.type({ name })
	for (let i = 0; i < depth; i++)
		T = $.type({ id: "string", left: T.array(), right: T.array() })
	return T
}

// valid data reaching the bottom level through each right
const rightmost = (depth: number, name: unknown = "Ada"): object => {
	let data: object = { name }
	for (let i = 0; i < depth; i++) data = { id: `${i}`, left: [], right: [data] }
	return data
}

contextualize(() => {
	it("prints a nested type past 1000 characters as ...", () => {
		const T = levels(61)
		attest(T.expression).snap("{ id: string, left: ...[], right: ...[] }")
		attest(T.description).snap("{ id: a string, left: ...[], right: ...[] }")
		attest(T.and({ extra: "string" }).expression).snap(
			"{ extra: string, id: string, left: ...[], right: ...[] }"
		)
	})

	it("compares types whose hashes differ past their prefix", () => {
		const T = levels(60)
		attest(T.equals(levels(60, "string", scope({})))).equals(true)
		attest(T.equals(levels(60, "number"))).equals(false)
		attest(T.extends(levels(60, "string | number"))).equals(true)
		attest(T.allows(rightmost(60))).equals(true)
		attest(T.allows(rightmost(60, 0))).equals(false)
	})

	it("validates data through a type reused at each level", () => {
		const T = levels(10)
		attest(T(rightmost(10))).equals(rightmost(10))
		attest(T(rightmost(10, 0)).toString()).snap(
			"right[0].right[0].right[0].right[0].right[0].right[0].right[0].right[0].right[0].right[0].name must be a string (was a number)"
		)
	})

	it("orders the cases of a union of types reused at each level", () => {
		const T = levels(10)
		const Kinds = type({ kind: "'b'", b: T }).or({ kind: "'a'", a: T })
		attest(Kinds({ kind: "c" }).toString()).snap(
			'kind must be "a" or "b" (was "c")'
		)
	})

	it("precompiles a type reused at each level", () => {
		const lengthAt = (depth: number, opts?: { optimize: "size" }) =>
			precompileStandalone({ T: levels(depth) }, opts).code.length
		// twice the levels, about twice the code
		attest(lengthAt(60) / lengthAt(30)).satisfies("number < 2.2")
		attest(
			lengthAt(60, { optimize: "size" }) / lengthAt(30, { optimize: "size" })
		).satisfies("number < 2.2")
		attest(() =>
			precompileStandalone({ T: levels(20) }, { members: { json: true } })
		).throws(
			writeUnprecompilableMessage(
				"introspection writing out about 272 MB of JSON, as it repeats each Type it references"
			)
		)
	})
})
