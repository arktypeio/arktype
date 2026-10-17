import { attest, contextualize } from "@ark/attest"
import { rootSchema, type StandardJSONSchemaV1 } from "@ark/schema"
import {
	discriminate,
	intersect,
	isDisjoint,
	isEqual,
	isSubset,
	parse,
	union
} from "arksets"

// stands in for a zod schema, which reads its JSON Schema the same way
const standardSchema = (jsonSchema: object): StandardJSONSchemaV1 => ({
	"~standard": {
		version: 1,
		vendor: "zod",
		jsonSchema: {
			input: () => jsonSchema as never,
			output: () => jsonSchema as never
		}
	}
})

// what arktype parses { name: "string", "age?": "number.integer >= 0" } to
const User = rootSchema({
	domain: "object",
	required: [{ key: "name", value: "string" }],
	optional: [{ key: "age", value: { domain: "number", divisor: 1, min: 0 } }]
})

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
				["a", '{ a: unknown, kind: "a" } | { other: unknown }'],
				["b", '{ kind: "b" } | { other: unknown }']
			],
			default: "{ other: unknown }"
		})
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

	it("discriminates nothing without branches to tell apart", () => {
		attest(discriminate({ type: "string" })).equals(null)
		attest(
			discriminate({
				type: "number",
				anyOf: [{ multipleOf: 2 }, { multipleOf: 3 }]
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
})
