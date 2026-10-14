import { attest, contextualize } from "@ark/attest"
import { rootSchema, type StandardJSONSchemaV1 } from "@ark/schema"
import { parse, toJsonSchema } from "arksets"
import { writeUnparsableSchemaMessage } from "arksets/internal"

// stands in for a zod schema, which reads its JSON Schema the same way
const standardSchema = (
	input: object,
	output: object = input
): StandardJSONSchemaV1 & { targets: string[] } => {
	const targets: string[] = []
	return {
		targets,
		"~standard": {
			version: 1,
			vendor: "zod",
			jsonSchema: {
				input: opts => (targets.push(opts.target), input as never),
				output: opts => (targets.push(opts.target), output as never)
			}
		}
	}
}

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

	it("caches a read per schema and io", () => {
		const Zod = standardSchema({ type: "string" })
		attest(parse(Zod) === parse(Zod)).equals(true)
		parse(Zod, { io: "out" })
		attest(Zod.targets).snap(["draft-2020-12", "draft-2020-12"])
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
		).snap("{ owner?: { name: unknown } }")
	})

	it("reads a recursive JSON Schema", () => {
		const Node = parse({
			$defs: {
				node: {
					type: "object",
					properties: { child: { $ref: "#/$defs/node" } },
					required: ["value"]
				}
			},
			$ref: "#/$defs/node"
		})
		attest(Node.allows({ value: 1, child: { value: 2 } })).equals(true)
		attest(Node.allows({ value: 1, child: { child: { value: 3 } } })).equals(
			false
		)
	})

	it("constrains only the type a keyword is for", () => {
		attest(parse({ minimum: 5 }).expression).snap(
			"bigint | string | symbol | number >= 5 | object | Array | undefined | false | null | true"
		)
	})

	it("reads object and array consts as structures", () => {
		attest(parse({ const: { a: [1, "x"] } }).expression).snap(
			'{ a: [1, "x"], + (undeclared): reject }'
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
			writeUnparsableSchemaMessage("a Standard Schema without jsonSchema")
		)
	})

	it("throws on a keyword it can't read exactly", () => {
		attest(() =>
			parse({ properties: { a: { unevaluatedProperties: false } } })
		).throws.snap(
			"ParseError: #/properties/a/unevaluatedProperties can't be read as a set of values"
		)
		attest(() =>
			parse({ $ref: "https://example.com/schema.json" })
		).throws.snap(
			"ParseError: #/$ref must be a JSON Pointer into its document like #/$defs/name, outside any nested $id (was https://example.com/schema.json)"
		)
		attest(() => parse({ $ref: "#/$defs/missing" })).throws.snap(
			"ParseError: $ref #/$defs/missing doesn't resolve to a schema in its document"
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
})
