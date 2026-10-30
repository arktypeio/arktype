import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"
import { writeInvalidUndeclaredBehaviorMessage } from "arktype/internal/parser/objectLiteral.ts"

contextualize(() => {
	it("can parse an undeclared restriction", () => {
		const T = type({ "+": "reject" })
		attest<{}>(T.infer)
		attest(T.json).snap({ undeclared: "reject", domain: "object" })
	})

	it("fails on type definition for undeclared", () => {
		// @ts-expect-error
		attest(() => type({ "+": "string" }))
			.throws(writeInvalidUndeclaredBehaviorMessage("string"))
			.type.errors.snap(
				"Type '\"string\"' is not assignable to type 'UndeclaredKeyBehavior'."
			)
	})

	it("can escape undeclared meta key", () => {
		const T = type({ "\\+": "string" })
		attest<{ "+": string }>(T.infer)
		attest(T.json).snap({
			required: [{ key: "+", value: "string" }],
			domain: "object"
		})
	})

	it("merges a narrowed index signature with a declared key", () => {
		const L = type({ a: "number", "[string]": "number" })
		const R = type({ a: "number", b: "number", "+": "reject" })
		attest(L.and(R).expression).snap(
			"{ a: number, b: number, + (undeclared): reject }"
		)
		attest(R.and(L).expression).equals(L.and(R).expression)
	})

	it("an intersection that leaves no props keeps undeclared keys", () => {
		const Rejected = type({ "a?": "1", "+": "reject" }).and({
			"b?": "2",
			"+": "reject"
		})
		attest(Rejected.json).snap({ undeclared: "reject", domain: "object" })
		attest(Rejected({ z: 1 }).toString()).snap("z must be removed")
		const Deleted = type({ "+": "delete" }).and({})
		attest(Deleted({ k: 0 })).equals({})
	})

	it("names the undeclared key an intersection can't add", () => {
		attest(() => type({ "+": "delete", id: "number" }).and({ token: "string" }))
			.throws
			.snap(`ParseError: Intersection at token of never and string results in an unsatisfiable type
token is undeclared on a side that deletes undeclared keys.
To add it, use .merge(), which takes "+" from the merged object.`)
		attest(() =>
			type({ a: { "+": "reject", id: "number" } }).and({
				a: { token: "string" }
			})
		).throws
			.snap(`ParseError: Intersection at a.token of never and string results in an unsatisfiable type
a.token is undeclared on a side that rejects undeclared keys.`)
		const Merged = type({ "+": "delete", id: "number" }).merge({
			"+": "delete",
			token: "string"
		})
		attest(Merged({ id: 1, token: "t", z: 1 })).equals({ id: 1, token: "t" })
	})

	it("an array meeting a closed object has elements only at keys it declares", () => {
		const T = type({ "0?": "number", "+": "reject" }).and("number[]")
		attest(T.json).snap({
			undeclared: "reject",
			optional: [{ key: "0", value: "number" }],
			sequence: "number",
			proto: "Array",
			maxLength: 1
		})
		attest(T([0])).equals([0])
		attest(T([0, 1]).toString()).snap("must be at most length 1 (was 2)")
		const Empty = type({ "+": "reject" }).and("number[]")
		attest(Empty.json).snap({
			undeclared: "reject",
			sequence: [],
			proto: "Array"
		})
		attest(Empty([])).equals([])
		attest(Empty.allows([0])).equals(false)
		attest(() => type({ "+": "reject" }).and(["number"])).throws.snap(
			"ParseError: Intersection at [0] of never and number results in an unsatisfiable type"
		)
	})

	it("a closed array declares its indices to an intersection", () => {
		const Closed = type("string[]").onUndeclaredKey("reject")
		attest(Closed.and({ "0?": "number" }).allows(["x"])).equals(false)
		attest(Closed.and({ "[string]": "number" }).allows(["x"])).equals(false)
		attest(Closed.and({ "0": "string" }).json).snap({
			undeclared: "reject",
			required: [{ key: "0", value: "string" }],
			sequence: "string",
			proto: "Array"
		})
	})

	it("an open object isn't a subtype of a closed one", () => {
		const Closed = type({ "+": "reject" })
		attest(type({}).extends(Closed)).equals(false)
		attest(Closed.extends({})).equals(true)
		attest(Closed.or({}).json).snap({ domain: "object" })
	})

	describe("traversal", () => {
		const getExtraneousB = () => ({ a: "ok", b: "why?" })

		it("loose by default", () => {
			const T = type({
				a: "string"
			})

			attest(T.json).equals(T.onUndeclaredKey("ignore").json)

			const dataWithExtraneousB = getExtraneousB()
			attest(T(dataWithExtraneousB)).equals(dataWithExtraneousB)
		})

		it("delete keys", () => {
			const T = type({
				a: "string"
			}).onUndeclaredKey("delete")
			attest(T({ a: "ok" })).equals({ a: "ok" })
			attest(T(getExtraneousB())).snap({ a: "ok" })
		})

		it("delete keys keeping a prototype", () => {
			class Tagged {
				tag = "a"
				extra = 1
			}
			const T = type({ "+": "delete", tag: "string" })

			const tagged = T.assert(new Tagged())
			attest(tagged instanceof Tagged).equals(true)
			attest({ ...tagged }).snap({ tag: "a" })

			const nullProto = T.assert(
				Object.assign(Object.create(null), { tag: "a", extra: 1 })
			)
			attest(Object.getPrototypeOf(nullProto)).equals(null)
			attest({ ...nullProto }).snap({ tag: "a" })
		})

		it("compiled code fills a copy from a literal of nulls", () => {
			const T = type({
				b: "number",
				a: "number",
				"c?": "number"
			}).onUndeclaredKey("delete")
			attest(T({ b: 0.5, a: 1, c: 2, d: 3 })).snap({ a: 1, b: 0.5, c: 2 })
			// the lines writing the copy, matched without visiting the rest, which
			// omits nodes an earlier Type compiled
			attest(
				T.precompilation!.match(/^[\t ]*(const )?result\b.*$/gm)!.map(line =>
					line.trim()
				)
			).snap([
				'const result = { "b": null, "a": null }',
				"result.b = out.b",
				"result.a = out.a",
				"result.c = out.c"
			])
		})

		it("applies shallowly", () => {
			const T = type({
				a: "string",
				nested: {
					a: "string"
				}
			}).onUndeclaredKey("delete")

			attest(
				T({
					...getExtraneousB(),
					nested: getExtraneousB()
				})
			).equals({ a: "ok", nested: { a: "ok", b: "why?" } as never })
		})

		it("can apply deeply", () => {
			const T = type({
				a: "string",
				nested: {
					a: "string"
				}
			}).onDeepUndeclaredKey("delete")

			attest(T.expression).snap(
				"{ a: string, nested: { a: string, + (undeclared): delete }, + (undeclared): delete }"
			)

			attest(
				T({
					...getExtraneousB(),
					nested: getExtraneousB()
				})
			).equals({ a: "ok", nested: { a: "ok" } })
		})

		it("can apply deeply through a tuple default", () => {
			const T = type({
				d: [{ a: "string" }, "number = 2"]
			}).onDeepUndeclaredKey("delete")

			attest(T.expression).snap(
				"{ d: [{ a: string, + (undeclared): delete }, number = 2], + (undeclared): delete }"
			)
			attest(T({ ...getExtraneousB(), d: [getExtraneousB()] })).equals({
				d: [{ a: "ok" }, 2]
			})
		})

		it("delete union key", () => {
			const O = type([
				{ a: "string" },
				"|",
				{ a: "boolean", b: "true" }
			]).onUndeclaredKey("delete")
			// can distill to first branch
			attest(O({ a: "to", z: "bra" })).snap({ a: "to" })
			// can distill to second branch
			attest(O({ a: true, b: true, c: false })).snap({ a: true, b: true })
			// can handle missing keys
			attest(O({ a: true }).toString()).snap(
				"a must be a string (was boolean) or b must be true (was missing)"
			)
		})

		it("fails on delete indiscriminable union key", () => {
			attest(() =>
				type([{ a: "string" }, "|", { b: "boolean" }]).onUndeclaredKey("delete")
			).throws
				.snap(`ParseError: An unordered union of a type including a morph and a type with overlapping input is indeterminate:
Left: { a: string, + (undeclared): delete }
Right: { b: boolean, + (undeclared): delete }
Make their inputs disjoint, e.g. by narrowing the morph's input, or pipe the union of their inputs to a single morph.`)
		})

		it("reject key", () => {
			const T = type({
				a: "string"
			}).onUndeclaredKey("reject")
			attest(T({ a: "ok" })).equals({ a: "ok" })
			attest(T(getExtraneousB()).toString()).snap("b must be removed")
		})

		it("rejected keys have their own code and their values", () => {
			const T = type({ "+": "reject", a: "string" })
			const errors = T({ a: "ok", b: 1, c: 2 }) as type.errors
			attest(errors.summary).snap(`b must be removed
c must be removed`)
			attest(errors.issues.map(e => e.data)).equals([1, 2])
			attest(errors.toJSON()[0]).snap({
				data: 1,
				path: ["b"],
				code: "undeclared",
				meta: {},
				propString: "b",
				expected: "removed",
				actual: "",
				problem: "must be removed",
				message: "b must be removed"
			})
		})

		it("rejected key beside another failure at its path", () => {
			const $ = scope({})
			const T = $.type.schema({
				branches: [
					$.type({ "+": "reject", a: "string" }).internal,
					$.type({ a: "string", b: "number" }).internal
				],
				ordered: true
			} as never)
			attest((T({ a: "x", b: "y" }) as type.errors).summary).snap(
				'b must be removed or a number (was "y")'
			)
		})

		it("configured text reaches a rejected key", () => {
			const Configured = scope(
				{},
				{ undeclared: { problem: "isn't allowed" } }
			).type({ "+": "reject", a: "string" })
			attest(Configured({ a: "ok", b: 1 }).toString()).snap("b isn't allowed")
		})

		it("structure meta reaches a rejected key", () => {
			const T = type({ "+": "reject", a: "string" }).configure(
				{ expected: "declared", actual: data => `<${data}>` },
				{ kind: "structure" }
			)
			attest(T({ a: "ok", b: 1 }).toString()).snap(
				"b must be declared (was <1>)"
			)
		})

		it("reject allows undeclared symbol keys", () => {
			const undeclared = Symbol("undeclared")
			const data = { a: "ok", x: 1, [undeclared]: 1 }
			const $ = scope({})
			const T = $.type({ "+": "reject", a: "string", x: "number" })
			attest(T(data)).equals(data)
			const Indexed = $.type({
				"+": "reject",
				a: "string",
				"[/^x/]": "number"
			})
			attest(Indexed(data)).equals(data)
			attest(Indexed({ ...data, b: 1 }).toString()).snap("b must be removed")
			attest(
				type({ "+": "reject", a: "string" }).and({ "[symbol]": "string" })
					.expression
			).snap("{ [symbol]: string, a: string, + (undeclared): reject }")
		})

		it("delete drops undeclared symbol keys", () => {
			const declared = Symbol("declared")
			const undeclared = Symbol("undeclared")
			const T = type({ "+": "delete", a: "string", [declared]: "number" })
			const out = T({ a: "ok", [declared]: 1, [undeclared]: 2 }) as object
			attest(Object.getOwnPropertySymbols(out)).equals([declared])
		})

		it("reject reads only own enumerable keys", () => {
			const T = type({ "+": "reject", a: "string" })
			// the first data is checked uncompiled
			attest(T.allows({ a: "x" })).equals(true)
			const inheritsB = Object.assign(Object.create({ b: 1 }), { a: "x" })
			attest(T.allows(inheritsB)).equals(true)
			const inheritsA = Object.assign(Object.create({ a: "x" }), { b: 1 })
			attest(T.allows(inheritsA)).equals(false)
			attest(T(inheritsA).toString()).snap("b must be removed")
			const hidesB = Object.defineProperty({ a: "x" }, "b", { value: 1 })
			attest(T.allows(hidesB)).equals(true)
			const hidesA = Object.defineProperty({ b: 1 }, "a", { value: "x" })
			attest(T(hidesA).toString()).snap("b must be removed")
			const unprototyped = Object.assign(Object.create(null), { a: "x", b: 1 })
			attest(T(unprototyped).toString()).snap("b must be removed")
			const listsB = new Proxy(
				{ a: "x" },
				{
					ownKeys: target => [...Reflect.ownKeys(target), "b"],
					getOwnPropertyDescriptor: (target, k) =>
						k === "b" ?
							{ value: 1, enumerable: true, configurable: true }
						:	Reflect.getOwnPropertyDescriptor(target, k)
				}
			)
			attest(T.allows(listsB)).equals(false)
		})

		it("reject array key", () => {
			const O = type({ "+": "reject", a: "string[]" })
			attest(O({ a: ["shawn"] })).snap({ a: ["shawn"] })
			attest(O({ a: [2] }).toString()).snap(
				"a[0] must be a string (was a number)"
			)
			attest(O({ b: ["shawn"] }).toString())
				.snap(`a must be an array (was missing)
b must be removed`)
		})

		it("declares an array's indices through the greatest", () => {
			const Rejected = type("string[]").onUndeclaredKey("reject")
			const Deleted = type("string[]").onUndeclaredKey("delete")
			// an array holding index 4294967294 is 4294967295 long, too long to check, so a Proxy lists the key on a short one
			const listing = (key: string) =>
				new Proxy(["a"], {
					ownKeys: target => [...Reflect.ownKeys(target), key],
					getOwnPropertyDescriptor: (target, k) =>
						k === key ?
							{ value: "b", enumerable: true, configurable: true }
						:	Reflect.getOwnPropertyDescriptor(target, k)
				})
			const greatest = listing("4294967294")
			attest(Rejected.allows(greatest)).equals(true)
			attest(Rejected(greatest)).equals(greatest)
			attest(Object.keys(Deleted(greatest))).equals(["0", "4294967294"])
			const past = listing("4294967295")
			attest(Rejected.allows(past)).equals(false)
			attest(Rejected(past).toString()).snap(
				'value at ["4294967295"] must be removed'
			)
			attest(Deleted(past)).equals(["a"])
			const named = Object.assign(["a"], { 4294967295: "b" })
			attest(Rejected(named).toString()).snap(
				'value at ["4294967295"] must be removed'
			)
			attest(Deleted(named)).equals(["a"])
		})

		it("doesn't declare keys Object.prototype has", () => {
			const Deleted = type({ "+": "delete", a: "string", "b?": "number" })
			attest(Deleted({ a: "x", toString: 1, constructor: 2, z: 3 })).snap({
				a: "x"
			})

			const Rejected = type({ "+": "reject", a: "string" })
			attest(Rejected({ a: "x", toString: 1 }).toString()).snap(
				"toString must be removed"
			)
		})

		it("declares a __proto__ key", () => {
			const T = type({ ["__proto__"]: "string", "+": "reject" })
			const data = JSON.parse('{"__proto__":"x"}')
			attest(T(data)).equals(data)
			attest(T.get("__proto__").expression).snap("string")
			attest(T.or({ k: "1", "+": "reject" }).expression).snap(
				"{ __proto__: string, + (undeclared): reject } | { k: 1, + (undeclared): reject }"
			)
		})

		it("delete keeps declared __proto__", () => {
			const T = type({
				["__proto__?"]: "object",
				"+": "delete"
			})
			const out = T.assert(JSON.parse('{"__proto__":{"x":1},"z":2}'))
			attest(Object.keys(out)).equals(["__proto__"])
			attest(Object.getPrototypeOf(out)).is(Object.prototype)
		})

		it("reject key from union", () => {
			const O = type([{ a: "string" }, "|", { b: "boolean" }]).onUndeclaredKey(
				"reject"
			)
			attest(O({ a: 2, b: true }).toString()).snap(
				"a must be a string or removed (was 2)"
			)
		})
	})

	describe("keys named after Object.prototype members", () => {
		const getPrototypeNamedKeys = () => ({
			kept: "ok",
			toString: 1,
			valueOf: 1,
			constructor: 1,
			hasOwnProperty: 1
		})

		// JSON.parse creates an own "__proto__" key rather than setting the prototype
		const getOwnProtoKey = () => JSON.parse(`{ "kept": "ok", "__proto__": 1 }`)

		const testUndeclared = (jitless: boolean) => {
			const types = scope(
				{
					Deleted: { "+": "delete", kept: "string" },
					Rejected: { "+": "reject", kept: "string" }
				},
				{ jitless }
			).export()

			attest(types.Deleted.precompilation === undefined).equals(jitless)

			attest(types.Deleted(getPrototypeNamedKeys())).equals({ kept: "ok" })
			attest(Object.keys(types.Deleted(getOwnProtoKey()))).equals(["kept"])

			attest(types.Rejected(getPrototypeNamedKeys()).toString())
				.snap(`toString must be removed
valueOf must be removed
constructor must be removed
hasOwnProperty must be removed`)
			attest(types.Rejected(getOwnProtoKey()).toString()).snap(
				"__proto__ must be removed"
			)
		}

		it("are undeclared", () => testUndeclared(false))

		it("are undeclared jitless", () => testUndeclared(true))

		const testDeclared = (jitless: boolean) => {
			const types = scope(
				{
					Deleted: {
						"+": "delete",
						a: "string",
						toString: "number",
						["__proto__"]: "number"
					},
					Rejected: {
						"+": "reject",
						a: "string",
						toString: "number",
						["__proto__"]: "number"
					}
				},
				{ jitless }
			).export()

			const getDeclared = () =>
				JSON.parse(`{ "a": "ok", "toString": 1, "__proto__": 1, "b": 1 }`)

			attest(Object.keys(types.Deleted(getDeclared()))).equals([
				"a",
				"toString",
				"__proto__"
			])
			// toString is declared as a number, so stringify the errors directly
			attest(String(types.Rejected(getDeclared()))).snap("b must be removed")
		}

		it("can be declared", () => testDeclared(false))

		it("can be declared jitless", () => testDeclared(true))
	})
})
