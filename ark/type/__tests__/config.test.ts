import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	rootSchema,
	schemaScope,
	type ArkSchemaConfig
} from "@ark/schema"
import { configure, scope, type } from "arktype"

const withConfig = (config: ArkSchemaConfig, fn: () => void) => {
	const originalConfig = $ark.config
	const originalResolvedConfig = $ark.resolvedConfig
	configure(config)
	fn()
	$ark.config = originalConfig
	$ark.resolvedConfig = originalResolvedConfig
}

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
		const types = scope(
			{
				fast: "false"
			},
			{ jitless: true }
		).export()

		attest(types.fast.precompilation).equals(undefined)
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

	it("numberAllowsNaN", () => {
		withConfig({ numberAllowsNaN: true }, () => {
			const { nanable } = schemaScope({
				nanable: "number"
			}).export()

			attest(nanable.allows(Number.NaN)).equals(true)

			const { nonNanable } = type.module({
				nonNanable: "number"
			})

			attest(nonNanable.allows(Number.NaN)).equals(false)
		})
	})

	it("dateAllowsInvalid", () => {
		withConfig({ dateAllowsInvalid: true }, () => {
			const { invalidable } = schemaScope({
				invalidable: Date
			}).export()

			attest(invalidable.allows(new Date("!"))).equals(true)

			const { uninvalidable } = type.module({
				uninvalidable: "number"
			})

			attest(uninvalidable.allows(new Date("!"))).equals(false)
		})
	})

	it("clone", () => {
		withConfig({ clone: false }, () => {
			const { userForm } = type.module({
				userForm: {
					age: "string.numeric.parse"
				}
			})

			const formData = {
				age: "42"
			}

			const out = userForm(formData)

			// the original object's age key is now a number
			attest(formData.age).unknown.equals(42)
			attest(formData).unknown.equals(out)
		})
	})

	it("docs actual example", () => {
		// avoid logging "was xxx" for password
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
