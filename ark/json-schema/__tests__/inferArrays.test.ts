import { attest, contextualize } from "@ark/attest"
import { type jsonSchema, jsonSchemaToType } from "@ark/json-schema"
import type { array } from "@ark/util"
import type { JsonSchema } from "arktype"
import { inferred, type elementAt } from "./utils.ts"

// display of a hand-written (mutable) schema type
const inferType = <schema>(): jsonSchema.infer<schema> => ({}) as never

type isAny<t> = 0 extends 1 & t ? true : false

contextualize(() => {
	describe("items", () => {
		it("schema or false", () => {
			attest(
				inferred({ type: "array", items: { type: "string" } })
			).type.toString.snap("string[]")
			attest(inferred({ type: "array", items: false })).type.toString.snap("[]")
		})

		it("keywords without a type effect", () => {
			attest(
				inferred({
					type: "array",
					prefixItems: [{ type: "string" }, { type: "number" }],
					items: { type: "boolean" },
					minItems: 1,
					maxItems: 0,
					contains: { type: "boolean" },
					uniqueItems: true
				})
			).type.toString.snap("[string, number?, ...boolean[]]")
			attest(
				inferred({ type: "array", additionalItems: { type: "string" } })
			).type.toString.snap("unknown[]")
		})
	})

	describe("prefixItems", () => {
		it("minItems", () => {
			attest(
				inferred({
					type: "array",
					prefixItems: [{ type: "string" }, { type: "number" }]
				})
			).type.toString.snap("[string?, number?, ...unknown[]]")
			attest(
				inferred({
					type: "array",
					prefixItems: [{ type: "string" }, { type: "number" }],
					minItems: 1
				})
			).type.toString.snap("[string, number?, ...unknown[]]")
			attest(
				inferred({
					type: "array",
					prefixItems: [{ type: "string" }, { type: "number" }],
					minItems: 5
				})
			).type.toString.snap("[string, number, ...unknown[]]")
		})

		// a widened minItems could be 0, so no element is known to be present
		it("a widened minItems makes every element optional", () => {
			attest(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }, { type: "number" }]
					minItems: number
					items: false
				}>()
			).type.toString.snap("[string?, number?]")
		})

		it("false element", () => {
			attest(
				inferred({
					type: "array",
					prefixItems: [{ type: "string" }, false],
					minItems: 1,
					items: false
				})
			).type.toString.snap("[string, never?]")
		})

		it("array rest", () => {
			const T = jsonSchemaToType({
				type: "array",
				prefixItems: [{ type: "string" }],
				minItems: 1,
				items: { type: "array", items: { type: "number" } }
			})
			attest(T.infer).type.toString.snap("[string, ...number[][]]")
		})

		it("draft-07 items array next to prefixItems replaces it", () => {
			// as the runtime reads it
			const T = jsonSchemaToType({
				type: "array",
				prefixItems: [{ type: "string" }],
				minItems: 1,
				items: [{ type: "number" }]
			})
			attest(T.infer).type.toString.snap("[number, ...unknown[]]")
			attest(T.allows([1, "x"])).equals(true)
			attest(T.allows(["a"])).equals(false)
		})
	})

	describe("draft-07 items array", () => {
		it("additionalItems schema", () => {
			const T = jsonSchemaToType({
				type: "array",
				items: [{ type: "string" }],
				minItems: 1,
				additionalItems: { type: "boolean" }
			})
			attest(T.infer).type.toString.snap("[string, ...boolean[]]")
		})
	})

	describe("hand-written tuple keywords", () => {
		it("optional prefix element", () => {
			attest(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }, { type: "number" }?]
					items: { type: "boolean" }
				}>()
			).type.toString.snap("[string?, unknown?, ...boolean[]]")
		})

		it("keywords that may be undefined", () => {
			attest(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }, { type: "number" }]
					minItems: 2 | undefined
					items: false
				}>()
			).type.toString.snap("[string?, number?]")
			attest(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }]
					items: { type: "number" } | undefined
				}>()
			).type.toString.snap("[string?, ...unknown[]]")
			attest(
				inferType<{
					type: "array"
					items: [{ type: "string" }]
					additionalItems: false | undefined
				}>()
			).type.toString.snap("[string?, ...unknown[]]")
		})

		it("optional prefixItems", () => {
			attest(
				inferType<{
					type: "array"
					prefixItems?: [{ type: "string" }]
					items: { type: "number" }
				}>()
			).type.toString.snap("number[] | [string?, ...number[]]")
			attest(
				inferType<{ type: "array"; prefixItems?: [{ type: "string" }] }>()
			).type.toString.snap("unknown[]")
			attest(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }] | undefined
					items: false
				}>()
			).type.toString.snap("[string?]")
		})
	})

	describe("widened schemas", () => {
		it("widened items", () => {
			type t = jsonSchema.infer<{ type: "array"; items: JsonSchema }>
			attest<false, isAny<t[number]>>()
			attest(
				inferType<{ type: "array"; items: JsonSchema }>()
			).type.toString.snap("unknown[]")
		})

		it("widened prefixItems with items", () => {
			attest(
				inferType<{
					type: "array"
					prefixItems: { type: "string" }[]
					items: { type: "number" }
				}>()
			).type.toString.snap("(string | number)[]")
		})

		it("widened boolean items after a prefix", () => {
			attest(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }]
					items: boolean
				}>()
			).type.toString.snap("[string?] | [string?, ...unknown[]]")
		})
	})

	describe("long tuples", () => {
		it("minItems 100 of 120", () => {
			type T = jsonSchema.infer<{
				type: "array"
				prefixItems: [
					...array.repeat<{ type: "string" }, 100>,
					...array.repeat<{ type: "number" }, 20>
				]
				minItems: 100
				items: false
			}>
			attest<true, array.repeat<string, 100> extends T ? true : false>()
			attest<false, array.repeat<string, 99> extends T ? true : false>()
			attest<string, T[99]>()
			attest<number | undefined, T[119]>()
		})

		it("a 300-element const against a 300-element prefix", () => {
			// limitation: intersectElements builds the result tuple element by element, so a const against a prefix is quadratic (1000 elements: a depth error)
			attest.instantiations([304000, "instantiations"])
			// prettier-ignore
			const T = inferred({ type: "array", prefixItems: [{ type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }], const: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299] })
			attest<300>(T.length)
		})
	})
	describe("refs in tuples", () => {
		it("tuple definitions that each reference the next twice", () => {
			// prettier-ignore
			type t = jsonSchema.infer<{ $defs: { d0: { type: "array"; prefixItems: [{ $ref: "#/$defs/d1" }, { $ref: "#/$defs/d1" }]; minItems: 2; items: false }; d1: { type: "array"; prefixItems: [{ $ref: "#/$defs/d2" }, { $ref: "#/$defs/d2" }]; minItems: 2; items: false }; d2: { type: "array"; prefixItems: [{ $ref: "#/$defs/d3" }, { $ref: "#/$defs/d3" }]; minItems: 2; items: false }; d3: { type: "array"; prefixItems: [{ $ref: "#/$defs/d4" }, { $ref: "#/$defs/d4" }]; minItems: 2; items: false }; d4: { type: "array"; prefixItems: [{ $ref: "#/$defs/d5" }, { $ref: "#/$defs/d5" }]; minItems: 2; items: false }; d5: { type: "string" } }; $ref: "#/$defs/d0" }>
			type pair<t> = [t, t]
			attest<pair<pair<pair<pair<pair<string>>>>>, t>()
		})
	})

	describe("recursive arrays", () => {
		// recursion must be deferred rather than expanded until TS gives up with `any`
		// (hovering a recursive array still displays any[][][][][][][][][][][][])
		it("array of itself", () => {
			type Nested = Nested[]
			type t = jsonSchema.infer<{ type: "array"; items: { $ref: "#" } }>
			attest<Nested, t>()
			attest<false, isAny<elementAt<t, 20>>>()
		})

		it("recursive tuple", () => {
			// TS can't defer a tuple, so the recursive element is unknown after one expansion
			type t = jsonSchema.infer<{
				type: "array"
				prefixItems: [{ type: "number" }, { $ref: "#" }]
				minItems: 1
				items: false
			}>
			attest<[number, [number, unknown?]?], t>()
			attest<false, isAny<elementAt<t, 20>>>()
		})

		it("a rest whose items recurse is deferred", () => {
			type t = jsonSchema.infer<{
				type: "array"
				prefixItems: [{ type: "string" }]
				items: { type: "array"; items: { $ref: "#" } }
			}>
			type Nested = [string?, ...Nested[][]]
			attest<Nested, t>()
			attest<false, isAny<elementAt<t, 30>>>()
		})

		it("intersected through an object property isn't forced", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { kids: { type: "array", items: { $ref: "#" } } },
					allOf: [
						{
							properties: {
								kids: {
									type: "array",
									items: {
										type: "object",
										properties: { x: { type: "string" } }
									}
								}
							}
						}
					]
				})
			).type.errors.is("")
		})
	})

	it("implied arrays", () => {
		attest(inferred({ items: { type: "string" } })).type.toString.snap(
			`	| string
	| number
	| boolean
	| object
	| string[]
	| null`
		)
	})

	describe("intersections", () => {
		it("an optional element that can't match a rest closes the tuple", () => {
			attest(
				inferred({
					allOf: [
						{
							type: "array",
							prefixItems: [{ type: "string" }, { type: "number" }]
						},
						{ type: "array", items: { type: "string" } }
					]
				})
			).type.toString.snap("[string?]")
		})

		it("a required element the other branch's items reject", () => {
			attest(
				inferType<{
					allOf: [
						{
							type: "array"
							prefixItems: [{ type: "string" }, { type: "number" }]
							minItems: 2
							items: false
						},
						{ type: "array"; items: { type: "string" } }
					]
				}>()
			).type.toString.snap("never")
		})

		it("rest against required and optional elements", () => {
			attest(
				inferred({
					allOf: [
						{
							type: "array",
							prefixItems: [{ type: "string" }],
							minItems: 1,
							items: { type: "number" }
						},
						{
							type: "array",
							prefixItems: [
								{ type: ["string", "null"] },
								{ type: ["number", "null"] },
								{ type: "number" }
							],
							minItems: 2
						}
					]
				})
			).type.toString.snap("[string, number, number?, ...number[]]")
		})

		it("prefixItems and items from different allOf branches", () => {
			// a branch's items applies to every element, not only after another branch's prefix
			attest(
				inferred({
					type: "array",
					allOf: [
						{ prefixItems: [{ type: "string" }] },
						{ items: { type: "number" } }
					]
				})
			).type.toString.snap("[]")
		})

		it("100-element tuples", () => {
			type t = jsonSchema.infer<{
				allOf: [
					{
						type: "array"
						prefixItems: array.repeat<{ type: "string" }, 100>
						minItems: 100
					},
					{
						type: "array"
						prefixItems: array.repeat<{ type: ["string", "null"] }, 100>
						items: false
					}
				]
			}>
			attest<array.repeat<string, 100>, t>()
		})

		it("items of different domains", () => {
			attest(
				inferred({
					allOf: [
						{ type: "array", items: { type: "object" } },
						{ type: "array", items: { type: "array" } }
					]
				})
			).type.toString.snap("never[]")
		})
	})

	describe("const and enum", () => {
		it("a literal longer or shorter than the base allows", () => {
			const T = inferred({
				type: "array",
				prefixItems: [{ type: "number" }],
				items: false,
				const: [1, 2]
			})
			attest(T).type.toString.snap("never")
			const U = inferred({
				type: "array",
				prefixItems: [{ type: "number" }, { type: "number" }],
				minItems: 2,
				const: [1]
			})
			attest(U).type.toString.snap("never")
		})

		it("enum member with a rejected element object", () => {
			// a rejected nested literal is intersected with the base, not removed
			attest(
				inferred({
					type: "array",
					items: {
						type: "object",
						properties: { a: { type: "number" } }
					},
					enum: [[{ a: "x" }], [{ a: 1 }]]
				})
			).type.toString.snap(`	| readonly [{ a: never }]
	| readonly [{ readonly a: 1 }]`)
		})
	})

	describe("not", () => {
		it("not const keeps a tuple with an any element", () => {
			attest(
				inferType<{
					type: "array"
					prefixItems: [any]
					minItems: 1
					items: false
					not: { const: [1] }
				}>()
			).type.toString.snap("[any]")
		})

		it("not array beside an any subschema", () => {
			// an `any` subschema may be a ref, so a structured not beside it is skipped
			attest(
				inferType<{ type: "array"; items: any; not: { type: "array" } }>()
			).type.toString.snap("any[]")
		})
	})
})
