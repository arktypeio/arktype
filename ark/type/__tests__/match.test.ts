import { attest, contextualize } from "@ark/attest"
import { hasArkKind, writeUnboundableMessage } from "@ark/schema"
import { match, scope } from "arktype"

contextualize(() => {
	it("single object", () => {
		const sizeOf = match({
			"string|Array": v => v.length,
			number: v => v,
			bigint: v => v,
			default: "assert"
		})

		attest<number>(sizeOf("abc")).equals(3)
		attest<number>(sizeOf([1, 2, 3])).equals(3)
		attest<bigint>(sizeOf(5n)).equals(5n)

		const getBad = () => sizeOf(true)
		attest<() => never>(getBad)
		attest(getBad).throws.snap(
			"AggregateError: must be a string or an object, a number or a bigint (was boolean)"
		)
	})

	it("properly infers types of inputs/outputs based on chained", () => {
		const matcher = match({ string: s => s, number: n => n })
			.case("boolean", b => b)
			.default("assert")

		// properly infers the type of the output based on the input
		attest<string>(matcher("abc")).equals("abc")
		attest<number>(matcher(4)).equals(4)
		attest<boolean>(matcher(true)).equals(true)

		// and properly handles unions in the input type
		attest<string | number>(matcher(0 as string | number))

		const getBad = () => matcher(null)
		attest<() => never>(getBad)
		attest(getBad).throws.snap(
			"AggregateError: must be a string, a number, false or true (was null)"
		)
	})

	it("multiple case blocks", () => {
		const m = match({
			"1": n => n,
			"2": n => n + 2
		}).match({
			"3": n => n + 3,
			default: "assert"
		})

		attest<1>(m(1)).equals(1)
		attest<number>(m(2)).equals(4)
		attest<number>(m(3)).equals(6)
		attest(m).type.toString.snap()
	})

	it("default value", () => {
		const m = match({
			string: s => s.length,
			default: v => v
		})

		attest(m("foo")).equals(3)
		attest(m(5)).equals(5)

		attest(m).type.toString.snap()
	})

	it("never", () => {
		const m = match({
			string: s => s.length,
			default: "never"
		})

		attest(m("foo")).equals(3)

		attest(m).type.toString.snap()
	})

	it("within scope", () => {
		const threeSixtyNoScope = scope({ three: "3", sixty: "60", no: "'no'" })

		let threeCount = 0
		let sixtyCount = 0

		const matcher = threeSixtyNoScope
			.match({
				three: three => {
					threeCount++
					attest<3>(three)
					return 3
				}
			})
			.case("sixty", sixty => {
				sixtyCount++
				attest<60>(sixty)
				return 60
			})
			.default("assert")

		// for assertions
		matcher(3)
		matcher(60)

		attest(threeCount).equals(1)
		attest(sixtyCount).equals(1)
	})

	it("properly propagates errors from invalid type definitions in `when`", () => {
		// @ts-expect-error
		attest(() => match({}).case("strong", s => s)).type.errors(
			"'strong' is unresolvable"
		)
	})

	it("properly propagates errors from invalid type definitions in `cases`", () => {
		// @ts-expect-error
		attest(() => match({ strong: s => s })).type.errors(
			"'strong' is unresolvable"
		)
	})

	it("semantic error in case", () => {
		attest(() =>
			match({
				// @ts-expect-error
				"boolean < 5": () => true
			})
		).throwsAndHasTypeError(writeUnboundableMessage("boolean"))
	})

	it("does not accept invalid inputs at a type-level", () => {
		const matcher = match
			.in<string | number>()
			.case("string", s => s)
			.case("number", n => n)
			.default("never")

		// @ts-expect-error
		attest(() => matcher(true))
			.throws.snap("AggregateError: must be a string or a number (was boolean)")
			.type.errors(
				"Argument of type 'true' is not assignable to parameter of type 'string | number'"
			)
	})

	it("from exhaustive", () => {
		const matcher = match
			.in("string | number")
			.match({
				string: s => s,
				number: n => n
			})
			.default("assert")

		attest(matcher).type.toString()

		// @ts-expect-error
		attest(() => matcher(true))
			.throws.snap("AggregateError: must be a string or a number (was boolean)")
			.type.errors(
				"Argument of type 'true' is not assignable to parameter of type 'string | number'"
			)
	})

	it("argless `in` type error", () => {
		// @ts-expect-error
		attest(() => match.in()).type.errors("Expected 1 arguments, but got 0")
	})

	it("allows ordered overlapping", () => {
		const m = match({
			"0 < number < 10": n => [0, n],
			"number > 0": n => [1, n],
			number: n => [2, n],
			default: v => [3, v]
		})

		if (!hasArkKind(m, "root")) throw new Error(`Matcher was not a  node`)

		attest(m.json).snap({
			branches: [
				{
					in: {
						domain: "number",
						max: { exclusive: true, rule: 10 },
						min: { exclusive: true, rule: 0 }
					},
					morphs: ["$ark.fn16"]
				},
				{
					in: { domain: "number", min: { exclusive: true, rule: 0 } },
					morphs: ["$ark.fn17"]
				},
				{ in: "number", morphs: ["$ark.number"] },
				{ in: {}, morphs: ["$ark.default"] }
			],
			ordered: true
		})

		attest(m(5)).equals([0, 5])
		attest(m(11)).equals([1, 11])
		attest(m(0)).equals([2, 0])
		attest(m(undefined)).equals([3, undefined])
	})

	it("introspectable", () => {
		// TODO: allow assert variant to be a Type
		throw new Error()
	})

	it("prunes subtype cases", () => {
		const m = match({
			"0 < number < 10": n => [0, n],
			// this will never be hit since it is a subtype of a previous case
			"4 < number < 6": n => [1, n],
			number: n => [2, n],
			default: v => [3, v]
		})

		if (!hasArkKind(m, "root")) throw new Error(`Matcher was not a  node`)

		attest(m.json).snap({
			branches: [
				{
					in: {
						domain: "number",
						max: { exclusive: true, rule: 10 },
						min: { exclusive: true, rule: 0 }
					},
					morphs: ["$ark.fn16"]
				},
				{ in: "number", morphs: ["$ark.number"] },
				{ in: {}, morphs: ["$ark.default"] }
			],
			ordered: true
		})
	})

	it("discriminates", () => {
		throw new Error()
	})

	it("at unknown", () => {
		const m = match.at("foo").match({
			"'bar'": o => {}
		})
	})

	it("at", () => {
		match.in<{ kind: string }>()
	})
})
