import { attest, contextualize, getChecker } from "@ark/attest"
import type { jsonSchema } from "@ark/json-schema"
import { inferred } from "./utils.ts"

contextualize(() => {
	describe("resolution", () => {
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

		it("def names that aren't pointer segments", () => {
			attest(
				inferred({ $defs: { "": { type: "string" } }, $ref: "#/$defs/" })
			).type.toString.snap("string")
			attest(
				inferred({ $defs: { 1: { type: "string" } }, $ref: "#/$defs/1" })
			).type.toString.snap("string")
		})

		it("pointers to non-schemas", () => {
			attest<
				{ a: unknown; b: unknown; c: unknown; d?: string },
				jsonSchema.infer<{
					type: "object"
					properties: {
						a: { $ref: "#/required/0" }
						b: { $ref: "#/type" }
						c: { $ref: "#/properties/d/allOf" }
						d: { allOf: [{ type: "string" }] }
					}
					required: ["a", "b", "c"]
				}>
			>()
		})

		it("escapes", () => {
			// ~01 decodes to ~1, not /
			attest(
				inferred({
					$defs: { "a~1b": { type: "string" }, "a/b": { type: "number" } },
					$ref: "#/$defs/a~01b"
				})
			).type.toString.snap("string")
			// an unescaped / reaches a nested def
			attest(
				inferred({
					$defs: {
						a: { $defs: { b: { type: "number" } } },
						"a/b": { type: "string" }
					},
					$ref: "#/$defs/a/$defs/b"
				})
			).type.toString.snap("number")
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
			attest({} as Long).type.toString.snap("string")
		})

		it("percent-encoded refs aren't decoded", () => {
			attest(
				inferred({
					$defs: { "a%20b": { type: "string" }, "a b": { type: "number" } },
					$ref: "#/$defs/a%20b"
				})
			).type.toString.snap("unknown")
		})

		it("boolean targets", () => {
			attest(
				inferred({ $defs: { t: true }, $ref: "#/$defs/t" })
			).type.toString.snap("unknown")
			attest(
				inferred({ $defs: { f: false }, $ref: "#/$defs/f", type: "string" })
			).type.toString.snap("never")
		})

		it("unresolved refs", () => {
			attest(
				inferred({
					$defs: { s: { $anchor: "str", type: "string" } },
					$ref: "#str"
				})
			).type.toString.snap("unknown")
			attest(
				inferred({ $ref: "https://example.com/schema.json", type: "string" })
			).type.toString.snap("string")
		})

		it("widened and hand-written refs", () => {
			attest<
				unknown,
				jsonSchema.infer<{ $ref: string; $defs: { s: { type: "string" } } }>
			>()
			attest<
				string | number,
				jsonSchema.infer<{
					$ref: "#/$defs/s" | "#/$defs/n"
					$defs: { s: { type: "string" }; n: { type: "number" } }
				}>
			>()
			attest(
				{} as jsonSchema.infer<{
					$defs: { a: { $ref: "#/$defs/w" }; w: any }
					$ref: "#/$defs/a"
				}>
			).type.toString.snap("any")
		})

		it("pointer into a widened array infers its element", () => {
			attest(
				{} as jsonSchema.infer<{
					$defs: { a: { allOf: { type: "string" }[] } }
					$ref: "#/$defs/a/allOf/0"
				}>
			).type.toString.snap("string")
			attest(
				{} as jsonSchema.infer<{
					$defs: {
						a: { allOf: [{ type: "string" }, ...{ type: "number" }[]] }
					}
					$ref: "#/$defs/a/allOf/3"
				}>
			).type.toString.snap("string | number")
		})

		it("pointer through a widened definition infers unknown", () => {
			attest(
				{} as jsonSchema.infer<{
					$defs: { a: Record<string, unknown> }
					$ref: "#/$defs/a/properties/x"
				}>
			).type.toString.snap("unknown")
		})
	})

	describe("chains and siblings", () => {
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
			attest(T).type.toString.snap("{ c?: number; d: number }")
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
			attest(T).type.toString.snap('"x"')
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
			attest(T).type.toString.snap("{ b?: number; a: unknown } | { a: string }")
		})

		it("enum", () => {
			const T = inferred({
				$defs: { s: { type: "string" } },
				$ref: "#/$defs/s",
				enum: ["a", "b", 1, null]
			})
			attest(T).type.toString.snap('"a" | "b"')
		})
	})

	describe("cycles", () => {
		it("shallow cycles infer unknown", () => {
			attest(inferred({ $ref: "#" })).type.toString.snap("unknown")
			attest(
				inferred({
					$defs: { a: { $ref: "#/$defs/a", type: "string" } },
					$ref: "#/$defs/a"
				})
			).type.toString.snap("string")
			const anyOf = { anyOf: [{ $ref: "#" }, { type: "string" }] } as const
			attest(() => inferred(anyOf)).type.errors(/^$/)
			attest(inferred(anyOf)).type.toString.snap("unknown")
			const allOf = { allOf: [{ $ref: "#" }, { type: "string" }] } as const
			attest(() => inferred(allOf)).type.errors(/^$/)
			attest(inferred(allOf)).type.toString.snap("string")
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

		it("recursive key in the base and an anyOf branch", () => {
			const schema = {
				type: "object",
				properties: { next: { $ref: "#" }, v: { type: "number" } },
				anyOf: [{ properties: { next: { $ref: "#" } } }, { required: ["v"] }]
			} as const
			type T = jsonSchema.infer<typeof schema>
			const list: T = {
				v: 1,
				next: { v: 1, next: { v: 1, next: { v: 1, next: { v: 1 } } } }
			}
			attest<number | undefined>(list.next?.next?.next?.v)
			attest({} as T).type.toString(/^[^<]*$/)
			attest(() => {
				// @ts-expect-error
				const invalid: T = { next: { next: { next: { v: "x" } } } }
				return invalid
			}).type.errors(/not assignable to type 'number'/)
		})

		it("through an anyOf of a string and an array of the root", () => {
			type T = jsonSchema.infer<{
				anyOf: [{ type: "string" }, { type: "array"; items: { $ref: "#" } }]
			}>
			attest(() => {
				const t: T = [[[[[[[[[[[[[[[[[[[["s"]]]]]]]]]]]]]]]]]]]]
				return t
			}).type.errors.is("")
			// tsrs predates microsoft/TypeScript#64556, so it prints recursive arrays deeper
			if (getChecker() !== "tsrs") {
				attest(() => {
					// @ts-expect-error
					const bad: T = [[[[[[[[[[[[[[[[[[[[1]]]]]]]]]]]]]]]]]]]]
					return bad
				}).type.errors.snap(
					"Type 'number' is not assignable to type 'string | (string | ...)[]'."
				)
			}
		})
	})

	describe("eager ref graphs", () => {
		type range<n extends number, acc extends number[] = []> =
			acc["length"] extends n ? acc[number] : range<n, [...acc, acc["length"]]>
		type next<n extends number, acc extends 1[] = []> =
			acc["length"] extends n ? [...acc, 1]["length"] & number
			:	next<n, [...acc, 1]>

		it("deep cycle across anyOf, allOf and oneOf", () => {
			const T = inferred({
				$defs: {
					a: { anyOf: [{ $ref: "#/$defs/b" }, { type: "null" }] },
					b: { allOf: [{ $ref: "#/$defs/c" }] },
					c: { oneOf: [{ $ref: "#/$defs/a" }, { type: "string" }] }
				},
				$ref: "#/$defs/a"
			})
			attest(T).type.toString.snap("unknown")
		})

		it("cycle through dependentSchemas is ignored", () => {
			const T = inferred({
				type: "object",
				dependentSchemas: { a: { $ref: "#" } },
				properties: { a: { type: "string" } }
			})
			attest(T).type.toString.snap("{ a?: string }")
		})

		it("ref chain two hundred deep", () => {
			type T = jsonSchema.infer<{
				$defs: {
					[k in range<200> as `d${k}`]: k extends 199 ? { type: "string" }
					:	{ $ref: `#/$defs/d${next<k>}` }
				}
				$ref: "#/$defs/d0"
			}>
			attest<string, T>()
		})

		it("forty-hop chain with sibling properties", () => {
			// prettier-ignore
			const T = inferred({ $defs: { d0: { $ref: "#/$defs/d1", properties: { a: { type: "number" } } }, d1: { $ref: "#/$defs/d2", properties: { a: { type: "number" } } }, d2: { $ref: "#/$defs/d3", properties: { a: { type: "number" } } }, d3: { $ref: "#/$defs/d4", properties: { a: { type: "number" } } }, d4: { $ref: "#/$defs/d5", properties: { a: { type: "number" } } }, d5: { $ref: "#/$defs/d6", properties: { a: { type: "number" } } }, d6: { $ref: "#/$defs/d7", properties: { a: { type: "number" } } }, d7: { $ref: "#/$defs/d8", properties: { a: { type: "number" } } }, d8: { $ref: "#/$defs/d9", properties: { a: { type: "number" } } }, d9: { $ref: "#/$defs/d10", properties: { a: { type: "number" } } }, d10: { $ref: "#/$defs/d11", properties: { a: { type: "number" } } }, d11: { $ref: "#/$defs/d12", properties: { a: { type: "number" } } }, d12: { $ref: "#/$defs/d13", properties: { a: { type: "number" } } }, d13: { $ref: "#/$defs/d14", properties: { a: { type: "number" } } }, d14: { $ref: "#/$defs/d15", properties: { a: { type: "number" } } }, d15: { $ref: "#/$defs/d16", properties: { a: { type: "number" } } }, d16: { $ref: "#/$defs/d17", properties: { a: { type: "number" } } }, d17: { $ref: "#/$defs/d18", properties: { a: { type: "number" } } }, d18: { $ref: "#/$defs/d19", properties: { a: { type: "number" } } }, d19: { $ref: "#/$defs/d20", properties: { a: { type: "number" } } }, d20: { $ref: "#/$defs/d21", properties: { a: { type: "number" } } }, d21: { $ref: "#/$defs/d22", properties: { a: { type: "number" } } }, d22: { $ref: "#/$defs/d23", properties: { a: { type: "number" } } }, d23: { $ref: "#/$defs/d24", properties: { a: { type: "number" } } }, d24: { $ref: "#/$defs/d25", properties: { a: { type: "number" } } }, d25: { $ref: "#/$defs/d26", properties: { a: { type: "number" } } }, d26: { $ref: "#/$defs/d27", properties: { a: { type: "number" } } }, d27: { $ref: "#/$defs/d28", properties: { a: { type: "number" } } }, d28: { $ref: "#/$defs/d29", properties: { a: { type: "number" } } }, d29: { $ref: "#/$defs/d30", properties: { a: { type: "number" } } }, d30: { $ref: "#/$defs/d31", properties: { a: { type: "number" } } }, d31: { $ref: "#/$defs/d32", properties: { a: { type: "number" } } }, d32: { $ref: "#/$defs/d33", properties: { a: { type: "number" } } }, d33: { $ref: "#/$defs/d34", properties: { a: { type: "number" } } }, d34: { $ref: "#/$defs/d35", properties: { a: { type: "number" } } }, d35: { $ref: "#/$defs/d36", properties: { a: { type: "number" } } }, d36: { $ref: "#/$defs/d37", properties: { a: { type: "number" } } }, d37: { $ref: "#/$defs/d38", properties: { a: { type: "number" } } }, d38: { $ref: "#/$defs/d39", properties: { a: { type: "number" } } }, d39: { $ref: "#/$defs/d40", properties: { a: { type: "number" } } }, d40: { type: "string" } }, $ref: "#/$defs/d0" })
			attest(T).type.toString.snap("string")
		})

		it("acyclic diamond chain of anyOf refs", () => {
			// prettier-ignore
			const dag = { $defs: { d0: { anyOf: [{ $ref: "#/$defs/d1" }, { $ref: "#/$defs/d2" }] }, d1: { anyOf: [{ $ref: "#/$defs/d2" }, { $ref: "#/$defs/d3" }] }, d2: { anyOf: [{ $ref: "#/$defs/d3" }, { $ref: "#/$defs/d4" }] }, d3: { anyOf: [{ $ref: "#/$defs/d4" }, { $ref: "#/$defs/d5" }] }, d4: { anyOf: [{ $ref: "#/$defs/d5" }, { $ref: "#/$defs/d6" }] }, d5: { anyOf: [{ $ref: "#/$defs/d6" }, { $ref: "#/$defs/d7" }] }, d6: { anyOf: [{ $ref: "#/$defs/d7" }, { $ref: "#/$defs/d8" }] }, d7: { anyOf: [{ $ref: "#/$defs/d8" }, { $ref: "#/$defs/d9" }] }, d8: { anyOf: [{ $ref: "#/$defs/d9" }, { $ref: "#/$defs/d10" }] }, d9: { anyOf: [{ $ref: "#/$defs/d10" }, { $ref: "#/$defs/d11" }] }, d10: { anyOf: [{ $ref: "#/$defs/d11" }, { $ref: "#/$defs/d12" }] }, d11: { anyOf: [{ $ref: "#/$defs/d12" }, { $ref: "#/$defs/d13" }] }, d12: { anyOf: [{ $ref: "#/$defs/d13" }, { $ref: "#/$defs/d14" }] }, d13: { anyOf: [{ $ref: "#/$defs/d14" }, { $ref: "#/$defs/d15" }] }, d14: { anyOf: [{ $ref: "#/$defs/d15" }, { $ref: "#/$defs/d16" }] }, d15: { anyOf: [{ $ref: "#/$defs/d16" }, { $ref: "#/$defs/d17" }] }, d16: { anyOf: [{ $ref: "#/$defs/d17" }, { $ref: "#/$defs/d18" }] }, d17: { anyOf: [{ $ref: "#/$defs/d18" }, { $ref: "#/$defs/d19" }] }, d18: { anyOf: [{ $ref: "#/$defs/d19" }, { $ref: "#/$defs/d20" }] }, d19: { anyOf: [{ $ref: "#/$defs/d20" }, { $ref: "#/$defs/d21" }] }, d20: { anyOf: [{ $ref: "#/$defs/d21" }, { $ref: "#/$defs/d22" }] }, d21: { anyOf: [{ $ref: "#/$defs/d22" }, { $ref: "#/$defs/d23" }] }, d22: { anyOf: [{ $ref: "#/$defs/d23" }, { $ref: "#/$defs/d24" }] }, d23: { type: "string" }, d24: { type: "string" } }, $ref: "#/$defs/d0" } as const
			type Dag = jsonSchema.infer<typeof dag>
			attest({} as Dag).type.toString.snap("string")
		})

		it("cycle through a diamond chain of allOf refs", () => {
			// prettier-ignore
			type Cyclic = jsonSchema.infer<{ $defs: { d0: { allOf: [{ $ref: "#/$defs/d1" }, { $ref: "#/$defs/d2" }] }; d1: { allOf: [{ $ref: "#/$defs/d2" }, { $ref: "#/$defs/d3" }] }; d2: { allOf: [{ $ref: "#/$defs/d3" }, { $ref: "#/$defs/d4" }] }; d3: { allOf: [{ $ref: "#/$defs/d4" }, { $ref: "#/$defs/d5" }] }; d4: { allOf: [{ $ref: "#/$defs/d5" }, { $ref: "#/$defs/d6" }] }; d5: { allOf: [{ $ref: "#/$defs/d6" }, { $ref: "#/$defs/d7" }] }; d6: { allOf: [{ $ref: "#/$defs/d7" }, { $ref: "#/$defs/d8" }] }; d7: { allOf: [{ $ref: "#/$defs/d8" }, { $ref: "#/$defs/d9" }] }; d8: { allOf: [{ $ref: "#/$defs/d9" }, { $ref: "#/$defs/d10" }] }; d9: { allOf: [{ $ref: "#/$defs/d10" }, { $ref: "#/$defs/d11" }] }; d10: { allOf: [{ $ref: "#/$defs/d11" }, { $ref: "#/$defs/d12" }] }; d11: { allOf: [{ $ref: "#/$defs/d12" }, { $ref: "#/$defs/d13" }] }; d12: { allOf: [{ $ref: "#/$defs/d13" }, { $ref: "#/$defs/d14" }] }; d13: { allOf: [{ $ref: "#/$defs/d14" }, { $ref: "#/$defs/d15" }] }; d14: { allOf: [{ $ref: "#/$defs/d15" }, { $ref: "#/$defs/d16" }] }; d15: { allOf: [{ $ref: "#/$defs/d16" }, { $ref: "#/$defs/d17" }] }; d16: { allOf: [{ $ref: "#/$defs/d17" }, { $ref: "#/$defs/d18" }] }; d17: { allOf: [{ $ref: "#/$defs/d18" }, { $ref: "#/$defs/d19" }] }; d18: { allOf: [{ $ref: "#/$defs/d19" }, { $ref: "#/$defs/d20" }] }; d19: { allOf: [{ $ref: "#/$defs/d20" }, { $ref: "#/$defs/d21" }] }; d20: { allOf: [{ $ref: "#/$defs/d21" }, { $ref: "#/$defs/d22" }] }; d21: { allOf: [{ $ref: "#/$defs/d22" }, { $ref: "#/$defs/d23" }] }; d22: { allOf: [{ $ref: "#/$defs/d23" }, { $ref: "#/$defs/d24" }] }; d23: { type: "string" }; d24: { allOf: [{ $ref: "#/$defs/d0" }, { type: "string" }] } }; $ref: "#/$defs/d0" }>
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
			attest(T).type.toString.snap("string")
		})

		it("allOf DAG of refs thirty deep", () => {
			// each definition is reached through two paths, which TS used to
			// relate and copy declarations for exponentially often
			type T = jsonSchema.infer<{
				$defs: {
					[i in range<30> as `d${i}`]: i extends 28 | 29 ?
						{
							type: "object"
							properties: { [_ in `k${i}`]: { type: "string" } }
						}
					:	{
							allOf: [
								{ $ref: `#/$defs/d${next<i>}` },
								{ $ref: `#/$defs/d${next<next<i>>}` },
								{
									type: "object"
									properties: { [_ in `k${i}`]: { type: "string" } }
								}
							]
						}
				}
				$ref: "#/$defs/d0"
			}>
			attest<{ [k in `k${range<30>}`]?: string }, T>()
		})

		it("oneOf of a hundred refs", () => {
			type refs<acc extends unknown[]> =
				acc["length"] extends 100 ? acc
				:	refs<[...acc, { $ref: `#/$defs/d${acc["length"]}` }]>
			type T = jsonSchema.infer<{
				$defs: {
					[k in range<100> as `d${k}`]: {
						type: "object"
						properties: { kind: { const: k } }
						required: ["kind"]
					}
				}
				oneOf: refs<[]>
			}>
			attest<{ [k in range<100>]: { kind: k } }[range<100>], T>()
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

	describe("values beside refs", () => {
		// a hand-written schema type with recursive optional subschemas (like
		// JSONSchema7), which is widened and infers unknown
		interface HandWrittenSchema {
			$ref?: string
			type?: "string" | "number" | "object" | "array"
			allOf?: HandWrittenSchema[]
			items?: HandWrittenSchema
			properties?: { [k: string]: HandWrittenSchema }
		}

		it("not const object beside a ref", () => {
			type T = jsonSchema.infer<{
				$defs: { o: { enum: [{ a: 1; b: 2 }, "x"] } }
				$ref: "#/$defs/o"
				not: { const: { a: 1 } }
			}>
			attest({} as T).type.toString.snap('"x" | { a: 1; b: 2 }')
		})

		it("thirteen tuple defs each excluding a constant", () => {
			// prettier-ignore
			type T = jsonSchema.infer<{ $defs: { d0: { type: "array"; prefixItems: [{ $ref: "#/$defs/d1" }]; not: { const: [1] } }; d1: { type: "array"; prefixItems: [{ $ref: "#/$defs/d2" }]; not: { const: [1] } }; d2: { type: "array"; prefixItems: [{ $ref: "#/$defs/d3" }]; not: { const: [1] } }; d3: { type: "array"; prefixItems: [{ $ref: "#/$defs/d4" }]; not: { const: [1] } }; d4: { type: "array"; prefixItems: [{ $ref: "#/$defs/d5" }]; not: { const: [1] } }; d5: { type: "array"; prefixItems: [{ $ref: "#/$defs/d6" }]; not: { const: [1] } }; d6: { type: "array"; prefixItems: [{ $ref: "#/$defs/d7" }]; not: { const: [1] } }; d7: { type: "array"; prefixItems: [{ $ref: "#/$defs/d8" }]; not: { const: [1] } }; d8: { type: "array"; prefixItems: [{ $ref: "#/$defs/d9" }]; not: { const: [1] } }; d9: { type: "array"; prefixItems: [{ $ref: "#/$defs/d10" }]; not: { const: [1] } }; d10: { type: "array"; prefixItems: [{ $ref: "#/$defs/d11" }]; not: { const: [1] } }; d11: { type: "array"; prefixItems: [{ $ref: "#/$defs/d12" }]; not: { const: [1] } }; d12: { type: "array"; prefixItems: [{ $ref: "#/$defs/d13" }]; not: { const: [1] } }; d13: { type: "string" } }; $ref: "#/$defs/d0" }>
			const isAny = {} as 0 extends 1 & T ? true : false
			attest(isAny).type.toString.snap("false")
		})

		it("const beside hand-written schema items", () => {
			type T = jsonSchema.infer<{
				type: "array"
				items: HandWrittenSchema
				const: [{ a: 1 }]
			}>
			attest({} as T).type.toString.snap("[{ a: 1 }]")
		})
	})

	describe("resources", () => {
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
			attest(T).type.toString.snap("null")
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
			attest(T).type.toString.snap("boolean")
		})

		it("a widened $id on the document root still resolves local refs", () => {
			type Root = {
				$id: string
				$defs: { s: { type: "string" } }
				$ref: "#/$defs/s"
			}
			attest({} as jsonSchema.infer<Root>).type.toString.snap("string")
		})
	})

	describe("dialects", () => {
		type draft04 = "http://json-schema.org/draft-04/schema#"
		type draft07 = "http://json-schema.org/draft-07/schema#"

		// draft-04 to draft-07 ignore a $ref's siblings
		type withSibling<uri> = jsonSchema.infer<{
			$schema: uri
			definitions: { n: { type: ["number", "string"] } }
			$ref: "#/definitions/n"
			type: "string"
		}>

		// inner's ref reaches its own s only if `key` starts a resource
		type identifiedBy<key extends string, uri> = jsonSchema.infer<{
			$schema: uri
			definitions: {
				inner: { [_ in key]: "inner.json" } & {
					definitions: { s: { type: "string" } }
					type: "object"
					properties: { p: { $ref: "#/definitions/s" } }
					required: ["p"]
				}
				s: { type: "number" }
			}
			$ref: "#/definitions/inner"
		}>

		it("$schema spellings", () => {
			attest<
				string | number,
				withSibling<"http://json-schema.org/draft-04/hyper-schema#">
			>()
			attest<
				string | number,
				withSibling<"https://json-schema.org/draft-07/schema">
			>()
			attest<
				string,
				withSibling<"https://json-schema.org/draft/2019-09/schema">
			>()
			// a widened or optional $schema may be any of its dialects
			attest<string | number, withSibling<string>>()
			attest<string | number, withSibling<draft07 | undefined>>()
		})

		it("the keyword that identifies a resource", () => {
			attest<{ p: string }, identifiedBy<"id", draft04>>()
			attest<{ p: number }, identifiedBy<"$id", draft04>>()
			attest<
				{ p: string },
				identifiedBy<"$id", "http://json-schema.org/draft-06/schema#">
			>()
			attest<{ p: number }, identifiedBy<"id", draft07>>()
			attest<
				{ p: number },
				identifiedBy<"id", "https://json-schema.org/draft/2020-12/schema">
			>()
			// a root that differs between the dialects it may be read as is unresolvable
			attest<{ p: unknown }, identifiedBy<"$id", string>>()
			attest<{ p: string }, identifiedBy<"$id", draft07 | undefined>>()
		})

		it("a $id beside $ref re-roots it only from 2019-09 on", () => {
			type idBeside<uri> = jsonSchema.infer<{
				$schema: uri
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
			attest<
				{ a?: string },
				idBeside<"https://json-schema.org/draft/2019-09/schema">
			>()
			attest<{ a?: number }, idBeside<draft07>>()
		})

		it("an embedded draft-07 resource ignores $ref siblings", () => {
			attest(
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
			attest(
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

		it("a def against its document or alone", () => {
			attest<User, jsonSchema.infer<Doc["$defs"]["user"], Doc>>()
			attest<
				{ name: string; manager?: unknown },
				jsonSchema.infer<Doc["$defs"]["user"]>
			>()
		})
	})
})
