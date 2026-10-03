import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"

contextualize(() => {
	it("preserves the original references if no morphs are present", () => {
		const T = type({
			foo: "string"
		})

		const original = { foo: "bar" }

		const out = T(original)
		attest(out).is(original)
	})

	it("doesn't mutate its input", () => {
		const T = type({
			foo: "string.trim",
			inner: { a: "string", b: "number = 5" }
		})

		const original = { foo: "  bar  ", inner: { a: "a" } }

		const out = T(original)

		attest(out).snap({ foo: "bar", inner: { a: "a", b: 5 } })
		attest(original).snap({ foo: "  bar  ", inner: { a: "a" } })
	})

	it("doesn't mutate an invalid input", () => {
		const T = type({
			foo: "string.trim",
			inner: { a: "string", b: "number = 5" },
			n: "number"
		})

		const original = { foo: "  bar  ", inner: { a: "a" }, n: "1" }

		attest(T(original).toString()).snap("n must be a number (was a string)")
		attest(original).snap({ foo: "  bar  ", inner: { a: "a" }, n: "1" })
	})

	it("shares values it doesn't transform", () => {
		const T = type({ a: "string.trim", b: { c: "number[]" } })

		const original = { a: " a ", b: { c: [1] } }

		const out = T.assert(original)

		attest(out).snap({ a: "a", b: { c: [1] } })
		attest(out.b).is(original.b)
	})

	it("keeps a morph's output that differs only in its sign of zero", () => {
		const Negated = type("number").pipe(n => -n)
		const T = type({ a: Negated, b: Negated.array() })

		const out = T.assert({ a: 0, b: [-0] })

		attest(Object.is(out.a, -0)).equals(true)
		attest(Object.is(out.b[0], 0)).equals(true)
	})

	it("transforms a key a prop and an index signature share by both at once", () => {
		const T = type({
			a: { x: "string.trim" },
			"[string]": { "y?": "string.trim" }
		})

		const original = { a: { x: " 1 ", y: " 2 " } }

		const out: unknown = T(original)
		const deleted: unknown = T.onUndeclaredKey("delete")(original)

		attest(out).snap({ a: { x: "1", y: "2" } })
		attest(deleted).snap({ a: { x: "1", y: "2" } })
		attest(original).snap({ a: { x: " 1 ", y: " 2 " } })

		const WithDisjointProp = type({
			a: { x: "string.trim" },
			"b?": "string.trim"
		}).and({ "[string]": { "y?": "string.trim" } })

		attest(WithDisjointProp(original)).snap({ a: { x: "1", y: "2" } })

		let calls = 0
		const Trimmed = type("string").pipe(s => (calls++, s.trim()))
		const U = type({ a: Trimmed, "[string]": Trimmed })

		attest(U({ a: " a ", b: " b " })).snap({ a: "a", b: "b" })
		attest(calls).equals(2)
	})

	it("transforms a frozen input", () => {
		const T = type({ foo: "string.trim", bar: "number = 5" })

		const original = Object.freeze({ foo: "  bar  " })

		attest(T(original)).snap({ foo: "bar", bar: 5 })
	})

	it("transforms an object at two paths separately", () => {
		const T = type({ a: { v: "string.trim" }, b: { v: "string.trim" } })

		const shared = { v: " x " }

		const out = T.assert({ a: shared, b: shared })

		attest(out).snap({ a: { v: "x" }, b: { v: "x" } })
		attest(out.a === out.b).equals(false)
		attest(shared).snap({ v: " x " })
	})

	it("passes a morph its input", () => {
		const increment = (o: { n: number }) => {
			o.n++
			return o
		}

		const T = type([{ n: "number" }, "=>", increment])

		// a root's first call and later ones apply it alike
		for (let i = 0; i < 2; i++) {
			const original = { n: 1 }
			attest(T(original)).is(original)
			attest(original).snap({ n: 2 })
		}
	})

	it("preserves prototypes", () => {
		class Box {
			a = " a "
		}
		const T = type([type.instanceOf(Box), "&", { a: "string.trim" }])

		const original = new Box()

		const out = T.assert(original)

		attest(out instanceof Box).equals(true)
		attest(out.a).equals("a")
		attest(original.a).equals(" a ")
	})

	it("copies an object whose prototype's constructor isn't a builtin", () => {
		const T = type({ a: "number = 1" })
		for (const constructor of [
			function constructor() {},
			Object.prototype.toString
		]) {
			const original = Object.create({ constructor })
			attest(T.assert(original).a).equals(1)
			attest(Object.keys(original)).equals([])
		}
	})

	it("copies a builtin with its contents", () => {
		const T = type(["Date", "&", { b: "number = 1" }])

		const original = new Date(5)

		const out: unknown = T(original)

		attest(out instanceof Date && out.getTime()).equals(5)
		attest(Object.entries(out as never)).equals([["b", 1]])
		attest("b" in original).equals(false)
	})

	it("transforms a prop of a frozen builtin", () => {
		const T = type(["Date", "&", { "a?": "string.trim" }])
		const original = Object.freeze(Object.assign(new Date(5), { a: " x " }))
		const out: unknown = T(original)
		attest(out instanceof Date && out.getTime()).equals(5)
		attest(Object.entries(out as never)).equals([["a", "x"]])
	})

	it("copies a builtin whose contents are in internal slots", () => {
		const U = type([type.instanceOf(URL), "&", { "a?": "string.trim" }])
		const url: unknown = U(
			Object.assign(new URL("https://arktype.io"), { a: " x " })
		)
		attest(url instanceof URL && url.href).equals("https://arktype.io/")
		attest(Object.entries(url as never)).equals([["a", "x"]])

		const Bytes = type([
			type.instanceOf(Uint8Array),
			"&",
			{ "a?": "string.trim" }
		])
		const original = Object.assign(new Uint8Array([1, 2]), { a: " x " })
		const bytes: unknown = Bytes(original)
		attest(bytes instanceof Uint8Array).equals(true)
		attest(Object.entries(bytes as never)).equals([
			["0", 1],
			["1", 2],
			["a", "x"]
		])
		attest(original.a).equals(" x ")
	})

	it("transforms a builtin it can't copy in place", () => {
		const T = type(["Function", "&", { "a?": "string.trim" }])
		const original = Object.assign(() => 5, { a: " x " })
		const out: unknown = T(original)
		attest(out === original).equals(true)
		attest(original.a).equals("x")
	})

	it("copies a declared key data holds as a non-enumerable own prop", () => {
		for (const $ of [scope({}), scope({}, { jitless: true })]) {
			const T = $.type({ e: "string", d: "string = 'd'" })
			const original = Object.defineProperty({}, "e", { value: "e" })
			const out = T.assert(original)
			attest(out).equals({ e: "e", d: "d" })
			attest(T(out)).equals(out)
		}
	})

	it("applies a morph at a non-enumerable declared key when a sibling fails", () => {
		for (const $ of [scope({}), scope({}, { jitless: true })]) {
			const T = $.type({
				a: "string.trim",
				c: { d: "string.date.parse" },
				b: "string"
			})
			const original = Object.defineProperties(
				{ b: 1 },
				{ a: { value: " a " }, c: { value: { d: "2020-01-01" } } }
			)
			attest(T(original).toString()).snap("b must be a string (was a number)")
		}
	})

	it("drops undeclared non-enumerable props and reads accessors when it copies", () => {
		for (const $ of [scope({}), scope({}, { jitless: true })]) {
			const T = $.type({ a: "string.trim" })
			const original = Object.defineProperties(
				{ a: " a " },
				{
					hidden: { value: 1 },
					computed: { get: () => 2, enumerable: true }
				}
			)
			const out = T.assert(original)
			attest(Object.getOwnPropertyDescriptors(out)).equals({
				a: { value: "a", writable: true, enumerable: true, configurable: true },
				computed: {
					value: 2,
					writable: true,
					enumerable: true,
					configurable: true
				}
			} as never)
		}
	})

	it("copies an array with the props its type declares", () => {
		const T = type([
			"string.trim[]",
			"&",
			{ foo: "string.trim", bar: "string" }
		])

		const original = Object.assign([" a "], { foo: " x ", bar: "y" })

		const out = T.assert(original)

		attest([...out]).equals(["a"])
		attest(out.foo).equals("x")
		attest(out.bar).equals("y")
		attest(
			T(Object.assign([" a ", 1], { foo: " x ", bar: "y" })).toString()
		).snap("value at [1] must be a string (was a number)")
	})

	it("copies an array with its own props when another type shares its defaults", () => {
		for (const $ of [scope({}), scope({}, { jitless: true })]) {
			const T = $.type({
				x: $.type({ a: "number = 5", b: "string" })
					.and("string[]")
					.pipe((arr, ctx) => (arr.b === "kept" ? arr : ctx.error("kept"))),
				y: "number"
			})
			const out = T({ x: Object.assign(["s"], { b: "kept" }), y: "bad" })
			attest(out.toString()).snap("y must be a number (was a string)")
		}
	})

	it("calls a morph that takes one argument without ctx", () => {
		for (const $ of [scope({}), scope({}, { jitless: true })]) {
			const T = $.type({
				a: ["string", "=>", (s: string, ctx: unknown = undefined) => !ctx]
			})
			attest(T.assert({ a: "x" }).a).equals(true)
		}
	})

	it("reports a branch's morph errors in a union that requires ctx", () => {
		const N = type("number")
		for (const jitless of [false, true]) {
			const types = scope(
				{
					parsed: ["string", "=>", s => N(s)],
					signed: [
						"number",
						"=>",
						(n, ctx) => (n < 0 ? ctx.error("signed") : n)
					],
					tree: { "child?": "tree" },
					contextual: "parsed | signed",
					cyclic: { a: "parsed | tree" }
				},
				{ jitless }
			).export()

			attest(types.contextual("x").toString()).snap(
				"must be a number (was a string)"
			)
			attest(types.contextual.array()(["x"]).toString()).snap(
				"value at [0] must be a number (was a string)"
			)
			attest(types.cyclic({ a: "x" }).toString()).snap(
				"a must be a number (was a string)"
			)
		}
	})

	it("decides a piped contextual node at its own path", () => {
		for (const $ of [scope({}), scope({}, { jitless: true })]) {
			const paths: PropertyKey[][] = []
			const T = $.type({
				password: "string",
				confirm: $.type("string.trim").narrow(
					(s, ctx) => s === (ctx.root as { password: string }).password
				),
				length: $.type("string")
					.pipe(s => s.length)
					.narrow((n, ctx) => (paths.push([...ctx.path]), n > 0))
			})

			attest(T({ password: "pw", confirm: " pw ", length: "a" })).equals({
				password: "pw",
				confirm: "pw",
				length: 1
			})
			attest(T({ password: "pw", confirm: "pw", length: "" }).toString()).snap(
				"length must be valid according to an anonymous predicate (was 0)"
			)
			attest(paths).equals([["length"], ["length"]])
		}
	})

	it("takes a union branch whose predicate reads ctx", () => {
		for (const $ of [scope({}), scope({}, { jitless: true })]) {
			const Long = $.type([
				"string > 5",
				":",
				(s, ctx) => (ctx.root as { allowLong: boolean }).allowLong
			]).pipe(s => s.length)
			const T = $.type({ v: Long.or("string < 3"), allowLong: "boolean" })

			attest(T({ v: "abcdefg", allowLong: true })).equals({
				v: 7,
				allowLong: true
			})
		}
	})

	it("reports an error a predicate adds while returning true", () => {
		for (const $ of [scope({}), scope({}, { jitless: true })]) {
			const Positive = $.type("number").narrow((n, ctx) => {
				if (n <= 0) ctx.error("positive")
				return true
			})
			const T = $.type({ n: Positive, s: "string.trim" })

			attest(T({ n: -1, s: " x " }).toString()).snap(
				"n must be positive (was -1)"
			)
			attest(Positive.allows(-1)).equals(false)
		}
	})

	it("returns data shaped like an ArkError as a morph's output", () => {
		const T = type({ payload: "string.json.parse", "n?": "number" })
		const payload = { " arkKind": "errors" }

		attest(T({ payload: JSON.stringify(payload) })).equals({ payload })
		attest(T({ payload: JSON.stringify(payload), n: "1" }).toString()).snap(
			"n must be a number (was a string)"
		)
	})

	it("reports a morph's error alike whether or not its input is valid", () => {
		const T = type({
			a: ["string", "=>", (s, ctx) => ctx.error("short")],
			b: "number"
		})

		attest(T({ a: "x", b: 1 }).toString()).snap('a must be short (was "x")')
		attest(T({ a: "x", b: "1" }).toString()).snap(
			'b must be a number (was a string)\na must be short (was "x")'
		)
	})

	it("reports morph errors in a union branch it reaches through an alias", () => {
		const $ = scope({
			node: {
				v: ["string", "=>", (s, ctx) => ctx.error("short")],
				"next?": "node | null",
				"z?": "number"
			}
		}).export()

		attest($.node({ v: "a", next: { v: "b", next: null } }).toString()).snap(
			'v must be short (was "a")\nnext.v must be short (was "b")'
		)
		attest(
			$.node({ v: "a", next: { v: "b", next: null }, z: "1" }).toString()
		).snap(
			'z must be a number (was a string)\nv must be short (was "a")\nnext.v must be short (was "b")'
		)
	})

	it("skips the morphs after a piped node whose morph fails", () => {
		const calls: string[] = []
		const Inner = type("string").pipe((s, ctx) => {
			calls.push("inner")
			return ctx.error("valid inner")
		})
		const T = type("string").pipe(
			s => (calls.push("before"), s),
			Inner,
			s => (calls.push("after"), s)
		)

		attest(T("x").toString()).snap('must be valid inner (was "x")')
		attest(calls).equals(["before", "inner"])
	})

	it("reports errors a nested morph returns", () => {
		const Inner = type({ x: "number" })
		const T = type({
			outer: { a: type("object").pipe(o => Inner(o)) },
			other: { b: "number = 5" }
		})

		attest(T({ outer: { a: { x: "no" } }, other: {} }).toString()).snap(
			"outer.a.x must be a number (was a string)"
		)
	})

	it("applies only the morphs of the branches it takes", () => {
		let calls = 0
		const Negated = type("number < 0")
			.pipe(n => (calls++, -n))
			.or("number > 10")
		const T = type({
			o: type({ a: Negated, b: "number > 5" }).or({
				a: "unknown",
				b: "number < 3"
			}),
			s: "string"
		})

		attest(T({ o: { a: -5, b: 1 }, s: "s" })).snap({
			o: { a: -5, b: 1 },
			s: "s"
		})
		attest(T({ o: { a: -5, b: 1 }, s: 1 }).toString()).snap(
			"s must be a string (was a number)"
		)
		attest(calls).equals(0)
	})

	it("transforms a discriminated union's case without checking its branches", () => {
		for (const $ of [scope({}), scope({}, { jitless: true })]) {
			let calls = 0
			const T = $.type(["string", ":", s => (calls++, s.length > 0)]).or({
				a: "string.trim"
			})

			attest(T("x")).equals("x")
			attest(calls).equals(1)
		}
	})

	it("transforms cyclic data through a cyclic alias once", () => {
		let calls = 0
		const $ = scope({
			node: {
				value: ["string", "=>", s => (calls++, s.trim())],
				"next?": "node"
			}
		})

		const original: { value: string; next?: unknown } = { value: " a " }
		original.next = original

		const out = $.export().node(original) as { value: string; next?: unknown }

		attest(calls).equals(1)
		attest(out.value).equals("a")
		attest(out.next).is(out)
		attest(original.value).equals(" a ")
	})

	it("transforms cyclic data to the class a morph returns", () => {
		class Node {
			value: string
			next: unknown
			constructor(o: { value: string; next?: unknown }) {
				this.value = o.value
				this.next = o.next
			}
		}
		const $ = scope({
			node: [{ value: "string", "next?": "node" }, "=>", o => new Node(o)]
		})

		const original: { value: string; next?: unknown } = { value: "a" }
		original.next = original

		const out: unknown = $.export().node(original)

		attest(out instanceof Node).equals(true)
		attest((out as Node).next).is(out)
	})

	it("transforms a primitive under a cyclic alias at each path", () => {
		const $ = scope({
			leaf: ["string", "=>", (s, ctx) => `${s}@${ctx.propString}`],
			node: "leaf | node[]"
		})

		attest($.export().node(["a", "a", ["a"]])).snap([
			"a@[0]",
			"a@[1]",
			["a@[2][0]"]
		])
	})

	it("transforms a piped node's input in a pass of its own", () => {
		const calls: string[] = []
		const $ = scope({
			node: {
				value: ["string", "=>", s => (calls.push(s), s)],
				"next?": "node"
			}
		})
		const T = $.type("node").pipe(o => o, $.type("node"))

		T({ value: "a", next: { value: "b" } })

		attest(calls).equals(["a", "b", "a", "b"])
	})

	describe("undeclared keys", () => {
		it("deletes them, ordering keys as its expression does", () => {
			const T = type({
				"+": "delete",
				z: "string",
				b: "number",
				"a?": "string"
			})

			const original = { z: "z", b: 1 }

			attest(T(original)).is(original)
			attest(T.expression).snap(
				"{ b: number, z: string, a?: string, + (undeclared): delete }"
			)
			attest(Object.keys(T({ a: "a", z: "z", c: true, b: 1 }))).equals([
				"b",
				"z",
				"a"
			])
		})

		it("deletes an undeclared symbol key", () => {
			for (const $ of [scope({}), scope({}, { jitless: true })]) {
				const T = $.type({ "+": "delete", a: "string" })
				const out = T.assert({ a: "a", [Symbol("s")]: 1 })
				attest(Reflect.ownKeys(out)).equals(["a"])
			}
		})

		// process.env is an exotic object- ensure it is correctly copied
		// https://discord.com/channels/957797212103016458/1116551844710330458
		it("deletes them from process.env", () => {
			const Env = type({
				"+": "delete",
				TZ: "'America/New_York'"
			})

			const originalEnv = { ...process.env }

			const vars = Env(process.env)

			attest(vars).snap({ TZ: "America/New_York" })
			// if process.env is not spread here, the assertion fails apparently
			// because it's an exotic object? seems like a Node bug
			attest({ ...process.env }).equals(originalEnv)
		})
	})
})
