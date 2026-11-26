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
		attest(parse(Zod)).is(parse(Zod))
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
		// @ts-expect-error
		attest(() => parse([{ type: "string" }])).throws(
			writeUnparsableSchemaMessage('[{"type":"string"}]')
		)
		attest(() =>
			parse({ "~standard": { version: 1, vendor: "valibot" } } as never)
		).throws(
			writeUnparsableSchemaMessage(
				"a valibot Standard Schema without ~standard.jsonSchema"
			)
		)
		attest(() => parse({ "~standard": null } as never)).throws(
			writeUnparsableSchemaMessage('{"~standard":null}')
		)
	})

	it("writes a Root's JSON Schema as its own toJsonSchema() would", () => {
		const Defaulted = rootSchema({
			domain: "object",
			optional: [{ key: "a", value: "number", default: 1 }]
		})
		attest(toJsonSchema(Defaulted)).equals(Defaulted.toJsonSchema())
		attest(toJsonSchema(Defaulted)).snap({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "object",
			properties: { a: { type: "number", default: 1 } }
		})
		const Parsed = rootSchema({
			in: "string",
			morphs: [(s: string) => s.length]
		})
		attest(() => toJsonSchema(Parsed)).throws
			.snap(`ToJsonSchemaError: Can't convert "morph" to JSON Schema. Configure fallback.morph to write it:
{
    code: "morph",
    base: {
        type: "string"
    },
    out: null
}`)
	})

	it("ignores the keywords from 2019-09 on in an earlier dialect", () => {
		const draft07 = "http://json-schema.org/draft-07/schema#"
		// draft-07 has no unevaluatedProperties, and ignores a $ref's siblings
		attest(
			parse({
				$schema: draft07,
				$ref: "#/definitions/a",
				definitions: { a: { type: "string" } },
				unevaluatedProperties: false
			}).expression
		).snap("string")
		attest(
			parse({ $schema: draft07, type: "object", unevaluatedProperties: false })
				.expression
		).snap("object & isNonArray")
		// its siblings' values are still checked, as a meta-schema would
		attest(() =>
			parse({
				$schema: draft07,
				$ref: "#/definitions/a",
				definitions: { a: {} },
				minLength: -1
			})
		).throws.snap(
			"ParseError: #/minLength must be a non-negative integer (was -1)"
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
		attest((thrown as { cause?: unknown }).cause).is(cause)
	})

	it("throws a ParseError on a primitive", () => {
		attest(() => parse(5 as never)).throws.snap(
			"ParseError: Schema must be a Type, a Standard JSON Schema or a JSON Schema (was 5)"
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

	it("validates annotation value types with ParseError", () => {
		attest(() =>
			parse({ type: "string", description: 123 as never })
		).throws.snap("ParseError: #/description must be a string (was 123)")
		attest(() =>
			parse({ type: "string", title: { bad: true } as never })
		).throws.snap('ParseError: #/title must be a string (was {"bad":true})')
		attest(() =>
			parse({ type: "string", examples: { a: 1 } as never })
		).throws.snap('ParseError: #/examples must be an array (was {"a":1})')
		attest(() =>
			parse({ type: "string", deprecated: "yes" as never })
		).throws.snap('ParseError: #/deprecated must be a boolean (was "yes")')
		attest(() =>
			parse({
				type: "object",
				properties: { a: { type: "string", description: null as never } }
			})
		).throws.snap(
			"ParseError: #/properties/a/description must be a string (was null)"
		)
		// undefined optional annotations are treated as absent
		attest(
			parse({
				type: "string",
				title: undefined,
				description: undefined,
				examples: undefined
			}).expression
		).snap("string")
	})

	it("reads back the nullable its openapi-3.0 target writes", () => {
		const schemas = [
			["string", { unit: null }],
			{ unit: null },
			[{ unit: "a" }, { unit: "b" }, { unit: null }]
		] as const
		for (const schema of schemas) {
			const T = rootSchema(schema)
			const written = toJsonSchema(T, { target: "openapi-3.0" })
			attest(parse(written).equals(T)).equals(true)
		}
	})

	it("reads OpenAPI 3.0 nullable without a sibling type", () => {
		const defs = { A: { type: "string" } } as const
		attest(
			parse({ $defs: defs, allOf: [{ $ref: "#/$defs/A" }], nullable: true })
				.expression
		).snap("string | null")
		attest(
			parse({
				anyOf: [{ type: "string" }, { type: "number" }],
				nullable: true
			}).expression
		).snap("number | string | null")
		attest(
			parse({
				oneOf: [{ type: "string" }, { type: "number" }],
				nullable: true
			}).expression
		).snap("number | string | null")
		attest(
			parse({ $defs: defs, $ref: "#/$defs/A", nullable: true }).expression
		).snap("string | null")
		attest(parse({ enum: ["a", "b"], nullable: true }).expression).snap(
			'"a" | "b" | null'
		)
		attest(parse({ const: "a", nullable: true }).expression).snap('"a" | null')
		attest(parse({ nullable: true }).expression).snap("unknown")
		attest(
			parse({ $defs: defs, allOf: [{ $ref: "#/$defs/A" }], nullable: false })
				.expression
		).snap("string")
		attest(parse({ nullable: false }).expression).snap("unknown")
	})

	it("throws on contradictory or malformed OpenAPI 3.0 nullable", () => {
		attest(() =>
			parse({ type: ["string", "null"], nullable: false })
		).throws.snap(
			"ParseError: #/nullable can't be false beside a type that includes null"
		)
		attest(() => parse({ type: "null", nullable: false })).throws.snap(
			"ParseError: #/nullable can't be false beside a type that includes null"
		)
		attest(() =>
			parse({ allOf: [{ type: "string" }], nullable: "true" as never })
		).throws.snap('ParseError: #/nullable must be a boolean (was "true")')
	})

	it("reads untyped constrained subschemas over JSON domains and converts cleanly", () => {
		const Root = parse({ type: "object", properties: { n: { minimum: 0 } } })
		attest(Root.allows({ n: 5 })).equals(true)
		attest(Root.allows({ n: "x" })).equals(true)
		attest(Root.allows({ n: -1 })).equals(false)
		attest(Root.allows({ n: undefined })).equals(false)
		attest(Root.allows({ n: 10n })).equals(false)
		attest(Root.allows({ n: Symbol("s") })).equals(false)
		attest(Root.allows({ n: () => {} })).equals(false)

		const written = toJsonSchema(Root)
		attest(parse(written).equals(Root)).equals(true)
		const nProp = (
			written as { properties: { n: { anyOf: Record<string, unknown>[] } } }
		).properties.n
		attest(nProp.anyOf.some(branch => Object.keys(branch).length === 0)).equals(
			false
		)
		attest(
			nProp.anyOf.some(
				branch => branch.type === "number" && branch.minimum === 0
			)
		).equals(true)
	})

	it("rejects functions for type object and round-trips through toJsonSchema", () => {
		const Obj = parse({ type: "object" })
		attest(Obj.allows({})).equals(true)
		attest(Obj.allows([])).equals(false)
		attest(Obj.allows(() => {})).equals(false)
		attest(toJsonSchema(Obj)).snap({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "object",
			properties: {}
		})
	})

	it("points into dependentSchemas", () => {
		attest(() =>
			parse({ dependentSchemas: { a: { minLength: -1 } } })
		).throws.snap(
			"ParseError: #/dependentSchemas/a/minLength must be a non-negative integer (was -1)"
		)
	})

	describe("decimal multipleOf", () => {
		it("handles decimal steps without float division drift", () => {
			const tenths = parse({ type: "number", multipleOf: 0.1 })
			attest(tenths.allows(0.3)).equals(true)
			attest(tenths.allows(-0.3)).equals(true)
			attest(tenths.allows(0)).equals(true)
			attest(tenths.allows(1.5)).equals(true)
			attest(tenths.allows(0.35)).equals(false)
			attest(tenths.allows(0.1 + 0.2)).equals(false)
			attest(tenths.allows(1e14 + 0.05)).equals(false)

			const cents = parse({ type: "number", multipleOf: 0.01 })
			for (const valid of [19.99, 4.35, 0.07, 0.29, 1.15, 0.35])
				attest(cents.allows(valid)).equals(true)
			attest(cents.allows(19.991)).equals(false)
			attest(cents.allows(0.005)).equals(false)

			const sevenths = parse({ type: "number", multipleOf: 0.07 })
			attest(sevenths.allows(2.03)).equals(true)
			attest(sevenths.allows(2.04)).equals(false)

			const tiny = parse({ type: "number", multipleOf: 1e-7 })
			attest(tiny.allows(3e-7)).equals(true)
			attest(tiny.allows(2.5e-7)).equals(false)
		})

		it("handles huge finite numbers where data / divisor overflows", () => {
			const halves = parse({ type: "number", multipleOf: 0.5 })
			attest(halves.allows(1e308)).equals(true)
			attest(halves.allows(-1e308)).equals(true)
			attest(halves.allows(0.3)).equals(false)

			const thirds = parse({ type: "number", multipleOf: 0.3 })
			attest(thirds.allows(0.9)).equals(true)
			attest(thirds.allows(1e308)).equals(false)
		})
	})

	it("requires own properties for Object.prototype keys in const", () => {
		const Ctor = parse({ const: { constructor: Object } })
		attest(Ctor.allows({})).equals(false)
		attest(Ctor.allows({ constructor: Object })).equals(true)
		attest(Ctor.allows({ constructor: Object, extra: 1 })).equals(false)

		const Mixed = parse({ const: { toString: "x", a: 1 } })
		attest(Mixed.allows({ a: 1 })).equals(false)
		attest(Mixed.allows({ toString: "x", a: 1 })).equals(true)

		const protoPayload = JSON.parse('{"__proto__":{"a":1}}')
		const ProtoConst = parse({ const: protoPayload })
		attest(ProtoConst.allows({})).equals(false)
		attest(ProtoConst.allows(JSON.parse('{"__proto__":{"a":1}}'))).equals(true)
	})

	describe("cycle and depth guards", () => {
		it("rejects shallow $ref cycles through not, oneOf, if/then/else and dependentSchemas", () => {
			const shallowCyclicSchemas = [
				{
					$defs: { a: { not: { $ref: "#/$defs/a" } } },
					$ref: "#/$defs/a"
				},
				{
					$defs: {
						a: { oneOf: [{ $ref: "#/$defs/a" }, { type: "string" }] }
					},
					$ref: "#/$defs/a"
				},
				{
					$defs: {
						a: { if: { $ref: "#/$defs/a" }, then: { type: "string" } }
					},
					$ref: "#/$defs/a"
				},
				{
					$defs: {
						a: { if: { type: "string" }, then: { $ref: "#/$defs/a" } }
					},
					$ref: "#/$defs/a"
				},
				{
					$defs: {
						a: {
							if: { type: "string" },
							then: { type: "string" },
							else: { $ref: "#/$defs/a" }
						}
					},
					$ref: "#/$defs/a"
				},
				{
					$defs: {
						a: { dependentSchemas: { x: { $ref: "#/$defs/a" } } }
					},
					$ref: "#/$defs/a"
				},
				{ not: { $ref: "#" } },
				{
					$defs: {
						a: { not: { $ref: "#/$defs/b" } },
						b: { $ref: "#/$defs/a" }
					},
					$ref: "#/$defs/a"
				}
			] as const
			for (const schema of shallowCyclicSchemas)
				attest(() => parse(schema as never)).throws("shallow $ref cycle")
		})

		it("allows guarded $ref cycles inside not / oneOf", () => {
			const NotNested = parse({
				$defs: {
					a: { not: { properties: { x: { $ref: "#/$defs/a" } } } }
				},
				$ref: "#/$defs/a"
			})
			attest(NotNested.allows({})).equals(false)
			attest(NotNested.allows({ x: {} })).equals(true)
			attest(NotNested.allows({ x: { x: {} } })).equals(false)
		})

		it("rejects circular JS schema objects with ParseError", () => {
			const selfProp: { type: string; properties: Record<string, unknown> } = {
				type: "object",
				properties: {}
			}
			selfProp.properties.self = selfProp
			attest(() => parse(selfProp)).throws.snap(
				"ParseError: JSON Schema at #/properties/self is circular"
			)

			const selfAllOf: { allOf: unknown[] } = { allOf: [] }
			selfAllOf.allOf.push(selfAllOf)
			attest(() => parse(selfAllOf)).throws.snap(
				"ParseError: JSON Schema at #/allOf/0 is circular"
			)

			// non-circular shared DAG remains valid
			const shared = { type: "string" } as const
			const dag = parse({
				type: "object",
				properties: { a: shared, b: shared },
				required: ["a", "b"]
			})
			attest(dag.allows({ a: "x", b: "y" })).equals(true)
		})

		it("guards excessive nesting depth while preserving 150-level schemas", () => {
			let deep150: Record<string, unknown> = { type: "string" }
			let data150: unknown = "ok"
			for (let i = 0; i < 150; i++) {
				deep150 = { type: "array", items: deep150 }
				data150 = [data150]
			}
			const Deep150 = parse(deep150)
			attest(Deep150.allows(data150)).equals(true)
			attest(Deep150.allows(["wrong"])).equals(false)

			let deep5000: Record<string, unknown> = { type: "string" }
			for (let i = 0; i < 5000; i++)
				deep5000 = { type: "array", items: deep5000 }
			attest(() => parse(deep5000)).throws(
				"exceeds maximum nesting depth of 512"
			)
			attest(() =>
				parse({ $ref: "https://example.com/a", items: deep5000 })
			).throws("exceeds maximum nesting depth of 512")
		})

		it("rejects circular and deeply nested const, enum, default, and examples with ParseError", () => {
			const circularObj: Record<string, unknown> = {}
			circularObj.self = circularObj
			const circularArr: unknown[] = []
			circularArr.push(circularArr)

			attest(() => parse({ const: circularObj })).throws.snap(
				"ParseError: JSON Schema at #/const/self is circular"
			)
			attest(() => parse({ const: circularArr })).throws.snap(
				"ParseError: JSON Schema at #/const/0 is circular"
			)
			attest(() => parse({ enum: [circularObj] })).throws.snap(
				"ParseError: JSON Schema at #/enum/0/self is circular"
			)
			attest(() => parse({ enum: circularArr })).throws.snap(
				"ParseError: JSON Schema at #/enum/0 is circular"
			)
			attest(() =>
				parse({ type: "object", default: circularObj as never })
			).throws.snap("ParseError: JSON Schema at #/default/self is circular")
			attest(() =>
				parse({ type: "object", examples: [circularObj] as never })
			).throws.snap("ParseError: JSON Schema at #/examples/0/self is circular")

			let deepObj: Record<string, unknown> = { leaf: 1 }
			let deepArr: unknown[] = [1]
			for (let i = 0; i < 20_000; i++) {
				deepObj = { a: deepObj }
				deepArr = [deepArr]
			}
			for (const schema of [
				{ const: deepObj },
				{ const: deepArr },
				{ enum: [deepObj] },
				{ type: "object", default: deepObj },
				{ type: "array", default: deepArr },
				{ type: "object", examples: [deepObj] }
			]) {
				attest(() => parse(schema)).throws(
					"exceeds maximum nesting depth of 64"
				)
			}

			// non-circular shared DAG in const and default remains valid
			const shared = { x: 1 }
			const ConstDag = parse({ const: { a: shared, b: shared } })
			attest(ConstDag.allows({ a: { x: 1 }, b: { x: 1 } })).equals(true)
			attest(ConstDag.allows({ a: { x: 1 }, b: { x: 2 } })).equals(false)
			const DefaultDag = parse({
				type: "object",
				default: { a: shared, b: shared }
			})
			attest(DefaultDag.allows({})).equals(true)
		})
	})
})
