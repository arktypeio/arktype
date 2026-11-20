import { attest, contextualize } from "@ark/attest"
import {
	annotatingFallback,
	rootSchema,
	schemaScope,
	type ToJsonSchema
} from "@ark/schema"
import { Ajv } from "ajv"
import { Ajv2020 } from "ajv/dist/2020.js"
import { parse, toJsonSchema } from "arksets"

const ajv2020 = new Ajv2020({ strict: false, validateFormats: false })
const ajv07 = new Ajv({ strict: false, validateFormats: false })

const openApiPrefixFallback: ToJsonSchema.Options["fallback"] = {
	arrayPrefix: ctx => ctx.base
}

contextualize(() => {
	describe("tuple length bounds", () => {
		it("keeps tighter minItems on optional tuples across targets", () => {
			const T = rootSchema({
				proto: Array,
				sequence: { prefix: ["string"], optionals: ["number"] }
			}).and({ proto: Array, minLength: 2 })

			const schema2020 = toJsonSchema(T)
			attest(schema2020).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "array",
				minItems: 2,
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: false
			})

			const schema07 = toJsonSchema(T, { target: "draft-07" })
			attest(schema07).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "array",
				minItems: 2,
				items: [{ type: "string" }, { type: "number" }],
				additionalItems: false
			})

			attest(toJsonSchema(T, { target: "openapi-3.1" })).snap({
				type: "array",
				minItems: 2,
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: false
			})

			attest(
				toJsonSchema(T, {
					target: "openapi-3.0",
					fallback: openApiPrefixFallback
				})
			).snap({
				type: "array",
				items: {},
				minItems: 2,
				maxItems: 2
			})

			const v2020 = ajv2020.compile(schema2020)
			const v07 = ajv07.compile(schema07)
			for (const sample of [["a"], ["a", 1], ["a", 1, 2]]) {
				attest(v2020(sample)).equals(T.allows(sample))
				attest(v07(sample)).equals(T.allows(sample))
			}
		})

		it("keeps tighter minItems on variadic tuples across targets", () => {
			const T = rootSchema({
				proto: Array,
				sequence: { prefix: ["string"], variadic: "number" }
			}).and({ proto: Array, minLength: 3 })

			const schema2020 = toJsonSchema(T)
			attest(schema2020).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "array",
				minItems: 3,
				prefixItems: [{ type: "string" }],
				items: { type: "number" }
			})

			const schema07 = toJsonSchema(T, { target: "draft-07" })
			attest(schema07).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "array",
				minItems: 3,
				items: [{ type: "string" }],
				additionalItems: { type: "number" }
			})

			attest(toJsonSchema(T, { target: "openapi-3.1" })).snap({
				type: "array",
				minItems: 3,
				prefixItems: [{ type: "string" }],
				items: { type: "number" }
			})

			attest(
				toJsonSchema(T, {
					target: "openapi-3.0",
					fallback: {
						arrayPrefix: ctx => ({
							...ctx.base,
							items: { anyOf: [...ctx.elements, ctx.items!] }
						})
					}
				})
			).snap({
				type: "array",
				items: { anyOf: [{ type: "string" }, { type: "number" }] },
				minItems: 3
			})

			const v2020 = ajv2020.compile(schema2020)
			const v07 = ajv07.compile(schema07)
			for (const sample of [["a"], ["a", 1], ["a", 1, 2], ["a", 1, 2, 3]]) {
				attest(v2020(sample)).equals(T.allows(sample))
				attest(v07(sample)).equals(T.allows(sample))
			}
		})

		it("keeps tighter maxItems on non-variadic tuples across targets", () => {
			const T = rootSchema({
				proto: Array,
				sequence: { prefix: ["string"], optionals: ["number"] }
			}).and({ proto: Array, maxLength: 1 })

			const schema2020 = toJsonSchema(T)
			attest(schema2020).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "array",
				minItems: 1,
				maxItems: 1,
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: false
			})

			const schema07 = toJsonSchema(T, { target: "draft-07" })
			attest(schema07).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "array",
				minItems: 1,
				maxItems: 1,
				items: [{ type: "string" }, { type: "number" }],
				additionalItems: false
			})

			attest(toJsonSchema(T, { target: "openapi-3.1" })).snap({
				type: "array",
				minItems: 1,
				maxItems: 1,
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: false
			})

			attest(
				toJsonSchema(T, {
					target: "openapi-3.0",
					fallback: openApiPrefixFallback
				})
			).snap({
				type: "array",
				items: {},
				minItems: 1,
				maxItems: 1
			})

			const v2020 = ajv2020.compile(schema2020)
			const v07 = ajv07.compile(schema07)
			for (const sample of [[], ["a"], ["a", 1]]) {
				attest(v2020(sample)).equals(T.allows(sample))
				attest(v07(sample)).equals(T.allows(sample))
			}

			// optional-only tuple bounded by <= 1 (minLength 0)
			const OptOnly = rootSchema({
				proto: Array,
				sequence: { optionals: ["string", "number"] }
			}).and({ proto: Array, maxLength: 1 })
			attest(toJsonSchema(OptOnly, { dialect: null })).snap({
				type: "array",
				maxItems: 1,
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: false
			})
		})
	})

	describe("flagless regexes sensitive to u flag", () => {
		const uSensitivePatterns = [
			"^\\p{L}$",
			"^\\P{L}$",
			"^a\\-b$",
			"^\\u{61}$",
			"^[\\u{61}]$",
			"^{$",
			"^[😀]$",
			"^😀+$",
			"^😀$",
			"^[\\uD83D\\uDE00]$"
		]

		it("routes flagless u-sensitive and astral patterns to patternFlags fallback", () => {
			for (const pattern of uSensitivePatterns) {
				const T = rootSchema({ domain: "string", pattern })
				for (const target of [
					"draft-2020-12",
					"draft-07",
					"openapi-3.0",
					"openapi-3.1"
				] as const)
					attest(() => toJsonSchema(T, { target })).throws("patternFlags")

				attest(
					toJsonSchema(T, { dialect: null, fallback: annotatingFallback })
				).equals({
					type: "string",
					"x-arktype-patterns": [{ rule: pattern, flags: "" }]
				} as never)
			}
		})

		it("routes u-sensitive index key patterns away from patternProperties", () => {
			const T = rootSchema({
				domain: "object",
				index: {
					signature: { domain: "string", pattern: "^\\p{L}$" },
					value: "number"
				},
				undeclared: "reject"
			})
			attest(() => toJsonSchema(T)).throws("patternFlags")
		})

		it("continues writing ordinary flagless patterns directly across targets", () => {
			for (const pattern of [
				"^a+$",
				".*",
				"^.*$",
				".+",
				"^a.b$",
				"^[a\\-b]$",
				"^[\\dA-Fa-f]+$",
				"^[^@]+$",
				"^\\S+$",
				// string.trim.preformatted / type("string.trim").out
				"^\\S[\\S\\s]*\\S$|^\\S?$",
				"^\\D+$",
				"^\\W+$",
				"^.$",
				"^\\\\p{1}$"
			]) {
				const T = rootSchema({ domain: "string", pattern })
				attest(toJsonSchema(T, { dialect: null })).equals({
					type: "string",
					pattern
				})
				for (const target of [
					"draft-2020-12",
					"draft-07",
					"openapi-3.0",
					"openapi-3.1"
				] as const) {
					attest(toJsonSchema(T, { target })).equals({
						...(target === "draft-2020-12" && {
							$schema: "https://json-schema.org/draft/2020-12/schema"
						}),
						...(target === "draft-07" && {
							$schema: "http://json-schema.org/draft-07/schema#"
						}),
						type: "string",
						pattern
					})
				}
			}
		})
	})

	describe("non-JSON examples and annotations", () => {
		it("omits non-JSON examples and converts valid Dates to ISO strings", () => {
			const Big = rootSchema("bigint").configure({ examples: [5n] })
			attest(
				toJsonSchema(Big, {
					dialect: null,
					fallback: { domain: ctx => ({ ...ctx.base, type: "integer" }) }
				})
			).snap({ type: "integer" })

			const At = rootSchema({
				domain: "object",
				required: [
					{
						key: "at",
						value: rootSchema("Date").configure({ examples: [new Date(0)] })
					}
				]
			})
			attest(
				toJsonSchema(At, {
					dialect: null,
					fallback: {
						date: ctx => ({
							...ctx.base,
							type: "string",
							format: "date-time"
						})
					}
				})
			).snap({
				type: "object",
				properties: {
					at: {
						type: "string",
						format: "date-time",
						examples: ["1970-01-01T00:00:00.000Z"]
					}
				},
				required: ["at"]
			})

			attest(
				toJsonSchema(At, {
					target: "openapi-3.0",
					fallback: {
						date: ctx => ({
							...ctx.base,
							type: "string",
							format: "date-time"
						})
					}
				})
			).snap({
				type: "object",
				properties: {
					at: {
						type: "string",
						format: "date-time",
						example: "1970-01-01T00:00:00.000Z"
					}
				},
				required: ["at"]
			})
		})

		it("filters mixed, sparse, and non-JSON examples and x- extensions", () => {
			// eslint-disable-next-line no-sparse-arrays
			const sparse = [1, , 3]
			// eslint-disable-next-line no-sparse-arrays
			const allHoles = [, ,]

			const Mixed = rootSchema({}).configure({
				examples: [
					5n,
					new Date(0),
					new Date(Number.NaN),
					undefined,
					() => {},
					Symbol("s"),
					"ok",
					{ at: new Date(0) },
					{ bad: 5n }
				],
				"x-date": new Date(0),
				"x-invalid-date": new Date(Number.NaN),
				"x-bigint": 5n,
				"x-symbol": Symbol("s"),
				"x-undef": undefined,
				"x-sparse": sparse
			} as never)

			attest(toJsonSchema(Mixed, { dialect: null })).snap({
				examples: [
					"1970-01-01T00:00:00.000Z",
					"ok",
					{ at: "1970-01-01T00:00:00.000Z" }
				],
				"x-date": "1970-01-01T00:00:00.000Z"
			})

			const SparseExamples = rootSchema("number").configure({
				examples: sparse as never
			})
			attest(toJsonSchema(SparseExamples, { dialect: null })).snap({
				type: "number",
				examples: [1, 3]
			})

			const AllHolesExamples = rootSchema("number").configure({
				examples: allHoles as never
			})
			attest(toJsonSchema(AllHolesExamples, { dialect: null })).snap({
				type: "number"
			})

			const InvalidDateOnly = rootSchema("string").configure({
				examples: [new Date(Number.NaN)]
			})
			attest(toJsonSchema(InvalidDateOnly, { dialect: null })).snap({
				type: "string"
			})
		})
	})

	describe("io sides, union annotations, and $ref escaping", () => {
		it("does not mix input and output sides for undeclared delete with defaulted keys", () => {
			const T = rootSchema({
				domain: "object",
				required: [{ key: "b", value: "number" }],
				optional: [{ key: "a", value: "string", default: "x" }],
				undeclared: "delete"
			})
			attest(T.toJsonSchema({ dialect: null })).snap({
				type: "object",
				properties: {
					b: { type: "number" },
					a: { type: "string", default: "x" }
				},
				required: ["b"]
			})
			attest(T.toJsonSchema({ dialect: null, io: "in" })).snap({
				type: "object",
				properties: {
					b: { type: "number" },
					a: { type: "string", default: "x" }
				},
				required: ["b"]
			})
			attest(T.toJsonSchema({ dialect: null, io: "out" })).snap({
				type: "object",
				properties: { a: { type: "string" }, b: { type: "number" } },
				required: ["a", "b"],
				additionalProperties: false
			})

			const Morph = rootSchema({
				in: "string",
				morphs: [(s: string) => Number(s)],
				declaredOut: rootSchema("number")
			})
			attest(Morph.toJsonSchema({ dialect: null, io: "in" })).snap({
				type: "string"
			})
			attest(Morph.toJsonSchema({ dialect: null, io: "out" })).snap({
				type: "number"
			})
		})

		it("does not duplicate union meta onto branches", () => {
			const SN = rootSchema(["string", "number"]).configure({ title: "SN" })
			attest(SN.toJsonSchema({ dialect: null })).snap({
				anyOf: [{ type: "number" }, { type: "string" }],
				title: "SN"
			})

			const DescribedBranch = rootSchema([
				rootSchema("string").describe("text"),
				"number"
			]).configure({ title: "SN" })
			attest(DescribedBranch.toJsonSchema({ dialect: null })).snap({
				anyOf: [{ type: "number" }, { type: "string", description: "text" }],
				title: "SN"
			})

			const Nullable = rootSchema(["string", { unit: null }]).configure({
				title: "SN"
			})
			attest(Nullable.toJsonSchema({ dialect: null })).snap({
				anyOf: [{ type: "string" }, { type: "null" }],
				title: "SN"
			})
		})

		it("JSON-Pointer-escapes alias $refs and handles Object.prototype def names", () => {
			const $ = schemaScope({
				"a/b": { domain: "object", required: [{ key: "x", value: "string" }] },
				"a~b": { domain: "object", required: [{ key: "y", value: "number" }] },
				"a b": { domain: "object", required: [{ key: "z", value: "boolean" }] },
				toString: {
					domain: "object",
					required: [{ key: "s", value: "string" }]
				}
			})
			const defs = $.export()
			const root = $.schema({
				domain: "object",
				required: [
					{ key: "slash", value: defs["a/b"] },
					{ key: "tilde", value: defs["a~b"] },
					{ key: "space", value: defs["a b"] },
					{ key: "str", value: defs.toString }
				]
			})

			const schema = root.toJsonSchema({ aliasDefs: true, dialect: null })
			attest(schema).unknown.snap({
				type: "object",
				properties: {
					slash: { $ref: "#/$defs/a~1b" },
					space: { $ref: "#/$defs/a%20b" },
					str: { $ref: "#/$defs/toString" },
					tilde: { $ref: "#/$defs/a~0b" }
				},
				required: ["slash", "space", "str", "tilde"],
				$defs: {
					"a/b": {
						type: "object",
						properties: { x: { type: "string" } },
						required: ["x"]
					},
					"a b": {
						type: "object",
						properties: { z: { type: "boolean" } },
						required: ["z"]
					},
					toString: {
						type: "object",
						properties: { s: { type: "string" } },
						required: ["s"]
					},
					"a~b": {
						type: "object",
						properties: { y: { type: "number" } },
						required: ["y"]
					}
				}
			})

			const parsed = parse(schema)
			attest(
				parsed.allows({
					slash: { x: "hi" },
					tilde: { y: 1 },
					space: { z: true },
					str: { s: "ok" }
				})
			).equals(true)
			attest(
				parsed.allows({
					slash: { x: 1 },
					tilde: { y: 1 },
					space: { z: true },
					str: { s: "ok" }
				})
			).equals(false)
		})
	})

	describe("Standard JSON Schema output with undefined and target precedence", () => {
		it("Ajv accepts valid undefined output in objects, arrays, and tuples across targets", () => {
			const Obj = rootSchema({
				domain: "object",
				required: [
					{ key: "name", value: "string" },
					{ key: "nickname", value: ["string", { unit: undefined }] }
				]
			})
			const Rec = rootSchema({
				domain: "object",
				index: [{ signature: "string", value: ["string", { unit: undefined }] }]
			})
			const ArrUndef = rootSchema({
				proto: Array,
				sequence: { variadic: ["number", { unit: undefined }] }
			})
			const TupleUndef = rootSchema({
				proto: Array,
				sequence: { prefix: [["string", { unit: undefined }], "number"] }
			})
			const RootUndef = rootSchema(["string", { unit: undefined }])

			for (const [target, ajv] of [
				["draft-2020-12", ajv2020],
				["draft-07", ajv07]
			] as const) {
				const objOut = Obj["~standard"].jsonSchema.output({ target })
				attest(objOut).equals(toJsonSchema(Obj, { target, io: "out" }))
				const vObj = ajv.compile(objOut)
				attest(vObj({ name: "a", nickname: undefined })).equals(true)
				attest(vObj({ name: "a" })).equals(true)
				attest(vObj({ name: "a", nickname: "bob" })).equals(true)
				attest(vObj({ name: "a", nickname: 123 })).equals(false)

				const recOut = Rec["~standard"].jsonSchema.output({ target })
				attest(recOut).equals(toJsonSchema(Rec, { target, io: "out" }))
				const vRec = ajv.compile(recOut)
				attest(vRec({})).equals(true)
				attest(vRec({ k: "ok" })).equals(true)
				attest(vRec({ k: 123 })).equals(false)

				const vArr = ajv.compile(
					ArrUndef["~standard"].jsonSchema.output({ target })
				)
				attest(vArr([1, 2])).equals(true)
				attest(vArr([1, undefined])).equals(true)
				attest(vArr([1, null])).equals(true)

				const vTuple = ajv.compile(
					TupleUndef["~standard"].jsonSchema.output({ target })
				)
				attest(vTuple(["a", 1])).equals(true)
				attest(vTuple([undefined, 1])).equals(true)
				attest(vTuple([null, 1])).equals(true)
				attest(vTuple(["a", "bad"])).equals(false)

				const vRootOut = ajv.compile(
					RootUndef["~standard"].jsonSchema.output({ target })
				)
				attest(vRootOut("ok")).equals(true)
				attest(vRootOut(undefined)).equals(true)
			}
		})

		it("Ajv compiles Standard draft-07 cyclic schema when libraryOptions.target is openapi-3.1", () => {
			const Node = schemaScope({
				Node: {
					domain: "object",
					required: [{ key: "value", value: "number" }],
					optional: [{ key: "next", value: "$Node" }]
				}
			}).export().Node
			const schema = Node["~standard"].jsonSchema.input({
				target: "draft-07",
				libraryOptions: { target: "openapi-3.1" as never }
			})
			attest(schema.$schema).equals("http://json-schema.org/draft-07/schema#")
			const v = ajv07.compile(schema)
			attest(v({ value: 1 })).equals(true)
			attest(v({ value: 1, next: { value: 2 } })).equals(true)
			attest(v({ value: 1, next: { value: "bad" } })).equals(false)
		})
	})
})
