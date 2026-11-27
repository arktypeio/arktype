import { attest, contextualize } from "@ark/attest"
import {
	registeredReference,
	throwOnDefault,
	writeUnboundableMessage,
	type ArkErrors,
	type BaseRoot
} from "@ark/schema"
import { match, scope, type } from "arktype"
import type { Out } from "arktype/internal/attributes.ts"
import { doubleAtMessage, type Match } from "arktype/internal/match.ts"
import { discriminantJsonOf } from "arksets/internal"

const throwDefaultRef = registeredReference(throwOnDefault)

// a case's morph is inline, so its reference is read from the matcher by name
const caseReference = (m: { internal: BaseRoot }, name: string) =>
	registeredReference(
		m.internal.select({
			kind: "morph",
			where: morph => morph.piped[0].name === name,
			method: "assertFind"
		}).piped[0]
	)

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
			"TraversalError: must be a number, a bigint, a string or an array"
		)
	})

	it("completes case keys", () => {
		attest(() =>
			match({
				// prettier-ignore
				// @ts-expect-error
				"big": () => true
			})
		).completions({ big: ["bigint"] })
	})

	it("completes default key", () => {
		attest(() =>
			match({
				bigint: () => true,
				// prettier-ignore
				// @ts-expect-error
				"defaul": () => false
			})
		).completions({ defaul: ["default"] })
	})

	it("completes shallow fluent defs", () => {
		// @ts-expect-error
		attest(() => match.case("WeakS")).completions({ WeakS: ["WeakSet"] })
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
		).completions({ "string | numb": ["string | number"] })
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
			"TraversalError: must be a string, a number or boolean"
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
		attest(m).type.toString.snap(`Match<
	unknown,
	[(In: 1) => 1, (In: 2) => number, (In: 3) => number]
>`)
	})

	it("default value", () => {
		const m = match({
			string: s => s.length,
			default: v => v
		})

		attest(m("foo")).equals(3)
		attest(m(5)).equals(5)

		attest(m).type.toString.snap(`Match<
	unknown,
	[(In: string) => number, (v: unknown) => unknown]
>`)
	})

	it("never", () => {
		const m = match({
			string: s => s.length,
			default: "never"
		})

		attest(m("foo")).equals(3)

		attest(m).type.toString.snap("Match<string, [(In: string) => number]>")
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
			.throws.snap("TraversalError: must be a string or a number")
			.type.errors(
				"Argument of type 'boolean' is not assignable to parameter of type 'string | number'"
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

		attest(matcher).type.toString.snap(`Match<
	string | number,
	[(In: number) => number, (In: string) => string]
>`)

		// @ts-expect-error
		attest(() => matcher(true))
			.throws.snap("TraversalError: must be a number or a string")
			.type.errors(
				"Argument of type 'boolean' is not assignable to parameter of type 'string | number'"
			)
	})

	it("argless `in` type error", () => {
		// @ts-expect-error
		attest(() => match.in()).type.errors("Expected 1 arguments, but got 0")
	})

	it("allows ordered overlapping", () => {
		const m = match({
			"0 < number < 10": function _matchOverlapping1(n) {
				return [0, n]
			},
			// this will never be hit since it is a subtype of a previous case
			"number > 0": function _matchOverlapping2(n) {
				return [1, n]
			},
			number: function _matchOverlapping3(n) {
				return [2, n]
			},
			default: function _matchOverlapping4(v) {
				return [3, v]
			}
		})

		attest(m.internal.json).snap({
			branches: [
				{
					morphs: [
						{
							domain: "number",
							max: { exclusive: true, rule: 10 },
							min: { exclusive: true, rule: 0 }
						},
						caseReference(m, "_matchOverlapping1")
					]
				},
				{
					morphs: [
						{ domain: "number", min: { exclusive: true, rule: 0 } },
						caseReference(m, "_matchOverlapping2")
					]
				},
				{ morphs: ["number", caseReference(m, "_matchOverlapping3")] },
				{ morphs: [{}, caseReference(m, "_matchOverlapping4")] }
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
			"0 < number < 10": function _matchPreservedOne(n) {
				return [0, n]
			},
			// this will never be hit since it is a subtype of a previous case
			"4 < number < 6": function _matchPrunedOne(n) {
				return [1, n]
			},
			number: function _matchPreservedTwo(n) {
				return [2, n]
			},
			default: function _matchPreservedDefault(v) {
				return [3, v]
			}
		})

		attest(m.internal.json).snap({
			branches: [
				{
					morphs: [
						{
							domain: "number",
							max: { exclusive: true, rule: 10 },
							min: { exclusive: true, rule: 0 }
						},
						caseReference(m, "_matchPreservedOne")
					]
				},
				{ morphs: ["number", caseReference(m, "_matchPreservedTwo")] },
				{ morphs: [{}, caseReference(m, "_matchPreservedDefault")] }
			],
			ordered: true
		})
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
				.throws.snap("TraversalError: n must be 0 or 1")
				.type.errors.snap(
					"Argument of type '{}' is not assignable to parameter of type '{ n: 0; } | { n: 1; }'."
				)
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
			attest(() => m({})).type.errors("Property 'kind' is missing")
		})

		it("in completions", () => {
			const base = match.in<{ kind: string }>()
			// @ts-expect-error
			attest(() => base.at("")).completions({ "": ["kind"] })
		})

		it("keyless in", () => {
			const m = match
				.in<object>()
				.at("foo")
				.match({
					true: t => t,
					default: "assert"
				})

			attest(m).type.toString.snap(`Match<
	object,
	[(In: { foo: true }) => { foo: true }]
>`)
		})

		it("at with cases param", () => {
			const m = match.at("foo", {
				string: function _atCasesParam1(o) {
					return o.foo.length
				},
				number: function _atCasesParam2(o) {
					return `${o.foo + 1}`
				},
				default: "never"
			})

			attest(m.internal.json).snap({
				branches: [
					{
						morphs: [
							{
								required: [{ key: "foo", value: "string" }],
								domain: "object"
							},
							caseReference(m, "_atCasesParam1")
						]
					},
					{
						morphs: [
							{
								required: [{ key: "foo", value: "number" }],
								domain: "object"
							},
							caseReference(m, "_atCasesParam2")
						]
					}
				],
				ordered: true,
				meta: { onFail: throwDefaultRef }
			})
			attest(m).type.toString.snap(`Match<
	{ foo: string } | { foo: number },
	[
		(In: { foo: number }) => string,
		(In: { foo: string }) => number
	]
>`)
		})

		it("at after in", () => {
			const m = match
				.in<{ id: 0 | 1 | 2 }>()
				.at("id")
				.match({
					"0": function _atAfterIn1(o) {
						return o.id
					},
					// correctly inferred
					number: function _atAfterIn2(o) {
						return o.id
					},
					default: "never"
				})

			attest(m.internal.json).snap({
				branches: [
					{
						morphs: [
							{
								required: [{ key: "id", value: { unit: 0 } }],
								domain: "object"
							},
							caseReference(m, "_atAfterIn1")
						]
					},
					{
						morphs: [
							{
								required: [{ key: "id", value: "number" }],
								domain: "object"
							},
							caseReference(m, "_atAfterIn2")
						]
					}
				],
				ordered: true,
				meta: { onFail: throwDefaultRef }
			})
			attest(m).type.toString.snap(`Match<
	{ id: 0 } | { id: 0 | 1 | 2 },
	[
		(In: { id: 0 }) => 0,
		(In: { id: 0 | 1 | 2 }) => 0 | 1 | 2
	]
>`)
		})

		// https://github.com/arktypeio/arktype/issues/1288
		it("infers handler parameter for literal and union keys in at(key, cases)", () => {
			const numLit = match
				.in<{ id: 0 | 1 | 2 }>()
				.at("id", {
					"0": o => {
						attest<{ id: 0 }>(o)
						return o.id
					},
					number: o => {
						attest<{ id: 0 | 1 | 2 }>(o)
						return o.id
					}
				})
				.default("never")

			attest<0 | 1 | 2>(numLit({ id: 0 })).equals(0)
			attest<0 | 1 | 2>(numLit({ id: 1 })).equals(1)

			const unquotedNum = match
				.in<{ id: 0 | 1 | 2 }>()
				.at("id", {
					0: o => {
						attest<{ id: 0 }>(o)
						return o.id
					},
					"1 | 2": o => {
						attest<{ id: 1 | 2 }>(o)
						return o.id
					}
				})
				.default("never")

			attest<0>(unquotedNum({ id: 0 })).equals(0)
			attest<1 | 2>(unquotedNum({ id: 2 })).equals(2)

			const partialUnquoted = match
				.in<{ id: 0 | 1 }>()
				.at("id", {
					0: () => "zero" as const
				})
				.default("never")
			attest<"zero">(partialUnquoted({ id: 0 })).equals("zero")
			// @ts-expect-error unquoted numeric key 0 must not widen to cover 1
			attest(() => partialUnquoted({ id: 1 })).type.errors(
				"Type '1' is not assignable to type '0'"
			)

			type OptionalTag = { kind?: "a"; a: string } | { kind: "b"; b: number }
			const optTagged = match
				.in<OptionalTag>()
				.at("kind", {
					"'b'": o => {
						attest<{ kind: "b"; b: number }>(o)
						return o.b
					}
				})
				.default(() => -1)
			attest<number>(optTagged({ kind: "b", b: 7 })).equals(7)
			attest<number>(optTagged({ kind: "a", a: "hi" })).equals(-1)

			type Tagged = { kind: "a"; a: string } | { kind: "b"; b: number }
			const strLit = match
				.in<Tagged>()
				.at("kind", {
					"'a'": o => {
						attest<{ kind: "a"; a: string }>(o)
						return o.a
					},
					"'b'": o => {
						attest<{ kind: "b"; b: number }>(o)
						return o.b
					}
				})
				.default("never")

			attest<string>(strLit({ kind: "a", a: "hi" })).equals("hi")
			attest<number>(strLit({ kind: "b", b: 42 })).equals(42)

			const boolLit = match
				.in<{ ok: boolean }>()
				.at("ok", {
					true: o => {
						attest<{ ok: true }>(o)
						return "yes" as const
					},
					false: o => {
						attest<{ ok: false }>(o)
						return "no" as const
					}
				})
				.default("never")

			attest<"yes">(boolLit({ ok: true })).equals("yes")
			attest<"no">(boolLit({ ok: false })).equals("no")

			const unionLit = match
				.in<{ code: "a" | "b" | 0 | 1 }>()
				.at("code", {
					"'a' | 0": o => {
						attest<{ code: "a" | 0 }>(o)
						return o.code
					},
					"'b' | 1": o => {
						attest<{ code: "b" | 1 }>(o)
						return o.code
					}
				})
				.default("never")

			attest<"a" | 0>(unionLit({ code: "a" })).equals("a")
			attest<"a" | 0>(unionLit({ code: 0 })).equals(0)
			attest<"b" | 1>(unionLit({ code: 1 })).equals(1)

			// without .in()
			const untyped = match
				.at("id", {
					"0": o => {
						attest<{ id: 0 }>(o)
						return o.id
					},
					"'x'": o => {
						attest<{ id: "x" }>(o)
						return o.id
					}
				})
				.default("never")

			attest<0>(untyped({ id: 0 })).equals(0)
			attest<"x">(untyped({ id: "x" })).equals("x")

			// invalid case key still reports error and completions
			attest(() =>
				match.in<{ id: 0 | 1 }>().at("id", {
					// @ts-expect-error
					strong: () => true
				})
			).type.errors("'strong' is unresolvable")

			attest(() =>
				match.in<{ id: 0 | 1 }>().at("id", {
					// prettier-ignore
					// @ts-expect-error
					"big": () => true
				})
			).completions({ big: ["bigint"] })
		})

		it("multiple ats", () => {
			attest(() => {
				match
					.at("foo", {
						string: o => o.foo.length
					})
					// @ts-expect-error
					.at("bar")
			}).throwsAndHasTypeError(doubleAtMessage)
		})
	})

	it("attached to type", () => {
		attest<typeof match>(type.match).equals(match)
	})

	it("initial case", () => {
		const Initial = match.case("string", Number.parseInt).default("assert")

		const Expected = match({
			string: Number.parseInt,
			default: "assert"
		})

		// ensure structure is identical
		attest(Initial.internal.json).equals(Expected.internal.json)
		// ensure we are able to cache ordered unions like from matchers
		attest(Initial.internal.id).equals(Expected.internal.id)
		// ensure ids are doing what they're suppoed to

		// for some reason TS can't handle initial/expected comparison so we have to cast
		attest(Initial === (Expected as {})).equals(true)

		// like the uncasted version of the above equality check,
		// uncommenting this also causes an infinite depth issue
		// attest<typeof Expected>(initial)

		const expectedTypeSnapshot = "Match<unknown, [(In: string) => number]>"
		attest(Initial).type.toString(expectedTypeSnapshot)
		attest(Initial).type.toString(expectedTypeSnapshot)
	})

	it("reference in object", () => {
		const m = match({
			string: s => s.length,
			default: "assert"
		})

		const T = type({
			foo: m
		})

		attest<{
			foo: (In: string) => Out<number>
		}>(T.t)
		attest(T.expression).snap("{ foo: (In: string) => Out<unknown> }")
		attest(T({ foo: "foo" })).equals({ foo: 3 })
		attest(T({ foo: 5 }).toString()).snap("foo must be a string")
	})

	it("morph key", () => {
		const parseNum = match({
			"string.numeric.parse": function _matchMorphKey1(valid) {
				return valid
			},
			default: function _matchMorphKey2() {
				return null
			}
		})

		attest<number | null>(parseNum("12.34")).equals(12.34)
		attest<null>(parseNum(12.34)).equals(null)
	})

	it("fluent morph", () => {
		const parseInt = match
			.case("string.integer.parse", function _matchFluentMorph1(valid) {
				return valid
			})
			.default(function _matchFluentMorph2() {
				return null
			})

		attest<number | null>(parseInt("1234")).equals(1234)
		attest<null>(parseInt(1234)).equals(null)
	})

	it("accounts for ordering during discrimination", () => {
		const m = match
			.case(
				{
					id: "string"
				},
				function _matchOrderedDiscrimination1(o) {
					return o.id
				}
			)
			.case(
				{
					kind: "'string'"
				},
				function _matchOrderedDiscrimination2(o) {
					return o.kind
				}
			)
			.case(
				{
					kind: "'number'"
				},
				function _matchOrderedDiscrimination3(o) {
					return o.kind
				}
			)
			.case(
				{
					id: "number"
				},
				function _matchOrderedDiscrimination4(o) {
					return o.id
				}
			)
			.default("assert")

		attest(discriminantJsonOf(m.internal.assertIs("union"))).snap({
			kind: "domain",
			path: ["id"],
			cases: {
				'"string"': {
					morphs: [caseReference(m, "_matchOrderedDiscrimination1")]
				},
				'"number"': {
					kind: "unit",
					path: ["kind"],
					cases: {
						'"string"': {
							morphs: [caseReference(m, "_matchOrderedDiscrimination2")]
						},
						'"number"': {
							morphs: [caseReference(m, "_matchOrderedDiscrimination3")]
						},
						default: {
							morphs: [
								{ required: [{ key: "id", value: "number" }] },
								caseReference(m, "_matchOrderedDiscrimination4")
							]
						}
					}
				},
				default: {
					kind: "unit",
					path: ["kind"],
					cases: {
						'"string"': {
							morphs: [caseReference(m, "_matchOrderedDiscrimination2")]
						},
						'"number"': {
							morphs: [caseReference(m, "_matchOrderedDiscrimination3")]
						}
					}
				}
			}
		})
		attest(m).type.toString.snap(`Match<
	unknown,
	[
		(In: { id: string }) => string,
		(In: { kind: "string" }) => "string",
		(In: { kind: "number" }) => "number",
		(In: { id: number }) => number
	]
>`)
	})

	// https://github.com/arktypeio/arktype/issues/1445
	it("discriminates reordered cases with disjoint inputs", () => {
		const Dir = type({ "[string]": "unknown" })

		const m = match
			.case(["string", Dir], () => -1)
			.case([Dir, "string"], () => 1)
			.case(["string", "string"], () => 2)
			.case([Dir, Dir], () => 0)
			.default(() => null)

		attest(m(["a", {}])).equals(-1)
		attest(m([{}, "a"])).equals(1)
		attest(m(["b", "a"])).equals(2)
		attest(m([{}, {}])).equals(0)
		attest(m([0, 0])).equals(null)
	})

	it("allows number keys", () => {
		const numeric = match({
			0: function numericZeroCase(n) {
				return `${n}` as const
			},
			1: function numericOneCase(n) {
				return `${n}` as const
			},
			default: "assert"
		})

		attest(numeric).type.toString.snap(
			`Match<unknown, [(In: 0) => "0", (In: 1) => "1"]>`
		)
		attest(numeric.json).snap({
			branches: [
				{
					morphs: [{ unit: 0 }, caseReference(numeric, "numericZeroCase")]
				},
				{ morphs: [{ unit: 1 }, caseReference(numeric, "numericOneCase")] }
			],
			ordered: true,
			meta: { onFail: throwDefaultRef }
		})
	})

	it("union inputs", () => {
		const stringifyResponse = match({
			"true | 1": n => `${n}`,
			"false | 0": n => `${n}`,
			default: "assert"
		})

		attest(stringifyResponse).type.toString.snap(`Match<
	unknown,
	[(In: 0 | false) => string, (In: 1 | true) => string]
>`)

		attest(stringifyResponse(true)).snap("true")
		attest(stringifyResponse(false)).snap("false")
		attest(stringifyResponse(1)).snap("1")
		attest(stringifyResponse(0)).snap("0")
	})

	it("discriminated", () => {
		type Data =
			| {
					id: 1
					oneValue: number
			  }
			| {
					id: 2
					twoValue: string
			  }

		const discriminateValue = match
			.in<Data>()
			.at("id")
			.match({
				1: o => `${o.oneValue}!`,
				2: o => o.twoValue.length,
				default: "assert"
			})

		attest(discriminateValue).type.toString.snap(`Match<
	Data,
	[
		(In: { id: 1; oneValue: number }) => string,
		(In: { id: 2; twoValue: string }) => number
	]
>`)

		const a = discriminateValue({ id: 1, oneValue: 1 })
		attest(a).equals("1!")
		const b = discriminateValue({ id: 2, twoValue: "two" })
		attest(b).equals(3)
		// @ts-expect-error
		attest(() => discriminateValue({ oneValue: 3 }))
			.throws.snap("TraversalError: id must be 1 or 2")
			.type.errors("Property 'id' is missing in type '{ oneValue: number; }'")
	})

	it("default ArkErrors", () => {
		const m = match({
			string: s => s.length,
			number: n => n,
			default: "reject"
		})

		attest(m("foo")).equals(3)
		attest(m(3)).equals(3)
		// can access directly since it has no overlap with input
		attest(m(null).summary).snap("must be a string or a number")
	})

	it("docs example 2", () => {
		const sizeOf = match({
			string: v => v.length,
			number: v => v,
			bigint: v => v
			// match any object with a length property
		})
			.case({ length: "number" }, o => o.length)
			.default("assert")

		attest(sizeOf("abc")).equals(3)
		attest(sizeOf({ name: "David", length: 5 })).equals(5)
		attest(() => sizeOf(null)).throws.snap(
			"TraversalError: must be a string, a number, a bigint or an object"
		)
	})

	it("validates in", () => {
		const exclaimFoo = match.in({ foo: "string" }).at("foo", {
			default: o => `${o.foo}!` as const
		})

		attest(exclaimFoo).type.toString.snap(`Match<
	{ foo: string },
	[
		(In: unknown) => ArkErrors,
		(o: { foo: string }) => \`\${string}!\`
	]
>`)

		const out = exclaimFoo({ foo: "foo" })

		// ensure ArkErrors is added as a possible outcome
		// since input is validated without assertion
		attest<ArkErrors | `${string}!`>(out).equals("foo!")

		// @ts-expect-error
		attest(exclaimFoo({ foo: 5 }).toString())
			.snap("foo must be a string")
			.type.errors("Type 'number' is not assignable to type 'string'")
	})

	it("asserts in", () => {
		const fooToLength = match.in({ foo: "string" }).at("foo", {
			"string > 0": o => o.foo.length,
			default: "assert"
		})

		attest(fooToLength).type.toString.snap(`Match<
	{ foo: string },
	[(In: { foo: string }) => number]
>`)

		const out = fooToLength({ foo: "foo" })

		// ensure ArkErrors is not added to output
		// since result is asserted
		attest<number>(out).equals(3)

		// @ts-expect-error
		attest(() => fooToLength({ foo: 5 }))
			.throws("foo must be a string")
			.type.errors("Type 'number' is not assignable to type 'string'")
	})

	it("string matcher no in", () => {
		const discriminate = match.at("kind").strings({
			a: o => o.kind,
			b: o => o.kind,
			c: o => o.kind,
			default: "assert"
		})
		attest<
			(
				In: { kind: "a" } | { kind: "b" } | { kind: "c" }
			) => Out<"a" | "b" | "c">
		>(discriminate.t)

		const a = discriminate({ kind: "a", value: "a" })
		const b = discriminate({ kind: "b", value: "b" })
		const c = discriminate({ kind: "c", value: "c" })

		attest<["a", "b", "c"]>([a, b, c]).snap(["a", "b", "c"])
	})

	type Discriminated =
		| {
				kind: "a"
				value: "a"
		  }
		| {
				kind: "b"
				value: "b"
		  }
		| {
				kind: "c"
				value: "c"
		  }

	it("string literal matcher", () => {
		const discriminate = match
			.in<Discriminated>()
			.at("kind")
			.strings({
				a: o => o.value,
				b: o => o.value,
				c: o => o.value,
				default: "assert"
			})

		const a = discriminate({ kind: "a", value: "a" })
		const b = discriminate({ kind: "b", value: "b" })
		const c = discriminate({ kind: "c", value: "c" })

		attest<["a", "b", "c"]>([a, b, c]).snap(["a", "b", "c"])

		// @ts-expect-error
		attest(() => discriminate({ kind: "d", value: "d" }))
			.throws.snap('TraversalError: kind must be "a", "b" or "c"')
			.type.errors(`Type '"d"' is not assignable`)
	})

	it("invalid string key", () => {
		attest(() =>
			match
				.in<Discriminated>()
				.at("kind")
				.strings({
					// @ts-expect-error
					d: o => o.value,
					default: "assert"
				})
		).type.errors(`ErrorType<"d must be a possible string value">`)
	})

	it("lone invalid string key", () => {
		attest(() =>
			match
				.in<Discriminated>()
				.at("kind")
				.strings({
					// @ts-expect-error
					d: o => o.value
				})
		).type.errors("d must be a possible string value")
	})

	it("string keys are values, not definitions", () => {
		const kindOf = match.in("string").strings({
			number: s => s,
			"string[]": s => s,
			default: "reject"
		})
		attest<"number" | ArkErrors>(kindOf("number")).equals("number")
		attest(kindOf("string[]")).equals("string[]")
		attest(kindOf("5").toString()).snap('must be "number" or "string[]"')
	})

	it("string cases no default", () => {
		const check = match
			.at("foo")
			.strings({
				value: o => o.foo
			})
			.default("assert")

		const out = check({ foo: "value" })

		attest<"value">(out).equals("value")
	})

	it("string cases no default from in", () => {
		const check = match
			.in({ foo: "string" })
			.at("foo")
			.strings({
				value: o => o.foo
			})
			.default("assert")

		const out = check({ foo: "value" })

		attest<"value">(out).equals("value")
	})

	it("union at input key", () => {
		type Data = {
			id: 1 | 2
			value: number
		}

		const discriminateValue = type.match
			.in<Data>()
			.at("id")
			.match({
				1: o => `${o.value}!`,
				2: o => o.value,
				default: "assert"
			})

		attest(discriminateValue).type.toString.snap(`Match<
	Data,
	[
		(In: { id: 1; value: number }) => string,
		(In: { id: 2; value: number }) => number
	]
>`)
	})

	it("matchers of different inputs in an array", () => {
		const fromString = match({ string: s => s.length, default: "assert" })
		const fromNumber = match({ number: n => n, default: "assert" })
		// relating the two Match types structurally compared their call
		// signatures' isDisjoint results with data still generic, which was
		// excessively deep (2.5M instantiations); their variance is annotated
		const matchers = [fromString, fromNumber]
		attest<(typeof fromString | typeof fromNumber)[]>(matchers)
		attest(matchers.length).equals(2)
	})

	it("at treats special and empty keys literally", () => {
		const optKey = match.at("foo?", {
			string: o => o["foo?"],
			default: "reject"
		})
		attest(optKey({ "foo?": "ok" })).equals("ok")
		attest(optKey({}).toString()).snap(
			'["foo?"] must be a string (was missing)'
		)

		const plusKey = match.at("+", {
			string: o => o["+"],
			default: "reject"
		})
		attest(plusKey({ "+": "ok" })).equals("ok")
		attest(plusKey({}).toString()).snap('["+"] must be a string (was missing)')

		const indexKey = match.at("[string]", {
			number: o => o["[string]"],
			default: "reject"
		})
		attest(indexKey({ "[string]": 1 })).equals(1)
		attest(indexKey({ a: 1 }).toString()).snap(
			'["[string]"] must be a number (was missing)'
		)

		const spreadKey = match.at("...", {
			string: o => o["..."],
			default: "reject"
		})
		attest(spreadKey({ "...": "ok" })).equals("ok")
		attest(spreadKey({}).toString()).snap(
			'["..."] must be a string (was missing)'
		)

		const emptyKey = match.at("", {
			string: o => o[""],
			default: "reject"
		})
		attest(emptyKey({ "": "ok" })).equals("ok")
		attest(emptyKey("ok").toString()).snap("must be an object")
		attest(emptyKey({}).toString()).snap('[""] must be a string (was missing)')

		attest(() =>
			match
				.at("")
				// @ts-expect-error
				.at("x")
		).throwsAndHasTypeError(doubleAtMessage)
	})

	it("single-case assert and never defaults throw on mismatch", () => {
		const asserted = match({
			string: s => s.length,
			default: "assert"
		})
		attest(asserted("abc")).equals(3)
		attest(() => asserted(5)).throws.snap("TraversalError: must be a string")

		const nevered = match({
			string: s => s.length,
			default: "never"
		})
		attest(nevered("abc")).equals(3)
		// @ts-expect-error
		attest(() => nevered(5)).throws.snap("TraversalError: must be a string")

		const pruned = match({
			string: s => s.length,
			"'foo'": () => 0,
			default: "assert"
		})
		attest(pruned("abc")).equals(3)
		attest(() => pruned(5)).throws.snap("TraversalError: must be a string")
	})

	it("preserves class private members in instanceOf case", () => {
		class Special {
			#x = 1
			get y(): number {
				return this.#x
			}
		}
		const takes = (s: Special) => s
		const fromUnknown = match
			.case(type.instanceOf(Special), s => {
				attest<Special>(s)
				return takes(s)
			})
			.default("assert")

		const fromObject = match
			.in<object>()
			.case(type.instanceOf(Special), s => {
				attest<Special>(s)
				return takes(s)
			})
			.default("assert")

		const fromUnion = match
			.in<{ k: string } | Special>()
			.case(type.instanceOf(Special), s => takes(s))
			.default("assert")

		const instance = new Special()
		attest<Special>(fromUnknown(instance)).equals(instance)
		attest<Special>(fromObject(instance)).equals(instance)
		attest<Special>(fromUnion(instance)).equals(instance)
	})

	it("preserves optional properties and index signatures from input when narrowing", () => {
		type Response = { status: number; body?: string }
		const onOk = match
			.in<Response>()
			.case({ status: "200" }, r => {
				attest<{ status: 200; body?: string }>(r)
				return r.body
			})
			.default(() => undefined)
		attest<string | undefined>(onOk({ status: 200, body: "ok" })).equals("ok")
		attest(onOk({ status: 200 })).equals(undefined)
		attest(onOk({ status: 404, body: "no" })).equals(undefined)

		type OptionalField = { a?: string; b: number }
		const onOne = match
			.in<OptionalField>()
			.case({ b: "1" }, x => {
				attest<{ a?: string; b: 1 }>(x)
				return x.a
			})
			.default(() => undefined)
		attest<string | undefined>(onOne({ b: 1, a: "hi" })).equals("hi")
		attest(onOne({ b: 2, a: "no" })).equals(undefined)

		const onRecord = match
			.in<Record<string, string>>()
			.case({ a: "'x'" }, x => {
				attest<"x">(x.a)
				attest<string>(x.other)
				return x.other
			})
			.default(() => "")
		attest<string>(onRecord({ a: "x", other: "y" })).equals("y")
		attest(onRecord({ a: "z", other: "y" })).equals("")
	})

	it("types match.in(morph) call input as distill.In and case input as distill.Out", () => {
		const m = match
			.in("string.numeric.parse")
			.match({ number: n => n * 2, default: "assert" })

		attest<number>(m("5")).equals(10)
		// @ts-expect-error
		attest(() => m(5))
			.throws.snap("TraversalError: must be a string")
			.type.errors(
				"Argument of type 'number' is not assignable to parameter of type 'string'"
			)

		const chained = match
			.in("string.numeric.parse")
			.case("number > 0", n => `${n}` as const)
			.default(n => {
				attest<number>(n)
				return "nonpos" as const
			})

		attest<`${number}` | "nonpos" | ArkErrors>(chained("5")).equals("5")
		attest(chained("-1")).equals("nonpos")

		const rejected = match
			.in("string.numeric.parse")
			.match({ number: n => n, default: "reject" })
		attest<number | ArkErrors>(rejected("7")).equals(7)

		const nevered = match
			.in("string.numeric.parse")
			.match({ number: n => n, default: "never" })
		attest<number>(nevered("9")).equals(9)

		// morph whose output is `any` (e.g. JSON.parse) must still enforce callInput
		const parseJson = match
			.in(type("string").pipe(s => JSON.parse(s)))
			.match({ object: o => o, default: "assert" })
		attest<object>(parseJson('{"a":1}')).equals({ a: 1 })
		// @ts-expect-error
		attest(() => parseJson(123))
			.throws.snap("TraversalError: must be a string")
			.type.errors(
				"Argument of type 'number' is not assignable to parameter of type 'string'"
			)
	})

	it("handles 60 chained .case() calls without TS2589", () => {
		const m = match
			.case("'k0'", () => 0 as const)
			.case("'k1'", () => 1 as const)
			.case("'k2'", () => 2 as const)
			.case("'k3'", () => 3 as const)
			.case("'k4'", () => 4 as const)
			.case("'k5'", () => 5 as const)
			.case("'k6'", () => 6 as const)
			.case("'k7'", () => 7 as const)
			.case("'k8'", () => 8 as const)
			.case("'k9'", () => 9 as const)
			.case("'k10'", () => 10 as const)
			.case("'k11'", () => 11 as const)
			.case("'k12'", () => 12 as const)
			.case("'k13'", () => 13 as const)
			.case("'k14'", () => 14 as const)
			.case("'k15'", () => 15 as const)
			.case("'k16'", () => 16 as const)
			.case("'k17'", () => 17 as const)
			.case("'k18'", () => 18 as const)
			.case("'k19'", () => 19 as const)
			.case("'k20'", () => 20 as const)
			.case("'k21'", () => 21 as const)
			.case("'k22'", () => 22 as const)
			.case("'k23'", () => 23 as const)
			.case("'k24'", () => 24 as const)
			.case("'k25'", () => 25 as const)
			.case("'k26'", () => 26 as const)
			.case("'k27'", () => 27 as const)
			.case("'k28'", () => 28 as const)
			.case("'k29'", () => 29 as const)
			.case("'k30'", () => 30 as const)
			.case("'k31'", () => 31 as const)
			.case("'k32'", () => 32 as const)
			.case("'k33'", () => 33 as const)
			.case("'k34'", () => 34 as const)
			.case("'k35'", () => 35 as const)
			.case("'k36'", () => 36 as const)
			.case("'k37'", () => 37 as const)
			.case("'k38'", () => 38 as const)
			.case("'k39'", () => 39 as const)
			.case("'k40'", () => 40 as const)
			.case("'k41'", () => 41 as const)
			.case("'k42'", () => 42 as const)
			.case("'k43'", () => 43 as const)
			.case("'k44'", () => 44 as const)
			.case("'k45'", () => 45 as const)
			.case("'k46'", () => 46 as const)
			.case("'k47'", () => 47 as const)
			.case("'k48'", () => 48 as const)
			.case("'k49'", () => 49 as const)
			.case("'k50'", () => 50 as const)
			.case("'k51'", () => 51 as const)
			.case("'k52'", () => 52 as const)
			.case("'k53'", () => 53 as const)
			.case("'k54'", () => 54 as const)
			.case("'k55'", () => 55 as const)
			.case("'k56'", () => 56 as const)
			.case("'k57'", () => 57 as const)
			.case("'k58'", () => 58 as const)
			.case("'k59'", () => 59 as const)
			.default("assert")

		attest<0>(m("k0")).equals(0)
		attest<59>(m("k59")).equals(59)
	})

	it("scales match.in<U>().at(key) over large discriminated unions", () => {
		type LargeUnion =
			| { kind: "k0"; v0: 0 }
			| { kind: "k1"; v1: 1 }
			| { kind: "k2"; v2: 2 }
			| { kind: "k3"; v3: 3 }
			| { kind: "k4"; v4: 4 }
			| { kind: "k5"; v5: 5 }
			| { kind: "k6"; v6: 6 }
			| { kind: "k7"; v7: 7 }
			| { kind: "k8"; v8: 8 }
			| { kind: "k9"; v9: 9 }
			| { kind: "k10"; v10: 10 }
			| { kind: "k11"; v11: 11 }
			| { kind: "k12"; v12: 12 }
			| { kind: "k13"; v13: 13 }
			| { kind: "k14"; v14: 14 }
			| { kind: "k15"; v15: 15 }
			| { kind: "k16"; v16: 16 }
			| { kind: "k17"; v17: 17 }
			| { kind: "k18"; v18: 18 }
			| { kind: "k19"; v19: 19 }
			| { kind: "k20"; v20: 20 }
			| { kind: "k21"; v21: 21 }
			| { kind: "k22"; v22: 22 }
			| { kind: "k23"; v23: 23 }
			| { kind: "k24"; v24: 24 }
			| { kind: "k25"; v25: 25 }
			| { kind: "k26"; v26: 26 }
			| { kind: "k27"; v27: 27 }
			| { kind: "k28"; v28: 28 }
			| { kind: "k29"; v29: 29 }
			| { kind: "k30"; v30: 30 }
			| { kind: "k31"; v31: 31 }
			| { kind: "k32"; v32: 32 }
			| { kind: "k33"; v33: 33 }
			| { kind: "k34"; v34: 34 }
			| { kind: "k35"; v35: 35 }
			| { kind: "k36"; v36: 36 }
			| { kind: "k37"; v37: 37 }
			| { kind: "k38"; v38: 38 }
			| { kind: "k39"; v39: 39 }

		const handle = match
			.in<LargeUnion>()
			.at("kind")
			.match({
				"'k0'": x => x.v0,
				"'k1'": x => x.v1,
				"'k2'": x => x.v2,
				"'k3'": x => x.v3,
				"'k4'": x => x.v4,
				"'k5'": x => x.v5,
				"'k6'": x => x.v6,
				"'k7'": x => x.v7,
				"'k8'": x => x.v8,
				"'k9'": x => x.v9,
				"'k10'": x => x.v10,
				"'k11'": x => x.v11,
				"'k12'": x => x.v12,
				"'k13'": x => x.v13,
				"'k14'": x => x.v14,
				"'k15'": x => x.v15,
				"'k16'": x => x.v16,
				"'k17'": x => x.v17,
				"'k18'": x => x.v18,
				"'k19'": x => x.v19,
				"'k20'": x => x.v20,
				"'k21'": x => x.v21,
				"'k22'": x => x.v22,
				"'k23'": x => x.v23,
				"'k24'": x => x.v24,
				"'k25'": x => x.v25,
				"'k26'": x => x.v26,
				"'k27'": x => x.v27,
				"'k28'": x => x.v28,
				"'k29'": x => x.v29,
				"'k30'": x => x.v30,
				"'k31'": x => x.v31,
				"'k32'": x => x.v32,
				"'k33'": x => x.v33,
				"'k34'": x => x.v34,
				"'k35'": x => x.v35,
				"'k36'": x => x.v36,
				"'k37'": x => x.v37,
				"'k38'": x => x.v38,
				"'k39'": x => x.v39,
				default: "never"
			})

		attest<0>(handle({ kind: "k0", v0: 0 })).equals(0)
		attest<39>(handle({ kind: "k39", v39: 39 })).equals(39)
	})

	it("keeps domain check beside predicates when pruning discriminants", () => {
		const m = match
			.case(
				type("string").narrow(s => s.length > 1),
				s => s
			)
			.case("number", n => n)
			.case("null | 'x'", v => v)
			.default(() => 0)

		attest(m("x")).equals("x")
		attest(m("xy")).equals("xy")
		attest(m(null)).equals(null)
		attest(m(42)).equals(42)
		attest(m("y")).equals(0)
		attest(m(true)).equals(0)
		attest(m({})).equals(0)

		const objMatch = match
			.case(
				type({ a: "'foo'" }).narrow(o => o.a.length === 3),
				() => "foo"
			)
			.case({ a: "'bar'" }, () => "bar")
			.case(type("null").or({ a: "'foo'", b: "1" }), () => "fallback")
			.default(() => "default")

		attest(objMatch({ a: "foo" })).equals("foo")
		attest(objMatch({ a: "bar" })).equals("bar")
		attest(objMatch(null)).equals("fallback")
		attest(objMatch({ a: "baz" })).equals("default")
	})
})
