import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	Domain,
	node,
	NodeCompiler,
	rootSchema,
	writeInvalidRangeRuleMessage,
	type StandardSchemaV1
} from "@ark/schema"
import { UndetailedErrors } from "@ark/schema/errors"
import { standardFailureOf } from "@ark/schema/internal"
import { getBuiltinNameOfConstructor } from "@ark/util"
import {
	ArkErrors as RuntimeArkErrors,
	FirstIssues,
	InvalidErrors,
	standardResultOf,
	unreadErrors
} from "arktype/runtime"
import { ArkErrors, fromJsonSchema, scope, type } from "arktype"

// a runtime issue keeps the data it describes in memory
type IssueWithData = { data?: unknown }

contextualize(() => {
	describe("ArkErrors instanceof and Standard Schema serialization", () => {
		it("recognizes runtime error variants and isolates subclasses", () => {
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

		it("omits input data when JSON-serializing dynamic and precompiled Standard Schema failures and issues", () => {
			const secret = "hunter2"
			const expectedRuntimeJson =
				'{"issues":[{"code":"domain","path":[],"expected":"a number","message":"must be a number"}],"message":"must be a number"}'
			const expectedIssuesJson =
				'[{"code":"domain","path":[],"expected":"a number","message":"must be a number"}]'

			const dynamicResult = type("number")["~standard"].validate(
				secret
			) as StandardSchemaV1.FailureResult
			attest(JSON.stringify(dynamicResult)).equals(expectedRuntimeJson)
			attest(JSON.stringify(dynamicResult.issues)).equals(expectedIssuesJson)

			// Standard Schema README pattern: JSON.stringify(res.issues) with password + BigInt (10n)
			const Login = type({ password: "string >= 12", amount: "number" })
			const loginResult = Login["~standard"].validate({
				password: secret,
				amount: 10n
			}) as StandardSchemaV1.FailureResult
			attest(Array.isArray(loginResult.issues)).equals(true)
			attest((loginResult.issues[0] as IssueWithData).data).equals(secret)
			attest((loginResult.issues[1] as IssueWithData).data).equals(10n)
			const loginIssuesJson = JSON.stringify(loginResult.issues)
			attest(loginIssuesJson.includes(secret)).equals(false)
			attest(loginIssuesJson).snap(
				'[{"code":"minLength","path":["password"],"expected":"at least 12 characters","message":"must be at least 12 characters"},{"code":"domain","path":["amount"],"expected":"a number","message":"must be a number"}]'
			)
			attest(JSON.stringify(loginResult)).equals(
				`{"issues":${loginIssuesJson},"message":"password must be at least 12 characters\\namount must be a number"}`
			)

			// errors: "none" (UndetailedErrors) also serializes out.issues and res.issues safely on BigInt
			const noneScope = scope({}, { errors: "none" })
			const NoneString = noneScope.type("string")
			const noneOut = NoneString(10n) as type.errors
			attest(JSON.stringify(noneOut.issues)).snap(
				'[{"code":"predicate","path":[],"expected":"valid","message":"is invalid"}]'
			)
			const noneStd = NoneString["~standard"].validate(
				10n
			) as StandardSchemaV1.FailureResult
			attest(JSON.stringify(noneStd.issues)).equals(
				JSON.stringify(noneOut.issues)
			)

			const runtimeErr = new RuntimeArkErrors()
			runtimeErr._e(secret, "domain", "a number")
			const runtimeResult = standardResultOf(runtimeErr)
			if (!runtimeResult.issues) throw new Error("Expected failure result")
			// in-memory issues keep data, while JSON serialization strips it
			attest((runtimeResult.issues[0] as IssueWithData).data).equals(secret)
			attest(runtimeResult.message).equals(runtimeErr.summary)
			attest(JSON.stringify(runtimeResult)).equals(expectedRuntimeJson)
			attest(JSON.stringify(runtimeResult.issues)).equals(expectedIssuesJson)

			// lean/pruned errors without toJSON() serialize identically without crashing or leaking data
			const sym = Symbol("secretKey")
			const leanRuntimeErr = new RuntimeArkErrors()
			leanRuntimeErr._.push({
				code: "union",
				path: [sym],
				data: { secret, big: 10n },
				expected: "a number or a boolean",
				message: "must be a number or a boolean",
				errors: [
					{
						code: "domain",
						path: [sym],
						data: secret,
						expected: "a number",
						message: "must be a number"
					}
				]
			})
			Object.defineProperty(leanRuntimeErr, "toJSON", { value: undefined })
			const leanRuntimeResult = standardResultOf(leanRuntimeErr)
			if (!leanRuntimeResult.issues) throw new Error("Expected failure result")
			attest(JSON.stringify(leanRuntimeResult)).snap(
				'{"issues":[{"code":"union","path":["Symbol(secretKey)"],"expected":"a number or a boolean","message":"must be a number or a boolean","errors":[{"code":"domain","path":["Symbol(secretKey)"],"expected":"a number","message":"must be a number"}]}],"message":"[Symbol(secretKey)] must be a number or a boolean"}'
			)
			attest(JSON.stringify(leanRuntimeResult.issues)).snap(
				'[{"code":"union","path":["Symbol(secretKey)"],"expected":"a number or a boolean","message":"must be a number or a boolean","errors":[{"code":"domain","path":["Symbol(secretKey)"],"expected":"a number","message":"must be a number"}]}]'
			)

			const leanSchemaFailure = standardFailureOf({
				issues: [
					{
						code: "domain",
						path: [{ key: sym }, "password"],
						data: 10n,
						actual: secret,
						expected: "a number",
						message: "must be a number",
						errors: [
							{
								code: "predicate",
								path: [sym],
								data: secret,
								expected: "valid",
								message: "is invalid"
							}
						]
					} as never
				],
				summary: "password must be a number"
			})
			attest(JSON.stringify(leanSchemaFailure)).snap(
				'{"issues":[{"code":"domain","path":[{"key":"Symbol(secretKey)"},"password"],"expected":"a number","message":"must be a number","errors":[{"code":"predicate","path":["Symbol(secretKey)"],"expected":"valid","message":"is invalid"}]}],"message":"password must be a number"}'
			)
			attest(JSON.stringify(leanSchemaFailure.issues)).snap(
				'[{"code":"domain","path":[{"key":"Symbol(secretKey)"},"password"],"expected":"a number","message":"must be a number","errors":[{"code":"predicate","path":["Symbol(secretKey)"],"expected":"valid","message":"is invalid"}]}]'
			)

			const firstErr = new FirstIssues()
			firstErr._e(10n, "domain", "a number")
			const firstResult = standardResultOf(firstErr)
			if (!firstResult.issues) throw new Error("Expected failure result")
			attest(JSON.stringify(firstResult)).equals(expectedRuntimeJson)
			attest(JSON.stringify(firstResult.issues)).equals(expectedIssuesJson)

			const lazyErr = unreadErrors(
				(data, ctx) => !ctx._e(data, "domain", "a number"),
				10n,
				null
			)
			const lazyResult = standardResultOf(lazyErr)
			if (!lazyResult.issues) throw new Error("Expected failure result")
			attest(JSON.stringify(lazyResult)).equals(expectedRuntimeJson)
			attest(JSON.stringify(lazyResult.issues)).equals(expectedIssuesJson)

			const invalidResult = standardResultOf(new InvalidErrors(10n))
			if (!invalidResult.issues) throw new Error("Expected failure result")
			attest(JSON.stringify(invalidResult)).snap(
				'{"issues":[{"code":"predicate","path":[],"expected":"valid","message":"is invalid"}],"message":"is invalid"}'
			)
			attest(JSON.stringify(invalidResult.issues)).snap(
				'[{"code":"predicate","path":[],"expected":"valid","message":"is invalid"}]'
			)
		})

		it("never echoes raw rejected input via SyntaxError in string.json, string.json.parse, or string.regex", () => {
			const secret = "pw=hunter2"
			for (const [T, bad, expectedSummary] of [
				[type("string.json"), secret, "must be a JSON string"],
				[type("string.json.parse"), secret, "must be a JSON string"],
				[type("string.regex"), `(${secret}`, "must be a regex pattern"]
			] as const) {
				const out = T(bad)
				if (!(out instanceof type.errors)) throw new Error("Expected errors")
				attest(out.summary).equals(expectedSummary)
				attest(out.issues[0].message).equals(expectedSummary)
				attest((out.issues[0] as { cause?: unknown }).cause).instanceOf(
					SyntaxError
				)
				const std = T["~standard"].validate(
					bad
				) as StandardSchemaV1.FailureResult
				for (const text of [
					out.summary,
					out.issues[0].message,
					JSON.stringify(out),
					JSON.stringify(out.issues),
					JSON.stringify(std),
					JSON.stringify(std.issues)
				])
					attest(text.includes("hunter2")).equals(false)
			}
		})
	})

	describe("schema codegen injection guards", () => {
		it("rejects non-number bounds and spoofed numeric rules without evaluating payloads", () => {
			const g = globalThis as Record<string, unknown>
			delete g.__arkInjectedRule

			const payloads: unknown[] = [
				"0||(globalThis.__arkInjectedRule='min')",
				"1e-999999999999",
				true,
				null
			]

			for (const payload of payloads) {
				const minMsg = `ParseError: ${writeInvalidRangeRuleMessage("min", payload)}`
				const maxMsg = `ParseError: ${writeInvalidRangeRuleMessage("max", payload)}`
				attest(() =>
					type.schema({ domain: "number", min: payload as never })
				).throws(minMsg)
				attest(() =>
					type.schema({ domain: "number", max: payload as never })
				).throws(maxMsg)
				attest(() => node("min", { rule: payload as never })).throws(minMsg)
			}

			const spoofedObj = {
				valueOf: () => "0||(globalThis.__arkInjectedRule='obj')"
			}
			attest(() =>
				type.schema({
					domain: "number",
					min: { rule: spoofedObj as never }
				})
			).throws(`ParseError: ${writeInvalidRangeRuleMessage("min", spoofedObj)}`)
			attest(() =>
				type.schema({ domain: "number", min: spoofedObj as never })
			).throws.snap("ParseError: Key valueOf is not valid on min schema")

			attest(() =>
				type.schema({
					domain: "number",
					notEqual: {
						rule: {
							valueOf: () => "0||(globalThis.__arkInjectedRule='ne')"
						} as never
					}
				})
			).throws.snap(
				'ParseError: notEqual bound must be a number or Date (was {"valueOf":"Function(valueOf)"})'
			)
			attest(() => node("before", { rule: "0||1" as never })).throws(
				`ParseError: ${writeInvalidRangeRuleMessage("before", "0||1")}`
			)
			const invalidDate = new Date(NaN)
			attest(() => node("after", { rule: invalidDate })).throws(
				`ParseError: ${writeInvalidRangeRuleMessage("after", invalidDate)}`
			)
			attest(() =>
				type.schema({ domain: "number", divisor: "1||1" as never })
			).throws.snap("ParseError: divisor must be an integer (was 1||1)")
			attest(() =>
				type.schema({ domain: "string", minLength: "0||1" as never })
			).throws.snap(
				"ParseError: minLength bound must be a positive integer (was 0||1)"
			)
			attest(() =>
				type.schema({ domain: "string", maxLength: "0||1" as never })
			).throws.snap(
				"ParseError: maxLength bound must be a positive integer (was 0||1)"
			)
			attest(() =>
				type.schema({ domain: "string", exactLength: "0||1" as never })
			).throws.snap(
				"ParseError: exactLength bound must be a positive integer (was 0||1)"
			)
			attest(() =>
				type.schema({ domain: "string", notEqualLength: "0||1" as never })
			).throws.snap(
				"ParseError: notEqualLength bound must be a positive integer (was 0||1)"
			)

			attest(g.__arkInjectedRule).equals(undefined)
		})

		it("rejects invalid or injected domain values including prototype keys and spoofed objects", () => {
			const g = globalThis as Record<string, unknown>
			delete g.__arkInjectedDomain

			const badDomains: unknown[] = [
				'string"||(globalThis.__arkInjectedDomain=1)||"',
				"toString",
				"constructor",
				"__proto__",
				{ toString: () => "string" },
				123
			]

			for (const bad of badDomains) {
				const expected = `ParseError: ${Domain.writeInvalidDomainMessage(bad)}`
				attest(() => type.schema({ domain: bad as never })).throws(expected)
				attest(() => rootSchema({ domain: bad as never })).throws(expected)
			}

			attest(g.__arkInjectedDomain).equals(undefined)
		})

		it("guards numeric literal compilation via NodeCompiler.num", () => {
			class TestCompiler extends NodeCompiler {
				outline(): this {
					return this
				}
			}
			const js = new TestCompiler({ kind: "Allows" })
			attest(js.num(42)).equals("42")
			attest(js.num(-0)).equals("0")
			attest(() => js.num("0||1" as never)).throws.snap(
				"Error: Expected a numeric literal (was string)"
			)
			attest(() => js.num({ valueOf: () => 5 } as never)).throws.snap(
				"Error: Expected a numeric literal (was object)"
			)
			attest(node("min", { rule: 5 }).jsCond(js, "data")).equals("data >= 5")
		})
	})

	describe("$ark registry slot isolation", () => {
		it("prevents user classes and symbols named after internal hooks from overwriting $ark", () => {
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

	describe("fromJsonSchema uniqueItems", () => {
		it("handles primitives, -0/0, nested objects with different key order, BigInt, and arrays", () => {
			const Unique = fromJsonSchema({ type: "array", uniqueItems: true })

			// 3 calls cover both the first-call interpreter and compiled JIT
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

		it("handles large unique and duplicate primitive and object arrays", () => {
			const Unique = fromJsonSchema({ type: "array", uniqueItems: true })
			const nums = Array.from({ length: 10_000 }, (_, i) => i)
			const objs = Array.from({ length: 5_000 }, (_, i) => ({
				id: i,
				tag: `k${i}`
			}))

			attest(Unique.allows(nums)).equals(true)
			attest(Unique.allows([...nums, 4_321])).equals(false)
			attest(Unique.allows(objs)).equals(true)
			attest(Unique.allows([...objs, { tag: "k4999", id: 4999 }])).equals(false)
		})
	})

	describe("fromJsonSchema recursive anyOf", () => {
		it("rejects shallow anyOf self-$ref cycles instead of failing open", () => {
			attest(() =>
				fromJsonSchema({
					$defs: {
						j: { anyOf: [{ $ref: "#/$defs/j" }, { type: "number" }] }
					},
					type: "object",
					properties: { x: { $ref: "#/$defs/j" } }
				})
			).throws.snap(
				"ParseError: #/$defs/j/anyOf/0 has a shallow $ref cycle (#/$defs/j)"
			)
			attest(() =>
				fromJsonSchema({ anyOf: [{ $ref: "#" }, { type: "string" }] })
			).throws.snap("ParseError: #/anyOf/0 has a shallow $ref cycle (#)")
			attest(() =>
				fromJsonSchema({
					$defs: {
						a: { anyOf: [{ $ref: "#/$defs/b" }, { type: "number" }] },
						b: { $ref: "#/$defs/a" }
					},
					$ref: "#/$defs/a"
				})
			).throws.snap(
				"ParseError: #/$defs/b has a shallow $ref cycle (#/$defs/a)"
			)
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

	describe("proto name lookup", () => {
		it("rejects prototype-chain and unknown proto names with ParseError", () => {
			for (const bad of [
				"toString",
				"constructor",
				"valueOf",
				"__proto__",
				"Nope"
			]) {
				const protoMsg = `ParseError: {"proto":"${bad}"} is not a valid type schema`
				attest(() => type.schema({ proto: bad as never })).throws(protoMsg)
				attest(() => rootSchema({ proto: bad as never })).throws(protoMsg)
				attest(() => type.schema(bad as never)).throws(
					`ParseError: "${bad}" is not a valid type schema`
				)
			}

			attest(getBuiltinNameOfConstructor(Object.prototype.toString)).equals(
				null
			)
			attest(getBuiltinNameOfConstructor(Array)).equals("Array")
			attest(type.schema({ proto: "Array" }).allows([1])).equals(true)
			attest(type.schema("Date").allows(new Date())).equals(true)
		})
	})

	describe("empty alias compilation", () => {
		it("generates valid JS identifiers for empty aliases", () => {
			const T = type({ a: "string" }).configure({ alias: "" })
			const S = type.schema({ domain: "string", meta: { alias: "" } })
			const Cyclic = scope({ "": { a: "string", "n?": "" } }).export()[""]

			// 3 calls cover both the first-call interpreter and compiled JIT
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

	describe("fromJsonSchema description annotations", () => {
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
