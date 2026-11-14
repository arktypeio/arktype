import { attest, contextualize } from "@ark/attest"
import { jsonSchema, jsonSchemaToType } from "@ark/json-schema"
import type { JsonSchemaOrBoolean } from "@ark/schema"
import type { JsonSchema } from "arktype"

// checks inference without reading the schema at runtime
const inferred = <const schema>(
	schema: jsonSchema.validate<schema>
): jsonSchema.infer<schema> => schema as never

/** whether a (possibly hand-written, mutable) schema type is accepted as-is */
type isValid<schema> =
	[schema] extends [jsonSchema.validate<schema>] ? true : false

contextualize(() => {
	describe("valid schemas", () => {
		it("keywords of every vocabulary", () => {
			attest(() =>
				inferred({
					$schema: "https://json-schema.org/draft/2020-12/schema",
					$id: "https://example.com/node",
					$anchor: "node",
					$defs: { a: { type: "string" } },
					type: "string",
					pattern: "^[a-z]+$",
					format: "email",
					allOf: [true, { type: "string" }],
					anyOf: [{ $ref: "https://example.com/schema.json" }, { const: "" }],
					oneOf: [{ $ref: "other.json#/$defs/a" }, { $ref: "#node" }],
					not: { const: "c" },
					if: { maxLength: 3 },
					then: { pattern: "^x" },
					else: false
				})
			).type.errors.is("")
		})

		it("annotations, unknown keywords and data aren't validated as schemas", () => {
			attest(() =>
				inferred({
					type: "object",
					title: 5,
					description: null,
					deprecated: "yes",
					$comment: ["array"],
					"x-nested": { type: "strin", minLength: -1 },
					errorMessage: { type: "must be an object" },
					default: { type: "strin", properties: 5 },
					examples: [{ $ref: "#/missing" }, { maxItems: 1.5 }],
					properties: {
						a: { const: { additionalItems: true, items: {}, prefixItems: [] } },
						b: { enum: [{ $ref: "#/nowhere" }, { type: 5 }] }
					}
				})
			).type.errors.is("")
		})

		it("widened values", () => {
			const minLength: number = 1
			const pattern: string = "^a"
			const flag: boolean = true
			const ref = "#/$defs/a" as `#/$defs/${string}`
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					type: "string",
					minLength,
					pattern,
					uniqueItems: flag,
					items: flag,
					nullable: flag,
					$ref: ref
				})
			).type.errors.is("")
		})

		it("any and object keyword values", () => {
			type Nested<schema> = {
				type: "object"
				properties: { a: { items: schema } }
			}
			attest<
				[true, true, true, true, true, true, true, true, true],
				[
					isValid<{ type: any; required: any; properties: any }>,
					isValid<{ $ref: any; minLength: any; multipleOf: any }>,
					isValid<{ enum: any; const: any; exclusiveMinimum: any }>,
					isValid<{ allOf: any; items: any; prefixItems: any }>,
					isValid<{ additionalItems: any; propertyNames: any }>,
					isValid<Nested<{ type: any; required: any; properties: any }>>,
					isValid<Nested<{ $ref: any; allOf: any; prefixItems: any }>>,
					isValid<Nested<{ dependencies: any; components: any; not: any }>>,
					isValid<{ not: object; items: {}; properties: { a: object } }>
				]
			>()
		})

		it("widened roots", () => {
			attest<true, isValid<any>>()
			attest<true, isValid<never>>()
			attest<true, isValid<JsonSchema.Intersection>>()
			attest<unknown>(inferred({} as JsonSchema))
			attest<unknown>(inferred(true as JsonSchema.Branch))
			attest<unknown>(inferred({} as JsonSchemaOrBoolean))
			attest(() => inferred({} as JsonSchema.Object)).type.errors.is("")
			attest(() => inferred({} as object)).type.errors.is("")
			attest(() => inferred({} as Record<string, unknown>)).type.errors.is("")
		})
	})

	describe("hand-written schema types", () => {
		it("mutable invalid", () => {
			attest<false, isValid<{ type: "strin" }>>()
			attest<
				false,
				isValid<{ type: "object"; required: ["a"]; properties: {} }>
			>()
			attest<false, isValid<{ type: "string"; minLength: -1 }>>()
			attest<false, isValid<{ $ref: "#/$defs/a" }>>()
		})

		it("optional slots with explicit undefined", () => {
			attest<
				true,
				isValid<{
					type: "object"
					properties?: { a: { type: "string" } } | undefined
					additionalProperties?: { type: "number" } | undefined
					minProperties?: number | undefined
					required?: ["a"] | undefined
					anyOf?: [{ required: ["a"] }] | undefined
				}>
			>()
		})

		it("interface-typed schema records", () => {
			interface Properties {
				a: { type: "string" }
				b: { type: "number" }
			}
			interface Dependencies {
				a: readonly ["b"]
			}
			attest<
				true,
				isValid<{ type: "object"; properties: Properties; required: ["a"] }>
			>()
			attest<true, isValid<{ $defs: Properties; $ref: "#/$defs/a" }>>()
			attest<true, isValid<{ dependencies: Dependencies }>>()
			attest<true, isValid<{ dependentRequired: Dependencies }>>()
		})

		it("type unions that include every type name", () => {
			// @types/json-schema's JSONSchema4TypeName and JSONSchema6TypeName also include "any"
			type JSONSchema6TypeName = JsonSchema.TypeName | "any"
			interface JSONSchema6 {
				type?: JSONSchema6TypeName | JSONSchema6TypeName[] | undefined
				properties?: { [k: string]: JSONSchema6 | boolean } | undefined
				items?: JSONSchema6 | boolean | (JSONSchema6 | boolean)[] | undefined
				required?: string[] | undefined
			}
			// a union including every type name is widened like `string`
			attest<true, isValid<JSONSchema6>>()
			attest<true, isValid<{ type: JsonSchema.TypeName | "strin" }>>()
			attest<unknown, jsonSchema.infer<{ type: JSONSchema6TypeName }>>()
			// a union missing a type name still checks each member
			attest<false, isValid<{ type: "string" | "number" | "strin" }>>()
		})

		it("a JSON module's widened schema type", () => {
			// what `import schema from "./schema.json"` gives: literal keys, widened values
			type Imported = {
				$schema: string
				type: string
				properties: {
					name: { type: string; maxLength: number; pattern: string }
					author: {
						oneOf: (
							| { $ref: string; type?: never }
							| { type: string; $ref?: never }
						)[]
					}
					files: { type: string[]; items: { type: string }; minItems: number }
					workspaces: {
						type: string
						items: { type: string }[]
						additionalItems: boolean
					}
					size: { type: string; exclusiveMaximum: number; multipleOf: number }
				}
				required: string[]
				dependencies: { bin: string[] }
				additionalProperties: boolean
			}
			attest<true, isValid<Imported>>()
			attest<unknown>(jsonSchema({} as Imported).infer)
		})
	})

	describe("union-typed schemas", () => {
		type Valid = { type: "string"; minLength: 1 }
		type InvalidCount = { type: "string"; minLength: -1 }

		it("each member of a root union is validated on its own", () => {
			attest<
				true,
				isValid<
					| { type: "object"; properties: { a: true }; required: ["a"] }
					| { type: "object"; properties: { b: true }; required: ["b"] }
				>
			>()
			attest<false, isValid<{ minLength: 1 } | { minLength: -1 }>>()
			attest<
				false,
				isValid<
					| { type: "object"; properties: { a: true }; required: ["b"] }
					| { type: "object"; properties: { b: true }; required: ["b"] }
				>
			>()
		})

		it("each member of a root union is its own root for $ref", () => {
			attest<
				true,
				isValid<
					| { $defs: { a: { type: "string" } }; $ref: "#/$defs/a" }
					| { $defs: { b: { type: "number" } }; $ref: "#/$defs/b" }
				>
			>()
			type Union =
				| { $defs: { a: { type: "string" } }; $ref: "#/$defs/a" }
				| { type: "array"; items: { $ref: "#/$defs/a" } }
			// the second member's ref can't resolve against itself, so it infers unknown items
			attest<string | unknown[], jsonSchema.infer<Union>>()
			attest<false, isValid<Union>>()
		})

		it("union-typed keyword values", () => {
			attest<true, isValid<{ minLength: 1 | 2 }>>()
			attest<false, isValid<{ minLength: 1 | -1 }>>()
			attest<false, isValid<{ multipleOf: 1 | 0 }>>()
			attest<false, isValid<{ type: "string" | "strin" }>>()
			attest<
				false,
				isValid<{
					type: "object"
					properties: { a: {} }
					required: ["a"] | ["b"]
				}>
			>()
		})

		it("a root union whose every member fails the single-pass check", () => {
			type BranchRequired = {
				type: "object"
				properties: {}
				allOf: [{ properties: { b: {} } }]
				required: ["b"]
			}
			attest<true, isValid<BranchRequired>>()
			attest<false, isValid<{ properties: 5 } | BranchRequired>>()
			attest<
				false,
				isValid<{ properties: { x: { type: "strin" } } } | BranchRequired>
			>()
		})

		it("a statically valid union member's completions are closed", () => {
			attest<
				false,
				isValid<{ properties: { a: { type: "string" } } | { a: InvalidCount } }>
			>()
		})

		it("an invalid member in each kind of subschema slot", () => {
			type U = Valid | InvalidCount
			attest<
				[false, false, false, false, false, false],
				[
					isValid<{ $defs: { a: U } }>,
					isValid<{ dependencies: { a: U } }>,
					isValid<{ dependencies: { a: U | ["x"] } }>,
					isValid<{ items: U }>,
					isValid<{ items: [U] }>,
					isValid<{ items: U | [Valid] }>
				]
			>()
			attest<
				[false, false, false, false, false, false],
				[
					isValid<{ prefixItems: [U] }>,
					isValid<{ oneOf: U[] }>,
					isValid<{ not: U }>,
					isValid<{ additionalItems: U }>,
					isValid<{ propertyNames: U }>,
					isValid<{ components: { schemas: { a: U } } }>
				]
			>()
		})
	})

	describe("type", () => {
		it("invalid names", () => {
			// @ts-expect-error
			attest(() => inferred({ type: "strin" })).type.errors.snap(
				"Type '\"strin\"' is not assignable to type 'TypeName'. Did you mean '\"string\"'?"
			)
		})

		it("empty list", () => {
			// the meta-schema requires at least one type name
			attest(() =>
				inferred({
					// @ts-expect-error
					type: []
				})
			).type.errors.snap(
				"Type '[]' is not assignable to type 'readonly [TypeName, ...TypeName[]]'.Source has 0 element(s) but target requires 1."
			)
		})

		it("propertyNames type list without strings", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					propertyNames: { type: ["number", "null"] }
				})
			).type.errors.snap(
				"Type '\"number\"' is not assignable to type '\"string\"'."
			)
		})
	})

	describe("required", () => {
		it("typo", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { name: { type: "string" } },
					// @ts-expect-error
					required: ["nmae"]
				})
			).type.errors.snap(
				"Type '\"nmae\"' is not assignable to type '\"name\"'."
			)
		})

		it("hand-written entries", () => {
			type Template = Record<`x-${string}`, {}>
			attest<
				[false, true, false, true, false, true, true, true],
				[
					isValid<{ properties: Record<"a" | "b", {}>; required: ["c"] }>,
					isValid<{ properties: Template; required: ["x-a"] }>,
					isValid<{ properties: Template; required: ["y"] }>,
					isValid<{ properties: Template; required: [`x-${string}`] }>,
					isValid<{ properties: { a: {} }; required: ["a" | "b"] }>,
					isValid<{ properties: { a: {}; b: {} }; required: ["a" | "b"] }>,
					isValid<{ properties: Record<string, {}>; required: ["x"] }>,
					isValid<{ properties: { a: {} }; required: string[] }>
				]
			>()
			// an optional `additionalProperties?: false` is still self-contained, a widened one may be true
			attest<
				false,
				isValid<{
					properties: { a: {} }
					required: ["b"]
					additionalProperties?: false
				}>
			>()
			attest<
				true,
				isValid<{
					properties: { a: {} }
					required: ["b"]
					additionalProperties: boolean
				}>
			>()
		})
	})

	describe("required keys outside properties", () => {
		// a required key outside properties is a typo only in a self-contained node on an isolated path from the root
		type Typo = { properties: { a: {} }; required: ["b"] }

		it("exempting keywords", () => {
			// a keyword applying another subschema, or additionalProperties that isn't false
			attest<true, isValid<{ allOf: [{}] } & Typo>>()
			attest<
				true,
				isValid<{ additionalProperties: { type: "string" } } & Typo>
			>()
		})

		it("exempt positions", () => {
			attest<
				[true, true, true, true, true, true, true, true],
				[
					isValid<{ allOf: [Typo] }>,
					isValid<{ not: Typo }>,
					isValid<{ $defs: { a: Typo } }>,
					isValid<{ dependencies: { a: Typo } }>,
					isValid<{ openapi: "3.1.0"; components: { schemas: { a: Typo } } }>,
					isValid<{ items: [Typo] }>,
					isValid<{ items: [{}]; additionalItems: Typo }>,
					isValid<{ propertyNames: Typo }>
				]
			>()
		})

		it("positions below an exempt node", () => {
			attest<
				[true, true, true, true],
				[
					isValid<{ $defs: { d: { properties: { x: Typo } } } }>,
					isValid<{ allOf: [{ items: Typo }] }>,
					isValid<{ $ref: "#"; properties: { x: Typo } }>,
					isValid<{ items: Typo; contains: {} }>
				]
			>()
		})

		it("checked positions", () => {
			attest<
				[false, false, false, false, false],
				[
					isValid<{ properties: { x: Typo } }>,
					isValid<{ items: Typo }>,
					isValid<{ prefixItems: [Typo] }>,
					isValid<{ additionalProperties: Typo }>,
					isValid<Typo | { type: "string" }>
				]
			>()
			// keywords that don't apply another subschema to a property don't exempt it
			attest<
				[false, false, false],
				[
					isValid<{ properties: { x: Typo }; additionalProperties: {} }>,
					isValid<{ not: {} } & Typo>,
					isValid<{ $id: "https://example.com"; title: "t" } & Typo>
				]
			>()
		})
	})

	describe("$ref", () => {
		type check<s, root = s> =
			[s] extends [jsonSchema.validate<s, root>] ? true : false

		it("missing definition", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					// @ts-expect-error
					$ref: "#/$defs/b"
				})
			).type.errors.snap(
				'Type \'"#/$defs/b"\' is not assignable to type \'"#" | "#/$defs/a"\'. Did you mean \'"#/$defs/a"\'?'
			)
		})

		it("ref errors list escaped and numeric names", () => {
			attest(() =>
				inferred({
					$defs: { a: {}, "x/y": {}, "m~n": {}, 0: {} },
					// @ts-expect-error
					$ref: "#/$defs/zz"
				})
			).type.errors.snap(
				'Type \'"#/$defs/zz"\' is not assignable to type \'"#" | "#/$defs/0" | "#/$defs/a" | "#/$defs/m~0n" | "#/$defs/x~1y"\'. Did you mean \'"#/$defs/0"\'?'
			)
		})

		it("pointer array indices follow RFC 6901", () => {
			type Tuple = { $defs: { a: { allOf: [{}, {}] } } }
			type Widened = { $defs: { a: { allOf: {}[] } } }
			attest<
				[true, false, false, true, false, false, false],
				[
					check<Tuple & { $ref: "#/$defs/a/allOf/1" }>,
					check<Tuple & { $ref: "#/$defs/a/allOf/2" }>,
					check<Tuple & { $ref: "#/$defs/a/allOf/01" }>,
					check<Widened & { $ref: "#/$defs/a/allOf/10" }>,
					check<Widened & { $ref: "#/$defs/a/allOf/01" }>,
					check<Widened & { $ref: "#/$defs/a/allOf/-1" }>,
					check<{ $ref: "#/required/0"; required: ["a"] }>
				]
			>()
		})

		it("suggestions percent-encode names", () => {
			attest(() =>
				inferred({
					$defs: {
						"%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%": {
							type: "string"
						}
					},
					// @ts-expect-error
					$ref: "#/$defs/x"
				})
			).type.errors.snap(
				'Type \'"#/$defs/x"\' is not assignable to type \'"#" | "#/$defs/%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25%25"\'.'
			)
		})

		it("root definition from inside an embedded resource", () => {
			attest(() =>
				inferred({
					$defs: {
						name: { type: "string" },
						address: {
							$id: "https://example.com/address",
							$defs: { street: { type: "string" } },
							type: "object",
							// @ts-expect-error
							properties: { name: { $ref: "#/$defs/name" } }
						}
					},
					$ref: "#/$defs/address"
				})
			).type.errors.snap(
				'Type \'"#/$defs/name"\' is not assignable to type \'"#" | "#/$defs/street"\'.'
			)
		})

		it("refs beside an $id that may not start a resource", () => {
			type Under<id, ref extends string = "#/$defs/a"> = {
				$defs: { a: {} }
				properties: { p: id & { properties: { q: { $ref: ref } } } }
			}
			attest<
				[true, true, true],
				[
					isValid<Under<{ $id: "#a" }>>,
					// a widened $id leaves the refs inside it unresolved
					isValid<Under<{ $id: string }, "#/$defs/b">>,
					isValid<Under<{ $id?: string }>>
				]
			>()
		})

		it("$ref siblings ignored by draft-07 are still validated", () => {
			attest(() =>
				inferred({
					$schema: "http://json-schema.org/draft-07/schema#",
					definitions: { a: {} },
					$ref: "#/definitions/a",
					// @ts-expect-error
					minLength: -1
				})
			).type.errors("minLength must be a non-negative integer (was -1)")
		})

		it("ref into an optional $defs", () => {
			type Doc = { $defs?: { a: { type: "string" } } }
			attest<
				[true, false],
				[check<Doc & { $ref: "#/$defs/a" }>, check<Doc & { $ref: "#/$defs/b" }>]
			>()
			attest<string, jsonSchema.infer<Doc & { $ref: "#/$defs/a" }>>()
		})

		it("an explicit root", () => {
			type Doc = { $defs: { user: { type: "object" }; id: { type: "string" } } }
			attest<true, check<{ $ref: "#/$defs/id" }, Doc>>()
			attest<false, check<{ $ref: "#/$defs/nope" }, Doc>>()
			attest<false, check<{ $ref: "#/$defs/id" }>>()
		})

		it("a composed schema's relative ref resolves against the new root", () => {
			const User = jsonSchema({
				$defs: { name: { type: "string" } },
				type: "object",
				properties: { name: { $ref: "#/$defs/name" } }
			})
			attest<{ name?: string }>(User.infer)
			// the new document has no $defs
			attest(() =>
				// @ts-expect-error
				jsonSchema({ type: "array", items: User })
			).type.errors(`Type '"#/$defs/name"' is not assignable to type '"#"'`)
		})
	})

	describe("keyword values", () => {
		it("count spellings", () => {
			attest(() =>
				inferred({
					type: "array",
					minItems: 1e3,
					maxItems: 9007199254740991,
					minContains: -0,
					maxContains: 1.5e21
				})
			).type.errors.is("")
			attest(() =>
				// @ts-expect-error
				inferred({ type: "string", minLength: 1e-7 })
			).type.errors("minLength must be a non-negative integer (was 1e-7)")
			attest(() =>
				// @ts-expect-error
				inferred({ type: "array", maxItems: -1e21 })
			).type.errors.snap(
				"Type 'number' is not assignable to type '\"maxItems must be a non-negative integer (was -1e+21)\u200b\"'."
			)
			attest(
				() =>
					// @ts-expect-error
					inferred({ type: "string", maxLength: 1e999 }) // eslint-disable-line no-loss-of-precision
			).type.errors.snap(
				"Type 'number' is not assignable to type '\"maxLength must be a non-negative integer (was Infinity)\u200b\"'."
			)
		})

		it("multipleOf must be positive", () => {
			// @ts-expect-error
			attest(() => inferred({ multipleOf: 0 })).type.errors(
				"multipleOf must be a positive number (was 0)"
			)
			// @ts-expect-error
			attest(() => inferred({ multipleOf: -2 })).type.errors(
				"multipleOf must be a positive number (was -2)"
			)
		})

		it("value kinds", () => {
			// @ts-expect-error
			attest(() => inferred({ type: "string", pattern: 5 })).type.errors(
				`Type 'number' is not assignable to type 'string | RegExp'`
			)
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					dependentRequired: { a: ["b", 1] }
				})
			).type.errors.snap("Type 'number' is not assignable to type 'string'.")
		})

		it("schema records given as arrays", () => {
			attest(() =>
				inferred({
					type: "object",
					// @ts-expect-error
					patternProperties: [{ type: "string" }]
				})
			).type.errors.snap(
				"Type '{ type: string; }[]' is not assignable to type '{ readonly [k: string]: boolean | object; }'.Index signature for type 'string' is missing in type '{ type: string; }[]'."
			)
		})

		it("empty schema lists", () => {
			// the meta-schema requires at least one subschema
			// @ts-expect-error
			attest(() => inferred({ allOf: [] })).type.errors.snap(
				"Type '[]' is not assignable to type 'readonly [boolean | object, ...(boolean | object)[]]'.Source has 0 element(s) but target requires 1."
			)
		})

		it("union schema lists with an empty member", () => {
			attest(
				{} as isValid<{ allOf: [] | [{ type: "string" }] }>
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

		it("unsupported keywords", () => {
			attest(() =>
				inferred({
					type: "number",
					minimum: 0,
					// @ts-expect-error
					exclusiveMinimum: true,
					// @ts-expect-error
					unevaluatedProperties: { type: "boolean" }
				})
			).type.errors
				.snap(`Type 'true' is not assignable to type '"boolean exclusiveMinimum isn't supported by jsonSchemaToType\u200b"'.
Type '{ type: string; }' is not assignable to type '"unevaluatedProperties isn't supported by jsonSchemaToType\u200b"'.`)
		})
	})

	describe("invalid subschemas", () => {
		it("root", () => {
			// @ts-expect-error
			attest(() => inferred("string")).type.errors(
				"JSON Schema must be an object or a boolean (was string)"
			)
			// @ts-expect-error
			attest(() => inferred([{ type: "string" }])).type.errors(
				"JSON Schema must be an object or a boolean (was array)"
			)
		})

		it("schema keyword value kinds don't name internal interfaces", () => {
			const noInternalName =
				/^(?![\S\s]*(Statically|StaticDependencies|DependentRequired))[\S\s]*is not assignable/
			// @ts-expect-error
			attest(() => inferred({ type: "object", properties: 5 })).type.errors(
				noInternalName
			)
			// @ts-expect-error
			attest(() => inferred({ allOf: 5 })).type.errors(noInternalName)
			// @ts-expect-error
			attest(() => inferred({ dependencies: 5 })).type.errors(noInternalName)
			// @ts-expect-error
			attest(() => inferred({ dependentRequired: 5 })).type.errors(
				noInternalName
			)
		})
	})

	describe("error placement", () => {
		it("type nested in each kind of subschema slot", () => {
			attest(() =>
				inferred({
					$defs: {
						// @ts-expect-error
						a: { type: "strin" }
					},
					// @ts-expect-error
					items: { type: "strin" },
					// @ts-expect-error
					prefixItems: [true, { type: "strin" }],
					// @ts-expect-error
					not: { type: "strin" }
				})
			).type.errors
				.snap(`Type '"strin"' is not assignable to type 'TypeName'. Did you mean '"string"'?
Type '"strin"' is not assignable to type 'TypeName | undefined'. Did you mean '"string"'?
Type '"strin"' is not assignable to type 'TypeName'. Did you mean '"string"'?
Type '"strin"' is not assignable to type 'TypeName | undefined'. Did you mean '"string"'?`)
		})
	})

	describe("completions", () => {
		it("type in a list", () => {
			// @ts-expect-error
			attest(() => inferred({ type: ["string", "o"] })).completions({
				o: ["object"]
			})
		})

		it("required beside allOf offers the node's own properties", () => {
			// any key is valid, since the allOf branch may declare it
			attest(() =>
				inferred({
					type: "object",
					properties: { alpha: {}, beta: {} },
					allOf: [{ properties: { gamma: {} } }],
					required: [""]
				})
			).completions({ "": ["alpha", "beta"] })
		})

		it("$ref root and definitions", () => {
			attest(() =>
				inferred({
					definitions: { node: true, leaf: true },
					// @ts-expect-error
					$ref: "#/"
				})
			).completions({ "#/": ["#/definitions/leaf", "#/definitions/node"] })
		})

		it("keyword names by prefix", () => {
			attest(() =>
				// prettier-ignore
				inferred({ type: "string", "max": 1 })
			).completions({
				max: [
					"maxContains",
					"maxItems",
					"maxLength",
					"maxProperties",
					"maximum"
				]
			})
		})

		it("keyword names nested in an invalid schema", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						// prettier-ignore
						a: { type: "string", "maxLe": 1 }
					},
					// @ts-expect-error
					required: ["b"]
				})
			).completions({ maxLe: ["maxLength"] })
		})

		it("keyword names in each kind of subschema slot", () => {
			attest(() =>
				inferred({
					// prettier-ignore
					$defs: { a: { "minLe": 1 } },
					// prettier-ignore
					dependencies: { a: { "maxPr": 1 } },
					// prettier-ignore
					if: { "minIt": 1 },
					// prettier-ignore
					propertyNames: { "patte": "^a" }
				})
			).completions({
				minLe: ["minLength"],
				maxPr: ["maxProperties"],
				minIt: ["minItems"],
				patte: ["pattern", "patternProperties"]
			})
		})
	})

	describe("OpenAPI components", () => {
		it("schemas are validated at the document root", () => {
			attest(() =>
				inferred({
					openapi: "3.1.0",
					components: {
						// @ts-expect-error
						schemas: { a: { type: "strin" } },
						parameters: { limit: { name: "limit", in: "query" } },
						responses: { ok: { description: "ok" } }
					}
				})
			).type.errors(`Did you mean '"string"'?`)
		})

		it("components elsewhere is an unknown keyword", () => {
			attest(() =>
				inferred({
					type: "object",
					components: "header",
					properties: {
						a: { type: "string", components: { schemas: { b: 5 } } }
					}
				})
			).type.errors.is("")
			attest<
				true,
				isValid<{ type: "string"; components: 5 } | { type: "number" }>
			>()
		})

		it("component ref suggestions", () => {
			attest(() =>
				inferred({
					openapi: "3.1.0",
					components: {
						schemas: {
							Pet: { type: "string" },
							// @ts-expect-error
							Owner: { type: "object", properties: { pet: { $ref: "#/c" } } }
						}
					}
				})
			).completions({
				"#/c": ["#/components/schemas/Owner", "#/components/schemas/Pet"]
			})
		})
	})

	describe("generic schema parameters", () => {
		it("a type parameter constrained to JsonSchema", () => {
			// a deferred jsonSchema.validate<schema> can't be related to an unresolved parameter, as for arktype's type(): validate the parameter instead (below)
			attest(<schema extends JsonSchema>(s: schema) =>
				// @ts-expect-error
				jsonSchemaToType(s)
			).type.errors("Argument of type 'schema' is not assignable")
		})

		it("a wrapper with a validated parameter", () => {
			const wrap = <const schema>(s: jsonSchema.validate<schema>) =>
				jsonSchemaToType(s as never)
			attest(() => wrap({ type: "string" })).type.errors.is("")
			// @ts-expect-error
			attest(() => wrap({ type: "strin" })).type.errors(
				`Did you mean '"string"'?`
			)
		})
	})
})
