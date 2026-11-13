import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	configureAfterTypeMessage,
	writeMissingImportMessage,
	rootSchema,
	type StandardSchemaV1
} from "@ark/schema"
import { configure, messageIn, scope, type } from "arktype"
import "arktype/errors"
import { en } from "arktype/locales/en"
import { withConfig } from "./locales/withConfig.ts"

// each issue's message, as a Standard Schema consumer reads it
const standardMessagesOf = (T: type.Any, data: unknown) =>
	(T["~standard"].validate(data) as StandardSchemaV1.FailureResult).issues.map(
		issue => issue.message
	)

contextualize(() => {
	it("a sequence's writer runs as it's created, before its errors", () => {
		const writing = type.scope(
			{},
			{
				sequence: {
					description: () => {
						throw new Error("written")
					}
				}
			}
		)
		attest(() => writing.type("string[]")).throws("written")
		attest(() =>
			writing.schema({
				proto: Array,
				sequence: {
					prefix: [{ domain: "string" }],
					postfix: [{ domain: "number" }]
				}
			})
		).throws("written")
	})

	it("tuple expression", () => {
		const description = "a series of characters"
		const types = scope({
			a: ["string", "@", description],
			b: {
				a: "a"
			}
		}).export()
		attest<string>(types.a.infer)
		attest(types.a.description).equals(description)
		attest(types.a(1).toString()).snap("must be a series of characters")
		attest<{ a: string }>(types.b.infer)
		attest(types.b({ a: true }).toString()).snap(
			"a must be a series of characters"
		)
	})

	it("tuple expression at path", () => {
		const description = "the number of dimensions in the monster group"
		const T = type({
			monster: ["196883", "@", description]
		})
		attest<{ monster: 196883 }>(T.infer)
		attest(T.description).snap(
			"{ monster: the number of dimensions in the monster group }"
		)
		attest(T({ monster: 196882 }).toString()).snap(
			"monster must be the number of dimensions in the monster group"
		)
	})

	it("anonymous type config", () => {
		const T = type(type("true", "@", { description: "unfalse" }))
		attest<true>(T.infer)
		attest(T(false).toString()).snap("must be unfalse")
	})

	it("anonymous type config at path", () => {
		const Unfalse = type("true", "@", { description: "unfalse" })
		const T = type({ myKey: Unfalse })
		attest(T({ myKey: "500" }).toString()).snap("myKey must be unfalse")
	})

	it("anonymous type thunk", () => {
		const T = type(() => type("false", "@", { description: "untrue" }))
		attest<false>(T.infer)
		attest(T.description).snap("untrue")
	})

	it("anonymous type thunk at path", () => {
		const T = type({
			myKey: () => type("false", "@", { description: "untrue" })
		})
		attest<{ myKey: false }>(T.infer)
		attest(T({ myKey: true }).toString()).snap("myKey must be untrue")
	})

	it("shallow node writer config", () => {
		const CustomOne = type("1", "@", {
			expected: ctx => `custom expected ${ctx.description}`,
			actual: data => `custom actual ${data}`,
			message: ctx => `custom message ${ctx.expected} ${ctx.actual}`
		})
		attest<1>(CustomOne.infer)
		attest(CustomOne(2).toString()).snap(
			"custom message custom expected 1 custom actual 2"
		)
	})

	it("string node configs", () => {
		const CustomTwo = type("2", "@", {
			expected: "2",
			actual: "something else",
			message: "was terrible"
		})
		attest<2>(CustomTwo.infer)
		attest(CustomTwo(1).toString()).snap("was terrible")
	})

	it("problem isn't a slot", () => {
		// @ts-expect-error
		attest(() => type("2").configure({ problem: "was terrible" })).type.errors(
			"'problem' does not exist"
		)
		// @ts-expect-error
		attest(() => type("2", "@", { problem: "was terrible" })).type.errors(
			"'problem' does not exist"
		)
		attest(() =>
			// @ts-expect-error
			scope({}, { domain: { problem: "was terrible" } })
		).type.errors("'problem' does not exist")
	})

	it("problem throws what replaced it where a cast or JavaScript passes it", () => {
		attest(() =>
			type("2").configure({ problem: "was terrible" } as never)
		).throws.snap("ParseError: problem was removed in 3.0; write message")
		const Rejecting = type("number").narrow((n, ctx) =>
			ctx.reject({ problem: "was terrible" } as never)
		)
		attest(() => Rejecting(2)).throws.snap(
			"Error: problem was removed in 3.0; write message"
		)
		attest(() =>
			scope({}, { domain: { problem: "was terrible" } } as never)
		).throws.snap("ParseError: problem was removed in 3.0; write message")
	})

	it("node writer config works on nested constraint", () => {
		const CustomEven = type("number % 2", "@", {
			expected: ctx => `custom expected ${ctx.description}`,
			actual: data => `custom actual ${data}`,
			message: ctx => `custom message ${ctx.expected} ${ctx.actual}`
		})
		attest<number>(CustomEven.infer)
		attest(CustomEven(3).toString()).snap(
			"custom message custom expected even custom actual 3"
		)
	})

	it("node writer config on union", () => {
		const $ = scope({})
		const Discriminated = $.type(
			[{ k: "'a'", a: "string" }, "|", { k: "'b'", b: "number" }],
			"@",
			{
				message: ctx => `custom message ${ctx.expected}`
			}
		)
		attest(Discriminated({ k: "c" }).toString()).snap(
			'k: custom message "a" or "b"'
		)
		const Indiscriminable = $.type(
			[{ a: "string" }, "|", { b: "number" }],
			"@",
			{ message: ctx => `custom message ${ctx.expected}` }
		)
		attest<{ a: string } | { b: number }>(Indiscriminable.infer)
		attest(Indiscriminable({}).toString()).snap(
			"custom message a must be a string or b must be a number"
		)
	})

	it("an error's summary line is its message at the root", () => {
		attest(type("string")(5).toString()).snap("must be a string")
		attest(
			type("string").configure({ message: "Enter some text" })(5).toString()
		).snap("Enter some text")
	})

	it("a templated message's summary line follows its path", () => {
		const out = type({ name: "string", tags: "string[]" })({
			name: 5,
			tags: [0]
		}) as type.errors
		attest(out.summary).snap(`name must be a string
tags[0] must be a string`)
		attest(out.issues.map(e => e.message)).snap([
			"must be a string",
			"must be a string"
		])
	})

	it("a custom message's summary line follows its path and a colon", () => {
		const T = type({
			email: type("string.email").configure({
				message: "Enter a valid email"
			})
		})
		const out = T({ email: "x" }) as type.errors
		attest(out.summary).snap("email: Enter a valid email")
		attest(out.issues[0].message).snap("Enter a valid email")
		attest(() => T.assert({ email: "x" })).throws.snap(
			"TraversalError: email: Enter a valid email"
		)
	})

	it("a custom message writer's summary line follows its path and a colon", () => {
		const Even = type("number % 2").configure({
			message: ctx => `${ctx.actual} is not ${ctx.expected}`
		})
		attest(type({ counts: Even.array() })({ counts: [2, 3] }).toString()).snap(
			"counts[1]: 3 is not even"
		)
	})

	it("a missing key takes its value's custom message", () => {
		const T = type({
			name: type("string").configure({ message: "Name is required" })
		})
		const out = T({}) as type.errors
		attest(out.summary).snap("name: Name is required")
		attest(out.issues[0].message).snap("Name is required")
		attest(out.issues[0].code).equals("required")
	})

	it("a missing key doesn't take its value's message writer", () => {
		const T = type({
			name: type("string").configure({
				message: ctx => `Name can't be ${ctx.actual}`
			})
		})
		attest(T({ name: 5 }).toString()).snap("name: Name can't be a number")
		attest(T({}).toString()).snap("name must be a string (was missing)")
	})

	// https://github.com/arktypeio/arktype/issues/1479
	it("message config on a pipe applies to its output's errors", () => {
		const Port = type("string.numeric.parse | number")
			.to("0 < number <= 65535")
			.configure({ message: ctx => `invalid port (must be ${ctx.expected})` })
		attest(Port("abc").toString()).snap(
			"invalid port (must be a well-formed numeric string)"
		)
		attest(Port("99999").toString()).snap(
			"invalid port (must be at most 65535)"
		)
		attest(type({ port: Port })({ port: 99999 }).toString()).snap(
			"port: invalid port (must be at most 65535)"
		)
		// its output keeps its own description and JSON Schema
		attest(Port.out.description).snap("positive and at most 65535")
		attest(Port.out.json).equals(type("0 < number <= 65535").json)
	})

	it("a pipe's message is its input's, its output's and its missing key's", () => {
		const Name = type("string.trim")
			.to("string > 0")
			.configure({ message: "Name is required" })
		const T = type({ name: Name })
		attest(T({ name: 5 }).toString()).snap("name: Name is required")
		attest(T({ name: "  " }).toString()).snap("name: Name is required")
		attest(T({}).toString()).snap("name: Name is required")
		attest(standardMessagesOf(T, { name: "  " })).snap(["Name is required"])
		attest(Name.out.description).snap("a string and non-empty")
	})

	// https://github.com/arktypeio/arktype/issues/1492
	it("branches reduced to one configured message surface it", () => {
		const Dates = type("string[] > 0").configure({
			message: "Dates are required"
		})
		const T = type({ "kind?": "'a'", dates: Dates }).or({
			"kind?": "'b'",
			dates: Dates
		})
		attest(T({ dates: [] }).toString()).snap("dates: Dates are required")
		const Differing = type({ "kind?": "'a'", dates: Dates }).or({
			"kind?": "'b'",
			dates: type("string[] > 0").configure({ message: "Add a date" })
		})
		attest(Differing({ dates: [] }).toString()).snap("dates must be non-empty")
	})

	it("a union's configured message is written after its path and a colon", () => {
		const Shape = type({ a: "string" })
			.or({ b: "number" })
			.configure({ message: "Pick a shape" })
		const T = type({ shape: Shape })
		attest(Shape({}).toString()).snap("Pick a shape")
		attest(T({ shape: {} }).toString()).snap("shape: Pick a shape")
		attest(standardMessagesOf(T, { shape: {} })).snap(["Pick a shape"])
	})

	it("a union's configured message writer reads its errors from its own path", () => {
		const Shape = type({ a: "string" })
			.or({ b: "number" })
			.configure({ message: ctx => `Pick a shape (${ctx.expected})` })
		const out = type({ shape: Shape })({ shape: {} }) as type.errors
		attest(out.summary).snap(
			"shape: Pick a shape (a must be a string or b must be a number)"
		)
		attest(out.issues[0].message).snap(
			"Pick a shape (a must be a string or b must be a number)"
		)
		attest(out.toLocaleString(en)).equals(out.summary)
		attest(messageIn(out.issues[0], en)).equals(out.summary)
	})

	it("a union's configured expected is written after must be and its path", () => {
		const Shape = type({ a: "string" })
			.or({ b: "number" })
			.configure({ expected: "an a or b" })
		attest(Shape({}).toString()).snap("must be an a or b")
		const out = type({ shape: Shape })({ shape: {} }) as type.errors
		attest(out.summary).snap("shape must be an a or b")
		attest(out.issues[0].message).snap("must be an a or b")
		attest(out.issues[0].expected).snap("an a or b")
	})

	it("a union's message writer runs once, at its whole path", () => {
		const labels: Record<string, string> = { count: "Count", choice: "Choice" }
		const paths: string[] = []
		const message = (ctx: { propString: string }) => {
			paths.push(ctx.propString)
			return `${labels[ctx.propString]} is wrong`
		}
		const T = type({
			count: type("number").configure({ message }),
			choice: type({ a: "string" }).or({ b: "number" }).configure({ message })
		})
		attest(T({ count: "x", choice: {} }).toString()).snap(`count: Count is wrong
choice: Choice is wrong`)
		attest(paths).snap(["count", "choice"])
	})

	it("a union listing its branches' errors writes each whole path", () => {
		const T = type({ shape: type({ a: "string" }).or({ b: "number" }) })
		const out = T({ shape: {} }) as type.errors
		attest(out.summary).snap(
			"shape.a must be a string or shape.b must be a number"
		)
		// its message is about the value at its path
		attest(out.issues[0].message).snap(
			"a must be a string or b must be a number"
		)
	})

	it("union errors with one configured message surface it", () => {
		const message = "Enter an email or a phone number"
		const Contact = type("string.email")
			.configure({ message })
			.or(type("string.digits").configure({ message }))
		const T = type({ contact: Contact })
		attest(Contact("x").toString()).snap("Enter an email or a phone number")
		attest(T({ contact: "x" }).toString()).snap(
			"contact: Enter an email or a phone number"
		)
		attest(standardMessagesOf(T, { contact: "x" })).snap([
			"Enter an email or a phone number"
		])
		const Differing = type("string.email")
			.configure({ message })
			.or(type("string.digits").configure({ message: "Enter a phone number" }))
		attest(Differing("x").toString()).snap(
			"must be only digits 0-9 or an email address"
		)
	})

	// https://github.com/arktypeio/arktype/issues/1412
	it("intersection errors with one configured message surface it", () => {
		const Email = type("string.email > 0").configure({
			message: "Email is not valid"
		})
		attest(Email("").toString()).snap(`Email is not valid
Email is not valid`)
	})

	it("a message configured for a code is custom", () => {
		const $ = scope({}, { domain: { message: "Wrong kind of value" } })
		const out = $.type({ name: "string", age: "number >= 0" })({
			name: 5,
			age: -1
		}) as type.errors
		attest(out.summary).snap(`name: Wrong kind of value
age must be non-negative`)
		attest(out.issues.map(e => e.message)).snap([
			"Wrong kind of value",
			"must be non-negative"
		])
		attest($.type("string")(5).toString()).snap("Wrong kind of value")
	})

	it("applies config to shallow descendants", () => {
		const User = type({
			name: "string",
			age: "number"
		}).describe("a valid user")

		// should give the original error at a path
		attest(
			User({
				name: "david",
				age: true
			}).toString()
		).snap("age must be a number")

		// should give the shallow custom error
		attest(User(null).toString()).snap("must be a valid user")
	})

	it("jitless", () => {
		// a precompiled unit binds under jitless, so these are types no other
		// test precompiles
		const $ = scope(
			{
				fast: "'jitless'"
			},
			{ jitless: true }
		)
		const types = $.export()

		attest(types.fast.precompilation).equals(undefined)
		attest($.type.Record("string", "'jitless'").precompilation).equals(
			undefined
		)
	})

	describe("errors", () => {
		const none = scope({}, { errors: "none" })
		const first = scope({}, { errors: "first" })

		it("none fails with one issue at the root", () => {
			const out = none.type({ a: "string", b: "number" })({ a: 1, b: "2" })
			attest(out instanceof type.errors).equals(true)
			attest(out.toString()).snap("is invalid")
			attest(JSON.stringify(out)).snap(
				'[{"data":{"a":1,"b":"2"},"path":[],"code":"predicate","expected":"valid","message":"is invalid","propString":"","actual":"an object"}]'
			)
		})

		it("none's error has every field an error rejecting data has", () => {
			const out = none.type({ a: "string" })({}) as type.errors
			const rejected = type("object").narrow((data, ctx) =>
				ctx.reject({ expected: "valid", message: "is invalid" })
			)({}) as type.errors
			attest(out.issues[0]).equals(rejected.issues[0])
			attest(messageIn(out.issues[0], en)).snap("is invalid")
		})

		it("none runs no Apply to find what failed", () => {
			let calls = 0
			const T = none.type(["number", ":", n => (calls++, n > 0)])
			T(-1)
			attest(calls).equals(1)
		})

		it("none fails a morph's error at the root", () => {
			const T = none.type("string").pipe((s, ctx) => ctx.error("short"))
			attest((T("x") as type.errors).toJSON()).snap([
				{
					data: "x",
					path: [],
					code: "predicate",
					expected: "valid",
					message: "is invalid",
					propString: "",
					actual: '"x"'
				}
			])
		})

		it("none fails data piped into its own Type at the root", () => {
			const T = none.type({
				name: "string",
				"next?": "string.json.parse |> this"
			})
			attest(String(T({ name: "a", next: '{"name":1}' }))).snap("is invalid")
		})

		it("none writes an error a morph reads", () => {
			let message: string | undefined
			const T = none.type("string").pipe((s, ctx) => {
				ctx.error("short")
				message = ctx.errors.issues[0].message
			})
			attest(String(T("x"))).snap("is invalid")
			attest(message).snap("is invalid")
		})

		it("none assert and ~standard", () => {
			const T = none.type("string")
			attest(() => T.assert(5)).throws.snap("TraversalError: is invalid")
			const result = T["~standard"].validate(5)
			const issues: unknown = "issues" in result && result.issues
			attest(issues).snap([
				{
					data: 5,
					path: [],
					code: "predicate",
					expected: "valid",
					message: "is invalid",
					propString: "",
					actual: "5"
				}
			])
		})

		it("none checks a default", () => {
			attest(() => none.type({ a: ["number", "=", "5" as never] })).throws(
				"Default for a is invalid"
			)
		})

		it("first stops at the first issue", () => {
			let calls = 0
			const T = first.type({
				a: "string",
				b: ["number", ":", n => (calls++, n > 0)]
			})
			attest(T({ a: 1, b: -1 }).toString()).snap("a must be a string")
			attest(calls).equals(0)
		})

		it("first finds its issue once read", () => {
			const data: Record<string, unknown> = { a: 0, b: 0 }
			const out = first.type({ a: "string", b: "number" })(data)
			data.a = "a"
			data.b = "b"
			attest(out.toString()).snap("b must be a number")
		})

		it("first keeps one issue of those a callback adds, though it reads its errors", () => {
			const T = first.type([
				"string",
				":",
				(s, ctx) => {
					ctx.reject({ expected: "long", path: ["a"] })
					ctx.reject({ expected: "short", path: ["b"] })
					return ctx.errors.summary === ""
				}
			])
			const out = T("x") as type.errors
			attest(out.toString()).snap("a must be long")
		})

		it("first lists a union's miss beside its default case", () => {
			const Event = first
				.type({ id: "0", k1: "number" })
				.or({ id: "1", k2: "number" })
				.or({ name: "string" })
			const out = Event({ id: 5 }) as type.errors
			attest(out.issues.map(e => e.code)).equals(["union"])
			attest(out.toString()).snap("id must be 0 or 1 or name must be a string")
		})

		it("first and none require arktype/errors", () => {
			const modes = $ark.errorModes!
			delete $ark.errorModes
			try {
				attest(() =>
					scope({ a: "string" }, { errors: "none" }).export()
				).throws(writeMissingImportMessage("errors", '"none"'))
			} finally {
				$ark.errorModes = modes
			}
		})

		it("a Type validates as the scope it's bound to configures", () => {
			const X = none.type({ n: "number" })
			attest(type({ x: X })({ x: { n: "x" } }).toString()).snap(
				"x.n must be a number"
			)
		})
	})

	describe("onUndeclaredKey", () => {
		it("delete fails on an indiscriminable union", () => {
			attest(() =>
				withConfig({ onUndeclaredKey: "delete" }, () =>
					scope({}).type([{ a: "string" }, "|", { b: "boolean" }])
				)
			).throws
				.snap(`ParseError: An unordered union of a type including a morph and a type with overlapping input is indeterminate:
Left: { a: string, + (undeclared): delete }
Right: { b: boolean, + (undeclared): delete }
Make their inputs disjoint, e.g. by narrowing the morph's input, or pipe the union of their inputs to a single morph.`)
		})

		it("delete discriminates a union", () => {
			const O = withConfig({ onUndeclaredKey: "delete" }, () =>
				scope({}).type([
					{ kind: "'a'", a: "string" },
					"|",
					{ kind: "'b'", b: "boolean" }
				])
			)
			attest(O.in.expression).snap(
				'{ a: string, kind: "a", + (undeclared): ignore } | { b: boolean, kind: "b", + (undeclared): ignore }'
			)
			attest(O({ kind: "a", a: "ok", b: true })).snap({ kind: "a", a: "ok" })
			attest(O({ kind: "b", a: "ok", b: true })).snap({ kind: "b", b: true })
		})

		// the ignoring branch's input took the config's delete back once it
		// held a morph, so the branches looked disjoint
		it("an explicit ignore fails an indeterminate union", () => {
			const [optional, required] = withConfig(
				{ onUndeclaredKey: "delete" },
				() => {
					const C = scope({}).type({ provider: "string" })
					return [
						() => C.or({ "+": "ignore", uses: "string", "o?": C }),
						() => C.or({ "+": "ignore", uses: "string", o: C })
					]
				}
			)
			attest(optional).throws(
				"An unordered union of a type including a morph and a type with overlapping input is indeterminate"
			)
			attest(required).throws("is indeterminate")
			const C = type({ "+": "delete", provider: "string" })
			attest(() => C.or({ "+": "ignore", uses: "string", "o?": C })).throws(
				"is indeterminate"
			)
			attest(() =>
				withConfig({ onUndeclaredKey: "delete" }, () => {
					const D = scope({}).type({ provider: "string" })
					return D.or({ uses: "string", "o?": D })
				})
			).throws("is indeterminate")
		})

		it("an explicit ignore stays ignore in what's built from it", () => {
			const I = withConfig({ onUndeclaredKey: "delete" }, () =>
				scope({}).type({ "+": "ignore", a: "string.trim" })
			)
			attest(I.in.expression).snap("{ a: string, + (undeclared): ignore }")
			attest(I.and({ "+": "ignore", b: "string" }).in.expression).snap(
				"{ a: string, b: string, + (undeclared): ignore }"
			)
			const out: unknown = I.partial()({ a: "x", z: 1 } as never)
			attest(out).snap({ a: "x", z: 1 })
		})
	})

	it("prereducedAliases", () => {
		const $ = scope({ a: "string" }, { prereducedAliases: true })
		attest($.config.prereducedAliases).equals(true)
		attest(type.$.config.prereducedAliases).equals(true)
	})

	it("jit by default", () => {
		const T = type("/^foo.*$/")
		attest(T.precompilation).satisfies("string")
	})

	it("built-in keywords jit by default", () => {
		const T = type("string")
		attest(T.precompilation).satisfies("string")

		const Sub = type("string.normalize.NFC.preformatted")
		attest(Sub.precompilation).satisfies("string")
	})

	it("invoked generics jit by default", () => {
		const T = type.Record("string", "boolean")
		attest(T.precompilation).satisfies("string")
	})

	it("jit by default in scope", () => {
		const $ = scope({
			defined: "55",
			referenced: rootSchema({ unit: 5 })
		})

		const types = $.export()

		attest(types.defined.precompilation).satisfies("string")
		attest(types.referenced.precompilation).satisfies("string")

		attest($.type("defined").precompilation).satisfies("string")
		attest($.type("referenced").precompilation).satisfies("string")
	})

	it("jit by default in submodule", () => {
		const types = type.module({
			inner: type.module({
				foo: "55"
			})
		})
		attest(types.inner.foo.precompilation).satisfies("string")
	})

	it("a Type including an alias has compiled code once it's used", () => {
		const Node = type({ name: "string", "next?": "this" })
		attest(Node.internal.unitFn).equals(undefined)
		const nested = { name: "a", next: { name: "b" } }
		attest(Node(nested) as object).equals(nested)
		attest(Node.internal.unitFn).equals(undefined)
		attest(Node({ name: "a", next: { name: 1 } }).toString()).snap(
			"next.name must be a string"
		)
		attest(typeof Node.internal.unitFn).equals("function")
		attest(Node(nested) as object).equals(nested)
	})

	it("a definition checking a Type compiles nothing", () => {
		const $ = scope({}, { exactOptionalPropertyTypes: false })
		const Named = $.type("string").narrow(
			(s, ctx) => s.length > 0 || ctx.mustBe("named")
		)
		const $internal = Named.internal.$
		const { jit } = $internal
		let compiled = 0
		$internal.jit = node => {
			compiled++
			jit.call($internal, node)
		}
		const T = $.type({ "a?": Named })
		attest(compiled).equals(0)
		attest(T({ a: undefined }) as object).equals({ a: undefined })
		attest(T({ a: "" }).toString()).snap("a must be named")
	})

	it("an optional key without exactOptionalPropertyTypes can reach its own alias", () => {
		const $ = scope(
			{ List: { "next?": "List", value: "string" } },
			{ exactOptionalPropertyTypes: false }
		).export()
		attest($.List({ next: { value: "a" }, value: "b" })).snap({
			next: { value: "a" },
			value: "b"
		})
		attest($.List({ next: undefined, value: "b" } as never) as object).snap({
			next: undefined,
			value: "b"
		})
		attest($.List({ next: { value: 1 }, value: "b" }).toString()).snap(
			"next.value must be a string"
		)

		const Self = scope({}, { exactOptionalPropertyTypes: false }).type({
			"next?": "this",
			value: "string"
		})
		attest(Self({ next: undefined, value: "b" } as never) as object).snap({
			next: undefined,
			value: "b"
		})
		attest(Self({ next: { value: 1 }, value: "b" }).toString()).snap(
			"next.value must be a string"
		)
	})

	it("allows read before a Type is used checks once it compiles", () => {
		const T = type({ a: "string" })
		const allows = T.allows
		attest([allows({ a: "x" }), allows({ a: 1 }), allows({ a: "y" })]).equals([
			true,
			false,
			true
		])
		attest(allows({ a: 2 })).equals(false)
	})

	it("referenced types keep their descriptions", () => {
		const custom = { domain: { description: () => "a custom number" } }
		const plain = scope({ x: "number" }).export()
		const lib = scope(
			{ x: "number", y: { v: "number" } },
			{ ...custom }
		).export()
		const types = scope(
			{
				plain,
				...plain,
				ref: type("number"),
				b: "number",
				int: "number.integer",
				described: type("number").describe("my number"),
				imported: "plain.x"
			},
			{ ...custom }
		).export()
		attest({
			ref: types.ref("s").toString(),
			b: types.b("s").toString(),
			int: types.int("s").toString(),
			described: types.described("s").toString(),
			imported: types.imported("s").toString(),
			spread: types.x("s").toString(),
			x: type({ a: lib.x })({ a: "s" }).toString(),
			y: type({ a: lib.y })({ a: { v: "s" } }).toString(),
			rebound: scope({ x: type(lib.x) })
				.export()
				.x("s")
				.toString()
		}).equals({
			ref: "must be a number",
			b: "must be a custom number",
			int: "must be a custom number",
			described: "must be my number",
			imported: "must be a number",
			spread: "must be a number",
			x: "a must be a custom number",
			y: "a.v must be a custom number",
			rebound: "must be a custom number"
		})
	})

	it("referenced cyclic and discriminated types keep their descriptions", () => {
		const Cyclic = type({ a: "number", "next?": "this" })
		const Discriminated = type({ kind: "'a'", n: "number" }).or({ kind: "'b'" })
		const Configured = type("number").configure({
			description: "a configured number"
		})
		const types = scope(
			{
				b: "number",
				cyclic: Cyclic,
				o: { cyclic: Cyclic, discriminated: Discriminated, b: "b" },
				configured: { a: Configured, b: "b" }
			},
			{ domain: { description: () => "a custom number" } }
		).export()
		attest(
			types
				.o({
					cyclic: { a: 1, next: { a: "x" } },
					discriminated: { kind: "a", n: "x" },
					b: 1
				})
				.toString()
		).equals("cyclic.next.a must be a number\ndiscriminated.n must be a number")
		attest(
			types
				.o({ cyclic: { a: 1 }, discriminated: { kind: "c" }, b: 1 })
				.toString()
		).equals('discriminated.kind must be "a" or "b"')
		attest(types.configured({ a: "x", b: "x" }).toString()).equals(
			"a must be a configured number\nb must be a custom number"
		)
		attest(types.cyclic.description).equals(
			scope({ Cyclic }).export().Cyclic.description
		)
	})

	it("a type equal to a referenced type keeps its own descriptions", () => {
		const lib = scope(
			{ y: { v: "number" } },
			{ domain: { description: () => "a custom number" } }
		).export()
		const OwnFirst = type({ first: { v: "number" } })
		const KeptAfter = type({ first: lib.y })
		const KeptFirst = type({ after: lib.y })
		const OwnAfter = type({ after: { v: "number" } })
		attest(OwnFirst({ first: { v: "s" } }).toString()).equals(
			"first.v must be a number"
		)
		attest(KeptAfter({ first: { v: "s" } }).toString()).equals(
			"first.v must be a custom number"
		)
		attest(KeptFirst({ after: { v: "s" } }).toString()).equals(
			"after.v must be a custom number"
		)
		attest(OwnAfter({ after: { v: "s" } }).toString()).equals(
			"after.v must be a number"
		)
	})

	it("description writer runs on definition", () => {
		let lang = "en"
		const T = scope(
			{},
			{ domain: { description: node => `${lang}:${node.domain}` } }
		).type({ a: "string" })
		lang = "de"
		attest(T({ a: 5 }).toString()).equals("a must be en:string")
	})

	it("configure rejects an option it lacks beside one it has", () => {
		attest(() =>
			// @ts-expect-error
			configure({ jitless: true, onUndeclaredKeys: "reject" })
		)
			.throws.snap(
				"ParseError: configure() has no option 'onUndeclaredKeys'. Did you mean 'onUndeclaredKey'?"
			)
			.type.errors.snap(
				"Type '\"reject\"' is not assignable to type '\"configure() has no option 'onUndeclaredKeys'​\"'."
			)
		// with nothing near it to suggest
		// @ts-expect-error
		attest(() => configure({ jitless: true, strict: true })).throws.snap(
			"ParseError: configure() has no option 'strict'"
		)
	})

	it("configure rejects another library's word for onUndeclaredKey", () => {
		// @ts-expect-error
		attest(() => configure({ onUndeclaredKey: "strip" })).throws.snap(
			"ParseError: onUndeclaredKey must be 'reject', 'delete', or 'ignore' (was \"strip\")"
		)
	})

	it("configure's result is typed as what it was given", () => {
		// read as `typeof config.onFail` to declare ArkEnv's onFail
		attest(
			() => configure({ onFail: errors => errors.throw() }).onFail
		).type.toString.snap("() => (errors: ArkErrors) => never")
	})

	it("configure after a type is created", () => {
		type("string")
		attest(() => configure({ numberAllowsNaN: true })).throws(
			configureAfterTypeMessage
		)
	})

	it("an error's actual describes its data, which its message leaves out", () => {
		const error = (type({ age: "number" })({ age: "5" }) as type.errors)
			.issues[0]
		attest([error.actual, error.message]).snap(["a string", "must be a number"])
	})

	it("docs actual example", () => {
		// avoid logging "was supersecret" for password
		const Password = type("string >= 8", "@", { actual: () => "" })

		const User = type({
			email: "string.email",
			password: Password
		})

		const out = User({
			email: "david@arktype.io",
			password: "ez123"
		})

		attest(out.toString()).snap("password must be at least length 8")
	})

	it("docs message example", () => {
		const User = type({
			password: "string >= 8"
		}).configure({
			message: ctx => `${ctx.actual} isn't ${ctx.expected}`
		})
		// ArkErrors: a string isn't an object
		const out1 = User("ez123")
		attest(out1.toString()).snap("a string isn't an object")
		// but `.configure` only applies shallowly, so the nested error isn't changed!
		// ArkErrors: password must be at least length 8
		const out2 = User({ password: "ez123" })
		attest(out2.toString()).snap("password must be at least length 8")
	})

	describe("select", () => {
		const Base = type({
			foo: "string",
			"bar?": {
				nested: "string",
				num: "number"
			}
		})

		it("self", () => {
			const T = Base.configure({ description: "root-only" }, "self")

			attest(T.json).snap({
				required: [{ key: "foo", value: "string" }],
				optional: [
					{
						key: "bar",
						value: {
							required: [
								{ key: "nested", value: "string" },
								{ key: "num", value: "number" }
							],
							domain: "object"
						}
					}
				],
				domain: "object",
				meta: "root-only"
			})
		})

		describe("completions", () => {
			// based on completion tests at ark/schema/select.test.ts
			it("shallow completions", () => {
				// @ts-expect-error
				attest(() => Base.configure("foo", "")).completions({
					"": [
						"after",
						"alias",
						"before",
						"child",
						"divisor",
						"domain",
						"exactLength",
						"index",
						"intersection",
						"max",
						"maxLength",
						"min",
						"minLength",
						"morph",
						"notEqual",
						"notEqualLength",
						"optional",
						"pattern",
						"predicate",
						"proto",
						"references",
						"required",
						"self",
						"sequence",
						"shallow",
						"structure",
						"union",
						"unit"
					]
				})
			})

			it("composite key completions", () => {
				attest(() =>
					Base.configure("foo", {
						// @ts-expect-error
						"": {} as any
					})
				).completions({ "": ["boundary", "kind", "method", "where"] })
			})

			it("composite kind completions", () => {
				attest(() =>
					Base.configure("foo", {
						// @ts-expect-error
						kind: ""
					})
				).completions({
					"": [
						"after",
						"alias",
						"before",
						"divisor",
						"domain",
						"exactLength",
						"index",
						"intersection",
						"max",
						"maxLength",
						"min",
						"minLength",
						"morph",
						"notEqual",
						"notEqualLength",
						"optional",
						"pattern",
						"predicate",
						"proto",
						"required",
						"sequence",
						"structure",
						"union",
						"unit"
					]
				})
			})

			it("composite boundary completions", () => {
				attest(() =>
					Base.configure("foo", {
						// @ts-expect-error
						boundary: ""
					})
				).completions({ "": ["child", "references", "self", "shallow"] })
			})

			it("composite method completions", () => {
				attest(() =>
					Base.configure("foo", {
						// @ts-expect-error
						method: ""
					})
				).completions({ "": ["assertFilter", "assertFind", "filter", "find"] })
			})
		})
	})
})
