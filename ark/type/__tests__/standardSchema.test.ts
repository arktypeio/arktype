import { attest, contextualize } from "@ark/attest"
import {
	writeForeignArkMessage,
	writeInvalidJsonSchemaTargetMessage,
	type StandardJSONSchemaV1,
	type StandardSchemaV1
} from "@ark/schema"
import type { promisable } from "@ark/util"
import { ArkErrors, fromJsonSchema, scope, type } from "arktype"
import {
	ArkErrors as RuntimeArkErrors,
	FirstIssues,
	InvalidErrors,
	unreadErrors
} from "arktype/runtime"
import { writeAsyncStandardSchemaMessage } from "arktype/internal/parser/definition.ts"
import { en } from "arktype/locales/en"
import { runInNewContext } from "node:vm"

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
			"must be a string"
		])
		attest(badStandardOut.issues[0].path).equals(["foo"])
	})

	it("validate returns issues where onFail would throw or return something else", () => {
		for (const onFail of [(errors: type.errors) => errors.throw(), () => 5]) {
			const T = scope({}, { onFail }).type("string")
			const failure = T["~standard"].validate(
				5
			) as StandardSchemaV1.FailureResult
			attest(failure.issues.map(issue => issue.message)).equals([
				"must be a string"
			])
			attest(T["~standard"].validate("")).equals({ value: "" })
		}
	})

	it("a failure's message is its errors' summary, which names each path", () => {
		const T = type({ a: "string", b: { c: "number > 0" } })
		const data = { b: { c: 0 } }
		const failure = T["~standard"].validate(
			data
		) as StandardSchemaV1.FailureResult
		attest(failure.message).equals(
			"a must be a string (was missing)\nb.c must be positive"
		)
		attest(failure.message).equals((T(data) as type.errors).summary)
		// its own, so a consumer copying or serializing the failure holds it
		attest(Object.keys(failure)).equals(["issues", "message"])
		attest({ ...failure }.message).equals(failure.message)
		attest(JSON.parse(JSON.stringify(failure)).message).equals(failure.message)
		// a success has none
		attest(Object.keys(T["~standard"].validate({ a: "", b: { c: 1 } }))).equals(
			["value"]
		)
	})

	it("a failure's message isn't written until it's read, by a getter every failure shares", () => {
		const summary = Object.getOwnPropertyDescriptor(
			type.errors.prototype,
			"summary"
		)!
		let written = 0
		Object.defineProperty(type.errors.prototype, "summary", {
			...summary,
			get() {
				written++
				return summary.get!.call(this)
			}
		})
		try {
			const failure = type({ a: "string" })["~standard"].validate(
				{}
			) as StandardSchemaV1.FailureResult
			attest(failure.issues.map(issue => issue.message)).equals([
				"must be a string (was missing)"
			])
			attest(written).equals(0)
			attest(failure.message).equals("a must be a string (was missing)")
			attest(written).equals(1)
			// a getter of its own for each failure costs each a shape to share
			const other = type("number")["~standard"].validate(
				""
			) as StandardSchemaV1.FailureResult
			attest(
				Object.getOwnPropertyDescriptor(other, "message")!.get ===
					Object.getOwnPropertyDescriptor(failure, "message")!.get
			).equals(true)
			attest(written).equals(1)
			attest(other.message).equals("must be a number")
		} finally {
			Object.defineProperty(type.errors.prototype, "summary", summary)
		}
	})

	it("a failure read through a proxy that wraps what it holds, as a reactive store's does, writes its message", () => {
		const wrapped = <t extends object>(target: t): t =>
			new Proxy(target, {
				get: (target, key, receiver) => {
					const value = Reflect.get(target, key, receiver)
					return typeof value === "object" && value !== null ?
							wrapped(value)
						:	value
				}
			})
		const failure = type({ a: "string" })["~standard"].validate(
			{}
		) as StandardSchemaV1.FailureResult
		attest(wrapped(failure).message).equals("a must be a string (was missing)")
	})

	it("an issue's message is its error's message, which leaves its path to the consumer", () => {
		const textOf = (T: type.Any, data: unknown) => {
			const errors = T(data) as type.errors
			const { issues } = T["~standard"].validate(
				data
			) as StandardSchemaV1.FailureResult
			return {
				summary: errors.summary,
				errors: errors.issues.map(error => error.message),
				issues: issues.map(issue => issue.message)
			}
		}
		attest(textOf(type({ y: { z: "string >= 2" } }), { y: { z: "a" } })).snap({
			summary: "y.z must be at least length 2",
			errors: ["must be at least length 2"],
			issues: ["must be at least length 2"]
		})
		// a union's message writes its branches' paths from its own
		attest(
			textOf(type({ x: type({ a: "string" }).or({ b: "number" }) }), {
				x: { a: 1, b: "" }
			})
		).snap({
			summary: "x.a must be a string or x.b must be a number",
			errors: ["a must be a string or b must be a number"],
			issues: ["a must be a string or b must be a number"]
		})
		const Configured = type("string >= 2").configure({ message: "Too short" })
		attest(textOf(type({ y: Configured }), { y: "a" })).snap({
			summary: "y: Too short",
			errors: ["Too short"],
			issues: ["Too short"]
		})
		const Rejecting = type("string").narrow(
			(s, ctx) => s.length >= 2 || ctx.reject({ message: "Too short" })
		)
		attest(textOf(type({ y: Rejecting }), { y: "a" })).snap({
			summary: "y: Too short",
			errors: ["Too short"],
			issues: ["Too short"]
		})
	})

	it("nested standard schema issues", () => {
		const User = type({ age: "number.integer" })
		const Wrapped = type({ user: { "~standard": User["~standard"] } })

		attest(Wrapped({ user: { age: 1.5 } }).toString()).snap(
			"user.age must be an integer"
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

		const Configured = type({
			age: type("number.integer").configure({ message: "Enter your age" })
		})
		attest(
			type({ user: { "~standard": Configured["~standard"] } })({
				user: { age: 1.5 }
			}).toString()
		).snap("user.age: Enter your age")

		// another library's message is a sentence of its own
		const out = Other({ user: {} }) as type.errors
		attest(out.summary).snap("user.age: Expected an integer")
		attest(out.issues[0].message).snap("Expected an integer")

		const Union = type({ a: type({ b: "string" }).or({ c: "number" }) })
		attest(
			type({ x: { "~standard": Union["~standard"] } })({
				x: { a: {} }
			}).toString()
		).snap("x.a b must be a string or c must be a number")
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

	it("an embedded Standard Schema returning any thenable throws", () => {
		const standardReturning = (result: () => unknown) =>
			type({
				"~standard": { version: 1, vendor: "other", validate: result }
			} as never)
		const message = writeAsyncStandardSchemaMessage("other")
		// another realm's Promise isn't an instance of this one's
		const foreignPromise = runInNewContext("Promise.resolve({ value: 1 })")
		attest(() => standardReturning(() => foreignPromise)(1)).throws(message)
		attest(() =>
			standardReturning(() => ({
				then: (resolve: (result: object) => void) => resolve({ value: 1 })
			}))(1)
		).throws(message)
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
			// what arktype 2 wrote from what it expected follows its path
			const out = T({ user: {}, thunk: { id: 1 } }) as type.errors
			attest(out.summary).snap(
				"user.id must be a string\nthunk.id must be a string"
			)
			attest(out.summaryIn(en)).equals(out.summary)
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

		it("an arktype 3 Type answers whether an issue of its own is custom", () => {
			const custom = { message: "Enter a valid email", path: ["email"] }
			const Foreign3 = Object.setPrototypeOf(
				Object.assign((data: unknown) => data, {
					"~standard": {
						version: 1,
						vendor: "arktype",
						validate: () => ({
							issues: [{ message: "must be a string", path: ["id"] }, custom]
						}),
						// as another copy's Type answers for the errors only it can read
						_c: (issue: object) => issue === custom
					}
				}),
				{ " arkKind": "root" }
			) as type.cast<{ id: string; email: string }>
			attest(type({ user: Foreign3 })({ user: {} }).toString()).snap(
				"user.id must be a string\nuser.email: Enter a valid email"
			)
			// this copy's own errors, read only as a Standard Schema's issues
			const Own = type({
				id: "string",
				email: type("string.email").configure({
					message: "Enter a valid email"
				})
			})
			const T = type({ user: { "~standard": Own["~standard"] } })
			attest(T({ user: { id: 1, email: 1 } }).toString()).snap(
				"user.id must be a string\nuser.email: Enter a valid email"
			)
		})

		it("a union read as a Standard Schema's at the root keeps its listing", () => {
			const Own = type({ shape: type({ a: "string" }).or({ b: "number" }) })
			const T = type({ "~standard": Own["~standard"] })
			attest(T({ shape: {} }).toString()).snap(
				"shape.a must be a string or shape.b must be a number"
			)
		})

		const ownJsonSchema = (
			write: (target: string) => Record<string, unknown>,
			writeOut = write
		): StandardJSONSchemaV1.Converter => ({
			input: ({ target }) => ({ $schema: target, ...write(target) }),
			output: ({ target }) => {
				if (target === "openapi-3.0") throw new Error("unsupported")
				return { $schema: target, ...writeOut(target) }
			}
		})
		const writeForeignJsonSchemaMessage = (target: string, reason?: string) =>
			`Can't convert the Type at u to ${target} JSON Schema${reason ? `, since ${reason}` : ""}. ${writeForeignArkMessage("It")}`

		it("writes a Type's own JSON Schema", () => {
			const T = type({
				u: foreignType(ownJsonSchema(target => ({ title: target })))
			})
			attest(T.toJsonSchema({ target: "draft-07" })).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "object",
				properties: { u: { title: "draft-07" } },
				required: ["u"]
			})
			attest(() => T.toJsonSchema({ target: "openapi-3.0" })).throws(
				writeForeignJsonSchemaMessage("openapi-3.0")
			)
			attest(() => type({ u: Foreign }).toJsonSchema()).throws(
				writeForeignJsonSchemaMessage("draft-2020-12")
			)
		})

		it("writes only the input of a Type whose input and output differ", () => {
			const T = type({
				u: foreignType(
					ownJsonSchema(
						() => ({ type: "string" }),
						() => ({ type: "number" })
					)
				)
			})
			attest(T["~standard"].jsonSchema.input({ target: "draft-07" })).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "object",
				properties: { u: { type: "string" } },
				required: ["u"]
			})
			attest(() => T.toJsonSchema()).throws(
				writeForeignJsonSchemaMessage(
					"draft-2020-12",
					"its input and output differ, so only ~standard.jsonSchema.input can write it"
				)
			)
		})

		it("throws for a Type's JSON Schema with refs", () => {
			// like a cyclic 2.x Type's, whose refs resolve against its own document
			const T = type({
				u: foreignType(
					ownJsonSchema(() => ({
						$ref: "#/$defs/node",
						$defs: { node: { type: "string" } }
					}))
				)
			})
			attest(() => T.toJsonSchema()).throws(
				writeForeignJsonSchemaMessage(
					"draft-2020-12",
					"it references its own definitions"
				)
			)
		})

		it("intersects a Type's input JSON Schema with what it's intersected with", () => {
			const T = type({
				u: foreignType(ownJsonSchema(() => ({ title: "own" })))
			}).and({ u: { n: "number" } })
			attest(T["~standard"].jsonSchema.input({ target: "draft-07" })).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				type: "object",
				properties: {
					u: {
						allOf: [
							{
								type: "object",
								properties: { n: { type: "number" } },
								required: ["n"]
							},
							{ title: "own" }
						]
					}
				},
				required: ["u"]
			})
			attest(() => T.toJsonSchema()).throws(
				writeForeignJsonSchemaMessage(
					"draft-2020-12",
					"it's intersected with another Type"
				)
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
					maybe: { type: "string" },
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

		it("keeps each pattern", () => {
			const standard: StandardJSONSchemaV1 = type(/^a/).and(/z$/)
			attest(
				standard["~standard"].jsonSchema.input({ target: "draft-2020-12" })
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "string",
				pattern: "^a",
				allOf: [{ pattern: "z$" }]
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
								"^(?:(?:0|[1-9]\\d*)(?:\\.\\d+)?|\\.\\d+|-(?:[1-9]\\d*(?:\\.\\d+)?|0?\\.\\d*[1-9]\\d*))(?:[Ee][+-]?\\d+)?$",
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
						pattern: "^(?:0|-?[1-9]\\d*)$"
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
							"^(?:(?:0|[1-9]\\d*)(?:\\.\\d+)?|\\.\\d+|-(?:[1-9]\\d*(?:\\.\\d+)?|0?\\.\\d*[1-9]\\d*))(?:[Ee][+-]?\\d+)?$"
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

		it("drops undefined on object prop/index output while preserving sequence and root undefined", () => {
			const Obj = type({ name: "string", nickname: "string | undefined" })
			const Rec = type({ "[string]": "string | undefined" })
			const RootUndef = type("string | undefined")
			const ArrUndef = type("(number | undefined)[]")
			const TupleUndef = type(["string | undefined", "number"])
			const OnlyUndef = type({ nickname: "string | undefined" })
			const PureUndef = type({ a: "undefined" })
			const Cyclic = scope({
				Node: { value: "number", next: "Node | undefined" }
			}).export().Node

			for (const target of [
				"draft-2020-12",
				"draft-07",
				"openapi-3.0"
			] as const) {
				const objIn = Obj["~standard"].jsonSchema.input({ target })
				const objOut = Obj["~standard"].jsonSchema.output({ target })
				attest(objOut.properties).equals(objIn.properties)
				attest(objIn.required).equals(["name", "nickname"])
				attest(objOut.required).equals(["name"])
				attest(Obj.toJsonSchema({ target, io: "out" })).equals(objOut)

				const recOut = Rec["~standard"].jsonSchema.output({ target })
				attest(recOut).equals(Rec.toJsonSchema({ target, io: "out" }))
				attest(recOut.additionalProperties).equals({ type: "string" })

				// no required: [] when every key allows undefined
				const onlyOut = OnlyUndef["~standard"].jsonSchema.output({ target })
				attest("required" in onlyOut).equals(false)
				attest(onlyOut.properties).equals({ nickname: { type: "string" } })
				attest(OnlyUndef.toJsonSchema({ target, io: "out" })).equals(onlyOut)

				const pureOut = PureUndef["~standard"].jsonSchema.output({ target })
				attest("required" in pureOut).equals(false)
				attest(pureOut.properties).equals({ a: { not: {} } })
				attest(PureUndef.toJsonSchema({ target, io: "out" })).equals(pureOut)

				// array and tuple elements cannot be omitted in JSON, so output keeps {}
				const arrOut = ArrUndef["~standard"].jsonSchema.output({ target })
				attest(arrOut.items).equals({ anyOf: [{ type: "number" }, {}] })
				attest(fromJsonSchema(arrOut).allows([1, undefined])).equals(true)
				attest(fromJsonSchema(arrOut).allows([1, null])).equals(true)

				const rootOut = RootUndef["~standard"].jsonSchema.output({ target })
				attest(rootOut.anyOf).equals([{ type: "string" }, {}])
				attest(fromJsonSchema(rootOut).allows(undefined)).equals(true)
			}

			const tupleOut = TupleUndef["~standard"].jsonSchema.output({
				target: "draft-2020-12"
			})
			attest(tupleOut).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				type: "array",
				minItems: 2,
				prefixItems: [{ anyOf: [{ type: "string" }, {}] }, { type: "number" }],
				items: false
			})
			attest(fromJsonSchema(tupleOut).allows([undefined, 1])).equals(true)
			attest(fromJsonSchema(tupleOut).allows([null, 1])).equals(true)

			attest(Cyclic.toJsonSchema({ dialect: null, io: "out" })).snap({
				$ref: "#/$defs/Node",
				$defs: {
					Node: {
						type: "object",
						properties: {
							next: { $ref: "#/$defs/Node" },
							value: { type: "number" }
						},
						required: ["value"]
					}
				}
			})

			// default toJsonSchema() (without io) preserves unit fallback error behavior
			attest(() => Obj.toJsonSchema()).throws(
				'Can\'t convert "unit" at nickname to JSON Schema'
			)
			attest(() => Rec.toJsonSchema()).throws(
				'Can\'t convert "unit" at [string] to JSON Schema'
			)
		})

		it("does not allow libraryOptions.target to override Standard target", () => {
			const Node = scope({
				Node: { value: "number", "next?": "Node" }
			}).export().Node

			attest(
				Node["~standard"].jsonSchema.input({
					target: "draft-07",
					libraryOptions: { target: "openapi-3.1" as never }
				})
			).snap({
				$schema: "http://json-schema.org/draft-07/schema#",
				$ref: "#/definitions/Node",
				definitions: {
					Node: {
						type: "object",
						properties: {
							value: { type: "number" },
							next: { $ref: "#/definitions/Node" }
						},
						required: ["value"]
					}
				}
			})

			attest(
				Node["~standard"].jsonSchema.output({
					target: "draft-2020-12",
					libraryOptions: { target: "openapi-3.0" }
				})
			).snap({
				$schema: "https://json-schema.org/draft/2020-12/schema",
				$ref: "#/$defs/Node",
				$defs: {
					Node: {
						type: "object",
						properties: {
							value: { type: "number" },
							next: { $ref: "#/$defs/Node" }
						},
						required: ["value"]
					}
				}
			})

			// invalid Standard target still throws naming only the 3 Standard targets
			attest(() =>
				Node["~standard"].jsonSchema.input({
					target: "openapi-3.1" as never,
					libraryOptions: { target: "draft-07" }
				})
			).throws(writeInvalidJsonSchemaTargetMessage("openapi-3.1"))
			attest(
				Node["~standard"].jsonSchema.input({
					target: "draft-07",
					libraryOptions: { target: "draft-04" as never }
				})
			).equals(Node["~standard"].jsonSchema.input({ target: "draft-07" }))
		})
	})

	describe("Standard Schema toJSON() data stripping", () => {
		it("strips data and actual from JSON.stringify on Standard Schema failures", () => {
			const Login = type({ email: "string.email", password: "string >= 12" })
			const input = { email: "a@b.co", password: "hunter2" }
			const direct = Login(input) as type.errors
			const result = Login["~standard"].validate(
				input
			) as StandardSchemaV1.FailureResult

			// JS properties remain readable
			const firstIssue = result.issues[0] as {
				data?: unknown
				actual?: unknown
			}
			attest(firstIssue.data).equals("hunter2")
			attest(firstIssue.actual).equals("7")

			const directJson = JSON.parse(JSON.stringify(direct))
			const serialized = JSON.stringify(result)
			const parsed = JSON.parse(serialized) as {
				issues: Record<string, unknown>[]
				message: string
			}
			attest(parsed).snap({
				issues: [
					{
						code: "minLength",
						description: "at least length 12",
						expected: "at least length 12",
						message: "must be at least length 12",
						path: ["password"],
						propString: "password"
					}
				],
				message: "password must be at least length 12"
			})
			attest(parsed.issues).equals(directJson)
			attest(parsed.message).equals(direct.summary)
			attest("data" in parsed.issues[0]).equals(false)
			attest("actual" in parsed.issues[0]).equals(false)
		})

		it("serializes BigInt, circular data, symbol paths, and reactive proxies safely", () => {
			const tag = Symbol("secret")
			const cyclic: Record<string, unknown> = {}
			cyclic.self = cyclic
			const T = type({ [tag]: "string", n: "string", c: "string" })
			const result = T["~standard"].validate({
				[tag]: 1n,
				n: 2n,
				c: cyclic
			}) as StandardSchemaV1.FailureResult

			const parsed = JSON.parse(JSON.stringify(result)) as {
				issues: { path: unknown[]; data?: unknown }[]
				message: string
			}
			attest(parsed.issues.map(issue => issue.path)).equals([
				["n"],
				["c"],
				["Symbol(secret)"]
			])
			for (const issue of parsed.issues) attest("data" in issue).equals(false)

			const wrap = <t extends object>(target: t): t =>
				new Proxy(target, {
					get: (t, k, receiver) => {
						const value = Reflect.get(t, k, receiver)
						return typeof value === "object" && value !== null ?
								wrap(value)
							:	value
					}
				})
			const wrappedJson = JSON.stringify(wrap(result))
			attest(wrappedJson).equals(JSON.stringify(result))
		})
	})

	it("recognizes arktype/runtime errors as instanceof ArkErrors and type.errors", () => {
		const runtimeErr = new RuntimeArkErrors()
		runtimeErr._e(1, "domain", "a string")
		const firstErr = new FirstIssues()
		firstErr._e(1, "domain", "a string")
		const invalidErr = new InvalidErrors(1)
		const lazyErr = unreadErrors(
			(data, ctx) => !ctx._e(data, "domain", "a string"),
			1,
			null
		)

		for (const err of [runtimeErr, firstErr, invalidErr, lazyErr]) {
			attest(err instanceof ArkErrors).equals(true)
			attest(err instanceof type.errors).equals(true)
		}

		// TypeScript narrowing on instanceof type.errors still works
		const out = type("string")(1)
		if (out instanceof type.errors) attest<type.errors>(out)
		else attest<string>(out)

		for (const notErrors of [
			{ " arkKind": "errors" },
			null,
			undefined,
			5,
			{}
		] as unknown[])
			attest(notErrors instanceof ArkErrors).equals(false)
	})
})
