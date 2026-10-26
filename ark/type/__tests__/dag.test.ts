import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"
import {
	precompileStandalone,
	writeUnprecompilableMessage
} from "arktype/internal/standalone.ts"

// each level references the one below four times, so written out in full, it
// would be four times as long as the level below. two calls share no nodes.
const levels = (depth: number): type.Any => {
	const $ = scope({})
	let T: type.Any = $.type({ name: "string" })
	for (let i = 0; i < depth; i++) {
		const each = T.array()
		T = $.type({ id: "string", a: each, b: each, c: each, d: each })
	}
	return T
}

// valid data reaching the bottom level through each d
const deepest = (depth: number, name: unknown = "Ada"): object => {
	let data: object = { name }
	for (let i = 0; i < depth; i++)
		data = { id: `${i}`, a: [], b: [], c: [], d: [data] }
	return data
}

contextualize(() => {
	it("prints a nested type past 1000 characters as ...", () => {
		const T = levels(13)
		attest(T.expression).snap(
			"{ a: ...[], b: ...[], c: ...[], d: ...[], id: string }"
		)
		attest(T.description).snap(
			"{ a: ...[], b: ...[], c: ...[], d: ...[], id: a string }"
		)
		attest(T.and({ extra: "string" }).expression).snap(
			"{ a: ...[], b: ...[], c: ...[], d: ...[], extra: string, id: string }"
		)
	})

	it("compares types whose hashes differ past their prefix", () => {
		const T = levels(8)
		// a hash writes a out before id, so a new id changes it only past its prefix
		const withId = (id: "number" | "string | number") =>
			T.omit("id").and({ id })
		attest(T.equals(levels(8))).equals(true)
		attest(T.equals(withId("number"))).equals(false)
		attest(T.extends(withId("string | number"))).equals(true)
		attest(T.allows(deepest(8))).equals(true)
		attest(T.allows(deepest(8, 0))).equals(false)
	})

	it("validates data through a type reused at each level", () => {
		const T = levels(5)
		attest(T(deepest(5))).equals(deepest(5))
		attest(T(deepest(5, 0)).toString()).snap(
			"d[0].d[0].d[0].d[0].d[0].name must be a string (was a number)"
		)
	})

	it("orders the cases of a union of types reused at each level", () => {
		const T = levels(5)
		const Kinds = type({ kind: "'b'", b: T }).or({ kind: "'a'", a: T })
		attest(Kinds({ kind: "c" }).toString()).snap(
			'kind must be "a" or "b" (was "c")'
		)
	})

	it("precompiles a type reused at each level", () => {
		const Shallow = levels(7)
		const Deep = levels(14)
		const lengthOf = (T: type.Any, opts?: { optimize: "size" }) =>
			precompileStandalone({ T }, opts).code.length
		// twice the levels, about twice the code
		attest(lengthOf(Deep) / lengthOf(Shallow)).satisfies("number < 2.2")
		attest(
			lengthOf(Deep, { optimize: "size" }) /
				lengthOf(Shallow, { optimize: "size" })
		).satisfies("number < 2.2")
		attest(() =>
			precompileStandalone({ T: levels(8) }, { members: { json: true } })
		).throws(
			writeUnprecompilableMessage(
				"introspection writing out about 11 MB of JSON, as it repeats each Type it references"
			)
		)
	})
})
