import { attest, contextualize } from "@ark/attest"
import { rootSchema } from "@ark/schema"
import { scope, type } from "arktype"

contextualize(() => {
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
		attest(types.a(1).toString()).snap(
			"must be a series of characters (was a number)"
		)
		attest<{ a: string }>(types.b.infer)
		attest(types.b({ a: true }).toString()).snap(
			"a must be a series of characters (was boolean)"
		)
	})

	it("tuple expression at path", () => {
		const description = "the number of dimensions in the monster group"
		const t = type({
			monster: ["196883", "@", description]
		})
		attest<{ monster: 196883 }>(t.infer)
		attest(t.description).snap(
			"{ monster: the number of dimensions in the monster group }"
		)
		attest(t({ monster: 196882 }).toString()).snap(
			"monster must be the number of dimensions in the monster group (was 196882)"
		)
	})

	it("anonymous type config", () => {
		const t = type(type("true", "@", { description: "unfalse" }))
		attest<true>(t.infer)
		attest(t(false).toString()).snap("must be unfalse (was false)")
	})

	it("anonymous type config at path", () => {
		const unfalse = type("true", "@", { description: "unfalse" })
		const t = type({ myKey: unfalse })
		attest(t({ myKey: "500" }).toString()).snap(
			`myKey must be unfalse (was "500")`
		)
	})

	it("anonymous type thunk", () => {
		const t = type(() => type("false", "@", { description: "untrue" }))
		attest<false>(t.infer)
		attest(t.description).snap("untrue")
	})

	it("anonymous type thunk at path", () => {
		const t = type({
			myKey: () => type("false", "@", { description: "untrue" })
		})
		attest<{ myKey: false }>(t.infer)
		attest(t({ myKey: true }).toString()).snap(
			"myKey must be untrue (was true)"
		)
	})

	it("shallow node writer config", () => {
		const customOne = type("1", "@", {
			expected: ctx => `custom expected ${ctx.description}`,
			actual: data => `custom actual ${data}`,
			problem: ctx => `custom problem ${ctx.expected} ${ctx.actual}`,
			message: ctx => `custom message ${ctx.problem}`
		})
		attest<1>(customOne.infer)
		attest(customOne(2).toString()).snap(
			"custom message custom problem custom expected 1 custom actual 2"
		)
	})

	it("node writer config works on nested constraint", () => {
		const customEven = type("number % 2", "@", {
			expected: ctx => `custom expected ${ctx.description}`,
			actual: data => `custom actual ${data}`,
			problem: ctx => `custom problem ${ctx.expected} ${ctx.actual}`,
			message: ctx => `custom message ${ctx.problem}`
		})
		attest<number>(customEven.infer)
		attest(customEven(3).toString()).snap(
			"custom message custom problem custom expected a multiple of 2 custom actual 3"
		)
	})

	it("applies config to shallow descendants", () => {
		const user = type({
			name: "string",
			age: "number"
		}).describe("a valid user")

		// should give the original error at a path
		attest(
			user({
				name: "david",
				age: true
			}).toString()
		).snap("age must be a number (was boolean)")

		// should give the shallow custom error
		attest(user(null).toString()).snap("must be a valid user (was null)")
	})

	it("jitless", () => {
		const types = scope(
			{
				fast: "false"
			},
			{ jitless: true }
		).export()

		attest(types.fast.precompilation).equals(undefined)
	})

	it("jit by default", () => {
		const t = type("/^foo.*$/")
		attest(t.precompilation).satisfies("string")
	})

	it("builtin keywords jit by default", () => {
		const t = type("string")
		attest(t.precompilation).satisfies("string")

		const sub = type("string.normalize.NFC.preformatted")
		attest(sub.precompilation).satisfies("string")
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
})
