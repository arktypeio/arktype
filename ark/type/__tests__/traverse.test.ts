import { attest, contextualize } from "@ark/attest"
import { ArkErrors, en, TraversalError } from "@ark/schema"
import { flatMorph, throwError } from "@ark/util"
import {
	byAncestorPath,
	byPath,
	firstIssue,
	flatByPath,
	flatProblemsByPath,
	scope,
	type,
	type ArkErrorCode,
	type Type
} from "arktype"
import { inspect } from "node:util"

contextualize(() => {
	it("divisible", () => {
		const T = type("number%2")
		attest(T(4)).snap(4)
		attest(T(5).toString()).snap("must be even (was 5)")
	})

	it("range", () => {
		const T = type("number>2")
		attest(T(3)).snap(3)
		attest(T(2).toString()).snap("must be more than 2 (was 2)")
	})

	it("domain", () => {
		const T = type("number")
		attest(T(5)).snap(5)
		attest(T("foo").toString()).snap("must be a number (was a string)")
	})

	it("pattern", () => {
		const T = type("/.*@arktype.io/")
		attest(T("shawn@arktype.io")).snap("shawn@arktype.io")
		attest(T("shawn@hotmail.com").toString()).snap(
			'must be matched by .*@arktype.io (was "shawn@hotmail.com")'
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

	it("customized built-in problem", () => {
		const types = scope(
			{ isEven: "number%2" },
			{
				divisor: {
					expected: ctx => `% ${ctx.rule} !== 0`,
					problem: ctx => `${ctx.actual} ${ctx.expected}`
				}
			}
		).export()
		attest(types.isEven(3).toString()).snap("3 % 2 !== 0")
	})

	it("domains", () => {
		const T = type("string|number[]")
		attest(T([1])).snap([1])
		attest(T("hello")).snap("hello")
		attest(T(2).toString()).snap("must be a string or an array (was a number)")
		attest(T({}).toString()).snap("must be an array (was an object)")
	})

	it("tuple length", () => {
		const T = type(["string", "number", "string", "string[]"])
		const data: typeof T.infer = ["foo", 5, "boo", []]
		attest(T(data)).equals(data)
		attest(T(["hello"]).toString()).snap("must be exactly length 4 (was 1)")
	})

	it("branches", () => {
		const T = type({ bar: "boolean" }, "|", { foo: "string" })
		attest(T({ foo: "ok" })).snap({ foo: "ok" })
		attest(T({ bar: true })).snap({ bar: true })
		attest(T({}).toString()).snap(
			"bar must be boolean (was missing) or foo must be a string (was missing)"
		)
		attest(T({ bar: "swapped", foo: true }).toString()).snap(
			'bar must be boolean (was "swapped") or foo must be a string (was boolean)'
		)
	})

	it("common errors collapse", () => {
		const T = type({ base: "1", a: "1" }, "|", { base: "1", b: "1" })
		attest(T({ base: 1, a: 1 })).snap({ base: 1, a: 1 })
		attest(T({ base: 1, b: 1 })).snap({ base: 1, b: 1 })
		attest(T({ a: 1, b: 1 }).toString()).snap("base must be 1 (was missing)")
	})

	it("branches at path", () => {
		const T = type({ key: [{ a: "string" }, "|", { b: "boolean" }] })
		attest(T({ key: { a: "ok" } })).snap({ key: { a: "ok" } })
		attest(T({ key: { b: true } })).snap({ key: { b: true } })
		attest(T({ key: {} }).toString()).snap(
			"key.a must be a string (was missing) or key.b must be boolean (was missing)"
		)
	})

	it("branches at a key named like an Object.prototype member", () => {
		const T = type({ constructor: "string.email | string.uuid" })
		attest(T({ constructor: "x" }).toString()).snap(
			'constructor must be an email address or a UUID (was "x")'
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
			"a must be a number, a string or null (was boolean)"
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
			"foo must be a number, a string or an object (was null)"
		)
	})

	it("serialized actual for discriminated union", () => {
		const T = type({ a: "'foo'" }).or({ a: "'bar'" })
		attest(T({ a: '"extra quotes"' }).toString()).snap(
			'a must be "bar" or "foo" (was "\\"extra quotes\\"")'
		)
		attest(T({ a: "" }).toString()).snap('a must be "bar" or "foo" (was "")')
		attest(T({ a: 5 }).toString()).snap('a must be "bar" or "foo" (was 5)')
	})

	it("multi", () => {
		const NaturalNumber = type("number.integer>0")
		attest(NaturalNumber(-1.2).toString()).snap(`(-1.2) must be...
  ◦ an integer
  ◦ positive`)
		const NaturalAtPath = type({
			natural: NaturalNumber
		})
		attest(NaturalAtPath({ natural: -0.1 }).toString())
			.snap(`natural (-0.1) must be...
  ◦ an integer
  ◦ positive`)
	})

	// https://github.com/arktypeio/arktype/issues/1412
	it("multi described alike", () => {
		const Email = type("string.email > 0", "@", "Email is not valid")
		attest(Email("").toString()).snap('must be Email is not valid (was "")')
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
		attest(traversalError.message).snap(`
  • natural (-3.141592653589793) must be...
    ◦ an integer
    ◦ positive
  • name must be a string (was an object)`)
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
luckyNumbers[1] must be a bigint or a number (was a string)
isAdmin must be false, null or true (was 1)`)
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

		attest(out.toString()).snap(`a (an object) must be...
  ◦ x
  ◦ y`)
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

		attest(out.summary).snap("a must be x (was an object)")
		attest(out.toLocaleString(en)).equals(out.summary)
	})

	it("an error a morph adds and returns is listed once", () => {
		const T = type({ a: "string" }).pipe((o, ctx) => {
			ctx.error({ expected: "p", relativePath: ["a"] })
			return ctx.error({ expected: "q", relativePath: ["a"] })
		})

		const out = T({ a: "s" }) as ArkErrors

		attest(out.toString()).snap(`a (an object) must be...
  ◦ p
  ◦ q`)
		attest(out.count).equals(2)
	})

	it("a morph returning ctx.errors adds them once", () => {
		const Checked = type("string").pipe((s, ctx) => {
			ctx.error("not ok")
			return ctx.errors
		})

		attest(Checked("x").toString()).snap('must be not ok (was "x")')

		const out = type({ a: Checked, b: "number" })({ a: "x", b: "y" })

		attest(out.toString()).snap(`a must be not ok (was "x")
b must be a number (was a string)`)
		attest((out as ArkErrors).count).equals(2)
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
			"": ["a", "c", "b"],
			x: ["a", "c"],
			"x.z": ["a", "c"],
			y: ["b"]
		})
		attest(expectedByAncestorPath(out)).equals(
			expectedByAncestorPath(T(false)(1) as ArkErrors)
		)
	})

	it("a never error replaces the errors at its path", () => {
		const out = type("unknown").narrow((d, ctx) => {
			ctx.reject({ expected: "a", path: ["x"] })
			attest(byAncestorPath(ctx.errors).x.length).equals(1)
			ctx.error({ code: "union", errors: [], path: ["x"] })
			ctx.reject({ expected: "b", path: ["x"] })
			return false
		})(1) as ArkErrors

		attest(out.count).equals(3)
		attest<ArkErrorCode[]>(flatByPath(out).x.map(e => e.code)).equals(["union"])
		attest(byAncestorPath(out).x.map(e => e.code)).equals(["union"])
	})

	it("errors at more paths than are scanned", () => {
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
		attest(out.issues.length).equals(43)
		attest(out.issues.slice(38).map(e => e.message)).snap([
			"k[38] must be p38 (was 1)",
			"k[39] (1) must be...\n  ◦ p39\n  ◦ r",
			"value at [Symbol(alike)] must be s (was 1)",
			"value at [Symbol(alike)] (1) must be...\n  ◦ t\n  ◦ v",
			"k must be u (was 1)"
		])
		attest(flatProblemsByPath(out)["k[3]"]).snap([
			"must be p3 (was 1)",
			"must be q (was 1)"
		])
	})

	it("flattens errors by path into plain objects", () => {
		const out = type({ ["__proto__"]: "string", a: "string" })(
			JSON.parse('{ "__proto__": 1, "a": 2 }')
		) as ArkErrors
		const problems = flatProblemsByPath(out)
		attest(Object.getPrototypeOf(problems)).is(Object.prototype)
		attest(Object.getPrototypeOf(flatByPath(out))).is(Object.prototype)
		attest(Object.entries(problems)).snap([
			["__proto__", ["must be a string (was a number)"]],
			["a", ["must be a string (was a number)"]]
		])
		attest(Object.keys(flatByPath(out))).equals(["__proto__", "a"])
	})

	// https://github.com/arktypeio/arktype/issues/1149
	it("morphs apply when not at an error path, even on failed validation", () => {
		const AgeType = type("string.numeric.parse").to("number>18")
		const ObjType = type({ name: "string", "age?": AgeType })

		const out = ObjType({ name: 2, age: "2" })
		attest(out.toString()).snap(`name must be a string (was a number)
age must be more than 18 (was 2)`)
	})

	it("morphs don't apply when at an error path", () => {
		let callCount = 0
		const T = type("unknown")
			.narrow((data, ctx) => ctx.mustBe("valid"))
			.pipe(() => callCount++)

		const out = T(1)

		attest(out.toString()).snap("must be valid (was 1)")
		attest(callCount).equals(0)
	})

	it("morphs don't apply when under an error path", () => {
		let callCount = 0
		const T = type({
			foo: ["unknown", "=>", () => callCount++]
		}).filter((data, ctx) => ctx.mustBe("valid"))

		attest(T.t).type.toString.snap("{ foo: (In: unknown) => Out<number> }")
		const out = T({ foo: 1 })

		attest(out.toString()).snap("must be valid (was an object)")
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
			.snap(`a must be a string without ! (was "!a")
b must be a string (was a number)
d must be a number (was a string)`)
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
		).snap(
			'stringKey[Symbol(ctxPathExampleSymbol)][1] must be not foo (was "foo")'
		)
		attest(path).snap(["stringKey", "Symbol(ctxPathExampleSymbol)", 1])
	})

	it("serializes an error's own keys, where toJSON() prints a symbol key", () => {
		const tag = Symbol("tag")
		const out = type({ [tag]: "string" })({ [tag]: 1 }) as ArkErrors
		attest(JSON.parse(JSON.stringify(out.issues))[0].path).equals([null])
		attest(out.toJSON()[0]).snap({
			data: 1,
			path: ["Symbol(tag)"],
			code: "domain",
			description: "a string",
			meta: {},
			domain: "string",
			propString: "[Symbol(tag)]",
			expected: "a string",
			actual: "a number",
			problem: "must be a string (was a number)",
			message: "value at [Symbol(tag)] must be a string (was a number)"
		})
	})

	it("issues found once read", () => {
		const data: Record<string, unknown> = { a: 0, b: 0 }
		const out = type({ a: "string", b: "number" })(data) as ArkErrors
		data.a = "a"
		data.b = "b"
		attest(out.summary).snap("b must be a number (was a string)")
		data.b = 0
		attest(out.summary).snap("b must be a number (was a string)")
		attest(out.constructor).equals(type.errors)
	})

	it("firstIssue writes the first issue's text alone", () => {
		const out = type({ a: "string", b: "number" })({
			a: 0,
			b: "b"
		}) as ArkErrors
		attest(firstIssue(out).message).snap("a must be a string (was a number)")
		attest(out._[1].message as string | undefined).equals(undefined)
		attest(out.issues[0]).equals(firstIssue(out))
		attest(out.summary).snap(`a must be a string (was a number)
b must be a number (was a string)`)
	})

	it("firstIssue intersects the errors at its path", () => {
		const out = type({ a: "string >= 5", b: "number" }).and({ a: /^x/ })({
			a: "abc",
			b: "b"
		}) as ArkErrors
		attest(firstIssue(out).message).snap(`a ("abc") must be...
  ◦ matched by ^x
  ◦ at least length 5`)
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
		attest(firstIssue(out).message).snap(`a (-1) must be...
  ◦ positive
  ◦ even`)
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

	it("inspected errors print their issues", () => {
		const out = type({ a: "string" })({ a: 1 })
		attest(inspect(out)).snap(`[
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
    problem: 'must be a string (was a number)',
    message: 'a must be a string (was a number)'
  }
]`)
	})

	it("issues of data made valid before they're read", () => {
		const data: Record<string, unknown> = { a: 0 }
		const out = type({ a: "string" })(data) as ArkErrors
		data.a = "a"
		attest(out.toJSON()).snap([
			{
				data: { a: "a" },
				path: [],
				expected: "valid",
				problem: "is invalid",
				code: "predicate",
				propString: "",
				actual: "an object",
				message: "is invalid"
			}
		])
	})

	it("issues found as it validates where it calls a narrow", () => {
		const T = type({ a: "string", b: "number" }).narrow(() => true)
		const data: Record<string, unknown> = { a: 0, b: 0 }
		const out = T(data) as ArkErrors
		data.a = "a"
		attest(out.summary).snap("a must be a string (was a number)")
	})

	it("issues found as it validates where it applies a default", () => {
		const data: Record<string, unknown> = { a: 0 }
		const out = type({ a: "string", b: "number = 0" })(data) as ArkErrors
		data.a = "a"
		attest(out.summary).snap("a must be a string (was a number)")
	})
})
