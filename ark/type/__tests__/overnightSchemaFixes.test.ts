import { attest, contextualize } from "@ark/attest"
import {
	copyDeclared,
	mergeTransformed,
	writeInvalidLocaleObjectMessage,
	type StandardSchemaV1
} from "@ark/schema"
import { UndetailedErrors } from "@ark/schema/errors"
import {
	ArkErrors as RuntimeArkErrors,
	FirstIssues,
	InvalidErrors,
	unreadErrors
} from "arktype/runtime"
import { ArkErrors, fromJsonSchema, messageIn, ParseError, type } from "arktype"

const hasOwn = Object.prototype.hasOwnProperty

const expectSafeProto = (out: object, expectedProtoValue: unknown): void => {
	attest(Object.getPrototypeOf(out)).equals(Object.prototype)
	attest(hasOwn.call(out, "__proto__")).equals(true)
	attest((out as { hijacked?: unknown }).hijacked).equals(undefined)
	attest(Object.getOwnPropertyDescriptor(out, "__proto__")?.value).equals(
		expectedProtoValue
	)
}

const expectParseError = (fn: () => unknown, message: string): void => {
	let caught: unknown
	try {
		fn()
	} catch (e) {
		caught = e
	}
	attest(caught instanceof ParseError).equals(true)
	attest((caught as Error).message).equals(message)
}

contextualize(() => {
	describe("union JIT Apply unit-discriminant shortcut", () => {
		it("does not fire on 2-branch unit unions containing 'null' or 'undefined'", () => {
			const J = type("string.json.parse").to("'null' | 'number'")
			for (let i = 0; i < 3; i++) {
				attest(J("null").toString()).snap('must be "null" or "number"')
				attest(J("123").toString()).snap('must be "null" or "number"')
				attest(J('"null"')).equals("null")
				attest(J('"number"')).equals("number")
			}

			const Obj = type({ a: "'null' | 'number'", b: "string" })
			for (let i = 0; i < 3; i++) {
				attest(Obj({ a: 123, b: 456 }).toString()).snap(
					'a must be "null" or "number"\nb must be a string'
				)
				attest(Obj({ a: null, b: 456 }).toString()).snap(
					'a must be "null" or "number"\nb must be a string'
				)
			}

			const Discriminated = type({ kind: "'null'" }).or({
				kind: "'foo'",
				x: "number"
			})
			const Piped = type("unknown").pipe(x => x, Discriminated)
			for (let i = 0; i < 3; i++) {
				attest(Discriminated({ kind: "foo", x: "bad" }).toString()).snap(
					"x must be a number"
				)
				attest(Discriminated({ kind: null }).toString()).snap(
					'kind must be "foo" or "null"'
				)
				attest(Piped({ kind: null }).toString()).snap(
					'kind must be "foo" or "null"'
				)
			}

			const UndefDiscriminated = type({ kind: "'undefined'" }).or({
				kind: "'string'",
				x: type("number").narrow((n, ctx) => n > 0 || ctx.mustBe("positive"))
			})
			for (let i = 0; i < 3; i++) {
				attest(UndefDiscriminated({ kind: undefined }).toString()).snap(
					'kind must be "undefined" or "string"'
				)
				attest(UndefDiscriminated({ kind: "undefined" })).equals({
					kind: "undefined"
				})
			}
		})

		it("excludes case 'null' from typeof shortcut in 2-branch domain unions", () => {
			const NullOrUndefined = type("null")
				.configure({ message: "not null" })
				.or("undefined")
			for (let i = 0; i < 3; i++) {
				attest(NullOrUndefined(null)).equals(null)
				attest(NullOrUndefined(undefined)).equals(undefined)
				attest(NullOrUndefined(1) instanceof type.errors).equals(true)
			}
		})
	})

	describe("__proto__ prototype hijacking protection", () => {
		it("defines own __proto__ when morphing __proto__ (uncompiled and JIT)", () => {
			const T = type({
				["__proto__"]: type("object").pipe(() => ({ hijacked: true }))
			})
			for (let i = 0; i < 3; i++) {
				const out = T.assert({})
				expectSafeProto(out, { hijacked: true })
			}

			const Deleting = type({
				"+": "delete",
				["__proto__"]: type("object").pipe(() => ({ hijacked: true }))
			})
			for (let i = 0; i < 3; i++) {
				const out = Deleting.assert({ extra: 1 } as never)
				expectSafeProto(out, { hijacked: true })
				attest("extra" in out).equals(false)
			}
		})

		it("preserves non-enumerable own __proto__ without hijacking prototype", () => {
			const makeInput = () => {
				const obj: Record<string, unknown> = { a: "  hi  ", extra: 1 }
				Object.defineProperty(obj, "__proto__", {
					value: { hijacked: true },
					enumerable: false,
					configurable: true,
					writable: true
				})
				return obj
			}

			const T = type({ a: "string.trim", ["__proto__"]: "object" })
			for (let i = 0; i < 3; i++) {
				const out = T.assert(makeInput())
				expectSafeProto(out, { hijacked: true })
				attest(out.a).equals("hi")
			}

			const Deleting = type({
				"+": "delete",
				a: "string.trim",
				["__proto__"]: "object"
			})
			for (let i = 0; i < 3; i++) {
				const out = Deleting.assert(makeInput())
				expectSafeProto(out, { hijacked: true })
				attest(out.a).equals("hi")
				attest("extra" in out).equals(false)
			}
		})

		it("does not create own __proto__ when deleting undeclared keys on plain object", () => {
			const T = type({ "+": "delete", ["__proto__"]: "object" })
			for (let i = 0; i < 3; i++) {
				const out = T.assert({ a: 1 } as never)
				attest(Object.getPrototypeOf(out)).equals(Object.prototype)
				attest(hasOwn.call(out, "__proto__")).equals(false)
				attest(Object.keys(out)).equals([])
			}
		})

		it("keeps prototype intact in copyDeclared and mergeTransformed", () => {
			const customProto = { inherited: true }
			const input = Object.create(customProto) as Record<string, unknown>
			input.extra = 1
			const copied = copyDeclared(
				input,
				["__proto__"],
				["__proto__", customProto, { hijacked: true }]
			)
			attest(Object.getPrototypeOf(copied)).equals(customProto)
			attest(hasOwn.call(copied, "__proto__")).equals(true)
			attest((copied as { hijacked?: unknown }).hijacked).equals(undefined)
			attest("extra" in copied).equals(false)

			const base = { a: 1 }
			const right = JSON.parse('{"a":1,"__proto__":{"hijacked":true}}')
			const merged = mergeTransformed(base, { a: 2 }, right) as object
			expectSafeProto(merged, { hijacked: true })
		})
	})

	describe("ArkErrors instanceof parity and invalid locale messages", () => {
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

			// plain JSON objects and primitives are not ArkErrors
			for (const notErrors of [
				{ " arkKind": "errors" },
				null,
				undefined,
				5,
				{}
			] as unknown[])
				attest(notErrors instanceof ArkErrors).equals(false)
		})

		it("preserves subclass instanceof and _merge for runtime errors", () => {
			class SubErrors extends ArkErrors {}
			const cfg = type("string").internal.$.cfg
			const sub = new SubErrors(cfg)
			const full = type("string")(1) as type.errors
			const runtimeErr = new RuntimeArkErrors()
			runtimeErr._e(1, "domain", "a string")
			const undetailed = new UndetailedErrors(cfg)

			attest(sub instanceof SubErrors).equals(true)
			attest(sub instanceof ArkErrors).equals(true)
			attest(full instanceof SubErrors).equals(false)
			attest(runtimeErr instanceof SubErrors).equals(false)
			attest(undetailed instanceof UndetailedErrors).equals(true)
			attest(undetailed instanceof ArkErrors).equals(true)
			attest(full instanceof UndetailedErrors).equals(false)
			attest(runtimeErr instanceof UndetailedErrors).equals(false)

			const target = new ArkErrors(cfg)
			target._merge(runtimeErr, ["field"])
			attest(target.summary).snap("field must be a string")
		})

		it("throws a clear ParseError when non-object locale is passed to summaryIn or messageIn", () => {
			const errors = type({ a: "string" })({ a: 1 }) as type.errors
			const first = errors.issues[0]

			for (const bad of ["de", ["de"], null, 42]) {
				const expected = writeInvalidLocaleObjectMessage(bad)
				expectParseError(() => errors.summaryIn(bad as never), expected)
				expectParseError(() => messageIn(first, bad as never), expected)
			}
			expectParseError(
				() => messageIn(first, undefined as never),
				writeInvalidLocaleObjectMessage(undefined)
			)
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
			attest(serialized.includes("hunter2")).equals(false)
			attest(serialized.includes('"data"')).equals(false)
			attest(serialized.includes('"actual"')).equals(false)

			const parsed = JSON.parse(serialized) as {
				issues: unknown[]
				message: string
			}
			attest(parsed.issues).equals(directJson)
			attest(parsed.message).equals(direct.summary)
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

	describe("Invalid Date units and defaults", () => {
		it("handles type.unit(new Date(NaN)) cleanly without throwing RangeError", () => {
			const Invalid = type.unit(new Date(NaN))
			const Str = type.unit("Invalid Date")

			attest(Invalid.expression).equals("Invalid Date")
			attest(Invalid.description).equals("Invalid Date")
			attest(Invalid.equals(type.unit(new Date("not a date")))).equals(true)
			attest(Invalid.equals(Str)).equals(false)
			attest(Invalid.extends(type("Date"))).equals(false)

			const fakeDate = Object.create(Date.prototype)
			for (let i = 0; i < 3; i++) {
				attest(Invalid.allows(new Date(NaN))).equals(true)
				attest(Invalid.allows(new Date("bad"))).equals(true)
				attest(Invalid.allows(new Date(0))).equals(false)
				attest(Invalid.allows("Invalid Date")).equals(false)
				attest(Invalid.allows(NaN)).equals(false)
				attest(Invalid.allows(fakeDate)).equals(false)
				attest(Invalid(new Date(0)).toString()).snap("must be Invalid Date")

				attest(Str.allows("Invalid Date")).equals(true)
				attest(Str.allows(new Date(NaN))).equals(false)
			}

			// fake Date prototype object uses reference identity without throwing TypeError
			const FakeUnit = type.unit(fakeDate)
			attest(FakeUnit.allows(fakeDate)).equals(true)
			attest(FakeUnit.allows(Object.create(Date.prototype))).equals(false)
		})

		it("throws ParseError instead of RangeError for invalid Date defaults", () => {
			let caught: unknown
			try {
				type({ d: ["Date", "=", new Date(NaN) as never] })
			} catch (e) {
				caught = e
			}
			attest(caught instanceof ParseError).equals(true)
			attest((caught as Error).message).snap(
				"Non-primitive default for \"d\" must be specified as a function like () => ({my: 'object'})"
			)
		})
	})

	describe("#1756 object.json JSON Schema", () => {
		it("round-trips through fromJsonSchema and intersects with object props", () => {
			const Json = type("object.json")
			const rt = fromJsonSchema(Json.toJsonSchema())
			attest(rt.allows({})).equals(true)
			attest(rt.allows({ a: [1, true, null, "x"] })).equals(true)
			attest(rt.allows([])).equals(true)
			attest(rt.allows([1, { b: 2 }])).equals(true)
			attest(rt.allows("str")).equals(false)
			attest(rt.allows(42)).equals(false)
			attest(rt.allows(true)).equals(false)
			attest(rt.allows(null)).equals(false)

			const WithProp = Json.and({ a: "string" })
			const withPropSchema = WithProp.toJsonSchema()
			attest(withPropSchema.type).equals("object")
			attest((withPropSchema as { required?: string[] }).required).equals(["a"])
		})
	})
})
