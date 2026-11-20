import { attest, contextualize } from "@ark/attest"
import { rootSchema } from "@ark/schema"
import {
	discriminate,
	intersect,
	isDisjoint,
	isEqual,
	isSubset,
	parse,
	union
} from "arksets"
import {
	array,
	constantFrom,
	dictionary,
	letrec,
	oneof,
	sample
} from "fast-check"
import { standardSchema } from "./utils.ts"

// what arktype parses { name: "string", "age?": "number.integer >= 0" } to
const User = rootSchema({
	domain: "object",
	required: [{ key: "name", value: "string" }],
	optional: [{ key: "age", value: { domain: "number", divisor: 1, min: 0 } }]
})

// JSON values built from the few keys, strings and numbers the schemas below
// distinguish, so most land near a boundary
const { value } = letrec(tie => ({
	value: oneof(
		{ depthSize: "small" },
		constantFrom(null, true, -1, 0, 1, 1.5, 2, 3),
		constantFrom("", "a", "ab", "b"),
		array(tie("value"), { maxLength: 3 }),
		dictionary(constantFrom("a", "b", "kind"), tie("value"), { maxKeys: 3 })
	)
}))

const sampled = sample(value, { numRuns: 200, seed: 1 })

contextualize(() => {
	it("relates schemas across formats", () => {
		const ZodUser = standardSchema({
			type: "object",
			properties: { name: { type: "string" }, age: { type: "number" } },
			required: ["name"]
		})
		// User allows arrays with a name, which JSON Schema's objects exclude
		attest(isSubset(User, ZodUser)).equals(false)
		attest(isSubset(ZodUser, User)).equals(false)
		attest(isSubset(intersect(User, { type: "object" }), ZodUser)).equals(true)
		attest(isSubset(ZodUser, { type: "object" })).equals(true)
	})

	it("equates a Root with its JSON Schema", () => {
		const Strict = rootSchema({
			domain: "object",
			required: [
				{
					key: "email",
					value: {
						domain: "string",
						pattern: ["^[\\w%+.-]+@[\\d.A-Za-z-]+\\.[A-Za-z]{2,}$"],
						meta: { format: "email" }
					}
				},
				{
					key: "tags",
					value: { proto: Array, sequence: "string", maxLength: 3 }
				}
			],
			optional: [{ key: "kind", value: [{ unit: "a" }, { unit: "b" }] }],
			undeclared: "reject"
		})
		attest(isEqual(Strict, Strict.toJsonSchema())).equals(false)
		attest(
			isEqual(intersect(Strict, { type: "object" }), Strict.toJsonSchema())
		).equals(true)
	})

	it("relates unions whose branches are described", () => {
		const Described = {
			anyOf: [
				{ type: "string", description: "a name" },
				{ type: "number", description: "an id" }
			],
			description: "a key"
		}
		attest(isEqual(Described, { type: ["string", "number"] })).equals(true)
		attest(
			isSubset({ properties: { k: Described } }, { properties: { k: {} } })
		).equals(true)
	})

	it("proves disjoint types, including objects and arrays", () => {
		attest(isDisjoint({ type: "string" }, rootSchema("number"))).equals(true)
		attest(isDisjoint({ type: "object" }, { type: "array" })).equals(true)
		attest(isDisjoint({ type: "object" }, { minItems: 1 })).equals(false)
		attest(
			isDisjoint(
				{
					type: "object",
					properties: { kind: { const: "a" } },
					required: ["kind"]
				},
				{ type: "object", properties: { kind: { const: "b" } } }
			)
		).equals(true)
		attest(isDisjoint({ minimum: 5 }, { maximum: 1 })).equals(false)
		// a Root's own methods agree
		const JsonObject = parse({ type: "object" })
		attest(JsonObject.overlaps(rootSchema({ proto: Array }))).equals(false)
		attest(JsonObject.overlaps(rootSchema({ proto: Date }))).equals(true)
		attest(() => JsonObject.and(rootSchema({ proto: Array }))).throws.snap(
			"ParseError: Intersection of Array and not an array results in an unsatisfiable type"
		)
	})

	it("intersects to never if disjoint and unknown if empty", () => {
		attest(intersect({ type: "string" }, { maxLength: 3 }).expression).snap(
			"string <= 3"
		)
		attest(intersect({ type: "string" }, rootSchema("number")).expression).snap(
			"never"
		)
		attest(intersect().expression).snap("unknown")
	})

	it("reduces a union", () => {
		attest(
			union(
				{ type: "string" },
				rootSchema({ unit: "a" }),
				standardSchema({ type: "null" })
			).expression
		).snap("string | null")
		attest(union().expression).snap("never")
	})

	it("discriminates a union by a unit at a path", () => {
		const D = discriminate({
			type: "object",
			anyOf: [
				{ properties: { kind: { const: "a" } }, required: ["kind", "a"] },
				{ properties: { kind: { const: "b" } }, required: ["kind"] },
				{ required: ["other"] }
			]
		})
		attest({
			path: D?.path,
			kind: D?.kind,
			cases: D?.cases.map(c => [c.value, c.branches.expression]),
			default: D?.default?.expression
		}).snap({
			path: ["kind"],
			kind: "unit",
			cases: [
				[
					"a",
					'{ a: unknown, kind: "a" } & isNonArray | { other: unknown } & isNonArray'
				],
				["b", '{ kind: "b" } & isNonArray | { other: unknown } & isNonArray']
			],
			default: "{ other: unknown } & isNonArray"
		})
	})

	it("discriminates a merged literal union by each of its values", () => {
		const D = discriminate({
			type: "object",
			anyOf: [
				{ properties: { kind: { const: "a" } }, required: ["kind", "x"] },
				{ properties: { kind: { const: "b" } }, required: ["kind", "x"] },
				{ properties: { kind: { const: "c" } }, required: ["kind", "y"] }
			]
		})
		attest(D?.cases.map(c => [c.value, c.branches.expression])).snap([
			["a", '{ kind: "a" | "b", x: unknown } & isNonArray'],
			["b", '{ kind: "a" | "b", x: unknown } & isNonArray'],
			["c", '{ kind: "c", y: unknown } & isNonArray']
		])
	})

	it("discriminates a union by domain", () => {
		const D = discriminate({ type: ["string", "array", "null"] })
		attest({
			path: D?.path,
			kind: D?.kind,
			cases: D?.cases.map(c => [c.value, c.branches.expression]),
			default: D?.default
		}).snap({
			path: [],
			kind: "domain",
			cases: [
				["string", "string"],
				["object", "Array"],
				["null", "null"]
			],
			default: null
		})
	})

	it("discriminates a unit case of the string Array", () => {
		const D = discriminate(
			rootSchema([
				{
					domain: "object",
					required: [
						{ key: "kind", value: { unit: "Array" } },
						{ key: "a", value: "string" }
					]
				},
				{
					domain: "object",
					required: [
						{ key: "kind", value: { unit: "Map" } },
						{ key: "b", value: "number" }
					]
				}
			])
		)
		attest(D?.cases.map(c => [c.value, c.branches.expression])).snap([
			["Array", '{ a: string, kind: "Array" }'],
			["Map", '{ b: number, kind: "Map" }']
		])
	})

	it("discriminates nothing without branches to tell apart", () => {
		attest(discriminate({ type: "string" })).equals(null)
		attest(
			discriminate({
				type: "number",
				anyOf: [{ multipleOf: 2 }, { multipleOf: 3 }]
			})
		).equals(null)
		// every case would match both branches
		attest(
			discriminate({
				type: "object",
				anyOf: [
					{ properties: { kind: { enum: ["a", "b"] } }, required: ["kind"] },
					{ properties: { other: { type: "string" } } }
				]
			})
		).equals(null)
	})

	it("never claims a relation through a keyword it can't decide", () => {
		const NotString = { not: { type: "string" } }
		// true, but only provable by reading the predicate
		attest(isSubset({ type: "number" }, NotString)).equals(false)
		attest(isDisjoint(NotString, { type: "string" })).equals(false)
		// the same keyword on the same subschema is the same predicate
		attest(isEqual(NotString, { not: { type: "string" } })).equals(true)
		attest(isEqual(NotString, { not: { type: "number" } })).equals(false)
		// a predicate on the narrower side only narrows it further
		attest(
			isSubset({ type: "array", uniqueItems: true }, { type: "array" })
		).equals(true)
		attest(
			isSubset({ type: "array", maxItems: 1 }, { uniqueItems: true })
		).equals(false)
	})

	it("agrees with the values it relates", () => {
		const schemas = [
			{ type: "string" },
			{ type: "string", minLength: 2 },
			{ pattern: "^a" },
			{ enum: ["a", 1, null] },
			{ type: "integer", minimum: 1 },
			{ exclusiveMaximum: 2 },
			{ multipleOf: 1.5 },
			{ type: "array", items: { type: "number" } },
			{ prefixItems: [{ type: "string" }], items: false },
			{ minItems: 2 },
			{ uniqueItems: true },
			{ type: "object" },
			{ required: ["a"] },
			{ properties: { a: { type: "number" } }, additionalProperties: false },
			{ properties: { kind: { const: "a" } }, required: ["kind"] },
			{ anyOf: [{ type: "string" }, { type: "null" }] },
			{ not: { type: "string" } },
			User,
			rootSchema("number"),
			rootSchema({ unit: "a" })
		]
		const proven = { subsets: 0, disjoint: 0 }
		const contradictions: string[] = []
		for (const l of schemas) {
			for (const r of schemas) {
				const L = parse(l)
				const R = parse(r)
				const both = intersect(l, r)
				const either = union(l, r)
				const subset = isSubset(l, r)
				const disjoint = isDisjoint(l, r)
				if (subset) proven.subsets++
				if (disjoint) proven.disjoint++
				for (const v of sampled) {
					const inL = L.allows(v)
					const inR = R.allows(v)
					if (
						both.allows(v) !== (inL && inR) ||
						either.allows(v) !== (inL || inR) ||
						(subset && inL && !inR) ||
						(disjoint && inL && inR)
					) {
						contradictions.push(
							`${L.expression} ~ ${R.expression}: ${JSON.stringify(v)}`
						)
					}
				}
			}
		}
		attest(contradictions).equals([])
		// what it can prove, so a relation it stops proving is caught
		attest(proven).snap({ subsets: 94, disjoint: 66 })
	})

	it("bounds an array by a closed structure only where its keys stop", () => {
		// every index matches, though the pattern isn't provably all of them
		const Indexed = rootSchema({
			domain: "object",
			index: [
				{
					signature: { domain: "string", pattern: ["^\\d+$"] },
					value: "number"
				}
			],
			undeclared: "reject"
		})
		const Long = rootSchema({
			proto: Array,
			sequence: "number",
			minLength: 1025
		})
		attest(Indexed.allows(Array(1025).fill(1))).equals(true)
		attest(isDisjoint(Indexed, Long)).equals(false)
		const Pair = rootSchema({
			domain: "object",
			required: [
				{ key: "0", value: "number" },
				{ key: "1", value: "number" }
			],
			undeclared: "reject"
		})
		attest(
			isDisjoint(
				Pair,
				rootSchema({ proto: Array, sequence: "number", minLength: 3 })
			)
		).equals(true)
	})

	it("intersects divisors whose multiple exceeds the safe integers", () => {
		// 3 * 2^52 is a double, so data % it is exact
		attest(
			intersect(
				rootSchema({ domain: "number", divisor: 2 ** 52 }),
				rootSchema({ domain: "number", divisor: 3 })
			).expression
		).snap("number % 13510798882111488")
		// these primes' product rounded to a multiple of neither, but it has no
		// double, so only 0 is a multiple of both
		const Both = intersect(
			rootSchema({ domain: "number", divisor: 9007199254740881 }),
			rootSchema({ domain: "number", divisor: 9007199254740847 })
		)
		attest(Both.expression).snap("0")
		attest(Both.allows(-0)).equals(true)
		attest(
			isEqual(
				rootSchema({ domain: "number", divisor: -2 }),
				rootSchema({ domain: "number", divisor: 2 })
			)
		).equals(true)
	})

	it("intersects a narrowed bound with the refinements it didn't meet", () => {
		const arrayWith = (schema: object) =>
			rootSchema({ proto: Array, ...schema } as never)
		// >= 1 & != 1 is >= 2, then <= 3 & != 3 is <= 2, which meets != 2
		const L = arrayWith({ maxLength: 3, notEqualLength: [1, 2] })
		const R = arrayWith({ minLength: 1, notEqualLength: 3 })
		attest(intersect(L, R).expression).snap("never")
		attest(isDisjoint(L, R)).equals(true)
		attest(
			intersect(
				arrayWith({ maxLength: 4, notEqualLength: 3 }),
				arrayWith({ minLength: 3 })
			).expression
		).snap("Array == 4")
		attest(
			intersect(
				rootSchema({ proto: Date, before: new Date(6), notEqual: new Date(5) }),
				rootSchema({ proto: Date, after: new Date(5) })
			).expression
		).snap("d'1970-01-01T00:00:00.006Z'")
	})

	it("relates a keyword every value meets as its absence", () => {
		attest(
			isEqual(
				{ type: "array", contains: { type: "string" }, minContains: 0 },
				{ type: "array" }
			)
		).equals(true)
		attest(
			isEqual(
				{
					type: "object",
					dependentRequired: { a: [] },
					dependentSchemas: { b: true },
					propertyNames: { type: "string" },
					minProperties: 0
				},
				{ type: "object" }
			)
		).equals(true)
	})
})
