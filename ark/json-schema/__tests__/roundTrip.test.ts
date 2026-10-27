import { attest, contextualize, getChecker } from "@ark/attest"
import { arkToArbitrary } from "@ark/fast-check/internal/arktypeFastCheck.ts"
import { jsonSchemaToType } from "@ark/json-schema"
import { scope, type, type JsonSchema } from "arktype"
import { anything, sample } from "fast-check"
import { inferred } from "./utils.ts"

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

contextualize(() => {
	describe("literals and enums", () => {
		it("never", () => {
			const T = type("never")
			const S = inferred({ enum: [] })
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap("never")
		})

		it("string enum", () => {
			const T = type("'a'|'b'|'c'")
			const S = inferred({ type: "string", enum: ["a", "b", "c"] })
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap('"a" | "b" | "c"')
		})

		it("mixed literals and null", () => {
			const T = type("'a'|1|true|null")
			const S = inferred({
				anyOf: [{ enum: ["a", 1, true] }, { type: "null" }]
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap('"a" | 1 | true | null')
		})
	})

	describe("unions", () => {
		it("discriminated object union", () => {
			const T = type({ kind: "'a'", a: "string" }).or({
				kind: "'b'",
				b: "number"
			})
			const S = inferred({
				anyOf: [
					{
						type: "object",
						properties: {
							a: { type: "string" },
							kind: { type: "string", const: "a" }
						},
						required: ["a", "kind"]
					},
					{
						type: "object",
						properties: {
							b: { type: "number" },
							kind: { type: "string", const: "b" }
						},
						required: ["b", "kind"]
					}
				]
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap(
				'{ a: string; kind: "a" } | { b: number; kind: "b" }'
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
					{ type: "string", const: "a" },
					{ type: "number", const: 1 },
					{ type: "null" }
				]
			})
			assertEmits(T, S)
			attest<typeof T.infer>(S).type.toString.snap(
				'"a" | 1 | { x: string } | null'
			)
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

		it("empty tuple", () => {
			// maxItems doesn't narrow, so this widens arktype's [] to unknown[]
			const T = type([])
			const S = inferred({ type: "array", minItems: 0, maxItems: 0 })
			assertEmits(T, S)
			attest<unknown[]>(S).type.toString.snap("unknown[]")
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

		it("closed empty object", () => {
			const T = type({ "+": "reject" })
			const S = inferred({
				type: "object",
				properties: {},
				additionalProperties: false
			})
			assertEmits(T, S)
			// arktype infers {}, which also allows primitives; object is the sound type here
			attest<object>(S).type.toString.snap("object")
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
					enum: { type: "string", const: "x" },
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
			assertEmits(T, S, {}, "{ [//]: number, a: number }")
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
	})

	describe("useRefs", () => {
		it("nested objects", () => {
			const T = type({
				user: { name: "string", "address?": { city: "string", zip: "string" } }
			})
			const S = inferred({
				$ref: "#/$defs/intersection",
				$defs: {
					intersection: {
						type: "object",
						properties: { user: { $ref: "#/$defs/intersection2" } },
						required: ["user"]
					},
					intersection2: {
						type: "object",
						properties: {
							name: { type: "string" },
							address: { $ref: "#/$defs/intersection3" }
						},
						required: ["name"]
					},
					intersection3: {
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

		it("primitive without $defs", () => {
			const T = type("string").describe("a name")
			const S = inferred({ type: "string", description: "a name" })
			assertEmits(T, S, { useRefs: true })
			attest<typeof T.infer>(S).type.toString.snap("string")
		})
	})

	describe("cyclic", () => {
		it("tree", () => {
			const T = cyclic.tree
			const S = inferred({
				$ref: "#/$defs/tree",
				$defs: {
					tree: {
						type: "object",
						properties: {
							value: { type: "number" },
							children: { type: "array", items: { $ref: "#/$defs/tree" } }
						},
						required: ["value"]
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
				$ref: "#/$defs/a",
				$defs: {
					b: {
						type: "object",
						properties: { a: { type: "array", items: { $ref: "#/$defs/a" } } }
					},
					a: {
						type: "object",
						properties: { b: { $ref: "#/$defs/b" } }
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
				$ref: "#/$defs/linked",
				$defs: {
					linked: {
						type: "object",
						properties: {
							next: { anyOf: [{ $ref: "#/$defs/linked" }, { type: "null" }] },
							value: { type: "string" }
						},
						required: ["next", "value"]
					}
				}
			})
			assertEmits(T, S, {}, "{ next: synthetic0 | null, value: string }")
			attest<typeof T.infer>(S).type.toString.snap(
				"{ next: cyclic | null; value: string }"
			)
			attest<string | undefined>(S.next?.next?.value)
		})

		it("array of itself", () => {
			const T = cyclic.nested
			const S = inferred({
				$ref: "#/$defs/nested",
				$defs: {
					nested: {
						type: "array",
						items: { anyOf: [{ type: "number" }, { $ref: "#/$defs/nested" }] }
					}
				}
			})
			assertEmits(T, S, {}, "(synthetic0 | number)[]")
			attest<typeof T.infer | number>(S[0])
			// tsrs predates microsoft/TypeScript#64556, so it prints recursive arrays deeper
			if (getChecker() !== "tsrs") {
				attest<typeof T.infer>(S).type.toString.snap("(number | cyclic)[]")
				// arktype's own display of the same type, for comparison
				attest({} as typeof T.infer).type.toString.snap("(number | cyclic)[]")
			}
		})

		it("cyclic optional tuple element", () => {
			const T = pair
			// TS can't defer a tuple, so the recursive element is unknown
			const S = inferred({
				$ref: "#/$defs/pair",
				$defs: {
					pair: {
						type: "array",
						minItems: 1,
						prefixItems: [{ type: "string" }, { $ref: "#/$defs/pair" }],
						items: false
					}
				}
			})
			assertEmits(T, S, {}, "[string?, synthetic0?] >= 1")
			attest<[string, unknown?]>(S).type.toString.snap("[string, unknown?]")
		})
	})

	describe("emitted schemas read back to the same set", () => {
		const Never = type("never")
		const convertible: type.Any[] = [
			Never,
			type("'a' | 1 | true | null"),
			type("string[]").or({ a: "string" }),
			type({ kind: "'a'", a: "string" }).or({ kind: "'b'", b: "number" }),
			type("number % 5"),
			type("0 <= number.integer < 10"),
			type("1 <= string <= 10"),
			type("string.email"),
			type("1 <= (string | number)[] <= 5"),
			type([]),
			type(["string", "number"]),
			type(["string", "number?"]),
			type(["string?", "number?"]),
			type(["string", "boolean?", "...", "number[]"]),
			type(["unknown", "unknown[]"]),
			type({ name: "string", "age?": "number" }),
			type({ "+": "reject", a: "string" }),
			type({ "a-b": "string", "c d?": "number", "0": "boolean" }),
			type({ a: "string = 'x'", b: "number" }),
			type({ "[string]": "number", a: "number" }),
			type({ "[/^x-/]": "string", "[string]": "number" } as never),
			...Object.values(cyclic),
			pair
		]

		const membersOf = new Map(
			convertible.map(T => [
				T,
				T === Never ? [] : sample(arkToArbitrary(T), { numRuns: 20, seed: 1 })
			])
		)

		// every Type's members are near misses for the others
		const pool = [
			...[...membersOf.values()].flat(),
			...sample(anything(), { numRuns: 100, seed: 1 })
		]

		for (const target of ["draft-2020-12", "draft-07"] as const) {
			it(target, () => {
				for (const T of convertible) {
					const read = jsonSchemaToType(T.toJsonSchema({ target }) as never)
					// JSON Schema's object type excludes the arrays an arktype object
					// allows, so only the plain members generated are checked
					attest({
						type: T.expression,
						rejectedMembers: membersOf.get(T)!.filter(v => !read.allows(v)),
						allowedNonMembers: pool.filter(v => read.allows(v) && !T.allows(v))
					}).equals({
						type: T.expression,
						rejectedMembers: [],
						allowedNonMembers: []
					})
				}
			})
		}
	})
})
