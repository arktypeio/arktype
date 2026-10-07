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

	it("shares untransformed values", () => {
		const T = type({ a: "string.trim", b: { c: "number[]" } })

		const original = { a: " a ", b: { c: [1] } }

		const out = T.assert(original)

		attest(out).snap({ a: "a", b: { c: [1] } })
		attest(out.b).is(original.b)
	})

	it("morph to -0", () => {
		const Negated = type("number").pipe(n => -n)
		const T = type({ a: Negated, b: Negated.array() })

		const out = T.assert({ a: 0, b: [-0] })

		attest(Object.is(out.a, -0)).equals(true)
		attest(Object.is(out.b[0], 0)).equals(true)
	})

	it("prop and index on one key", () => {
		const T = type({
			a: { x: "string.trim" },
			"[string]": { "y?": "string.trim" }
		})

		const original = { a: { x: " 1 ", y: " 2 " } }

		const out = T(original)
		const deleted = T.onUndeclaredKey("delete")(original)

		attest(out).unknown.snap({ a: { x: "1", y: "2" } })
		attest(deleted).unknown.snap({ a: { x: "1", y: "2" } })
		attest(original).snap({ a: { x: " 1 ", y: " 2 " } })

		const WithDisjointProp = type({
			a: { x: "string.trim" },
			"b?": "string.trim"
		}).and({ "[string]": { "y?": "string.trim" } })

		attest(WithDisjointProp(original)).snap({ a: { x: "1", y: "2" } })
	})

	it("index signature morph calls", () => {
		let callCount = 0
		const Trimmed = type("string").pipe(s => {
			callCount++
			return s.trim()
		})
		const U = type({ a: Trimmed, "[string]": Trimmed })

		attest(U({ a: " a ", b: " b " })).snap({ a: "a", b: "b" })
		attest(callCount).equals(2)
	})

	it("prop and index morphs in turn", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
			const T = $.type({ a: "string.trim" }).and({ "[string]": "string.lower" })
			const anded = T({ a: " AB ", b: " Q " })
			attest(anded).unknown.snap({ a: "ab", b: " q " })

			const U = $.type({ "[string]": "string.trim", "[/^a/]": "string.lower" })
			attest(U({ ab: " X ", b: " Y " })).snap({ ab: "x", b: "Y" })

			const types = scope(
				{
					node: {
						"a?": "node",
						"v?": "string.trim",
						"[/^a/]": $.type({ "v?": "string" }).pipe(o => ({
							...o,
							tagged: true
						}))
					}
				},
				{ jitless }
			).export()
			const out = types.node({ v: " x ", a: { v: " y " } })
			attest(out).unknown.snap({
				v: "x",
				a: { v: "y", tagged: true }
			})
		}
	})

	it("contextual index on declared key", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
			const Listed = $.type("string").narrow((k, ctx) =>
				(ctx.root as { trimmed: string[] }).trimmed.includes(k)
			)
			const T = $.type({ trimmed: "string[]", a: "string.lower" }).and(
				$.type.Record(Listed, "string.trim")
			)
			const out = T({ trimmed: ["a"], a: " X " })
			attest(out).unknown.snap({ trimmed: ["a"], a: "x" })
		}
	})

	it("index transform of a prop with a default", () => {
		for (const jitless of [false, true]) {
			const T = scope({}, { jitless }).type({
				"p?": ["object", ["string", "=", "d"]],
				"[string]": { "[string]": { x: "string.numeric.parse" } }
			})
			const types = scope(
				{ a: { "p?": ["object", ["string", "=", "d"]], "[string]": "a" } },
				{ jitless }
			).export()

			const out = T({ p: [{ x: "1" }] })
			const cyclicOut = types.a({ p: [{}] })
			attest(out).unknown.equals({ p: [{ x: 1 }, "d"] })
			attest(cyclicOut).unknown.equals({ p: [{}, "d"] })
		}
	})

	it("index transform deleting an inherited key name", () => {
		for (const jitless of [false, true]) {
			const T = scope({}, { jitless }).type({
				"p?": ["object", ["string", "=", "d"]],
				"[string]": { "+": "delete", "[/^\\d+$/]": "object" }
			})
			const out = T.assert({ p: Object.assign([{}], { toString: 1 }) })
			attest(Object.keys(out.p as object)).equals(["0", "1"])
		}
	})

	it("failed key transform", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
			const A = $.type("string").pipe((s, ctx) => ctx.error("A"))
			const B = $.type("string").pipe((s, ctx) => ctx.error("B"))

			const T = $.type({ "[string]": A, "[/^a/]": B })
			attest(T({ ab: "x", b: "y" }).toString()).snap(`ab must be A (was "x")
b must be A (was "y")`)

			const U = $.type({ a: A }).and({ "[string]": B })
			attest(U({ a: "x" }).toString()).snap('a must be A (was "x")')
		}
	})

	it("transforms a frozen input", () => {
		const T = type({ foo: "string.trim", bar: "number = 5" })

		const original = Object.freeze({ foo: "  bar  " })

		attest(T(original)).snap({ foo: "bar", bar: 5 })
	})

	it("shared object at two paths", () => {
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

		class List extends Array<string> {
			get [Symbol.isConcatSpreadable]() {
				return false
			}
		}
		const list = type("string.trim[]").assert(List.from([" a ", "b"]))
		attest(list instanceof List && [...list]).equals(["a", "b"])
	})

	it("non-builtin prototype constructor", () => {
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

	it("builtin with contents", () => {
		const T = type(["Date", "&", { b: "number = 1" }])

		const original = new Date(5)

		const out = T(original)

		attest(out instanceof Date && out.getTime()).equals(5)
		attest(Object.entries(out)).equals([["b", 1]])
		attest("b" in original).equals(false)
	})

	it("frozen builtin prop", () => {
		const T = type(["Date", "&", { "a?": "string.trim" }])
		const original = Object.freeze(Object.assign(new Date(5), { a: " x " }))
		const out = T(original)
		attest(out instanceof Date && out.getTime()).equals(5)
		attest(Object.entries(out)).equals([["a", "x"]])
	})

	it("builtin with internal slots", () => {
		const U = type([type.instanceOf(URL), "&", { "a?": "string.trim" }])
		const url = U(Object.assign(new URL("https://arktype.io"), { a: " x " }))
		attest(url instanceof URL && url.href).equals("https://arktype.io/")
		attest(Object.entries(url)).equals([["a", "x"]])

		const Bytes = type([
			type.instanceOf(Uint8Array),
			"&",
			{ "a?": "string.trim" }
		])
		const original = Object.assign(new Uint8Array([1, 2]), { a: " x " })
		const bytes = Bytes(original)
		attest(bytes instanceof Uint8Array).equals(true)
		attest(Object.entries(bytes)).equals([
			["0", 1],
			["1", 2],
			["a", "x"]
		])
		attest(original.a).equals(" x ")
	})

	it("uncopyable builtin in place", () => {
		const T = type(["Function", "&", { "a?": "string.trim" }])
		const original = Object.assign(() => 5, { a: " x " })
		const out = T(original)
		attest(out).unknown.is(original)
		attest(original.a).equals("x")

		const frozen = Object.freeze(Object.assign(() => 5, { a: " x " }))
		attest(() => T(frozen)).throws("Cannot assign to read only property 'a'")

		const Received = type([
			type.instanceOf(Response),
			"&",
			{ "a?": "string.trim" }
		])
		const response = Object.assign(new Response(), { a: " x " })
		const received = Received(response)
		attest(received).unknown.is(response)
	})

	it("non-enumerable declared key", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
			const T = $.type({ e: "string", d: "string = 'd'" })
			const original = Object.defineProperty({}, "e", { value: "e" })
			const out = T.assert(original)
			attest(out).equals({ e: "e", d: "d" })
			attest(T(out)).equals(out)

			const U = $.type({ toString: "number", d: "string = 'd'" })
			const inherited = U.assert(
				Object.defineProperty({}, "toString", { value: 5 })
			)
			attest(inherited.toString).equals(5)
		}
	})

	it("non-enumerable key with failing sibling", () => {
		for (const jitless of [false, true]) {
			const T = scope({}, { jitless }).type({
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

	it("hidden props and accessors", () => {
		for (const jitless of [false, true]) {
			const T = scope({}, { jitless }).type({ a: "string.trim" })
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
			})
		}
	})

	it("array with declared props", () => {
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

	it("array with undeclared props", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
			const s = Symbol("s")
			const original = Object.assign([" a "], {
				extra: 1,
				4294967295: 0,
				[s]: 2
			})
			attest($.type("string.trim[]").assert(original)).equals(
				Object.assign(["a"], { extra: 1, 4294967295: 0, [s]: 2 })
			)
			attest(
				$.type(["string", "string = 'd'"]).assert(
					Object.assign(["a"], { extra: 1 })
				)
			).equals(Object.assign(["a", "d"], { extra: 1 }) as never)
			attest(
				$.type(["string = 'd'"]).assert(Object.assign([], { "-1": 1 }))
			).equals(Object.assign(["d"], { "-1": 1 }) as never)
			attest(
				$.type("(string.trim | undefined)[]").assert(
					Object.assign([], { 1: " a ", 4294967295: 0 })
				)
			).equals(Object.assign([], { 1: "a", 4294967295: 0 }))
			attest(
				$.type("string.trim[]").assert(
					Object.assign([" a ", "b"], {
						constructor: 1,
						[Symbol.isConcatSpreadable]: false
					})
				)
			).equals(
				Object.assign(["a", "b"], {
					constructor: 1,
					[Symbol.isConcatSpreadable]: false
				})
			)
		}
	})

	it("array props with shared defaults", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
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

	it("union of array props with shared defaults", () => {
		const T = type("string[]")
			.and({ a: "number = 5" })
			.or(type("string[]").and({ a: "number = 5", b: "string" }))
		attest(T.expression).snap("{ a: number = 5 } & string[]")
		attest(T.assert(Object.assign(["s"], { b: "x" }))).equals(
			Object.assign(["s"], { b: "x", a: 5 })
		)
	})

	it("non-enumerable key with shared defaults", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
			$.type({ a: "number = 5", b: "string" })
			const T = $.type({
				x: $.type({ a: "number = 5", c: "string" }).pipe((o, ctx) =>
					o.c === "s" ? o : ctx.error("c kept")
				),
				y: "number"
			})
			const out = T({
				x: Object.defineProperty({}, "c", { value: "s" }),
				y: "bad"
			})
			attest(out.toString()).snap("y must be a number (was a string)")
		}
	})

	it("branch morph errors with ctx", () => {
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

	it("piped contextual node", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
			const paths: PropertyKey[][] = []
			const T = $.type({
				password: "string",
				confirm: $.type("string.trim").narrow(
					(s, ctx) => s === (ctx.root as { password: string }).password
				),
				length: $.type("string")
					.pipe(s => s.length)
					.narrow((n, ctx) => {
						paths.push([...ctx.path])
						return n > 0
					})
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

	it("branch predicate reading ctx", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
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

	it("predicate error returning true", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
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

	it("ArkError-shaped morph output", () => {
		const T = type({ payload: "string.json.parse", "n?": "number" })
		const payload = { " arkKind": "errors" }

		attest(T({ payload: JSON.stringify(payload) })).equals({ payload })
		attest(T({ payload: JSON.stringify(payload), n: "1" }).toString()).snap(
			"n must be a number (was a string)"
		)
	})

	it("morph error with other errors", () => {
		const T = type({
			a: ["string", "=>", (s, ctx) => ctx.error("short")],
			b: "number"
		})

		attest(T({ a: "x", b: 1 }).toString()).snap('a must be short (was "x")')
		attest(T({ a: "x", b: "1" }).toString()).snap(
			'b must be a number (was a string)\na must be short (was "x")'
		)
	})

	it("morph errors in aliased branch", () => {
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

	it("skips morphs after failed pipe", () => {
		const calls: string[] = []
		const Inner = type("string").pipe((s, ctx) => {
			calls.push("inner")
			return ctx.error("valid inner")
		})
		const T = type("string").pipe(
			s => {
				calls.push("before")
				return s
			},
			Inner,
			s => {
				calls.push("after")
				return s
			}
		)

		attest(T("x").toString()).snap('must be valid inner (was "x")')
		attest(calls).equals(["before", "inner"])
	})

	it("nested morph errors", () => {
		const Inner = type({ x: "number" })
		const T = type({
			outer: { a: type("object").pipe(o => Inner(o)) },
			other: { b: "number = 5" }
		})

		attest(T({ outer: { a: { x: "no" } }, other: {} }).toString()).snap(
			"outer.a.x must be a number (was a string)"
		)
	})

	it("only taken branch morphs", () => {
		let callCount = 0
		const Negated = type("number < 0")
			.pipe(n => {
				callCount++
				return -n
			})
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
		attest(callCount).equals(0)
	})

	it("discriminated case checked once", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
			let callCount = 0
			const T = $.type([
				"string",
				":",
				s => {
					callCount++
					return s.length > 0
				}
			]).or({
				a: "string.trim"
			})

			attest(T("x")).equals("x")
			attest(callCount).equals(1)
		}
	})

	it("cyclic data", () => {
		let callCount = 0
		const $ = scope({
			node: {
				value: [
					"string",
					"=>",
					s => {
						callCount++
						return s.trim()
					}
				],
				"next?": "node"
			}
		})

		const original: { value: string; next?: unknown } = { value: " a " }
		original.next = original

		const out = $.export().node.assert(original)

		attest(callCount).equals(1)
		attest(out.value).equals("a")
		attest(out.next).is(out)
		attest(original.value).equals(" a ")
	})

	it("cyclic data to class", () => {
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

		const out: Node = $.export().node.assert(original)

		attest(out).instanceOf(Node)
		attest(out.next).is(out)
	})

	it("cyclic primitive per path", () => {
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

	it("pipe to cyclic node", () => {
		const calls: string[] = []
		const $ = scope({
			node: {
				value: [
					"string",
					"=>",
					s => {
						calls.push(s)
						return s
					}
				],
				"next?": "node"
			}
		})
		const T = $.type("node").pipe(o => o, $.type("node"))

		T({ value: "a", next: { value: "b" } })

		attest(calls).equals(["a", "b", "a", "b"])
	})

	describe("undeclared keys", () => {
		it("delete in expression order", () => {
			const T = type({
				"+": "delete",
				z: "string",
				b: "number",
				"a?": "string"
			})

			const original = { z: "z", b: 1 }

			attest(T(original)).equals(original)
			attest(T.expression).snap(
				"{ b: number, z: string, a?: string, + (undeclared): delete }"
			)
			attest(Object.keys(T({ a: "a", z: "z", c: true, b: 1 }))).equals([
				"b",
				"z",
				"a"
			])
		})

		it("inherited Object.prototype key", () => {
			for (const jitless of [false, true]) {
				const T = scope({}, { jitless }).type({
					"+": "delete",
					a: "string",
					"toString?": "unknown"
				})
				attest(Object.keys(T.assert({ a: "a", z: 1 }))).equals(["a"])
				attest(Object.keys(T.assert({ a: "a", toString: 1, z: 1 }))).equals([
					"a",
					"toString"
				])
			}
		})

		it("transformed inherited key", () => {
			for (const jitless of [false, true]) {
				const T = scope({}, { jitless }).type({
					"+": "delete",
					a: "string",
					"toString?": ["unknown", "=>", v => v]
				})
				attest(Object.keys(T.assert({ a: "a", z: 1 }))).equals([
					"a",
					"toString"
				])
			}
		})

		it("deletes symbols", () => {
			for (const jitless of [false, true]) {
				const T = scope({}, { jitless }).type({ "+": "delete", a: "string" })
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
