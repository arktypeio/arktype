import { attest, contextualize } from "@ark/attest"
import { jsonSchema, jsonSchemaToType } from "@ark/json-schema"
import type { array } from "@ark/util"
import type { JsonSchema } from "arktype"
import { prefixItems100 } from "./generated/schemas.ts"

// checks inference without reading the schema at runtime
// like jsonSchemaToType, the result is read back with `infer` so attest's
// contextual type isn't inferred into jsonSchema.infer
const inferred = <const schema, r = jsonSchema.infer<schema>>(
	schema: jsonSchema.validate<schema>
): r extends infer _ ? _ : never => schema as never

// display of a hand-written (mutable) schema type
const inferType = <schema>(): jsonSchema.infer<schema> => ({}) as never

type isAny<t> = 0 extends 1 & t ? true : false

type isValid<s> = s extends jsonSchema.validate<s> ? true : false

/** the element type `depth` levels into nested arrays */
type elementAt<t, depth extends number, i extends 1[] = []> =
	i["length"] extends depth ? t
	: t extends readonly (infer element)[] ? elementAt<element, depth, [...i, 1]>
	: t

contextualize(() => {
	describe("bare arrays", () => {
		it("type array", () => {
			const T = jsonSchemaToType({ type: "array" })
			attest<unknown[]>(T.infer).type.toString.snap("unknown[]")
		})

		it("annotations don't affect inference", () => {
			const T = jsonSchemaToType({
				type: "array",
				title: "list",
				description: "a list",
				default: [],
				examples: [[1], ["a"]],
				deprecated: true,
				readOnly: true,
				$comment: "comment",
				"x-foo": { bar: 1 }
			})
			attest<unknown[]>(T.infer).type.toString.snap("unknown[]")
		})

		it("object keywords on an array type are ignored", () => {
			attest<unknown[]>(
				inferred({
					type: "array",
					properties: { a: { type: "string" } },
					required: ["a"]
				})
			).type.toString.snap("unknown[]")
		})
	})

	describe("items", () => {
		it("string", () => {
			const T = jsonSchemaToType({ type: "array", items: { type: "string" } })
			attest<string[]>(T.infer).type.toString.snap("string[]")
		})

		it("true", () => {
			const T = jsonSchemaToType({ type: "array", items: true })
			attest<unknown[]>(T.infer).type.toString.snap("unknown[]")
		})

		it("false", () => {
			attest<[]>(inferred({ type: "array", items: false })).type.toString.snap(
				"[]"
			)
		})

		it("constraint-only schema", () => {
			attest<unknown[]>(
				inferred({ type: "array", items: { minLength: 1 } })
			).type.toString.snap("unknown[]")
		})

		it("anyOf items", () => {
			const T = jsonSchemaToType({
				type: "array",
				items: { anyOf: [{ type: "string" }, { type: "number" }] }
			})
			attest<(string | number)[]>(T.infer).type.toString.snap(
				"(string | number)[]"
			)
		})

		it("nested arrays", () => {
			const T = jsonSchemaToType({
				type: "array",
				items: { type: "array", items: { type: "number" } }
			})
			attest<number[][]>(T.infer).type.toString.snap("number[][]")
		})

		// only [] satisfies never[], so this is equivalent to items: false
		it("never items", () => {
			attest<never[]>(
				inferred({ type: "array", items: { not: true } })
			).type.toString.snap("never[]")
		})

		it("minItems without prefix", () => {
			const T = jsonSchemaToType({
				type: "array",
				items: { type: "string" },
				minItems: 3
			})
			attest<string[]>(T.infer).type.toString.snap("string[]")
		})

		it("maxItems 0 doesn't close the array", () => {
			const T = jsonSchemaToType({
				type: "array",
				items: { type: "string" },
				maxItems: 0
			})
			attest<string[]>(T.infer).type.toString.snap("string[]")
		})
	})

	describe("prefixItems", () => {
		it("no minItems: every element optional, open rest", () => {
			const T = jsonSchemaToType({
				type: "array",
				prefixItems: [{ type: "string" }, { type: "number" }]
			})
			attest<[string?, number?, ...unknown[]]>(T.infer).type.toString.snap(
				"[string?, number?, ...unknown[]]"
			)
		})

		it("minItems 1", () => {
			const T = jsonSchemaToType({
				type: "array",
				prefixItems: [{ type: "string" }, { type: "number" }],
				minItems: 1
			})
			attest<[string, number?, ...unknown[]]>(T.infer).type.toString.snap(
				"[string, number?, ...unknown[]]"
			)
		})

		it("minItems equal to length", () => {
			const T = jsonSchemaToType({
				type: "array",
				prefixItems: [{ type: "string" }, { type: "number" }],
				minItems: 2
			})
			attest<[string, number, ...unknown[]]>(T.infer).type.toString.snap(
				"[string, number, ...unknown[]]"
			)
		})

		it("minItems greater than length", () => {
			const T = jsonSchemaToType({
				type: "array",
				prefixItems: [{ type: "string" }, { type: "number" }],
				minItems: 5
			})
			attest<[string, number, ...unknown[]]>(T.infer).type.toString.snap(
				"[string, number, ...unknown[]]"
			)
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

		it("a widened minItems with an open rest", () => {
			attest<
				[string?, number?, ...unknown[]],
				jsonSchema.infer<{
					type: "array"
					prefixItems: [{ type: "string" }, { type: "number" }]
					minItems: number
				}>
			>()
		})

		it("true element", () => {
			attest<[unknown, string?]>(
				inferred({
					type: "array",
					prefixItems: [true, { type: "string" }],
					minItems: 1,
					items: false
				})
			).type.toString.snap("[unknown, string?]")
		})

		it("false element", () => {
			attest<[string, never?]>(
				inferred({
					type: "array",
					prefixItems: [{ type: "string" }, false],
					minItems: 1,
					items: false
				})
			).type.toString.snap("[string, never?]")
		})

		it("maxItems doesn't truncate", () => {
			attest<[string, number, ...unknown[]]>(
				inferred({
					type: "array",
					prefixItems: [{ type: "string" }, { type: "number" }],
					minItems: 2,
					maxItems: 1
				})
			).type.toString.snap("[string, number, ...unknown[]]")
		})

		it("an invalid empty prefixItems falls back to items", () => {
			attest<string[]>(
				// @ts-expect-error
				inferred({ type: "array", prefixItems: [], items: { type: "string" } })
			).type.toString.snap("string[]")
		})

		it("a const-inferred tuple is mutable", () => {
			const T = jsonSchemaToType({
				type: "array",
				prefixItems: [{ type: "string" }],
				minItems: 1,
				items: false
			})
			// mutual assignability distinguishes readonly from mutable tuples
			attest<[string]>(T.infer)
		})
	})

	describe("prefixItems with items", () => {
		it("schema rest", () => {
			const T = jsonSchemaToType({
				type: "array",
				prefixItems: [{ type: "string" }],
				items: { type: "number" }
			})
			attest<[string?, ...number[]]>(T.infer).type.toString.snap(
				"[string?, ...number[]]"
			)
		})

		it("schema rest after partially required", () => {
			const T = jsonSchemaToType({
				type: "array",
				prefixItems: [{ type: "string" }, { type: "boolean" }],
				minItems: 1,
				items: { type: "number" }
			})
			attest<[string, boolean?, ...number[]]>(T.infer).type.toString.snap(
				"[string, boolean?, ...number[]]"
			)
		})

		it("true rest", () => {
			const T = jsonSchemaToType({
				type: "array",
				prefixItems: [{ type: "string" }],
				minItems: 1,
				items: true
			})
			attest<[string, ...unknown[]]>(T.infer).type.toString.snap(
				"[string, ...unknown[]]"
			)
		})

		it("false rest", () => {
			const T = jsonSchemaToType({
				type: "array",
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: false
			})
			attest<[string?, number?]>(T.infer).type.toString.snap(
				"[string?, number?]"
			)
		})

		it("array rest", () => {
			const T = jsonSchemaToType({
				type: "array",
				prefixItems: [{ type: "string" }],
				minItems: 1,
				items: { type: "array", items: { type: "number" } }
			})
			attest<[string, ...number[][]]>(T.infer).type.toString.snap(
				"[string, ...number[][]]"
			)
		})

		// additionalItems is not a 2020-12 keyword, so it has no effect next to prefixItems
		it("additionalItems without items is ignored", () => {
			attest<[string, ...unknown[]]>(
				inferred({
					type: "array",
					prefixItems: [{ type: "string" }],
					minItems: 1,
					additionalItems: { type: "number" }
				})
			).type.toString.snap("[string, ...unknown[]]")
		})

		it("draft-07 items array next to prefixItems replaces it", () => {
			// as the runtime reads it
			const T = jsonSchemaToType({
				type: "array",
				prefixItems: [{ type: "string" }],
				minItems: 1,
				items: [{ type: "number" }]
			})
			attest<[number, ...unknown[]]>(T.infer).type.toString.snap(
				"[number, ...unknown[]]"
			)
			attest(T.allows([1, "x"])).equals(true)
			attest(T.allows(["a"])).equals(false)
		})
	})

	describe("draft-07 items array", () => {
		it("no additionalItems: optional elements, open rest", () => {
			const T = jsonSchemaToType({
				type: "array",
				items: [{ type: "string" }, { type: "number" }]
			})
			attest<[string?, number?, ...unknown[]]>(T.infer).type.toString.snap(
				"[string?, number?, ...unknown[]]"
			)
		})

		it("additionalItems false", () => {
			const T = jsonSchemaToType({
				type: "array",
				items: [{ type: "string" }, { type: "number" }],
				additionalItems: false
			})
			attest<[string?, number?]>(T.infer).type.toString.snap(
				"[string?, number?]"
			)
		})

		it("additionalItems schema", () => {
			const T = jsonSchemaToType({
				type: "array",
				items: [{ type: "string" }],
				minItems: 1,
				additionalItems: { type: "boolean" }
			})
			attest<[string, ...boolean[]]>(T.infer).type.toString.snap(
				"[string, ...boolean[]]"
			)
		})

		it("minItems 1 of 3", () => {
			const T = jsonSchemaToType({
				type: "array",
				items: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
				minItems: 1,
				additionalItems: false
			})
			attest<[string, number?, boolean?]>(T.infer).type.toString.snap(
				"[string, number?, boolean?]"
			)
		})

		it("an invalid empty items array falls back to additionalItems", () => {
			attest<string[]>(
				inferred({
					type: "array",
					// @ts-expect-error
					items: [],
					additionalItems: { type: "string" }
				})
			).type.toString.snap("string[]")
		})

		it("additionalItems without items is ignored", () => {
			attest<unknown[]>(
				inferred({ type: "array", additionalItems: { type: "string" } })
			).type.toString.snap("unknown[]")
		})
	})

	describe("hand-written tuple keywords", () => {
		it("hand-written optional prefix element", () => {
			attest(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }, { type: "number" }?]
					items: { type: "boolean" }
				}>()
			).type.toString.snap("[string?, unknown?, ...boolean[]]")
		})

		it("hand-written prefix with a rest element", () => {
			attest(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }, ...{ type: "number" }[]]
					minItems: 1
					items: { type: "boolean" }
				}>()
			).type.toString.snap("[string, ...(number | boolean)[]]")
		})

		it("hand-written prefix with a rest element and items false", () => {
			attest(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }, ...{ type: "number" }[]]
					items: false
				}>()
			).type.toString.snap("[string?, ...number[]]")
		})

		it("union of prefixItems tuples with minItems inside the longer member", () => {
			attest<[string] | [number, number, number?]>(
				inferType<{
					type: "array"
					prefixItems:
						| [{ type: "string" }]
						| [{ type: "number" }, { type: "number" }, { type: "number" }]
					minItems: 2
					items: false
				}>()
			).type.toString.snap("[string] | [number, number, number?]")
		})

		it("union of prefixItems tuples of the same length", () => {
			attest<[string, string?] | [number, number?]>(
				inferType<{
					type: "array"
					prefixItems:
						| [{ type: "string" }, { type: "string" }]
						| [{ type: "number" }, { type: "number" }]
					minItems: 1
					items: false
				}>()
			).type.toString.snap("[string, string?] | [number, number?]")
		})

		it("union of items schemas with a prefix", () => {
			attest(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }]
					items: { type: "string" } | { type: "number" }
				}>()
			).type.toString.snap("[string?, ...string[]] | [string?, ...number[]]")
		})

		it("union minItems", () => {
			attest<[string, number] | [string?, number?]>(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }, { type: "number" }]
					minItems: 0 | 2
					items: false
				}>()
			).type.toString.snap("[string, number] | [string?, number?]")
		})

		it("minItems that may be undefined", () => {
			attest<[string?, number?]>(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }, { type: "number" }]
					minItems: 2 | undefined
					items: false
				}>()
			).type.toString.snap("[string?, number?]")
		})

		it("any minItems", () => {
			attest(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }]
					minItems: any
					items: false
				}>()
			).type.toString.snap("[string?]")
		})

		it("optional prefixItems with an items schema", () => {
			attest<number[] | [string?, ...number[]]>(
				inferType<{
					type: "array"
					prefixItems?: [{ type: "string" }]
					items: { type: "number" }
				}>()
			).type.toString.snap("number[] | [string?, ...number[]]")
		})

		it("optional prefixItems with an open rest", () => {
			attest<unknown[]>(
				inferType<{ type: "array"; prefixItems?: [{ type: "string" }] }>()
			).type.toString.snap("unknown[]")
			attest<unknown[]>(
				inferType<{
					type: "array"
					prefixItems?: [{ type: "string" }]
					items: true
				}>()
			).type.toString.snap("unknown[]")
		})

		it("prefixItems that may be undefined with items false", () => {
			attest<[string?]>(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }] | undefined
					items: false
				}>()
			).type.toString.snap("[string?]")
		})

		it("an items schema that may be undefined after prefixItems", () => {
			attest<[string?, ...unknown[]]>(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }]
					items: { type: "number" } | undefined
				}>()
			).type.toString.snap("[string?, ...unknown[]]")
		})

		it("items false that may be undefined without a prefix", () => {
			attest<unknown[]>(
				inferType<{ type: "array"; items: false | undefined }>()
			).type.toString.snap("unknown[]")
		})

		it("additionalItems false that may be undefined", () => {
			attest<[string?, ...unknown[]]>(
				inferType<{
					type: "array"
					items: [{ type: "string" }]
					additionalItems: false | undefined
				}>()
			).type.toString.snap("[string?, ...unknown[]]")
		})
	})

	describe("array-only keywords with no effect on inference", () => {
		it("contains false", () => {
			attest<unknown[]>(
				inferred({ type: "array", contains: false })
			).type.toString.snap("unknown[]")
		})

		it("all together on a tuple", () => {
			attest<[string, number?, ...boolean[]]>(
				inferred({
					type: "array",
					prefixItems: [{ type: "string" }, { type: "number" }],
					items: { type: "boolean" },
					minItems: 1,
					maxItems: 10,
					contains: { type: "boolean" },
					minContains: 1,
					maxContains: 3,
					uniqueItems: true
				})
			).type.toString.snap("[string, number?, ...boolean[]]")
		})
	})

	describe("long tuples", () => {
		it("200 optional", () => {
			attest<
				Partial<array.repeat<boolean, 200>>,
				jsonSchema.infer<{
					type: "array"
					prefixItems: array.repeat<{ type: "boolean" }, 200>
					items: false
				}>
			>()
		})

		it("200 required", () => {
			attest<
				array.repeat<boolean, 200>,
				jsonSchema.infer<{
					type: "array"
					prefixItems: array.repeat<{ type: "boolean" }, 200>
					minItems: 200
					items: false
				}>
			>()
		})

		it("200 with 150 required", () => {
			attest<
				[
					...array.repeat<boolean, 150>,
					...Partial<array.repeat<boolean, 50>>,
					...string[]
				],
				jsonSchema.infer<{
					type: "array"
					prefixItems: array.repeat<{ type: "boolean" }, 200>
					minItems: 150
					items: { type: "string" }
				}>
			>()
		})

		it("const-inferred 100 elements", () => {
			const T = jsonSchemaToType(prefixItems100)
			type t = typeof T.infer
			attest<true, 50 extends t["length"] ? true : false>()
			attest<false, 49 extends t["length"] ? true : false>()
			attest<string, t[0]>()
			attest<boolean[], t[47]>()
			attest<boolean[] | undefined, t[50]>()
			attest<string | undefined, t[99]>()
		})

		it("200 elements with validated constraints", () => {
			type s = {
				type: "array"
				prefixItems: array.repeat<{ type: "string"; minLength: 1 }, 200>
				minItems: 100
				items: false
			}
			attest<true, s extends jsonSchema.validate<s> ? true : false>()
		})

		it("200 elements with one invalid", () => {
			type s = {
				type: "array"
				prefixItems: [
					...array.repeat<{ type: "string"; minLength: 1 }, 199>,
					{ type: "string"; minLength: -1 }
				]
			}
			attest<false, s extends jsonSchema.validate<s> ? true : false>()
		})

		it("a 300-element const against a 300-element prefix", () => {
			// limitation: intersectElements builds the result tuple element by element, so a const against a prefix is quadratic (1000 elements: a depth error)
			attest.instantiations([304000, "instantiations"])
			// prettier-ignore
			const T = inferred({ type: "array", prefixItems: [{ type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }, { type: "number" }], const: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299] })
			attest<300>(T.length)
		})
	})

	describe("element kinds", () => {
		it("tuple of tuples", () => {
			const T = jsonSchemaToType({
				type: "array",
				prefixItems: [
					{
						type: "array",
						prefixItems: [{ type: "number" }, { type: "number" }],
						minItems: 2,
						items: false
					},
					{
						type: "array",
						prefixItems: [{ type: "string" }],
						items: false
					}
				],
				minItems: 2,
				items: false
			})
			attest<[[number, number], [string?]]>(T.infer).type.toString.snap(
				"[[number, number], [string?]]"
			)
		})

		it("array of optional-element tuples", () => {
			const T = jsonSchemaToType({
				type: "array",
				items: {
					type: "array",
					prefixItems: [{ type: "string" }, { type: "number" }],
					minItems: 1,
					items: false
				}
			})
			attest<[string, number?][]>(T.infer).type.toString.snap(
				"[string, number?][]"
			)
		})

		it("tuple with nullable elements", () => {
			attest<[string | null, (number | null)?]>(
				inferred({
					type: "array",
					prefixItems: [
						{ type: "string", nullable: true },
						{ type: "number", nullable: true }
					],
					minItems: 1,
					items: false
				})
			).type.toString.snap("[string | null, (number | null)?]")
		})
	})

	describe("refs in tuples", () => {
		it("ref to a tuple definition", () => {
			attest<{ pair: [number, number] }>(
				inferred({
					$defs: {
						pair: {
							type: "array",
							prefixItems: [{ type: "number" }, { type: "number" }],
							minItems: 2,
							items: false
						}
					},
					type: "object",
					properties: { pair: { $ref: "#/$defs/pair" } },
					required: ["pair"]
				})
			).type.toString.snap("{ pair: [number, number] }")
		})

		it("unresolvable remote ref element", () => {
			attest<[unknown, ...unknown[]]>(
				inferred({
					type: "array",
					prefixItems: [{ $ref: "https://example.com/schema.json" }],
					minItems: 1
				})
			).type.toString.snap("[unknown, ...unknown[]]")
		})

		it("a prefix element that points to itself", () => {
			attest<[string, unknown, ...unknown[]]>(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }, { $ref: "#/prefixItems/1" }]
					minItems: 2
				}>()
			).type.toString.snap("[string, unknown, ...unknown[]]")
		})

		it("a rest and element that point to other elements", () => {
			attest<[string?, string?, ...string[]]>(
				inferType<{
					type: "array"
					prefixItems: [{ type: "string" }, { $ref: "#/prefixItems/0" }]
					items: { $ref: "#/prefixItems/1" }
				}>()
			).type.toString.snap("[string?, string?, ...string[]]")
		})

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

		it("recursive tuple rest", () => {
			type t = jsonSchema.infer<{
				type: "array"
				prefixItems: [{ type: "string" }]
				minItems: 1
				items: { $ref: "#" }
			}>
			attest<[string, ...[string, ...unknown[]][]], t>()
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

		it("recursive definition", () => {
			type Json = string | number | boolean | null | Json[]
			type t = jsonSchema.infer<{
				$defs: {
					json: {
						anyOf: [
							{ type: ["string", "number", "boolean", "null"] },
							{ type: "array"; items: { $ref: "#/$defs/json" } }
						]
					}
				}
				type: "array"
				items: { $ref: "#/$defs/json" }
			}>
			attest<Json[], t>()
			attest<false, isAny<elementAt<t, 20>>>()
		})

		it("mutually recursive tuple definitions", () => {
			type t = jsonSchema.infer<{
				$defs: {
					a: {
						type: "array"
						prefixItems: [{ type: "string" }, { $ref: "#/$defs/b" }]
						minItems: 1
						items: false
					}
					b: {
						type: "array"
						prefixItems: [{ type: "number" }, { $ref: "#/$defs/a" }]
						minItems: 1
						items: false
					}
				}
				$ref: "#/$defs/a"
			}>
			attest<[string, [number, unknown?]?], t>()
			attest<false, isAny<elementAt<t, 20>>>()
		})

		it("array of tuples through a definition", () => {
			type T = [string, T][]
			type t = jsonSchema.infer<{
				$defs: {
					t: { type: "array"; items: { $ref: "#/$defs/p" } }
					p: {
						type: "array"
						prefixItems: [{ type: "string" }, { $ref: "#/$defs/t" }]
						minItems: 2
						items: false
					}
				}
				$ref: "#/$defs/t"
			}>
			attest<T, t>()
			attest<false, isAny<t[0][1][0][1][0][1][0][1]>>()
		})

		it("recursion through an object property is deferred", () => {
			type Node = { children?: Node[] }
			type t = jsonSchema.infer<{
				type: "object"
				properties: { children: { type: "array"; items: { $ref: "#" } } }
			}>
			attest<Node, t>()
			type deep = NonNullable<
				NonNullable<
					NonNullable<NonNullable<t["children"]>[0]["children"]>[0]["children"]
				>[0]["children"]
			>
			attest<false, isAny<deep>>()
		})

		it("expression tuples through an object property", () => {
			type Expr = number | { args: [Expr, Expr] }
			type t = jsonSchema.infer<{
				$defs: {
					expr: {
						anyOf: [
							{ type: "number" },
							{
								type: "object"
								properties: {
									args: {
										type: "array"
										prefixItems: [
											{ $ref: "#/$defs/expr" },
											{ $ref: "#/$defs/expr" }
										]
										minItems: 2
										items: false
									}
								}
								required: ["args"]
							}
						]
					}
				}
				$ref: "#/$defs/expr"
			}>
			attest<Expr, t>()
			attest<
				false,
				isAny<
					Exclude<
						Exclude<Exclude<t, number>["args"][0], number>["args"][1],
						number
					>
				>
			>()
		})
	})

	describe("recursive arrays intersected with another part", () => {
		// limitation: a depth error: an array node whose items recurse back to it (through arrays only) and that is intersected with another part (allOf/anyOf/oneOf/if/$ref sibling) re-infers the node for every element (an eager fix cost roundTrip +4.1%)
		// the depth reached before the error may vary, so only the any leaf is pinned
		it("allOf with a type-only array branch", () => {
			// prettier-ignore
			// @ts-ignore
			const T = inferred({ type: "array", items: { $ref: "#" }, allOf: [{ type: "array" }] })
			attest(T).type.toString(/^any(\[])+$/)
		})

		it("recursion through an object property isn't forced", () => {
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

		it("a recursive array without another part isn't forced", () => {
			attest(() =>
				inferred({
					$defs: {
						list: {
							type: "array",
							items: { $ref: "#/$defs/list" },
							maxItems: 3
						}
					},
					$ref: "#/$defs/list"
				})
			).type.errors.is("")
		})

		it("a recursive definition allOf a tuple isn't forced", () => {
			type t = jsonSchema.infer<{
				$defs: { l: { type: "array"; items: { $ref: "#/$defs/l" } } }
				allOf: [
					{ $ref: "#/$defs/l" },
					{ type: "array"; prefixItems: [{ type: "array" }]; minItems: 1 }
				]
			}>
			attest<false, isAny<elementAt<t, 20>>>()
		})
	})

	describe("implied arrays", () => {
		it("items", () => {
			attest<string | number | boolean | object | string[] | null>(
				inferred({ items: { type: "string" } })
			).type.toString.snap(
				`	| string
	| number
	| boolean
	| object
	| string[]
	| null`
			)
		})

		it("items false", () => {
			attest<string | number | boolean | object | [] | null>(
				inferred({ items: false })
			).type.toString.snap("string | number | boolean | object | [] | null")
		})

		it("prefixItems", () => {
			attest<
				| string
				| number
				| boolean
				| object
				| [string?, number?, ...unknown[]]
				| null
			>(
				inferred({ prefixItems: [{ type: "string" }, { type: "number" }] })
			).type.toString.snap(
				`	| string
	| number
	| boolean
	| object
	| [string?, number?, ...unknown[]]
	| null`
			)
		})

		it("draft-07 items array", () => {
			attest<
				string | number | boolean | object | [string, ...unknown[]] | null
			>(
				inferred({ items: [{ type: "string" }], minItems: 1 })
			).type.toString.snap(
				`	| string
	| number
	| boolean
	| object
	| [string, ...unknown[]]
	| null`
			)
		})

		it("minItems alone doesn't imply an array", () => {
			attest<unknown>(inferred({ minItems: 1 })).type.toString.snap("unknown")
		})

		it("additionalItems alone doesn't imply an array", () => {
			attest<unknown>(
				inferred({ additionalItems: { type: "string" } })
			).type.toString.snap("unknown")
		})

		it("implied array with const", () => {
			attest<readonly ["a"]>(
				inferred({ items: { type: "string" }, const: ["a"] })
			).type.toString.snap('readonly ["a"]')
		})

		it("implied array and object", () => {
			attest<string | number | boolean | { a?: string } | number[] | null>(
				inferred({
					properties: { a: { type: "string" } },
					items: { type: "number" }
				})
			).type.toString.snap(`	| string
	| number
	| boolean
	| number[]
	| { a?: string }
	| null`)
		})
	})

	describe("type lists", () => {
		it("array or null", () => {
			const T = jsonSchemaToType({
				type: ["array", "null"],
				items: { type: "string" }
			})
			attest<string[] | null>(T.infer).type.toString.snap("string[] | null")
		})

		it("array or object", () => {
			attest<number[] | { a?: string }>(
				inferred({
					type: ["array", "object"],
					items: { type: "number" },
					properties: { a: { type: "string" } }
				})
			).type.toString.snap("number[] | { a?: string }")
		})

		it("items in a list without array is ignored", () => {
			attest<string | null>(
				inferred({ type: ["string", "null"], items: { type: "number" } })
			).type.toString.snap("string | null")
		})

		it("items on a non-array type is ignored", () => {
			attest<string>(
				inferred({ type: "string", items: { type: "number" } })
			).type.toString.snap("string")
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

		it("widened prefixItems", () => {
			type t = jsonSchema.infer<{ type: "array"; prefixItems: JsonSchema[] }>
			attest<false, isAny<t[number]>>()
			attest(
				inferType<{ type: "array"; prefixItems: JsonSchema[] }>()
			).type.toString.snap("unknown[]")
		})

		it("widened prefixItems with items", () => {
			attest<(string | number)[]>(
				inferType<{
					type: "array"
					prefixItems: { type: "string" }[]
					items: { type: "number" }
				}>()
			).type.toString.snap("(string | number)[]")
		})

		it("widened prefixItems with minItems", () => {
			attest<string[]>(
				inferType<{
					type: "array"
					prefixItems: { type: "string" }[]
					minItems: 2
					items: false
				}>()
			).type.toString.snap("string[]")
		})

		it("prefixItems widened to unknown", () => {
			attest<unknown[]>(
				inferType<{ type: "array"; prefixItems: unknown; items: false }>()
			).type.toString.snap("unknown[]")
		})

		it("widened element", () => {
			type t = jsonSchema.infer<{
				type: "array"
				prefixItems: [JsonSchema, { type: "string" }]
				minItems: 1
				items: false
			}>
			attest<[unknown, string?], t>()
			attest<false, isAny<t[0]>>()
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

		it("narrow branch types as items", () => {
			attest<
				(string | null)[],
				jsonSchema.infer<{ type: "array"; items: JsonSchema.String }>
			>()
			attest<
				(unknown[] | null)[],
				jsonSchema.infer<{ type: "array"; items: JsonSchema.Array }>
			>()
		})

		it("widened type name", () => {
			attest<
				unknown,
				jsonSchema.infer<{ type: string; items: { type: "string" } }>
			>()
		})

		it("widened values validate", () => {
			type s = {
				type: "array"
				prefixItems: JsonSchema[]
				minItems: number
				maxItems: number
				minContains: number
				uniqueItems: boolean
				items: JsonSchema
				contains: JsonSchema
			}
			attest<true, s extends jsonSchema.validate<s> ? true : false>()
		})

		it("widened draft-07 values validate", () => {
			type s = {
				type: "array"
				items: JsonSchema[]
				additionalItems: JsonSchema
			}
			attest<true, s extends jsonSchema.validate<s> ? true : false>()
		})
	})

	describe("composition", () => {
		it("anyOf of arrays", () => {
			const T = jsonSchemaToType({
				anyOf: [
					{ type: "array", items: { type: "string" } },
					{ type: "array", items: { type: "number" } }
				]
			})
			attest<string[] | number[]>(T.infer).type.toString.snap(
				"string[] | number[]"
			)
		})

		it("oneOf of tuples", () => {
			attest<[string] | [number, number]>(
				inferred({
					oneOf: [
						{
							type: "array",
							prefixItems: [{ type: "string" }],
							minItems: 1,
							items: false
						},
						{
							type: "array",
							prefixItems: [{ type: "number" }, { type: "number" }],
							minItems: 2,
							items: false
						}
					]
				})
			).type.toString.snap("[string] | [number, number]")
		})

		it("array base with anyOf items", () => {
			attest<string[] | number[]>(
				inferred({
					type: "array",
					anyOf: [{ items: { type: "string" } }, { items: { type: "number" } }]
				})
			).type.toString.snap("string[] | number[]")
		})

		it("array base with items and anyOf of constraints", () => {
			attest<string[]>(
				inferred({
					type: "array",
					items: { type: "string" },
					anyOf: [{ minItems: 1 }, { maxItems: 0 }]
				})
			).type.toString.snap("string[]")
		})

		it("allOf of array schemas", () => {
			const T = jsonSchemaToType({
				allOf: [
					{ type: "array", items: { type: "string" } },
					{ type: "array", minItems: 1 }
				]
			})
			attest<string[]>(T.infer).type.toString.snap("string[]")
		})

		it("allOf of tuple and array", () => {
			attest<[string, ...string[]]>(
				inferred({
					allOf: [
						{
							type: "array",
							prefixItems: [{ type: "string" }],
							minItems: 1
						},
						{ type: "array", items: { type: "string" } }
					]
				})
			).type.toString.snap("[string, ...string[]]")
		})

		it("not array on array or string", () => {
			attest<string>(
				inferred({
					type: ["array", "string"],
					items: { type: "string" },
					not: { type: "array" }
				})
			).type.toString.snap("string")
		})

		it("not with array constraints keeps base", () => {
			attest<string[]>(
				inferred({
					type: "array",
					items: { type: "string" },
					not: { minItems: 3 }
				})
			).type.toString.snap("string[]")
		})

		it("if/then/else on arrays", () => {
			attest<string[] | number[]>(
				inferred({
					type: "array",
					if: { minItems: 1 },
					then: { items: { type: "string" } },
					else: { items: { type: "number" } }
				})
			).type.toString.snap("string[] | number[]")
		})

		it("if/then without else keeps base", () => {
			attest<unknown[]>(
				inferred({
					type: "array",
					if: { minItems: 1 },
					then: { items: { type: "string" } }
				})
			).type.toString.snap("unknown[]")
		})

		it("$ref with array sibling keywords", () => {
			attest<string[]>(
				inferred({
					$defs: { list: { type: "array" } },
					$ref: "#/$defs/list",
					items: { type: "string" }
				})
			).type.toString.snap("string[]")
		})

		it("an OpenAPI list response", () => {
			attest<{
				data: { id: string; tags?: string[] }[]
				next?: string | null
			}>(
				inferred({
					type: "object",
					properties: {
						data: {
							type: "array",
							items: {
								type: "object",
								properties: {
									id: { type: "string", format: "uuid" },
									tags: {
										type: "array",
										items: { type: "string" },
										uniqueItems: true
									}
								},
								required: ["id"]
							}
						},
						next: { type: "string", nullable: true }
					},
					required: ["data"]
				})
			).type.toString.snap(`{
	data: { id: string; tags?: string[] }[]
	next?: string | null
}`)
		})
	})

	describe("tuple intersections", () => {
		it("an optional element that can't match a rest closes the tuple", () => {
			attest<[string?]>(
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

		it("optional elements that can't match each other close the tuple", () => {
			attest<[string?]>(
				inferred({
					allOf: [
						{
							type: "array",
							prefixItems: [{ type: "string" }, { type: "number" }]
						},
						{
							type: "array",
							prefixItems: [{ type: "string" }, { type: "string" }],
							items: { type: "boolean" }
						}
					]
				})
			).type.toString.snap("[string?]")
		})

		it("a required element the other branch's items reject", () => {
			attest<never>(
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

		it("a prefix against a branch's prefix and rest", () => {
			attest<[string]>(
				inferType<{
					allOf: [
						{
							type: "array"
							prefixItems: [{ type: "string" }, { type: "string" }]
							minItems: 1
						},
						{ type: "array"; prefixItems: [{}]; items: { type: "number" } }
					]
				}>()
			).type.toString.snap("[string]")
		})

		it("rest against required and optional elements", () => {
			attest<[string, number, number?, ...number[]]>(
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

		it("closed tuple against a longer required prefix", () => {
			attest<[string, number?]>(
				inferred({
					allOf: [
						{
							type: "array",
							prefixItems: [{ type: "string" }, { type: "number" }],
							items: false
						},
						{
							type: "array",
							prefixItems: [{ type: "string" }],
							minItems: 1
						}
					]
				})
			).type.toString.snap("[string, number?]")
		})

		it("empty tuple against a required element", () => {
			attest<[never]>([
				inferred({
					allOf: [
						{ type: "array", items: false },
						{ type: "array", prefixItems: [{ type: "string" }], minItems: 1 }
					]
				})
			]).type.toString.snap("[never]")
		})

		it("prefixItems and items from different allOf branches", () => {
			// a branch's items applies to every element, not only after another branch's prefix
			attest<[]>(
				inferred({
					type: "array",
					allOf: [
						{ prefixItems: [{ type: "string" }] },
						{ items: { type: "number" } }
					]
				})
			).type.toString.snap("[]")
		})

		it("conditional prefixItems against base items", () => {
			attest<[] | ["a"?, ...string[]]>(
				inferred({
					type: "array",
					items: { type: "string" },
					if: { minItems: 1 },
					then: { prefixItems: [{ const: "a" }] },
					else: { items: false }
				})
			).type.toString.snap('[] | ["a"?, ...string[]]')
		})

		it("oneOf tuples against base items with nullable", () => {
			attest<[] | ["a", ...string[]] | null>(
				inferred({
					type: "array",
					items: { type: "string" },
					oneOf: [
						{ prefixItems: [{ const: "a" }], minItems: 1 },
						{ items: false }
					],
					nullable: true
				})
			).type.toString.snap('[] | ["a", ...string[]] | null')
		})

		it("an implied tuple against a type list", () => {
			attest<string>(
				inferType<{
					allOf: [
						{ prefixItems: [{ type: "string" }]; minItems: 1 },
						{ type: ["array", "string"]; items: { type: "number" } }
					]
				}>()
			).type.toString.snap("string")
		})

		it("tuple properties merged by allOf", () => {
			attest<{ a: [string?] }>(
				inferType<{
					type: "object"
					allOf: [
						{
							properties: {
								a: {
									type: "array"
									prefixItems: [{ type: "string" }, { type: "number" }]
								}
							}
							required: ["a"]
						},
						{
							properties: { a: { type: "array"; items: { type: "string" } } }
						}
					]
				}>()
			).type.toString.snap("{ a: [string?] }")
		})

		it("a branch index constrains a tuple property", () => {
			attest<{ [x: string]: string[]; a: [string, ...string[]] }>(
				inferType<{
					type: "object"
					allOf: [
						{
							additionalProperties: {
								type: "array"
								items: { type: "string" }
							}
						},
						{
							properties: {
								a: {
									type: "array"
									prefixItems: [{ type: "string" }]
									minItems: 1
								}
							}
							required: ["a"]
						}
					]
				}>()
			).type.toString.snap(
				"{ [x: string]: string[]; a: [string, ...string[]] }"
			)
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
	})

	describe("array items intersected by domain", () => {
		it("implied array branches intersect by domain", () => {
			attest<string | number | boolean | object | never[] | null>(
				inferred({
					allOf: [{ items: { type: "string" } }, { items: { type: "number" } }]
				})
			).type.toString.snap(
				"string | number | boolean | object | never[] | null"
			)
		})

		it("object items allOf array items", () => {
			attest<never[]>(
				inferred({
					allOf: [
						{ type: "array", items: { type: "object" } },
						{ type: "array", items: { type: "array" } }
					]
				})
			).type.toString.snap("never[]")
		})

		it("array items allOf object items", () => {
			attest<never[]>(
				inferred({
					allOf: [
						{ type: "array", items: { type: "array" } },
						{ type: "array", items: { type: "object" } }
					]
				})
			).type.toString.snap("never[]")
		})

		it("object items with properties allOf object items", () => {
			attest<{ a?: string }[]>(
				inferred({
					allOf: [
						{
							type: "array",
							items: { type: "object", properties: { a: { type: "string" } } }
						},
						{ type: "array", items: { type: "object" } }
					]
				})
			).type.toString.snap("{ a?: string }[]")
		})

		it("object items allOf object items with properties", () => {
			// TS relates `object` to an all-optional object type, so the shortcut
			// keeps object[] (accepted, the reverse order gives { a?: string }[])
			attest<object[]>(
				inferred({
					allOf: [
						{ type: "array", items: { type: "object" } },
						{
							type: "array",
							items: { type: "object", properties: { a: { type: "string" } } }
						}
					]
				})
			).type.toString.snap("object[]")
		})
	})

	describe("const and enum arrays", () => {
		it("enum of arrays", () => {
			attest<readonly [1] | readonly ["a", "b"]>(
				inferred({ enum: [[1], ["a", "b"]] })
			).type.toString.snap('readonly [1] | readonly ["a", "b"]')
		})

		it("enum of arrays and scalars with array type", () => {
			attest<readonly [1]>(
				inferred({ type: "array", enum: [[1], "a", null] })
			).type.toString.snap("readonly [1]")
		})

		it("object enum member with array type", () => {
			attest<readonly [1]>(
				inferred({ type: "array", enum: [[1], { a: 1 }] })
			).type.toString.snap("readonly [1]")
		})

		it("a tuple literal against a union base", () => {
			const T = inferred({
				anyOf: [
					{ type: "object" },
					{ type: "array", items: { type: "number" } }
				],
				const: [1]
			})
			attest<readonly [1]>(T).type.toString.snap("readonly [1]")
		})

		it("a literal longer or shorter than the base allows", () => {
			const T = inferred({
				type: "array",
				prefixItems: [{ type: "number" }],
				items: false,
				const: [1, 2]
			})
			attest<never>(T).type.toString.snap("never")
			const U = inferred({
				type: "array",
				prefixItems: [{ type: "number" }, { type: "number" }],
				minItems: 2,
				const: [1]
			})
			attest<never>(U).type.toString.snap("never")
		})

		it("a hand-written optional element may be present", () => {
			type T = jsonSchema.infer<{
				type: "array"
				prefixItems: [{ type: "number" }]
				items: false
				const: [1?]
			}>
			attest<[1?]>({} as T).type.toString.snap("[1?]")
		})

		it("const rejected by its rest", () => {
			attest<[never]>([
				inferred({
					type: "array",
					prefixItems: [{ const: 1 }],
					items: { const: 2 },
					const: [1, 2, 3]
				})
			]).type.toString.snap("[never]")
		})

		it("enum of tuples filtered by a closed prefix", () => {
			attest<readonly [] | readonly [1]>(
				inferred({
					type: "array",
					prefixItems: [{ type: "number" }],
					items: false,
					enum: [[], [1], [1, 2], ["a"]]
				})
			).type.toString.snap("readonly [] | readonly [1]")
		})

		it("an enum of tuples against a branch's closed prefix", () => {
			attest<readonly [3]>(
				inferred({
					allOf: [
						{ enum: [[1, 2], [3]] },
						{
							type: "array",
							prefixItems: [{ type: "number" }],
							items: false
						}
					]
				})
			).type.toString.snap("readonly [3]")
		})

		it("nested const array rejected", () => {
			attest<[never]>([
				inferred({
					type: "array",
					items: { type: "array", items: { type: "number" } },
					const: [[1], ["a"]]
				})
			]).type.toString.snap("[never]")
		})

		it("consts nested in allOf against nested tuples", () => {
			attest<readonly [readonly [1]]>(
				inferred({
					allOf: [
						{ const: [[1]] },
						{
							type: "array",
							items: {
								type: "array",
								prefixItems: [{ type: "number" }],
								items: false
							}
						}
					]
				})
			)
			attest<never>(
				inferred({
					allOf: [
						{
							type: "array",
							items: {
								type: "array",
								prefixItems: [{ type: "number" }],
								items: false
							}
						},
						{ const: [[1, 2]] }
					]
				})
			)
		})

		it("nested arrays and objects against object items", () => {
			const T = inferred({
				type: "array",
				items: { type: "object" },
				enum: [[{}], [[]], []]
			})
			attest<readonly [] | readonly [{}]>(T).type.toString.snap(
				"readonly [] | readonly [{}]"
			)
		})

		it("enum member with a rejected element object", () => {
			// a rejected nested literal is intersected with the base, not removed
			attest<readonly [{ readonly a: 1 }] | readonly [{ a: never }]>(
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

	describe("const, enum and not on recursive nodes", () => {
		it("a const on a recursive node is left unfiltered", () => {
			// filtering it would need each element, which is the node itself
			attest<readonly [readonly []]>(
				inferred({
					type: "array",
					items: [{ $ref: "#" }],
					additionalItems: false,
					const: [[]]
				})
			).type.toString.snap("readonly [readonly []]")
		})

		it("enum on a recursive definition", () => {
			attest<readonly [] | readonly [readonly []]>(
				inferred({
					$defs: {
						t: {
							type: "array",
							items: { $ref: "#/$defs/t" },
							enum: [[], [[]]]
						}
					},
					$ref: "#/$defs/t"
				})
			).type.toString.snap("readonly [] | readonly [readonly []]")
		})

		it("a const through a definition whose enum recurses", () => {
			attest<readonly [readonly ["a"], "a"]>(
				inferred({
					$defs: {
						t: {
							type: ["array", "string"],
							items: { $ref: "#/$defs/t" },
							enum: ["a", ["a"]]
						}
					},
					type: "array",
					items: { $ref: "#/$defs/t" },
					const: [["a"], "a"]
				})
			).type.toString.snap('readonly [readonly ["a"], "a"]')
		})

		it("not const string on a recursive node", () => {
			type Strings = string | Strings[]
			const t = inferred({
				type: ["array", "string"],
				items: { $ref: "#" },
				not: { const: "" }
			})
			attest<Strings>(t)
		})

		it("enum on a node whose ref targets cycle eagerly through each other", () => {
			attest<"x" | { readonly a: 1 }>(
				inferred({
					$defs: {
						t: { anyOf: [{ $ref: "#/$defs/u" }, { type: "object" }] },
						u: { allOf: [{ $ref: "#/$defs/t" }] }
					},
					allOf: [{ $ref: "#/$defs/t" }],
					enum: [{ a: 1 }, "x"]
				})
			).type.toString.snap('"x" | { readonly a: 1 }')
		})

		it("not const array on a node whose ref target cycles eagerly", () => {
			attest<unknown>(
				inferred({
					$defs: { t: { anyOf: [{ $ref: "#/$defs/t" }, { type: "array" }] } },
					allOf: [{ $ref: "#/$defs/t" }],
					not: { const: [] }
				})
			).type.toString.snap("unknown")
		})
	})

	describe("not with arrays", () => {
		it("not array removes a readonly const array", () => {
			attest<"a">(
				inferred({ enum: [[1], "a"], not: { type: "array" } })
			).type.toString.snap('"a"')
		})

		it("not object keeps a readonly const array", () => {
			attest<readonly [1] | "a">(
				inferred({ enum: [[1], "a", { b: 1 }], not: { type: "object" } })
			).type.toString.snap('"a" | readonly [1]')
		})

		it("not enum removes a const array", () => {
			attest<readonly [2]>(
				inferred({ enum: [[1], [2]], not: { enum: [[1]] } })
			).type.toString.snap("readonly [2]")
		})

		it("not const removes the only tuple a prefix allows", () => {
			attest<never>(
				inferred({
					type: "array",
					prefixItems: [{ const: 1 }],
					minItems: 1,
					items: false,
					not: { const: [1] }
				})
			).type.toString.snap("never")
		})

		it("not const keeps a tuple that has other values", () => {
			attest<[number]>(
				inferred({
					type: "array",
					prefixItems: [{ type: "number" }],
					minItems: 1,
					items: false,
					not: { const: [1] }
				})
			).type.toString.snap("[number]")
			attest<[1, 2?]>(
				inferred({
					type: "array",
					prefixItems: [{ const: 1 }, { const: 2 }],
					minItems: 1,
					items: false,
					not: { const: [1] }
				})
			).type.toString.snap("[1, 2?]")
		})

		it("not const keeps a tuple with an any element", () => {
			attest<[any]>(
				inferType<{
					type: "array"
					prefixItems: [any]
					minItems: 1
					items: false
					not: { const: [1] }
				}>()
			).type.toString.snap("[any]")
			attest<[any, any]>(
				inferType<{
					type: "array"
					prefixItems: [any, any]
					minItems: 2
					items: false
					not: { enum: [[1, 2], [3, 4]] }
				}>()
			).type.toString.snap("[any, any]")
			attest<[any]>(
				inferType<{
					type: "array"
					prefixItems: [{ anyOf: [any] }]
					minItems: 1
					items: false
					not: { const: [1] }
				}>()
			).type.toString.snap("[any]")
		})

		it("not const keeps a nested tuple with an any element", () => {
			attest<[[any]]>(
				inferType<{
					type: "array"
					prefixItems: [
						{ type: "array"; prefixItems: [any]; minItems: 1; items: false }
					]
					minItems: 1
					items: false
					not: { const: [[1]] }
				}>()
			).type.toString.snap("[[any]]")
		})

		it("not array beside an any subschema", () => {
			// an `any` subschema may be a ref, so a structured not beside it is skipped
			attest<any[]>(
				inferType<{ type: "array"; items: any; not: { type: "array" } }>()
			).type.toString.snap("any[]")
		})

		it("only an exact not excludes a tuple", () => {
			attest<never>(
				inferred({
					type: "array",
					prefixItems: [{ type: "boolean" }],
					minItems: 1,
					items: false,
					not: { enum: [[true], [false]] }
				})
			)
			attest<never>(
				inferred({
					type: "array",
					prefixItems: [{ const: 1 }],
					items: false,
					minItems: 1,
					not: { type: "array", const: [1] }
				})
			)
			attest<[1]>(
				inferred({
					type: "array",
					prefixItems: [{ const: 1 }],
					items: false,
					minItems: 1,
					not: { type: "array", prefixItems: [{ const: 1 }] }
				})
			)
		})
	})

	describe("unions from allOf branches with conditionals", () => {
		it("allOf of eight refs to if/then/else rules", () => {
			attest.instantiations([9860, "instantiations"])
			inferred({
				type: "object",
				$defs: {
					r0: {
						if: { properties: { k: { const: 0 } } },
						then: { required: ["v0"] },
						else: { properties: { v0: false } }
					},
					r1: {
						if: { properties: { k: { const: 1 } } },
						then: { required: ["v1"] },
						else: { properties: { v1: false } }
					},
					r2: {
						if: { properties: { k: { const: 2 } } },
						then: { required: ["v2"] },
						else: { properties: { v2: false } }
					},
					r3: {
						if: { properties: { k: { const: 3 } } },
						then: { required: ["v3"] },
						else: { properties: { v3: false } }
					},
					r4: {
						if: { properties: { k: { const: 4 } } },
						then: { required: ["v4"] },
						else: { properties: { v4: false } }
					},
					r5: {
						if: { properties: { k: { const: 5 } } },
						then: { required: ["v5"] },
						else: { properties: { v5: false } }
					},
					r6: {
						if: { properties: { k: { const: 6 } } },
						then: { required: ["v6"] },
						else: { properties: { v6: false } }
					},
					r7: {
						if: { properties: { k: { const: 7 } } },
						then: { required: ["v7"] },
						else: { properties: { v7: false } }
					}
				},
				allOf: [
					{ $ref: "#/$defs/r0" },
					{ $ref: "#/$defs/r1" },
					{ $ref: "#/$defs/r2" },
					{ $ref: "#/$defs/r3" },
					{ $ref: "#/$defs/r4" },
					{ $ref: "#/$defs/r5" },
					{ $ref: "#/$defs/r6" },
					{ $ref: "#/$defs/r7" }
				]
			})
		})

		it("allOf of four nested allOfs of two if/then/else rules", () => {
			attest.instantiations([9730, "instantiations"])
			inferred({
				type: "object",
				allOf: [
					{
						allOf: [
							{
								if: { properties: { k: { const: 0 } } },
								then: { required: ["v0"] },
								else: { properties: { v0: false } }
							},
							{
								if: { properties: { k: { const: 1 } } },
								then: { required: ["v1"] },
								else: { properties: { v1: false } }
							}
						]
					},
					{
						allOf: [
							{
								if: { properties: { k: { const: 2 } } },
								then: { required: ["v2"] },
								else: { properties: { v2: false } }
							},
							{
								if: { properties: { k: { const: 3 } } },
								then: { required: ["v3"] },
								else: { properties: { v3: false } }
							}
						]
					},
					{
						allOf: [
							{
								if: { properties: { k: { const: 4 } } },
								then: { required: ["v4"] },
								else: { properties: { v4: false } }
							},
							{
								if: { properties: { k: { const: 5 } } },
								then: { required: ["v5"] },
								else: { properties: { v5: false } }
							}
						]
					},
					{
						allOf: [
							{
								if: { properties: { k: { const: 6 } } },
								then: { required: ["v6"] },
								else: { properties: { v6: false } }
							},
							{
								if: { properties: { k: { const: 7 } } },
								then: { required: ["v7"] },
								else: { properties: { v7: false } }
							}
						]
					}
				]
			})
		})
	})

	describe("jsonSchema values in arrays", () => {
		it("boolean values as items and prefixItems", () => {
			const t = jsonSchema(true)
			const f = jsonSchema(false)
			attest<[]>(jsonSchema({ type: "array", items: f }).infer)
			attest<[string, unknown, ...number[]]>(
				jsonSchema({
					type: "array",
					prefixItems: [jsonSchema({ type: "string" }), t],
					minItems: 2,
					items: jsonSchema({ type: "number" })
				}).infer
			).type.toString.snap("[string, unknown, ...number[]]")
			attest<[string?, number?]>(
				jsonSchema({
					type: "array",
					items: [
						jsonSchema({ type: "string" }),
						jsonSchema({ type: "number" })
					],
					additionalItems: f
				}).infer
			).type.toString.snap("[string?, number?]")
		})

		it("a tuple value as items, in $defs and in allOf", () => {
			const pair = jsonSchema({
				type: "array",
				prefixItems: [{ type: "string" }, { type: "number" }],
				minItems: 2,
				items: false
			})
			attest<[string, number][]>(
				jsonSchema({ type: "array", items: pair }).infer
			).type.toString.snap("[string, number][]")
			attest<[string, number][]>(
				jsonSchema({
					type: "array",
					items: { $ref: "#/$defs/pair" },
					$defs: { pair }
				}).infer
			)
			attest<[string, number]>(
				jsonSchema({
					type: "array",
					allOf: [pair, { items: { type: ["string", "number"] } }]
				}).infer
			)
		})

		it("a spread value with an overridden array keyword", () => {
			const list = jsonSchema({ type: "array", items: { type: "string" } })
			attest(
				jsonSchema({ ...list, items: { type: "number" } }).infer
			).type.toString.snap("number[]")
		})

		it("a spread jsonSchema.as value with a type", () => {
			const pair = jsonSchema.as<[string, number]>({})
			attest(jsonSchema({ ...pair, type: "string" }).infer).type.toString.snap(
				"string"
			)
		})

		it("a jsonSchema.as value as items", () => {
			const pair = jsonSchema.as<[string, number]>({})
			attest(
				jsonSchema({ type: "array", items: pair }).infer
			).type.toString.snap("[string, number][]")
		})
	})

	describe("dialects", () => {
		it("a draft-07 const beside the root $ref is ignored", () => {
			attest<string[]>(
				inferred({
					$schema: "http://json-schema.org/draft-07/schema#",
					$ref: "#/definitions/list",
					definitions: { list: { type: "array", items: { type: "string" } } },
					const: [1]
				})
			)
		})

		it("$ref siblings in items by dialect", () => {
			attest<string[]>(
				inferred({
					$schema: "http://json-schema.org/draft-07/schema#",
					type: "array",
					items: { $ref: "#/definitions/Item", type: "number" },
					definitions: { Item: { type: "string" } }
				})
			)
			attest<never[]>(
				inferred({
					type: "array",
					items: { $ref: "#/$defs/Item", type: "number" },
					$defs: { Item: { type: "string" } }
				})
			)
		})

		it("$id beside $ref in a tuple element by dialect", () => {
			attest<[string?, number?]>(
				inferred({
					type: "array",
					prefixItems: [
						{
							$id: "http://example.com/item",
							$defs: { a: { type: "string" } },
							$ref: "#/$defs/a"
						},
						{ $ref: "#/$defs/a" }
					],
					items: false,
					$defs: { a: { type: "number" } }
				})
			)
			attest<[number?]>(
				inferred({
					$schema: "http://json-schema.org/draft-07/schema#",
					type: "array",
					items: [
						{
							$id: "http://example.com/item",
							definitions: { a: { type: "string" } },
							$ref: "#/definitions/a"
						}
					],
					additionalItems: false,
					definitions: { a: { type: "number" } }
				})
			)
		})

		it("a draft-04 id resource as items", () => {
			attest<string[][]>(
				inferred({
					$schema: "http://json-schema.org/draft-04/schema#",
					type: "array",
					items: {
						id: "http://example.com/item",
						definitions: { a: { type: "string" } },
						type: "array",
						items: { $ref: "#/definitions/a" }
					},
					definitions: { a: { type: "number" } }
				})
			)
		})

		it("prefixItems under a declared draft-07 $schema", () => {
			// limitation: keywords apply regardless of a declared older dialect (draft-07 has no prefixItems), as jsonSchemaToType ignores $schema at runtime too
			attest(
				inferred({
					$schema: "http://json-schema.org/draft-07/schema#",
					type: "array",
					prefixItems: [{ type: "string" }]
				})
			).type.toString.snap("[string?, ...unknown[]]")
		})
	})

	describe("validation", () => {
		it("valid array schemas are returned unchanged", () => {
			type s = {
				type: "array"
				prefixItems: [{ type: "string" }, true, false, {}]
				items: { type: "number" }
				minItems: 2
				maxItems: 10
				contains: { type: "string" }
				minContains: 1
				maxContains: 2
				uniqueItems: true
			}
			attest<true, s extends jsonSchema.validate<s> ? true : false>()
		})

		it("valid draft-07 schemas are returned unchanged", () => {
			type s = {
				type: "array"
				items: [{ type: "string" }, { $ref: "#" }]
				additionalItems: { type: "number" }
				minItems: 0
			}
			attest<true, s extends jsonSchema.validate<s> ? true : false>()
		})

		it("bad type name in items", () => {
			attest(() =>
				jsonSchemaToType({
					type: "array",
					// @ts-expect-error
					items: { type: "strng" }
				})
			).type.errors(`Did you mean '"string"'?`)
		})

		it("bad type name in prefixItems", () => {
			attest(() =>
				jsonSchemaToType({
					type: "array",
					prefixItems: [
						{ type: "string" },
						// @ts-expect-error
						{ type: "numbr" }
					]
				})
			).type.errors(`Did you mean '"number"'?`)
		})

		it("bad type name in additionalItems", () => {
			attest(() =>
				jsonSchemaToType({
					type: "array",
					items: [{ type: "string" }],
					// @ts-expect-error
					additionalItems: { type: "nul" }
				})
			).type.errors(`Did you mean '"null"'?`)
		})

		it("bad type name in the array type list", () => {
			attest(() =>
				// @ts-expect-error
				jsonSchemaToType({ type: ["aray", "null"], items: { type: "string" } })
			).type.errors(`Did you mean '"array"'?`)
		})

		it("non-schema items", () => {
			attest(() =>
				jsonSchemaToType({
					type: "array",
					// @ts-expect-error
					items: "string"
				})
			).type.errors("JSON Schema must be an object or a boolean (was string)")
		})

		it("null items", () => {
			attest(() =>
				jsonSchemaToType({
					type: "array",
					// @ts-expect-error
					items: null
				})
			).type.errors("JSON Schema must be an object or a boolean (was null)")
		})

		it("non-schema draft-07 items element", () => {
			attest(() =>
				jsonSchemaToType({
					type: "array",
					// @ts-expect-error
					items: [{ type: "string" }, 1]
				})
			).type.errors("JSON Schema must be an object or a boolean (was number)")
		})

		it("nested array as a prefixItems element", () => {
			attest(() =>
				jsonSchemaToType({
					type: "array",
					// @ts-expect-error
					prefixItems: [[{ type: "string" }]]
				})
			).type.errors("JSON Schema must be an object or a boolean (was array)")
		})

		it("non-array prefixItems", () => {
			attest(() =>
				jsonSchemaToType({
					type: "array",
					// @ts-expect-error
					prefixItems: { type: "string" }
				})
			).type.errors.snap(
				"Object literal may only specify known properties, and 'type' does not exist in type 'readonly (boolean | object)[]'."
			)
		})

		it("non-array prefixItems error names no internal alias", () => {
			attest(() =>
				jsonSchemaToType({
					type: "array",
					// @ts-expect-error
					prefixItems: "x"
				})
			).type.errors(/^(?![\S\s]*StaticallyValidSchema)/)
		})

		it("non-schema contains", () => {
			attest(() =>
				jsonSchemaToType({
					type: "array",
					// @ts-expect-error
					contains: "string"
				})
			).type.errors("JSON Schema must be an object or a boolean (was string)")
		})

		it("unevaluatedItems", () => {
			attest(() =>
				inferred({
					type: "array",
					// @ts-expect-error
					unevaluatedItems: false
				})
			).type.errors("unevaluatedItems isn't supported by jsonSchemaToType")
		})

		it("non-boolean uniqueItems", () => {
			attest(() =>
				jsonSchemaToType({
					type: "array",
					// @ts-expect-error
					uniqueItems: 1
				})
			).type.errors(`Type 'number' is not assignable to type 'boolean'`)
		})

		it("negative minItems", () => {
			attest(() =>
				jsonSchemaToType({
					type: "array",
					// @ts-expect-error
					minItems: -1
				})
			).type.errors("minItems must be a non-negative integer (was -1)")
		})

		it("non-integer minItems", () => {
			attest(() =>
				jsonSchemaToType({
					type: "array",
					prefixItems: [{ type: "string" }],
					// @ts-expect-error
					minItems: 0.5
				})
			).type.errors("minItems must be a non-negative integer (was 0.5)")
		})

		it("an empty prefixItems", () => {
			// the 2020-12 meta-schema requires prefixItems to be non-empty (like allOf)
			attest(
				{} as isValid<{ type: "array"; prefixItems: [] }>
			).type.toString.snap("false")
		})

		it("an empty draft-07 items array", () => {
			// the draft-07 meta-schema requires an items array to be non-empty (like allOf)
			attest({} as isValid<{ type: "array"; items: [] }>).type.toString.snap(
				"false"
			)
		})

		it("prefixItems, items and additionalItems", () => {
			// additionalItems applies only beside a draft-07 items array
			const T = jsonSchemaToType({
				type: "array",
				prefixItems: [{ type: "string" }],
				items: false,
				additionalItems: false
			})
			attest(T.infer).type.toString.snap("[string?]")
			attest(T.expression).snap("[string?]")
		})

		it("prefixItems beside items that may be an array", () => {
			// either reading may apply
			attest(
				{} as jsonSchema.infer<{
					type: "array"
					prefixItems: [{ type: "string" }]
					items: { type: "boolean" } | [{ type: "number" }]
				}>
			).type.toString.snap("unknown[]")
		})

		it("non-array items and additionalItems", () => {
			const T = jsonSchemaToType({
				type: "array",
				items: { type: "string" },
				additionalItems: { type: "number" }
			})
			attest(T.infer).type.toString.snap("string[]")
			attest(T.expression).snap("string[]")
		})

		it("true items and additionalItems", () => {
			const T = jsonSchemaToType({
				type: "array",
				items: true,
				additionalItems: false
			})
			attest(T.infer).type.toString.snap("unknown[]")
			attest(T.expression).snap("Array")
		})

		it("refs into prefixItems and draft-07 items", () => {
			attest<
				true,
				isValid<{
					type: "array"
					prefixItems: [{ type: "string" }]
					items: { $ref: "#/prefixItems/0" }
				}>
			>()
			attest<
				true,
				isValid<{
					type: "array"
					items: [{ type: "string" }]
					additionalItems: { $ref: "#/items/0" }
				}>
			>()
		})

		it("refs past the end of prefixItems or to the list itself", () => {
			attest<
				false,
				isValid<{
					type: "array"
					prefixItems: [{ type: "string" }]
					items: { $ref: "#/prefixItems/1" }
				}>
			>()
			attest<
				false,
				isValid<{
					type: "array"
					items: [{ type: "string" }]
					additionalItems: { $ref: "#/items" }
				}>
			>()
		})

		it("unresolvable ref in prefixItems", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					type: "array",
					// @ts-expect-error
					prefixItems: [{ $ref: "#/$defs/b" }]
				})
			).type.errors(`"#/$defs/a"`)
		})

		it("unresolvable ref in items", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					type: "array",
					items: {
						// @ts-expect-error
						$ref: "#/$defs/missing"
					}
				})
			).type.errors.snap(
				'Type \'"#/$defs/missing"\' is not assignable to type \'"#" | "#/$defs/a" | undefined\'.'
			)
		})

		it("errors are placed on the bad element only", () => {
			attest(() =>
				jsonSchemaToType({
					type: "array",
					prefixItems: [
						{ type: "string" },
						{ type: "number" },
						// @ts-expect-error
						{ type: "string", minLength: -1 },
						{ type: "boolean" }
					]
				})
			).type.errors.snap(
				"Type 'number' is not assignable to type '\"minLength must be a non-negative integer (was -1)​\"'."
			)
		})
	})

	describe("validation of optional and union keywords", () => {
		it("items with an optional additionalItems", () => {
			attest(
				{} as isValid<{
					type: "array"
					items: { type: "number" }
					additionalItems?: false
				}>
			).type.toString.snap("true")
		})

		it("prefixItems and items with an optional additionalItems", () => {
			attest(
				{} as isValid<{
					type: "array"
					prefixItems: [{ type: "number" }]
					items: { type: "number" }
					additionalItems?: false
				}>
			).type.toString.snap("true")
		})

		it("a union prefixItems with an empty member", () => {
			attest(
				{} as isValid<{
					type: "array"
					prefixItems: [] | [{ type: "string" }]
				}>
			).type.toString.snap("false")
		})

		it("a union prefixItems with an invalid member", () => {
			attest(
				{} as isValid<{
					type: "array"
					prefixItems: [{ type: "string" }] | [{ type: "strin" }]
				}>
			).type.toString.snap("false")
		})

		it("prefixItems with a rest element", () => {
			attest(
				{} as isValid<{
					type: "array"
					prefixItems: readonly [{ type: "string" }, ...{ type: "string" }[]]
				}>
			).type.toString.snap("true")
			attest(
				{} as isValid<{
					type: "array"
					prefixItems: [{ type: "string" }, ...{ type: "strin" }[]]
				}>
			).type.toString.snap("false")
		})

		it("an invalid draft-07 items array beside a valid items schema", () => {
			attest(
				{} as isValid<{
					type: "array"
					items: { type: "string" } | [{ minLength: -1 }]
				}>
			).type.toString.snap("false")
		})

		it("an empty items array beside a valid items schema", () => {
			attest(
				{} as isValid<{ type: "array"; items: { type: "string" } | [] }>
			).type.toString.snap("false")
		})

		it("an invalid items schema beside a valid items array", () => {
			attest(
				{} as isValid<{
					type: "array"
					items: [{ type: "string" }] | { minLength: -1 }
				}>
			).type.toString.snap("false")
			attest(
				{} as isValid<{ type: "array"; items: true | [{ minLength: -1 }] }>
			).type.toString.snap("false")
		})

		it("valid union members in array keywords", () => {
			attest<true>(
				{} as isValid<{
					type: "array"
					items:
						| { type: "string"; enum: ["a"] }
						| { type: "number"; minimum: 0 }
				}>
			)
			attest<true>(
				{} as isValid<{
					type: "array"
					prefixItems: [{ const: [1] } | { enum: [[1]] }]
				}>
			)
			attest<true>(
				{} as isValid<{
					type: "array"
					items:
						| [{ type: "string" }, { type: "number"; minimum: 1 }]
						| [{ type: "string"; minLength: 1 }]
				}>
			)
			attest<true>(
				{} as isValid<{
					type: "array"
					items: { type: "string"; minLength: 1 } | [{ type: "string" }]
				}>
			)
			attest<true>(
				{} as isValid<{
					type: "array"
					items: { type: "string" } | [true]
					additionalItems: { type: "string" }
				}>
			)
			attest<true>(
				{} as isValid<{
					type: "array"
					items: { exclusiveMinimum: 1 } | { minimum: 1; exclusiveMinimum: 2 }
				}>
			)
		})

		it("invalid union members in array keywords", () => {
			attest(
				{} as isValid<{
					type: "array"
					prefixItems: [
						{ type: "array"; minItems: 1 } | { type: "array"; minItems: -1 }
					]
				}>
			).type.toString.snap("false")
			attest(
				{} as isValid<{
					type: "array"
					contains: { type: "string" } | { minLength: -1 }
				}>
			).type.toString.snap("false")
			attest(
				{} as isValid<{ type: "array"; minItems: 1 | -1 }>
			).type.toString.snap("false")
		})
	})

	describe("required typos on array spines", () => {
		type O = {
			type: "object"
			properties: { a: { type: "string" } }
			required: ["b"]
		}

		it("errors in items and prefixItems on an isolated spine", () => {
			attest({} as isValid<{ type: "array"; items: O }>).type.toString.snap(
				"false"
			)
			attest(
				{} as isValid<{ type: "array"; prefixItems: [O] }>
			).type.toString.snap("false")
			attest(
				{} as isValid<{
					type: "array"
					prefixItems: [O]
					items: { properties: { b: {} } }
				}>
			).type.toString.snap("false")
			attest(
				{} as isValid<{
					type: "object"
					properties: { list: { type: "array"; items: O } }
				}>
			).type.toString.snap("false")
		})

		it("no error where another schema applies to the same element", () => {
			attest<true>(
				{} as isValid<{
					type: "array"
					items: O
					contains: { properties: { b: {} } }
				}>
			)
			attest<true>({} as isValid<{ type: "array"; items: [O] }>)
			attest<true>(
				{} as isValid<{
					type: "array"
					items: O
					allOf: [{ items: { properties: { b: {} } } }]
				}>
			)
			attest<true>(
				{} as isValid<{
					type: "array"
					items: O
					if: { minItems: 1 }
					then: { items: { properties: { b: {} } } }
				}>
			)
		})
	})

	describe("completions", () => {
		it("uniqueItems and unevaluatedItems", () => {
			attest(() =>
				// prettier-ignore
				inferred({ type: "array", "un": true })
			).completions({
				un: ["unevaluatedItems", "unevaluatedProperties", "uniqueItems"]
			})
		})

		it("keyword names inside items", () => {
			attest(() =>
				// prettier-ignore
				jsonSchemaToType({ type: "array", items: { type: "string", "maxLe": 1 } })
			).completions({ maxLe: ["maxLength"] })
		})

		it("keyword names inside prefixItems next to a boolean element", () => {
			attest(() =>
				// prettier-ignore
				inferred({ type: "array", prefixItems: [true, { type: "string", "minLe": 1 }] })
			).completions({ minLe: ["minLength"] })
		})

		it("keyword names inside a draft-07 items array next to a boolean element", () => {
			attest(() =>
				// prettier-ignore
				inferred({ type: "array", items: [false, { type: "string", "patte": "a" }] })
			).completions({ patte: ["pattern", "patternProperties"] })
		})

		it("keyword names inside additionalItems", () => {
			attest(() =>
				// prettier-ignore
				inferred({ type: "array", items: [true], additionalItems: { type: "string", "maxLe": 1 } })
			).completions({ maxLe: ["maxLength"] })
		})

		it("keyword names inside contains", () => {
			attest(() =>
				// prettier-ignore
				inferred({ type: "array", contains: { type: "number", "multipl": 2 } })
			).completions({ multipl: ["multipleOf"] })
		})

		it("keyword names inside items next to an invalid keyword", () => {
			attest(() =>
				jsonSchemaToType({
					type: "array",
					// @ts-expect-error
					minItems: -1,
					// prettier-ignore
					items: { type: "string", "minLe": 1 }
				})
			).completions({ minLe: ["minLength"] })
		})

		it("keyword names inside prefixItems when a count is invalid", () => {
			attest(() =>
				// prettier-ignore
				// @ts-expect-error
				inferred({ type: "array", minItems: -1, prefixItems: [{ type: "string", "minLe": 1 }] })
			).completions({ minLe: ["minLength"] })
		})

		it("type names inside items", () => {
			attest(() =>
				jsonSchemaToType({
					type: "array",
					// @ts-expect-error
					items: { type: "bo" }
				})
			).completions({ bo: ["boolean"] })
		})

		it("type names inside a type list in prefixItems", () => {
			attest(() =>
				jsonSchemaToType({
					type: "array",
					// @ts-expect-error
					prefixItems: [{ type: ["string", "nu"] }]
				})
			).completions({ nu: ["null", "number"] })
		})

		it("refs inside items", () => {
			attest(() =>
				inferred({
					$defs: { point: { type: "object" } },
					type: "array",
					// @ts-expect-error
					items: { $ref: "#/$defs/p" }
				})
			).completions({ "#/$defs/p": ["#/$defs/point"] })
		})

		it("refs inside a draft-07 items array", () => {
			attest(() =>
				inferred({
					$defs: { point: { type: "object" } },
					type: "array",
					// @ts-expect-error
					items: [{ $ref: "#/$defs/p" }]
				})
			).completions({ "#/$defs/p": ["#/$defs/point"] })
		})
	})
})
