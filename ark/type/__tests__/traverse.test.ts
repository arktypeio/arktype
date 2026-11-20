import { attest, contextualize } from "@ark/attest"
import { ArkErrors, en, TraversalError } from "@ark/schema"
import { ArkErrors as RuntimeErrors } from "@ark/schema/runtime"
import { flatMorph, throwError } from "@ark/util"
import {
	byAncestorPath,
	byPath,
	firstIssue,
	flatByPath,
	flatMessagesByPath,
	scope,
	type,
	type ArkError,
	type ArkErrorCode,
	type Type
} from "arktype"
import { inspect } from "node:util"

contextualize(() => {
	it("divisible", () => {
		const T = type("number%2")
		attest(T(4)).snap(4)
		attest(T(5).toString()).snap("must be even")
	})

	it("range", () => {
		const T = type("number>2")
		attest(T(3)).snap(3)
		attest(T(2).toString()).snap("must be more than 2")
	})

	it("domain", () => {
		const T = type("number")
		attest(T(5)).snap(5)
		attest(T("foo").toString()).snap("must be a number")
	})

	it("pattern", () => {
		const T = type("/.*@arktype.io/")
		attest(T("shawn@arktype.io")).snap("shawn@arktype.io")
		attest(T("shawn@hotmail.com").toString()).snap(
			"must be matched by .*@arktype.io"
		)
	})

	it("required keys", () => {
		const T = type({
			name: "string",
			age: "number",
			"title?": "string"
		})
		attest(T({ name: "Shawn", age: 99 })).snap({
			name: "Shawn",
			age: 99
		})
		attest(T({ name: "Shawn" }).toString()).snap(
			"age must be a number (was missing)"
		)
	})

	it("customized built-in message", () => {
		const types = scope(
			{ isEven: "number%2" },
			{
				divisor: {
					expected: ctx => `% ${ctx.rule} !== 0`,
					message: ctx => `${ctx.actual} ${ctx.expected}`
				}
			}
		).export()
		attest(types.isEven(3).toString()).snap("3 % 2 !== 0")
	})

	it("domains", () => {
		const T = type("string|number[]")
		attest(T([1])).snap([1])
		attest(T("hello")).snap("hello")
		attest(T(2).toString()).snap("must be a string or an array")
		attest(T({}).toString()).snap("must be an array")
	})

	it("tuple length", () => {
		const T = type(["string", "number", "string", "string[]"])
		const data: typeof T.infer = ["foo", 5, "boo", []]
		attest(T(data)).equals(data)
		attest(T(["hello"]).toString()).snap("must be exactly length 4")
	})

	it("branches", () => {
		const T = type({ bar: "boolean" }, "|", { foo: "string" })
		attest(T({ foo: "ok" })).snap({ foo: "ok" })
		attest(T({ bar: true })).snap({ bar: true })
		attest(T({}).toString()).snap("bar must be boolean or foo must be a string")
		attest(T({ bar: "swapped", foo: true }).toString()).snap(
			"bar must be boolean or foo must be a string"
		)
	})

	it("common errors collapse", () => {
		const T = type({ base: "1", a: "1" }, "|", { base: "1", b: "1" })
		attest(T({ base: 1, a: 1 })).snap({ base: 1, a: 1 })
		attest(T({ base: 1, b: 1 })).snap({ base: 1, b: 1 })
		attest(T({ a: 1, b: 1 }).toString()).snap("base must be 1")
	})

	it("branches at path", () => {
		const T = type({ key: [{ a: "string" }, "|", { b: "boolean" }] })
		attest(T({ key: { a: "ok" } })).snap({ key: { a: "ok" } })
		attest(T({ key: { b: true } })).snap({ key: { b: true } })
		attest(T({ key: {} }).toString()).snap(
			"key.a must be a string or key.b must be boolean"
		)
	})

	it("branches at a key named like an Object.prototype member", () => {
		const T = type({ constructor: "string.email | string.uuid" })
		attest(T({ constructor: "x" }).toString()).snap(
			"constructor must be an email address or a UUID"
		)
	})

	it("switch", () => {
		const T = type({ a: "string" }).or({ a: "null" }).or({ a: "number" })
		attest(T({ a: "ok" })).snap({ a: "ok" })
		attest(T({ a: 5 })).snap({ a: 5 })
		// value isn't present
		attest(T({}).toString()).snap(
			"a must be a number, a string or null (was missing)"
		)
		// unsatisfying value
		attest(T({ a: false }).toString()).snap(
			"a must be a number, a string or null"
		)
	})

	// previously was affected by a caching issue
	// https://github.com/arktypeio/arktype/issues/962
	it("multiple switch", () => {
		const types = scope({
			a: { foo: "string" },
			b: { foo: "number" },
			c: { foo: "Function" },
			d: "a|b|c"
		}).export()
		attest(types.d({}).toString()).snap(
			"foo must be a number, a string or a function (was missing)"
		)
		attest(types.d({ foo: null }).toString()).snap(
			"foo must be a number, a string or an object"
		)
	})

	it("serialized actual for discriminated union", () => {
		const T = type({ a: "'foo'" }).or({ a: "'bar'" })
		attest(T({ a: '"extra quotes"' }).toString()).snap(
			'a must be "bar" or "foo"'
		)
		attest(T({ a: "" }).toString()).snap('a must be "bar" or "foo"')
		attest(T({ a: 5 }).toString()).snap('a must be "bar" or "foo"')
	})

	it("multi", () => {
		const NaturalNumber = type("number.integer>0")
		attest(NaturalNumber(-1.2).toString()).snap(`must be an integer
must be positive`)
		const NaturalAtPath = type({
			natural: NaturalNumber
		})
		attest(NaturalAtPath({ natural: -0.1 }).toString())
			.snap(`natural must be an integer
natural must be positive`)
	})

	// https://github.com/arktypeio/arktype/issues/1412
	it("multi described alike", () => {
		const Email = type("string.email > 0", "@", "Email is not valid")
		attest(Email("").toString()).snap(`must be Email is not valid
must be Email is not valid`)
	})

	it("multi indented", () => {
		const NaturalSchema = type({
			natural: "number.integer>0",
			name: "string"
		})
		const result = NaturalSchema({
			natural: -Math.PI,
			name: ["negative", "PI"]
		})
		attest(result).instanceOf(ArkErrors)
		const traversalError = new TraversalError(result as ArkErrors)
		attest(traversalError).instanceOf(TraversalError)
		attest(traversalError.message).snap(`natural must be an integer
natural must be positive
name must be a string`)
	})

	it("TraversalError recognizes what any errors throw", () => {
		const out = type("string")(5) as ArkErrors
		// as a build leaving out the class, or another copy of arktype, throws it
		const thrown = Object.defineProperty(
			Object.assign(new Error(out.summary), { name: "TraversalError" }),
			"arkErrors",
			{ value: out }
		)
		attest(thrown instanceof TraversalError).equals(true)
		attest(new Error("x") instanceof TraversalError).equals(false)
		attest(
			Object.assign(new Error("x"), { name: "TraversalError" }) instanceof
				TraversalError
		).equals(false)
		// a subclass's instances are only those it constructs
		class Thrown extends TraversalError {}
		attest(thrown instanceof Thrown).equals(false)
		attest(new Thrown(out) instanceof Thrown).equals(true)
		attest(new Thrown(out) instanceof TraversalError).equals(true)
	})

	it("homepage example", () => {
		const User = type({
			name: "string",
			luckyNumbers: "(number | bigint)[]",
			"isAdmin?": "boolean | null"
		})

		const out = User({
			luckyNumbers: [31, "255", 1337n],
			isAdmin: 1
		})

		attest(out.toString()).snap(`name must be a string (was missing)
luckyNumbers[1] must be a bigint or a number
isAdmin must be false, null or true`)
	})

	it("relative path", () => {
		const Signup = type({
			email: "string.email",
			password: "string",
			repeatPassword: "string"
		}).narrow(
			(d, ctx) =>
				d.password === d.repeatPassword ||
				ctx.reject({
					expected: "identical to password",
					actual: "",
					relativePath: ["repeatPassword"]
				})
		)

		// ensure the relativePath is relative
		const NestedSignup = type({
			user: Signup
		})

		const validSignup: typeof Signup.infer = {
			email: "david@arktype.io",
			password: "secure",
			repeatPassword: "secure"
		}

		const valid: typeof NestedSignup.infer = { user: validSignup }

		attest(NestedSignup(valid)).equals(valid)
		attest(
			NestedSignup({
				user: { ...validSignup, repeatPassword: "insecure" }
			}).toString()
		).snap("user.repeatPassword must be identical to password")
	})

	it("errors intersected at a relative path keep it", () => {
		const T = type({ a: "number" }).narrow((o, ctx) => {
			ctx.reject({ expected: "x", relativePath: ["a"] })
			return ctx.reject({ expected: "y", relativePath: ["a"] })
		})

		const out = T({ a: 1 }) as ArkErrors

		attest(out.toString()).snap(`a must be x
a must be y`)
		attest(out.issues[0].propString).equals("a")
	})

	it("an error keeps its input's symbol keys at another path", () => {
		const source = Symbol("source")
		const sourceOf = (out: unknown) =>
			Reflect.get((out as ArkErrors).issues[0], source)

		const atB = { expected: "y", relativePath: ["b"], [source]: 1 }
		const AtB = type({ a: "string" }).narrow((o, ctx) => ctx.reject(atB))

		attest(sourceOf(AtB({ a: "x" }))).equals(1)

		const inner = { expected: "x", [source]: 2 }
		const Inner = type("string").narrow((s, ctx) => ctx.reject(inner))
		// a morph's errors are copied to its key
		const Outer = type({ a: type("string").pipe(s => Inner(s)) })

		attest(sourceOf(Outer({ a: "x" }))).equals(2)
	})

	it("a supplied propString is ignored in every locale", () => {
		const T = type({ a: "string" }).narrow((o, ctx) =>
			ctx.reject({ expected: "x", propString: "b", relativePath: ["a"] })
		)

		const out = T({ a: "y" }) as ArkErrors

		attest(out.summary).snap("a must be x")
		attest(out.toLocaleString(en)).equals(out.summary)
	})

	it("an error a morph adds and returns is listed once", () => {
		const T = type({ a: "string" }).pipe((o, ctx) => {
			ctx.error({ expected: "p", relativePath: ["a"] })
			return ctx.error({ expected: "q", relativePath: ["a"] })
		})

		const out = T({ a: "s" }) as ArkErrors

		attest(out.toString()).snap(`a must be p
a must be q`)
		attest(out.count).equals(2)
	})

	it("a morph returning ctx.errors adds them once", () => {
		const Checked = type("string").pipe((s, ctx) => {
			ctx.error("not ok")
			return ctx.errors
		})

		attest(Checked("x").toString()).snap("must be not ok")

		const out = type({ a: Checked, b: "number" })({ a: "x", b: "y" })

		attest(out.toString()).snap(`a must be not ok
b must be a number`)
		attest((out as ArkErrors).count).equals(2)
	})

	it("errors a morph returns keep a custom message's colon at its key", () => {
		const Inner = type({
			email: type("string.email").configure({ message: "Enter a valid email" }),
			age: type("number").narrow(
				(n, ctx) => n >= 0 || ctx.reject({ message: "Enter your age" })
			),
			name: "string"
		})
		const Outer = type({ user: type("object").pipe(o => Inner(o)) })
		attest(Outer({ user: { email: "x", age: -1, name: 1 } }).toString())
			.snap(`user.email: Enter a valid email
user.age: Enter your age
user.name must be a string`)
	})

	it("byAncestorPath is the same whenever it's read", () => {
		const expectedByAncestorPath = (errors: ArkErrors) =>
			flatMorph(byAncestorPath(errors), (k, v) => [k, v.map(e => e.expected)])

		let readBetween: Record<string, string[]> | undefined
		const T = (readsBetween: boolean) =>
			type("unknown").narrow((d, ctx) => {
				ctx.reject({ expected: "a", path: ["x", "z"] })
				ctx.reject({ expected: "b", path: ["y"] })
				if (readsBetween) readBetween = expectedByAncestorPath(ctx.errors)
				ctx.reject({ expected: "c", path: ["x", "z"] })
				return false
			})

		const out = T(true)(1) as ArkErrors

		attest(readBetween).snap({
			"": ["a", "b"],
			x: ["a"],
			"x.z": ["a"],
			y: ["b"]
		})
		attest(expectedByAncestorPath(out)).snap({
			"": ["a", "b", "c"],
			x: ["a", "c"],
			"x.z": ["a", "c"],
			y: ["b"]
		})
		attest(expectedByAncestorPath(out)).equals(
			expectedByAncestorPath(T(false)(1) as ArkErrors)
		)
	})

	it("a never error is kept beside the errors at its path", () => {
		const out = type("unknown").narrow((d, ctx) => {
			ctx.reject({ expected: "a", path: ["x"] })
			attest(byAncestorPath(ctx.errors).x.length).equals(1)
			ctx.error({ code: "union", errors: [], path: ["x"] })
			ctx.reject({ expected: "b", path: ["x"] })
			return false
		})(1) as ArkErrors

		attest(out.count).equals(3)
		attest<ArkErrorCode[]>(flatByPath(out).x.map(e => e.code)).equals([
			"predicate",
			"union",
			"predicate"
		])
		attest(byAncestorPath(out).x.map(e => e.code)).equals([
			"predicate",
			"union",
			"predicate"
		])
	})

	it("keeps each error apart, by path where symbols print alike", () => {
		const l = Symbol("alike")
		const r = Symbol("alike")
		const out = type("unknown").narrow((d, ctx) => {
			for (let i = 0; i < 40; i++)
				ctx.reject({ expected: `p${i}`, path: ["k", i] })
			ctx.reject({ expected: "q", path: ["k", 3] })
			ctx.reject({ expected: "r", path: ["k", 39] })
			ctx.reject({ expected: "s", path: [l] })
			ctx.reject({ expected: "t", path: [r] })
			ctx.reject({ expected: "u", path: ["k"] })
			ctx.reject({ expected: "v", path: [r] })
			return false
		})(1) as ArkErrors

		attest(out.count).equals(46)
		attest(out.issues.length).equals(46)
		attest(out.summary.split("\n").slice(40)).snap([
			"k[3] must be q",
			"k[39] must be r",
			"[Symbol(alike)] must be s",
			"[Symbol(alike)] must be t",
			"k must be u",
			"[Symbol(alike)] must be v"
		])
		// distinct symbols print alike, so their errors share a path string
		attest(flatMessagesByPath(out)["[Symbol(alike)]"]).snap([
			"must be s",
			"must be t",
			"must be v"
		])
		attest(flatMessagesByPath(out)["k[3]"]).snap(["must be p3", "must be q"])
	})

	it("flattens errors by path into plain objects", () => {
		const out = type({ ["__proto__"]: "string", a: "string" })(
			JSON.parse('{ "__proto__": 1, "a": 2 }')
		) as ArkErrors
		const messages = flatMessagesByPath(out)
		attest(Object.getPrototypeOf(messages)).is(Object.prototype)
		attest(Object.getPrototypeOf(flatByPath(out))).is(Object.prototype)
		attest(Object.entries(messages)).snap([
			["__proto__", ["must be a string"]],
			["a", ["must be a string"]]
		])
		attest(Object.keys(flatByPath(out))).equals(["__proto__", "a"])
	})

	it("groups errors by path into plain objects, a path __proto__ defined", () => {
		const out = type({ ["__proto__"]: "string", a: { b: "string" } })(
			JSON.parse('{ "__proto__": 1, "a": { "b": 2 } }')
		) as ArkErrors
		const first = byPath(out)
		const ancestors = byAncestorPath(out)
		attest(Object.getPrototypeOf(first)).is(Object.prototype)
		attest(Object.getPrototypeOf(ancestors)).is(Object.prototype)
		attest(Object.keys(first)).equals(["__proto__", "a.b"])
		attest(Object.keys(ancestors)).equals(["", "__proto__", "a", "a.b"])
		attest(first.__proto__).is(out.issues[0])
	})

	it("groups a standalone validator's issues by their path", () => {
		const errors = new RuntimeErrors()
		errors._p.push("a", 0)
		errors._e(1, "domain", "a string")
		errors._e(2, "domain", "a number")
		errors._p.length = 0
		errors._e({}, "predicate")
		const read = errors as never as ArkErrors
		attest(Object.keys(byPath(read))).equals(["a[0]", ""])
		attest(byPath(read)["a[0]"] === (errors.issues[0] as {})).equals(true)
		attest(flatMessagesByPath(read)).snap({
			"a[0]": ["must be a string", "must be a number"],
			"": ["is invalid"]
		})
		attest(Object.keys(flatByPath(read))).equals(["a[0]", ""])
		attest(Object.keys(byAncestorPath(read))).equals(["", "a", "a[0]"])
	})

	it("flatMessagesByPath holds each message without its path", () => {
		const T = type({
			email: type("string.email").configure({ message: "Enter a valid email" }),
			age: "number.integer >= 0",
			tags: "string[]"
		})
		const out = T({ email: "x", age: -0.5, tags: [1] }) as ArkErrors
		attest(flatMessagesByPath(out)).snap({
			email: ["Enter a valid email"],
			age: ["must be an integer", "must be non-negative"],
			"tags[0]": ["must be a string"]
		})
		attest(flatMessagesByPath(type("string")(5) as ArkErrors)).snap({
			"": ["must be a string"]
		})
	})

	// https://github.com/arktypeio/arktype/issues/1149
	it("morphs apply when not at an error path, even on failed validation", () => {
		const AgeType = type("string.numeric.parse").to("number>18")
		const ObjType = type({ name: "string", "age?": AgeType })

		const out = ObjType({ name: 2, age: "2" })
		attest(out.toString()).snap(`name must be a string
age must be more than 18`)
	})

	it("morphs don't apply when at an error path", () => {
		let callCount = 0
		const T = type("unknown")
			.narrow((data, ctx) => ctx.mustBe("valid"))
			.pipe(() => callCount++)

		const out = T(1)

		attest(out.toString()).snap("must be valid")
		attest(callCount).equals(0)
	})

	it("morphs don't apply when under an error path", () => {
		let callCount = 0
		const T = type({
			foo: ["unknown", "=>", () => callCount++]
		}).filter((data, ctx) => ctx.mustBe("valid"))

		attest(T.t).type.toString.snap("{ foo: (In: unknown) => Out<number> }")
		const out = T({ foo: 1 })

		attest(out.toString()).snap("must be valid")
		attest(callCount).equals(0)
	})

	it("ctx after nested call", () => {
		const calling = (t: Type, data: unknown) =>
			type("unknown").narrow((_, ctx) => {
				t.internal(data, ctx)
				return true
			})
		const Unbanged = type("string").pipe((s, ctx) =>
			s.startsWith("!") ? ctx.error("a string without !") : s
		)
		const T = type({
			a: Unbanged,
			b: calling(type("string"), 42),
			c: calling(
				type("object").pipe((o, ctx) => o),
				{}
			),
			d: "number"
		})

		attest(T({ a: "!a", b: 1, c: 1, d: "x" }).toString())
			.snap(`a must be a string without !
b must be a string
d must be a number`)
	})

	it("cyclic data after a nested call threw", () => {
		let nesting = false
		const types = scope({
			link: {
				value: [
					"number",
					":",
					(n: number) => n > 0 || (nesting && throwError("nonpositive"))
				],
				"next?": "link",
				"label?": ["string", "=>", s => s.trim()]
			},
			nested: [
				"object",
				":",
				(o: object) => {
					nesting = true
					try {
						types.link(o)
					} catch {
						nesting = false
					}
					return true
				}
			],
			nestedFirst: { first: "nested", second: "link" },
			nestedLast: { first: "link", second: "nested" }
		}).export()
		let deep: typeof types.link.inferIn = { value: 0 }
		for (let i = 1; i < 100; i++) deep = { value: i, next: deep }
		attest(types.nestedFirst.allows({ first: deep, second: deep })).equals(
			false
		)
		const ring: typeof types.link.inferIn = { value: 1, label: " a " }
		ring.next = ring
		const out = types.nestedLast.assert({ first: ring, second: { value: 0 } })
		attest(out.first.next?.label).equals("a")
	})

	it("ctx.path docs example", () => {
		const symbolicKey = Symbol("ctxPathExampleSymbol")

		let path: PropertyKey[] | undefined

		const notFoo = type.string.narrow((s, ctx) => {
			if (s !== "foo") return true
			path = ctx.path.slice(0)
			return ctx.mustBe("not foo")
		})

		const Obj = type({
			stringKey: {
				[symbolicKey]: notFoo.array()
			}
		})

		attest(
			Obj({ stringKey: { [symbolicKey]: ["bar", "foo"] } }).toString()
		).snap("stringKey[Symbol(ctxPathExampleSymbol)][1] must be not foo")
		attest(path).snap(["stringKey", "Symbol(ctxPathExampleSymbol)", 1])
	})

	it("serializes an error's own keys, where toJSON() prints a symbol key", () => {
		const tag = Symbol("my tag")
		const out = type({ [tag]: "string" })({ [tag]: 1 }) as ArkErrors
		attest(JSON.parse(JSON.stringify(out.issues))[0].path).equals([null])
		attest(out.toJSON()[0]).snap({
			path: ["Symbol(my tag)"],
			code: "domain",
			description: "a string",
			domain: "string",
			propString: "[Symbol(my tag)]",
			expected: "a string",
			message: "must be a string"
		})
	})

	it("serializes errors without their data", () => {
		const out = type({ password: "string >= 8", token: "string.uuid" })({
			password: "hunter2",
			token: "secret-token"
		}) as ArkErrors
		// a pattern's actual is its data, printed
		attest(out.issues[1].actual).snap('"secret-token"')
		const json = JSON.stringify(out)
		attest(json.includes("hunter2") || json.includes("secret")).equals(false)
		attest(out.toJSON()).snap([
			{
				path: ["password"],
				code: "minLength",
				description: "at least length 8",
				propString: "password",
				expected: "at least length 8",
				message: "must be at least length 8"
			},
			{
				path: ["token"],
				code: "pattern",
				description: "a UUID",
				propString: "token",
				expected: "a UUID",
				message: "must be a UUID"
			}
		])
	})

	it("serializes errors whose data or Type holds what JSON can't", () => {
		const cyclic: Record<string, unknown> = {}
		cyclic.self = cyclic
		const T = type({
			a: "number",
			b: type("1n").configure({ fallback: 1n } as never),
			c: type.instanceOf(Date)
		})
		const out = T({ a: cyclic, b: 2n, c: cyclic }) as ArkErrors
		attest(JSON.parse(JSON.stringify(out))).snap([
			{
				path: ["a"],
				code: "domain",
				description: "a number",
				domain: "number",
				propString: "a",
				expected: "a number",
				message: "must be a number"
			},
			{
				path: ["b"],
				code: "unit",
				description: "1n",
				propString: "b",
				expected: "1n",
				message: "must be 1n"
			},
			{
				path: ["c"],
				code: "proto",
				description: "a Date",
				propString: "c",
				expected: "a Date",
				message: "must be a Date"
			}
		])
	})

	it("serializes a union's errors without their data", () => {
		const out = type({ a: "string" }).or({ b: "bigint" })({
			a: 1n,
			b: 1
		}) as ArkErrors
		const json = JSON.stringify(out)
		attest(json.includes('"data"')).equals(false)
		attest(JSON.parse(json)).snap([
			{
				path: [],
				code: "union",
				errors: [
					{
						path: ["a"],
						code: "domain",
						description: "a string",
						domain: "string",
						propString: "a",
						expected: "a string",
						message: "must be a string"
					},
					{
						path: ["b"],
						code: "domain",
						description: "a bigint",
						domain: "bigint",
						propString: "b",
						expected: "a bigint",
						message: "must be a bigint"
					}
				],
				propString: "",
				expected: "a must be a string or b must be a bigint",
				message: "a must be a string or b must be a bigint"
			}
		])
	})

	it("issues found once read", () => {
		const data: Record<string, unknown> = { a: 0, b: 0 }
		const out = type({ a: "string", b: "number" })(data) as ArkErrors
		data.a = "a"
		data.b = "b"
		attest(out.summary).snap("b must be a number")
		data.b = 0
		attest(out.summary).snap("b must be a number")
		attest(out.constructor).equals(type.errors)
	})

	it("firstIssue writes the first issue's text alone", () => {
		const out = type({ a: "string", b: "number" })({
			a: 0,
			b: "b"
		}) as ArkErrors
		attest(firstIssue(out).message).snap("must be a string")
		attest(out._[1].message as string | undefined).equals(undefined)
		attest(out.issues[0]).equals(firstIssue(out))
		attest(out.summary).snap(`a must be a string
b must be a number`)
	})

	it("writes a first issue's actual again once it's cleared", () => {
		const out = type({ a: "string" }).pipe(o => o)({ a: 0 }) as ArkErrors
		const first = firstIssue(out)
		attest(first.actual).snap("a number")
		first.actual = undefined as never
		// written once, so reading the rest doesn't write it again
		attest(out.issues[0]).is(first)
		attest(first.actual === undefined).equals(true)
		// as errors "first" resets errors a callback read, once it drops the rest
		out._init(out._config)
		attest([out.summary, first.actual]).snap(["a must be a string", "a number"])
	})

	it("firstIssue intersects the errors at its path", () => {
		const out = type({ a: "string >= 5", b: "number" }).and({ a: /^x/ })({
			a: "abc",
			b: "b"
		}) as ArkErrors
		attest(firstIssue(out).message).snap("must be matched by ^x")
		attest(firstIssue(out)).equals(out.issues[0])
	})

	it("firstIssue at a path reached again", () => {
		const out = type({
			"[string]": "number % 2",
			a: "number > 0",
			c: "number"
		})({
			a: -1,
			c: "x"
		}) as ArkErrors
		attest(firstIssue(out).message).snap("must be positive")
		attest(out._.map(e => e.path.join("."))).equals(["a", "c", "a", "c"])
		attest(firstIssue(out)).equals(out.issues[0])
	})

	it("firstIssue of errors already found", () => {
		const out = type({ a: "string", b: "number" })({
			a: 0,
			b: "b"
		}) as ArkErrors
		attest(out.count).equals(2)
		attest(firstIssue(out)).is(out.issues[0])
	})

	it("firstIssue found alone is issues[0] once the rest are found", () => {
		const out = type({ a: "string", b: "number" })({
			a: 0,
			b: "b"
		}) as ArkErrors
		const first = firstIssue(out)
		attest(out.issues[0]).is(first)
		attest(firstIssue(out)).is(first)
		attest(out.summary).snap(`a must be a string
b must be a number`)
	})

	it("a union's whole paths after firstIssue", () => {
		const Member = type({ a: "string" }).or({ b: "number" })
		const data = { user: { a: 1, b: "x" }, c: 1 }
		// found as they validate, as a narrow calls user code, and once read
		for (const T of [
			type({ user: Member, c: "string" }).narrow(() => true),
			type({ user: Member, c: "string" })
		]) {
			const out = T(data) as ArkErrors
			attest(firstIssue(out).message).snap(
				"a must be a string or b must be a number"
			)
			attest(out.summary)
				.snap(`user.a must be a string or user.b must be a number
c must be a string`)
		}
	})

	it("errors list only the keys a standalone validator's have", () => {
		const out = type({ a: "string", b: "number" })({ a: 0, b: 0 }) as ArkErrors
		const keysOf = (o: object) => {
			const keys: string[] = []
			for (const k in o) keys.push(k)
			return keys
		}
		// unread, none: neither the node nor the data finding their issues
		attest(keysOf(out)).equals([])
		firstIssue(out)
		attest(keysOf(out)).equals([])
		void out.summary
		attest(keysOf(out)).equals([])
		// found as they validate, the issues and the path they're found at
		attest(keysOf(type("string").pipe(s => s)(0) as ArkErrors)).equals([
			"_",
			"_p"
		])
	})

	it("errors iterate their issues", () => {
		const out = type({ a: "string", b: "number" })({ a: 0, b: "b" })
		if (!(out instanceof type.errors)) throw new Error("expected errors")
		const spread = [...out]
		attest<ArkError[]>(spread).equals([...out.issues])
		const paths: string[] = []
		for (const error of out) paths.push(error.propString)
		attest(paths).equals(["a", "b"])
		attest(Array.from(out)[1]).is(out.issues[1])
	})

	it("inspected errors print their name, summary and issues", () => {
		const out = type({ a: "string" })({ a: 1 })
		attest(inspect(out)).snap(`ArkErrors {
  summary: 'a must be a string',
  issues: [
    {
      data: 1,
      path: [ 'a' ],
      code: 'domain',
      description: 'a string',
      meta: {},
      domain: 'string',
      propString: 'a',
      expected: 'a string',
      actual: 'a number',
      message: 'must be a string'
    }
  ]
}`)
		// past the depth printed, they're named as a class instance is
		attest(inspect([out], { depth: 0 })).snap("[ [ArkErrors] ]")
	})

	it("issues of data made valid before they're read", () => {
		const data: Record<string, unknown> = { a: 0 }
		const out = type({ a: "string" })(data) as ArkErrors
		data.a = "a"
		attest(out.toJSON()).snap([
			{
				path: [],
				expected: "valid",
				message: "is invalid",
				code: "predicate",
				propString: ""
			}
		])
	})

	it("issues found as it validates where it calls a narrow", () => {
		const T = type({ a: "string", b: "number" }).narrow(() => true)
		const data: Record<string, unknown> = { a: 0, b: 0 }
		const out = T(data) as ArkErrors
		data.a = "a"
		attest(out.summary).snap("a must be a string")
	})

	it("issues found as it validates where it applies a default", () => {
		const data: Record<string, unknown> = { a: 0 }
		const out = type({ a: "string", b: "number = 0" })(data) as ArkErrors
		data.a = "a"
		attest(out.summary).snap("a must be a string")
	})
})
