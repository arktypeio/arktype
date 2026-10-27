import { attest, contextualize } from "@ark/attest"
import { rootSchema } from "@ark/schema"
import { parse, toJsonSchema } from "arksets"
import { writeUnparsableSchemaMessage } from "arksets/internal"
import { standardSchema } from "./utils.ts"

contextualize(() => {
	it("reads a Root's input by default and its output with io", () => {
		const T = rootSchema({
			in: { domain: "string", pattern: ["^[0-9]+$"] },
			morphs: [(s: string) => Number(s)],
			declaredOut: rootSchema("number")
		})
		attest(parse(T).expression).snap("/^[0-9]+$/")
		attest(parse(T, { io: "out" }).expression).snap("number")
	})

	it("reads a Standard JSON Schema at draft-2020-12", () => {
		const Zod = standardSchema(
			{ type: "string" },
			{ type: "number", minimum: 0 }
		)
		attest(parse(Zod).expression).snap("string")
		attest(parse(Zod, { io: "out" }).expression).snap("number >= 0")
		attest(Zod.targets).snap(["draft-2020-12", "draft-2020-12"])
	})

	it("reads a Standard JSON Schema whole, though a root is passed", () => {
		const Valibot = standardSchema({ type: "string" })
		attest(parse(Valibot, { root: {} }).expression).snap("string")
	})

	it("caches a Standard Schema's read per io", () => {
		const Zod = standardSchema({ type: "string" })
		attest(parse(Zod) === parse(Zod)).equals(true)
		parse(Zod, { io: "out" })
		attest(Zod.targets).snap(["draft-2020-12", "draft-2020-12"])
	})

	it("reads a JSON Schema again after it changes", () => {
		const schema: { type: "number"; minimum?: number } = { type: "number" }
		attest(parse(schema).expression).snap("number")
		schema.minimum = 5
		attest(parse(schema).expression).snap("number >= 5")
	})

	it("resolves refs against root", () => {
		const document = {
			components: {
				schemas: {
					Pet: {
						type: "object",
						properties: { owner: { $ref: "#/components/schemas/Person" } }
					},
					Person: { type: "object", required: ["name"] }
				}
			}
		}
		attest(
			parse(document.components.schemas.Pet, { root: document }).expression
		).snap("{ owner?: { name: unknown } & isNonArray } & isNonArray")
	})

	it("names a cyclic ref by its target", () => {
		const read = () =>
			parse({
				$defs: {
					node: {
						type: "object",
						properties: { child: { $ref: "#/$defs/node" } }
					}
				},
				$ref: "#/$defs/node"
			}).expression
		const expression = read()
		attest(expression).snap("{ child?: synthetic1bpl2ea1nl2i12 } & isNonArray")
		attest(read()).equals(expression)
	})

	it("reads object and array consts as structures", () => {
		attest(parse({ const: { a: [1, "x"] } }).expression).snap(
			'{ a: [1, "x"], + (undeclared): reject } & isNonArray'
		)
	})

	it("keeps format as an annotation", () => {
		const Email = parse({ type: "string", format: "email" })
		attest(Email.json).snap({ domain: "string", meta: { format: "email" } })
		attest(Email.allows("not an email")).equals(true)
	})

	it("adds the u flag only to a pattern it changes", () => {
		attest(parse({ pattern: "^[a-z]+$", type: "string" }).json).snap({
			domain: "string",
			pattern: ["^[a-z]+$"]
		})
		attest(parse({ pattern: "^.$", type: "string" }).json).snap({
			domain: "string",
			pattern: [{ flags: "u", rule: "^.$" }]
		})
	})

	it("normalizes any format to JSON Schema", () => {
		attest(
			toJsonSchema(
				standardSchema({ allOf: [{ minimum: 1 }, { type: "integer" }] })
			)
		).snap({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "integer",
			minimum: 1
		})
		attest(toJsonSchema({ type: "object", required: ["a"] })).snap({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "object",
			properties: { a: {} },
			required: ["a"]
		})
	})

	it("throws on anything but a schema", () => {
		attest(() => parse([{ type: "string" }] as never)).throws(
			writeUnparsableSchemaMessage('[{"type":"string"}]')
		)
		attest(() =>
			parse({ "~standard": { version: 1, vendor: "valibot" } } as never)
		).throws(
			writeUnparsableSchemaMessage(
				"a valibot Standard Schema without ~standard.jsonSchema"
			)
		)
	})

	it("throws a ParseError when a Standard Schema can't write its JSON Schema", () => {
		const cause = new Error("Date cannot be represented in JSON Schema")
		const Zod = {
			"~standard": {
				version: 1,
				vendor: "zod",
				jsonSchema: {
					input: () => {
						throw cause
					},
					output: () => {
						throw "unsupported"
					}
				}
			}
		} as const
		attest(() => parse(Zod)).throws.snap(
			"ParseError: zod's ~standard.jsonSchema.input threw (Date cannot be represented in JSON Schema)"
		)
		attest(() => parse(Zod, { io: "out" })).throws.snap(
			'ParseError: zod\'s ~standard.jsonSchema.output threw ("unsupported")'
		)
		let thrown: unknown
		try {
			parse(Zod)
		} catch (e) {
			thrown = e
		}
		attest((thrown as { cause?: unknown }).cause === cause).equals(true)
	})

	it("throws a ParseError on a primitive", () => {
		attest(() => parse(5 as never)).throws.snap(
			"ParseError: Schema must be a Root, a Standard JSON Schema or a JSON Schema (was 5)"
		)
		attest(() => parse(Symbol("foo") as never)).throws(
			writeUnparsableSchemaMessage("Symbol(foo)")
		)
	})

	it("reads a callable Standard JSON Schema", () => {
		const Callable = Object.assign(() => {}, standardSchema({ type: "string" }))
		attest(parse(Callable).expression).snap("string")
		attest(() => parse((() => {}) as never)).throws(
			writeUnparsableSchemaMessage("Function(fn)")
		)
	})

	it("throws on a keyword it can't read exactly", () => {
		attest(() =>
			parse({ properties: { a: { unevaluatedProperties: false } } })
		).throws.snap(
			"ParseError: #/properties/a/unevaluatedProperties can't be read as a set of values"
		)
	})

	it("throws on an invalid keyword value", () => {
		attest(() => parse({ items: { minLength: -1 } })).throws.snap(
			"ParseError: #/items/minLength must be a non-negative integer (was -1)"
		)
		attest(() => parse({ pattern: "(" })).throws.snap(
			'ParseError: #/pattern must be a valid pattern (was "(")'
		)
		attest(() => parse({ anyOf: [] })).throws.snap(
			"ParseError: #/anyOf must be a non-empty array of schemas (was [])"
		)
	})

	it("points into dependentSchemas", () => {
		attest(() =>
			parse({ dependentSchemas: { a: { minLength: -1 } } })
		).throws.snap(
			"ParseError: #/dependentSchemas/a/minLength must be a non-negative integer (was -1)"
		)
	})
})
