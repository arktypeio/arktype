import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	configureAfterTypeMessage,
	writeMissingImportMessage,
	rootSchema
} from "@ark/schema"
import { configure, scope, type } from "arktype"
import "arktype/errors"

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
		const T = type({
			monster: ["196883", "@", description]
		})
		attest<{ monster: 196883 }>(T.infer)
		attest(T.description).snap(
			"{ monster: the number of dimensions in the monster group }"
		)
		attest(T({ monster: 196882 }).toString()).snap(
			"monster must be the number of dimensions in the monster group (was 196882)"
		)
	})

	it("anonymous type config", () => {
		const T = type(type("true", "@", { description: "unfalse" }))
		attest<true>(T.infer)
		attest(T(false).toString()).snap("must be unfalse (was false)")
	})

	it("anonymous type config at path", () => {
		const Unfalse = type("true", "@", { description: "unfalse" })
		const T = type({ myKey: Unfalse })
		attest(T({ myKey: "500" }).toString()).snap(
			`myKey must be unfalse (was "500")`
		)
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
		attest(T({ myKey: true }).toString()).snap(
			"myKey must be untrue (was true)"
		)
	})

	it("shallow node writer config", () => {
		const CustomOne = type("1", "@", {
			expected: ctx => `custom expected ${ctx.description}`,
			actual: data => `custom actual ${data}`,
			problem: ctx => `custom problem ${ctx.expected} ${ctx.actual}`,
			message: ctx => `custom message ${ctx.problem}`
		})
		attest<1>(CustomOne.infer)
		attest(CustomOne(2).toString()).snap(
			"custom message custom problem custom expected 1 custom actual 2"
		)
	})

	it("string node configs", () => {
		const CustomTwo = type("2", "@", {
			expected: "2",
			actual: "something else",
			problem: "was terrible",
			message: "root was terrible"
		})
		attest<2>(CustomTwo.infer)
		attest(CustomTwo(1).toString()).snap("root was terrible")
	})

	it("node writer config works on nested constraint", () => {
		const CustomEven = type("number % 2", "@", {
			expected: ctx => `custom expected ${ctx.description}`,
			actual: data => `custom actual ${data}`,
			problem: ctx => `custom problem ${ctx.expected} ${ctx.actual}`,
			message: ctx => `custom message ${ctx.problem}`
		})
		attest<number>(CustomEven.infer)
		attest(CustomEven(3).toString()).snap(
			"custom message custom problem custom expected even custom actual 3"
		)
	})

	it("node writer config on union", () => {
		const $ = scope({})
		const Discriminated = $.type([{ k: "'a'" }, "|", { k: "'b'" }], "@", {
			message: ctx => `custom message ${ctx.problem}`
		})
		attest(Discriminated({ k: "c" }).toString()).snap(
			'custom message must be "a" or "b" (was "c")'
		)
		const Indiscriminable = $.type(
			[{ a: "string" }, "|", { b: "number" }],
			"@",
			{ message: ctx => `custom message ${ctx.problem}` }
		)
		attest<{ a: string } | { b: number }>(Indiscriminable.infer)
		attest(Indiscriminable({}).toString()).snap(
			"custom message a must be a string (was missing) or b must be a number (was missing)"
		)
	})

	it("node writer config on undeclared key", () => {
		const T = type({ "+": "reject", a: "string" }).configure(
			{ message: ctx => `custom message ${ctx.problem}` },
			"structure"
		)
		attest(T({ a: "", b: 1 }).toString()).snap("custom message must be removed")
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
		).snap("age must be a number (was boolean)")

		// should give the shallow custom error
		attest(User(null).toString()).snap("must be a valid user (was null)")
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
				'[{"code":"predicate","path":[],"data":{"a":1,"b":"2"},"message":"is invalid"}]'
			)
		})

		it("none runs no Apply to find what failed", () => {
			let calls = 0
			const T = none.type(["number", ":", n => (calls++, n > 0)])
			T(-1)
			attest(calls).equals(1)
		})

		it("none fails a morph's error at the root", () => {
			const T = none.type("string").pipe((s, ctx) => ctx.error("short"))
			attest(JSON.stringify(T("x"))).snap(
				'[{"code":"predicate","path":[],"data":"x","message":"is invalid"}]'
			)
		})

		it("none assert and ~standard", () => {
			const T = none.type("string")
			attest(() => T.assert(5)).throws.snap("TraversalError: is invalid")
			const result = T["~standard"].validate(5)
			const issues: unknown = "issues" in result && result.issues
			attest(issues).snap([
				{ code: "predicate", path: [], data: 5, message: "is invalid" }
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
			attest(T({ a: 1, b: -1 }).toString()).snap(
				"a must be a string (was a number)"
			)
			attest(calls).equals(0)
		})

		it("first keeps one issue a callback adds after another", () => {
			const T = first.type([
				"string",
				":",
				(s, ctx) => !!ctx.reject("long") && !!ctx.reject("short")
			])
			attest(T("x").toString()).snap('must be long (was "x")')
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
				"x.n must be a number (was a string)"
			)
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

	it("leaf with scope description writer", () => {
		const A = type({ a: "number > 1234" })
		attest(A({ a: "x" }).toString()).snap("a must be a number (was a string)")
		const types = scope(
			{ b: "number", o: { a: A, b: "b" } },
			{ domain: { description: () => "a custom number" } }
		).export()
		attest(types.o({ a: { a: "x" }, b: "x" }).toString()).equals(
			"a.a must be a number (was a string)\nb must be a custom number (was a string)"
		)
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
			ref: "must be a number (was a string)",
			b: "must be a custom number (was a string)",
			int: "must be a custom number (was a string)",
			described: "must be my number (was a string)",
			imported: "must be a number (was a string)",
			spread: "must be a number (was a string)",
			x: "a must be a custom number (was a string)",
			y: "a.v must be a custom number (was a string)",
			rebound: "must be a custom number (was a string)"
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
		).equals(
			"cyclic.next.a must be a number (was a string)\ndiscriminated.n must be a number (was a string)"
		)
		attest(
			types
				.o({ cyclic: { a: 1 }, discriminated: { kind: "c" }, b: 1 })
				.toString()
		).equals('discriminated.kind must be "a" or "b" (was "c")')
		attest(types.configured({ a: "x", b: "x" }).toString()).equals(
			"a must be a configured number (was a string)\nb must be a custom number (was a string)"
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
			"first.v must be a number (was a string)"
		)
		attest(KeptAfter({ first: { v: "s" } }).toString()).equals(
			"first.v must be a custom number (was a string)"
		)
		attest(KeptFirst({ after: { v: "s" } }).toString()).equals(
			"after.v must be a custom number (was a string)"
		)
		attest(OwnAfter({ after: { v: "s" } }).toString()).equals(
			"after.v must be a number (was a string)"
		)
	})

	it("description writer runs on definition", () => {
		let lang = "en"
		const T = scope(
			{},
			{ domain: { description: node => `${lang}:${node.domain}` } }
		).type({ a: "string" })
		lang = "de"
		attest(T({ a: 5 }).toString()).equals("a must be en:string (was a number)")
	})

	it("configure after a type is created", () => {
		type("string")
		attest(() => configure({})).throws(configureAfterTypeMessage)
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
			message: ctx =>
				`${ctx.propString || "(root)"}: ${ctx.actual} isn't ${ctx.expected}`
		})
		// ArkErrors: (root): a string isn't an object
		const out1 = User("ez123")
		attest(out1.toString()).snap("(root): a string isn't an object")
		// but `.configure` only applies shallowly, so the nested error isn't changed!
		// ArkErrors: password must be at least length 8 (was 5)
		const out2 = User({ password: "ez123" })
		attest(out2.toString()).snap("password must be at least length 8 (was 5)")
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
				).completions({ "": ["boundary", "kind", "method"] })
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
