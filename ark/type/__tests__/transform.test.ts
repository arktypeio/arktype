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
		const $ = scope({})
		const T = $.type({ a: "string.trim" }).and({ "[string]": "string.lower" })
		const anded = T({ a: " AB ", b: " Q " })
		attest(anded).unknown.snap({ a: "ab", b: " q " })
		const Literal = $.type({ a: "string.trim", "[string]": "string.lower" })
		attest(Literal({ a: " AB ", b: " Q " })).equals(anded)

		const U = $.type({ "[string]": "string.trim", "[/^a/]": "string.lower" })
		attest(U({ ab: " X ", b: " Y " })).snap({ ab: "x", b: "Y" })

		const types = scope({
			node: {
				"a?": "node",
				"v?": "string.trim",
				"[/^a/]": $.type({ "v?": "string" }).pipe(o => ({
					...o,
					tagged: true
				}))
			}
		}).export()
		const out = types.node({ v: " x ", a: { v: " y " } })
		attest(out).unknown.snap({
			v: "x",
			a: { v: "y", tagged: true }
		})
	})

	it("discriminates a branch whose prop and index morphs apply in turn", () => {
		const T = type({ a: "string.trim" }).and({ "[string]": "string.lower" })
		const U = type("string").or(T)
		attest(U(" X ")).equals(" X ")
		attest(U({ a: " AB " })).unknown.snap({ a: "ab" })
	})

	it("contextual index on declared key", () => {
		const $ = scope({})
		const Listed = $.type("string").narrow((k, ctx) =>
			(ctx.root as { trimmed: string[] }).trimmed.includes(k)
		)
		const T = $.type({ trimmed: "string[]", a: "string.lower" }).and(
			$.type.Record(Listed, "string.trim")
		)
		const out = T({ trimmed: ["a"], a: " X " })
		attest(out).unknown.snap({ trimmed: ["a"], a: "x" })
	})

	it("index transform of a prop with a default", () => {
		const T = type({
			"p?": ["object", ["string", "=", "d"]],
			"[string]": { "[string]": { x: "string.numeric.parse" } }
		})
		const types = scope({
			a: { "p?": ["object", ["string", "=", "d"]], "[string]": "a" }
		}).export()

		const out = T({ p: [{ x: "1" }] })
		const cyclicOut = types.a({ p: [{}] })
		attest(out).unknown.equals({ p: [{ x: 1 }, "d"] })
		attest(cyclicOut).unknown.equals({ p: [{}, "d"] })
	})

	it("index transform deleting an inherited key name", () => {
		const T = type({
			"p?": ["object", ["string", "=", "d"]],
			"[string]": { "+": "delete", "[/^\\d+$/]": "object" }
		})
		const out = T.assert({ p: Object.assign([{}], { toString: 1 }) })
		attest(Object.keys(out.p as object)).equals(["0", "1"])
	})

	it("failed key transform", () => {
		const $ = scope({})
		const A = $.type("string").pipe((s, ctx) => ctx.error("A"))
		const B = $.type("string").pipe((s, ctx) => ctx.error("B"))

		const T = $.type({ "[string]": A, "[/^a/]": B })
		attest(T({ ab: "x", b: "y" }).toString()).snap(`ab must be A (was "x")
b must be A (was "y")`)

		const U = $.type({ a: A }).and({ "[string]": B })
		attest(U({ a: "x" }).toString()).snap('a must be A (was "x")')
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

	it("transforms a builtin in place", () => {
		const T = type(["Date", "&", { b: "number = 1" }])
		const original = new Date(5)
		attest(T(original)).unknown.is(original)
		attest(Object.entries(original)).equals([["b", 1]])
	})

	it("transforms an object with its own toString tag in place", () => {
		class PlainDate {
			a = " x "
			get [Symbol.toStringTag]() {
				return "Temporal.PlainDate"
			}
		}
		const T = type([type.instanceOf(PlainDate), "&", { a: "string.trim" }])
		const original = new PlainDate()
		attest(T.assert(original)).is(original)
		attest(original.a).equals("x")
	})

	it("throws transforming a frozen builtin", () => {
		const T = type(["Date", "&", { "a?": "string.trim" }])
		const original = Object.freeze(Object.assign(new Date(5), { a: " x " }))
		attest(() => T(original)).throws("Cannot assign to read only property 'a'")
	})

	it("non-enumerable declared key", () => {
		const $ = scope({})
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
	})

	it("non-enumerable declared key with defaults", () => {
		const $ = scope({})
		const One = $.type({ e: "string", d: "string = 'd'" })
		const Two = $.type({ e: "string", d: "string = 'd'", f: "number = 1" })
		const hidden = (o: object) => Object.defineProperty(o, "e", { value: "e" })
		// a Type's first call runs uncompiled, its second compiled
		for (let i = 0; i < 2; i++) {
			attest(Object.entries(One.assert(hidden({})))).equals([
				["d", "d"],
				["e", "e"]
			])
			attest(Object.entries(Two.assert(hidden({})))).equals([
				["d", "d"],
				["f", 1],
				["e", "e"]
			])
			attest(Object.entries(Two.assert(hidden({ f: 2 })))).equals([
				["f", 2],
				["d", "d"],
				["e", "e"]
			])
		}
	})

	it("keeps each change after the first site copies", () => {
		const T = type({ a: "string.trim", b: "string.trim", c: "number = 1" })
		// a Type's first call runs uncompiled, its second compiled
		for (let i = 0; i < 2; i++) {
			attest(T.assert({ a: " a ", b: " b " })).equals({ a: "a", b: "b", c: 1 })
			attest(T.assert({ a: "a", b: " b " })).equals({ a: "a", b: "b", c: 1 })
		}
	})

	it("non-enumerable transformed key", () => {
		const T = type({ e: "string", t: "string.trim" })
		const hidden = { e: { value: "e" }, t: { value: " t" } }
		// a Type's first call runs uncompiled, its second compiled
		for (let i = 0; i < 2; i++) {
			const out = T.assert(Object.defineProperties({}, hidden))
			attest(Object.entries(out)).equals([
				["t", "t"],
				["e", "e"]
			])
		}
	})

	it("non-enumerable key with failing sibling", () => {
		const T = type({
			a: "string.trim",
			c: { d: "string.date.parse" },
			b: "string"
		})
		const original = Object.defineProperties(
			{ b: 1 },
			{ a: { value: " a " }, c: { value: { d: "2020-01-01" } } }
		)
		attest(T(original).toString()).snap("b must be a string (was a number)")
	})

	it("hidden props and accessors", () => {
		const T = type({ a: "string.trim" })
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
		const $ = scope({})
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
			$.type("string.trim[]").assert(Object.assign([" a "], { slice: 1 }))
		).equals(Object.assign(["a"], { slice: 1 }))
	})

	it("array props with shared defaults", () => {
		const $ = scope({})
		const T = $.type({
			x: $.type({ a: "number = 5", b: "string" })
				.and("string[]")
				.pipe((arr, ctx) => (arr.b === "kept" ? arr : ctx.error("kept"))),
			y: "number"
		})
		const out = T({ x: Object.assign(["s"], { b: "kept" }), y: "bad" })
		attest(out.toString()).snap("y must be a number (was a string)")
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
		const $ = scope({})
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
	})

	it("branch morph errors with ctx", () => {
		const N = type("number")
		const types = scope({
			parsed: ["string", "=>", s => N(s)],
			signed: ["number", "=>", (n, ctx) => (n < 0 ? ctx.error("signed") : n)],
			tree: { "child?": "tree" },
			contextual: "parsed | signed",
			cyclic: { a: "parsed | tree" }
		}).export()

		attest(types.contextual("x").toString()).snap(
			"must be a number (was a string)"
		)
		attest(types.contextual.array()(["x"]).toString()).snap(
			"value at [0] must be a number (was a string)"
		)
		attest(types.cyclic({ a: "x" }).toString()).snap(
			"a must be a number (was a string)"
		)
	})

	it("piped contextual node", () => {
		const $ = scope({})
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
	})

	it("branch predicate reading ctx", () => {
		const $ = scope({})
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
	})

	it("branch predicate reading data after a contextual morph", () => {
		const $ = scope({})
		const Long = $.type(["string > 5", ":", (s, ctx) => ctx.data === s]).pipe(
			s => s.length
		)
		const T = $.type({
			k: $.type("string").pipe((s, ctx) => s.trim()),
			v: Long.or("string < 3")
		})

		attest(T({ k: " k ", v: "abcdefg" })).equals({ k: "k", v: 7 })
	})

	it("predicate error returning true", () => {
		const $ = scope({})
		const Positive = $.type("number").narrow((n, ctx) => {
			if (n <= 0) ctx.error("positive")
			return true
		})
		const T = $.type({ n: Positive, s: "string.trim" })

		attest(T({ n: -1, s: " x " }).toString()).snap(
			"n must be positive (was -1)"
		)
		attest(Positive.allows(-1)).equals(false)
	})

	it("ArkError-shaped morph output", () => {
		const T = type({ payload: "string.json.parse", "n?": "number" })
		const payload = { " arkKind": "errors" }

		attest(T({ payload: JSON.stringify(payload) })).equals({ payload })
		attest(T({ payload: JSON.stringify(payload), n: "1" }).toString()).snap(
			"n must be a number (was a string)"
		)
	})

	it("function morph output", () => {
		const F = type("string").pipe(s => () => s)
		const T = type({ f: F }).array()
		// a Type's first call runs uncompiled, its second compiled
		for (let i = 0; i < 2; i++) {
			attest(T.assert([{ f: "a" }])[0].f()).equals("a")
			attest(F.assert("b")()).equals("b")
		}
	})

	it("root morph returning its function input", () => {
		let reads = 0
		const f = new Proxy(() => {}, {
			getPrototypeOf: target => {
				reads++
				return Reflect.getPrototypeOf(target)
			}
		})
		const T = type("unknown").pipe(x => x)
		for (let i = 0; i < 2; i++) {
			reads = 0
			attest(T(f) === f).equals(true)
			attest(reads).equals(1)
		}
	})

	it("morph error with other errors", () => {
		const T = type({
			a: ["string", "=>", (s, ctx) => ctx.error("short")],
			b: "number"
		})

		attest(T({ a: "x", b: 1 }).toString()).snap('a must be short (was "x")')
		attest(T({ a: "x", b: "1" }).toString()).snap(
			'a must be short (was "x")\nb must be a number (was a string)'
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
			'v must be short (was "a")\nnext.v must be short (was "b")\nz must be a number (was a string)'
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
		const $ = scope({})
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

	describe("failed calls", () => {
		it("transform valid keys in traversal order", () => {
			const $ = scope({})
			const counts: number[] = []
			const T = $.type({
				a: "number",
				b: $.type("string").pipe((s, ctx) => {
					counts.push(ctx.errors.count)
					return ctx.error("short")
				}),
				c: "number"
			})

			attest(T({ a: "x", b: "b", c: "y" }).toString())
				.snap(`a must be a number (was a string)
b must be short (was "b")
c must be a number (was a string)`)
			attest(counts).equals([1])
		})

		it("transform nothing a branch or pipe only checks", () => {
			const $ = scope({})
			const calls: string[] = []
			const Logged = $.type("string").pipe(s => {
				calls.push(s)
				return s
			})
			const T = $.type({
				u: $.type({ a: Logged, n: "number > 0" }).or({
					b: Logged,
					n: "number < 0"
				}),
				p: $.type("string").pipe(
					s => JSON.parse(s),
					$.type({ c: Logged, n: "number" })
				),
				k: "number"
			})

			attest(
				T({
					u: { a: "a", b: "b", n: 0 },
					p: '{"c":"c","n":"x"}',
					k: "x"
				}).toString()
			).snap(`u.n must be positive or negative (was 0)
p.n must be a number (was a string)
k must be a number (was a string)`)
			attest(calls).equals([])
		})

		it("transform a structure after its predicates pass", () => {
			const $ = scope({})
			const calls: string[] = []
			const T = $.type({
				o: $.type({
					a: $.type("string").pipe(s => {
						calls.push(s)
						return s
					}),
					n: "number"
				}).and($.type("object").narrow(o => (o as { n: number }).n > 0)),
				k: "number"
			})

			attest(T({ o: { a: "a", n: 0 }, k: "x" }).toString())
				.snap(`o must be valid according to an anonymous predicate (was an object)
k must be a number (was a string)`)
			attest(calls).equals([])
			attest(T({ o: { a: "a", n: "x" }, k: "x" }).toString())
				.snap(`o.n must be a number (was a string)
k must be a number (was a string)`)
			attest(calls).equals(["a"])
		})

		it("transform a key once each constraint allows it", () => {
			const $ = scope({})
			const calls: string[] = []
			const T = $.type({
				"[string]": $.type("string").pipe(s => {
					calls.push(s)
					return s
				}),
				"[/^x/]": "string < 3"
			})

			attest(T({ xa: "long", b: "b" }).toString()).snap(
				"xa must be at most length 2 (was 4)"
			)
			attest(calls).equals(["b"])
		})

		it("apply a valid nested object's defaults", () => {
			let calls = 0
			const T = type({
				a: "number",
				o: { d: ["string", "=", () => `${++calls}`] }
			})

			attest(T({ a: "x", o: {} }).toString()).snap(
				"a must be a number (was a string)"
			)
			attest(calls).equals(1)
		})
	})

	describe("undeclared keys", () => {
		it("delete in declaration order", () => {
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
				"z",
				"b",
				"a"
			])
		})

		it("inherited Object.prototype key", () => {
			const T = type({
				"+": "delete",
				a: "string",
				"toString?": "unknown"
			})
			attest(Object.keys(T.assert({ a: "a", z: 1 }))).equals(["a"])
			attest(Object.keys(T.assert({ a: "a", toString: 1, z: 1 }))).equals([
				"a",
				"toString"
			])
		})

		it("transformed inherited key", () => {
			const T = type({
				"+": "delete",
				a: "string",
				"toString?": ["unknown", "=>", v => v]
			})
			attest(Object.keys(T.assert({ a: "a", z: 1 }))).equals(["a", "toString"])
		})

		it("deletes an array's keys past its indices", () => {
			const T = type("(string | undefined)[]").onUndeclaredKey("delete")
			const indexed = ["a"]
			attest(T(indexed)).is(indexed)
			const holey = new Array(2).fill("a", 1)
			attest(T(holey)).is(holey)
			const hidden = Object.defineProperty(["a"], "hidden", { value: 1 })
			attest(T(hidden)).is(hidden)
			const extra = Object.assign(new Array(2).fill("a", 1), {
				extra: 1,
				[Symbol("s")]: 2
			})
			attest(Reflect.ownKeys(T(extra))).equals(["1", "length"])
		})

		it("copies an array whose elements change by slice", () => {
			const T = type("(string.trim | undefined)[]").onUndeclaredKey("delete")
			let constructed = 0
			class Tags extends Array {
				constructor(...args: any[]) {
					super(...args)
					constructed++
				}
			}
			const tags = Tags.from([" a ", "b"])
			constructed = 0
			const copied = T.assert(tags)
			attest(copied instanceof Tags).equals(true)
			attest(constructed).equals(1)
			attest([...copied]).equals(["a", "b"])
			const sparse = new Array(3)
			sparse[0] = " a "
			sparse[2] = "b"
			const sliced = T.assert(sparse)
			attest(1 in sliced).equals(false)
			attest(sliced.length).equals(3)
			let reads = 0
			const read = Object.defineProperty([" a "], "extra", {
				get: () => reads++,
				enumerable: true
			})
			attest(Reflect.ownKeys(T.assert(read))).equals(["0", "length"])
			attest(reads).equals(0)
		})

		it("copies the keys besides its indices an array declares in its order", () => {
			const T = type("string.trim[]")
				.and({ a: "string", "b?": "string" })
				.onUndeclaredKey("delete")
			const out = T.assert(Object.assign([" x "], { b: "2", z: 0, a: "1" }))
			attest([...out]).equals(["x"])
			attest(Object.keys(out)).equals(["0", "b", "a"])
		})

		// https://discord.com/channels/957797212103016458/1116551844710330458
		it("deletes them from a copy of process.env, an exotic object", () => {
			const Env = type({
				"+": "delete",
				TZ: "'America/New_York'"
			})

			const originalEnv = { ...process.env }

			const vars = Env(process.env)

			attest(vars).snap({ TZ: "America/New_York" })
			// equals can't compare process.env itself, so it's spread
			attest({ ...process.env }).equals(originalEnv)
		})
	})
})
