import { attest, contextualize } from "@ark/attest"
import { rootSchema, schemaScope } from "@ark/schema"
import { encode, inverses } from "@ark/schema/codecs"
import { parse, toJsonSchema } from "arksets"

contextualize(() => {
	describe("fromJsonSchema multipleOf", () => {
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

	describe("fromJsonSchema const Object.prototype keys", () => {
		it("requires own properties for Object.prototype keys", () => {
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
			attest(ProtoConst.allows(JSON.parse('{"__proto__":{"a":1}}'))).equals(
				true
			)
		})
	})

	describe("fromJsonSchema cycle & depth guards", () => {
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
			attest(() => parse(selfProp)).throws("is circular")

			const selfAllOf: { allOf: unknown[] } = { allOf: [] }
			selfAllOf.allOf.push(selfAllOf)
			attest(() => parse(selfAllOf)).throws("is circular")

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
			attest(() => parse(deep5000)).throws("maximum nesting depth")
			attest(() =>
				parse({ $ref: "https://example.com/a", items: deep5000 })
			).throws("maximum nesting depth")
		})
	})

	describe("toJsonSchema fixes", () => {
		it("does not mix input and output sides for +: delete with defaulted keys", () => {
			const T = rootSchema({
				domain: "object",
				required: [{ key: "b", value: "number" }],
				optional: [{ key: "a", value: "string", default: "x" }],
				undeclared: "delete"
			})
			attest(T.toJsonSchema({ dialect: null })).snap({
				type: "object",
				properties: {
					b: { type: "number" },
					a: { type: "string", default: "x" }
				},
				required: ["b"]
			})
			attest(T.toJsonSchema({ dialect: null, io: "in" })).snap({
				type: "object",
				properties: {
					b: { type: "number" },
					a: { type: "string", default: "x" }
				},
				required: ["b"]
			})
			attest(T.toJsonSchema({ dialect: null, io: "out" })).snap({
				type: "object",
				properties: { a: { type: "string" }, b: { type: "number" } },
				required: ["a", "b"],
				additionalProperties: false
			})

			const Morph = rootSchema({
				in: "string",
				morphs: [(s: string) => Number(s)],
				declaredOut: rootSchema("number")
			})
			attest(Morph.toJsonSchema({ dialect: null, io: "in" })).snap({
				type: "string"
			})
			attest(Morph.toJsonSchema({ dialect: null, io: "out" })).snap({
				type: "number"
			})
		})

		it("does not duplicate union meta onto branches", () => {
			const SN = rootSchema(["string", "number"]).configure({ title: "SN" })
			attest(SN.toJsonSchema({ dialect: null })).snap({
				anyOf: [{ type: "number" }, { type: "string" }],
				title: "SN"
			})

			const DescribedBranch = rootSchema([
				rootSchema("string").describe("text"),
				"number"
			]).configure({ title: "SN" })
			attest(DescribedBranch.toJsonSchema({ dialect: null })).snap({
				anyOf: [{ type: "number" }, { type: "string", description: "text" }],
				title: "SN"
			})

			const Nullable = rootSchema(["string", { unit: null }]).configure({
				title: "SN"
			})
			attest(Nullable.toJsonSchema({ dialect: null })).snap({
				anyOf: [{ type: "string" }, { type: "null" }],
				title: "SN"
			})
		})

		it("JSON-Pointer-escapes alias $refs and handles Object.prototype def names", () => {
			const $ = schemaScope({
				"a/b": { domain: "object", required: [{ key: "x", value: "string" }] },
				"a~b": { domain: "object", required: [{ key: "y", value: "number" }] },
				"a b": { domain: "object", required: [{ key: "z", value: "boolean" }] },
				toString: {
					domain: "object",
					required: [{ key: "s", value: "string" }]
				}
			})
			const defs = $.export()
			const root = $.schema({
				domain: "object",
				required: [
					{ key: "slash", value: defs["a/b"] },
					{ key: "tilde", value: defs["a~b"] },
					{ key: "space", value: defs["a b"] },
					{ key: "str", value: defs.toString }
				]
			})

			const schema = root.toJsonSchema({ aliasDefs: true, dialect: null })
			attest(schema).unknown.snap({
				type: "object",
				properties: {
					slash: { $ref: "#/$defs/a~1b" },
					space: { $ref: "#/$defs/a%20b" },
					str: { $ref: "#/$defs/toString" },
					tilde: { $ref: "#/$defs/a~0b" }
				},
				required: ["slash", "space", "str", "tilde"],
				$defs: {
					"a/b": {
						type: "object",
						properties: { x: { type: "string" } },
						required: ["x"]
					},
					"a b": {
						type: "object",
						properties: { z: { type: "boolean" } },
						required: ["z"]
					},
					toString: {
						type: "object",
						properties: { s: { type: "string" } },
						required: ["s"]
					},
					"a~b": {
						type: "object",
						properties: { y: { type: "number" } },
						required: ["y"]
					}
				}
			})

			// round-trips through parse without losing any $ref
			const parsed = parse(schema)
			attest(
				parsed.allows({
					slash: { x: "hi" },
					tilde: { y: 1 },
					space: { z: true },
					str: { s: "ok" }
				})
			).equals(true)
			attest(
				parsed.allows({
					slash: { x: 1 },
					tilde: { y: 1 },
					space: { z: true },
					str: { s: "ok" }
				})
			).equals(false)
		})
	})

	describe("codec composition fixes (#1764.1 & #1764.2)", () => {
		const parseIso = (s: string) => new Date(s)
		inverses.set(parseIso, (d: Date) => d.toISOString())

		it("preserves declaredIn and intersects declaredOut across pipe (#1764.1)", () => {
			const declaredIn = rootSchema({ domain: "string", pattern: "^\\d{4}" })
			const BaseCodec = rootSchema({
				in: "string",
				morphs: [parseIso],
				declaredIn,
				declaredOut: rootSchema("Date")
			})
			const Narrowed = BaseCodec.rawPipeOnce(
				rootSchema({
					proto: Date,
					predicate: [(d: Date) => d.getFullYear() > 2000]
				})
			)
			attest(Narrowed._in.expression).equals(declaredIn.expression)

			const encoder = encode(Narrowed)
			attest(String(encoder("not a date"))).snap("must be a Date")
			attest(String(encoder(new Date("1999-01-01T00:00:00.000Z")))).snap(
				"must be valid according to an anonymous predicate"
			)
			attest(encoder(new Date("2025-01-01T00:00:00.000Z"))).equals(
				"2025-01-01T00:00:00.000Z"
			)
		})

		it("intersects declaredIn when intersecting a morph with input constraints (#1764.2)", () => {
			const declaredIn = rootSchema({
				domain: "string",
				predicate: [
					{
						predicate: (s: string) => !Number.isNaN(Date.parse(s)),
						meta: { jsonSchema: { type: "string", format: "date-time" } }
					}
				]
			})
			const DateCodec = rootSchema({
				in: "string",
				morphs: [parseIso],
				declaredIn,
				declaredOut: rootSchema("Date")
			})
			const LongDate = DateCodec.and({ domain: "string", minLength: 100 })
			const encoder = encode(LongDate)
			attest(String(encoder(new Date(0)))).snap("must be at least length 100")
			attest(toJsonSchema(LongDate, { io: "in", dialect: null })).snap({
				type: "string",
				format: "date-time",
				minLength: 100
			})
		})
	})
})
