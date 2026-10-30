import { attest, contextualize } from "@ark/attest"
import {
	writeForeignArkMessage,
	writeInvalidJsonSchemaTargetMessage,
	type StandardJSONSchemaV1,
	type StandardSchemaV1
} from "@ark/schema"
import type { promisable } from "@ark/util"
import { scope, type } from "arktype"

contextualize(() => {
	it("validation conforms to spec", () => {
		const T = type({ foo: "string" })
		const standard: StandardSchemaV1<{ foo: string }> = T
		const standardOut = standard["~standard"].validate({
			foo: "bar"
		})
		attest<promisable<StandardSchemaV1.Result<{ foo: string }>>>(
			standardOut
		).equals({
			value: { foo: "bar" }
		})

		const badStandardOut = standard["~standard"].validate({
			foo: 5
		}) as StandardSchemaV1.FailureResult

		attest(Array.isArray(badStandardOut.issues)).equals(true)
		attest(badStandardOut.issues.map(issue => issue.message)).snap([
			"must be a string (was a number)"
		])
		attest(badStandardOut.issues[0].path).equals(["foo"])
	})

	it("an issue's message leaves its path to the consumer", () => {
		const T = type({ a: type({ b: "string" }).or({ c: "number" }) })
		const out = T["~standard"].validate({
			a: {}
		}) as StandardSchemaV1.FailureResult
		attest(out.issues.map(issue => [issue.path, issue.message])).snap([
			[
				["a"],
				"b must be a string (was missing) or c must be a number (was missing)"
			]
		])
		// its errors still start with their path
		attest(T({ a: {} }).toString()).snap(
			"a.b must be a string (was missing) or a.c must be a number (was missing)"
		)
	})

	it("nested standard schema issues", () => {
		const User = type({ age: "number.integer" })
		const Wrapped = type({ user: { "~standard": User["~standard"] } })

		attest(Wrapped({ user: { age: 1.5 } }).toString()).snap(
			"user.age must be an integer (was 1.5)"
		)

		const Other = type({
			user: {
				"~standard": {
					version: 1,
					vendor: "other",
					validate: () => ({
						issues: [{ message: "Expected an integer", path: ["age"] }]
					})
				}
			}
		})

		attest(Other({ user: {} }).toString()).snap("user.age expected an integer")

		const Union = type({ a: type({ b: "string" }).or({ c: "number" }) })
		attest(
			type({ x: { "~standard": Union["~standard"] } })({
				x: { a: {} }
			}).toString()
		).snap(
			"x.a b must be a string (was missing) or c must be a number (was missing)"
		)
	})

	it("an embedded Standard Schema's empty issues fail", () => {
		const T = type({
			a: {
				"~standard": {
					version: 1,
					vendor: "other",
					validate: () => ({ issues: [] })
				}
			}
		})
		attest(T({ a: 1 }).toString()).snap("a is invalid")
	})

	describe("from another copy of arktype", () => {
		// like a 2.x Type: callable, with arkKind "root" but none of this version's
		// methods, and messages that start with their path
		const foreignType = (jsonSchema?: StandardJSONSchemaV1.Converter) =>
			Object.setPrototypeOf(
				Object.assign((data: unknown) => data, {
					"~standard": {
						version: 1,
						vendor: "arktype",
						validate: (data: unknown) =>
							typeof (data as { id?: unknown }).id === "string" ?
								{ value: data }
							:	{
									issues: [
										{
											message: "id must be a string",
											problem: "must be a string",
											path: ["id"]
										}
									]
								},
						jsonSchema
					}
				}),
				{ " arkKind": "root" }
			) as type.cast<{ id: string }> & ((data: unknown) => { id: string })
		const Foreign = foreignType()

		it("parses a Type as a Standard Schema", () => {
			const T = type({ user: Foreign, thunk: () => Foreign })
			attest<{ user: { id: string }; thunk: { id: string } }>(T.infer)
			attest(T({ user: { id: "a" }, thunk: { id: "b" } })).equals({
				user: { id: "a" },
				thunk: { id: "b" }
			})
			attest(T({ user: {}, thunk: { id: 1 } }).toString()).snap(
				"user.id must be a string\nthunk.id must be a string"
			)
		})

		it("methods parse a Type as a Standard Schema", () => {
			const T = type("string").pipe(id => ({ id: id.length }), Foreign)
			attest(T("abc").toString()).snap("id must be a string")
			attest(type("unknown").to(Foreign)({}).toString()).snap(
				"id must be a string"
			)
			const Node = scope({ node: { id: "string", "next?": "node" } }).export()
				.node
			attest(Node.equals(Foreign)).equals(false)
		})

		it("writes a Type's own JSON Schema", () => {
			const T = type({
				u: foreignType({
					input: ({ target }) => ({ $schema: target, title: `in ${target}` }),
					output: ({ target }) => {
						if (target === "openapi-3.0") throw new Error("unsupported")
						return { $schema: target, title: `out ${target}` }
					}
				})
			})
			attest(T.toJsonSchema({ target: "draft-07" })).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "object",
				properties: { u: { title: "out draft-07" } },
				required: ["u"]
			})
			attest(T["~standard"].jsonSchema.input({ target: "draft-07" })).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "object",
				properties: { u: { title: "in draft-07" } },
				required: ["u"]
			})
			attest(() => T.toJsonSchema({ target: "openapi-3.0" })).throws(
				`Can't convert the Type at u to openapi-3.0 JSON Schema. ${writeForeignArkMessage("It")}`
			)
			attest(() => type({ u: Foreign }).toJsonSchema()).throws(
				`Can't convert the Type at u to draft-2020-12 JSON Schema. ${writeForeignArkMessage("It")}`
			)
		})

		it("throws for a Type as a schema", () => {
			attest(() => type.schema(Foreign as never)).throws(
				writeForeignArkMessage("A Type passed as a schema")
			)
		})

		it("throws for a module or generic in a scope", () => {
			class ForeignModule {
				get " arkKind"() {
					return "module"
				}
			}
			class ForeignGeneric {
				get " arkKind"() {
					return "generic"
				}
			}
			attest(() => scope({ m: new ForeignModule() as never })).throws(
				writeForeignArkMessage("m")
			)
			attest(() => scope({ g: new ForeignGeneric() as never })).throws(
				writeForeignArkMessage("g")
			)
		})
	})

	it("can infer generic parameter from standard schema", () => {
		const acceptsStandardSchema = <T extends StandardSchemaV1>(
			schema: T
		): {
			input: StandardSchemaV1.InferInput<T>
			output: StandardSchemaV1.InferOutput<T>
		} => ({}) as never

		const result = acceptsStandardSchema(type({ foo: "string.numeric.parse" }))

		attest<{ foo: string }>(result.input)
		attest<{ foo: number }>(result.output)
	})

	describe("~standard.jsonSchema", () => {
		it("generates input schema with draft-2020-12", () => {
			const T = type({ foo: "string" })
			const standard: StandardJSONSchemaV1 = T
			const jsonSchema = standard["~standard"].jsonSchema.input({
				target: "draft-2020-12"
			})
			attest(jsonSchema).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo"]
			})
		})

		it("generates output schema with draft-2020-12", () => {
			const T = type({ foo: "string" })
			const standard: StandardJSONSchemaV1 = T
			const jsonSchema = standard["~standard"].jsonSchema.output({
				target: "draft-2020-12"
			})
			attest(jsonSchema).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo"]
			})
		})

		it("generates input schema with draft-07", () => {
			const T = type({ foo: "string" })
			const standard: StandardJSONSchemaV1 = T
			const jsonSchema = standard["~standard"].jsonSchema.input({
				target: "draft-07"
			})
			attest(jsonSchema).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo"]
			})
		})

		it("generates output schema with draft-07", () => {
			const T = type({ foo: "string" })
			const standard: StandardJSONSchemaV1 = T
			const jsonSchema = standard["~standard"].jsonSchema.output({
				target: "draft-07"
			})
			attest(jsonSchema).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo"]
			})
		})

		it("passes libraryOptions to toJsonSchema", () => {
			const T = type({ foo: "string" })
			const standard: StandardJSONSchemaV1 = T
			const jsonSchema = standard["~standard"].jsonSchema.input({
				target: "draft-2020-12",
				libraryOptions: {
					dialect: null
				}
			})
			attest(jsonSchema).snap({
				type: "object",
				properties: { foo: { type: "string" } },
				required: ["foo"]
			})
		})

		it("throws for unsupported target", () => {
			const T = type({ foo: "string" })
			const standard: StandardJSONSchemaV1 = T
			attest(() =>
				standard["~standard"].jsonSchema.input({
					target: "draft-04"
				})
			).throws(writeInvalidJsonSchemaTargetMessage("draft-04"))
		})

		it("converts what JSON Schema can't represent to {}", () => {
			const T = type({
				big: "bigint",
				date: "Date",
				maybe: "string | undefined",
				even: type("number").narrow(n => n % 2 === 0),
				ends: ["...", "string[]", "number"],
				count: ["bigint", "=", () => 0n]
			})
			const standard: StandardJSONSchemaV1 = T
			attest(
				standard["~standard"].jsonSchema.input({ target: "draft-2020-12" })
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: {
					big: {},
					date: {},
					ends: { type: "array", minItems: 1 },
					even: { type: "number" },
					maybe: { anyOf: [{ type: "string" }, {}] },
					count: {}
				},
				required: ["big", "date", "ends", "even", "maybe"]
			})
		})

		it("converts the output of a transform to {}", () => {
			const T = type("string").pipe(s => s.length)
			const standard: StandardJSONSchemaV1 = T
			attest(
				standard["~standard"].jsonSchema.output({ target: "draft-2020-12" })
			).snap({ $schema: "https://json-schema.org/draft/2020-12/schema" })
		})

		it("keeps a postfix tuple's draft-07 prefix", () => {
			const T = type(["string", "...", "number[]", "boolean"])
			const standard: StandardJSONSchemaV1 = T
			attest(
				standard["~standard"].jsonSchema.input({ target: "draft-07" })
			).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "array",
				minItems: 2,
				items: [{ type: "string" }]
			})
		})

		it("drops a flagged pattern and a key JSON Schema can't express", () => {
			const T = type({
				name: /^a/i,
				"[string <= 3]": "number",
				"+": "reject"
			})
			const standard: StandardJSONSchemaV1 = T
			attest(
				standard["~standard"].jsonSchema.input({ target: "draft-2020-12" })
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: { name: { type: "string" } },
				required: ["name"]
			})
		})

		it("uses configured fallbacks", () => {
			const T = type("bigint")
			const standard: StandardJSONSchemaV1 = T
			attest(
				standard["~standard"].jsonSchema.input({
					target: "draft-2020-12",
					libraryOptions: {
						fallback: { domain: () => ({ type: "integer" }) }
					}
				})
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "integer"
			})
		})

		// https://github.com/arktypeio/arktype/issues/1575
		it("keeps defaults in the input schema", () => {
			const T = type({
				name: 'string = "Anon"',
				tags: ["string[]", "=", () => ["a"]],
				n: "string.numeric.parse = '1'"
			})
			attest(T["~standard"].jsonSchema.input({ target: "draft-2020-12" })).snap(
				{
					$schema: "https://json-schema.org/draft/2020-12/schema",
					type: "object",
					properties: {
						n: {
							type: "string",
							pattern:
								"^(?:(?!^-0\\.?0*(?:[Ee][+-]?\\d+)?$)(?:-?(?:(?:0|[1-9]\\d*)(?:\\.\\d+)?)|\\.\\d+?)(?:[Ee][+-]?\\d+)?)$",
							default: "1"
						},
						name: { type: "string", default: "Anon" },
						tags: { type: "array", items: { type: "string" }, default: ["a"] }
					}
				}
			)
			attest(
				T["~standard"].jsonSchema.output({ target: "draft-2020-12" })
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: {
					n: { type: "number" },
					name: { type: "string" },
					tags: { type: "array", items: { type: "string" } }
				},
				required: ["n", "name", "tags"]
			})
			attest(
				type(["number", "string = 'x'"])["~standard"].jsonSchema.input({
					target: "draft-2020-12"
				})
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "array",
				minItems: 1,
				prefixItems: [{ type: "number" }, { type: "string", default: "x" }],
				items: false
			})
		})

		it('allows keys "delete" removes in the input schema', () => {
			const T = type({ name: "string" }).onUndeclaredKey("delete")
			attest(T["~standard"].jsonSchema.input({ target: "draft-2020-12" })).snap(
				{
					$schema: "https://json-schema.org/draft/2020-12/schema",
					type: "object",
					properties: { name: { type: "string" } },
					required: ["name"]
				}
			)
			attest(
				T["~standard"].jsonSchema.output({ target: "draft-2020-12" })
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: { name: { type: "string" } },
				required: ["name"],
				additionalProperties: false
			})
		})

		it("writes a morph's input without its configured fallback", () => {
			const T = type({ n: "string.integer.parse" })
			attest(
				T["~standard"].jsonSchema.input({
					target: "draft-2020-12",
					libraryOptions: { fallback: { morph: () => ({ type: "null" }) } }
				})
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: {
					n: {
						type: "string",
						pattern: "^(?:(?!^-0$)-?(?:(?:0|[1-9]\\d*)))$"
					}
				},
				required: ["n"]
			})
		})

		it("generates different input/output schemas for morphs", () => {
			const T = type({ foo: "string.numeric.parse" })
			const standard: StandardJSONSchemaV1 = T

			const inputSchema = standard["~standard"].jsonSchema.input({
				target: "draft-2020-12"
			})
			attest(inputSchema).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: {
					foo: {
						type: "string",
						pattern:
							"^(?:(?!^-0\\.?0*(?:[Ee][+-]?\\d+)?$)(?:-?(?:(?:0|[1-9]\\d*)(?:\\.\\d+)?)|\\.\\d+?)(?:[Ee][+-]?\\d+)?)$"
					}
				},
				required: ["foo"]
			})

			const outputSchema = standard["~standard"].jsonSchema.output({
				target: "draft-2020-12"
			})
			attest(outputSchema).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "object",
				properties: { foo: { type: "number" } },
				required: ["foo"]
			})
		})
	})
})
