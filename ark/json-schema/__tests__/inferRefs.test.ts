import { attest, contextualize } from "@ark/attest"
import { jsonSchema } from "@ark/json-schema"
import type { JsonSchema } from "arktype"

// the runtime parser doesn't support $ref, so inference is checked without it
// like jsonSchemaToType, the result is read back with `infer` so attest's
// contextual type isn't inferred into jsonSchema.infer
const inferred = <const schema, r = jsonSchema.infer<schema>>(
	schema: jsonSchema.validate<schema>
): r extends infer _ ? _ : never => schema as never

contextualize(() => {
	describe("root", () => {
		it("bare root ref is a shallow cycle", () => {
			const T = inferred({ $ref: "#" })
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("through required properties and items", () => {
			type Tree = { name: string; children: Tree[] }
			const T = inferred({
				type: "object",
				properties: {
					name: { type: "string" },
					children: { type: "array", items: { $ref: "#" } }
				},
				required: ["name", "children"]
			})
			attest<Tree>(T).type.toString.snap("{ name: string; children: cyclic[] }")
			attest<
				string,
				(typeof T)["children"][number]["children"][number]["children"][number]["children"][number]["children"][number]["children"][number]["name"]
			>()
		})

		it("through optional properties", () => {
			type Node = { next?: Node; value?: number }
			const T = inferred({
				type: "object",
				properties: {
					next: { $ref: "#" },
					value: { type: "number" }
				}
			})
			attest<Node>(T).type.toString.snap("{ next?: cyclic; value?: number }")
			attest<number | undefined>(T.next?.next?.next?.next?.next?.next?.value)
		})

		it("through additionalProperties", () => {
			type Dict = { [k: string]: Dict }
			const T = inferred({
				type: "object",
				additionalProperties: { $ref: "#" }
			})
			attest<Dict>(T).type.toString.snap("{ [x: string]: cyclic }")
			attest<Dict, (typeof T)["a"]["b"]["c"]["d"]["e"]["f"]>()
		})

		it("through patternProperties", () => {
			type Dict = { [k: string]: Dict | string }
			const T = inferred({
				type: "object",
				patternProperties: {
					"^x-": { $ref: "#" },
					"^s-": { type: "string" }
				},
				additionalProperties: false
			})
			attest<Dict>(T).type.toString.snap("{ [x: string]: string | cyclic }")
		})

		it("through items alone", () => {
			type Nested = Nested[]
			const T = inferred({ type: "array", items: { $ref: "#" } })
			attest<Nested>(T).type.toString.snap("any[][][][][][][][][][][]")
			attest<Nested, (typeof T)[0][0][0][0][0][0]>()
		})

		it("through implied array items", () => {
			type Nested = string | number | boolean | object | Nested[] | null
			attest<Nested>(inferred({ items: { $ref: "#" } }))
		})

		it("through implied object properties", () => {
			type Node =
				| string
				| number
				| boolean
				| unknown[]
				| { child?: Node }
				| null
			attest<Node>(inferred({ properties: { child: { $ref: "#" } } }))
		})

		it("root that is itself a ref", () => {
			type Node = { self?: Node; id: string }
			const T = inferred({
				$ref: "#/$defs/node",
				$defs: {
					node: {
						type: "object",
						properties: {
							self: { $ref: "#" },
							id: { type: "string" }
						},
						required: ["id"]
					}
				}
			})
			attest<Node>(T).type.toString.snap("{ self?: cyclic; id: string }")
			attest<string | undefined>(T.self?.self?.self?.self?.self?.id)
		})
	})

	describe("$defs", () => {
		it("primitive", () => {
			const T = inferred({
				$defs: { s: { type: "string" } },
				$ref: "#/$defs/s"
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("object with required", () => {
			const T = inferred({
				$defs: {
					user: {
						type: "object",
						properties: {
							name: { type: "string" },
							age: { type: "integer" }
						},
						required: ["name"]
					}
				},
				$ref: "#/$defs/user"
			})
			attest<{ name: string; age?: number }>(T).type.toString.snap(
				"{ name: string; age?: number }"
			)
		})

		it("empty target is unknown", () => {
			const T = inferred({ $defs: { any: {} }, $ref: "#/$defs/any" })
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("same def used many times", () => {
			const T = inferred({
				$defs: { id: { type: "string" } },
				type: "object",
				properties: {
					a: { $ref: "#/$defs/id" },
					b: { $ref: "#/$defs/id" },
					c: { type: "array", items: { $ref: "#/$defs/id" } }
				},
				required: ["a", "c"]
			})
			attest<{ a: string; b?: string; c: string[] }>(T).type.toString.snap(
				"{ a: string; b?: string; c: string[] }"
			)
		})

		it("def names that look like keywords", () => {
			const T = inferred({
				$defs: {
					type: { type: "string" },
					properties: { type: "number" },
					$ref: { type: "boolean" }
				},
				type: "object",
				properties: {
					a: { $ref: "#/$defs/type" },
					b: { $ref: "#/$defs/properties" },
					c: { $ref: "#/$defs/$ref" }
				},
				required: ["a", "b", "c"]
			})
			attest<{ a: string; b: number; c: boolean }>(T).type.toString.snap(
				"{ a: string; b: number; c: boolean }"
			)
		})

		it("def names with punctuation", () => {
			const T = inferred({
				$defs: {
					"kebab-case": { type: "string" },
					"dotted.name": { type: "number" },
					"with space": { type: "boolean" },
					"#hash": { type: "null" },
					ünï: { const: 1 }
				},
				type: "object",
				properties: {
					a: { $ref: "#/$defs/kebab-case" },
					b: { $ref: "#/$defs/dotted.name" },
					c: { $ref: "#/$defs/with space" },
					d: { $ref: "#/$defs/#hash" },
					e: { $ref: "#/$defs/ünï" }
				},
				required: ["a", "b", "c", "d", "e"]
			})
			attest<{ a: string; b: number; c: boolean; d: null; e: 1 }>(
				T
			).type.toString.snap(
				"{ a: string; b: number; c: boolean; d: null; e: 1 }"
			)
		})

		it("def names shadowing Object.prototype members", () => {
			const T = inferred({
				$defs: {
					constructor: { type: "string" },
					toString: { type: "number" }
				},
				type: "object",
				properties: {
					a: { $ref: "#/$defs/constructor" },
					b: { $ref: "#/$defs/toString" }
				},
				required: ["a", "b"]
			})
			attest<{ a: string; b: number }>(T).type.toString.snap(
				"{ a: string; b: number }"
			)
		})

		it("empty def name", () => {
			const T = inferred({
				$defs: { "": { type: "string" } },
				$ref: "#/$defs/"
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("numeric def name", () => {
			const T = inferred({
				$defs: { 1: { type: "string" } },
				$ref: "#/$defs/1"
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("quoted numeric def name", () => {
			const T = inferred({
				// prettier-ignore
				$defs: { "1": { type: "string" } },
				$ref: "#/$defs/1"
			})
			attest<string>(T).type.toString.snap("string")
		})
	})

	describe("definitions", () => {
		it("primitive", () => {
			const T = inferred({
				definitions: { s: { type: "string" } },
				$ref: "#/definitions/s"
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("draft-07 document with root ref", () => {
			// typescript-json-schema / ts-json-schema-generator output
			const T = inferred({
				$schema: "http://json-schema.org/draft-07/schema#",
				$ref: "#/definitions/Config",
				definitions: {
					Config: {
						type: "object",
						properties: {
							name: { type: "string" },
							mode: { $ref: "#/definitions/Mode" },
							tags: { type: "array", items: { type: "string" } }
						},
						required: ["name", "mode"],
						additionalProperties: false
					},
					Mode: { type: "string", enum: ["dev", "prod"] }
				}
			})
			attest<{ name: string; mode: "dev" | "prod"; tags?: string[] }>(T).type
				.toString.snap(`{
	name: string
	mode: "dev" | "prod"
	tags?: string[]
}`)
		})

		it("$defs and definitions side by side", () => {
			const T = inferred({
				$defs: { a: { type: "string" } },
				definitions: { a: { type: "number" } },
				type: "object",
				properties: {
					x: { $ref: "#/$defs/a" },
					y: { $ref: "#/definitions/a" }
				},
				required: ["x", "y"]
			})
			attest<{ x: string; y: number }>(T).type.toString.snap(
				"{ x: string; y: number }"
			)
		})
	})

	describe("json pointers", () => {
		it("to a property", () => {
			const T = inferred({
				type: "object",
				properties: {
					a: { type: "string" },
					b: { $ref: "#/properties/a" }
				},
				required: ["b"]
			})
			attest<{ a?: string; b: string }>(T).type.toString.snap(
				"{ a?: string; b: string }"
			)
		})

		it("to items", () => {
			const T = inferred({
				type: "object",
				properties: {
					list: { type: "array", items: { type: "boolean" } },
					first: { $ref: "#/properties/list/items" }
				},
				required: ["first"]
			})
			attest<{ list?: boolean[]; first: boolean }>(T).type.toString.snap(
				"{ list?: boolean[]; first: boolean }"
			)
		})

		it("to prefixItems indices", () => {
			const T = inferred({
				type: "object",
				properties: {
					pair: {
						type: "array",
						prefixItems: [{ type: "string" }, { type: "number" }]
					},
					first: { $ref: "#/properties/pair/prefixItems/0" },
					second: { $ref: "#/properties/pair/prefixItems/1" }
				},
				required: ["first", "second"]
			})
			attest<{
				pair?: [string?, number?, ...unknown[]]
				first: string
				second: number
			}>(T).type.toString.snap(`{
	pair?: [string?, number?, ...unknown[]]
	first: string
	second: number
}`)
		})

		it("into a def's nested tuple", () => {
			const T = inferred({
				$defs: {
					a: {
						type: "array",
						items: {
							type: "array",
							prefixItems: [{ type: "null" }, { type: "boolean" }]
						}
					}
				},
				$ref: "#/$defs/a/items/prefixItems/1"
			})
			attest<boolean>(T).type.toString.snap("boolean")
		})

		it("to the empty key of the root", () => {
			const T = inferred({ "": { type: "number" }, $ref: "#/" })
			attest<number>(T).type.toString.snap("number")
		})

		it("to a numeric property key", () => {
			const T = inferred({
				type: "object",
				properties: {
					0: { type: "string" },
					b: { $ref: "#/properties/0" }
				},
				required: ["b"]
			})
			attest<{ 0?: string; b: string }>(T).type.toString.snap(
				"{ 0?: string; b: string }"
			)
		})

		it("to a value that isn't a schema", () => {
			attest<
				{ a: unknown; b: unknown; c: unknown; d: unknown; e?: "x" },
				jsonSchema.infer<{
					type: "object"
					properties: {
						a: { $ref: "#/required/0" }
						b: { $ref: "#/type" }
						c: { $ref: "#/properties/e/enum/0" }
						d: { $ref: "#/properties/e/enum/length" }
						e: { enum: ["x"] }
					}
					required: ["a", "b", "c", "d"]
				}>
			>()
		})

		it("to an array instead of an element", () => {
			attest<
				{ a: unknown; b?: string },
				jsonSchema.infer<{
					type: "object"
					properties: {
						a: { $ref: "#/properties/b/allOf" }
						b: { allOf: [{ type: "string" }] }
					}
					required: ["a"]
				}>
			>()
		})

		it("a ref to a definitions record infers unknown", () => {
			attest<unknown>(
				{} as jsonSchema.infer<{
					$defs: { a: { type: "string" } }
					$ref: "#/$defs"
				}>
			)
		})
	})

	describe("escapes", () => {
		it("~1 decodes to /", () => {
			const T = inferred({
				$defs: { "a/b": { type: "string" } },
				$ref: "#/$defs/a~1b"
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("~0 decodes to ~", () => {
			const T = inferred({
				$defs: { "a~b": { type: "number" } },
				$ref: "#/$defs/a~0b"
			})
			attest<number>(T).type.toString.snap("number")
		})

		it("multiple escapes in one segment", () => {
			const T = inferred({
				$defs: { "a/b/c~d": { type: "boolean" } },
				$ref: "#/$defs/a~1b~1c~0d"
			})
			attest<boolean>(T).type.toString.snap("boolean")
		})

		it("~01 decodes to ~1, not /", () => {
			const T = inferred({
				$defs: { "a~1b": { type: "string" }, "a/b": { type: "number" } },
				$ref: "#/$defs/a~01b"
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("escapes in deeper pointer segments", () => {
			const T = inferred({
				$defs: {
					"a/b": {
						type: "object",
						properties: { "c~d": { type: "null" } }
					}
				},
				$ref: "#/$defs/a~1b/properties/c~0d"
			})
			attest<null>(T).type.toString.snap("null")
		})

		it("an unescaped / is a path separator", () => {
			attest(() =>
				inferred({
					$defs: { "a/b": { type: "string" } },
					// @ts-expect-error
					$ref: "#/$defs/a/b"
				})
			).type.errors.snap(
				'Type \'"#/$defs/a/b"\' is not assignable to type \'"#" | "#/$defs/a~1b"\'. Did you mean \'"#/$defs/a~1b"\'?'
			)
		})

		it("an escaped key doesn't match a literal ~1 in the key", () => {
			attest(() =>
				inferred({
					$defs: { "a~1b": { type: "string" } },
					// @ts-expect-error
					$ref: "#/$defs/a~1b"
				})
			).type.errors.snap(
				'Type \'"#/$defs/a~1b"\' is not assignable to type \'"#" | "#/$defs/a~01b"\'. Did you mean \'"#/$defs/a~01b"\'?'
			)
		})

		it("an unescaped / reaches a nested def", () => {
			const T = inferred({
				$defs: {
					a: { $defs: { b: { type: "number" } } },
					"a/b": { type: "string" }
				},
				$ref: "#/$defs/a/$defs/b"
			})
			attest<number>(T).type.toString.snap("number")
		})

		it("a ref with sixty ~1 escapes", () => {
			type Long = jsonSchema.infer<{
				$defs: {
					"a////////////////////////////////////////////////////////////": {
						type: "string"
					}
				}
				$ref: "#/$defs/a~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1"
			}>
			attest<string>({} as Long).type.toString.snap("string")
		})

		it("suggestions escape sixty of each special character", () => {
			attest(() =>
				inferred({
					$defs: {
						"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~": {
							type: "string"
						}
					},
					// @ts-expect-error
					$ref: "#/$defs/x"
				})
			).type.errors.snap(
				'Type \'"#/$defs/x"\' is not assignable to type \'"#" | "#/$defs/~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0"\'.'
			)
			attest(() =>
				inferred({
					$defs: {
						"////////////////////////////////////////////////////////////": {
							type: "string"
						}
					},
					// @ts-expect-error
					$ref: "#/$defs/x"
				})
			).type.errors.snap(
				'Type \'"#/$defs/x"\' is not assignable to type \'"#" | "#/$defs/~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1~1"\'.'
			)
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
	})

	describe("percent encoding", () => {
		it("a percent-encoded ref isn't decoded", () => {
			const T = inferred({
				$defs: { "a b": { type: "string" } },
				$ref: "#/$defs/a%20b"
			})
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("a percent-encoded name that is also a key isn't read literally", () => {
			const T = inferred({
				$defs: { "a%20b": { type: "string" }, "a b": { type: "number" } },
				$ref: "#/$defs/a%20b"
			})
			attest<unknown>(T).type.toString.snap("unknown")
		})
	})

	describe("boolean targets", () => {
		it("true", () => {
			const T = inferred({ $defs: { t: true }, $ref: "#/$defs/t" })
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("false", () => {
			const T = inferred({ $defs: { f: false }, $ref: "#/$defs/f" })
			attest<never>(T).type.toString.snap("never")
		})

		it("as a boolean property schema", () => {
			const T = inferred({
				type: "object",
				properties: { a: false, b: { $ref: "#/properties/a" } }
			})
			attest<{ a?: never; b?: never }>(T).type.toString.snap(
				"{ a?: never; b?: never }"
			)
		})

		it("false with a sibling type", () => {
			const T = inferred({
				$defs: { f: false },
				$ref: "#/$defs/f",
				type: "string"
			})
			attest<never>(T).type.toString.snap("never")
		})

		it("false as additionalProperties", () => {
			// a ref to false is inferred like any other additionalProperties schema,
			// so unlike a literal false, it doesn't close the object
			const T = inferred({
				$defs: { f: false },
				type: "object",
				properties: { a: { type: "string" } },
				additionalProperties: { $ref: "#/$defs/f" }
			})
			attest<{ [k: string]: string; a?: string }>(T).type.toString.snap(
				"{ [x: string]: string; a?: string }"
			)
		})

		it("an additionalProperties ref beside $id resolves against its resource", () => {
			attest(
				{} as jsonSchema.infer<{
					$defs: { f: false }
					type: "object"
					additionalProperties: {
						$id: "https://example.com/other"
						$defs: { f: true }
						$ref: "#/$defs/f"
					}
				}>
			).type.toString.snap("{ [x: string]: unknown }")
		})
	})

	describe("chains", () => {
		it("two hops", () => {
			const T = inferred({
				$defs: {
					a: { $ref: "#/$defs/b" },
					b: { type: "string" }
				},
				$ref: "#/$defs/a"
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("three hops across $defs, definitions and a pointer", () => {
			const T = inferred({
				$defs: { a: { $ref: "#/definitions/b" } },
				definitions: { b: { $ref: "#/properties/c" } },
				type: "object",
				properties: {
					c: { type: "number" },
					d: { $ref: "#/$defs/a" }
				},
				required: ["d"]
			})
			attest<{ c?: number; d: number }>(T).type.toString.snap(
				"{ c?: number; d: number }"
			)
		})

		it("siblings accumulate along the chain", () => {
			const T = inferred({
				$defs: {
					a: { $ref: "#/$defs/b", type: "string" },
					b: { $ref: "#/$defs/c", nullable: true },
					c: { enum: ["x", 1, null] }
				},
				$ref: "#/$defs/a"
			})
			attest<"x">(T).type.toString.snap('"x"')
		})

		it("ending at a boolean schema", () => {
			const T = inferred({
				$defs: { a: { $ref: "#/$defs/b" }, b: false },
				type: "object",
				properties: { x: { $ref: "#/$defs/a" } }
			})
			attest<{ x?: never }>(T).type.toString.snap("{ x?: never }")
		})

		it("an unresolvable link is reported where it occurs", () => {
			attest(() =>
				inferred({
					$defs: {
						a: { $ref: "#/$defs/b" },
						// @ts-expect-error
						b: { $ref: "#/$defs/c" }
					},
					$ref: "#/$defs/a"
				})
			).type.errors(`'"#/$defs/c"' is not assignable`)
		})
	})

	describe("shallow cycles", () => {
		it("def referencing itself", () => {
			const T = inferred({
				$defs: { a: { $ref: "#/$defs/a" } },
				$ref: "#/$defs/a"
			})
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("cycle entered from a property", () => {
			const T = inferred({
				$defs: {
					a: { $ref: "#/$defs/b" },
					b: { $ref: "#/$defs/a" }
				},
				type: "object",
				properties: { x: { $ref: "#/$defs/a" } },
				required: ["x"]
			})
			attest<{ x: unknown }>(T).type.toString.snap("{ x: unknown }")
		})

		it("properties referencing each other", () => {
			const T = inferred({
				type: "object",
				properties: {
					a: { $ref: "#/properties/b" },
					b: { $ref: "#/properties/a" }
				}
			})
			attest<{ a?: unknown; b?: unknown }>(T).type.toString.snap(
				"{ a?: unknown; b?: unknown }"
			)
		})

		it("cycle with a sibling type", () => {
			const T = inferred({
				$defs: { a: { $ref: "#/$defs/a", type: "string" } },
				$ref: "#/$defs/a"
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("through not", () => {
			const T = inferred({ type: "string", not: { $ref: "#" } })
			attest<string>(T).type.toString.snap("string")
		})

		it("through anyOf", () => {
			const schema = { anyOf: [{ $ref: "#" }, { type: "string" }] } as const
			attest(() => inferred(schema)).type.errors(/^$/)
			attest<unknown>(inferred(schema)).type.toString.snap("unknown")
		})

		it("through allOf", () => {
			const schema = { allOf: [{ $ref: "#" }, { type: "string" }] } as const
			attest(() => inferred(schema)).type.errors(/^$/)
			attest<string>(inferred(schema)).type.toString.snap("string")
		})

		it("through then and else", () => {
			const schema = {
				if: { type: "string" },
				then: { $ref: "#" },
				else: { type: "number" }
			} as const
			attest(() => inferred(schema)).type.errors(/^$/)
			attest<unknown>(inferred(schema)).type.toString.snap("unknown")
		})
	})

	describe("recursion", () => {
		it("linked list through anyOf with null", () => {
			type List = { value: string; next: List | null }
			const T = inferred({
				type: "object",
				properties: {
					value: { type: "string" },
					next: { anyOf: [{ $ref: "#" }, { type: "null" }] }
				},
				required: ["value", "next"]
			})
			attest<List>(T).type.toString.snap(
				"{ value: string; next: cyclic | null }"
			)
			attest<string | undefined>(T.next?.next?.next?.next?.next?.next?.value)
		})

		it("linked list through nullable", () => {
			type List = { value?: number; next?: List | null }
			const T = inferred({
				type: "object",
				properties: {
					value: { type: "number" },
					next: { $ref: "#", nullable: true }
				}
			})
			attest<List>(T).type.toString.snap(
				"{ value?: number; next?: cyclic | null }"
			)
			attest<number | undefined>(T.next?.next?.next?.next?.next?.value)
		})

		it("mutual recursion between two defs", () => {
			type Person = { name: string; pets?: Pet[] }
			type Pet = { name: string; owner: Person }
			const T = inferred({
				$defs: {
					person: {
						type: "object",
						properties: {
							name: { type: "string" },
							pets: { type: "array", items: { $ref: "#/$defs/pet" } }
						},
						required: ["name"]
					},
					pet: {
						type: "object",
						properties: {
							name: { type: "string" },
							owner: { $ref: "#/$defs/person" }
						},
						required: ["name", "owner"]
					}
				},
				$ref: "#/$defs/person"
			})
			attest<Person>(T).type.toString.snap(`{
	name: string
	pets?: { name: string; owner: cyclic }[]
}`)
			attest<string | undefined>(
				T.pets?.[0].owner.pets?.[0].owner.pets?.[0].owner.name
			)
		})

		it("tree as a oneOf of leaf and branch", () => {
			type Leaf = { value: number }
			type Branch = { children: Tree[] }
			type Tree = Leaf | Branch
			const T = inferred({
				$defs: {
					leaf: {
						type: "object",
						properties: { value: { type: "number" } },
						required: ["value"]
					},
					branch: {
						type: "object",
						properties: {
							children: { type: "array", items: { $ref: "#/$defs/tree" } }
						},
						required: ["children"]
					},
					tree: {
						oneOf: [{ $ref: "#/$defs/leaf" }, { $ref: "#/$defs/branch" }]
					}
				},
				$ref: "#/$defs/tree"
			})
			attest<Tree>(T).type.toString.snap(`	| { value: number }
	| { children: ({ value: number } | cyclic)[] }`)
		})

		it("expression ast through anyOf", () => {
			type Expr = number | { op: "+" | "-"; left: Expr; right: Expr }
			const T = inferred({
				anyOf: [
					{ type: "number" },
					{
						type: "object",
						properties: {
							op: { enum: ["+", "-"] },
							left: { $ref: "#" },
							right: { $ref: "#" }
						},
						required: ["op", "left", "right"]
					}
				]
			})
			attest<Expr>(T).type.toString.snap(`	| number
	| {
			op: "+" | "-"
			left: number | cyclic
			right: number | cyclic
	  }`)
		})

		it("json value via a type list", () => {
			type Json =
				| string
				| number
				| boolean
				| null
				| Json[]
				| { [k: string]: Json }
			const T = inferred({
				type: ["string", "number", "boolean", "null", "array", "object"],
				items: { $ref: "#" },
				additionalProperties: { $ref: "#" }
			})
			attest<Json>(T)
		})

		it("through allOf extending the root", () => {
			type Node = { id: string; children?: Node[] }
			const T = inferred({
				$defs: {
					base: {
						type: "object",
						properties: { id: { type: "string" } },
						required: ["id"]
					}
				},
				allOf: [
					{ $ref: "#/$defs/base" },
					{
						properties: {
							children: { type: "array", items: { $ref: "#" } }
						}
					}
				]
			})
			attest<Node>(T).type.toString.snap("{ id: string; children?: cyclic[] }")
			attest<string | undefined>(
				T.children?.[0].children?.[0].children?.[0].children?.[0].children?.[0]
					.id
			)
		})

		it("through allOf with properties and required split", () => {
			type Node = { next: Node }
			const schema = {
				allOf: [
					{ type: "object", properties: { next: { $ref: "#" } } },
					{ required: ["next"] }
				]
			} as const
			attest(() => inferred(schema)).type.errors(/^$/)
			attest<Node>(inferred(schema)).type.toString.snap("{ next: cyclic }")
		})

		it("through a ref with a sibling type", () => {
			type Node = { next?: Node }
			const T = inferred({
				$defs: {
					node: {
						type: "object",
						properties: { next: { $ref: "#/$defs/node", type: "object" } }
					}
				},
				$ref: "#/$defs/node"
			})
			attest<Node>(T).type.toString.snap("{ next?: cyclic }")
			attest<Node | undefined>(T.next?.next?.next?.next?.next)
		})

		it("through a ref with a sibling required", () => {
			type Required = { v: string; next?: Required }
			type Node = { v?: string; next?: Required }
			const T = inferred({
				$defs: {
					node: {
						type: "object",
						properties: {
							v: { type: "string" },
							next: { $ref: "#/$defs/node", required: ["v"] }
						}
					}
				},
				$ref: "#/$defs/node"
			})
			attest<Node>(T)
			attest<
				string,
				NonNullable<NonNullable<(typeof T)["next"]>["next"]>["v"]
			>()
		})

		// TS can't defer a tuple, so the recursive element is unknown after one expansion
		it("through prefixItems", () => {
			const schema = {
				type: "array",
				prefixItems: [{ type: "number" }, { $ref: "#" }],
				minItems: 1,
				items: false
			} as const
			attest(() => inferred(schema)).type.errors(/^$/)
			attest<[number, [number, unknown?]?]>(
				inferred(schema)
			).type.toString.snap("[number, [number, unknown?]?]")
		})

		it("through a tuple's rest items", () => {
			const schema = {
				type: "array",
				prefixItems: [{ type: "string" }],
				minItems: 1,
				items: { $ref: "#" }
			} as const
			attest(() => inferred(schema)).type.errors(/^$/)
			attest<[string, ...[string, ...unknown[]][]]>(
				inferred(schema)
			).type.toString.snap("[string, ...[string, ...unknown[]][]]")
		})

		it("through additionalItems", () => {
			const schema = {
				type: "array",
				items: [{ type: "string" }],
				minItems: 1,
				additionalItems: { $ref: "#" }
			} as const
			attest(() => inferred(schema)).type.errors(/^$/)
			attest<[string, ...[string, ...unknown[]][]]>(
				inferred(schema)
			).type.toString.snap("[string, ...[string, ...unknown[]][]]")
		})

		it("productively through then and else", () => {
			type Node = { a?: Node } | string
			const T = inferred({
				if: { type: "object" },
				then: { type: "object", properties: { a: { $ref: "#" } } },
				else: { type: "string" }
			})
			attest<Node>(T)
		})

		it("through items of a tuple element", () => {
			type Rows = [string, Rows[]?]
			attest<Rows>(
				inferred({
					type: "array",
					prefixItems: [
						{ type: "string" },
						{ type: "array", items: { $ref: "#" } }
					],
					minItems: 1,
					items: false
				})
			)
		})

		it("through a pointer to the enclosing object", () => {
			type Inner = { again?: Inner }
			const T = inferred({
				type: "object",
				properties: {
					inner: {
						type: "object",
						properties: { again: { $ref: "#/properties/inner" } }
					}
				},
				required: ["inner"]
			})
			attest<{ inner: Inner }>(T).type.toString.snap(
				"{ inner: { again?: cyclic } }"
			)
		})
	})

	describe("recursion through intersections", () => {
		it("recursive key in the base and an anyOf branch", () => {
			const schema = {
				type: "object",
				properties: { next: { $ref: "#" }, v: { type: "number" } },
				anyOf: [{ properties: { next: { $ref: "#" } } }, { required: ["v"] }]
			} as const
			type T = jsonSchema.infer<typeof schema>
			const list: T = {
				v: 1,
				next: {
					v: 1,
					next: {
						v: 1,
						next: {
							v: 1,
							next: {
								v: 1,
								next: {
									v: 1,
									next: {
										v: 1,
										next: {
											v: 1,
											next: {
												v: 1,
												next: {
													v: 1,
													next: {
														v: 1,
														next: {
															v: 1,
															next: {
																v: 1,
																next: {
																	v: 1,
																	next: {
																		v: 1,
																		next: {
																			v: 1,
																			next: {
																				v: 1,
																				next: {
																					v: 1,
																					next: {
																						v: 1,
																						next: { v: 1, next: { v: 1 } }
																					}
																				}
																			}
																		}
																	}
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
			attest<number | undefined>(list.next?.next?.next?.v)
			attest({} as T).type.toString(/^[^<]*$/)
			attest(() => {
				// @ts-expect-error
				const invalid: T = { next: { next: { next: { v: "x" } } } }
				return invalid
			}).type.errors(/not assignable to type 'number'/)
		})

		it("recursive key in the base and then", () => {
			const schema = {
				type: "object",
				properties: { next: { $ref: "#" } },
				if: { properties: { v: { const: 1 } } },
				then: {
					properties: { v: { type: "number" }, next: { $ref: "#" } }
				},
				else: { properties: { v: { type: "number" } } }
			} as const
			type T = jsonSchema.infer<typeof schema>
			const list: T = {
				v: 1,
				next: {
					v: 1,
					next: {
						v: 1,
						next: {
							v: 1,
							next: {
								v: 1,
								next: {
									v: 1,
									next: {
										v: 1,
										next: {
											v: 1,
											next: {
												v: 1,
												next: {
													v: 1,
													next: {
														v: 1,
														next: {
															v: 1,
															next: {
																v: 1,
																next: {
																	v: 1,
																	next: {
																		v: 1,
																		next: {
																			v: 1,
																			next: {
																				v: 1,
																				next: {
																					v: 1,
																					next: {
																						v: 1,
																						next: { v: 1, next: { v: 1 } }
																					}
																				}
																			}
																		}
																	}
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
			attest<number | undefined>(list.next?.next?.next?.v)
			attest({} as T).type.toString(/^[^<]*$/)
			attest(() => {
				// @ts-expect-error
				const invalid: T = { next: { next: { next: { v: "x" } } } }
				return invalid
			}).type.errors(/not assignable to type 'number'/)
		})

		it("recursive key in two allOf branches", () => {
			const schema = {
				type: "object",
				allOf: [
					{ properties: { next: { $ref: "#" } } },
					{ properties: { next: { $ref: "#" }, v: { type: "number" } } }
				]
			} as const
			type T = jsonSchema.infer<typeof schema>
			const list: T = {
				v: 1,
				next: {
					v: 1,
					next: {
						v: 1,
						next: {
							v: 1,
							next: {
								v: 1,
								next: {
									v: 1,
									next: {
										v: 1,
										next: {
											v: 1,
											next: {
												v: 1,
												next: {
													v: 1,
													next: {
														v: 1,
														next: {
															v: 1,
															next: {
																v: 1,
																next: {
																	v: 1,
																	next: {
																		v: 1,
																		next: {
																			v: 1,
																			next: {
																				v: 1,
																				next: {
																					v: 1,
																					next: {
																						v: 1,
																						next: { v: 1, next: { v: 1 } }
																					}
																				}
																			}
																		}
																	}
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
			attest<number | undefined>(list.next?.next?.next?.next?.v)
		})

		it("recursive key in a ref target and its sibling properties", () => {
			const schema = {
				$defs: {
					base: {
						type: "object",
						properties: { next: { $ref: "#" }, v: { type: "number" } }
					}
				},
				$ref: "#/$defs/base",
				properties: { next: { $ref: "#" } }
			} as const
			type T = jsonSchema.infer<typeof schema>
			const list: T = {
				v: 1,
				next: {
					v: 1,
					next: {
						v: 1,
						next: {
							v: 1,
							next: {
								v: 1,
								next: {
									v: 1,
									next: {
										v: 1,
										next: {
											v: 1,
											next: {
												v: 1,
												next: {
													v: 1,
													next: {
														v: 1,
														next: {
															v: 1,
															next: {
																v: 1,
																next: {
																	v: 1,
																	next: {
																		v: 1,
																		next: {
																			v: 1,
																			next: {
																				v: 1,
																				next: {
																					v: 1,
																					next: {
																						v: 1,
																						next: { v: 1, next: { v: 1 } }
																					}
																				}
																			}
																		}
																	}
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
			attest<number | undefined>(list.next?.next?.next?.next?.v)
		})

		it("recursive items key in the base and an anyOf branch", () => {
			const schema = {
				type: "object",
				properties: { kids: { type: "array", items: { $ref: "#" } } },
				anyOf: [
					{ properties: { kids: { type: "array", items: { $ref: "#" } } } },
					{ required: ["leaf"] }
				]
			} as const
			type T = jsonSchema.infer<typeof schema>
			const tree: T = {
				kids: [{ kids: [{ kids: [{ kids: [{ kids: [] }] }] }] }]
			}
			attest(tree)
		})
	})

	describe("twenty levels of recursion", () => {
		it("through an anyOf of a string and an array of the root", () => {
			type T = jsonSchema.infer<{
				anyOf: [{ type: "string" }, { type: "array"; items: { $ref: "#" } }]
			}>
			attest(() => {
				const t: T = [[[[[[[[[[[[[[[[[[[["s"]]]]]]]]]]]]]]]]]]]]
				return t
			}).type.errors.is("")
			attest(() => {
				// @ts-expect-error
				const bad: T = [[[[[[[[[[[[[[[[[[[[1]]]]]]]]]]]]]]]]]]]]
				return bad
			}).type.errors.snap(
				"Type 'number' is not assignable to type 'string | (string | (string | (string | (string | (string | (string | (string | (string | (string | (string | (string | ...)[])[])[])[])[])[])[])[])[])[])[]'."
			)
		})

		it("a draft-07 discriminated AST with $ref description siblings", () => {
			type Ast = jsonSchema.infer<{
				$schema: "http://json-schema.org/draft-07/schema#"
				definitions: {
					expr: {
						oneOf: [
							{ $ref: "#/definitions/num"; description: "n" },
							{ $ref: "#/definitions/neg"; description: "-" },
							{ $ref: "#/definitions/add" }
						]
					}
					num: {
						type: "object"
						properties: { kind: { const: "num" }; value: { type: "number" } }
						required: ["kind", "value"]
						additionalProperties: false
					}
					neg: {
						type: "object"
						properties: {
							kind: { const: "neg" }
							operand: { $ref: "#/definitions/expr"; description: "x" }
						}
						required: ["kind", "operand"]
						additionalProperties: false
					}
					add: {
						type: "object"
						properties: {
							kind: { const: "add" }
							l: { $ref: "#/definitions/expr" }
							r: { $ref: "#/definitions/expr" }
						}
						required: ["kind", "l", "r"]
						additionalProperties: false
					}
				}
				$ref: "#/definitions/expr"
			}>
			const ast: Ast = {
				kind: "neg",
				operand: {
					kind: "neg",
					operand: {
						kind: "neg",
						operand: {
							kind: "neg",
							operand: {
								kind: "neg",
								operand: {
									kind: "neg",
									operand: {
										kind: "neg",
										operand: {
											kind: "neg",
											operand: {
												kind: "neg",
												operand: {
													kind: "neg",
													operand: {
														kind: "neg",
														operand: {
															kind: "neg",
															operand: {
																kind: "neg",
																operand: {
																	kind: "neg",
																	operand: {
																		kind: "neg",
																		operand: {
																			kind: "neg",
																			operand: {
																				kind: "neg",
																				operand: {
																					kind: "neg",
																					operand: {
																						kind: "neg",
																						operand: {
																							kind: "neg",
																							operand: {
																								kind: "add",
																								l: { kind: "num", value: 1 },
																								r: { kind: "num", value: 2 }
																							}
																						}
																					}
																				}
																			}
																		}
																	}
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
			attest(ast)
			const bad: Ast = {
				kind: "neg",
				operand: {
					kind: "neg",
					operand: {
						kind: "neg",
						operand: {
							kind: "neg",
							operand: {
								kind: "neg",
								operand: {
									kind: "neg",
									operand: {
										kind: "neg",
										operand: {
											kind: "neg",
											operand: {
												kind: "neg",
												operand: {
													kind: "neg",
													operand: {
														kind: "neg",
														operand: {
															kind: "neg",
															operand: {
																kind: "neg",
																operand: {
																	kind: "neg",
																	operand: {
																		kind: "neg",
																		operand: {
																			kind: "neg",
																			operand: {
																				kind: "neg",
																				operand: {
																					kind: "neg",
																					operand: {
																						kind: "neg",
																						operand: {
																							kind: "neg",
																							operand: {
																								kind: "num",
																								// @ts-expect-error
																								value: "x"
																							}
																						}
																					}
																				}
																			}
																		}
																	}
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
			attest(bad)
		})

		it("a rule tree through allOf and if/then/else", () => {
			type Rule = jsonSchema.infer<{
				$defs: {
					rule: {
						type: "object"
						properties: { op: { enum: ["and", "leaf"] } }
						required: ["op"]
						allOf: [
							{
								if: { properties: { op: { const: "and" } } }
								then: {
									properties: {
										args: { type: "array"; items: { $ref: "#/$defs/rule" } }
									}
									required: ["args"]
								}
								else: {
									properties: { value: { type: "string" } }
									required: ["value"]
								}
							}
						]
					}
				}
				$ref: "#/$defs/rule"
			}>
			const r: Rule = {
				op: "and",
				args: [
					{
						op: "and",
						args: [
							{
								op: "and",
								args: [
									{
										op: "and",
										args: [
											{
												op: "and",
												args: [
													{
														op: "and",
														args: [
															{
																op: "and",
																args: [
																	{
																		op: "and",
																		args: [
																			{
																				op: "and",
																				args: [
																					{
																						op: "and",
																						args: [
																							{
																								op: "and",
																								args: [
																									{
																										op: "and",
																										args: [
																											{
																												op: "and",
																												args: [
																													{
																														op: "and",
																														args: [
																															{
																																op: "and",
																																args: [
																																	{
																																		op: "and",
																																		args: [
																																			{
																																				op: "and",
																																				args: [
																																					{
																																						op: "and",
																																						args: [
																																							{
																																								op: "and",
																																								args: [
																																									{
																																										op: "and",
																																										args: [
																																											{
																																												op: "leaf",
																																												value:
																																													"x"
																																											}
																																										]
																																									}
																																								]
																																							}
																																						]
																																					}
																																				]
																																			}
																																		]
																																	}
																																]
																															}
																														]
																													}
																												]
																											}
																										]
																									}
																								]
																							}
																						]
																					}
																				]
																			}
																		]
																	}
																]
															}
														]
													}
												]
											}
										]
									}
								]
							}
						]
					}
				]
			}
			attest(r)
			const bad: Rule = {
				op: "and",
				args: [
					{
						op: "and",
						args: [
							{
								op: "and",
								args: [
									{
										op: "and",
										args: [
											{
												op: "and",
												args: [
													{
														op: "and",
														args: [
															{
																op: "and",
																args: [
																	{
																		op: "and",
																		args: [
																			{
																				op: "and",
																				args: [
																					{
																						op: "and",
																						args: [
																							{
																								op: "and",
																								args: [
																									{
																										op: "and",
																										args: [
																											{
																												op: "and",
																												args: [
																													{
																														op: "and",
																														args: [
																															{
																																op: "and",
																																args: [
																																	{
																																		op: "and",
																																		args: [
																																			{
																																				op: "and",
																																				args: [
																																					{
																																						op: "and",
																																						args: [
																																							{
																																								op: "and",
																																								args: [
																																									{
																																										op: "and",
																																										args: [
																																											{
																																												op: "leaf",
																																												// @ts-expect-error
																																												value: 1
																																											}
																																										]
																																									}
																																								]
																																							}
																																						]
																																					}
																																				]
																																			}
																																		]
																																	}
																																]
																															}
																														]
																													}
																												]
																											}
																										]
																									}
																								]
																							}
																						]
																					}
																				]
																			}
																		]
																	}
																]
															}
														]
													}
												]
											}
										]
									}
								]
							}
						]
					}
				]
			}
			attest(bad)
		})
	})

	describe("eager ref graphs", () => {
		it("deep cycle across anyOf, allOf and oneOf", () => {
			const T = inferred({
				$defs: {
					a: { anyOf: [{ $ref: "#/$defs/b" }, { type: "null" }] },
					b: { allOf: [{ $ref: "#/$defs/c" }] },
					c: { oneOf: [{ $ref: "#/$defs/a" }, { type: "string" }] }
				},
				$ref: "#/$defs/a"
			})
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("cycle through dependentSchemas is ignored", () => {
			const T = inferred({
				type: "object",
				dependentSchemas: { a: { $ref: "#" } },
				properties: { a: { type: "string" } }
			})
			attest<{ a?: string }>(T).type.toString.snap("{ a?: string }")
		})

		it("sixty-hop chain", () => {
			const T = inferred({
				$defs: {
					d0: { $ref: "#/$defs/d1" },
					d1: { $ref: "#/$defs/d2" },
					d2: { $ref: "#/$defs/d3" },
					d3: { $ref: "#/$defs/d4" },
					d4: { $ref: "#/$defs/d5" },
					d5: { $ref: "#/$defs/d6" },
					d6: { $ref: "#/$defs/d7" },
					d7: { $ref: "#/$defs/d8" },
					d8: { $ref: "#/$defs/d9" },
					d9: { $ref: "#/$defs/d10" },
					d10: { $ref: "#/$defs/d11" },
					d11: { $ref: "#/$defs/d12" },
					d12: { $ref: "#/$defs/d13" },
					d13: { $ref: "#/$defs/d14" },
					d14: { $ref: "#/$defs/d15" },
					d15: { $ref: "#/$defs/d16" },
					d16: { $ref: "#/$defs/d17" },
					d17: { $ref: "#/$defs/d18" },
					d18: { $ref: "#/$defs/d19" },
					d19: { $ref: "#/$defs/d20" },
					d20: { $ref: "#/$defs/d21" },
					d21: { $ref: "#/$defs/d22" },
					d22: { $ref: "#/$defs/d23" },
					d23: { $ref: "#/$defs/d24" },
					d24: { $ref: "#/$defs/d25" },
					d25: { $ref: "#/$defs/d26" },
					d26: { $ref: "#/$defs/d27" },
					d27: { $ref: "#/$defs/d28" },
					d28: { $ref: "#/$defs/d29" },
					d29: { $ref: "#/$defs/d30" },
					d30: { $ref: "#/$defs/d31" },
					d31: { $ref: "#/$defs/d32" },
					d32: { $ref: "#/$defs/d33" },
					d33: { $ref: "#/$defs/d34" },
					d34: { $ref: "#/$defs/d35" },
					d35: { $ref: "#/$defs/d36" },
					d36: { $ref: "#/$defs/d37" },
					d37: { $ref: "#/$defs/d38" },
					d38: { $ref: "#/$defs/d39" },
					d39: { $ref: "#/$defs/d40" },
					d40: { $ref: "#/$defs/d41" },
					d41: { $ref: "#/$defs/d42" },
					d42: { $ref: "#/$defs/d43" },
					d43: { $ref: "#/$defs/d44" },
					d44: { $ref: "#/$defs/d45" },
					d45: { $ref: "#/$defs/d46" },
					d46: { $ref: "#/$defs/d47" },
					d47: { $ref: "#/$defs/d48" },
					d48: { $ref: "#/$defs/d49" },
					d49: { $ref: "#/$defs/d50" },
					d50: { $ref: "#/$defs/d51" },
					d51: { $ref: "#/$defs/d52" },
					d52: { $ref: "#/$defs/d53" },
					d53: { $ref: "#/$defs/d54" },
					d54: { $ref: "#/$defs/d55" },
					d55: { $ref: "#/$defs/d56" },
					d56: { $ref: "#/$defs/d57" },
					d57: { $ref: "#/$defs/d58" },
					d58: { $ref: "#/$defs/d59" },
					d59: { $ref: "#/$defs/d60" },
					d60: { type: "string" }
				},
				$ref: "#/$defs/d0"
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("forty-hop chain with sibling properties", () => {
			const T = inferred({
				$defs: {
					d0: { $ref: "#/$defs/d1", properties: { a: { type: "number" } } },
					d1: { $ref: "#/$defs/d2", properties: { a: { type: "number" } } },
					d2: { $ref: "#/$defs/d3", properties: { a: { type: "number" } } },
					d3: { $ref: "#/$defs/d4", properties: { a: { type: "number" } } },
					d4: { $ref: "#/$defs/d5", properties: { a: { type: "number" } } },
					d5: { $ref: "#/$defs/d6", properties: { a: { type: "number" } } },
					d6: { $ref: "#/$defs/d7", properties: { a: { type: "number" } } },
					d7: { $ref: "#/$defs/d8", properties: { a: { type: "number" } } },
					d8: { $ref: "#/$defs/d9", properties: { a: { type: "number" } } },
					d9: { $ref: "#/$defs/d10", properties: { a: { type: "number" } } },
					d10: { $ref: "#/$defs/d11", properties: { a: { type: "number" } } },
					d11: { $ref: "#/$defs/d12", properties: { a: { type: "number" } } },
					d12: { $ref: "#/$defs/d13", properties: { a: { type: "number" } } },
					d13: { $ref: "#/$defs/d14", properties: { a: { type: "number" } } },
					d14: { $ref: "#/$defs/d15", properties: { a: { type: "number" } } },
					d15: { $ref: "#/$defs/d16", properties: { a: { type: "number" } } },
					d16: { $ref: "#/$defs/d17", properties: { a: { type: "number" } } },
					d17: { $ref: "#/$defs/d18", properties: { a: { type: "number" } } },
					d18: { $ref: "#/$defs/d19", properties: { a: { type: "number" } } },
					d19: { $ref: "#/$defs/d20", properties: { a: { type: "number" } } },
					d20: { $ref: "#/$defs/d21", properties: { a: { type: "number" } } },
					d21: { $ref: "#/$defs/d22", properties: { a: { type: "number" } } },
					d22: { $ref: "#/$defs/d23", properties: { a: { type: "number" } } },
					d23: { $ref: "#/$defs/d24", properties: { a: { type: "number" } } },
					d24: { $ref: "#/$defs/d25", properties: { a: { type: "number" } } },
					d25: { $ref: "#/$defs/d26", properties: { a: { type: "number" } } },
					d26: { $ref: "#/$defs/d27", properties: { a: { type: "number" } } },
					d27: { $ref: "#/$defs/d28", properties: { a: { type: "number" } } },
					d28: { $ref: "#/$defs/d29", properties: { a: { type: "number" } } },
					d29: { $ref: "#/$defs/d30", properties: { a: { type: "number" } } },
					d30: { $ref: "#/$defs/d31", properties: { a: { type: "number" } } },
					d31: { $ref: "#/$defs/d32", properties: { a: { type: "number" } } },
					d32: { $ref: "#/$defs/d33", properties: { a: { type: "number" } } },
					d33: { $ref: "#/$defs/d34", properties: { a: { type: "number" } } },
					d34: { $ref: "#/$defs/d35", properties: { a: { type: "number" } } },
					d35: { $ref: "#/$defs/d36", properties: { a: { type: "number" } } },
					d36: { $ref: "#/$defs/d37", properties: { a: { type: "number" } } },
					d37: { $ref: "#/$defs/d38", properties: { a: { type: "number" } } },
					d38: { $ref: "#/$defs/d39", properties: { a: { type: "number" } } },
					d39: { $ref: "#/$defs/d40", properties: { a: { type: "number" } } },
					d40: { type: "string" }
				},
				$ref: "#/$defs/d0"
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("acyclic diamond chain of anyOf refs", () => {
			const dag = {
				$defs: {
					d0: { anyOf: [{ $ref: "#/$defs/d1" }, { $ref: "#/$defs/d2" }] },
					d1: { anyOf: [{ $ref: "#/$defs/d2" }, { $ref: "#/$defs/d3" }] },
					d2: { anyOf: [{ $ref: "#/$defs/d3" }, { $ref: "#/$defs/d4" }] },
					d3: { anyOf: [{ $ref: "#/$defs/d4" }, { $ref: "#/$defs/d5" }] },
					d4: { anyOf: [{ $ref: "#/$defs/d5" }, { $ref: "#/$defs/d6" }] },
					d5: { anyOf: [{ $ref: "#/$defs/d6" }, { $ref: "#/$defs/d7" }] },
					d6: { anyOf: [{ $ref: "#/$defs/d7" }, { $ref: "#/$defs/d8" }] },
					d7: { anyOf: [{ $ref: "#/$defs/d8" }, { $ref: "#/$defs/d9" }] },
					d8: { anyOf: [{ $ref: "#/$defs/d9" }, { $ref: "#/$defs/d10" }] },
					d9: { anyOf: [{ $ref: "#/$defs/d10" }, { $ref: "#/$defs/d11" }] },
					d10: { anyOf: [{ $ref: "#/$defs/d11" }, { $ref: "#/$defs/d12" }] },
					d11: { anyOf: [{ $ref: "#/$defs/d12" }, { $ref: "#/$defs/d13" }] },
					d12: { anyOf: [{ $ref: "#/$defs/d13" }, { $ref: "#/$defs/d14" }] },
					d13: { anyOf: [{ $ref: "#/$defs/d14" }, { $ref: "#/$defs/d15" }] },
					d14: { anyOf: [{ $ref: "#/$defs/d15" }, { $ref: "#/$defs/d16" }] },
					d15: { anyOf: [{ $ref: "#/$defs/d16" }, { $ref: "#/$defs/d17" }] },
					d16: { anyOf: [{ $ref: "#/$defs/d17" }, { $ref: "#/$defs/d18" }] },
					d17: { anyOf: [{ $ref: "#/$defs/d18" }, { $ref: "#/$defs/d19" }] },
					d18: { anyOf: [{ $ref: "#/$defs/d19" }, { $ref: "#/$defs/d20" }] },
					d19: { anyOf: [{ $ref: "#/$defs/d20" }, { $ref: "#/$defs/d21" }] },
					d20: { anyOf: [{ $ref: "#/$defs/d21" }, { $ref: "#/$defs/d22" }] },
					d21: { anyOf: [{ $ref: "#/$defs/d22" }, { $ref: "#/$defs/d23" }] },
					d22: { anyOf: [{ $ref: "#/$defs/d23" }, { $ref: "#/$defs/d24" }] },
					d23: { type: "string" },
					d24: { type: "string" }
				},
				$ref: "#/$defs/d0"
			} as const
			type Dag = jsonSchema.infer<typeof dag>
			attest({} as Dag).type.toString.snap("string")
		})

		it("cycle through a diamond chain of allOf refs", () => {
			type Cyclic = jsonSchema.infer<{
				$defs: {
					d0: { allOf: [{ $ref: "#/$defs/d1" }, { $ref: "#/$defs/d2" }] }
					d1: { allOf: [{ $ref: "#/$defs/d2" }, { $ref: "#/$defs/d3" }] }
					d2: { allOf: [{ $ref: "#/$defs/d3" }, { $ref: "#/$defs/d4" }] }
					d3: { allOf: [{ $ref: "#/$defs/d4" }, { $ref: "#/$defs/d5" }] }
					d4: { allOf: [{ $ref: "#/$defs/d5" }, { $ref: "#/$defs/d6" }] }
					d5: { allOf: [{ $ref: "#/$defs/d6" }, { $ref: "#/$defs/d7" }] }
					d6: { allOf: [{ $ref: "#/$defs/d7" }, { $ref: "#/$defs/d8" }] }
					d7: { allOf: [{ $ref: "#/$defs/d8" }, { $ref: "#/$defs/d9" }] }
					d8: { allOf: [{ $ref: "#/$defs/d9" }, { $ref: "#/$defs/d10" }] }
					d9: { allOf: [{ $ref: "#/$defs/d10" }, { $ref: "#/$defs/d11" }] }
					d10: { allOf: [{ $ref: "#/$defs/d11" }, { $ref: "#/$defs/d12" }] }
					d11: { allOf: [{ $ref: "#/$defs/d12" }, { $ref: "#/$defs/d13" }] }
					d12: { allOf: [{ $ref: "#/$defs/d13" }, { $ref: "#/$defs/d14" }] }
					d13: { allOf: [{ $ref: "#/$defs/d14" }, { $ref: "#/$defs/d15" }] }
					d14: { allOf: [{ $ref: "#/$defs/d15" }, { $ref: "#/$defs/d16" }] }
					d15: { allOf: [{ $ref: "#/$defs/d16" }, { $ref: "#/$defs/d17" }] }
					d16: { allOf: [{ $ref: "#/$defs/d17" }, { $ref: "#/$defs/d18" }] }
					d17: { allOf: [{ $ref: "#/$defs/d18" }, { $ref: "#/$defs/d19" }] }
					d18: { allOf: [{ $ref: "#/$defs/d19" }, { $ref: "#/$defs/d20" }] }
					d19: { allOf: [{ $ref: "#/$defs/d20" }, { $ref: "#/$defs/d21" }] }
					d20: { allOf: [{ $ref: "#/$defs/d21" }, { $ref: "#/$defs/d22" }] }
					d21: { allOf: [{ $ref: "#/$defs/d22" }, { $ref: "#/$defs/d23" }] }
					d22: { allOf: [{ $ref: "#/$defs/d23" }, { $ref: "#/$defs/d24" }] }
					d23: { type: "string" }
					d24: { allOf: [{ $ref: "#/$defs/d0" }, { type: "string" }] }
				}
				$ref: "#/$defs/d0"
			}>
			// a path is cut once it branches four times within a cycle, so the
			// leaves past that depth contribute unknown
			attest({} as Cyclic).type.toString.snap("unknown")
		})

		it("cycle through allOf keeps the other operands", () => {
			const T = inferred({
				$defs: {
					a: { allOf: [{ $ref: "#/$defs/b" }, { $ref: "#/$defs/c" }] },
					b: { allOf: [{ $ref: "#/$defs/a" }, { type: "string" }] },
					c: { allOf: [{ $ref: "#/$defs/b" }, { minLength: 1 }] }
				},
				$ref: "#/$defs/a"
			})
			attest<string>(T).type.toString.snap("string")
		})
	})

	describe("forty-hop chains through eager positions", () => {
		type hops<kind, n extends number, i extends 0[] = []> =
			i["length"] extends n ? { [_ in `d${n}`]: { type: "string" } }
			:	{
					[_ in `d${i["length"]}`]: hop<kind, `#/$defs/d${[...i, 0]["length"]}`>
				} & hops<kind, n, [...i, 0]>

		type hop<kind, ref extends string> =
			kind extends "prefixItems" ?
				{
					type: "array"
					prefixItems: [{ $ref: ref }]
					items: false
					minItems: 1
				}
			: kind extends "rest" ?
				{
					type: "array"
					prefixItems: [{ type: "null" }]
					items: { $ref: ref }
					minItems: 1
				}
			:	{ type: "object"; allOf: [{ $ref: ref }] }

		it("prefixItems", () => {
			type T = jsonSchema.infer<{
				$defs: hops<"prefixItems", 40>
				$ref: "#/$defs/d0"
			}>
			attest<
				string,
				T[0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0]
			>()
		})

		it("a tuple rest", () => {
			type T = jsonSchema.infer<{ $defs: hops<"rest", 40>; $ref: "#/$defs/d0" }>
			attest<null, T[0]>()
			attest<
				string,
				T[1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1][1]
			>()
		})

		it("allOf with a type sibling", () => {
			type T = jsonSchema.infer<{
				$defs: hops<"allOf", 40>
				$ref: "#/$defs/d0"
			}>
			attest({} as T).type.toString.snap("never")
		})
	})

	describe("siblings", () => {
		it("type narrows a union target", () => {
			const T = inferred({
				$defs: { u: { type: ["string", "number"] } },
				$ref: "#/$defs/u",
				type: "string"
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("required promotes target properties", () => {
			const T = inferred({
				$defs: {
					o: {
						type: "object",
						properties: { a: { type: "string" }, b: { type: "number" } }
					}
				},
				$ref: "#/$defs/o",
				required: ["a", "b"]
			})
			attest<{ a: string; b: number }>(T).type.toString.snap(
				"{ a: string; b: number }"
			)
		})

		it("properties merge with target properties", () => {
			const T = inferred({
				$defs: {
					o: {
						type: "object",
						properties: { a: { type: "string" } },
						required: ["a"]
					}
				},
				$ref: "#/$defs/o",
				properties: { b: { type: "number" } },
				required: ["b"]
			})
			attest<{ a: string; b: number }>(T).type.toString.snap(
				"{ b: number; a: string }"
			)
		})

		it("overlapping properties intersect", () => {
			const T = inferred({
				$defs: {
					o: {
						type: "object",
						properties: { kind: { type: "string" } },
						required: ["kind"]
					}
				},
				$ref: "#/$defs/o",
				properties: { kind: { const: "circle" } }
			})
			attest<{ kind: "circle" }>(T).type.toString.snap('{ kind: "circle" }')
		})

		it("items with an array target", () => {
			const T = inferred({
				$defs: { list: { type: "array" } },
				$ref: "#/$defs/list",
				items: { type: "number" }
			})
			attest<number[]>(T).type.toString.snap("number[]")
		})

		it("nullable", () => {
			const T = inferred({
				$defs: { s: { type: "string" } },
				$ref: "#/$defs/s",
				nullable: true
			})
			attest<string | null>(T).type.toString.snap("string | null")
		})

		it("nullable false", () => {
			const T = inferred({
				$defs: { s: { type: "string" } },
				$ref: "#/$defs/s",
				nullable: false
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("if/then without else is ignored", () => {
			const T = inferred({
				$defs: { s: { type: "string" } },
				$ref: "#/$defs/s",
				if: { minLength: 1 },
				then: { const: "a" }
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("disjoint type", () => {
			const T = inferred({
				$defs: { s: { type: "string" } },
				$ref: "#/$defs/s",
				type: "null"
			})
			attest<never>(T).type.toString.snap("never")
		})

		it("annotations don't affect inference", () => {
			const T = inferred({
				$defs: { s: { type: "string" } },
				$ref: "#/$defs/s",
				title: "S",
				description: "a string",
				default: "x",
				examples: ["y"],
				deprecated: true,
				readOnly: true,
				$comment: "c",
				"x-extension": { anything: 1 }
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("const", () => {
			const T = inferred({
				$defs: { s: { type: "string" } },
				$ref: "#/$defs/s",
				const: "a"
			})
			attest<"a">(T).type.toString.snap('"a"')
		})

		it("conflicting const", () => {
			const T = inferred({
				$defs: { s: { type: "string" } },
				$ref: "#/$defs/s",
				const: 1
			})
			attest<never>(T).type.toString.snap("never")
		})

		it("enum", () => {
			const T = inferred({
				$defs: { s: { type: "string" } },
				$ref: "#/$defs/s",
				enum: ["a", "b", 1, null]
			})
			attest<"a" | "b">(T).type.toString.snap('"a" | "b"')
		})

		it("not with an exact schema", () => {
			const T = inferred({
				$defs: { sn: { type: ["string", "null"] } },
				$ref: "#/$defs/sn",
				not: { type: "null" }
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("anyOf", () => {
			const T = inferred({
				$defs: {
					o: {
						type: "object",
						properties: { id: { type: "string" } },
						required: ["id"]
					}
				},
				$ref: "#/$defs/o",
				anyOf: [
					{ properties: { a: { type: "number" } }, required: ["a"] },
					{ properties: { b: { type: "boolean" } }, required: ["b"] }
				]
			})
			attest<{ id: string; a: number } | { id: string; b: boolean }>(T).type
				.toString.snap(`	| { id: string; a: number }
	| { id: string; b: boolean }`)
		})

		it("allOf", () => {
			const T = inferred({
				$defs: {
					o: {
						type: "object",
						properties: { id: { type: "string" } },
						required: ["id"]
					}
				},
				$ref: "#/$defs/o",
				allOf: [{ properties: { a: { type: "number" } }, required: ["a"] }]
			})
			attest<{ id: string; a: number }>(T).type.toString.snap(
				"{ id: string; a: number }"
			)
		})

		it("if/then/else", () => {
			const T = inferred({
				$defs: { u: { type: ["string", "number"] } },
				$ref: "#/$defs/u",
				if: { type: "string" },
				then: { const: "s" },
				else: { const: 1 }
			})
			attest<"s" | 1>(T).type.toString.snap('1 | "s"')
		})

		it("additionalProperties", () => {
			const T = inferred({
				$defs: {
					o: {
						type: "object",
						properties: { a: { type: "string" } },
						required: ["a"]
					}
				},
				$ref: "#/$defs/o",
				additionalProperties: { type: "string" }
			})
			attest<{ [k: string]: string; a: string }>(T).type.toString.snap(
				"{ [x: string]: string; a: string }"
			)
		})

		it("required on a union target distributes", () => {
			const T = inferred({
				$defs: {
					u: {
						anyOf: [
							{ type: "object", properties: { a: { type: "string" } } },
							{ type: "object", properties: { b: { type: "number" } } }
						]
					}
				},
				$ref: "#/$defs/u",
				required: ["a"]
			})
			attest<{ a: string } | { b?: number; a: unknown }>(T).type.toString.snap(
				"{ a: string } | { a: unknown; b?: number }"
			)
		})
	})

	describe("const, enum and not beside refs", () => {
		it("not const object beside a ref", () => {
			type T = jsonSchema.infer<{
				$defs: { o: { enum: [{ a: 1; b: 2 }, "x"] } }
				$ref: "#/$defs/o"
				not: { const: { a: 1 } }
			}>
			attest<{ a: 1; b: 2 } | "x">({} as T).type.toString.snap(
				'"x" | { a: 1; b: 2 }'
			)
		})

		it("not enum object beside a ref", () => {
			type T = jsonSchema.infer<{
				$defs: {
					o: {
						type: "object"
						properties: { a: { const: 1 } }
						required: ["a"]
					}
				}
				$ref: "#/$defs/o"
				not: { enum: [{ a: 1 }] }
			}>
			attest<{ a: 1 }>({} as T).type.toString.snap("{ a: 1 }")
		})

		it("not const object on an open object", () => {
			type T = jsonSchema.infer<{
				type: "object"
				properties: { a: { const: 1 } }
				required: ["a"]
				not: { const: { a: 1 } }
			}>
			attest<{ a: 1 }>({} as T).type.toString.snap("{ a: 1 }")
		})

		it("not const array of an object", () => {
			type T = jsonSchema.infer<{
				type: "array"
				prefixItems: [
					{ type: "object"; properties: { a: { const: 1 } }; required: ["a"] }
				]
				items: false
				minItems: 1
				not: { const: [{ a: 1 }] }
			}>
			attest<[{ a: 1 }]>({} as T).type.toString.snap("[{ a: 1 }]")
		})

		it("four tuple defs each excluding a constant", () => {
			type T = jsonSchema.infer<{
				$defs: {
					d0: {
						type: "array"
						prefixItems: [{ $ref: "#/$defs/d1" }]
						not: { const: [1] }
					}
					d1: {
						type: "array"
						prefixItems: [{ $ref: "#/$defs/d2" }]
						not: { const: [1] }
					}
					d2: {
						type: "array"
						prefixItems: [{ $ref: "#/$defs/d3" }]
						not: { const: [1] }
					}
					d3: {
						type: "array"
						prefixItems: [{ $ref: "#/$defs/d4" }]
						not: { const: [1] }
					}
					d4: { type: "string" }
				}
				$ref: "#/$defs/d0"
			}>
			attest({} as T).type.toString.snap(`[
	[
		[[string?, ...unknown[]]?, ...unknown[]]?,
		...unknown[]
	]?,
	...unknown[]
]`)
		})

		it("thirteen tuple defs each excluding a constant", () => {
			type T = jsonSchema.infer<{
				$defs: {
					d0: {
						type: "array"
						prefixItems: [{ $ref: "#/$defs/d1" }]
						not: { const: [1] }
					}
					d1: {
						type: "array"
						prefixItems: [{ $ref: "#/$defs/d2" }]
						not: { const: [1] }
					}
					d2: {
						type: "array"
						prefixItems: [{ $ref: "#/$defs/d3" }]
						not: { const: [1] }
					}
					d3: {
						type: "array"
						prefixItems: [{ $ref: "#/$defs/d4" }]
						not: { const: [1] }
					}
					d4: {
						type: "array"
						prefixItems: [{ $ref: "#/$defs/d5" }]
						not: { const: [1] }
					}
					d5: {
						type: "array"
						prefixItems: [{ $ref: "#/$defs/d6" }]
						not: { const: [1] }
					}
					d6: {
						type: "array"
						prefixItems: [{ $ref: "#/$defs/d7" }]
						not: { const: [1] }
					}
					d7: {
						type: "array"
						prefixItems: [{ $ref: "#/$defs/d8" }]
						not: { const: [1] }
					}
					d8: {
						type: "array"
						prefixItems: [{ $ref: "#/$defs/d9" }]
						not: { const: [1] }
					}
					d9: {
						type: "array"
						prefixItems: [{ $ref: "#/$defs/d10" }]
						not: { const: [1] }
					}
					d10: {
						type: "array"
						prefixItems: [{ $ref: "#/$defs/d11" }]
						not: { const: [1] }
					}
					d11: {
						type: "array"
						prefixItems: [{ $ref: "#/$defs/d12" }]
						not: { const: [1] }
					}
					d12: {
						type: "array"
						prefixItems: [{ $ref: "#/$defs/d13" }]
						not: { const: [1] }
					}
					d13: { type: "string" }
				}
				$ref: "#/$defs/d0"
			}>
			const isAny = {} as 0 extends 1 & T ? true : false
			attest(isAny).type.toString.snap("false")
		})

		it("const beside a ref to an embedded resource", () => {
			type T = jsonSchema.infer<{
				$defs: {
					r: {
						$id: "https://example.com/r.json"
						$defs: { s: { type: "string" } }
						type: "object"
						properties: { a: { $ref: "#/$defs/s" } }
					}
					s: { type: "number" }
				}
				$ref: "#/$defs/r"
				const: { a: "x" }
			}>
			attest<{ a: "x" }>({} as T).type.toString.snap('{ a: "x" }')
		})
	})

	describe("required keys declared by another schema", () => {
		type check<s> = [s] extends [jsonSchema.validate<s>] ? true : false

		it("a property schema beside a $ref whose target declares the key", () => {
			attest(() =>
				inferred({
					$defs: {
						base: {
							type: "object",
							properties: {
								meta: {
									type: "object",
									properties: { createdAt: { type: "string" } }
								}
							}
						}
					},
					$ref: "#/$defs/base",
					properties: {
						meta: {
							type: "object",
							properties: { updatedAt: { type: "string" } },
							required: ["createdAt"]
						}
					}
				})
			).type.errors.is("")
		})

		it("a property schema in an allOf branch whose sibling declares the key", () => {
			attest(() =>
				inferred({
					allOf: [
						{
							properties: {
								meta: { properties: { createdAt: { type: "string" } } }
							}
						},
						{
							properties: {
								meta: {
									properties: { updatedAt: { type: "string" } },
									required: ["createdAt"]
								}
							}
						}
					]
				})
			).type.errors.is("")
		})

		it("a property schema in a $defs entry whose referencing node declares the key", () => {
			attest(() =>
				inferred({
					$defs: {
						base: {
							type: "object",
							properties: {
								meta: {
									type: "object",
									properties: { createdAt: { type: "string" } },
									required: ["updatedAt"]
								}
							}
						}
					},
					$ref: "#/$defs/base",
					properties: {
						meta: {
							type: "object",
							properties: { updatedAt: { type: "string" } }
						}
					}
				})
			).type.errors.is("")
		})

		it("a patternProperties schema whose key is also a declared property", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: { "x-a": { properties: { p: { type: "string" } } } },
					patternProperties: {
						"^x-": {
							properties: { q: { type: "string" } },
							required: ["p"]
						}
					}
				})
			).type.errors.is("")
		})

		it("items in allOf branches", () => {
			attest(() =>
				inferred({
					allOf: [
						{ type: "array", items: { properties: { p: { type: "string" } } } },
						{
							type: "array",
							items: {
								properties: { q: { type: "string" } },
								required: ["p"]
							}
						}
					]
				})
			).type.errors.is("")
		})

		it("a typo in a nested self-contained property schema still errors", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						meta: {
							type: "object",
							properties: { createdAt: { type: "string" } },
							// @ts-expect-error
							required: ["createdAtt"]
						}
					}
				})
			).type.errors.snap(
				"Type '\"createdAtt\"' is not assignable to type '\"createdAt\"'."
			)
		})

		it("the merged property infers both keys", () => {
			type T = jsonSchema.infer<{
				$defs: {
					base: {
						type: "object"
						properties: {
							meta: {
								type: "object"
								properties: { createdAt: { type: "string" } }
							}
						}
					}
				}
				$ref: "#/$defs/base"
				properties: {
					meta: {
						type: "object"
						properties: { updatedAt: { type: "string" } }
						required: ["createdAt"]
					}
				}
			}>
			attest<{ meta?: { updatedAt?: string; createdAt: string } }>(
				{} as T
			).type.toString.snap(
				`{
	meta?: { updatedAt?: string; createdAt: string }
}`
			)
		})

		it("required key declared by the schema that references the def", () => {
			attest(
				{} as check<{
					$defs: {
						nicknamed: {
							properties: { nick: { type: "string" } }
							required: ["name", "nick"]
						}
					}
					type: "object"
					properties: { name: { type: "string" } }
					allOf: [{ $ref: "#/$defs/nicknamed" }]
				}>
			).type.toString.snap("true")
		})

		it("the mixin infers both keys", () => {
			const T = inferred({
				$defs: {
					nicknamed: {
						properties: { nick: { type: "string" } },
						required: ["nick"]
					}
				},
				type: "object",
				properties: { name: { type: "string" } },
				required: ["name"],
				allOf: [{ $ref: "#/$defs/nicknamed" }]
			})
			attest<{ name: string; nick: string }>(T).type.toString.snap(
				"{ name: string; nick: string }"
			)
		})
	})

	describe("allOf of refs to union-producing defs", () => {
		type rule<i extends number> = {
			if: {
				properties: { [_ in `k${i}`]: { const: "a" } }
				required: [`k${i}`]
			}
			then: {
				properties: { [_ in `v${i}`]: { type: "string" } }
				required: [`v${i}`]
			}
			else: { properties: { [_ in `v${i}`]: { type: "number" } } }
		}

		type RefRules = {
			$defs: {
				r0: rule<0>
				r1: rule<1>
				r2: rule<2>
				r3: rule<3>
				r4: rule<4>
				r5: rule<5>
				r6: rule<6>
				r7: rule<7>
				r8: rule<8>
				r9: rule<9>
				r10: rule<10>
				r11: rule<11>
				r12: rule<12>
				r13: rule<13>
			}
			type: "object"
			allOf: [
				{ $ref: "#/$defs/r0" },
				{ $ref: "#/$defs/r1" },
				{ $ref: "#/$defs/r2" },
				{ $ref: "#/$defs/r3" },
				{ $ref: "#/$defs/r4" },
				{ $ref: "#/$defs/r5" },
				{ $ref: "#/$defs/r6" },
				{ $ref: "#/$defs/r7" },
				{ $ref: "#/$defs/r8" },
				{ $ref: "#/$defs/r9" },
				{ $ref: "#/$defs/r10" },
				{ $ref: "#/$defs/r11" },
				{ $ref: "#/$defs/r12" },
				{ $ref: "#/$defs/r13" }
			]
		}

		it("fourteen if/then/else rules referenced from allOf", () => {
			attest(() => {
				type T = jsonSchema.infer<RefRules>
				return {} as T
			}).type.errors.is("")
		})

		type NestedRules = {
			type: "object"
			allOf: [
				{ allOf: [rule<0>] },
				{ allOf: [rule<1>] },
				{ allOf: [rule<2>] },
				{ allOf: [rule<3>] },
				{ allOf: [rule<4>] },
				{ allOf: [rule<5>] },
				{ allOf: [rule<6>] },
				{ allOf: [rule<7>] },
				{ allOf: [rule<8>] },
				{ allOf: [rule<9>] },
				{ allOf: [rule<10>] },
				{ allOf: [rule<11>] },
				{ allOf: [rule<12>] },
				{ allOf: [rule<13>] }
			]
		}

		it("fourteen if/then/else rules each wrapped in an allOf", () => {
			attest(() => {
				type T = jsonSchema.infer<NestedRules>
				return {} as T
			}).type.errors.is("")
		})

		it("two referenced rules stay precise", () => {
			type T = jsonSchema.infer<{
				$defs: { r0: rule<0>; r1: rule<1> }
				type: "object"
				allOf: [{ $ref: "#/$defs/r0" }, { $ref: "#/$defs/r1" }]
			}>
			attest<
				| { v0: string; v1: string }
				| { v0: string; v1?: number }
				| { v0?: number; v1: string }
				| { v0?: number; v1?: number }
			>({} as T)
		})
	})

	describe("non-local refs", () => {
		it("absolute uri", () => {
			const T = inferred({ $ref: "https://example.com/schema.json" })
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("anchor", () => {
			const T = inferred({
				$defs: { s: { $anchor: "str", type: "string" } },
				$ref: "#str"
			})
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("remote ref with a sibling type", () => {
			const T = inferred({
				$ref: "https://example.com/schema.json",
				type: "string"
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("$dynamicRef and $recursiveRef are annotations", () => {
			const T = inferred({
				type: "object",
				properties: {
					a: { $dynamicRef: "#meta" },
					b: { $recursiveRef: "#" }
				}
			})
			attest<{ a?: unknown; b?: unknown }>(T).type.toString.snap(
				"{ a?: unknown; b?: unknown }"
			)
		})

		it("an empty $ref is the current document and infers unknown", () => {
			const T = inferred({
				type: "object",
				properties: { a: { $ref: "" } },
				required: ["a"]
			})
			attest<{ a: unknown }>(T).type.toString.snap("{ a: unknown }")
		})
	})

	describe("$id and $anchor", () => {
		it("$id at the root doesn't change local refs", () => {
			const T = inferred({
				$id: "https://example.com/node.json",
				type: "object",
				properties: { child: { $ref: "#" } }
			})
			type Node = { child?: Node }
			attest<Node>(T).type.toString.snap("{ child?: cyclic }")
		})

		it("# inside an embedded resource", () => {
			type Inner = { self?: Inner }
			const T = inferred({
				$defs: {
					inner: {
						$id: "https://example.com/inner.json",
						type: "object",
						properties: { self: { $ref: "#" } }
					}
				},
				type: "object",
				properties: {
					x: { $ref: "#/$defs/inner" },
					y: { type: "number" }
				}
			})
			attest<{ x?: Inner; y?: number }>(T)
		})

		it("a fragment $id doesn't start a resource", () => {
			type Root = { a: { b: Root }; n: number }
			const T = inferred({
				type: "object",
				properties: {
					a: {
						$id: "#a",
						type: "object",
						properties: { b: { $ref: "#" } },
						required: ["b"]
					},
					n: { type: "number" }
				},
				required: ["a", "n"]
			})
			attest<Root>(T)
		})

		it("refs inside a widened $id are unresolvable", () => {
			attest<
				{ p: unknown },
				jsonSchema.infer<{
					$defs: { a: { type: "string" } }
					type: "object"
					properties: {
						p: {
							$id: string
							$defs: { a: { type: "number" } }
							$ref: "#/$defs/a"
						}
					}
					required: ["p"]
				}>
			>()
		})
	})

	describe("embedded resources", () => {
		it("refs inside a pointer target resolve against its enclosing resource", () => {
			const T = inferred({
				$defs: {
					inner: {
						$id: "https://example.com/inner.json",
						$defs: {
							x: { $ref: "#/$defs/y" },
							y: { type: "string" }
						}
					},
					y: { type: "number" }
				},
				$ref: "#/$defs/inner/$defs/x"
			})
			attest<string>(T).type.toString.snap("string")
		})

		it("# inside a pointer target is its enclosing resource", () => {
			const T = inferred({
				$defs: {
					inner: {
						$id: "https://example.com/inner.json",
						type: "object",
						properties: { n: { type: "number" } },
						required: ["n"],
						$defs: {
							wrap: {
								type: "object",
								properties: { v: { $ref: "#" } },
								required: ["v"]
							}
						}
					}
				},
				type: "object",
				properties: { s: { type: "string" } },
				required: ["s"],
				anyOf: [{ $ref: "#/$defs/inner/$defs/wrap" }]
			})
			attest<{ s: string; v: { n: number } }>(T).type.toString.snap(
				"{ s: string; v: { n: number } }"
			)
		})

		it("a pointer through nested resources resolves against the innermost", () => {
			const T = inferred({
				$defs: {
					outer: {
						$id: "outer.json",
						$defs: {
							y: { type: "boolean" },
							inner: {
								$id: "inner.json",
								$defs: { y: { type: "null" }, x: { $ref: "#/$defs/y" } }
							}
						}
					},
					y: { type: "number" }
				},
				$ref: "#/$defs/outer/$defs/inner/$defs/x"
			})
			attest<null>(T).type.toString.snap("null")
		})

		it("a pointer through an anchor keeps its enclosing resource", () => {
			const T = inferred({
				$defs: {
					outer: {
						$id: "outer.json",
						$defs: {
							y: { type: "boolean" },
							mid: { $id: "#mid", $defs: { x: { $ref: "#/$defs/y" } } }
						}
					},
					y: { type: "number" }
				},
				$ref: "#/$defs/outer/$defs/mid/$defs/x"
			})
			attest<boolean>(T).type.toString.snap("boolean")
		})

		it("recursion inside a pointer target in an embedded resource", () => {
			const T = inferred({
				$defs: {
					inner: {
						$id: "inner.json",
						$defs: {
							node: {
								type: "object",
								properties: {
									v: { type: "number" },
									next: { $ref: "#/$defs/node" }
								},
								required: ["v"]
							}
						}
					}
				},
				$ref: "#/$defs/inner/$defs/node"
			})
			attest<number | undefined>(T.next?.next?.next?.v)
		})

		it("a pointer through a widened $id leaves its target's refs unresolved", () => {
			type T = jsonSchema.infer<{
				$defs: {
					inner: {
						$id: string
						$defs: { x: { $ref: "#/$defs/y" }; y: { type: "string" } }
					}
					y: { type: "number" }
				}
				$ref: "#/$defs/inner/$defs/x"
			}>
			attest<unknown>({} as T).type.toString.snap("unknown")
		})

		it("sibling resources resolve their own $defs", () => {
			const T = inferred({
				type: "object",
				properties: {
					a: {
						$id: "a.json",
						$defs: { t: { type: "string" } },
						$ref: "#/$defs/t"
					},
					b: {
						$id: "b.json",
						$defs: { t: { type: "number" } },
						$ref: "#/$defs/t"
					}
				},
				required: ["a", "b"]
			})
			attest<{ a: string; b: number }>(T).type.toString.snap(
				"{ a: string; b: number }"
			)
		})

		it("nested resources resolve against the innermost", () => {
			const T = inferred({
				$id: "root.json",
				$defs: {
					outer: {
						$id: "outer.json",
						$defs: {
							t: { type: "boolean" },
							inner: {
								$id: "inner.json",
								$defs: { t: { type: "null" } },
								$ref: "#/$defs/t"
							}
						},
						$ref: "#/$defs/inner"
					},
					t: { type: "string" }
				},
				$ref: "#/$defs/outer"
			})
			attest<null>(T).type.toString.snap("null")
		})

		it("twenty levels of recursion inside an embedded resource", () => {
			const schema = {
				$defs: {
					list: {
						$id: "list.json",
						type: "object",
						properties: { v: { type: "number" }, next: { $ref: "#" } },
						required: ["v"]
					}
				},
				type: "object",
				properties: { head: { $ref: "#/$defs/list" }, root: { $ref: "#" } }
			} as const
			type T = jsonSchema.infer<typeof schema>
			const list: T = {
				root: {
					head: {
						v: 1,
						next: {
							v: 1,
							next: {
								v: 1,
								next: {
									v: 1,
									next: {
										v: 1,
										next: {
											v: 1,
											next: {
												v: 1,
												next: {
													v: 1,
													next: {
														v: 1,
														next: {
															v: 1,
															next: {
																v: 1,
																next: {
																	v: 1,
																	next: {
																		v: 1,
																		next: {
																			v: 1,
																			next: {
																				v: 1,
																				next: {
																					v: 1,
																					next: {
																						v: 1,
																						next: {
																							v: 1,
																							next: {
																								v: 1,
																								next: { v: 1, next: { v: 1 } }
																							}
																						}
																					}
																				}
																			}
																		}
																	}
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
			attest<number | undefined>(
				list.root?.head?.next?.next?.next?.next?.next?.next?.v
			)
			// @ts-expect-error
			const bad: T = { head: { v: 1, next: { head: { v: 1 } } } }
			attest(bad)
		})

		it("a missing ref lists the resource's definitions", () => {
			attest(() =>
				inferred({
					$defs: { outer: { type: "string" } },
					type: "object",
					properties: {
						p: {
							$id: "p.json",
							$defs: { inner: { type: "number" } },
							// @ts-expect-error
							$ref: "#/$defs/nope"
						}
					}
				})
			).type.errors(
				'Type \'"#/$defs/nope"\' is not assignable to type \'"#" | "#/$defs/inner"\''
			)
		})

		it("a widened $id on the document root still resolves local refs", () => {
			type Root = {
				$id: string
				$defs: { s: { type: "string" } }
				$ref: "#/$defs/s"
			}
			attest<string>({} as jsonSchema.infer<Root>).type.toString.snap("string")
		})

		it("a widened $id on the document root still validates local refs", () => {
			type check<s> = s extends jsonSchema.validate<s> ? true : false
			attest(
				{} as check<{
					$id: string
					$defs: { s: { type: "string" } }
					$ref: "#/$defs/nope"
				}>
			).type.toString.snap("false")
		})

		it("a ref seen outside an embedded resource is cut as a cycle inside it", () => {
			// limitation: inside r, "#/$defs/a" is r's string, but seen refs are keyed
			// by their string, so it's cut as a cycle (sound, wider)
			attest(
				{} as jsonSchema.infer<{
					$defs: {
						a: { anyOf: [{ $ref: "#/$defs/r" }] }
						r: {
							$id: "https://example.com/r"
							$defs: { a: { type: "string" } }
							anyOf: [{ $ref: "#/$defs/a" }]
						}
					}
					$ref: "#/$defs/a"
				}>
			).type.toString.snap("unknown")
		})
	})

	describe("dialects", () => {
		type check<s> = s extends jsonSchema.validate<s> ? true : false

		it("well-known $schema spellings", () => {
			type siblingsOf<uri> = jsonSchema.infer<{
				$schema: uri
				definitions: { n: { type: ["number", "string"] } }
				$ref: "#/definitions/n"
				type: "string"
			}>
			attest<string | number>(
				{} as siblingsOf<"http://json-schema.org/draft-04/hyper-schema#">
			)
			attest<string | number>(
				{} as siblingsOf<"https://json-schema.org/draft-07/schema">
			)
			attest<string | number>(
				{} as siblingsOf<"http://json-schema.org/draft-06/schema">
			)
			attest<string>(
				{} as siblingsOf<"https://json-schema.org/draft/2019-09/schema">
			)
			attest<string>({} as siblingsOf<"http://json-schema.org/schema#">)
		})

		it("each member of a union reads its own $schema", () => {
			attest<string | number | boolean>(
				{} as jsonSchema.infer<
					| {
							$schema: "http://json-schema.org/draft-07/schema#"
							definitions: { n: { type: ["number", "string"] } }
							$ref: "#/definitions/n"
							type: "string"
					  }
					| {
							definitions: { n: { type: ["number", "boolean"] } }
							$ref: "#/definitions/n"
							type: "boolean"
					  }
				>
			)
		})

		it("an unknown $schema is read as 2020-12", () => {
			attest<string>(
				{} as jsonSchema.infer<{
					$schema: "https://spec.openapis.org/oas/3.1/dialect/base"
					$defs: { n: { type: ["number", "string"] } }
					$ref: "#/$defs/n"
					type: "string"
				}>
			).type.toString.snap("string")
		})

		it("a widened $schema may be any dialect", () => {
			attest<string | number>(
				{} as jsonSchema.infer<{
					$schema: string
					definitions: { n: { type: ["number", "string"] } }
					$ref: "#/definitions/n"
					type: "string"
				}>
			).type.toString.snap("string | number")
			// $id starts a resource except in draft-04
			attest<{ p: unknown }>(
				{} as jsonSchema.infer<{
					$schema: string
					definitions: {
						inner: {
							$id: "inner.json"
							definitions: { s: { type: "string" } }
							type: "object"
							properties: { p: { $ref: "#/definitions/s" } }
							required: ["p"]
						}
						s: { type: "number" }
					}
					$ref: "#/definitions/inner"
				}>
			).type.toString.snap("{ p: unknown }")
		})

		it("an optional draft-07 $schema may be absent", () => {
			attest<string | number>(
				{} as jsonSchema.infer<{
					$schema?: "http://json-schema.org/draft-07/schema#"
					definitions: { n: { type: ["number", "string"] } }
					$ref: "#/definitions/n"
					type: "string"
				}>
			).type.toString.snap("string | number")
			// $id starts a resource in both dialects
			attest<{ p: string }>(
				{} as jsonSchema.infer<{
					$schema?: "http://json-schema.org/draft-07/schema#"
					definitions: {
						inner: {
							$id: "inner.json"
							definitions: { s: { type: "string" } }
							type: "object"
							properties: { p: { $ref: "#/definitions/s" } }
							required: ["p"]
						}
						s: { type: "number" }
					}
					$ref: "#/definitions/inner"
				}>
			).type.toString.snap("{ p: string }")
		})

		it("a draft-07 $ref ignores its sibling type", () => {
			type T = jsonSchema.infer<{
				$schema: "http://json-schema.org/draft-07/schema#"
				type: "object"
				properties: { p: { $ref: "#/definitions/n"; type: "string" } }
				definitions: { n: { type: ["number", "string"] } }
			}>
			attest<{ p?: string | number }>({} as T).type.toString.snap(
				"{ p?: string | number }"
			)
		})

		it("a $id beside $ref re-roots it only from 2019-09 on", () => {
			attest<{ a?: string }>(
				{} as jsonSchema.infer<{
					$defs: { s: { type: "number" } }
					type: "object"
					properties: {
						a: {
							$id: "https://example.com/a"
							$defs: { s: { type: "string" } }
							$ref: "#/$defs/s"
						}
					}
				}>
			).type.toString.snap("{ a?: string }")
			attest<{ a?: number }>(
				{} as jsonSchema.infer<{
					$schema: "http://json-schema.org/draft-07/schema#"
					definitions: { s: { type: "number" } }
					type: "object"
					properties: {
						a: {
							$id: "https://example.com/a"
							definitions: { s: { type: "string" } }
							$ref: "#/definitions/s"
						}
					}
				}>
			).type.toString.snap("{ a?: number }")
		})

		it("a draft-07 $ref beside $id validates against the document", () => {
			attest(
				{} as check<{
					$schema: "http://json-schema.org/draft-07/schema#"
					definitions: { s: { type: "number" } }
					type: "object"
					properties: {
						a: { $id: "https://example.com/a"; $ref: "#/definitions/s" }
					}
				}>
			).type.toString.snap("true")
		})

		it("an embedded draft-07 resource ignores $ref siblings", () => {
			attest<{ p?: number }>(
				{} as jsonSchema.infer<{
					$schema: "http://json-schema.org/draft-07/schema#"
					definitions: {
						inner: {
							$id: "inner.json"
							definitions: { n: { type: "number" } }
							type: "object"
							properties: { p: { $ref: "#/definitions/n"; type: "string" } }
						}
					}
					$ref: "#/definitions/inner"
				}>
			).type.toString.snap("{ p?: number }")
		})

		it("an embedded resource declares its own dialect", () => {
			attest<{ p?: string | number }>(
				{} as jsonSchema.infer<{
					$defs: {
						inner: {
							$schema: "http://json-schema.org/draft-07/schema#"
							$id: "inner.json"
							definitions: { n: { type: ["number", "string"] } }
							type: "object"
							properties: { p: { $ref: "#/definitions/n"; type: "number" } }
						}
					}
					$ref: "#/$defs/inner"
				}>
			).type.toString.snap("{ p?: string | number }")
		})

		it("a draft-07 $ref beside $id completes the document's definitions", () => {
			attest(() =>
				inferred({
					$schema: "http://json-schema.org/draft-07/schema#",
					definitions: { outer: { type: "number" } },
					type: "object",
					properties: {
						a: {
							$id: "https://example.com/a",
							definitions: { inner: { type: "string" } },
							// @ts-expect-error
							$ref: "#/definitions/"
						}
					}
				})
			).completions({ "#/definitions/": ["#/definitions/outer"] })
		})

		it("a 2020-12 $ref beside $id can't reach the document's definitions", () => {
			attest(() =>
				inferred({
					$defs: { outer: { type: "number" } },
					type: "object",
					properties: {
						a: {
							$id: "https://example.com/a",
							$defs: { inner: { type: "string" } },
							// @ts-expect-error
							$ref: "#/$defs/outer"
						}
					}
				})
			).type.errors(
				'Type \'"#/$defs/outer"\' is not assignable to type \'"#" | "#/$defs/inner"\''
			)
		})

		it("draft-04 id starts a resource", () => {
			attest<{ p: string }>(
				{} as jsonSchema.infer<{
					$schema: "http://json-schema.org/draft-04/schema#"
					definitions: {
						inner: {
							id: "inner.json"
							definitions: { s: { type: "string" } }
							type: "object"
							properties: { p: { $ref: "#/definitions/s" } }
							required: ["p"]
						}
						s: { type: "number" }
					}
					$ref: "#/definitions/inner"
				}>
			).type.toString.snap("{ p: string }")
		})

		it("draft-04 id is the document root's identifier", () => {
			attest<{ a: string }>(
				{} as jsonSchema.infer<{
					$schema: "http://json-schema.org/draft-04/schema#"
					id: "https://example.com/root.json"
					definitions: { s: { type: "string" } }
					type: "object"
					properties: { a: { $ref: "#/definitions/s" } }
					required: ["a"]
				}>
			).type.toString.snap("{ a: string }")
		})

		it("a pointer through a draft-04 id resolves against it", () => {
			attest<string>(
				{} as jsonSchema.infer<{
					$schema: "http://json-schema.org/draft-04/schema#"
					definitions: {
						inner: {
							id: "inner.json"
							definitions: {
								s: { type: "string" }
								x: { $ref: "#/definitions/s" }
							}
						}
						s: { type: "number" }
					}
					$ref: "#/definitions/inner/definitions/x"
				}>
			).type.toString.snap("string")
		})

		it("draft-04 id validates its refs against itself", () => {
			type check<s> = s extends jsonSchema.validate<s> ? true : false
			attest(
				{} as check<{
					$schema: "http://json-schema.org/draft-04/schema#"
					definitions: {
						inner: {
							id: "inner.json"
							type: "object"
							properties: { p: { $ref: "#/definitions/s" } }
						}
						s: { type: "string" }
					}
					$ref: "#/definitions/inner"
				}>
			).type.toString.snap("false")
		})

		it("id without $schema is an unknown keyword", () => {
			attest<{ p: number }>(
				{} as jsonSchema.infer<{
					definitions: {
						inner: {
							id: "inner.json"
							definitions: { s: { type: "string" } }
							type: "object"
							properties: { p: { $ref: "#/definitions/s" } }
							required: ["p"]
						}
						s: { type: "number" }
					}
					$ref: "#/definitions/inner"
				}>
			).type.toString.snap("{ p: number }")
		})

		it("id is an unknown keyword under a $id-era $schema", () => {
			attest<{ p: number }>(
				{} as jsonSchema.infer<{
					$schema: "http://json-schema.org/draft-07/schema#"
					definitions: {
						inner: {
							id: "inner.json"
							definitions: { s: { type: "string" } }
							type: "object"
							properties: { p: { $ref: "#/definitions/s" } }
							required: ["p"]
						}
						s: { type: "number" }
					}
					$ref: "#/definitions/inner"
				}>
			).type.toString.snap("{ p: number }")
		})

		it("id without $schema validates its refs against the document", () => {
			type check<s> = s extends jsonSchema.validate<s> ? true : false
			attest(
				{} as check<{
					definitions: {
						inner: {
							id: "inner.json"
							type: "object"
							properties: { p: { $ref: "#/definitions/nope" } }
						}
					}
					$ref: "#/definitions/inner"
				}>
			).type.toString.snap("false")
			attest(
				{} as check<{
					definitions: {
						inner: {
							id: "inner.json"
							type: "object"
							properties: { p: { $ref: "#/definitions/s" } }
						}
						s: { type: "string" }
					}
					$ref: "#/definitions/inner"
				}>
			).type.toString.snap("true")
		})

		it("a draft-04 id nested in an id resource", () => {
			attest<{ q?: { p: string } }>(
				{} as jsonSchema.infer<{
					$schema: "http://json-schema.org/draft-04/schema#"
					definitions: {
						s: { type: "number" }
						outer: {
							id: "outer.json"
							definitions: {
								s: { type: "boolean" }
								inner: {
									id: "inner.json"
									definitions: { s: { type: "string" } }
									type: "object"
									properties: { p: { $ref: "#/definitions/s" } }
									required: ["p"]
								}
							}
							type: "object"
							properties: { q: { $ref: "#/definitions/inner" } }
						}
					}
					$ref: "#/definitions/outer"
				}>
			).type.toString.snap("{ q?: { p: string } }")
		})

		it("a draft-04 $ref ignores its node's id", () => {
			attest<number>(
				{} as jsonSchema.infer<{
					$schema: "http://json-schema.org/draft-04/schema#"
					definitions: {
						s: { type: "number" }
						outer: {
							id: "outer.json"
							definitions: { s: { type: "string" } }
							$ref: "#/definitions/s"
							type: "string"
						}
					}
					$ref: "#/definitions/outer"
				}>
			).type.toString.snap("number")
		})

		it("a draft-04 $ref ignores a structured not over an id resource", () => {
			type Document<extra> = {
				$schema: "http://json-schema.org/draft-04/schema#"
				definitions: {
					r: { id: "r.json"; type: "array"; items: { $ref: "#" } }
				}
				$ref: "#/definitions/r"
			} & extra
			attest<jsonSchema.infer<Document<{}>>>(
				{} as jsonSchema.infer<Document<{ not: { const: [] } }>>
			)
		})

		it("refs in a draft-04 id resource complete its definitions", () => {
			attest(() =>
				inferred({
					$schema: "http://json-schema.org/draft-04/schema#",
					definitions: {
						outer: { type: "number" },
						r: {
							id: "r.json",
							definitions: { inner: { type: "string" } },
							type: "object",
							properties: {
								// @ts-expect-error
								a: { $ref: "#/definitions/" }
							}
						}
					}
				})
			).completions({ "#/definitions/": ["#/definitions/inner"] })
		})

		it("$id is an unknown keyword, so refs inside resolve against the document", () => {
			type T = jsonSchema.infer<{
				$schema: "http://json-schema.org/draft-04/schema#"
				definitions: {
					s: { type: "number" }
					inner: {
						$id: "inner.json"
						definitions: { s: { type: "string" } }
						type: "object"
						properties: { p: { $ref: "#/definitions/s" } }
						required: ["p"]
					}
				}
				$ref: "#/definitions/inner"
			}>
			attest<{ p: number }>({} as T).type.toString.snap("{ p: number }")
		})

		it("a ref inside $id to a document definition is valid", () => {
			type S = {
				$schema: "http://json-schema.org/draft-04/schema#"
				definitions: {
					s: { type: "number" }
					inner: {
						$id: "inner.json"
						type: "object"
						properties: { p: { $ref: "#/definitions/s" } }
					}
				}
				$ref: "#/definitions/inner"
			}
			attest(
				{} as [S] extends [jsonSchema.validate<S>] ? true : false
			).type.toString.snap("true")
		})

		it("$id starts a resource under draft-06", () => {
			type T = jsonSchema.infer<{
				$schema: "http://json-schema.org/draft-06/schema#"
				definitions: {
					s: { type: "number" }
					inner: {
						$id: "inner.json"
						definitions: { s: { type: "string" } }
						type: "object"
						properties: { p: { $ref: "#/definitions/s" } }
						required: ["p"]
					}
				}
				$ref: "#/definitions/inner"
			}>
			attest<{ p: string }>({} as T).type.toString.snap("{ p: string }")
		})
	})

	describe("roots", () => {
		const doc = {
			$defs: {
				user: {
					type: "object",
					properties: {
						name: { type: "string" },
						manager: { $ref: "#/$defs/user" }
					},
					required: ["name"]
				},
				id: { type: "string" }
			}
		} as const
		type Doc = typeof doc
		type User = { name: string; manager?: User }
		type check<s, root = s> =
			[s] extends [jsonSchema.validate<s, root>] ? true : false

		it("infers a def against its document", () => {
			attest<User, jsonSchema.infer<Doc["$defs"]["user"], Doc>>()
		})

		it("a def is unresolvable without its document", () => {
			attest<
				{ name: string; manager?: unknown },
				jsonSchema.infer<Doc["$defs"]["user"]>
			>()
		})

		it("an OpenAPI components document", () => {
			const openapi = {
				openapi: "3.0.3",
				components: {
					schemas: {
						Pet: {
							type: "object",
							properties: {
								id: { type: "integer" },
								tag: { type: "string", nullable: true },
								owner: { $ref: "#/components/schemas/Owner" }
							},
							required: ["id"]
						},
						Owner: {
							type: "object",
							properties: {
								pets: {
									type: "array",
									items: { $ref: "#/components/schemas/Pet" }
								}
							}
						}
					}
				}
			} as const
			type OpenApi = typeof openapi
			type Pet = { id: number; tag?: string | null; owner?: Owner }
			type Owner = { pets?: Pet[] }
			attest<
				Pet,
				jsonSchema.infer<OpenApi["components"]["schemas"]["Pet"], OpenApi>
			>()
		})

		it("validates a ref against an explicit root", () => {
			attest<true, check<Doc["$defs"]["user"], Doc>>()
			attest<false, check<Doc["$defs"]["user"], Doc["$defs"]["user"]>>()
			attest<false, check<{ $ref: "#/$defs/nope" }, Doc>>()
			attest<true, check<{ $ref: "#/$defs/id" }, Doc>>()
		})

		it("a union member's ref infers against its own root", () => {
			attest(
				{} as jsonSchema.infer<
					| { $defs: { a: { type: "string" } }; $ref: "#/$defs/a" }
					| {
							type: "object"
							properties: { x: { $ref: "#/$defs/a" } }
							required: ["x"]
					  }
				>
			).type.toString.snap("string | { x: unknown }")
		})

		it("a union member's ref doesn't resolve against another member", () => {
			attest(
				{} as check<
					| { $defs: { a: { type: "string" } }; $ref: "#/$defs/a" }
					| { type: "object"; properties: { x: { $ref: "#/$defs/a" } } }
				>
			).type.toString.snap("false")
		})
	})

	describe("widened and hand-written schemas", () => {
		// a hand-written schema type with recursive optional subschemas (like
		// JSONSchema7), which is widened and infers unknown
		interface HandWrittenSchema {
			$ref?: string
			type?: "string" | "number" | "object" | "array"
			allOf?: HandWrittenSchema[]
			items?: HandWrittenSchema
			properties?: { [k: string]: HandWrittenSchema }
		}

		it("mutable $defs", () => {
			attest<
				{ a: string },
				jsonSchema.infer<{
					$defs: { s: { type: "string" } }
					type: "object"
					properties: { a: { $ref: "#/$defs/s" } }
					required: ["a"]
				}>
			>()
		})

		it("mutable recursion", () => {
			type Tree = { children?: Tree[] }
			attest<
				Tree,
				jsonSchema.infer<{
					type: "object"
					properties: { children: { type: "array"; items: { $ref: "#" } } }
				}>
			>()
		})

		it("widened $ref", () => {
			attest<
				unknown,
				jsonSchema.infer<{ $ref: string; $defs: { s: { type: "string" } } }>
			>()
		})

		it("widened $ref with a sibling type", () => {
			attest<string, jsonSchema.infer<{ $ref: string; type: "string" }>>()
		})

		it("union of refs", () => {
			attest<
				string | number,
				jsonSchema.infer<{
					$ref: "#/$defs/s" | "#/$defs/n"
					$defs: { s: { type: "string" }; n: { type: "number" } }
				}>
			>()
		})

		it("an any $ref contributes nothing", () => {
			attest<unknown>({} as jsonSchema.infer<{ $ref: any }>)
			attest<string>({} as jsonSchema.infer<{ $ref: any; type: "string" }>)
		})

		it("widened $defs", () => {
			const defs = { s: { type: "string" } }
			const T = inferred({ $defs: defs, $ref: "#/$defs/s" })
			attest<unknown>(T).type.toString.snap("unknown")
		})

		it("a chain to a hand-written schema type", () => {
			type T = jsonSchema.infer<{
				$defs: { a: { $ref: "#/$defs/w" }; w: HandWrittenSchema }
				$ref: "#/$defs/a"
			}>
			attest<unknown>({} as T).type.toString.snap("unknown")
		})

		it("a chain to a hand-written schema type is valid", () => {
			type S = {
				$defs: { a: { $ref: "#/$defs/w" }; w: HandWrittenSchema }
				$ref: "#/$defs/a"
			}
			attest<true, [S] extends [jsonSchema.validate<S>] ? true : false>()
		})

		it("a chain to an any def", () => {
			type T = jsonSchema.infer<{
				$defs: { a: { $ref: "#/$defs/w" }; w: any }
				$ref: "#/$defs/a"
			}>
			attest({} as T).type.toString.snap("any")
		})

		it("const beside hand-written schema items", () => {
			type T = jsonSchema.infer<{
				type: "array"
				items: HandWrittenSchema
				const: [{ a: 1 }]
			}>
			attest<[{ a: 1 }]>({} as T).type.toString.snap("[{ a: 1 }]")
		})

		it("not empty beside hand-written schema items", () => {
			type T = jsonSchema.infer<{
				type: "array"
				items: HandWrittenSchema
				not: { const: [] }
			}>
			attest<unknown[]>({} as T).type.toString.snap("unknown[]")
		})
	})

	describe("widened pointers", () => {
		type check<s, root = s> =
			[s] extends [jsonSchema.validate<s, root>] ? true : false

		it("pointer into a widened schema array", () => {
			attest(
				{} as check<{
					$defs: { a: { allOf: JsonSchema[] } }
					$ref: "#/$defs/a/allOf/0"
				}>
			).type.toString.snap("true")
			attest(
				{} as check<{
					type: "array"
					prefixItems: JsonSchema[]
					items: { $ref: "#/prefixItems/0" }
				}>
			).type.toString.snap("true")
		})

		it("pointer into a widened schema", () => {
			attest(
				{} as check<{
					$defs: { a: JsonSchema }
					$ref: "#/$defs/a/properties/x"
				}>
			).type.toString.snap("true")
		})

		it("pointer into a widened array infers its element", () => {
			attest<string>(
				{} as jsonSchema.infer<{
					$defs: { a: { allOf: { type: "string" }[] } }
					$ref: "#/$defs/a/allOf/0"
				}>
			).type.toString.snap("string")
			attest<string | number>(
				{} as jsonSchema.infer<{
					$defs: {
						a: { allOf: [{ type: "string" }, ...{ type: "number" }[]] }
					}
					$ref: "#/$defs/a/allOf/3"
				}>
			).type.toString.snap("string | number")
		})

		it("pointer into a widened array needs an array index", () => {
			attest(
				{} as check<{
					$defs: { a: { allOf: { type: "string" }[] } }
					$ref: "#/$defs/a/allOf/01"
				}>
			).type.toString.snap("false")
			attest(
				{} as check<{
					$defs: { a: { allOf: { type: "string" }[] } }
					$ref: "#/$defs/a/allOf/-"
				}>
			).type.toString.snap("false")
			attest(
				{} as check<{
					$defs: { a: { allOf: { type: "string" }[] } }
					$ref: "#/$defs/a/allOf/-1"
				}>
			).type.toString.snap("false")
		})

		it("pointer through a widened definition infers unknown", () => {
			attest<unknown>(
				{} as jsonSchema.infer<{
					$defs: { a: Record<string, unknown> }
					$ref: "#/$defs/a/properties/x"
				}>
			).type.toString.snap("unknown")
		})

		it("ref into an optional $defs", () => {
			attest(
				{} as check<{
					$defs?: { a: { type: "string" } }
					$ref: "#/$defs/a"
				}>
			).type.toString.snap("true")
			attest<string>(
				{} as jsonSchema.infer<{
					$defs?: { a: { type: "string" } }
					$ref: "#/$defs/a"
				}>
			).type.toString.snap("string")
			attest(
				{} as check<{
					$defs?: { a: { type: "string" } }
					$ref: "#/$defs/b"
				}>
			).type.toString.snap("false")
		})
	})

	describe("jsonSchema values", () => {
		it("spreading a value into a schema with a new type", () => {
			const s = jsonSchema({ type: "string" })
			attest(jsonSchema({ ...s, type: "number" }).infer).type.toString.snap(
				"number"
			)
		})

		it("a composed value's refs resolve against the new document", () => {
			const leafy = jsonSchema({
				$defs: { leaf: { type: "string" } },
				type: "object",
				properties: { l: { $ref: "#/$defs/leaf" } }
			})
			type Doc = { type: "array"; items: typeof leafy }
			attest(
				{} as [Doc] extends [jsonSchema.validate<Doc>] ? true : false
			).type.toString.snap("false")
			attest<{ l?: unknown }[]>({} as jsonSchema.infer<Doc>)
		})

		it("a composed value with an $id keeps its refs", () => {
			const leafy = jsonSchema({
				$id: "https://example.com/leafy",
				$defs: { leaf: { type: "string" } },
				type: "object",
				properties: { l: { $ref: "#/$defs/leaf" } }
			})
			const doc = jsonSchema({ type: "array", items: leafy })
			attest<{ l?: string }[]>(doc.infer)
		})

		it("a $defs entry that is a value", () => {
			const str = jsonSchema({ type: "string" })
			attest<string[]>(
				jsonSchema({
					$defs: { s: str },
					type: "array",
					items: { $ref: "#/$defs/s" }
				}).infer
			)
		})
	})

	describe("validation", () => {
		it("unresolvable $defs name", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" }, b: { type: "number" } },
					// @ts-expect-error
					$ref: "#/$defs/c"
				})
			).type.errors.snap(
				`Type '"#/$defs/c"' is not assignable to type '"#" | "#/$defs/a" | "#/$defs/b"'. Did you mean '"#/$defs/a"'?`
			)
		})

		it("ref without any defs", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					$ref: "#/$defs/a"
				})
			).type.errors.snap(
				"Type '\"#/$defs/a\"' is not assignable to type '\"#\"'."
			)
		})

		it("unresolvable pointer", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						a: { type: "string" },
						// @ts-expect-error
						b: { $ref: "#/properties/c" }
					}
				})
			).type.errors(`'"#/properties/c"' is not assignable`)
		})

		it("pointer past the end of a tuple", () => {
			attest(() =>
				inferred({
					type: "array",
					// @ts-expect-error
					prefixItems: [{ type: "string" }, { $ref: "#/prefixItems/2" }]
				})
			).type.errors(`'"#/prefixItems/2"' is not assignable`)
		})

		it("pointer with a leading-zero index", () => {
			attest(() =>
				inferred({
					type: "array",
					// @ts-expect-error
					prefixItems: [{ type: "string" }, { $ref: "#/prefixItems/00" }]
				})
			).type.errors(`'"#/prefixItems/00"' is not assignable`)
		})

		it("missing empty key", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					$ref: "#/"
				})
			).type.errors(`'"#/"' is not assignable`)
		})

		it("prototype member names aren't defs", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					// @ts-expect-error
					$ref: "#/$defs/toString"
				})
			).type.errors(`'"#/$defs/toString"' is not assignable`)
		})

		it("pointer into a keyword's string value", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						// @ts-expect-error
						a: { $ref: "#/type/length" }
					}
				})
			).type.errors(`'"#/type/length"' is not assignable`)
		})

		it("refs resolve against the root, not the enclosing schema", () => {
			attest(() =>
				inferred({
					type: "object",
					properties: {
						a: {
							$defs: { x: { type: "string" } },
							// @ts-expect-error
							$ref: "#/$defs/x"
						}
					}
				})
			).type.errors(`'"#/$defs/x"' is not assignable`)
		})

		it("pointer to a nested $defs", () => {
			const T = inferred({
				type: "object",
				properties: {
					a: {
						$defs: { x: { type: "string" } },
						$ref: "#/properties/a/$defs/x"
					}
				},
				required: ["a"]
			})
			attest<{ a: string }>(T).type.toString.snap("{ a: string }")
		})

		it("in properties", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					type: "object",
					properties: {
						// @ts-expect-error
						x: { $ref: "#/$defs/b" }
					}
				})
			).type.errors(`'"#/$defs/b"' is not assignable`)
		})

		it("in items", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					type: "array",
					// @ts-expect-error
					items: { $ref: "#/$defs/b" }
				})
			).type.errors(`'"#/$defs/b"' is not assignable`)
		})

		it("in a draft-07 items tuple", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					type: "array",
					// @ts-expect-error
					items: [{ $ref: "#/$defs/a" }, { $ref: "#/$defs/b" }]
				})
			).type.errors(`'"#/$defs/b"' is not assignable`)
		})

		it("in anyOf", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					// @ts-expect-error
					anyOf: [{ $ref: "#/$defs/a" }, { $ref: "#/$defs/b" }]
				})
			).type.errors(`'"#/$defs/b"' is not assignable`)
		})

		it("in not", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					// @ts-expect-error
					not: { $ref: "#/$defs/b" }
				})
			).type.errors(`'"#/$defs/b"' is not assignable`)
		})

		it("in additionalProperties", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					type: "object",
					// @ts-expect-error
					additionalProperties: { $ref: "#/$defs/b" }
				})
			).type.errors(`'"#/$defs/b"' is not assignable`)
		})

		it("in patternProperties", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					type: "object",
					patternProperties: {
						// @ts-expect-error
						"^x": { $ref: "#/$defs/b" }
					}
				})
			).type.errors(`'"#/$defs/b"' is not assignable`)
		})

		it("in additionalItems", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					type: "array",
					items: [{ $ref: "#/$defs/a" }],
					// @ts-expect-error
					additionalItems: { $ref: "#/$defs/b" }
				})
			).type.errors(`'"#/$defs/b"' is not assignable`)
		})

		it("in contains", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					type: "array",
					// @ts-expect-error
					contains: { $ref: "#/$defs/b" }
				})
			).type.errors(`'"#/$defs/b"' is not assignable`)
		})

		it("in propertyNames", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					type: "object",
					// @ts-expect-error
					propertyNames: { $ref: "#/$defs/b" }
				})
			).type.errors(`'"#/$defs/b"' is not assignable`)
		})

		it("in a nested $defs entry", () => {
			attest(() =>
				inferred({
					$defs: {
						outer: {
							$defs: {
								// @ts-expect-error
								inner: { $ref: "#/$defs/missing" }
							}
						}
					}
				})
			).type.errors(`'"#/$defs/missing"' is not assignable`)
		})

		it("only the bad ref is reported", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					type: "object",
					properties: {
						ok: { $ref: "#/$defs/a" },
						// @ts-expect-error
						bad: { $ref: "#/$defs/b" },
						alsoOk: { $ref: "#" }
					}
				})
			).type.errors(/^Type '"#\/\$defs\/b"' is not assignable[^\n]*$/)
		})

		it("ref with siblings still checks the ref", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					type: "string",
					minLength: 1,
					// @ts-expect-error
					$ref: "#/$defs/b"
				})
			).type.errors(`'"#/$defs/b"' is not assignable`)
		})

		it("ref with siblings still checks the siblings", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					$ref: "#/$defs/a",
					// @ts-expect-error
					type: "strng"
				})
			).type.errors(`Did you mean '"string"'?`)
		})

		it("non-string $ref", () => {
			attest(() =>
				inferred({
					// @ts-expect-error
					$ref: 5
				})
			).type.errors.snap("Type 'number' is not assignable to type 'string'.")
		})

		it("non-schema $defs entry", () => {
			attest(() =>
				inferred({
					$defs: {
						// @ts-expect-error
						a: "string"
					}
				})
			).type.errors("JSON Schema must be an object or a boolean (was string)")
		})

		it("array $defs entry", () => {
			attest(() =>
				inferred({
					$defs: {
						// @ts-expect-error
						a: [{ type: "string" }]
					}
				})
			).type.errors("JSON Schema must be an object or a boolean (was array)")
		})

		it("valid refs of every kind pass", () => {
			const T = inferred({
				$defs: { a: { type: "string" } },
				definitions: { b: { type: "number" } },
				type: "object",
				properties: {
					root: { $ref: "#" },
					a: { $ref: "#/$defs/a" },
					b: { $ref: "#/definitions/b" },
					p: { $ref: "#/properties/a" },
					remote: { $ref: "https://example.com/x.json" },
					relative: { $ref: "x.json#/y" },
					anchor: { $ref: "#anchor" }
				},
				required: ["a", "b", "p"]
			})
			attest(T).type.errors(/^$/)
			attest<string>(T.a)
			attest<number>(T.b)
			attest<string>(T.p)
			attest<unknown>(T.remote)
		})

		it("a missing component ref suggests the escaped component names", () => {
			attest(() =>
				inferred({
					components: {
						schemas: {
							"a/b": { type: "string" },
							"c~d": { type: "string" },
							// @ts-expect-error
							Pet: { $ref: "#/components/schemas/nope" }
						}
					}
				})
			).type.errors(
				/^Type '"#\/components\/schemas\/nope"' is not assignable to type '(?=.*"#\/components\/schemas\/a~1b")(?=.*"#\/components\/schemas\/c~0d")(?=.*"#\/components\/schemas\/Pet")("#"|"[^"]*")( \| "[^"]*"){3}'/
			)
		})

		it("a component's $defs ref resolves against the document, not the component", () => {
			attest(() =>
				inferred({
					components: {
						schemas: {
							// @ts-expect-error
							Pet: { $defs: { a: { type: "string" } }, $ref: "#/$defs/a" }
						}
					}
				})
			).type.errors.snap(
				'Type \'"#/$defs/a"\' is not assignable to type \'"#" | "#/components/schemas/Pet"\'.'
			)
		})
	})

	describe("completions", () => {
		it("$defs names", () => {
			attest(() =>
				inferred({
					$defs: { node: { type: "string" }, leaf: { type: "number" } },
					// @ts-expect-error
					$ref: "#/$defs/"
				})
			).completions({ "#/$defs/": ["#/$defs/leaf", "#/$defs/node"] })
		})

		it("$defs and definitions together", () => {
			attest(() =>
				inferred({
					$defs: { a: { type: "string" } },
					definitions: { b: { type: "number" } },
					// @ts-expect-error
					$ref: "#/"
				})
			).completions({ "#/": ["#/$defs/a", "#/definitions/b"] })
		})

		it("escapes names containing /", () => {
			attest(() =>
				inferred({
					$defs: { "a/b": { type: "string" } },
					// @ts-expect-error
					$ref: "#/$defs/a"
				})
			).completions({ "#/$defs/a": ["#/$defs/a~1b"] })
		})

		it("numeric names", () => {
			attest(() =>
				inferred({
					$defs: { 1: { type: "string" } },
					// @ts-expect-error
					$ref: "#/$defs/"
				})
			).completions({ "#/$defs/": ["#/$defs/1"] })
		})

		it("component names", () => {
			attest(() =>
				inferred({
					components: {
						schemas: {
							Pet: { type: "string" },
							Owner: {
								type: "object",
								properties: {
									// @ts-expect-error
									pet: { $ref: "#/components/schemas/P" }
								}
							}
						}
					}
				})
			).completions({
				"#/components/schemas/P": ["#/components/schemas/Pet"]
			})
		})

		it("inside an embedded resource, only the resource's names", () => {
			attest(() =>
				inferred({
					$defs: {
						outer: { type: "number" },
						r: {
							$id: "https://example.com/r.json",
							$defs: { inner: { type: "string" } },
							type: "object",
							properties: {
								// @ts-expect-error
								a: { $ref: "#/$defs/" }
							}
						}
					}
				})
			).completions({ "#/$defs/": ["#/$defs/inner"] })
		})
	})

	describe("real world", () => {
		it("definitions-heavy config document", () => {
			type Config = {
				name: string
				version?: string
				scripts?: { [k: string]: string }
				dependencies?: { [k: string]: string }
				devDependencies?: { [k: string]: string }
				workspaces?: string[] | { packages?: string[] }
				author?: string | Person
				contributors?: (string | Person)[]
			}
			type Person = { name: string; email?: string; url?: string }
			const T = inferred({
				$schema: "http://json-schema.org/draft-07/schema#",
				title: "package-ish",
				definitions: {
					person: {
						description: "A person who has been involved in the project",
						anyOf: [
							{ type: "string" },
							{
								type: "object",
								properties: {
									name: { type: "string" },
									email: { type: "string", format: "email" },
									url: { type: "string", format: "uri" }
								},
								required: ["name"]
							}
						]
					},
					dependency: {
						type: "object",
						additionalProperties: { type: "string" }
					},
					scriptsMap: {
						type: "object",
						additionalProperties: { type: "string" }
					}
				},
				type: "object",
				properties: {
					name: { type: "string", maxLength: 214 },
					version: { type: "string" },
					scripts: { $ref: "#/definitions/scriptsMap" },
					dependencies: { $ref: "#/definitions/dependency" },
					devDependencies: { $ref: "#/definitions/dependency" },
					workspaces: {
						anyOf: [
							{ type: "array", items: { type: "string" } },
							{
								type: "object",
								properties: {
									packages: { type: "array", items: { type: "string" } }
								}
							}
						]
					},
					author: { $ref: "#/definitions/person" },
					contributors: {
						type: "array",
						items: { $ref: "#/definitions/person" }
					}
				},
				required: ["name"]
			})
			attest<Config>(T).type.toString.snap(`{
	name: string
	version?: string
	scripts?: { [x: string]: string }
	dependencies?: { [x: string]: string }
	devDependencies?: { [x: string]: string }
	workspaces?: string[] | { packages?: string[] }
	author?:
		| string
		| { name: string; email?: string; url?: string }
	contributors?: (
		| string
		| { name: string; email?: string; url?: string }
	)[]
}`)
		})

		it("file system tree", () => {
			type Entry = File | Dir
			type File = { type: "file"; name: string; size: number }
			type Dir = { type: "dir"; name: string; entries: Entry[] }
			const T = inferred({
				$defs: {
					entry: {
						oneOf: [{ $ref: "#/$defs/file" }, { $ref: "#/$defs/dir" }]
					},
					file: {
						type: "object",
						properties: {
							type: { const: "file" },
							name: { type: "string" },
							size: { type: "integer", minimum: 0 }
						},
						required: ["type", "name", "size"],
						additionalProperties: false
					},
					dir: {
						type: "object",
						properties: {
							type: { const: "dir" },
							name: { type: "string" },
							entries: {
								type: "array",
								items: { $ref: "#/$defs/entry" }
							}
						},
						required: ["type", "name", "entries"],
						additionalProperties: false
					}
				},
				$ref: "#/$defs/entry"
			})
			attest<Entry>(T).type.toString
				.snap(`	| { type: "file"; name: string; size: number }
	| {
			type: "dir"
			name: string
			entries: (
				| { type: "file"; name: string; size: number }
				| cyclic
			)[]
	  }`)
		})

		it("oneOf of thirty $defs", () => {
			const schema = {
				$defs: {
					e0: {
						type: "object",
						properties: { kind: { const: "e0" } },
						required: ["kind"]
					},
					e1: {
						type: "object",
						properties: { kind: { const: "e1" } },
						required: ["kind"]
					},
					e2: {
						type: "object",
						properties: { kind: { const: "e2" } },
						required: ["kind"]
					},
					e3: {
						type: "object",
						properties: { kind: { const: "e3" } },
						required: ["kind"]
					},
					e4: {
						type: "object",
						properties: { kind: { const: "e4" } },
						required: ["kind"]
					},
					e5: {
						type: "object",
						properties: { kind: { const: "e5" } },
						required: ["kind"]
					},
					e6: {
						type: "object",
						properties: { kind: { const: "e6" } },
						required: ["kind"]
					},
					e7: {
						type: "object",
						properties: { kind: { const: "e7" } },
						required: ["kind"]
					},
					e8: {
						type: "object",
						properties: { kind: { const: "e8" } },
						required: ["kind"]
					},
					e9: {
						type: "object",
						properties: { kind: { const: "e9" } },
						required: ["kind"]
					},
					e10: {
						type: "object",
						properties: { kind: { const: "e10" } },
						required: ["kind"]
					},
					e11: {
						type: "object",
						properties: { kind: { const: "e11" } },
						required: ["kind"]
					},
					e12: {
						type: "object",
						properties: { kind: { const: "e12" } },
						required: ["kind"]
					},
					e13: {
						type: "object",
						properties: { kind: { const: "e13" } },
						required: ["kind"]
					},
					e14: {
						type: "object",
						properties: { kind: { const: "e14" } },
						required: ["kind"]
					},
					e15: {
						type: "object",
						properties: { kind: { const: "e15" } },
						required: ["kind"]
					},
					e16: {
						type: "object",
						properties: { kind: { const: "e16" } },
						required: ["kind"]
					},
					e17: {
						type: "object",
						properties: { kind: { const: "e17" } },
						required: ["kind"]
					},
					e18: {
						type: "object",
						properties: { kind: { const: "e18" } },
						required: ["kind"]
					},
					e19: {
						type: "object",
						properties: { kind: { const: "e19" } },
						required: ["kind"]
					},
					e20: {
						type: "object",
						properties: { kind: { const: "e20" } },
						required: ["kind"]
					},
					e21: {
						type: "object",
						properties: { kind: { const: "e21" } },
						required: ["kind"]
					},
					e22: {
						type: "object",
						properties: { kind: { const: "e22" } },
						required: ["kind"]
					},
					e23: {
						type: "object",
						properties: { kind: { const: "e23" } },
						required: ["kind"]
					},
					e24: {
						type: "object",
						properties: { kind: { const: "e24" } },
						required: ["kind"]
					},
					e25: {
						type: "object",
						properties: { kind: { const: "e25" } },
						required: ["kind"]
					},
					e26: {
						type: "object",
						properties: { kind: { const: "e26" } },
						required: ["kind"]
					},
					e27: {
						type: "object",
						properties: { kind: { const: "e27" } },
						required: ["kind"]
					},
					e28: {
						type: "object",
						properties: { kind: { const: "e28" } },
						required: ["kind"]
					},
					e29: {
						type: "object",
						properties: { kind: { const: "e29" } },
						required: ["kind"]
					}
				},
				type: "object",
				properties: {
					events: {
						type: "array",
						items: {
							oneOf: [
								{ $ref: "#/$defs/e0" },
								{ $ref: "#/$defs/e1" },
								{ $ref: "#/$defs/e2" },
								{ $ref: "#/$defs/e3" },
								{ $ref: "#/$defs/e4" },
								{ $ref: "#/$defs/e5" },
								{ $ref: "#/$defs/e6" },
								{ $ref: "#/$defs/e7" },
								{ $ref: "#/$defs/e8" },
								{ $ref: "#/$defs/e9" },
								{ $ref: "#/$defs/e10" },
								{ $ref: "#/$defs/e11" },
								{ $ref: "#/$defs/e12" },
								{ $ref: "#/$defs/e13" },
								{ $ref: "#/$defs/e14" },
								{ $ref: "#/$defs/e15" },
								{ $ref: "#/$defs/e16" },
								{ $ref: "#/$defs/e17" },
								{ $ref: "#/$defs/e18" },
								{ $ref: "#/$defs/e19" },
								{ $ref: "#/$defs/e20" },
								{ $ref: "#/$defs/e21" },
								{ $ref: "#/$defs/e22" },
								{ $ref: "#/$defs/e23" },
								{ $ref: "#/$defs/e24" },
								{ $ref: "#/$defs/e25" },
								{ $ref: "#/$defs/e26" },
								{ $ref: "#/$defs/e27" },
								{ $ref: "#/$defs/e28" },
								{ $ref: "#/$defs/e29" }
							]
						}
					}
				},
				required: ["events"]
			} as const
			attest(() => inferred(schema)).type.errors(/^$/)
			type Event =
				| { kind: "e0" }
				| { kind: "e1" }
				| { kind: "e2" }
				| { kind: "e3" }
				| { kind: "e4" }
				| { kind: "e5" }
				| { kind: "e6" }
				| { kind: "e7" }
				| { kind: "e8" }
				| { kind: "e9" }
				| { kind: "e10" }
				| { kind: "e11" }
				| { kind: "e12" }
				| { kind: "e13" }
				| { kind: "e14" }
				| { kind: "e15" }
				| { kind: "e16" }
				| { kind: "e17" }
				| { kind: "e18" }
				| { kind: "e19" }
				| { kind: "e20" }
				| { kind: "e21" }
				| { kind: "e22" }
				| { kind: "e23" }
				| { kind: "e24" }
				| { kind: "e25" }
				| { kind: "e26" }
				| { kind: "e27" }
				| { kind: "e28" }
				| { kind: "e29" }
			attest<{ events: Event[] }>(inferred(schema))
		})

		it("arktype's cyclic scope", () => {
			// scope({ user: { name: "string", "friends?": "user[]", "best?": "user | null" } }).export().user.toJsonSchema()
			type User = { name: string; best?: User | null; friends?: User[] }
			const T = inferred({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				$ref: "#/$defs/intersection216",
				$defs: {
					intersection216: {
						type: "object",
						properties: {
							name: { type: "string" },
							best: { $ref: "#/$defs/union33" },
							friends: { $ref: "#/$defs/intersection214" }
						},
						required: ["name"]
					},
					union33: {
						anyOf: [{ $ref: "#/$defs/intersection216" }, { type: "null" }]
					},
					intersection214: {
						type: "array",
						items: { $ref: "#/$defs/intersection216" }
					}
				}
			})
			attest<User>(T).type.toString.snap(`{
	name: string
	best?: cyclic | null
	friends?: cyclic[]
}`)
			attest<string | undefined>(
				T.friends?.[0].best?.friends?.[0].best?.friends?.[0].name
			)
		})
	})
})
