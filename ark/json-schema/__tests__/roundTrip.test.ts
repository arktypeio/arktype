import { attest, contextualize } from "@ark/attest"
import { jsonSchema, jsonSchemaToType } from "@ark/json-schema"
import { scope, type, type JsonSchema, type Type } from "arktype"

// like jsonSchemaToType, the result is read back with `infer` so attest's
// contextual type isn't inferred into jsonSchema.infer
const inferred = <const schema, r = jsonSchema.infer<schema>>(
	schema: jsonSchema.validate<schema>
): r extends infer _ ? _ : never => schema as never

/** replaces generated node ids like `intersection216` with ids based on order
 * of appearance so the pasted schema stays comparable as ids shift */
const normalizeIds = (schema: unknown): unknown => {
	const ids = new Map<string, string>()
	return JSON.parse(
		JSON.stringify(schema).replace(
			/\b([a-z]+)(\d+)\b/g,
			(id: string, kind: string) => {
				if (!ids.has(id)) ids.set(id, `${kind}${ids.size}`)
				return ids.get(id)!
			}
		)
	)
}

/** asserts at runtime that the pasted schema literal is still what arktype
 * emits, and that jsonSchemaToType reads it back as the same expression */
const assertEmits = (
	t: type.Any,
	schema: unknown,
	opts?: Parameters<type.Any["toJsonSchema"]>[0],
	readExpression = t.expression
) => {
	const { $schema: _, ...emitted } = t.toJsonSchema(opts) as JsonSchema.Object
	attest(normalizeIds(emitted)).equals(normalizeIds(schema))
	attest(
		normalizeSynthetics(jsonSchemaToType(schema as never).expression)
	).equals(readExpression)
}

/** numbers the aliases of cyclic refs, whose names hash their target */
const normalizeSynthetics = (expression: string): string => {
	const names: string[] = []
	return expression.replace(/\bsynthetic[\da-z]+\b/g, name => {
		if (!names.includes(name)) names.push(name)
		return `synthetic${names.indexOf(name)}`
	})
}

const draft07 = { target: "draft-07" } as const

const cyclic = scope({
	tree: { value: "number", "children?": "tree[]" },
	a: { "b?": "b" },
	b: { "a?": "a[]" },
	linked: { value: "string", next: "linked | null" },
	dict: { "[string]": "dict | string" },
	nested: "(nested | number)[]",
	user: { name: "string", "friends?": "user[]", "best?": "user" },
	expr: { op: "'+'|'-'", args: ["expr | number", "expr | number"] }
}).export()

// arktype's own inference of a directly recursive tuple hits a depth error, so only its runtime Type is used
const pair = (type.module as unknown as (def: object) => { pair: type.Any })({
	pair: ["string", "pair?"]
}).pair

const strings = (n: number) => Array<"string">(n).fill("string")

// a generated draft-07 document with a recursive definition and a structured
// const (not exported, since TS 7.1 rejects declaration emit for anonymous
// cyclic types: https://github.com/microsoft/TypeScript/issues/64656)
const generatedDraft07 = jsonSchema({
	$schema: "http://json-schema.org/draft-07/schema#",
	$ref: "#/definitions/Node",
	definitions: {
		Node: {
			type: "object",
			properties: {
				id: { type: "string" },
				children: { type: "array", items: { $ref: "#/definitions/Node" } },
				meta: { const: { version: 1, tags: ["a"] } }
			},
			required: ["id"],
			additionalProperties: false
		}
	}
})

contextualize(() => {
	describe("primitives", () => {
		it("never", () => {
			const T = type("never")
			const S = inferred({ enum: [] })
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("never")
		})

		it("object", () => {
			const T = type("object")
			const S = inferred({ type: "object" })
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("object")
		})

		it("full output including $schema", () => {
			const T = type("string")
			const S = inferred({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "string"
			})
			attest(T.toJsonSchema()).equals(S as never)
			attest<typeof T.infer>(S).type.toString.snap("string")
		})
	})

	describe("literals and enums", () => {
		it("string enum", () => {
			const T = type("'a'|'b'|'c'")
			const S = inferred({ enum: ["a", "b", "c"] })
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap('"a" | "b" | "c"')
		})

		it("type.enumerated", () => {
			const T = type.enumerated("x", 0, false)
			const S = inferred({ enum: ["x", 0, false] })
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap('"x" | 0 | false')
		})

		it("mixed literals as anyOf of const", () => {
			const T = type("'a'|1|true|null")
			const S = inferred({
				anyOf: [{ const: "a" }, { const: 1 }, { type: "null" }, { const: true }]
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap('"a" | 1 | true | null')
		})
	})

	describe("unions", () => {
		it("json primitives", () => {
			const T = type("string|number|boolean|null")
			const S = inferred({
				anyOf: [
					{ type: "number" },
					{ type: "string" },
					{ type: "boolean" },
					{ type: "null" }
				]
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap(
				"string | number | boolean | null"
			)
		})

		it("object or array", () => {
			const T = type("string[]").or({ a: "string" })
			const S = inferred({
				anyOf: [
					{
						type: "object",
						properties: { a: { type: "string" } },
						required: ["a"]
					},
					{ type: "array", items: { type: "string" } }
				]
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("string[] | { a: string }")
		})

		it("discriminated object union", () => {
			const T = type({ kind: "'a'", a: "string" }).or({
				kind: "'b'",
				b: "number"
			})
			const S = inferred({
				anyOf: [
					{
						type: "object",
						properties: { a: { type: "string" }, kind: { const: "a" } },
						required: ["a", "kind"]
					},
					{
						type: "object",
						properties: { b: { type: "number" }, kind: { const: "b" } },
						required: ["b", "kind"]
					}
				]
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap(
				'{ a: string; kind: "a" } | { b: number; kind: "b" }'
			)
		})

		it("non-discriminated object union", () => {
			const T = type({ a: "string" }).or({ "b?": "number" })
			const S = inferred({
				anyOf: [
					{ type: "object", properties: { b: { type: "number" } } },
					{
						type: "object",
						properties: { a: { type: "string" } },
						required: ["a"]
					}
				]
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap(
				"{ b?: number } | { a: string }"
			)
		})

		it("literals or object", () => {
			const T = type("1 | 'a' | null").or({ x: "string" })
			const S = inferred({
				anyOf: [
					{
						type: "object",
						properties: { x: { type: "string" } },
						required: ["x"]
					},
					{ const: "a" },
					{ const: 1 },
					{ type: "null" }
				]
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap(
				'"a" | 1 | { x: string } | null'
			)
		})
	})

	describe("numbers", () => {
		it("divisor", () => {
			const T = type("number % 5")
			const S = inferred({ type: "integer", multipleOf: 5 })
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("number")
		})

		it("integer range", () => {
			const T = type("0 <= number.integer < 10")
			const S = inferred({ type: "integer", exclusiveMaximum: 10, minimum: 0 })
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("number")
		})
	})

	describe("strings", () => {
		it("length range", () => {
			const T = type("1 <= string <= 10")
			const S = inferred({ type: "string", maxLength: 10, minLength: 1 })
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("string")
		})

		it("string.email", () => {
			const T = type("string.email")
			const S = inferred({
				type: "string",
				pattern: "^[\\w%+.-]+@[\\d.A-Za-z-]+\\.[A-Za-z]{2,}$",
				format: "email"
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("string")
		})

		it("string.uuid", () => {
			const T = type("string.uuid")
			const S = inferred({
				anyOf: [
					{
						type: "string",
						description: "a UUID",
						format: "uuid",
						pattern:
							"^[\\dA-Fa-f]{8}-[\\dA-Fa-f]{4}-[1-8][\\dA-Fa-f]{3}-[89ABab][\\dA-Fa-f]{3}-[\\dA-Fa-f]{12}$"
					},
					{
						const: "00000000-0000-0000-0000-000000000000",
						description: "a UUID",
						format: "uuid"
					},
					{
						const: "ffffffff-ffff-ffff-ffff-ffffffffffff",
						description: "a UUID",
						format: "uuid"
					}
				],
				description: "a UUID",
				format: "uuid"
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("string")
		})
	})

	describe("arrays", () => {
		it("union items", () => {
			const T = type("(string|number)[]")
			const S = inferred({
				type: "array",
				items: { anyOf: [{ type: "number" }, { type: "string" }] }
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("(string | number)[]")
		})

		it("bounded length", () => {
			const T = type("1 <= number[] <= 5")
			const S = inferred({
				type: "array",
				maxItems: 5,
				minItems: 1,
				items: { type: "number" }
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("number[]")
		})

		it("nested", () => {
			const T = type("string[][]")
			const S = inferred({
				type: "array",
				items: { type: "array", items: { type: "string" } }
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("string[][]")
		})

		it("unknown[]", () => {
			const T = type("unknown[]")
			const S = inferred({ type: "array" })
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("unknown[]")
		})
	})

	describe("tuples", () => {
		it("required elements", () => {
			const T = type(["string", "number"])
			const S = inferred({
				type: "array",
				minItems: 2,
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: false
			})
			assertEmits(T, S, {}, "[string?, number?] == 2")
			attest<typeof T.infer>(S).type.toString.snap("[string, number]")
		})

		it("required elements draft-07", () => {
			const T = type(["string", "number"])
			const S = inferred({
				type: "array",
				minItems: 2,
				items: [{ type: "string" }, { type: "number" }],
				additionalItems: false
			})
			assertEmits(T, S, draft07, "[string?, number?] == 2")
			attest<typeof T.infer>(S).type.toString.snap("[string, number]")
		})

		it("empty tuple", () => {
			// maxItems doesn't narrow, so this widens arktype's [] to unknown[]
			const T = type([])
			const S = inferred({ type: "array", minItems: 0, maxItems: 0 })
			assertEmits(T, S)
			attest<unknown[]>(S).type.toString.snap("unknown[]")
		})

		it("optional element", () => {
			const T = type(["string", "number?"])
			const S = inferred({
				type: "array",
				minItems: 1,
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: false
			})
			assertEmits(T, S, {}, "[string?, number?] >= 1")
			attest<typeof T.infer>(S).type.toString.snap("[string, number?]")
		})

		it("optional element draft-07", () => {
			const T = type(["string", "number?"])
			const S = inferred({
				type: "array",
				minItems: 1,
				items: [{ type: "string" }, { type: "number" }],
				additionalItems: false
			})
			assertEmits(T, S, draft07, "[string?, number?] >= 1")
			attest<typeof T.infer>(S).type.toString.snap("[string, number?]")
		})

		it("all optional elements", () => {
			const T = type(["string?", "number?"])
			const S = inferred({
				type: "array",
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: false
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("[string?, number?]")
		})

		it("variadic", () => {
			const T = type(["string", "...", "number[]"])
			const S = inferred({
				type: "array",
				minItems: 1,
				prefixItems: [{ type: "string" }],
				items: { type: "number" }
			})
			assertEmits(T, S, {}, "[string?, ...number[]] >= 1")
			attest<typeof T.infer>(S).type.toString.snap("[string, ...number[]]")
		})

		it("variadic draft-07", () => {
			const T = type(["string", "...", "number[]"])
			const S = inferred({
				type: "array",
				minItems: 1,
				items: [{ type: "string" }],
				additionalItems: { type: "number" }
			})
			assertEmits(T, S, draft07, "[string?, ...number[]] >= 1")
			attest<typeof T.infer>(S).type.toString.snap("[string, ...number[]]")
		})

		it("optional and variadic", () => {
			const T = type(["string", "boolean?", "...", "number[]"])
			const S = inferred({
				type: "array",
				minItems: 1,
				prefixItems: [{ type: "string" }, { type: "boolean" }],
				items: { type: "number" }
			})
			assertEmits(T, S, {}, "[string?, boolean?, ...number[]] >= 1")
			attest<typeof T.infer>(S).type.toString.snap(
				"[string, boolean?, ...number[]]"
			)
		})

		it("unknown tuple elements", () => {
			const T = type(["unknown", "unknown[]"])
			const S = inferred({
				type: "array",
				minItems: 2,
				prefixItems: [{}, { type: "array" }],
				items: false
			})
			assertEmits(T, S, {}, "[unknown?, Array?] == 2")
			attest<typeof T.infer>(S).type.toString.snap("[unknown, unknown[]]")
		})

		it("11 required of 13 elements", () => {
			const T = type([...strings(11), "number?", "number?"] as never)
			const S = inferred({
				type: "array",
				minItems: 11,
				prefixItems: [
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "number" },
					{ type: "number" }
				],
				items: false
			})
			assertEmits(
				T,
				S,
				{},
				"[string?, string?, string?, string?, string?, string?, string?, string?, string?, string?, string?, number?, number?] >= 11"
			)
			attest<
				[
					string,
					string,
					string,
					string,
					string,
					string,
					string,
					string,
					string,
					string,
					string,
					number?,
					number?
				]
			>(S)
			attest<11 | 12 | 13>(S.length)
		})

		it("20 required of 21 elements", () => {
			const T = type([...strings(20), "number?"] as never)
			const S = inferred({
				type: "array",
				minItems: 20,
				prefixItems: [
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "string" },
					{ type: "number" }
				],
				items: false
			})
			assertEmits(
				T,
				S,
				{},
				"[string?, string?, string?, string?, string?, string?, string?, string?, string?, string?, string?, string?, string?, string?, string?, string?, string?, string?, string?, string?, number?] >= 20"
			)
			attest<20 | 21>(S.length)
			attest<number | undefined, (typeof S)[20]>()
			attest<string, (typeof S)[19]>()
		})
	})

	describe("objects", () => {
		it("required and optional keys", () => {
			const T = type({ name: "string", "age?": "number" })
			const S = inferred({
				type: "object",
				properties: { name: { type: "string" }, age: { type: "number" } },
				required: ["name"]
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap(
				"{ name: string; age?: number }"
			)
		})

		it("all optional keys", () => {
			const T = type({ "a?": "string", "b?": "number" })
			const S = inferred({
				type: "object",
				properties: { a: { type: "string" }, b: { type: "number" } }
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("{ a?: string; b?: number }")
		})

		it("closed", () => {
			const T = type({ "+": "reject", a: "string" })
			const S = inferred({
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"],
				additionalProperties: false
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("{ a: string }")
		})

		it("keys requiring quotes", () => {
			const T = type({ "a-b": "string", "c d?": "number", "0": "boolean" })
			const S = inferred({
				type: "object",
				properties: {
					"0": { type: "boolean" },
					"a-b": { type: "string" },
					"c d": { type: "number" }
				},
				required: ["0", "a-b"]
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap(
				'{ "0": boolean; "a-b": string; "c d"?: number }'
			)
		})

		it("annotations", () => {
			const T = type({ a: "number" }).configure({
				title: "Thing",
				examples: [{ a: 1 }],
				deprecated: true
			} as never)
			const S = inferred({
				type: "object",
				title: "Thing",
				examples: [{ a: 1 }],
				deprecated: true,
				properties: { a: { type: "number" } },
				required: ["a"]
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("{ a: number }")
		})

		it("unknown values", () => {
			const T = type({ a: "unknown", "b?": "unknown" })
			const S = inferred({
				type: "object",
				properties: { a: {}, b: {} },
				required: ["a"]
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap(
				"{ a: unknown; b?: unknown }"
			)
		})

		it("closed empty object", () => {
			const T = type({ "+": "reject" })
			const S = inferred({ type: "object", additionalProperties: false })
			assertEmits(T, S)
			// arktype infers {}, which also allows primitives; object is the sound type here
			attest<object>(S).type.toString.snap("object")
		})

		it("empty key", () => {
			const T = type({ "": "string" })
			const S = inferred({
				type: "object",
				properties: { "": { type: "string" } },
				required: [""]
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap('{ "": string }')
		})

		it("boolean literal values", () => {
			const T = type({ a: "true", b: "false" })
			const S = inferred({
				type: "object",
				properties: { a: { const: true }, b: { const: false } },
				required: ["a", "b"]
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("{ a: true; b: false }")
		})

		it("keys named like keywords", () => {
			const T = type({
				type: "string",
				properties: "number",
				"$ref?": "string",
				required: "boolean",
				items: "string[]",
				enum: "'x'",
				"const?": "null",
				"anyOf?": "number[]"
			})
			const S = inferred({
				type: "object",
				properties: {
					enum: { const: "x" },
					items: { type: "array", items: { type: "string" } },
					properties: { type: "number" },
					required: { type: "boolean" },
					type: { type: "string" },
					$ref: { type: "string" },
					anyOf: { type: "array", items: { type: "number" } },
					const: { type: "null" }
				},
				required: ["enum", "items", "properties", "required", "type"]
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap(`{
	enum: "x"
	items: string[]
	properties: number
	required: boolean
	type: string
	$ref?: string
	anyOf?: number[]
	const?: null
}`)
		})

		it("keys named like Object.prototype members", () => {
			const T = type({ constructor: "string", "toString?": "number" })
			const S = inferred({
				type: "object",
				properties: {
					constructor: { type: "string" },
					toString: { type: "number" }
				},
				required: ["constructor"]
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap(
				"{ constructor: string; toString?: number }"
			)
		})
	})

	describe("defaults", () => {
		it("defaulted key is optional in the input", () => {
			const T = type({ a: "string = 'x'", b: "number" })
			const S = inferred({
				type: "object",
				properties: {
					b: { type: "number" },
					a: { type: "string", default: "x" }
				},
				required: ["b"]
			})
			assertEmits(T, S, {}, "{ b: number, a?: string }")
			attest<typeof T.inferIn>(S).type.toString.snap(
				"{ b: number; a?: string }"
			)
		})

		it("null default", () => {
			const T = type({ a: "string | null = null" })
			const S = inferred({
				type: "object",
				properties: {
					a: { anyOf: [{ type: "string" }, { type: "null" }], default: null }
				}
			})
			assertEmits(T, S, {}, "{ a?: string | null }")
			attest<typeof T.inferIn>(S)
		})
	})

	describe("index signatures", () => {
		it("string index", () => {
			const T = type({ "[string]": "number" })
			const S = inferred({
				type: "object",
				additionalProperties: { type: "number" }
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("{ [x: string]: number }")
		})

		it("index and named key", () => {
			const T = type({ "[string]": "number", a: "number" })
			const S = inferred({
				type: "object",
				properties: { a: { type: "number" } },
				required: ["a"],
				patternProperties: { "": { type: "number" } }
			})
			assertEmits(T, S, {}, "{ [/(?:)/]: number, a: number }")
			attest<typeof T.infer>(S).type.toString.snap(
				"{ [x: string]: number; a: number }"
			)
		})

		it("pattern key", () => {
			// keys matching no pattern are unconstrained, so the index can't be the pattern's value
			const T = type({ "[/^x-/]": "string" } as never)
			const S = inferred({
				type: "object",
				patternProperties: { "^x-": { type: "string" } }
			})
			assertEmits(T, S)
			attest<{ [k: string]: unknown }>(S).type.toString.snap(
				"{ [x: string]: unknown }"
			)
		})

		it("pattern and string index", () => {
			const T = type({ "[/^x-/]": "string", "[string]": "number" } as never)
			const S = inferred({
				type: "object",
				patternProperties: { "": { type: "number" }, "^x-": { type: "string" } }
			})
			assertEmits(T, S, {}, "{ [/(?:)/]: number, [/^x-/]: string }")
			attest<{ [k: string]: string | number }>(S).type.toString.snap(
				"{ [x: string]: string | number }"
			)
		})
	})

	describe("useRefs", () => {
		it("nested objects", () => {
			const T = type({
				user: { name: "string", "address?": { city: "string", zip: "string" } }
			})
			const S = inferred({
				$ref: "#/$defs/intersection268",
				$defs: {
					intersection268: {
						type: "object",
						properties: { user: { $ref: "#/$defs/intersection265" } },
						required: ["user"]
					},
					intersection265: {
						type: "object",
						properties: {
							name: { type: "string" },
							address: { $ref: "#/$defs/intersection262" }
						},
						required: ["name"]
					},
					intersection262: {
						type: "object",
						properties: { city: { type: "string" }, zip: { type: "string" } },
						required: ["city", "zip"]
					}
				}
			})
			assertEmits(T, S, { useRefs: true })
			attest<typeof T.infer>(S).type.toString.snap(`{
	user: {
		name: string
		address?: { city: string; zip: string }
	}
}`)
		})

		it("union of object refs", () => {
			const T = type({ a: "string" }).or({ "b?": "number" })
			const S = inferred({
				$ref: "#/$defs/union48",
				$defs: {
					union48: {
						anyOf: [
							{ $ref: "#/$defs/intersection307" },
							{ $ref: "#/$defs/intersection271" }
						]
					},
					intersection307: {
						type: "object",
						properties: { b: { type: "number" } }
					},
					intersection271: {
						type: "object",
						properties: { a: { type: "string" } },
						required: ["a"]
					}
				}
			})
			assertEmits(T, S, { useRefs: true })
			attest<typeof T.infer>(S).type.toString.snap(
				"{ b?: number } | { a: string }"
			)
		})

		it("primitive with empty $defs", () => {
			const T = type("string").describe("a name")
			const S = inferred({ type: "string", description: "a name", $defs: {} })
			assertEmits(T, S, { useRefs: true })
			attest<typeof T.infer>(S).type.toString.snap("string")
		})
	})

	describe("cyclic", () => {
		it("tree", () => {
			const T = cyclic.tree
			const S = inferred({
				$ref: "#/$defs/tree1",
				$defs: {
					tree1: {
						type: "object",
						properties: {
							value: { type: "number" },
							children: { $ref: "#/$defs/intersection15" }
						},
						required: ["value"]
					},
					intersection15: {
						type: "array",
						items: { $ref: "#/$defs/tree1" }
					}
				}
			})
			assertEmits(T, S, {}, "{ value: number, children?: synthetic0[] }")
			attest<typeof T.infer>(S).type.toString.snap(
				"{ value: number; children?: cyclic[] }"
			)
			attest<number | undefined>(S.children?.[0].children?.[0].value)
		})

		it("mutually recursive", () => {
			const T = cyclic.a
			const S = inferred({
				$ref: "#/$defs/a1",
				$defs: {
					a1: {
						type: "object",
						properties: { b: { $ref: "#/$defs/b1" } }
					},
					b1: {
						type: "object",
						properties: { a: { $ref: "#/$defs/intersection19" } }
					},
					intersection19: {
						type: "array",
						items: { $ref: "#/$defs/a1" }
					}
				}
			})
			assertEmits(T, S, {}, "{ b?: { a?: synthetic0[] } }")
			attest<typeof T.infer>(S).type.toString.snap("{ b?: { a?: cyclic[] } }")
			attest<typeof T.infer | undefined>(S.b?.a?.[0])
		})

		it("linked list through nullable union", () => {
			const T = cyclic.linked
			const S = inferred({
				$ref: "#/$defs/linked1",
				$defs: {
					linked1: {
						type: "object",
						properties: {
							next: { $ref: "#/$defs/union14" },
							value: { type: "string" }
						},
						required: ["next", "value"]
					},
					union14: {
						anyOf: [{ $ref: "#/$defs/linked1" }, { type: "null" }]
					}
				}
			})
			assertEmits(T, S, {}, "{ next: synthetic0 | null, value: string }")
			attest<typeof T.infer>(S).type.toString.snap(
				"{ next: cyclic | null; value: string }"
			)
			attest<string | undefined>(S.next?.next?.value)
		})

		it("record of itself", () => {
			const T = cyclic.dict
			const S = inferred({
				$ref: "#/$defs/dict1",
				$defs: {
					dict1: {
						type: "object",
						additionalProperties: { $ref: "#/$defs/union15" }
					},
					union15: {
						anyOf: [{ type: "string" }, { $ref: "#/$defs/dict1" }]
					}
				}
			})
			assertEmits(T, S, {}, "{ [string]: synthetic0 | string }")
			attest<typeof T.infer>(S).type.toString.snap(
				"{ [x: string]: string | cyclic }"
			)
			attest<typeof T.infer | string>(S.a)
		})

		it("array of itself", () => {
			const T = cyclic.nested
			const S = inferred({
				$ref: "#/$defs/nested1",
				$defs: {
					nested1: {
						type: "array",
						items: { $ref: "#/$defs/union16" }
					},
					union16: {
						anyOf: [{ type: "number" }, { $ref: "#/$defs/nested1" }]
					}
				}
			})
			assertEmits(T, S, {}, "(synthetic0 | number)[]")
			attest<typeof T.infer>(S).type.toString.snap("(number | cyclic)[]")
			attest<typeof T.infer | number>(S[0])
			// arktype's own display of the same type, for comparison
			attest({} as typeof T.infer).type.toString.snap("(number | cyclic)[]")
		})

		it("self reference in a named key", () => {
			const T = cyclic.user
			const S = inferred({
				$ref: "#/$defs/user1",
				$defs: {
					user1: {
						type: "object",
						properties: {
							name: { type: "string" },
							best: { $ref: "#/$defs/user1" },
							friends: { $ref: "#/$defs/intersection33" }
						},
						required: ["name"]
					},
					intersection33: {
						type: "array",
						items: { $ref: "#/$defs/user1" }
					}
				}
			})
			assertEmits(
				T,
				S,
				{},
				"{ name: string, best?: synthetic0, friends?: synthetic0[] }"
			)
			attest<typeof T.infer>(S).type.toString.snap(
				"{ name: string; best?: cyclic; friends?: cyclic[] }"
			)
			attest<string | undefined>(S.best?.friends?.[0].best?.name)
		})

		it("self reference in tuple elements", () => {
			const T = cyclic.expr
			const S = inferred({
				$ref: "#/$defs/expr1",
				$defs: {
					expr1: {
						type: "object",
						properties: {
							args: { $ref: "#/$defs/intersection38" },
							op: { $ref: "#/$defs/union11" }
						},
						required: ["args", "op"]
					},
					intersection38: {
						type: "array",
						minItems: 2,
						prefixItems: [
							{ $ref: "#/$defs/union17" },
							{ $ref: "#/$defs/union17" }
						],
						items: false
					},
					union17: {
						anyOf: [{ type: "number" }, { $ref: "#/$defs/expr1" }]
					},
					union11: { enum: ["+", "-"] }
				}
			})
			assertEmits(
				T,
				S,
				{},
				`{ args: [(synthetic0 | number)?, (synthetic0 | number)?] == 2, op: "+" | "-" }`
			)
			attest<typeof T.infer>(S).type.toString.snap(`{
	args: [number | cyclic, number | cyclic]
	op: "+" | "-"
}`)
			attest<"+" | "-">(S.op)
			attest<typeof T.infer | number, (typeof S)["args"][1]>()
		})

		it("cyclic optional tuple element", () => {
			const T = pair
			// TS can't defer a tuple, so the recursive element is unknown
			const S = inferred({
				$ref: "#/$defs/pair1",
				$defs: {
					pair1: {
						type: "array",
						minItems: 1,
						prefixItems: [{ type: "string" }, { $ref: "#/$defs/pair1" }],
						items: false
					}
				}
			})
			assertEmits(T, S, {}, "[string?, synthetic0?] >= 1")
			attest<[string, unknown?]>(S).type.toString.snap("[string, unknown?]")
		})
	})

	describe("fallbacks", () => {
		it("Date and bigint properties", () => {
			const T = type({ at: "Date", "n?": "bigint" })
			const S = inferred({
				type: "object",
				properties: {
					at: { type: "string", format: "date-time" },
					n: { type: "integer" }
				},
				required: ["at"]
			})
			assertEmits(
				T,
				S,
				{
					fallback: {
						date: ctx => ({ ...ctx.base, type: "string", format: "date-time" }),
						domain: ctx =>
							ctx.domain === "bigint" ? { type: "integer" } : ctx.base
					}
				},
				"{ at: string, n?: number % 1 }"
			)
			attest<{ at: string; n?: number }>(S).type.toString.snap(
				"{ at: string; n?: number }"
			)
		})

		it("morph input", () => {
			const T = type({ n: "string.numeric.parse" })
			const S = inferred({
				type: "object",
				properties: {
					n: {
						type: "string",
						pattern:
							"^(?:(?!^-0\\.?0*$)(?:-?(?:(?:0|[1-9]\\d*)(?:\\.\\d+)?)|\\.\\d+?))$"
					}
				},
				required: ["n"]
			})
			assertEmits(
				T,
				S,
				{ fallback: { morph: ctx => ctx.base } },
				`{ n: /^(?:(?!^-0\\.?0*$)(?:-?(?:(?:0|[1-9]\\d*)(?:\\.\\d+)?)|\\.\\d+?))$/ }`
			)
			attest<typeof T.inferIn>(S).type.toString.snap("{ n: string }")
		})
	})

	describe("widened output", () => {
		it("toJsonSchema result is widened to unknown", () => {
			const schema = type({ a: "string" }).toJsonSchema()
			const S = inferred(schema)
			attest<unknown>(S).type.toString.snap("unknown")
		})
	})

	describe("through jsonSchemaToType", () => {
		it("object", () => {
			const A = type({ name: "string", "age?": "number" })
			const T = jsonSchemaToType({
				type: "object",
				properties: { name: { type: "string" }, age: { type: "number" } },
				required: ["name"]
			})
			attest<typeof A.infer>(T.infer).type.toString.snap(
				"{ name: string; age?: number }"
			)
			attest(T.expression).snap("{ name: string, age?: number }")
		})

		it("optional tuple element", () => {
			const A = type(["string", "number?"])
			const T = jsonSchemaToType({
				type: "array",
				minItems: 1,
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: false
			})
			attest<typeof A.infer>(T.infer).type.toString.snap("[string, number?]")
			attest(T.expression).snap("[string?, number?] >= 1")
			attest(T.allows(["a"])).equals(true)
		})
	})

	describe("hand-written schema types", () => {
		it("mutable tuple", () => {
			type S = jsonSchema.infer<{
				type: "array"
				minItems: 1
				prefixItems: [{ type: "string" }, { type: "number" }]
				items: false
			}>
			attest<[string, number?], S>()
			attest<S>({} as S).type.toString.snap("[string, number?]")
		})

		it("mutable object", () => {
			type S = jsonSchema.infer<{
				type: "object"
				properties: { name: { type: "string" }; age: { type: "number" } }
				required: ["name"]
			}>
			attest<{ name: string; age?: number }, S>()
			attest<S>({} as S).type.toString.snap("{ name: string; age?: number }")
		})
	})

	describe("real world", () => {
		const petstore = {
			openapi: "3.0.2",
			info: { title: "Swagger Petstore - OpenAPI 3.0", version: "1.0.11" },
			components: {
				schemas: {
					Order: {
						type: "object",
						properties: {
							id: { type: "integer", format: "int64", example: 10 },
							petId: { type: "integer", format: "int64", example: 198772 },
							quantity: { type: "integer", format: "int32", example: 7 },
							shipDate: { type: "string", format: "date-time" },
							status: {
								type: "string",
								description: "Order Status",
								example: "approved",
								enum: ["placed", "approved", "delivered"]
							},
							complete: { type: "boolean" }
						},
						xml: { name: "order" }
					},
					Category: {
						type: "object",
						properties: {
							id: { type: "integer", format: "int64", example: 1 },
							name: { type: "string", example: "Dogs" }
						},
						xml: { name: "category" }
					},
					Tag: {
						type: "object",
						properties: {
							id: { type: "integer", format: "int64" },
							name: { type: "string" }
						},
						xml: { name: "tag" }
					},
					Pet: {
						required: ["name", "photoUrls"],
						type: "object",
						properties: {
							id: { type: "integer", format: "int64", example: 10 },
							name: { type: "string", example: "doggie" },
							category: { $ref: "#/components/schemas/Category" },
							photoUrls: {
								type: "array",
								xml: { wrapped: true },
								items: { type: "string", xml: { name: "photoUrl" } }
							},
							tags: {
								type: "array",
								xml: { wrapped: true },
								items: { $ref: "#/components/schemas/Tag" }
							},
							status: {
								type: "string",
								description: "pet status in the store",
								enum: ["available", "pending", "sold"]
							}
						},
						xml: { name: "pet" }
					}
				}
			}
		} as const

		type Petstore = typeof petstore

		it("petstore Order", () => {
			type Order = jsonSchema.infer<Petstore["components"]["schemas"]["Order"]>
			attest<
				{
					id?: number
					petId?: number
					quantity?: number
					shipDate?: string
					status?: "placed" | "approved" | "delivered"
					complete?: boolean
				},
				Order
			>()
			const S = inferred(petstore.components.schemas.Order)
			attest<Order>(S).type.toString.snap(`{
	id?: number
	petId?: number
	quantity?: number
	shipDate?: string
	status?: "approved" | "delivered" | "placed"
	complete?: boolean
}`)
		})

		it("petstore Pet resolved against the document", () => {
			type Category = { id?: number; name?: string }
			type Pet = jsonSchema.infer<
				Petstore["components"]["schemas"]["Pet"],
				Petstore
			>
			attest<
				{
					id?: number
					name: string
					category?: Category
					photoUrls: string[]
					tags?: Category[]
					status?: "available" | "pending" | "sold"
				},
				Pet
			>()
			const pet = {} as Pet
			attest(pet).type.toString.snap(`{
	id?: number
	name: string
	category?: { id?: number; name?: string }
	photoUrls: string[]
	tags?: { id?: number; name?: string }[]
	status?: "available" | "pending" | "sold"
}`)
		})

		it("OpenAPI ref without its document", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						// @ts-expect-error
						category: { $ref: "#/components/schemas/Category" }
					}
				})
			).type.errors.snap(
				"Type '\"#/components/schemas/Category\"' is not assignable to type '\"#\"'."
			)
		})

		it("petstore Pet through a root $ref", () => {
			const S = inferred({
				$ref: "#/components/schemas/Pet",
				components: {
					schemas: {
						Tag: {
							type: "object",
							properties: { id: { type: "integer" }, name: { type: "string" } }
						},
						Pet: {
							required: ["name", "photoUrls"],
							type: "object",
							properties: {
								id: { type: "integer", format: "int64" },
								name: { type: "string" },
								photoUrls: { type: "array", items: { type: "string" } },
								tags: {
									type: "array",
									items: { $ref: "#/components/schemas/Tag" }
								},
								status: {
									type: "string",
									enum: ["available", "pending", "sold"],
									nullable: true
								}
							}
						}
					}
				}
			})
			attest<{
				id?: number
				name: string
				photoUrls: string[]
				tags?: { id?: number; name?: string }[]
				status?: "available" | "pending" | "sold" | null
			}>(S).type.toString.snap(`{
	id?: number
	name: string
	photoUrls: string[]
	tags?: { id?: number; name?: string }[]
	status?: "available" | "pending" | "sold" | null
}`)
		})

		it("tsconfig.json subset", () => {
			const S = inferred({
				$schema: "http://json-schema.org/draft-07/schema#",
				title: "JSON schema for the TypeScript compiler's configuration file",
				type: "object",
				definitions: {
					compilerOptionsDefinition: {
						properties: {
							compilerOptions: {
								type: "object",
								description:
									"Instructs the TypeScript compiler how to compile .ts files.",
								properties: {
									target: {
										description: "Set the JavaScript language version.",
										type: "string",
										default: "ES3",
										anyOf: [
											{
												enum: [
													"ES3",
													"ES5",
													"ES6",
													"ES2015",
													"ES2022",
													"ESNext"
												]
											},
											{
												pattern:
													"^([Ee][Ss]([356]|(20(1[56789]|2[0-2]))|[Nn][Ee][Xx][Tt]))$"
											}
										]
									},
									strict: {
										description: "Enable all strict type checking options.",
										type: "boolean",
										default: false
									},
									paths: {
										description:
											"Specify a set of entries that re-map imports to additional lookup locations.",
										type: "object",
										additionalProperties: {
											type: "array",
											uniqueItems: false,
											items: { type: "string" }
										}
									},
									lib: {
										type: "array",
										uniqueItems: true,
										items: {
											type: "string",
											anyOf: [
												{ enum: ["ES5", "ES2015", "DOM"] },
												{ pattern: "^[Ee][Ss]5$" }
											]
										}
									},
									outDir: { type: "string" },
									noEmit: { type: "boolean" }
								}
							}
						}
					},
					extendsDefinition: {
						properties: {
							extends: {
								anyOf: [
									{ type: "string" },
									{ type: "array", items: { type: "string" } }
								]
							}
						}
					},
					filesDefinition: {
						properties: {
							files: {
								type: "array",
								uniqueItems: true,
								items: { type: "string" }
							}
						}
					},
					includeDefinition: {
						properties: {
							include: {
								type: "array",
								uniqueItems: true,
								items: { type: "string" }
							}
						}
					},
					referencesDefinition: {
						properties: {
							references: {
								type: "array",
								uniqueItems: true,
								items: {
									type: "object",
									properties: { path: { type: "string" } }
								}
							}
						}
					}
				},
				allOf: [
					{ $ref: "#/definitions/compilerOptionsDefinition" },
					{ $ref: "#/definitions/extendsDefinition" },
					{
						anyOf: [
							{ $ref: "#/definitions/filesDefinition" },
							{ $ref: "#/definitions/includeDefinition" },
							{ $ref: "#/definitions/referencesDefinition" }
						]
					}
				]
			})
			type CompilerOptions = {
				target?: string
				strict?: boolean
				paths?: { [k: string]: string[] }
				lib?: string[]
				outDir?: string
				noEmit?: boolean
			}
			type Base = {
				compilerOptions?: CompilerOptions
				extends?: string | string[]
			}
			attest<
				| (Base & { files?: string[] })
				| (Base & { include?: string[] })
				| (Base & { references?: { path?: string }[] })
			>(S).type.toString.snap(`	| {
			compilerOptions?: {
				target?: string
				strict?: boolean
				paths?: { [x: string]: string[] }
				lib?: string[]
				outDir?: string
				noEmit?: boolean
			}
			extends?: string | string[]
			files?: string[]
	  }
	| {
			compilerOptions?: {
				target?: string
				strict?: boolean
				paths?: { [x: string]: string[] }
				lib?: string[]
				outDir?: string
				noEmit?: boolean
			}
			extends?: string | string[]
			include?: string[]
	  }
	| {
			compilerOptions?: {
				target?: string
				strict?: boolean
				paths?: { [x: string]: string[] }
				lib?: string[]
				outDir?: string
				noEmit?: boolean
			}
			extends?: string | string[]
			references?: { path?: string }[]
	  }`)
			attest<CompilerOptions | undefined>(S.compilerOptions)
		})

		it("GitHub Actions workflow subset", () => {
			const S = inferred({
				$schema: "http://json-schema.org/draft-07/schema#",
				$id: "https://json.schemastore.org/github-workflow.json",
				additionalProperties: false,
				definitions: {
					expressionSyntax: {
						type: "string",
						pattern: "^\\$\\{\\{(.|[\r\n])*\\}\\}$"
					},
					stringContainingExpressionSyntax: {
						type: "string",
						pattern: "^.*\\$\\{\\{(.|[\r\n])*\\}\\}.*$"
					},
					env: {
						$comment:
							"https://docs.github.com/en/actions/learn-github-actions/environment-variables",
						oneOf: [
							{
								type: "object",
								additionalProperties: {
									oneOf: [
										{ type: "string" },
										{ type: "number" },
										{ type: "boolean" }
									]
								}
							},
							{ $ref: "#/definitions/stringContainingExpressionSyntax" }
						]
					},
					event: {
						type: "string",
						enum: ["push", "pull_request", "workflow_dispatch", "schedule"]
					},
					step: {
						type: "object",
						additionalProperties: false,
						dependencies: {
							"working-directory": ["run"],
							shell: ["run"]
						},
						oneOf: [
							{
								type: "object",
								properties: { uses: { type: "string" } },
								required: ["uses"]
							},
							{
								type: "object",
								properties: { run: { type: "string" } },
								required: ["run"]
							}
						],
						properties: {
							id: { type: "string" },
							if: { type: ["boolean", "number", "string"] },
							name: { type: "string" },
							uses: { type: "string" },
							run: { type: "string" },
							"working-directory": { type: "string" },
							with: { $ref: "#/definitions/env" },
							"continue-on-error": {
								oneOf: [
									{ type: "boolean" },
									{ $ref: "#/definitions/expressionSyntax" }
								],
								default: false
							}
						}
					},
					normalJob: {
						type: "object",
						properties: {
							name: { type: "string" },
							needs: {
								oneOf: [
									{ type: "array", items: { type: "string" }, minItems: 1 },
									{ type: "string" }
								]
							},
							"runs-on": {
								oneOf: [
									{ type: "string" },
									{ type: "array", items: { type: "string" } }
								]
							},
							steps: {
								type: "array",
								items: { $ref: "#/definitions/step" },
								minItems: 1
							},
							"timeout-minutes": {
								oneOf: [
									{ type: "number" },
									{ $ref: "#/definitions/expressionSyntax" }
								],
								default: 360
							},
							env: { $ref: "#/definitions/env" }
						},
						required: ["runs-on"],
						additionalProperties: false
					}
				},
				properties: {
					name: { type: "string" },
					on: {
						oneOf: [
							{ $ref: "#/definitions/event" },
							{
								type: "array",
								items: { $ref: "#/definitions/event" },
								minItems: 1
							},
							{
								type: "object",
								properties: {
									push: { type: ["object", "null"] },
									schedule: {
										type: "array",
										items: {
											type: "object",
											properties: { cron: { type: "string" } }
										},
										minItems: 1
									}
								},
								additionalProperties: false
							}
						]
					},
					env: { $ref: "#/definitions/env" },
					jobs: {
						type: "object",
						patternProperties: {
							"^[_a-zA-Z][a-zA-Z0-9_-]*$": {
								$ref: "#/definitions/normalJob"
							}
						},
						minProperties: 1,
						additionalProperties: false
					}
				},
				required: ["on", "jobs"],
				type: "object"
			})
			type Event = "push" | "pull_request" | "workflow_dispatch" | "schedule"
			type Env = { [k: string]: string | number | boolean } | string
			attest<string | undefined>(S.name)
			attest<
				| Event
				| Event[]
				| { push?: object | null; schedule?: { cron?: string }[] }
			>(S.on)
			attest<Env | undefined>(S.env)
			type Job = (typeof S)["jobs"][string]
			attest<string | string[], Job["runs-on"]>()
			attest<string | string[] | undefined, Job["needs"]>()
			attest<number | string | undefined, Job["timeout-minutes"]>()
			type Step = NonNullable<Job["steps"]>[number]
			attest<string | undefined, Step["name"]>()
			attest<boolean | number | string | undefined, Step["if"]>()
			attest<Env | undefined, Step["with"]>()
			attest<boolean | string | undefined, Step["continue-on-error"]>()
			attest<string, Extract<Step, { uses: unknown }>["uses"]>()
			attest<string, Extract<Step, { run: unknown }>["run"]>()
			attest({} as Step).type.toString.snap(`	| {
			id?: string
			if?: string | number | boolean
			name?: string
			uses: string
			run?: string
			"working-directory"?: string
			with?:
				| string
				| { [x: string]: string | number | boolean }
			"continue-on-error"?: string | boolean
	  }
	| {
			id?: string
			if?: string | number | boolean
			name?: string
			uses?: string
			run: string
			"working-directory"?: string
			with?:
				| string
				| { [x: string]: string | number | boolean }
			"continue-on-error"?: string | boolean
	  }`)
			attest({} as Job).type.toString.snap(`{
	name?: string
	needs?: string | string[]
	"runs-on": string | string[]
	steps?: (
		| {
				id?: string
				if?: string | number | boolean
				name?: string
				uses: string
				run?: string
				"working-directory"?: string
				with?:
					| string
					| { [x: string]: string | number | boolean }
				"continue-on-error"?: string | boolean
		  }
		| {
				id?: string
				if?: string | number | boolean
				name?: string
				uses?: string
				run: string
				"working-directory"?: string
				with?:
					| string
					| { [x: string]: string | number | boolean }
				"continue-on-error"?: string | boolean
		  }
	)[]
	"timeout-minutes"?: string | number
	env?: string | { [x: string]: string | number | boolean }
}`)
			attest(S).type.toString.snap(`{
	name?: string
	on:
		| "pull_request"
		| "push"
		| "schedule"
		| "workflow_dispatch"
		| (
				| "pull_request"
				| "push"
				| "schedule"
				| "workflow_dispatch"
		  )[]
		| {
				push?: object | null
				schedule?: { cron?: string }[]
		  }
	env?: string | { [x: string]: string | number | boolean }
	jobs: {
		[x: string]: {
			name?: string
			needs?: string | string[]
			"runs-on": string | string[]
			steps?: (
				| {
						id?: string
						if?: string | number | boolean
						name?: string
						uses: string
						run?: string
						"working-directory"?: string
						with?:
							| string
							| { [x: string]: string | number | boolean }
						"continue-on-error"?: string | boolean
				  }
				| {
						id?: string
						if?: string | number | boolean
						name?: string
						uses?: string
						run: string
						"working-directory"?: string
						with?:
							| string
							| { [x: string]: string | number | boolean }
						"continue-on-error"?: string | boolean
				  }
			)[]
			"timeout-minutes"?: string | number
			env?:
				| string
				| { [x: string]: string | number | boolean }
		}
	}
}`)
		})
	})

	describe("OpenAPI 3.0 documents", () => {
		const doc = {
			openapi: "3.0.3",
			info: { title: "pets", version: "1" },
			paths: {
				"/pets/{id}": {
					get: {
						parameters: [
							{
								name: "id",
								in: "path",
								required: true,
								schema: { type: "string" }
							}
						],
						responses: {
							"200": {
								description: "ok",
								content: {
									"application/json": {
										schema: { $ref: "#/components/schemas/Pet" }
									}
								}
							}
						}
					}
				}
			},
			components: {
				schemas: {
					Pet: {
						type: "object",
						required: ["petType"],
						discriminator: {
							propertyName: "petType",
							mapping: {
								cat: "#/components/schemas/Cat",
								dog: "#/components/schemas/Dog"
							}
						},
						properties: {
							petType: { type: "string" },
							name: { type: "string", nullable: true }
						},
						oneOf: [
							{ $ref: "#/components/schemas/Cat" },
							{ $ref: "#/components/schemas/Dog" }
						]
					},
					Cat: {
						type: "object",
						required: ["petType"],
						properties: {
							petType: { type: "string", enum: ["cat"] },
							huntingSkill: { type: "string", enum: ["clueless", "lazy"] }
						}
					},
					Dog: {
						allOf: [
							{ $ref: "#/components/schemas/Base" },
							{
								type: "object",
								required: ["petType"],
								properties: {
									petType: { type: "string", enum: ["dog"] },
									packSize: { type: "integer", minimum: 0, nullable: true }
								}
							}
						]
					},
					Base: {
						type: "object",
						properties: {
							id: { type: "integer", format: "int64", readOnly: true }
						}
					},
					NullableRef: {
						nullable: true,
						allOf: [{ $ref: "#/components/schemas/Base" }]
					},
					NullableArray: {
						type: "array",
						items: { type: "string", nullable: true },
						nullable: true
					},
					PositiveNumber: {
						type: "number",
						minimum: 0,
						exclusiveMinimum: true
					},
					NullableEnum: {
						type: "string",
						nullable: true,
						enum: ["a", "b", null]
					},
					NullableWithoutType: { nullable: true },
					BaseMap: {
						type: "object",
						additionalProperties: { $ref: "#/components/schemas/Base" }
					},
					FreeForm: { type: "object", additionalProperties: true },
					Tree: {
						type: "object",
						properties: {
							value: { type: "string" },
							children: {
								type: "array",
								items: { $ref: "#/components/schemas/Tree" }
							}
						}
					}
				}
			}
		} as const

		type Doc = typeof doc
		type Schemas = Doc["components"]["schemas"]

		it("discriminated oneOf with base properties", () => {
			const pet = {} as jsonSchema.infer<Schemas["Pet"], Doc>
			attest<
				| {
						petType: "cat"
						name?: string | null
						huntingSkill?: "clueless" | "lazy"
				  }
				| {
						petType: "dog"
						name?: string | null
						id?: number
						packSize?: number | null
				  }
			>(pet).type.toString.snap(`	| {
			petType: "dog"
			name?: string | null
			packSize?: number | null
			id?: number
	  }
	| {
			petType: "cat"
			name?: string | null
			huntingSkill?: "clueless" | "lazy"
	  }`)
		})

		it("nullable allOf ref", () => {
			const t = {} as jsonSchema.infer<Schemas["NullableRef"], Doc>
			attest<{ id?: number } | null>(t).type.toString.snap(
				"{ id?: number } | null"
			)
		})

		it("nullable array of nullable items", () => {
			const t = {} as jsonSchema.infer<Schemas["NullableArray"], Doc>
			attest<(string | null)[] | null>(t).type.toString.snap(
				"(string | null)[] | null"
			)
		})

		it("boolean exclusiveMinimum", () => {
			const t = {} as jsonSchema.infer<Schemas["PositiveNumber"], Doc>
			attest<number>(t).type.toString.snap("number")
		})

		it("nullable enum listing null", () => {
			const t = {} as jsonSchema.infer<Schemas["NullableEnum"], Doc>
			attest<"a" | "b" | null>(t).type.toString.snap('"a" | "b" | null')
		})

		it("nullable without type", () => {
			const t = {} as jsonSchema.infer<Schemas["NullableWithoutType"], Doc>
			attest<unknown>(t).type.toString.snap("unknown")
		})

		it("free-form object", () => {
			const t = {} as jsonSchema.infer<Schemas["FreeForm"], Doc>
			attest<object>(t).type.toString.snap("object")
		})

		it("every component validates against the document", () => {
			attest<
				{ [k in keyof Schemas]: true },
				{
					[k in keyof Schemas]: Schemas[k] extends (
						jsonSchema.validate<Schemas[k], Doc>
					) ?
						true
					:	false
				}
			>()
		})

		it("the whole document is a valid schema", () => {
			attest<true, Doc extends jsonSchema.validate<Doc> ? true : false>()
		})

		it("inheritance cycle through oneOf and allOf", () => {
			const schemas = {
				components: {
					schemas: {
						Pet: {
							type: "object",
							required: ["petType"],
							properties: {
								petType: { type: "string" },
								name: { type: "string" }
							},
							oneOf: [
								{ $ref: "#/components/schemas/Cat" },
								{ $ref: "#/components/schemas/Dog" }
							]
						},
						Cat: {
							allOf: [
								{ $ref: "#/components/schemas/Pet" },
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
								{ $ref: "#/components/schemas/Pet" },
								{
									type: "object",
									properties: {
										petType: { const: "dog" },
										bark: { type: "boolean" }
									}
								}
							]
						}
					}
				}
			} as const
			type Pets = typeof schemas
			const pet = {} as jsonSchema.infer<
				Pets["components"]["schemas"]["Pet"],
				Pets
			>
			attest<
				| { petType: "cat"; name?: string; meow?: boolean }
				| { petType: "dog"; name?: string; bark?: boolean }
			>(pet).type.toString
				.snap(`	| { petType: "cat"; name?: string; meow?: boolean }
	| { petType: "dog"; name?: string; bark?: boolean }`)
		})

		it("Stripe-style expandable nullable field", () => {
			// Stripe's OpenAPI 3.0 spec writes nullable anyOf without a type
			const S = inferred({
				$ref: "#/components/schemas/charge",
				components: {
					schemas: {
						charge: {
							type: "object",
							properties: {
								customer: {
									anyOf: [
										{ maxLength: 5000, type: "string" },
										{ $ref: "#/components/schemas/customer" }
									],
									nullable: true,
									"x-expansionResources": {
										oneOf: [{ $ref: "#/components/schemas/customer" }]
									}
								},
								metadata: {
									additionalProperties: { maxLength: 500, type: "string" },
									type: "object"
								}
							},
							required: ["metadata"],
							"x-expandableFields": ["customer"]
						},
						customer: {
							type: "object",
							properties: { id: { type: "string" } },
							required: ["id"]
						}
					}
				}
			})
			attest<{
				customer?: string | { id: string } | null
				metadata: { [k: string]: string }
			}>(S).type.toString.snap(`{
	customer?: string | { id: string } | null
	metadata: { [x: string]: string }
}`)
		})
	})

	describe("OpenAPI 3.1 documents", () => {
		const doc = {
			openapi: "3.1.0",
			info: { title: "users", version: "1" },
			components: {
				schemas: {
					User: {
						type: "object",
						properties: {
							id: { type: "string", format: "uuid" },
							nickname: { type: ["string", "null"] },
							role: {
								$ref: "#/components/schemas/Role",
								description: "a role"
							},
							manager: {
								anyOf: [{ $ref: "#/components/schemas/User" }, { type: "null" }]
							},
							coords: {
								type: "array",
								prefixItems: [{ type: "number" }, { type: "number" }],
								minItems: 2,
								items: false
							},
							kind: { const: "user" },
							tags: { type: ["array", "null"], items: { type: "string" } }
						},
						required: ["id", "kind"]
					},
					Role: { type: "string", enum: ["admin", "member"] },
					NullableRole: {
						$ref: "#/components/schemas/Role",
						type: ["string", "null"]
					},
					Event: {
						oneOf: [
							{ $ref: "#/components/schemas/Created" },
							{ $ref: "#/components/schemas/Deleted" }
						],
						discriminator: { propertyName: "type" }
					},
					Created: {
						type: "object",
						properties: {
							type: { const: "created" },
							user: { $ref: "#/components/schemas/User" }
						},
						required: ["type", "user"]
					},
					Deleted: {
						type: "object",
						properties: { type: { const: "deleted" }, id: { type: "string" } },
						required: ["type", "id"]
					}
				}
			}
		} as const

		type Doc = typeof doc
		type Schemas = Doc["components"]["schemas"]

		it("type arrays, $ref siblings, nullable refs and tuples", () => {
			const user = {} as jsonSchema.infer<Schemas["User"], Doc>
			attest<string | null | undefined>(user.nickname)
			attest<"admin" | "member" | undefined>(user.role)
			attest<[number, number] | undefined>(user.coords)
			attest<"user">(user.kind)
			attest<string[] | null | undefined>(user.tags)
			attest<string | undefined>(user.manager?.manager?.id)
		})

		it("$ref with a type list sibling", () => {
			const t = {} as jsonSchema.infer<Schemas["NullableRole"], Doc>
			// the ref target only admits strings, so the sibling's null is filtered out
			attest<"admin" | "member">(t).type.toString.snap('"admin" | "member"')
		})

		it("every component validates against the document", () => {
			attest<
				{ [k in keyof Schemas]: true },
				{
					[k in keyof Schemas]: Schemas[k] extends (
						jsonSchema.validate<Schemas[k], Doc>
					) ?
						true
					:	false
				}
			>()
		})
	})

	describe("generator output styles", () => {
		it("zod-to-json-schema path refs", () => {
			// $refStrategy "root" (the default) points repeated schemas at their first occurrence
			const S = inferred({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "object",
				properties: {
					billing: {
						type: "object",
						properties: { street: { type: "string" }, zip: { type: "string" } },
						required: ["street"],
						additionalProperties: false
					},
					shipping: { $ref: "#/properties/billing" },
					others: { type: "array", items: { $ref: "#/properties/billing" } },
					tags: { type: "array", items: { type: "string" } },
					firstTag: { $ref: "#/properties/tags/items" }
				},
				required: ["billing", "shipping"],
				additionalProperties: false
			})
			type Address = { street: string; zip?: string }
			attest<{
				billing: Address
				shipping: Address
				others?: Address[]
				tags?: string[]
				firstTag?: string
			}>(S)
		})

		it("zod tuple as a draft-07 items array", () => {
			// maxItems doesn't narrow, so the open draft-07 tuple keeps its rest
			const S = inferred({
				type: "array",
				minItems: 2,
				maxItems: 2,
				items: [{ type: "string" }, { type: "number" }]
			})
			attest<[string, number, ...unknown[]]>(S).type.toString.snap(
				"[string, number, ...unknown[]]"
			)
		})

		it("zod v4 toJSONSchema", () => {
			const S = inferred({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: {
					age: {
						type: "integer",
						minimum: -9007199254740991,
						maximum: 9007199254740991
					},
					role: { type: "string", enum: ["admin", "user"] },
					lit: { type: "string", const: "x" },
					never: { not: {} },
					any: {},
					rec: {
						type: "object",
						propertyNames: { type: "string" },
						additionalProperties: { type: "number" }
					},
					keyed: {
						type: "object",
						propertyNames: { type: "string", enum: ["a", "b"] },
						additionalProperties: { type: "number" },
						required: ["a", "b"]
					},
					tuple: {
						type: "array",
						prefixItems: [{ type: "string" }],
						items: { type: "number" }
					},
					union: {
						oneOf: [
							{
								type: "object",
								properties: { k: { type: "string", const: "a" } },
								required: ["k"],
								additionalProperties: false
							},
							{ type: "null" }
						]
					},
					self: { $ref: "#" },
					email: { $ref: "#/$defs/__schema0" }
				},
				required: ["age", "role", "lit", "any", "rec", "keyed"],
				additionalProperties: false,
				$defs: { __schema0: { type: "string", format: "email" } }
			})
			attest<number>(S.age)
			attest<"admin" | "user">(S.role)
			attest<"x">(S.lit)
			attest<undefined>(S.never)
			attest<unknown>(S.any)
			attest<{ [k: string]: number }>(S.rec)
			attest<{ [k: string]: number; a: number; b: number }>(S.keyed)
			attest<[string?, ...number[]] | undefined>(S.tuple)
			attest<{ k: "a" } | null | undefined>(S.union)
			attest<"x" | undefined>(S.self?.self?.lit)
			attest<string | undefined>(S.email)
		})

		it("zod v4 catchall, record keys and reused refs", () => {
			// z.toJSONSchema output (zod 4.1.12)
			const S = inferred({
				type: "object",
				properties: {
					catchall: {
						type: "object",
						properties: { a: { type: "string" } },
						required: ["a"],
						additionalProperties: { type: "number" }
					},
					recordEnum: {
						type: "object",
						propertyNames: { type: "string", enum: ["a", "b"] },
						additionalProperties: { type: "number" }
					},
					home: { $ref: "#/$defs/__schema0" },
					list: { type: "array", items: { $ref: "#/$defs/__schema0" } }
				},
				required: ["catchall", "recordEnum", "home", "list"],
				additionalProperties: false,
				$defs: {
					__schema0: {
						type: "object",
						properties: { street: { type: "string" } },
						required: ["street"],
						additionalProperties: false
					}
				}
			})
			attest<{
				catchall: { [k: string]: string | number; a: string }
				recordEnum: { [k: string]: number }
				home: { street: string }
				list: { street: string }[]
			}>(S)
		})

		it("zod v4 tuple without minItems", () => {
			// zod doesn't emit minItems for tuples, so every element is optional
			const S = inferred({
				type: "array",
				prefixItems: [{ type: "string" }, { type: "number" }],
				items: { type: "boolean" }
			})
			attest<[string?, number?, ...boolean[]]>(S).type.toString.snap(
				"[string?, number?, ...boolean[]]"
			)
		})
	})

	describe("json-schema-to-ts documented examples", () => {
		it("not with exact keywords", () => {
			attest<unknown>(
				inferred({ not: { enum: ["Bulbasaur", "Squirtle"] } })
			).type.toString.snap("unknown")
			attest<string>(
				inferred({ type: ["number", "string"], not: { type: "number" } })
			).type.toString.snap("string")
			attest<"Bulbasaur" | "Squirtle">(
				inferred({
					type: "string",
					enum: ["Bulbasaur", "Squirtle", "Pikachu"],
					not: { const: "Pikachu" }
				})
			).type.toString.snap('"Bulbasaur" | "Squirtle"')
		})

		it("if/then/else requiring a key per branch", () => {
			const S = inferred({
				type: "object",
				properties: {
					animal: { enum: ["dog", "cat"] },
					dogBreed: { enum: ["poodle", "beagle"] },
					catBreed: { enum: ["persan", "tabby"] }
				},
				required: ["animal"],
				if: { properties: { animal: { const: "dog" } } },
				then: { required: ["dogBreed"], not: { required: ["catBreed"] } },
				else: { required: ["catBreed"], not: { required: ["dogBreed"] } },
				additionalProperties: false
			})
			// if doesn't narrow, so each branch only adds its required key
			attest<
				| {
						animal: "dog" | "cat"
						dogBreed: "poodle" | "beagle"
						catBreed?: "persan" | "tabby"
				  }
				| {
						animal: "dog" | "cat"
						dogBreed?: "poodle" | "beagle"
						catBreed: "persan" | "tabby"
				  }
			>(S)
		})

		it("allOf adding a required property", () => {
			const S = inferred({
				type: "object",
				properties: { bread: { enum: ["white", "whole"] } },
				required: ["bread"],
				allOf: [
					{
						properties: { sauce: { enum: ["ketchup", "mayo"] } },
						required: ["sauce"]
					}
				]
			})
			attest<{ bread: "white" | "whole"; sauce: "ketchup" | "mayo" }>(S)
		})
	})

	describe("meta-schemas", () => {
		it("draft-07 meta-schema", () => {
			const draft07 = {
				$schema: "http://json-schema.org/draft-07/schema#",
				$id: "http://json-schema.org/draft-07/schema#",
				title: "Core schema meta-schema",
				definitions: {
					schemaArray: { type: "array", minItems: 1, items: { $ref: "#" } },
					nonNegativeInteger: { type: "integer", minimum: 0 },
					nonNegativeIntegerDefault0: {
						allOf: [
							{ $ref: "#/definitions/nonNegativeInteger" },
							{ default: 0 }
						]
					},
					simpleTypes: {
						enum: [
							"array",
							"boolean",
							"integer",
							"null",
							"number",
							"object",
							"string"
						]
					},
					stringArray: {
						type: "array",
						items: { type: "string" },
						uniqueItems: true,
						default: []
					}
				},
				type: ["object", "boolean"],
				properties: {
					$id: { type: "string", format: "uri-reference" },
					$ref: { type: "string", format: "uri-reference" },
					title: { type: "string" },
					default: true,
					multipleOf: { type: "number", exclusiveMinimum: 0 },
					maxLength: { $ref: "#/definitions/nonNegativeInteger" },
					minLength: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
					additionalItems: { $ref: "#" },
					items: {
						anyOf: [{ $ref: "#" }, { $ref: "#/definitions/schemaArray" }],
						default: true
					},
					required: { $ref: "#/definitions/stringArray" },
					properties: {
						type: "object",
						additionalProperties: { $ref: "#" },
						default: {}
					},
					dependencies: {
						type: "object",
						additionalProperties: {
							anyOf: [{ $ref: "#" }, { $ref: "#/definitions/stringArray" }]
						}
					},
					const: true,
					enum: { type: "array", items: true },
					type: {
						anyOf: [
							{ $ref: "#/definitions/simpleTypes" },
							{
								type: "array",
								items: { $ref: "#/definitions/simpleTypes" },
								minItems: 1,
								uniqueItems: true
							}
						]
					},
					allOf: { $ref: "#/definitions/schemaArray" },
					not: { $ref: "#" }
				},
				default: true
			} as const
			type Meta = jsonSchema.infer<typeof draft07>
			type TypeName =
				| "array"
				| "boolean"
				| "integer"
				| "null"
				| "number"
				| "object"
				| "string"
			const meta = {} as Exclude<Meta, boolean>
			attest<TypeName | TypeName[] | undefined>(meta.type)
			attest<number | undefined>(meta.minLength)
			attest<string[] | undefined>(meta.required)
			attest<unknown>(meta.default)
			attest<unknown[] | undefined>(meta.enum)
			attest<boolean | undefined>(
				typeof meta.not === "boolean" ? meta.not : undefined
			)
			attest<
				true,
				typeof draft07 extends jsonSchema.validate<typeof draft07> ? true
				:	false
			>()
		})
	})

	describe("declared schemas", () => {
		const schema = {
			type: "object",
			properties: {
				a: { type: "string" },
				b: { type: "array", items: { type: "number" } }
			},
			required: ["a"]
		} as const

		it("as const then passed", () => {
			const S = inferred(schema)
			attest<{ a: string; b?: number[] }>(S).type.toString.snap(
				"{ a: string; b?: number[] }"
			)
		})

		it("as const satisfies JsonSchema", () => {
			const satisfied = {
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"]
			} as const satisfies JsonSchema
			attest<{ a: string }, jsonSchema.infer<typeof satisfied>>()
			attest<{ a: string }>(jsonSchemaToType(satisfied).infer)
		})

		it("satisfies JsonSchema without as const widens required", () => {
			const satisfied = {
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"]
			} satisfies JsonSchema
			// required is string[], which may be empty
			attest<{ a?: string }, jsonSchema.infer<typeof satisfied>>()
		})

		it("annotated as JsonSchema", () => {
			const annotated: JsonSchema = { type: "string" }
			attest<unknown>(jsonSchemaToType(annotated).infer)
		})

		it("a ternary argument infers each member", () => {
			const flag = Math.random() > 0.5
			const S = inferred(flag ? { type: "string" } : { type: "number" })
			attest<string | number>(S).type.toString.snap("string | number")
			const T = jsonSchemaToType(flag ? { type: "string" } : { type: "number" })
			attest<string | number>(T.infer)
		})
	})

	describe("wrapper functions", () => {
		const schema = {
			type: "object",
			properties: { a: { type: "string" } },
			required: ["a"]
		} as const

		it("returning jsonSchema.infer", () => {
			const wrap = <const s>(s: jsonSchema.validate<s>): jsonSchema.infer<s> =>
				s as never
			attest<{ a: string }>(
				wrap({
					type: "object",
					properties: { a: { type: "string" } },
					required: ["a"]
				})
			)
			attest<{ a: string }>(wrap(schema))
		})

		it("constrained by JsonSchema", () => {
			const wrap = <const s extends JsonSchema>(s: s): jsonSchema.infer<s> =>
				s as never
			attest<{ a: string }>(
				wrap({
					type: "object",
					properties: { a: { type: "string" } },
					required: ["a"]
				})
			)
		})

		it("forwarding jsonSchema.validate", () => {
			const wrap = <const s>(s: jsonSchema.validate<s>) => jsonSchemaToType(s)
			attest<string>(wrap({ type: "string" }).infer)
		})

		it("contextual return type doesn't change inference", () => {
			const wrap = <const s>(s: jsonSchema.validate<s>): jsonSchema.infer<s> =>
				s as never
			const t: { a: string } = wrap({
				type: "object",
				properties: { a: { type: "string" } },
				required: ["a"]
			})
			attest<{ a: string }>(t)
			attest(() => {
				// @ts-expect-error
				const _: { a: number } = wrap({
					type: "object",
					properties: { a: { type: "string" } },
					required: ["a"]
				})
			}).type.errors("Type 'string' is not assignable to type 'number'")
		})
	})

	describe("JSON Schema Test Suite", () => {
		// draft 2019-09 and earlier ignore additionalItems unless items is an array
		// (tests/draft7/additionalItems.json)
		it("additionalItems beside a schema items is ignored", () => {
			const T = jsonSchemaToType({
				type: "array",
				items: { type: "integer" },
				additionalItems: { type: "string" }
			})
			attest(T.infer).type.toString.snap("number[]")
			attest(T.allows([1, 2])).equals(true)
			attest(T.allows([1, "a"])).equals(false)
		})

		it("dependent subschema incompatible with root", () => {
			const S = inferred({
				properties: { foo: {} },
				dependentSchemas: {
					foo: { properties: { bar: {} }, additionalProperties: false }
				}
			})
			attest<{ foo?: unknown } | string | number | boolean | unknown[] | null>(
				S
			)
		})

		it("nested refs through $defs", () => {
			const S = inferred({
				$defs: {
					a: { type: "integer" },
					b: { $ref: "#/$defs/a" },
					c: { $ref: "#/$defs/b" }
				},
				$ref: "#/$defs/c"
			})
			attest<number>(S)
		})

		it("ref to an unknown keyword", () => {
			const S = inferred({
				$defs: { x: true },
				"unknown-keyword": { type: "integer" },
				properties: { bar: { $ref: "#/unknown-keyword" } }
			})
			attest<{ bar?: number } | string | number | boolean | unknown[] | null>(S)
		})
	})

	describe("real-world validation", () => {
		it("required key declared by an own allOf branch", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { bark: { type: "boolean" } },
					required: ["bark", "name"],
					allOf: [{ type: "object", properties: { name: { type: "string" } } }]
				})
			).type.errors.is("")
		})

		it("required key declared by a dependent schema", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { id: { type: "string" } },
					required: ["id", "x"],
					dependentSchemas: { id: { properties: { x: { type: "string" } } } }
				})
			).type.errors.is("")
		})

		it("required key declared by a sibling's nested allOf", () => {
			attest(() =>
				inferred({
					allOf: [
						{ allOf: [{ properties: { a: { type: "string" } } }] },
						{
							properties: { b: { type: "string" } },
							required: ["a", "b"]
						}
					]
				})
			).type.errors.is("")
		})

		it("then requires a key declared by if", () => {
			attest(() =>
				inferred({
					if: { properties: { kind: { const: "a" } }, required: ["kind"] },
					then: {
						properties: { x: { type: "string" } },
						required: ["kind", "x"]
					}
				})
			).type.errors.is("")
		})

		it("required beside allOf may name a key no schema declares", () => {
			// only a self-contained schema's required keys are checked
			const S = inferred({
				type: "object",
				properties: { bark: { type: "boolean" } },
				required: ["bark", "nmae"],
				allOf: [{ type: "object", properties: { other: { type: "string" } } }]
			})
			attest<{ bark: boolean; nmae: unknown; other?: string }>(
				S
			).type.toString.snap("{ bark: boolean; other?: string; nmae: unknown }")
		})

		it("component schemas reached through a root $ref are validated", () => {
			attest(() =>
				inferred({
					$ref: "#/components/schemas/Pet",
					components: {
						schemas: {
							Pet: {
								type: "object",
								properties: {
									// @ts-expect-error
									tag: { $ref: "#/components/schemas/Tagg" }
								}
							},
							Tag: { type: "string" }
						}
					}
				})
			).type.errors(`Did you mean '"#/components/schemas/Tag"'?`)
		})

		it("type names in component schemas reached through a root $ref are validated", () => {
			attest(() =>
				inferred({
					$ref: "#/components/schemas/Pet",
					components: {
						// @ts-expect-error
						schemas: { Pet: { type: "strin" } }
					}
				})
			).type.errors.snap(
				"Type '\"strin\"' is not assignable to type 'TypeName'. Did you mean '\"string\"'?"
			)
		})

		it("a typo in a deeply nested component is reported at the keyword", () => {
			attest(() =>
				inferred({
					$ref: "#/components/schemas/Pet",
					components: {
						schemas: {
							Pet: {
								type: "object",
								properties: {
									tags: {
										type: "array",
										items: {
											// @ts-expect-error
											type: "strin"
										}
									}
								}
							}
						}
					}
				})
			).type.errors(`Did you mean '"string"'?`)
		})

		it("component schemas complete keywords", () => {
			attest(() =>
				inferred({
					$ref: "#/components/schemas/Pet",
					components: {
						// prettier-ignore
						schemas: { Pet: { type: "object", "additionalProp": false } }
					}
				})
			).completions({ additionalProp: ["additionalProperties"] })
		})

		it("component ref completions", () => {
			attest(() =>
				inferred({
					components: {
						schemas: { Pet: { type: "object" }, Tag: { type: "string" } }
					},
					// @ts-expect-error
					$ref: "#/components/schemas/"
				})
			).completions({
				"#/components/schemas/": [
					"#/components/schemas/Pet",
					"#/components/schemas/Tag"
				]
			})
		})

		it("components other than schemas aren't validated", () => {
			const S = inferred({
				$ref: "#/components/schemas/Pet",
				components: {
					schemas: { Pet: { type: "string" } },
					parameters: { limit: { name: "limit", in: "query" } },
					responses: { ok: { description: "ok", type: "strin" } }
				}
			})
			attest<string>(S).type.toString.snap("string")
		})

		it("unresolvable ref suggests OpenAPI component refs", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					$ref: "#/components/schemas/Pett",
					components: {
						schemas: { Pet: { type: "object" }, Tag: { type: "string" } }
					}
				})
			).type.errors(`Did you mean '"#/components/schemas/Pet"'?`)
		})

		it("raw UTF-8 definition name", () => {
			const S = inferred({
				$ref: "#/$defs/café",
				$defs: { café: { type: "string" } }
			})
			attest<string>(S)
		})

		it("percent-encoded generic definition name", () => {
			// ts-json-schema-generator encodes type names with encodeURIComponent,
			// which isn't decoded, so the ref infers unknown
			const S = inferred({
				$ref: "#/definitions/Record%3Cstring%2CFoo%3E",
				definitions: {
					"Record<string,Foo>": {
						type: "object",
						additionalProperties: { $ref: "#/definitions/Foo" }
					},
					Foo: { type: "string" }
				}
			})
			attest<unknown>(S).type.toString.snap("unknown")
		})
	})

	describe("required keys in definitions", () => {
		const doc = {
			components: {
				schemas: {
					// a mixin: the key it requires is declared by the schema it's combined with
					Named: {
						type: "object",
						properties: { name: { type: "string" } },
						required: ["name", "id"]
					},
					Pet: {
						allOf: [
							{ $ref: "#/components/schemas/Named" },
							{ type: "object", properties: { id: { type: "integer" } } }
						]
					}
				}
			}
		} as const
		type Doc = typeof doc
		type Schemas = Doc["components"]["schemas"]

		it("the document is valid", () => {
			attest<true, Doc extends jsonSchema.validate<Doc> ? true : false>()
			attest<
				{ name: string; id: number },
				jsonSchema.infer<Schemas["Pet"], Doc>
			>()
		})

		it("a mixin component is valid against the document", () => {
			// a schema validated against a separate root could appear anywhere in it, so its required keys aren't checked
			const valid = {} as Schemas["Named"] extends (
				jsonSchema.validate<Schemas["Named"], Doc>
			) ?
				true
			:	false
			attest(valid).type.toString.snap("true")
		})

		it("a component's required keys complete its properties", () => {
			// a component may be combined with schemas declaring other keys, so any key is valid, but its own are offered
			attest(() =>
				inferred({
					$ref: "#/components/schemas/Pet",
					components: {
						schemas: {
							Pet: {
								type: "object",
								properties: { name: { type: "string" } },
								required: ["na"]
							}
						}
					}
				})
			).completions({ na: ["name"] })
		})

		it("a definition's required keys complete its properties", () => {
			attest(() =>
				inferred({
					$ref: "#/$defs/pet",
					$defs: {
						pet: {
							type: "object",
							properties: { name: { type: "string" } },
							required: ["na"]
						}
					}
				})
			).completions({ na: ["name"] })
		})
	})

	describe("real-world depth", () => {
		// each level wraps the previous schema in allOf, like a chain of OpenAPI
		// components inheriting through allOf: [{ $ref: parent }, { ... }]
		type nest<n extends number, schema, depth extends 0[] = []> =
			depth["length"] extends n ? schema
			:	nest<n, { allOf: [schema, { type: "object" }] }, [...depth, 0]>

		type nestTuple<n extends number, schema, depth extends 0[] = []> =
			depth["length"] extends n ? schema
			:	nestTuple<n, { type: "array"; prefixItems: [schema] }, [...depth, 0]>

		it("allOf nested 90 deep", () => {
			// each eager allOf level costs an instantiation depth, so this is a
			// circularity error from 94 levels (97 before TS 7, an accepted limit)
			attest<object, jsonSchema.infer<nest<90, { type: "object" }>>>()
		})

		it("prefixItems nested 32 deep", () => {
			type expected<t, depth extends 0[] = []> =
				depth["length"] extends 32 ? t
				:	expected<[t?, ...unknown[]], [...depth, 0]>
			attest<
				expected<string>,
				jsonSchema.infer<nestTuple<32, { type: "string" }>>
			>()
		})
	})

	describe("real-world display", () => {
		it("anyOf of arrays with the same items", () => {
			// each X[] is a distinct deferred array reference, so TS doesn't dedupe
			// them in a union (accepted display imprecision)
			const S = inferred({
				anyOf: [
					{ type: "array", items: { type: "string" } },
					{ type: "array", items: { type: "string", minLength: 1 } }
				]
			})
			attest<string[]>(S).type.toString.snap("string[] | string[]")
		})

		it("index signature over patterns with the same array values", () => {
			// package.json typesVersions: each pattern's string[] is kept (accepted
			// display imprecision)
			const S = inferred({
				type: "object",
				properties: {
					"*": { type: "array", items: { type: "string", pattern: "^x" } }
				},
				patternProperties: {
					"^[^*]+$": { type: "array", items: { type: "string" } },
					"^[^*]*\\*[^*]*$": {
						type: "array",
						items: { type: "string", pattern: "^y" }
					}
				},
				additionalProperties: false
			})
			attest<{ [k: string]: string[]; "*"?: string[] }>(S).type.toString.snap(`{
	[x: string]: string[] | string[] | string[]
	"*"?: string[]
}`)
		})
	})

	describe("allOf union limit through refs and nesting", () => {
		// six if/then/else rules, each a two-member union, written inline
		const inline = {
			type: "object",
			allOf: [
				{
					if: { required: ["x"] },
					then: { required: ["a"] },
					else: { required: ["b"] }
				},
				{
					if: { required: ["x"] },
					then: { required: ["c"] },
					else: { required: ["d"] }
				},
				{
					if: { required: ["x"] },
					then: { required: ["e"] },
					else: { required: ["f"] }
				},
				{
					if: { required: ["x"] },
					then: { required: ["g"] },
					else: { required: ["h"] }
				},
				{
					if: { required: ["x"] },
					then: { required: ["i"] },
					else: { required: ["j"] }
				},
				{
					if: { required: ["x"] },
					then: { required: ["k"] },
					else: { required: ["l"] }
				}
			]
		} as const

		it("inline rules past the third contribute their base", () => {
			const S = inferred(inline)
			attest(S).type.toString.snap(`	| { a: unknown; c: unknown; e: unknown }
	| { a: unknown; c: unknown; f: unknown }
	| { a: unknown; d: unknown; e: unknown }
	| { a: unknown; d: unknown; f: unknown }
	| { b: unknown; c: unknown; e: unknown }
	| { b: unknown; c: unknown; f: unknown }
	| { b: unknown; d: unknown; e: unknown }
	| { b: unknown; d: unknown; f: unknown }`)
		})

		it("rules referenced from $defs are limited like inline rules", () => {
			const S = inferred({
				type: "object",
				allOf: [
					{ $ref: "#/$defs/a" },
					{ $ref: "#/$defs/b" },
					{ $ref: "#/$defs/c" },
					{ $ref: "#/$defs/d" },
					{ $ref: "#/$defs/e" },
					{ $ref: "#/$defs/f" }
				],
				$defs: {
					a: {
						if: { required: ["x"] },
						then: { required: ["a"] },
						else: { required: ["b"] }
					},
					b: {
						if: { required: ["x"] },
						then: { required: ["c"] },
						else: { required: ["d"] }
					},
					c: {
						if: { required: ["x"] },
						then: { required: ["e"] },
						else: { required: ["f"] }
					},
					d: {
						if: { required: ["x"] },
						then: { required: ["g"] },
						else: { required: ["h"] }
					},
					e: {
						if: { required: ["x"] },
						then: { required: ["i"] },
						else: { required: ["j"] }
					},
					f: {
						if: { required: ["x"] },
						then: { required: ["k"] },
						else: { required: ["l"] }
					}
				}
			})
			attest<jsonSchema.infer<typeof inline>, typeof S>()
		})

		it("rules grouped in nested allOf are limited like one allOf", () => {
			const S = inferred({
				type: "object",
				allOf: [
					{
						allOf: [
							{
								if: { required: ["x"] },
								then: { required: ["a"] },
								else: { required: ["b"] }
							},
							{
								if: { required: ["x"] },
								then: { required: ["c"] },
								else: { required: ["d"] }
							},
							{
								if: { required: ["x"] },
								then: { required: ["e"] },
								else: { required: ["f"] }
							}
						]
					},
					{
						allOf: [
							{
								if: { required: ["x"] },
								then: { required: ["g"] },
								else: { required: ["h"] }
							},
							{
								if: { required: ["x"] },
								then: { required: ["i"] },
								else: { required: ["j"] }
							},
							{
								if: { required: ["x"] },
								then: { required: ["k"] },
								else: { required: ["l"] }
							}
						]
					}
				]
			})
			attest<jsonSchema.infer<typeof inline>, typeof S>()
		})
	})

	describe("draft-04 id beside $ref", () => {
		// draft-04 ignores $ref siblings, so a sibling id doesn't change the
		// base the ref resolves against (JSON-Schema-Test-Suite draft4/ref.json
		// "$ref prevents a sibling id from changing the base uri")
		it("a ref with a sibling id and type resolves against the document", () => {
			const S = inferred({
				$schema: "http://json-schema.org/draft-04/schema#",
				definitions: { y: { type: "number" } },
				type: "object",
				properties: {
					a: {
						id: "http://example.com/a",
						definitions: { y: { type: "string" } },
						$ref: "#/definitions/y",
						type: ["number", "string"]
					}
				}
			})
			attest<{ a?: number }>(S).type.toString.snap("{ a?: number }")
		})

		it("a ref-only node with a sibling id resolves against the document", () => {
			const S = inferred({
				$schema: "http://json-schema.org/draft-04/schema#",
				definitions: { y: { type: "number" } },
				type: "object",
				properties: {
					a: {
						id: "http://example.com/a",
						definitions: { y: { type: "string" } },
						$ref: "#/definitions/y"
					}
				}
			})
			attest<{ a?: number }>(S).type.toString.snap("{ a?: number }")
		})

		it("a ref that resolves against the document beside an id is valid", () => {
			attest(() =>
				inferred({
					$schema: "http://json-schema.org/draft-04/schema#",
					definitions: { y: { type: "number" } },
					type: "object",
					properties: {
						a: { id: "http://example.com/a", $ref: "#/definitions/y" }
					}
				})
			).type.errors.is("")
		})

		it("an id without a $ref sibling still starts a resource", () => {
			const S = inferred({
				$schema: "http://json-schema.org/draft-04/schema#",
				definitions: { y: { type: "number" } },
				type: "object",
				properties: {
					a: {
						id: "http://example.com/a",
						definitions: { y: { type: "string" } },
						type: "object",
						properties: { b: { $ref: "#/definitions/y" } }
					}
				}
			})
			attest<{ a?: { b?: string } }>(S).type.toString.snap(
				"{ a?: { b?: string } }"
			)
		})
	})

	describe("not without a type", () => {
		it("any non-null value", () => {
			// OpenAPI 3.1 writes "any non-null value" this way
			const S = inferred({ not: { type: "null" } })
			attest<string | number | boolean | object | unknown[]>(
				S
			).type.toString.snap("string | number | boolean | object | unknown[]")
		})

		it("any non-null value beside other parts", () => {
			attest<"a">(
				inferred({ allOf: [{ not: { type: "null" } }], const: "a" })
			).type.toString.snap('"a"')
			attest<string>(
				inferred({ type: "string", allOf: [{ not: { type: "null" } }] })
			).type.toString.snap("string")
		})

		it("domains a negation doesn't reject entirely", () => {
			attest<unknown>(inferred({ not: { const: "a" } })).type.toString.snap(
				"unknown"
			)
			attest<unknown>(
				inferred({ not: { type: "integer" } })
			).type.toString.snap("unknown")
		})

		it("non-array objects without arrays", () => {
			// JsonObject has no clean display
			attest<unknown>(inferred({ not: { type: "array" } })).type.toString.snap(
				"unknown"
			)
			attest<string | number | boolean | unknown[] | null>(
				inferred({ not: { type: "object" } })
			).type.toString.snap("string | number | boolean | unknown[] | null")
		})

		it("every domain", () => {
			attest<never>(
				inferred({
					not: {
						type: ["string", "number", "boolean", "null", "array", "object"]
					}
				})
			).type.toString.snap("never")
		})
	})

	describe("generated documents by dialect", () => {
		it("a ts-json-schema-generator document", () => {
			attest(generatedDraft07.infer).type.toString.snap(`{
	id: string
	children?: cyclic[]
	meta?: {
		readonly version: 1
		readonly tags: readonly ["a"]
	}
}`)
		})

		it("draft-07 ignores a $ref's properties sibling (schemastore event objects)", () => {
			// github-workflow.json's branch_protection_rule: the types list beside
			// the $ref is ignored under its declared draft-07
			const S = inferred({
				$schema: "http://json-schema.org/draft-07/schema#",
				definitions: {
					eventObject: {
						oneOf: [{ type: "object" }, { type: "null" }],
						additionalProperties: true
					},
					types: { type: "array", minItems: 1, items: { type: "string" } }
				},
				type: "object",
				properties: {
					branch_protection_rule: {
						$ref: "#/definitions/eventObject",
						properties: {
							types: {
								$ref: "#/definitions/types",
								items: { type: "string", enum: ["created", "edited"] }
							}
						}
					}
				}
			})
			attest<{ branch_protection_rule?: object | null }>(S)
		})

		it("2019-09 intersects a $ref's siblings", () => {
			const S = inferred({
				$schema: "https://json-schema.org/draft/2019-09/schema",
				type: "object",
				properties: { a: { $ref: "#/$defs/n", type: "number" } },
				$defs: { n: { type: ["number", "string"] } }
			})
			attest<{ a?: number }>(S)
		})

		it("draft-06 without the trailing # ignores a $ref's siblings", () => {
			const S = inferred({
				$schema: "https://json-schema.org/draft-06/schema",
				type: "object",
				properties: { a: { $ref: "#/definitions/n", type: "number" } },
				definitions: { n: { type: ["number", "string"] } }
			})
			attest<{ a?: string | number }>(S)
		})

		it("a draft-04 document identified by id with an anchor id inside", () => {
			const S = inferred({
				$schema: "http://json-schema.org/draft-04/schema#",
				id: "https://example.com/config.json",
				type: "object",
				properties: {
					level: { $ref: "#/definitions/level" },
					nested: {
						id: "#nested",
						type: "object",
						properties: { level: { $ref: "#/definitions/level" } }
					}
				},
				definitions: { level: { enum: ["low", "high"] } }
			})
			attest<{
				level?: "low" | "high"
				nested?: { level?: "low" | "high" }
			}>(S)
		})

		it("a draft-07 resource embedded with $id resolves its own definitions", () => {
			const S = inferred({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "object",
				properties: {
					a: {
						$id: "http://example.com/a.json",
						type: "object",
						properties: {
							// read as draft-07 too, so the type sibling is ignored
							x: { $ref: "#/definitions/n", type: "string" }
						},
						definitions: { n: { type: "number" } }
					}
				},
				definitions: { n: { type: "string" } }
			})
			attest<{ a?: { x?: number } }>(S)
		})

		it("a schema typed by a JSON import is widened", () => {
			// what `import schema from "./pet.json"` gives without `as const`
			type PetJson = {
				type: string
				properties: {
					name: { type: string }
					kind: { enum: string[] }
					age: { type: string[]; minimum: number }
					meta: { $ref: string }
				}
				required: string[]
				additionalProperties: boolean
			}
			attest<unknown>({} as jsonSchema.infer<PetJson>)
			attest<true>(
				{} as PetJson extends jsonSchema.validate<PetJson> ? true : false
			)
		})
	})

	describe("composing jsonSchema values", () => {
		const Address = jsonSchema({
			type: "object",
			properties: {
				street: { type: "string" },
				zip: { type: ["string", "null"] }
			},
			required: ["street"],
			additionalProperties: false
		})
		const User = jsonSchema({
			type: "object",
			properties: {
				name: { type: "string" },
				home: Address,
				work: { anyOf: [Address, { type: "null" }] }
			},
			required: ["name", "home"]
		})
		type AddressData = { street: string; zip?: string | null }

		it("in properties, anyOf, items and additionalProperties", () => {
			const Store = jsonSchema({
				type: "object",
				properties: {
					owner: User,
					visitors: { type: "array", items: User },
					byName: { type: "object", additionalProperties: Address }
				},
				required: ["owner"]
			})
			type UserData = {
				name: string
				home: AddressData
				work?: AddressData | null
			}
			attest<{
				owner: UserData
				visitors?: UserData[]
				byName?: { [k: string]: AddressData }
			}>(Store.infer)
			attest<typeof Store.infer>(jsonSchemaToType(Store).infer)
		})

		it("as OpenAPI components behind a root $ref", () => {
			const doc = jsonSchema({
				openapi: "3.1.0",
				components: {
					schemas: {
						Address,
						User,
						Users: {
							type: "array",
							items: { $ref: "#/components/schemas/User" }
						}
					}
				},
				$ref: "#/components/schemas/Users"
			})
			attest<{ name: string; home: AddressData; work?: AddressData | null }[]>(
				doc.infer
			)
		})

		it("a component's ref to a sibling component can't resolve on its own", () => {
			attest(() =>
				jsonSchema({
					type: "object",
					// @ts-expect-error
					properties: { owner: { $ref: "#/components/schemas/User" } }
				})
			).type.errors(
				`'"#/components/schemas/User"' is not assignable to type '"#"'`
			)
		})

		it("in prefixItems with boolean schemas", () => {
			const S = jsonSchema({
				type: "array",
				prefixItems: [Address, jsonSchema(true), User],
				items: jsonSchema(false),
				minItems: 3
			})
			attest(S.infer).type.toString.snap(`[
	{ street: string; zip?: string | null },
	unknown,
	{
		name: string
		home: { street: string; zip?: string | null }
		work?: { street: string; zip?: string | null } | null
	}
]`)
		})

		it("in allOf", () => {
			const Timestamped = jsonSchema({
				type: "object",
				properties: { createdAt: { type: "string" } },
				required: ["createdAt"]
			})
			const S = jsonSchema({
				allOf: [Timestamped, { properties: { id: { type: "integer" } } }]
			})
			attest<{ createdAt: string; id?: number }>(S.infer)
		})

		it("an exact not", () => {
			const Null = jsonSchema({ type: "null" })
			// limitation: a jsonSchema value in not excludes nothing, since its brand key makes it inexact (a sound fix must require a key besides the brand's)
			attest(jsonSchema({ not: Null }).infer).type.toString.snap("unknown")
			const A = jsonSchema({ const: "a" })
			attest(
				jsonSchema({ enum: ["a", "b", "c"], not: A }).infer
			).type.toString.snap('"a" | "b" | "c"')
		})

		it("an opaque jsonSchema.as value under not excludes nothing", () => {
			const raw: object = JSON.parse(`{ "type": "string" }`)
			// keyword-less like jsonSchema({}), but the asserted schema may reject
			// values, so reading its keys as annotations would infer never
			attest(
				jsonSchema({ not: jsonSchema.as<string>(raw) }).infer
			).type.toString.snap("unknown")
			attest<never>(jsonSchema({ not: { title: "any value" } }).infer)
		})

		it("a jsonSchema.as value nested in another schema", () => {
			const raw: object = JSON.parse(`{ "type": "string" }`)
			const Name = jsonSchema.as<string>(raw)
			attest(
				jsonSchema({ type: "array", items: Name }).infer
			).type.toString.snap("string[]")
		})
	})

	describe("jsonSchema values", () => {
		it("type() doesn't read an inferred schema as a definition", () => {
			const S = jsonSchema({ type: "string" })
			// at runtime, type() parses the schema object itself as an object definition
			const T = type(S as {} as { type: "string" })
			attest(T.allows("x")).equals(false)
			attest(T.allows({ type: "string" })).equals(true)
			// @ts-expect-error
			attest(() => type(S)).type.errors(/not assignable/)
			// @ts-expect-error
			attest(() => type({ a: S })).type.errors(/not assignable/)
		})

		it("a custom infer keyword intersects into .infer", () => {
			const S = jsonSchema({ type: "string", infer: "a" })
			attest(jsonSchemaToType(S).infer).type.toString.snap("string")
			// limitation: the keyword intersects into the `.infer` getter it shares a name with, though the schema accepts any string
			attest(S.infer).type.toString.snap('"a"')
		})
	})

	describe("generic functions over jsonSchema values", () => {
		it("jsonSchemaToType of a generic inferred schema", () => {
			attest(
				<t>(s: jsonSchema<t>): Type<t> =>
					// limitation: in a generic function, jsonSchemaToType(s: jsonSchema<t>) isn't assignable to Type<t>, so library code must cast (a fix would add ~25 instantiations to every call)
					// @ts-expect-error
					jsonSchemaToType(s)
			).type.errors("Type '[t]' is not assignable to type 'Type<t>'.")
		})

		it("jsonSchema.infer of a generic inferred schema", () => {
			attest(
				<t>(s: jsonSchema<t>): t =>
					// limitation: same as above for jsonSchema.infer<typeof s>, which isn't assignable to t
					// @ts-expect-error
					({}) as jsonSchema.infer<typeof s>
			).type.errors("is not assignable to type 't'")
		})

		it("wrappers returning jsonSchema.infer inside other types reject a wrong annotation", () => {
			const wrap = <const s>(
				s: jsonSchema.validate<s>
			): { data: jsonSchema.infer<s> } => s as never
			attest((): { data: { a: number } } =>
				// @ts-expect-error
				wrap({
					type: "object",
					properties: { a: { type: "string" } },
					required: ["a"]
				})
			).type.errors("Type 'string' is not assignable to type 'number'")
		})
	})

	describe("lints", () => {
		it("a required key a self-contained properties doesn't declare", () => {
			// valid JSON Schema, read as a key with any value, but likely a typo.
			// A mixin goes inline as an allOf branch instead.
			attest(() =>
				jsonSchema({
					type: "object",
					properties: { name: { type: "string" } },
					// @ts-expect-error
					required: ["name", "id"]
				})
			).type.errors(`Type '"id"' is not assignable to type '"name"'.`)
		})
	})
})
