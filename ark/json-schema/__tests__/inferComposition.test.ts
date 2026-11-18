import { attest, contextualize } from "@ark/attest"
import type { jsonSchema } from "@ark/json-schema"
import type { array } from "@ark/util"
import type { JsonSchema } from "arktype"
import { inferred } from "./utils.ts"

contextualize(() => {
	describe("allOf", () => {
		it("primitive branches", () => {
			attest(
				inferred({ allOf: [{ type: "string" }, { minLength: 1 }] })
			).type.toString.snap("string")
			// JSON Schema's "object" excludes arrays
			attest(
				inferred({ allOf: [{ type: "object" }, { type: "array" }] })
			).type.toString.snap("never")
			attest(
				inferred({
					allOf: [{ type: ["string", "number"] }, { type: ["number", "null"] }]
				})
			).type.toString.snap("number")
			attest(
				inferred({ allOf: [{ type: "string" }, false] })
			).type.toString.snap("never")
		})

		it("base required without properties", () => {
			const T = inferred({
				type: "object",
				required: ["a"],
				allOf: [{ properties: { a: { type: "string" } } }]
			})
			attest(T).type.toString.snap("{ a: string }")
		})

		it("conflicting optional property", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{ properties: { a: { type: "string" } } },
					{ properties: { a: { type: "number" } } }
				]
			})
			attest(T).type.toString.snap("{ a?: never }")
		})

		it("two index signatures", () => {
			const T = inferred({
				type: "object",
				allOf: [
					{ additionalProperties: { type: ["string", "number"] } },
					{
						patternProperties: { "^x": { type: ["number", "null"] } },
						additionalProperties: false
					}
				]
			})
			attest(T).type.toString.snap("{ [x: string]: number }")
		})

		it("hand-written branch lists", () => {
			attest<
				string | number,
				jsonSchema.infer<{
					anyOf: ({ type: "string" } | { type: "number" })[]
				}>
			>()
			// non-tuple allOf can't be intersected element-wise (sound superset)
			attest<unknown, jsonSchema.infer<{ allOf: { type: "string" }[] }>>()
			const branch = { type: "string" } as JsonSchema
			attest(
				inferred({ anyOf: [branch, { type: "number" }] })
			).type.toString.snap("unknown")
			attest(
				inferred({ allOf: [branch, { type: "number" }] })
			).type.toString.snap("number")
		})
	})

	describe("anyOf and oneOf", () => {
		it("primitive branches", () => {
			attest(
				inferred({ anyOf: [{ type: "string" }, { type: "number" }] })
			).type.toString.snap("string | number")
			// spec-invalid; no branch can match
			// @ts-expect-error
			attest(inferred({ anyOf: [] })).type.toString.snap("never")
			attest(
				inferred({ anyOf: [true, { type: "string" }] })
			).type.toString.snap("unknown")
			// exclusivity isn't expressible, so oneOf infers like anyOf
			attest(
				inferred({ oneOf: [{ type: "number" }, { type: "integer" }] })
			).type.toString.snap("number")
		})

		it("base distributed into branches", () => {
			const T = inferred({
				type: "object",
				properties: { id: { type: "string" } },
				required: ["id"],
				anyOf: [
					{ properties: { a: { type: "number" } }, required: ["a"] },
					{ properties: { b: { type: "boolean" } } }
				]
			})
			attest(T).type.toString.snap(`	| { id: string; b?: boolean }
	| { id: string; a: number }`)
		})

		it("base object with primitive branch", () => {
			// the string branch can't satisfy `type: "object"`
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				anyOf: [{ type: "string" }, { required: ["a"] }]
			})
			attest(T).type.toString.snap("{ a: string }")
		})

		it("allOf of anyOf", () => {
			const T = inferred({
				allOf: [
					{ anyOf: [{ type: "string" }, { type: "number" }] },
					{ anyOf: [{ type: "number" }, { type: "boolean" }] }
				]
			})
			attest(T).type.toString.snap("number")
		})
	})

	describe("parts of one node", () => {
		it("all three compositions with not and nullable", () => {
			const T = inferred({
				type: ["string", "number", "boolean"],
				allOf: [{ type: ["string", "number"] }],
				anyOf: [{ type: "string" }, { type: "number" }],
				oneOf: [{ type: "string" }, { type: "number" }],
				not: { type: "number" },
				nullable: true
			})
			attest(T).type.toString.snap("string | null")
		})

		it("every part kind at once", () => {
			const T = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"],
				$ref: "#/$defs/base",
				anyOf: [{ required: ["b"] }, { required: ["c"] }],
				allOf: [{ properties: { d: { type: "number" } } }],
				if: { required: ["a"] },
				then: { required: ["e"] },
				else: { required: ["f"] },
				$defs: {
					base: { type: "object", properties: { z: { type: "boolean" } } }
				}
			})
			type Base = { a: string; z?: boolean; d?: number }
			attest<
				| (Base & { b: unknown; e: unknown })
				| (Base & { b: unknown; f: unknown })
				| (Base & { c: unknown; e: unknown })
				| (Base & { c: unknown; f: unknown })
			>(T)
		})

		it("implied-object base keywords don't constrain primitive branches", () => {
			// `properties` only applies to objects, so strings are valid here
			const T = inferred({
				properties: { a: { type: "number" } },
				anyOf: [{ type: "string" }, { type: "object" }]
			})
			attest(T).type.toString.snap("string | { a?: number }")
		})

		it("an object enum beside an allOf $ref", () => {
			const T = inferred({
				$defs: {
					a: { type: "object", properties: { x: { type: "number" } } }
				},
				allOf: [{ $ref: "#/$defs/a" }],
				enum: [{ x: 1 }, { x: "s" }]
			})
			// beside a ref (even an acyclic one), structured values are left unfiltered
			attest(T).type.toString.snap('{ readonly x: 1 } | { readonly x: "s" }')
		})

		it("not applies to the composed base", () => {
			const T = inferred({
				anyOf: [
					{ type: "string" },
					{ type: "object", properties: { a: { type: "string" } } }
				],
				not: { type: "string" }
			})
			attest(T).type.toString.snap("{ a?: string }")
			const U = inferred({
				oneOf: [
					{ type: "array", items: { type: "string" } },
					{ type: "array", prefixItems: [{ type: "number" }] },
					{ type: "null" }
				],
				not: { type: "array" }
			})
			attest(U).type.toString.snap("null")
		})
	})

	describe("if/then/else", () => {
		it("then false", () => {
			const T = inferred({
				if: { type: "string" },
				then: false,
				else: { type: "number" }
			})
			attest(T).type.toString.snap("number")
		})

		it("object base with conditional branches", () => {
			const T = inferred({
				type: "object",
				properties: {
					country: { enum: ["US", "CA"] },
					zip: { type: "string" },
					postal: { type: "string" }
				},
				required: ["country"],
				if: { properties: { country: { const: "US" } } },
				then: { required: ["zip"] },
				else: { required: ["postal"] }
			})
			attest(T).type.toString
				.snap(`	| { country: "CA" | "US"; zip?: string; postal: string }
	| { country: "CA" | "US"; zip: string; postal?: string }`)
		})
	})

	describe("refs", () => {
		it("OpenAPI polymorphism through allOf refs back to the parent", () => {
			const T = inferred({
				$defs: {
					Pet: {
						type: "object",
						properties: {
							petType: { type: "string" },
							name: { type: "string" }
						},
						required: ["petType"],
						discriminator: { propertyName: "petType" },
						oneOf: [{ $ref: "#/$defs/Cat" }, { $ref: "#/$defs/Dog" }]
					},
					Cat: {
						allOf: [
							{ $ref: "#/$defs/Pet" },
							{
								type: "object",
								properties: {
									petType: { const: "cat" },
									meow: { type: "boolean" }
								}
							}
						]
					},
					Dog: {
						allOf: [
							{ $ref: "#/$defs/Pet" },
							{
								type: "object",
								properties: {
									petType: { const: "dog" },
									bark: { type: "string" }
								},
								required: ["bark"]
							}
						]
					}
				},
				type: "object",
				properties: {
					pet: { $ref: "#/$defs/Pet" },
					cat: { $ref: "#/$defs/Cat" }
				}
			})
			attest<
				| { petType: "cat"; name?: string; meow?: boolean }
				| { petType: "dog"; name?: string; bark: string }
				| undefined
			>(T.pet)
			attest<{ petType: "cat"; name?: string; meow?: boolean } | undefined>(
				T.cat
			)
		})
	})

	describe("width", () => {
		it("fifty allOf branches", () => {
			type T = jsonSchema.infer<{
				allOf: [
					...array.repeat<{ type: ["string", "number"] }, 49>,
					{ type: "string" }
				]
			}>
			attest<string, T>()
		})

		it("allOf of forty branches sharing a property", () => {
			type branches<acc extends unknown[]> =
				acc["length"] extends 40 ? acc
				:	branches<
						[
							...acc,
							{ properties: { id: { type: "string" } }; required: ["id"] }
						]
					>
			type T = jsonSchema.infer<{ type: "object"; allOf: branches<[]> }>
			attest({} as T).type.toString.snap("{ id: string }")
			attest({} as T["id"]).type.toString.snap("string")
		})

		it("sixty discriminated oneOf branches with a base", () => {
			type branches<acc extends unknown[]> =
				acc["length"] extends 60 ? acc
				:	branches<
						[
							...acc,
							{
								properties: {
									kind: { const: acc["length"] }
									value: { type: "string" }
								}
								required: ["value"]
							}
						]
					>
			type T = jsonSchema.infer<{
				type: "object"
				properties: { kind: { type: "number" } }
				required: ["kind"]
				oneOf: branches<[]>
			}>
			type Expected =
				branches<[]>[number] extends infer branch ?
					branch extends { properties: { kind: { const: infer kind } } } ?
						{ kind: kind; value: string }
					:	never
				:	never
			attest<Expected, T>()
			attest<T, Expected>()
		})

		it("sixty allOf branches with distinct required properties", () => {
			type branches<acc extends unknown[]> =
				acc["length"] extends 60 ? acc
				:	branches<
						[
							...acc,
							{
								properties: { [k in `p${acc["length"]}`]: { type: "number" } }
								required: [`p${acc["length"]}`]
							}
						]
					>
			type T = jsonSchema.infer<{ type: "object"; allOf: branches<[]> }>
			attest<0 extends 1 & T["p59"] ? true : false>(false)
			attest<number>({} as T["p0"])
			attest<number>({} as T["p59"])
		})
	})

	describe("allOf union limit", () => {
		type rule<i extends number> = {
			if: { properties: { k: { const: i } } }
			then: { required: [`v${i}`] }
			else: { properties: { [_ in `v${i}`]: false } }
		}

		type ruleResult<i extends number> =
			| { [_ in `v${i}`]: unknown }
			| { [_ in `v${i}`]?: never }

		it("three rules keep every combination, a fourth is ignored", () => {
			type expected = ruleResult<0> & ruleResult<1> & ruleResult<2>
			type T = jsonSchema.infer<{
				type: "object"
				allOf: [rule<0>, rule<1>, rule<2>]
			}>
			attest<expected, T>()
			attest<T, expected>()
			type U = jsonSchema.infer<{
				type: "object"
				allOf: [rule<0>, rule<1>, rule<2>, rule<3>]
			}>
			// valid with v3 present or absent, since the fourth rule is ignored
			attest<true>(
				{} as [{ v0: 1; v1: 1; v2: 1; v3: 1 }] extends [U] ? true : false
			)
			attest<true>({} as [{ v0: 1; v1: 1; v2: 1 }] extends [U] ? true : false)
		})

		it("$ref'd rules within the limit keep every combination", () => {
			type T = jsonSchema.infer<{
				type: "object"
				allOf: [{ $ref: "#/$defs/r0" }, { $ref: "#/$defs/r1" }]
				$defs: { r0: rule<0>; r1: rule<1> }
			}>
			attest<ruleResult<0> & ruleResult<1>, T>()
			attest<T, ruleResult<0> & ruleResult<1>>()
		})

		it("allOf of thirty if/then/else rules", () => {
			// past three union-producing branches, a branch's then/else are ignored
			attest.instantiations([29300, "instantiations"])
			// prettier-ignore
			return inferred({ type: "object", allOf: [{ if: { properties: { k: { const: 0 } } }, then: { required: ["v0"] }, else: { properties: { v0: false } } }, { if: { properties: { k: { const: 1 } } }, then: { required: ["v1"] }, else: { properties: { v1: false } } }, { if: { properties: { k: { const: 2 } } }, then: { required: ["v2"] }, else: { properties: { v2: false } } }, { if: { properties: { k: { const: 3 } } }, then: { required: ["v3"] }, else: { properties: { v3: false } } }, { if: { properties: { k: { const: 4 } } }, then: { required: ["v4"] }, else: { properties: { v4: false } } }, { if: { properties: { k: { const: 5 } } }, then: { required: ["v5"] }, else: { properties: { v5: false } } }, { if: { properties: { k: { const: 6 } } }, then: { required: ["v6"] }, else: { properties: { v6: false } } }, { if: { properties: { k: { const: 7 } } }, then: { required: ["v7"] }, else: { properties: { v7: false } } }, { if: { properties: { k: { const: 8 } } }, then: { required: ["v8"] }, else: { properties: { v8: false } } }, { if: { properties: { k: { const: 9 } } }, then: { required: ["v9"] }, else: { properties: { v9: false } } }, { if: { properties: { k: { const: 10 } } }, then: { required: ["v10"] }, else: { properties: { v10: false } } }, { if: { properties: { k: { const: 11 } } }, then: { required: ["v11"] }, else: { properties: { v11: false } } }, { if: { properties: { k: { const: 12 } } }, then: { required: ["v12"] }, else: { properties: { v12: false } } }, { if: { properties: { k: { const: 13 } } }, then: { required: ["v13"] }, else: { properties: { v13: false } } }, { if: { properties: { k: { const: 14 } } }, then: { required: ["v14"] }, else: { properties: { v14: false } } }, { if: { properties: { k: { const: 15 } } }, then: { required: ["v15"] }, else: { properties: { v15: false } } }, { if: { properties: { k: { const: 16 } } }, then: { required: ["v16"] }, else: { properties: { v16: false } } }, { if: { properties: { k: { const: 17 } } }, then: { required: ["v17"] }, else: { properties: { v17: false } } }, { if: { properties: { k: { const: 18 } } }, then: { required: ["v18"] }, else: { properties: { v18: false } } }, { if: { properties: { k: { const: 19 } } }, then: { required: ["v19"] }, else: { properties: { v19: false } } }, { if: { properties: { k: { const: 20 } } }, then: { required: ["v20"] }, else: { properties: { v20: false } } }, { if: { properties: { k: { const: 21 } } }, then: { required: ["v21"] }, else: { properties: { v21: false } } }, { if: { properties: { k: { const: 22 } } }, then: { required: ["v22"] }, else: { properties: { v22: false } } }, { if: { properties: { k: { const: 23 } } }, then: { required: ["v23"] }, else: { properties: { v23: false } } }, { if: { properties: { k: { const: 24 } } }, then: { required: ["v24"] }, else: { properties: { v24: false } } }, { if: { properties: { k: { const: 25 } } }, then: { required: ["v25"] }, else: { properties: { v25: false } } }, { if: { properties: { k: { const: 26 } } }, then: { required: ["v26"] }, else: { properties: { v26: false } } }, { if: { properties: { k: { const: 27 } } }, then: { required: ["v27"] }, else: { properties: { v27: false } } }, { if: { properties: { k: { const: 28 } } }, then: { required: ["v28"] }, else: { properties: { v28: false } } }, { if: { properties: { k: { const: 29 } } }, then: { required: ["v29"] }, else: { properties: { v29: false } } }] })
		})

		it("allOf of thirty two-branch anyOfs", () => {
			attest.instantiations([28100, "instantiations"])
			// prettier-ignore
			return inferred({ type: "object", allOf: [{ anyOf: [{ required: ["a0"] }, { required: ["b0"] }] }, { anyOf: [{ required: ["a1"] }, { required: ["b1"] }] }, { anyOf: [{ required: ["a2"] }, { required: ["b2"] }] }, { anyOf: [{ required: ["a3"] }, { required: ["b3"] }] }, { anyOf: [{ required: ["a4"] }, { required: ["b4"] }] }, { anyOf: [{ required: ["a5"] }, { required: ["b5"] }] }, { anyOf: [{ required: ["a6"] }, { required: ["b6"] }] }, { anyOf: [{ required: ["a7"] }, { required: ["b7"] }] }, { anyOf: [{ required: ["a8"] }, { required: ["b8"] }] }, { anyOf: [{ required: ["a9"] }, { required: ["b9"] }] }, { anyOf: [{ required: ["a10"] }, { required: ["b10"] }] }, { anyOf: [{ required: ["a11"] }, { required: ["b11"] }] }, { anyOf: [{ required: ["a12"] }, { required: ["b12"] }] }, { anyOf: [{ required: ["a13"] }, { required: ["b13"] }] }, { anyOf: [{ required: ["a14"] }, { required: ["b14"] }] }, { anyOf: [{ required: ["a15"] }, { required: ["b15"] }] }, { anyOf: [{ required: ["a16"] }, { required: ["b16"] }] }, { anyOf: [{ required: ["a17"] }, { required: ["b17"] }] }, { anyOf: [{ required: ["a18"] }, { required: ["b18"] }] }, { anyOf: [{ required: ["a19"] }, { required: ["b19"] }] }, { anyOf: [{ required: ["a20"] }, { required: ["b20"] }] }, { anyOf: [{ required: ["a21"] }, { required: ["b21"] }] }, { anyOf: [{ required: ["a22"] }, { required: ["b22"] }] }, { anyOf: [{ required: ["a23"] }, { required: ["b23"] }] }, { anyOf: [{ required: ["a24"] }, { required: ["b24"] }] }, { anyOf: [{ required: ["a25"] }, { required: ["b25"] }] }, { anyOf: [{ required: ["a26"] }, { required: ["b26"] }] }, { anyOf: [{ required: ["a27"] }, { required: ["b27"] }] }, { anyOf: [{ required: ["a28"] }, { required: ["b28"] }] }, { anyOf: [{ required: ["a29"] }, { required: ["b29"] }] }] })
		})

		it("allOf of twelve $ref'd if/then/else rules", () => {
			attest.instantiations([14200, "instantiations"])
			// prettier-ignore
			return inferred({ type: "object", allOf: [{ $ref: "#/$defs/r0" }, { $ref: "#/$defs/r1" }, { $ref: "#/$defs/r2" }, { $ref: "#/$defs/r3" }, { $ref: "#/$defs/r4" }, { $ref: "#/$defs/r5" }, { $ref: "#/$defs/r6" }, { $ref: "#/$defs/r7" }, { $ref: "#/$defs/r8" }, { $ref: "#/$defs/r9" }, { $ref: "#/$defs/r10" }, { $ref: "#/$defs/r11" }], $defs: { r0: { if: { properties: { k: { const: 0 } } }, then: { required: ["v0"] }, else: { properties: { v0: false } } }, r1: { if: { properties: { k: { const: 1 } } }, then: { required: ["v1"] }, else: { properties: { v1: false } } }, r2: { if: { properties: { k: { const: 2 } } }, then: { required: ["v2"] }, else: { properties: { v2: false } } }, r3: { if: { properties: { k: { const: 3 } } }, then: { required: ["v3"] }, else: { properties: { v3: false } } }, r4: { if: { properties: { k: { const: 4 } } }, then: { required: ["v4"] }, else: { properties: { v4: false } } }, r5: { if: { properties: { k: { const: 5 } } }, then: { required: ["v5"] }, else: { properties: { v5: false } } }, r6: { if: { properties: { k: { const: 6 } } }, then: { required: ["v6"] }, else: { properties: { v6: false } } }, r7: { if: { properties: { k: { const: 7 } } }, then: { required: ["v7"] }, else: { properties: { v7: false } } }, r8: { if: { properties: { k: { const: 8 } } }, then: { required: ["v8"] }, else: { properties: { v8: false } } }, r9: { if: { properties: { k: { const: 9 } } }, then: { required: ["v9"] }, else: { properties: { v9: false } } }, r10: { if: { properties: { k: { const: 10 } } }, then: { required: ["v10"] }, else: { properties: { v10: false } } }, r11: { if: { properties: { k: { const: 11 } } }, then: { required: ["v11"] }, else: { properties: { v11: false } } } } })
		})

		it("allOf of four nested allOf groups of three rules", () => {
			attest.instantiations([12700, "instantiations"])
			// prettier-ignore
			return inferred({ type: "object", allOf: [{ allOf: [{ if: { properties: { k: { const: 0 } } }, then: { required: ["v0"] }, else: { properties: { v0: false } } }, { if: { properties: { k: { const: 1 } } }, then: { required: ["v1"] }, else: { properties: { v1: false } } }, { if: { properties: { k: { const: 2 } } }, then: { required: ["v2"] }, else: { properties: { v2: false } } }] }, { allOf: [{ if: { properties: { k: { const: 3 } } }, then: { required: ["v3"] }, else: { properties: { v3: false } } }, { if: { properties: { k: { const: 4 } } }, then: { required: ["v4"] }, else: { properties: { v4: false } } }, { if: { properties: { k: { const: 5 } } }, then: { required: ["v5"] }, else: { properties: { v5: false } } }] }, { allOf: [{ if: { properties: { k: { const: 6 } } }, then: { required: ["v6"] }, else: { properties: { v6: false } } }, { if: { properties: { k: { const: 7 } } }, then: { required: ["v7"] }, else: { properties: { v7: false } } }, { if: { properties: { k: { const: 8 } } }, then: { required: ["v8"] }, else: { properties: { v8: false } } }] }, { allOf: [{ if: { properties: { k: { const: 9 } } }, then: { required: ["v9"] }, else: { properties: { v9: false } } }, { if: { properties: { k: { const: 10 } } }, then: { required: ["v10"] }, else: { properties: { v10: false } } }, { if: { properties: { k: { const: 11 } } }, then: { required: ["v11"] }, else: { properties: { v11: false } } }] }] })
		})

		it("allOf of three twenty-branch anyOfs", () => {
			// limitation: intersected unions build every member, 20^3 here (three fifty-branch anyOfs: a depth error)
			attest.instantiations([1180000, "instantiations"])
			// prettier-ignore
			return inferred({ type: "object", allOf: [{ anyOf: [{ properties: { g0: { const: 0 } }, required: ["g0"] }, { properties: { g0: { const: 1 } }, required: ["g0"] }, { properties: { g0: { const: 2 } }, required: ["g0"] }, { properties: { g0: { const: 3 } }, required: ["g0"] }, { properties: { g0: { const: 4 } }, required: ["g0"] }, { properties: { g0: { const: 5 } }, required: ["g0"] }, { properties: { g0: { const: 6 } }, required: ["g0"] }, { properties: { g0: { const: 7 } }, required: ["g0"] }, { properties: { g0: { const: 8 } }, required: ["g0"] }, { properties: { g0: { const: 9 } }, required: ["g0"] }, { properties: { g0: { const: 10 } }, required: ["g0"] }, { properties: { g0: { const: 11 } }, required: ["g0"] }, { properties: { g0: { const: 12 } }, required: ["g0"] }, { properties: { g0: { const: 13 } }, required: ["g0"] }, { properties: { g0: { const: 14 } }, required: ["g0"] }, { properties: { g0: { const: 15 } }, required: ["g0"] }, { properties: { g0: { const: 16 } }, required: ["g0"] }, { properties: { g0: { const: 17 } }, required: ["g0"] }, { properties: { g0: { const: 18 } }, required: ["g0"] }, { properties: { g0: { const: 19 } }, required: ["g0"] }] }, { anyOf: [{ properties: { g1: { const: 0 } }, required: ["g1"] }, { properties: { g1: { const: 1 } }, required: ["g1"] }, { properties: { g1: { const: 2 } }, required: ["g1"] }, { properties: { g1: { const: 3 } }, required: ["g1"] }, { properties: { g1: { const: 4 } }, required: ["g1"] }, { properties: { g1: { const: 5 } }, required: ["g1"] }, { properties: { g1: { const: 6 } }, required: ["g1"] }, { properties: { g1: { const: 7 } }, required: ["g1"] }, { properties: { g1: { const: 8 } }, required: ["g1"] }, { properties: { g1: { const: 9 } }, required: ["g1"] }, { properties: { g1: { const: 10 } }, required: ["g1"] }, { properties: { g1: { const: 11 } }, required: ["g1"] }, { properties: { g1: { const: 12 } }, required: ["g1"] }, { properties: { g1: { const: 13 } }, required: ["g1"] }, { properties: { g1: { const: 14 } }, required: ["g1"] }, { properties: { g1: { const: 15 } }, required: ["g1"] }, { properties: { g1: { const: 16 } }, required: ["g1"] }, { properties: { g1: { const: 17 } }, required: ["g1"] }, { properties: { g1: { const: 18 } }, required: ["g1"] }, { properties: { g1: { const: 19 } }, required: ["g1"] }] }, { anyOf: [{ properties: { g2: { const: 0 } }, required: ["g2"] }, { properties: { g2: { const: 1 } }, required: ["g2"] }, { properties: { g2: { const: 2 } }, required: ["g2"] }, { properties: { g2: { const: 3 } }, required: ["g2"] }, { properties: { g2: { const: 4 } }, required: ["g2"] }, { properties: { g2: { const: 5 } }, required: ["g2"] }, { properties: { g2: { const: 6 } }, required: ["g2"] }, { properties: { g2: { const: 7 } }, required: ["g2"] }, { properties: { g2: { const: 8 } }, required: ["g2"] }, { properties: { g2: { const: 9 } }, required: ["g2"] }, { properties: { g2: { const: 10 } }, required: ["g2"] }, { properties: { g2: { const: 11 } }, required: ["g2"] }, { properties: { g2: { const: 12 } }, required: ["g2"] }, { properties: { g2: { const: 13 } }, required: ["g2"] }, { properties: { g2: { const: 14 } }, required: ["g2"] }, { properties: { g2: { const: 15 } }, required: ["g2"] }, { properties: { g2: { const: 16 } }, required: ["g2"] }, { properties: { g2: { const: 17 } }, required: ["g2"] }, { properties: { g2: { const: 18 } }, required: ["g2"] }, { properties: { g2: { const: 19 } }, required: ["g2"] }] }] })
		})

		it("anyOf, oneOf and a conditional of ten branches each on one node", () => {
			// limitation: a node's own anyOf, oneOf and then/else multiply to 2000 members (fifty branches each: a depth error)
			attest.instantiations([314000, "instantiations"])
			// prettier-ignore
			return inferred({ type: "object", anyOf: [{ properties: { g0: { const: 0 } }, required: ["g0"] }, { properties: { g0: { const: 1 } }, required: ["g0"] }, { properties: { g0: { const: 2 } }, required: ["g0"] }, { properties: { g0: { const: 3 } }, required: ["g0"] }, { properties: { g0: { const: 4 } }, required: ["g0"] }, { properties: { g0: { const: 5 } }, required: ["g0"] }, { properties: { g0: { const: 6 } }, required: ["g0"] }, { properties: { g0: { const: 7 } }, required: ["g0"] }, { properties: { g0: { const: 8 } }, required: ["g0"] }, { properties: { g0: { const: 9 } }, required: ["g0"] }], oneOf: [{ properties: { g1: { const: 0 } }, required: ["g1"] }, { properties: { g1: { const: 1 } }, required: ["g1"] }, { properties: { g1: { const: 2 } }, required: ["g1"] }, { properties: { g1: { const: 3 } }, required: ["g1"] }, { properties: { g1: { const: 4 } }, required: ["g1"] }, { properties: { g1: { const: 5 } }, required: ["g1"] }, { properties: { g1: { const: 6 } }, required: ["g1"] }, { properties: { g1: { const: 7 } }, required: ["g1"] }, { properties: { g1: { const: 8 } }, required: ["g1"] }, { properties: { g1: { const: 9 } }, required: ["g1"] }], if: { required: ["c"] }, then: { anyOf: [{ properties: { g2: { const: 0 } }, required: ["g2"] }, { properties: { g2: { const: 1 } }, required: ["g2"] }, { properties: { g2: { const: 2 } }, required: ["g2"] }, { properties: { g2: { const: 3 } }, required: ["g2"] }, { properties: { g2: { const: 4 } }, required: ["g2"] }, { properties: { g2: { const: 5 } }, required: ["g2"] }, { properties: { g2: { const: 6 } }, required: ["g2"] }, { properties: { g2: { const: 7 } }, required: ["g2"] }, { properties: { g2: { const: 8 } }, required: ["g2"] }, { properties: { g2: { const: 9 } }, required: ["g2"] }] }, else: { anyOf: [{ properties: { g2: { const: 0 } }, required: ["g2"] }, { properties: { g2: { const: 1 } }, required: ["g2"] }, { properties: { g2: { const: 2 } }, required: ["g2"] }, { properties: { g2: { const: 3 } }, required: ["g2"] }, { properties: { g2: { const: 4 } }, required: ["g2"] }, { properties: { g2: { const: 5 } }, required: ["g2"] }, { properties: { g2: { const: 6 } }, required: ["g2"] }, { properties: { g2: { const: 7 } }, required: ["g2"] }, { properties: { g2: { const: 8 } }, required: ["g2"] }, { properties: { g2: { const: 9 } }, required: ["g2"] }] } })
		})

		it("a fourth union-producing ref keeps only its other keywords", () => {
			type pairs<k extends string> =
				| { [_ in `a${k}`]: number }
				| { [_ in `b${k}`]: string }
			const T = inferred({
				type: "object",
				$defs: {
					r0: {
						anyOf: [
							{ properties: { a0: { type: "number" } }, required: ["a0"] },
							{ properties: { b0: { type: "string" } }, required: ["b0"] }
						]
					},
					r1: {
						anyOf: [
							{ properties: { a1: { type: "number" } }, required: ["a1"] },
							{ properties: { b1: { type: "string" } }, required: ["b1"] }
						]
					},
					r2: {
						anyOf: [
							{ properties: { a2: { type: "number" } }, required: ["a2"] },
							{ properties: { b2: { type: "string" } }, required: ["b2"] }
						]
					},
					r3: {
						anyOf: [
							{ properties: { a3: { type: "number" } }, required: ["a3"] },
							{ properties: { b3: { type: "string" } }, required: ["b3"] }
						],
						properties: { kept: { type: "boolean" } },
						required: ["kept"]
					}
				},
				allOf: [
					{ $ref: "#/$defs/r0" },
					{ $ref: "#/$defs/r1" },
					{ $ref: "#/$defs/r2" },
					{ $ref: "#/$defs/r3" }
				]
			})
			attest<
				pairs<"0"> & pairs<"1"> & pairs<"2"> & { kept: boolean } extends (
					infer t
				) ?
					{ [k in keyof t]: t[k] }
				:	never
			>(T).type.toString
				.snap(`	| { a0: number; a1: number; a2: number; kept: boolean }
	| { a0: number; a1: number; b2: string; kept: boolean }
	| { a0: number; b1: string; a2: number; kept: boolean }
	| { a0: number; b1: string; b2: string; kept: boolean }
	| { b0: string; a1: number; a2: number; kept: boolean }
	| { b0: string; a1: number; b2: string; kept: boolean }
	| { b0: string; b1: string; a2: number; kept: boolean }
	| { b0: string; b1: string; b2: string; kept: boolean }`)
		})

		it("a fourth ref to an allOf definition keeps its allOf", () => {
			type def<i extends number> = {
				allOf: [
					{
						properties: { [_ in `p${i}`]: { type: "string" } }
						required: [`p${i}`]
					}
				]
			}
			type T = jsonSchema.infer<{
				type: "object"
				$defs: { a1: def<1>; a2: def<2>; a3: def<3>; a4: def<4> }
				allOf: [
					{ $ref: "#/$defs/a1" },
					{ $ref: "#/$defs/a2" },
					{ $ref: "#/$defs/a3" },
					{ $ref: "#/$defs/a4" }
				]
			}>
			type expected = { p1: string; p2: string; p3: string; p4: string }
			attest(
				{} as [T, expected] extends [expected, T] ? true : false
			).type.toString.snap("true")
		})
	})

	describe("structured not and const over recursive compositions", () => {
		it("array exclusions over a cyclic pair of defs", () => {
			const T = inferred({
				$ref: "#/$defs/a",
				$defs: {
					a: { allOf: [{ $ref: "#/$defs/b" }], not: { type: "array" } },
					b: {
						anyOf: [{ $ref: "#/$defs/a" }, { type: "string" }],
						not: { type: "array" }
					}
				}
			})
			attest(T).type.toString.snap("unknown")
		})

		it("object exclusion over a recursive tree", () => {
			const T = inferred({
				type: ["object", "string"],
				properties: { children: { type: "array", items: { $ref: "#" } } },
				not: { type: "object" }
			})
			// a not that excludes structured values is skipped beside a ref
			attest(T).type.toString.snap(
				"string | { children?: (string | cyclic)[] }"
			)
		})

		it("array exclusion nested five deep over a recursive leaf", () => {
			attest.instantiations([3130, "instantiations"])
			// prettier-ignore
			return inferred({ type: "object", allOf: [{ type: "object", allOf: [{ type: "object", allOf: [{ type: "object", allOf: [{ type: "object", allOf: [{ type: "object", properties: { a: { type: "string" }, r: { $ref: "#" } }, required: ["a"] }], not: { type: "array" } }], not: { type: "array" } }], not: { type: "array" } }], not: { type: "array" } }], not: { type: "array" } })
		})

		it("$ref with a structured const nested twenty deep", () => {
			// prettier-ignore
			const T = inferred({ $defs: { o: { type: "object" } }, $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ $ref: "#/$defs/o", allOf: [{ type: "object", properties: { a: { type: "string" } }, required: ["a"] }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } }], const: { a: "x" } })
			attest(T).type.toString.snap('{ readonly a: "x" }')
		})
	})
})
