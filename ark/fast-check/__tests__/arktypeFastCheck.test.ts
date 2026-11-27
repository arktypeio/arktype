import { attest, contextualize } from "@ark/attest"
import { arkToArbitrary } from "@ark/fast-check/internal/arktypeFastCheck.ts"
import { fromJsonSchema, scope, type } from "arktype"
import { type Arbitrary, assert, property, sample } from "fast-check"
import { describe } from "mocha"

contextualize(() => {
	describe("union", () => {
		it("boolean", () => {
			const T = type("boolean")
			const arbitrary = arkToArbitrary(T)
			return assertProperty(arbitrary, T)
		})
		it("number|string", () => {
			const T = type("number|string")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
	})

	describe("number", () => {
		it("number", () => {
			const T = type("number")
			const arbitrary = arkToArbitrary(T)
			return assertProperty(arbitrary, T)
		})
		it("Tight Bound", () => {
			const T = type("4<number<5")
			const arbitrary = arkToArbitrary(T)
			return assertProperty(arbitrary, T)
		})
		it("Integer", () => {
			const T = type("number.integer")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("Invalid Bound", () => {
			const T = type("4<number.integer<5")
			attest(() => assertProperty(arkToArbitrary(T), T)).throws(
				"No integer value satisfies >5 & <4"
			)
		})
		it("equals", () => {
			const T = type("number==2")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("not equal", () => {
			const T = type("0 <= number.integer <= 5 & number != 1")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("divisible", () => {
			const T = type("number%2")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("large divisor", () => {
			const T = type("number%7654321001>1")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("divisible within range", () => {
			const T = type("15<number%7<39")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("non-divisible within range", () => {
			const T = type("52<number%10<58")
			attest(() => arkToArbitrary(T)).throws(
				"No values within range 53 - 57 are divisible by 10."
			)
		})
		it("inclusive divisor bounds", () => {
			const T = type("0 <= number % 7 <= 6")
			assertProperty(arkToArbitrary(T), T)
			attest(sample(arkToArbitrary(T), 10)).equals(Array(10).fill(0))
		})
		it("exclusive integer bounds", () => {
			const T = type("1 < number.integer < 3")
			assertProperty(arkToArbitrary(T), T)
			attest(sample(arkToArbitrary(T), 10)).equals(Array(10).fill(2))
		})
		it("negative bounds with divisor", () => {
			const T = type("-10 <= number % 7 <= -1")
			assertProperty(arkToArbitrary(T), T)
			attest(sample(arkToArbitrary(T), 10)).equals(Array(10).fill(-7))
		})
		it("divisor with notEqual", () => {
			const satisfiable = type("0 <= number % 5 <= 5 & number != 0")
			assertProperty(arkToArbitrary(satisfiable), satisfiable)
			attest(sample(arkToArbitrary(satisfiable), 10)).equals(Array(10).fill(5))

			const unsatisfiable = type(
				"-1 <= number % 5 <= 6 & number != 0 & number != 5"
			)
			attest(() => arkToArbitrary(unsatisfiable)).throws(
				"No values within range -1 - 6 divisible by 5 satisfy != constraints."
			)
		})
		it("infinite bounds", () => {
			for (const T of [
				type("number").atLeast(Number.NEGATIVE_INFINITY),
				type("number").atMost(Number.POSITIVE_INFINITY),
				type("number").moreThan(Number.NEGATIVE_INFINITY),
				type("number").lessThan(Number.POSITIVE_INFINITY),
				type("number")
					.atLeast(Number.NEGATIVE_INFINITY)
					.atMost(Number.POSITIVE_INFINITY),
				type.schema({
					domain: { domain: "number", numberAllowsInfinity: true },
					min: { rule: Number.NEGATIVE_INFINITY, exclusive: true }
				}),
				type.schema({
					domain: { domain: "number", numberAllowsInfinity: true },
					max: { rule: Number.POSITIVE_INFINITY, exclusive: true }
				}),
				type.schema({
					domain: { domain: "number", numberAllowsInfinity: true },
					min: Number.POSITIVE_INFINITY
				}),
				type.schema({
					domain: { domain: "number", numberAllowsInfinity: true },
					max: Number.NEGATIVE_INFINITY
				})
			])
				assertProperty(arkToArbitrary(T), T)

			attest(() =>
				arkToArbitrary(type("number").atLeast(Number.POSITIVE_INFINITY))
			).throws("No number satisfies >=Infinity")
			attest(() =>
				arkToArbitrary(type("number").atMost(Number.NEGATIVE_INFINITY))
			).throws("No number satisfies <=-Infinity")
			attest(() =>
				arkToArbitrary(type("number").moreThan(Number.MAX_VALUE))
			).throws(`No number satisfies >${Number.MAX_VALUE}`)
		})
		it("one-sided integer and divisor ranges outside safe integers", () => {
			for (const T of [
				type("number.integer >= 9007199254741000"),
				type("number.integer <= -9007199254741000"),
				type("number % 7 >= 9007199254741000"),
				type("number % 7 <= -9007199254741000")
			])
				assertProperty(arkToArbitrary(T), T)
		})
	})

	describe("string", () => {
		it("string", () => {
			const T = type("string")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("not equal length", () => {
			const T = type("string <= 2 & string != 1")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("bounded string", () => {
			const T = type("string < 5")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("double bounded string", () => {
			const T = type("3<string <= 8")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("regex", () => {
			const T = type("string.email")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("regex with flags", () => {
			const T = type(/^\u{1F600}[a-z]$/iu)
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("regex range requiring u", () => {
			const T = type(/^[😀-😂]$/u)
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		// their patterns have no lookahead, which fast-check can't generate from
		it("numeric, boolean, and ISO date keywords", () => {
			for (const T of [
				type("string.numeric"),
				type("string.integer"),
				type("string.boolean"),
				type("string.boolean.parse"),
				type("string.date.iso"),
				type("string.date.iso.date")
			])
				assertProperty(arkToArbitrary(T), T)
		})
		it("sticky regex", () => {
			const T = type(/a/y)
			attest(() => arkToArbitrary(T)).throws(
				'Unable to use "stringMatching" against a regex using the flag y'
			)
		})
		it("multiple regexes", () => {
			const T = type("string.email").and("string.alpha")
			attest(() => arkToArbitrary(T)).throws(
				"Multiple regexes on a single node is not supported."
			)
		})
		it("bounded regex", () => {
			const T = type("string.email<5")
			attest(() => arkToArbitrary(T)).throws("Bounded regex is not supported.")
		})
		it("zero maxLength regex", () => {
			attest(() => arkToArbitrary(type("/^a*$/ <= 0"))).throws(
				"Bounded regex is not supported."
			)
			attest(() => arkToArbitrary(type("string.alpha <= 0"))).throws(
				"Bounded regex is not supported."
			)
		})
	})

	describe("misc", () => {
		it("unknown", () => {
			const T = type("unknown")
			const arbitrary = arkToArbitrary(T)
			return assertProperty(arbitrary, T)
		})
		it("unknown with predicate and oneOf", () => {
			const NonNull = type.unknown.narrow(x => x !== null)
			assertProperty(arkToArbitrary(NonNull), NonNull)

			const OneOf = fromJsonSchema({ oneOf: [{}, { type: "null" }] })
			assertProperty(arkToArbitrary(OneOf), OneOf)
		})
		it("parse keywords and morph declaredIn", () => {
			for (const T of [
				type("string.url"),
				type("string.url.http"),
				type("string.url.parse"),
				type("string.date"),
				type("string.date.parse"),
				type("string.json"),
				type("string.json.parse")
			])
				assertProperty(arkToArbitrary(T), T)

			const Declared = type.schema({
				declaredIn: type(/^[a-z]+$/).internal,
				morphs: ["string", (s: string) => s.toUpperCase()]
			})
			assertProperty(arkToArbitrary(Declared), Declared)
			attest(
				sample(arkToArbitrary(Declared), 20).every(
					s => typeof s === "string" && /^[a-z]+$/.test(s)
				)
			).equals(true)
		})
		it("unknown[]", () => {
			const T = type("unknown[]")
			const arbitrary = arkToArbitrary(T)
			return assertProperty(arbitrary, T)
		})
		it("bigint", () => {
			const T = type("bigint")
			const arbitrary = arkToArbitrary(T)
			return assertProperty(arbitrary, T)
		})
		it("symbol", () => {
			const T = type("symbol")
			const arbitrary = arkToArbitrary(T)
			return assertProperty(arbitrary, T)
		})
		it("false", () => {
			const T = type("false")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("true", () => {
			const T = type("true")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("literal number", () => {
			const T = type("0.5")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("literal string", () => {
			const T = type("'hello'")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("morph", () => {
			const T = type(["string<5", "=>", val => `${val}`])
			const arbitrary = arkToArbitrary(T)
			// generated for the morph's input
			attest<Arbitrary<string>>(arbitrary)
			assertProperty(arbitrary, T)
		})
		it("morph without input", () => {
			const T = type.schema({ morphs: [(x: unknown) => typeof x] })
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("never", () => {
			attest(() => arkToArbitrary(type("never"))).throws(
				"Cannot generate values for an unsatisfiable type ('never')"
			)
		})
		it("root exports only arkToArbitrary", async () => {
			const rootExports = await import("@ark/fast-check")
			attest(Object.keys(rootExports)).equals(["arkToArbitrary"])
		})
		it("typed as the input", () => {
			const T = type({ name: "string", "age?": "number", role: "'a' = 'a'" })
			attest<Arbitrary<{ name: string; age?: number; role?: "a" }>>(
				arkToArbitrary(T)
			)
		})
		it("unsupported class", () => {
			class Foo {}
			attest(() => arkToArbitrary(type.instanceOf(Foo))).throws(
				"Foo instances can't be generated"
			)
		})
	})

	describe("array", () => {
		it("Array keyword", () => {
			const T = type("Array")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("constrained Array keyword", () => {
			const T = type("Array<2")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("string[]", () => {
			const T = type("string[]")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("number[][]", () => {
			const T = type("number[][]")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("bounded array", () => {
			const T = type("3<number[]<=5")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("exact length", () => {
			const T = type("string[] == 2")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("union array", () => {
			const T = type("(string|number)[]")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
	})

	describe("tuple", () => {
		it("empty tuple", () => {
			const T = type([])
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("one element tuple", () => {
			const T = type(["string"])
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("two element tuple", () => {
			const T = type(["string", "number"])
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})

		it("just variadic", () => {
			const T = type(["...", "string[]"])
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("variadic", () => {
			const T = type(["number", "...", "string[]"])
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("one element optional tuple", () => {
			const T = type(["string?"])
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("tuple with optional", () => {
			const T = type(["number", "string>2?"])
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("variadic after an omitted optional", () => {
			const T = type(["string", "boolean?", "boolean?", "...", "number[]"])
			const lengths = new Set(
				sample(arkToArbitrary(T), { numRuns: 200, seed: 1 }).map(
					data => (data as unknown[]).length
				)
			)
			attest([1, 2, 3, 4].every(length => lengths.has(length))).equals(true)
			return assertProperty(arkToArbitrary(T), T)
		})
		it("variadic tuple with length constraints", () => {
			const atMost2 = type(["number", "...", "string[]"]).atMostLength(2)
			assertProperty(arkToArbitrary(atMost2), atMost2)

			const exact3 = type([
				"string",
				"boolean?",
				"...",
				"number[]"
			]).exactlyLength(3)
			assertProperty(arkToArbitrary(exact3), exact3)

			const omitToFit = type([
				"string",
				"boolean?",
				"...",
				"number[]"
			]).atMostLength(1)
			assertProperty(arkToArbitrary(omitToFit), omitToFit)
		})
	})

	describe("object", () => {
		it("{}", () => {
			const T = type({})
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("object keyword", () => {
			const T = type("object")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("object with optional key", () => {
			const T = type({ a: "string", "b?": "3<number<5" })
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("nested object", () => {
			const T = type({
				a: {
					b: "string >= 2",
					"c?": "string"
				},
				"d?": "number"
			})
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("intersected object", () => {
			const T = type([{ a: "string" }, "&", { b: "number" }])
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("symbol key", () => {
			const s = Symbol()
			const T = type({
				[s]: "string"
			})
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("index signature", () => {
			const T = type({ "[string]": "number|string" })
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("multiple index signatures", () => {
			const T = type({
				"[string]": "number|string",
				"[symbol]": "string"
			})
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("symbol index signature", () => {
			const T = type({ "[symbol]": "number|string" })
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
			const maxSyms = Math.max(
				...sample(arbitrary, { numRuns: 30, seed: 1 }).map(
					o => Object.getOwnPropertySymbols(o).length
				)
			)
			attest(maxSyms > 1).equals(true)
		})
		it("index signature with optional key", () => {
			const T = type({ "[/^x/]": "number", y: "string", "z?": "boolean" })
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("index signature matching an optional key", () => {
			const T = type({ "[/^b$/]": "number", "b?": "number < 0" })
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		// declared keys were dropped when a structure had an index signature
		it("declared key overlapping the index signature value", () => {
			const T = type({ "[string]": "0 < number < 10", a: "number.integer" })
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("optional key disjoint from the index signature value", () => {
			const T = type({ "[string]": "number", "a?": "string" })
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("symbol index signature with a string key", () => {
			const T = type({ "[symbol]": "number", a: "string" })
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("contains alias", () => {
			const example = {
				user: {
					name: "string",
					friends: "user[]"
				}
			} as const
			const T = scope(example).type("user")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("cyclic", () => {
			const $ = scope({
				arf2: {
					b: "bork2"
				},
				bork2: {
					c: "arf2&bork2"
				}
			}).export()
			attest(() => arkToArbitrary($.arf2)).throws(
				"Infinitely deep cycles are not supported."
			)
		})
		it("required cycle with a union to end it", () => {
			const { linked } = scope({
				linked: { value: "string.trim", next: "linked | null" }
			}).export()
			return assertProperty(arkToArbitrary(linked), linked)
		})
		it("cycle at an index signature or array root", () => {
			const $ = scope({
				dict: { "[string]": "dict | string" },
				nested: "(nested | number)[]"
			}).export()
			assertProperty(arkToArbitrary($.dict), $.dict)
			assertProperty(arkToArbitrary($.nested), $.nested)
		})
		it("cycle at an index signature value with no base case", () => {
			// only an empty dictionary ends the cycle
			const $ = scope({
				dict: { "[string]": "dict" },
				named: { "[/^x/]": "named", name: "string" }
			}).export()
			assertProperty(arkToArbitrary($.dict), $.dict)
			assertProperty(arkToArbitrary($.named), $.named)
			const namedSamples = sample(arkToArbitrary($.named), {
				numRuns: 25,
				seed: 1
			})
			attest(new Set(namedSamples).size).equals(namedSamples.length)
		})
		it("cycle through an optional element", () => {
			// inferring an optional element that references its own tuple is circular
			const { pair }: { pair: type.Any } = scope({
				pair: ["string", "pair?"]
			} as never).export() as never
			return assertProperty(arkToArbitrary(pair), pair)
		})
		it("overlapping index signatures", () => {
			const T = type({ "[/^x-/]": "string", "[string]": "string | number" })
			return assertProperty(arkToArbitrary(T), T)
		})
		it("object.json", () => {
			const T = type("object.json")
			assertProperty(arkToArbitrary(T), T)
		})
		it("unknown array with additional props", () => {
			const T = type({ name: "string" }).and("unknown[]")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
			const samples = sample(arbitrary, { numRuns: 25, seed: 1 })
			attest(new Set(samples).size).equals(samples.length)
		})
		it("array keyword with additional props", () => {
			const T = type({ name: "string" }).and("Array<4")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("array with additional props", () => {
			const T = type({ name: "string" }).and("string[]")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("empty array with additional props", () => {
			const Empty = type("string[] == 0").and({ foo: "number" })
			assertProperty(arkToArbitrary(Empty), Empty)

			const EmptyTuple = type([]).and({ foo: "string", "bar?": "boolean" })
			assertProperty(arkToArbitrary(EmptyTuple), EmptyTuple)
		})
		it("cyclic variadic tuple", () => {
			const { t }: { t: type.Any } = scope({
				t: ["string", "...", "t[]"]
			} as never).export() as never
			assertProperty(arkToArbitrary(t), t)

			const { opt }: { opt: type.Any } = scope({
				opt: ["string", "number?", "...", "opt[]"]
			} as never).export() as never
			assertProperty(arkToArbitrary(opt), opt)
		})
		it("recursive array with minLength", () => {
			const $ = scope({
				tree: { children: "tree[] >= 1 | null" },
				nonEmptyBranch: { children: "(nonEmptyBranch | number)[] >= 1" },
				unbounded: { children: ["unbounded", "...", "unbounded[]"] }
			}).export()
			assertProperty(arkToArbitrary($.tree), $.tree)
			assertProperty(arkToArbitrary($.nonEmptyBranch), $.nonEmptyBranch)
			attest(() => arkToArbitrary($.unbounded)).throws(
				"Infinitely deep cycles are not supported."
			)
		})
	})

	describe("proto", () => {
		it("Set", () => {
			const T = type("Set")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("Map", () => {
			const T = type("Map")
			assertProperty(arkToArbitrary(T), T)
		})
		it("RegExp", () => {
			const T = type("RegExp")
			assertProperty(arkToArbitrary(T), T)
		})
		it("URL", () => {
			const T = type("URL")
			assertProperty(arkToArbitrary(T), T)
		})
		it("Error", () => {
			const T = type("Error")
			assertProperty(arkToArbitrary(T), T)
		})
		it("Date", () => {
			const T = type("Date")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("no invalid Date", () => {
			const dates = sample(arkToArbitrary(type("Date")), 10_000) as Date[]
			attest(dates.filter(d => Number.isNaN(d.getTime()))).equals([])
		})
		it("bounded date", () => {
			const T = type("d'2001-10-10'<Date<=d'2005-10-10'")
			const arbitrary = arkToArbitrary(T)
			assertProperty(arbitrary, T)
		})
		it("exclusive date bounds", () => {
			const tight = type("d'2020-01-01'<Date<d'2020-01-01T00:00:00.005Z'")
			assertProperty(arkToArbitrary(tight), tight)
		})
		it("custom class shadowing builtin name", () => {
			class Map {}
			attest(() => arkToArbitrary(type.instanceOf(Map))).throws(
				"Map instances can't be generated"
			)
		})
		it("constrained proto intersection", () => {
			attest(() =>
				arkToArbitrary(type.instanceOf(Error).and({ message: "'boom'" }))
			).throws("Error instances with structure constraints can't be generated.")
			attest(() =>
				arkToArbitrary(type.instanceOf(Map).and({ size: "0" }))
			).throws("Map instances with structure constraints can't be generated.")
			attest(() =>
				arkToArbitrary(type("Date").and({ custom: "string" }))
			).throws("Date instances with structure constraints can't be generated.")
		})
		it("proto intersection without conflicting structural constraints", () => {
			for (const T of [
				type("Date").and({}),
				type("Date").narrow(d => d.getTime() >= 0),
				type("Set").narrow(s => s.size >= 0),
				type.instanceOf(Error).and({ message: "string" })
			])
				assertProperty(arkToArbitrary(T), T)
		})
		it("divisor ranges abutting MAX_SAFE_INTEGER or spanning power-of-2 binades", () => {
			for (const T of [
				type("number % 2 >= 9007199254740991"),
				type("number % 2 >= 9007199254740991 & number <= 9007199254740996"),
				type("number % 4 >= 18014398509481982 & number <= 18014398509481984")
			])
				assertProperty(arkToArbitrary(T), T)
		})
	})
})

const assertProperty = (arbitrary: Arbitrary<unknown>, schema: type.Any) =>
	assert(
		property(arbitrary, value => {
			schema.assert(value)
			return true
		})
	)
