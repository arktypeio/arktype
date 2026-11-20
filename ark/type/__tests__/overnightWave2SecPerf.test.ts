import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	Domain,
	node,
	NodeCompiler,
	rootSchema,
	writeInvalidRangeRuleMessage
} from "@ark/schema"
import { UndetailedErrors } from "@ark/schema/errors"
import { getBuiltinNameOfConstructor } from "@ark/util"
import {
	ArkErrors as RuntimeArkErrors,
	FirstIssues,
	InvalidErrors,
	unreadErrors
} from "arktype/runtime"
import { ArkErrors, fromJsonSchema, ParseError, scope, type } from "arktype"

const expectParseError = (
	fn: () => unknown,
	pattern?: RegExp | string
): void => {
	let caught: unknown
	try {
		fn()
	} catch (e) {
		caught = e
	}
	attest(caught instanceof ParseError).equals(true)
	if (typeof pattern === "string")
		attest((caught as Error).message.includes(pattern)).equals(true)
	else if (pattern) attest((caught as Error).message).satisfies(pattern)
}

contextualize(() => {
	describe("P1: ArkErrors non-writable Symbol.hasInstance", () => {
		it("installs Symbol.hasInstance as a non-writable own property while preserving parity and subclasses", () => {
			const desc = Object.getOwnPropertyDescriptor(
				ArkErrors,
				Symbol.hasInstance
			)
			attest(desc?.writable).equals(false)
			attest(typeof desc?.value).equals("function")

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

			class SubErrors extends ArkErrors {}
			const cfg = type("string").internal.$.cfg
			const sub = new SubErrors(cfg)
			const full = type("string")(1) as type.errors
			const undetailed = new UndetailedErrors(cfg)

			attest(sub instanceof SubErrors).equals(true)
			attest(sub instanceof ArkErrors).equals(true)
			attest(full instanceof SubErrors).equals(false)
			attest(runtimeErr instanceof SubErrors).equals(false)
			attest(undetailed instanceof UndetailedErrors).equals(true)
			attest(undetailed instanceof ArkErrors).equals(true)
			attest(runtimeErr instanceof UndetailedErrors).equals(false)

			for (const other of [null, undefined, 0, {}, { " arkKind": "errors" }])
				attest(other instanceof ArkErrors).equals(false)
		})
	})

	describe("J1: code injection guards on min/max, domain, and numeric rules", () => {
		it("rejects non-number min/max rules and never evaluates injected payloads", () => {
			const g = globalThis as Record<string, unknown>
			delete g.__arkJ1Pwned

			const payloads: unknown[] = [
				"0||(globalThis.__arkJ1Pwned='min')",
				"1e-999999999999",
				true,
				null
			]

			for (const payload of payloads) {
				expectParseError(
					() => type.schema({ domain: "number", min: payload as never }),
					writeInvalidRangeRuleMessage("min", payload)
				)
				expectParseError(
					() => type.schema({ domain: "number", max: payload as never }),
					writeInvalidRangeRuleMessage("max", payload)
				)
				expectParseError(
					() => node("min", { rule: payload as never }),
					writeInvalidRangeRuleMessage("min", payload)
				)
			}

			const spoofedObj = {
				valueOf: () => "0||(globalThis.__arkJ1Pwned='obj')"
			}
			expectParseError(
				() =>
					type.schema({
						domain: "number",
						min: { rule: spoofedObj as never }
					}),
				writeInvalidRangeRuleMessage("min", spoofedObj)
			)
			expectParseError(() =>
				type.schema({ domain: "number", min: spoofedObj as never })
			)

			expectParseError(() =>
				type.schema({
					domain: "number",
					notEqual: {
						rule: {
							valueOf: () => "0||(globalThis.__arkJ1Pwned='ne')"
						} as never
					}
				})
			)
			expectParseError(() => node("before", { rule: "0||1" as never }))
			expectParseError(() => node("after", { rule: new Date(NaN) }))
			expectParseError(() =>
				type.schema({ domain: "number", divisor: "1||1" as never })
			)
			expectParseError(() =>
				type.schema({ domain: "string", minLength: "0||1" as never })
			)
			expectParseError(() =>
				type.schema({ domain: "string", maxLength: "0||1" as never })
			)
			expectParseError(() =>
				type.schema({ domain: "string", exactLength: "0||1" as never })
			)
			expectParseError(() =>
				type.schema({ domain: "string", notEqualLength: "0||1" as never })
			)

			attest(g.__arkJ1Pwned).equals(undefined)
		})

		it("rejects invalid or injected domain values including prototype and spoofed objects", () => {
			const g = globalThis as Record<string, unknown>
			delete g.__arkJ1Domain

			const badDomains: unknown[] = [
				'string"||(globalThis.__arkJ1Domain=1)||"',
				"toString",
				"constructor",
				"__proto__",
				{ toString: () => "string" },
				123
			]

			for (const bad of badDomains) {
				expectParseError(
					() => type.schema({ domain: bad as never }),
					Domain.writeInvalidDomainMessage(bad)
				)
				expectParseError(
					() => rootSchema({ domain: bad as never }),
					Domain.writeInvalidDomainMessage(bad)
				)
			}

			attest(g.__arkJ1Domain).equals(undefined)
		})

		it("guards numeric literal compilation via js.num()", () => {
			class TestCompiler extends NodeCompiler {
				outline(): this {
					return this
				}
			}
			const js = new TestCompiler({ kind: "Allows" })
			attest(js.num(42)).equals("42")
			attest(js.num(-0)).equals("0")
			attest(() => js.num("0||1" as never)).throws(
				"Expected a numeric literal (was string)"
			)
			attest(() => js.num({ valueOf: () => 5 } as never)).throws(
				"Expected a numeric literal (was object)"
			)

			const minNode = node("min", { rule: 5 })
			attest(minNode.jsCond(js, "data")).equals("data >= 5")

			// even if a node's rule is tampered with after construction, jsCond rejects it
			const tampered = Object.create(minNode) as typeof minNode
			Object.defineProperty(tampered, "rule", { value: "0||1" })
			attest(() => tampered.jsCond(js, "data")).throws(
				"Expected a numeric literal (was string)"
			)
		})
	})

	describe("J2: $ark reserved internal slots", () => {
		it("prevents user classes and symbols named after internal hooks from hijacking $ark", () => {
			class inPlace {}
			class errorModes {}
			class encode {}

			const prevInPlace = $ark.inPlace
			const prevErrorModes = $ark.errorModes
			const prevEncode = $ark.encode

			const T1 = type.instanceOf(inPlace)
			const T2 = type.instanceOf(errorModes)
			const T3 = type.instanceOf(encode)
			const S = type.unit(Symbol("inPlace"))

			void T1.json
			void T2.json
			void T3.json
			attest(S.allows(Symbol("inPlace"))).equals(false)

			attest($ark.inPlace).equals(prevInPlace)
			attest($ark.errorModes).equals(prevErrorModes)
			attest($ark.encode).equals(prevEncode)

			// subsequent Types still validate normally
			const User = type({ b: "string" })
			attest(User({ b: "x" })).equals({ b: "x" })
			attest(User({ b: 1 }).toString()).snap("b must be a string")
		})
	})

	describe("J3: fromJsonSchema uniqueItems O(n) correctness and performance", () => {
		it("handles primitives, -0/0, nested objects with different key order, BigInt, and arrays", () => {
			const Unique = fromJsonSchema({ type: "array", uniqueItems: true })

			for (let i = 0; i < 3; i++) {
				attest(Unique.allows([])).equals(true)
				attest(Unique.allows([1])).equals(true)
				attest(Unique.allows([1, "1", true, false, null, 0, "0", ""])).equals(
					true
				)
				attest(Unique.allows([-0, 0])).equals(false)
				attest(Unique.allows([Number.NaN, Number.NaN])).equals(true)
				attest(
					Unique.allows([
						{ a: 1, b: 2 },
						{ b: 2, a: 1 }
					])
				).equals(false)
				attest(Unique.allows([{ a: -0 }, { a: 0 }])).equals(false)
				attest(Unique.allows([{ a: 1 }, { a: "1" }])).equals(true)
				attest(Unique.allows([{}, []])).equals(true)
				attest(Unique.allows([{ a: undefined }, {}])).equals(true)
				attest(
					Unique.allows([
						{ nested: [{ y: 2, x: 1 }] },
						{ nested: [{ x: 1, y: 2 }] }
					])
				).equals(false)
				attest(Unique.allows([{ big: 1n }, { big: 1n }])).equals(false)
				attest(Unique.allows([{ big: 1n }, { big: 2n }])).equals(true)
			}
		})

		it("validates large unique arrays in linear time", () => {
			const Unique = fromJsonSchema({ type: "array", uniqueItems: true })
			const nums = Array.from({ length: 30_000 }, (_, i) => i)
			const objs = Array.from({ length: 10_000 }, (_, i) => ({
				id: i,
				tag: `k${i}`
			}))

			const start = performance.now()
			attest(Unique.allows(nums)).equals(true)
			attest(Unique.allows([...nums, 12_345])).equals(false)
			attest(Unique.allows(objs)).equals(true)
			attest(Unique.allows([...objs, { tag: "k9999", id: 9999 }])).equals(false)
			const elapsedMs = performance.now() - start
			attest(elapsedMs < 1500).equals(true)
		})
	})

	describe("J6: fromJsonSchema shallow anyOf self-cycle rejection", () => {
		it("rejects shallow anyOf self-$ref cycles instead of failing open", () => {
			const shallowCases = [
				{
					$defs: {
						j: { anyOf: [{ $ref: "#/$defs/j" }, { type: "number" }] }
					},
					type: "object",
					properties: { x: { $ref: "#/$defs/j" } }
				},
				{ anyOf: [{ $ref: "#" }, { type: "string" }] },
				{
					$defs: {
						a: { anyOf: [{ $ref: "#/$defs/b" }, { type: "number" }] },
						b: { $ref: "#/$defs/a" }
					},
					$ref: "#/$defs/a"
				}
			] as const

			for (const schema of shallowCases) {
				expectParseError(
					() => fromJsonSchema(schema as never),
					"shallow $ref cycle"
				)
			}
		})

		it("still allows guarded recursive anyOf schemas through items and properties", () => {
			const JsonTree = fromJsonSchema({
				$defs: {
					node: {
						anyOf: [
							{ type: "number" },
							{ type: "array", items: { $ref: "#/$defs/node" } },
							{
								type: "object",
								properties: {
									next: {
										anyOf: [{ $ref: "#/$defs/node" }, { type: "null" }]
									}
								},
								additionalProperties: false
							}
						]
					}
				},
				$ref: "#/$defs/node"
			})

			attest(JsonTree.allows(1)).equals(true)
			attest(JsonTree.allows([1, [2, { next: null }]])).equals(true)
			attest(JsonTree.allows("bad")).equals(false)
			attest(JsonTree.allows({ next: "bad" })).equals(false)
		})
	})

	describe("J7: proto name own-property lookup", () => {
		it("rejects prototype-chain and unknown proto names with ParseError", () => {
			for (const bad of [
				"toString",
				"constructor",
				"valueOf",
				"__proto__",
				"Nope"
			]) {
				expectParseError(() => type.schema({ proto: bad as never }))
				expectParseError(() => type.schema(bad as never))
				expectParseError(() => rootSchema({ proto: bad as never }))
			}

			attest(getBuiltinNameOfConstructor(Object.prototype.toString)).equals(
				null
			)
			attest(getBuiltinNameOfConstructor(Array)).equals("Array")
			attest(type.schema({ proto: "Array" }).allows([1])).equals(true)
			attest(type.schema("Date").allows(new Date())).equals(true)
		})
	})

	describe("J8: empty alias compilation", () => {
		it("generates valid JS identifiers for empty aliases", () => {
			const T = type({ a: "string" }).configure({ alias: "" })
			const S = type.schema({ domain: "string", meta: { alias: "" } })
			const Cyclic = scope({ "": { a: "string", "n?": "" } }).export()[""]

			for (let i = 0; i < 3; i++) {
				attest(T.allows({ a: "ok" })).equals(true)
				attest(T.allows({ a: 1 })).equals(false)
				attest(S.allows("ok")).equals(true)
				attest(S.allows(1)).equals(false)
				attest(Cyclic.allows({ a: "x", n: { a: "y" } })).equals(true)
				attest(Cyclic.allows({ a: "x", n: { a: 1 } })).equals(false)
			}
		})
	})

	describe("F3: fromJsonSchema description preserves expected error text", () => {
		it("keeps structural expected text in error messages while preserving description metadata and JSON Schema round-trip", () => {
			const Customer = fromJsonSchema({
				type: "object",
				properties: {
					tax_exempt: {
						type: "string",
						enum: ["none", "exempt"],
						description: "Describes the customer's tax exemption status."
					},
					nickname: {
						type: ["string", "null"],
						description: "Optional display nickname."
					}
				},
				required: ["tax_exempt"]
			} as const)

			attest(Customer({ tax_exempt: "x" }).toString()).snap(
				'tax_exempt must be "exempt" or "none"'
			)
			attest(Customer({}).toString()).snap(
				'tax_exempt must be "exempt" or "none" (was missing)'
			)
			attest(Customer({ tax_exempt: "none", nickname: 123 }).toString()).snap(
				"nickname must be a string or null"
			)

			const emitted = Customer.toJsonSchema({ dialect: null }) as {
				properties: {
					tax_exempt: { description?: string; expected?: string }
				}
			}
			attest(emitted.properties.tax_exempt.description).equals(
				"Describes the customer's tax exemption status."
			)
			attest("expected" in emitted.properties.tax_exempt).equals(false)

			const Standalone = fromJsonSchema({
				type: "string",
				enum: ["none", "exempt"],
				description: "Describes tax exemption."
			} as const)
			attest(Standalone.description).equals("Describes tax exemption.")
			attest(Standalone("x").toString()).snap('must be "exempt" or "none"')
			const standaloneJson = Standalone.toJsonSchema({ dialect: null }) as {
				description?: string
				expected?: string
			}
			attest(standaloneJson.description).equals("Describes tax exemption.")
			attest("expected" in standaloneJson).equals(false)

			const NotReserved = fromJsonSchema({
				type: "string",
				not: { enum: ["admin"], description: "Reserved names." }
			} as const)
			attest(NotReserved("admin").toString()).snap('must be other than "admin"')

			const ContainsDescribed = fromJsonSchema({
				type: "array",
				contains: { type: "number", description: "A score." }
			} as const)
			attest(ContainsDescribed(["x"]).toString()).snap(
				"must be an array containing a number"
			)
		})
	})
})
