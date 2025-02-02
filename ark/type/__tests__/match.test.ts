import { attest, contextualize } from "@ark/attest"
import { hasArkKind, writeUnboundableMessage } from "@ark/schema"
import { match, scope, type } from "arktype"

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

	it("completes case keys", () => {
		attest(() =>
			match({
				// prettier-ignore
				// @ts-expect-error
				"big": () => true
			})
		).completions()
	})

	it("completes default key", () => {
		attest(() =>
			match({
				bigint: () => true,
				// prettier-ignore
				// @ts-expect-error
				"defaul": () => false
			})
		).completions()
	})

	it("completes shallow fluent defs", () => {
		// @ts-expect-error
		attest(() => match.case("WeakS")).completions()
	})

	it("completes object fluent defs", () => {
		attest(() =>
			match.case(
				{
					// @ts-expect-error
					id: "string | numb"
				},
				o => o.id
			)
		).completions()
	})

	it("completes default key", () => {
		attest(() =>
			match({
				bigint: () => true,
				// prettier-ignore
				// @ts-expect-error
				"defaul": () => false
			})
		).completions()
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

	it("prunes subtype cases", () => {
		const m = match({
			"0 < number < 10": function _preservedOne(n) {
				return [0, n]
			},
			// this will never be hit since it is a subtype of a previous case
			"4 < number < 6": function _prunedOne(n) {
				return [1, n]
			},
			number: function _preservedTwo(n) {
				return [2, n]
			},
			default: function _preservedDefault(v) {
				return [3, v]
			}
		})

		attest(m.internal.json).snap({
			branches: [
				{
					in: {
						domain: "number",
						max: { exclusive: true, rule: 10 },
						min: { exclusive: true, rule: 0 }
					},
					morphs: ["$ark._preservedOne"]
				},
				{ in: "number", morphs: ["$ark._preservedTwo"] },
				{ in: {}, morphs: ["$ark._preservedDefault"] }
			],
			ordered: true
		})
	})

	it("discriminates", () => {
		throw new Error()
	})

	describe("at", () => {
		it("unknown allows any key", () => {
			const m = match.at("n").match({
				"0": o => `${o.n} = 0` as const,
				"1": o => `${o.n} = 1` as const,
				default: "never"
			})

			attest<"0 = 0">(m({ n: 0 })).equals("0 = 0")
			attest<"1 = 1">(m({ n: 1 })).equals("1 = 1")

			// @ts-expect-error
			attest(() => m({}))
				.throws.snap("AggregateError: n must be 0 or 1 (was missing)")
				.type.errors.snap()
		})

		it("in", () => {
			const m = match
				.in<{ kind: string }>()
				.at("kind")
				.case("'a'", o => {
					attest<{
						kind: "a"
					}>(o).equals({ kind: "a" })
					return [o.kind]
				})
				.default(o => o.kind)

			attest(m({ kind: "a" })).snap(["a"])
			attest(m({ kind: "b" })).snap("b")

			// @ts-expect-error
			attest(() => m({})).type.errors.snap()
		})

		it("in completions", () => {
			const base = match.in<{ kind: string }>()
			// @ts-expect-error
			attest(() => base.at("")).completions()
		})

		it("keyless in", () => {
			const m = match
				.in<object>()
				.at("foo")
				.match({
					true: t => t,
					default: "assert"
				})

			attest(m).type.toString.snap()
		})

		it("at with cases param", () => {
			const o = match
				.at("foo", {
					string: o => o.foo.length
				})
				.at("bar")
		})

		it("multiple ats", () => {
			// not sure this is a great idea to actually use,
			// but the most natural implementation supports it
			const o = match
				.at("foo", {
					string: o => o.foo.length
				})
				.at()
		})
	})

	it("attached to type", () => {
		attest<typeof match>(type.match).equals(match)
	})

	it("initial case", () => {
		const initial = match.case("string", Number.parseInt).default("assert")
		const expected = match({
			string: Number.parseInt,
			default: "assert"
		})

		// ensure structure is identical
		attest(initial.internal.json).equals(expected.internal.json)
		// ensure we are able to cache ordered unions like from matchers
		attest(initial.internal.id).equals(expected.internal.id)
		// ensure ids are doing what they're suppoed to

		// for some reason TS can't handle initial/expected comparison so we have to cast
		attest(initial === (expected as {})).equals(true)

		// like the uncasted version of the above equality check,
		// uncommenting this also causes an infinite depth issue
		// attest<typeof expected>(initial)

		const expectedTypeSnapshot = "Match<unknown, [(In: string) => number]>"
		attest(initial).type.toString(expectedTypeSnapshot)
		attest(initial).type.toString(expectedTypeSnapshot)
	})

	// it("morph key", () => {
	// 	const parseUrl = match.case({
	// 		"string.url.parse": valid => valid,
	// 		default: () => null
	// 	})

	// 	const url = parseUrl("https://arktype.io")
	// })

	// it("fluent morph", () => {
	// 	const parseUrl = match.case({
	// 		"string.url.parse": valid => valid,
	// 		default: () => null
	// 	})

	// 	const url = parseUrl("https://arktype.io")
	// })
})
