import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"
import { writeInvalidUndeclaredBehaviorMessage } from "arktype/internal/parser/objectLiteral.ts"

contextualize(() => {
	it("can parse an undeclared restriction", () => {
		const T = type({ "+": "reject" })
		// an object, as {} would be any value but null or undefined
		attest(T.infer).type.toString.snap("object")
		attest(T.json).snap({ undeclared: "reject", domain: "object" })
		// @ts-expect-error
		attest(() => T.from(5))
			.throws("must be an object")
			.type.errors("not assignable to parameter of type 'object'")
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
		attest(T([0, 1]).toString()).snap("must be at most length 1")
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

	it("closed tuples that meet at more than one length keep their elements", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
			const Leading = $.type(["0", "...", "number[]"]).onUndeclaredKey("reject")
			// a 0 that's both first and last, or one of each
			const T = Leading.and(["...", "number[]", "0"])
			attest(T.expression).equals("[0, ...number[], 0] | [0]")
			attest(Leading.overlaps(["...", "number[]", "0"])).equals(true)
			// the first data is checked uncompiled
			attest(T([0])).equals([0] as never)
			attest(T([0])).equals([0] as never)
			attest(T([0, 1, 0])).equals([0, 1, 0])
			attest(T([0, 1]).toString()).equals(
				"[1] must be 0 or must be exactly length 1"
			)
			// each length still rejects a key that isn't an element's
			attest(T(Object.assign([0], { extra: 1 })).toString()).equals(
				"must be at least length 2 or extra must be removed"
			)
			// and holds a prop both declare
			const WithProp = $.type({ a: "string" })
				.and(["0", "...", "number[]"])
				.onUndeclaredKey("reject")
				.and({ a: "'a'" })
				.and(["...", "number[]", "0"])
			attest(WithProp.expression).equals(
				'{ a: "a", + (undeclared): reject } & [0, ...number[], 0] | { a: "a", + (undeclared): reject } & [0]'
			)
			attest(WithProp.allows(Object.assign([0], { a: "a" }))).equals(true)
			attest(WithProp.allows(Object.assign([0], { a: "b" }))).equals(false)

			// arrays that meet only empty hold no element to declare
			attest(
				$.type("string[]").onUndeclaredKey("reject").and("number[]").json
			).equals({ undeclared: "reject", proto: "Array", exactLength: 0 })
		}
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
				"a must be a string or b must be true"
			)
		})

		// https://github.com/arktypeio/arktype/issues/1752
		describe("delete in a union of overlapping objects", () => {
			const testKept = (jitless: boolean) => {
				const $ = scope({}, { jitless })
				const Contents = $.type({
					"+": "delete",
					uri: "string",
					"text?": "string"
				}).or({ "+": "delete", uri: "string", "blob?": "string" })
				// the first data is checked uncompiled
				attest(Contents({ uri: "a" })).equals({ uri: "a" })
				attest(Contents.precompilation === undefined).equals(jitless)
				attest(Contents({ uri: "a" })).equals({ uri: "a" })
				attest(Contents({ uri: "a", text: "t" })).equals({
					uri: "a",
					text: "t"
				})
				attest(Contents({ uri: "a", blob: "b" })).equals({
					uri: "a",
					blob: "b"
				})
				attest(Contents({ uri: "a", text: "t", blob: "b" })).equals({
					uri: "a",
					text: "t",
					blob: "b"
				})
				// only the branch that doesn't declare text allows it
				attest(Contents({ uri: "a", text: 1, blob: "b" })).equals({
					uri: "a",
					blob: "b"
				})
				attest(Contents({ uri: "a", z: 1 })).equals({ uri: "a" })
				attest(Contents({ uri: 1, text: "t" }).toString()).snap(
					"uri must be a string"
				)
			}

			it("keeps each key a branch allowing the data declares", () =>
				testKept(false))

			it("keeps each key a branch allowing the data declares jitless", () =>
				testKept(true))

			it("is the same union in either order", () => {
				const Text = type({ "+": "delete", uri: "string", "text?": "string" })
				const Blob = type({ "+": "delete", uri: "string", "blob?": "string" })
				attest(Text.or(Blob).json).equals(Blob.or(Text).json)
				attest(Text.or(Blob).expression).snap(
					"{ uri: string, blob?: string, + (undeclared): delete } | { uri: string, text?: string, + (undeclared): delete }"
				)
			})

			it("keeps what any of three branches declares", () => {
				for (const jitless of [false, true]) {
					const $ = scope({}, { jitless })
					const T = $.type({ "+": "delete", a: "string" })
						.or({ "+": "delete", "b?": "number" })
						.or({ "+": "delete", a: "string", "c?": "boolean" })
					const all = () => ({ a: "x", b: 1, c: true, z: 0 })
					attest(T(all())).equals({ a: "x", b: 1, c: true })
					attest(T(all())).equals({ a: "x", b: 1, c: true })
					attest(T({ a: "x", b: "1", c: true })).equals({ a: "x", c: true })
					attest(T({ a: 1, b: 1, c: true })).equals({ b: 1 })
				}
			})

			it("applies at a key, in an array and to nested objects", () => {
				for (const jitless of [false, true]) {
					const $ = scope({}, { jitless })
					const Either = $.type({ "+": "delete", "x?": "1" }).or({
						"+": "delete",
						"y?": "2"
					})
					const Held = $.type({
						"+": "delete",
						at: Either,
						each: Either.array()
					})
					const held = () => ({
						at: { x: 1, y: 2, z: 3 },
						each: [
							{ x: 1, y: 2, z: 3 },
							{ x: 0, y: 2 }
						],
						z: 3
					})
					for (const data of [held(), held()]) {
						attest(Held(data)).equals({
							at: { x: 1, y: 2 },
							each: [{ x: 1, y: 2 }, { y: 2 }]
						})
					}

					const Nested = $.type({
						"+": "delete",
						a: { "+": "delete", "x?": "1" }
					}).or({ "+": "delete", a: { "+": "delete", "y?": "2" }, "b?": "1" })
					const nested = () => ({ a: { x: 1, y: 2, z: 3 }, b: 1, z: 3 })
					attest(Nested(nested())).equals({ a: { x: 1, y: 2 }, b: 1 })
					attest(Nested(nested())).equals({ a: { x: 1, y: 2 }, b: 1 })
					// only the first branch allows a.y
					attest(Nested({ a: { x: 1, y: 3 }, b: 1 })).equals({ a: { x: 1 } })
				}
			})

			it("applies to the branches a discriminant leaves", () => {
				for (const jitless of [false, true]) {
					const $ = scope({}, { jitless })
					const T = $.type({ "+": "delete", kind: "'a'", "x?": "1" })
						.or({ "+": "delete", kind: "'a'", "y?": "2" })
						.or({ "+": "delete", kind: "'b'", "z?": "3" })
					const a = () => ({ kind: "a", x: 1, y: 2, z: 3 })
					attest(T(a())).equals({ kind: "a", x: 1, y: 2 })
					attest(T(a())).equals({ kind: "a", x: 1, y: 2 })
					attest(T({ kind: "a", x: 0, y: 2 })).equals({ kind: "a", y: 2 })
					attest(T({ kind: "b", x: 1, y: 2, z: 3 })).equals({ kind: "b", z: 3 })
					attest(T({ kind: "c" }).toString()).snap('kind must be "a" or "b"')
				}
			})

			it("keeps every key where a branch deleting none allows the data", () => {
				for (const jitless of [false, true]) {
					const $ = scope({}, { jitless })
					const T = $.type({ "+": "delete", "a?": "1" }).or("Date")
					attest(T({ a: 1, z: 2 })).equals({ a: 1 })
					const date = Object.assign(new Date(0), { a: 1, z: 2 })
					attest(T(date)).is(date)
					attest(Object.keys(date)).equals(["a", "z"])
				}
			})

			it("keeps a branch whose input is a subtype of another's", () => {
				const Point = type({ "+": "delete", x: "number" }).or({
					"+": "delete",
					x: "number",
					y: "number"
				})
				attest(Point.expression).snap(
					"{ x: number, y: number, + (undeclared): delete } | { x: number, + (undeclared): delete }"
				)
				attest(Point({ x: 1, y: 2, z: 3 })).equals({ x: 1, y: 2 })
				attest(Point({ x: 1, y: "2", z: 3 })).equals({ x: 1 })
				// a branch deleting none keeps all a subtype of it does
				attest(
					type({ "+": "delete", x: "number" }).or("object").expression
				).snap("object")
				// or one with the same input
				attest(
					type({ "+": "delete", x: "number" }).or({ x: "number" }).expression
				).snap("{ x: number }")
			})

			it("pipes what its branches keep", () => {
				const T = type({ "+": "delete", "x?": "1" })
					.or({ "+": "delete", "y?": "2" })
					.to({ "+": "reject", "x?": "1", "y?": "2" })
				attest(T({ x: 1, y: 2, z: 3 })).equals({ x: 1, y: 2 })
				attest(T({ x: 0, y: 2, z: 3 })).equals({ y: 2 })
			})

			it("has an output allowing what its branches keep", () => {
				const T = type({ "+": "delete", "x?": "1" }).or({
					"+": "delete",
					"y?": "2"
				})
				attest(T.out.expression).snap("{ x?: 1 } | { y?: 2 }")
				attest(T.out.allows(T({ x: 1, y: 2, z: 3 }))).equals(true)
			})

			it("defines a key over one its copy inherits", () => {
				let assigned = 0
				const prototypes = [
					{
						get b() {
							return 0
						}
					},
					{
						get b() {
							return 0
						},
						set b(_: number) {
							assigned++
						}
					},
					Object.freeze({ b: 0 })
				]
				for (const jitless of [false, true]) {
					const T = scope({}, { jitless })
						.type({ "+": "delete", a: "number" })
						.or({ "+": "delete", b: "number" })
					for (const prototype of prototypes) {
						const held = () =>
							Object.create(
								prototype,
								Object.getOwnPropertyDescriptors({ a: 1, b: 2, z: 3 })
							)
						for (const data of [held(), held()]) {
							const out = T(data) as object
							attest(Object.getPrototypeOf(out) === prototype).equals(true)
							attest(Object.getOwnPropertyDescriptors(out)).equals(
								Object.getOwnPropertyDescriptors({ a: 1, b: 2 })
							)
						}
					}
				}
				attest(assigned).equals(0)
			})

			it("assigns nothing to what a getter returns each branch anew", () => {
				for (const jitless of [false, true]) {
					const T = scope({}, { jitless })
						.type({ "+": "delete", "a?": "number", held: "object" })
						.or({ "+": "delete", "b?": "number", held: "object" })
					const data = () =>
						Object.defineProperty({ a: 1, b: 2, z: 3 }, "held", {
							enumerable: true,
							get: () => Object.freeze({ range: [0, 1] })
						})
					for (const input of [data(), data()]) {
						attest(T(input) as object).equals({
							a: 1,
							held: { range: [0, 1] },
							b: 2
						})
					}
				}
			})

			// an Error, like any builtin, is written in place rather than copied
			const thrown = (props: object) => Object.assign(new Error("m"), props)

			it("deletes from an object it can't copy what each branch allowing it would", () => {
				for (const jitless of [false, true]) {
					const $ = scope({}, { jitless })
					const T = $.type({
						"+": "delete",
						message: "string",
						"code?": "string"
					}).or({ "+": "delete", message: "string", "errno?": "number" })
					const both = () => thrown({ z: 0, code: "E", y: 0, errno: 1 })
					for (const error of [both(), both()]) {
						attest(T(error)).is(error)
						attest(Object.keys(error)).equals(["code", "errno"])
						attest(error.message).equals("m")
					}
					// one branch allowing it deletes as an object alone does
					const coded = thrown({ z: 0, code: "E", errno: "1" })
					attest(T(coded)).is(coded)
					attest(Object.keys(coded)).equals(["code"])
				}
			})

			it("writes into an object it can't copy what its branches made of its values", () => {
				for (const jitless of [false, true]) {
					const $ = scope({}, { jitless })
					const T = $.type({
						"+": "delete",
						error: { "+": "delete", a: { "+": "delete", x: "1" } }
					}).or({
						"+": "delete",
						error: { "+": "delete", b: { "+": "delete", y: "2" } }
					})
					const held = () =>
						thrown({ a: { x: 1, z: 0 }, b: { y: 2, z: 0 }, z: 0 })
					for (const error of [held(), held()]) {
						const out = T({ error, z: 0 }) as { error: object }
						attest(Object.keys(out)).equals(["error"])
						attest(out.error).is(error)
						attest({ ...error } as object).equals({
							a: { x: 1 },
							b: { y: 2 }
						})
					}
				}
			})

			it("deletes from an object it can't copy only for the branches holding it", () => {
				for (const jitless of [false, true]) {
					const $ = scope({}, { jitless })
					const Coded = $.type({ "+": "delete", "code?": "string" })
					// the other branch deletes its key
					const Dropped = $.type({ "+": "delete", error: Coded }).or({
						"+": "delete",
						"at?": "number"
					})
					// the other branch keeps all it holds
					const Whole = $.type({ "+": "delete", error: Coded }).or({
						"+": "delete",
						error: "Error",
						"at?": "number"
					})
					// each branch holds it twice, to delete other keys
					const Twice = $.type({
						"+": "delete",
						l: { "+": "delete", code: "string", "a?": "1" },
						r: { "+": "delete", code: "string", "b?": "2" }
					}).or({ "+": "delete", l: Coded, r: Coded, "at?": "number" })
					for (let i = 0; i < 2; i++) {
						const error = thrown({ code: "E", a: 1, b: 2 })
						attest(Dropped({ error, at: 0 }) as object).equals({ at: 0, error })
						attest(Object.keys(error)).equals(["code"])
						const whole = thrown({ code: "E", z: 0 })
						attest(Whole({ error: whole, at: 0 }) as object).equals({
							error: whole,
							at: 0
						})
						attest(Object.keys(whole)).equals(["code", "z"])
						const twice = thrown({ code: "E", a: 1, b: 2, z: 0 })
						attest(Twice({ l: twice, r: twice }) as object).equals({
							l: twice,
							r: twice
						})
						attest(Object.keys(twice)).equals(["code"])
					}
				}
			})

			it("writes an object it can't copy once a join holding another has joined", () => {
				for (const jitless of [false, true]) {
					const $ = scope({}, { jitless })
					const Inner = $.type({ "+": "delete", "a?": "1" }).or({
						"+": "delete",
						"b?": "2"
					})
					const T = $.type({ "+": "delete", v: Inner, "x?": "1" }).or({
						"+": "delete",
						v: { "+": "delete", "c?": "3" },
						"y?": "2"
					})
					for (let i = 0; i < 2; i++) {
						const error = thrown({ a: 1, b: 2, c: 3, z: 0 })
						attest(T({ v: error, x: 1, y: 2, z: 0 }) as object).equals({
							v: error,
							x: 1,
							y: 2
						})
						attest(Object.keys(error)).equals(["a", "b", "c"])
						// only the inner union's branches allow it
						const inner = thrown({ a: 1, b: 2, c: 3, z: 0 })
						attest(T({ v: inner, x: 1, y: 0 }) as object).equals({
							v: inner,
							x: 1
						})
						attest(Object.keys(inner)).equals(["a", "b"])
					}
				}
			})

			it("writes an object it can't copy that two constraints of a branch transform", () => {
				for (const jitless of [false, true]) {
					const $ = scope({}, { jitless })
					const seconds = [
						// allows the first's copy, which it writes
						$.type({ "+": "delete", "a?": "1", "c?": "3" }),
						// allows only the object, so what each made of it is merged
						$.type("Error").and({ "+": "delete", "a?": "1", "c?": "3" })
					]
					for (const second of seconds) {
						const T = $.type({
							"+": "delete",
							e: { "+": "delete", "a?": "1", "b?": "2" },
							"[/^e/]": second,
							"x?": "1"
						}).or({ "+": "delete", e: { "+": "delete", "d?": "4" }, "y?": "2" })
						for (let i = 0; i < 2; i++) {
							const error = thrown({ a: 1, b: 2, c: 3, d: 4, z: 0 })
							attest(T({ e: error, x: 1, y: 2 }) as object).equals({
								e: error,
								x: 1,
								y: 2
							})
							attest(Object.keys(error)).equals(["a", "d"])
						}
					}
				}
			})

			it("writes a key deleting doesn't read only where each branch transforms it", () => {
				for (const jitless of [false, true]) {
					const $ = scope({}, { jitless })
					const Pruned = $.type({
						"+": "delete",
						cause: { "+": "delete", x: "1" }
					})
					const Each = Pruned.or({
						"+": "delete",
						cause: { "+": "delete", y: "2" }
					})
					// which alone leaves an Error's cause as it is
					const One = Pruned.or({ "+": "delete", "k?": "1" })
					const caused = (): Error & { cause?: unknown } =>
						Object.defineProperty(thrown({ z: 0 }), "cause", {
							value: { x: 1, y: 2, z: 0 },
							writable: true,
							configurable: true
						})
					for (let i = 0; i < 2; i++) {
						const each = caused()
						attest(Each(each) as object).is(each)
						attest(each.cause).equals({ x: 1, y: 2 })
						const one = caused()
						attest(One(one) as object).is(one)
						attest(one.cause).equals({ x: 1, y: 2, z: 0 })
						attest(Object.keys(one)).equals([])
					}
				}
			})

			it("is indeterminate beside a morph or a default", () => {
				attest(() =>
					type({ "+": "delete", a: "string.trim", "x?": "1" }).or({
						"+": "delete",
						a: "string.trim",
						"y?": "2"
					})
				).throws
					.snap(`ParseError: An unordered union of a type including a morph and a type with overlapping input is indeterminate:
Left: { a: (In: string) => Out</^\\S[\\S\\s]*\\S$|^\\S?$/>, x?: 1, + (undeclared): delete }
Right: { a: (In: string) => Out</^\\S[\\S\\s]*\\S$|^\\S?$/>, y?: 2, + (undeclared): delete }
Make their inputs disjoint, e.g. by narrowing the morph's input, or pipe the union of their inputs to a single morph.`)
				attest(() =>
					type({ "+": "delete", a: "string", x: "number = 1" }).or({
						"+": "delete",
						a: "string",
						"y?": "2"
					})
				).throws("is indeterminate")
			})

			it("is indeterminate through a cycle", () => {
				attest(() =>
					scope({
						a: { "+": "delete", "x?": "1", "next?": "a" },
						b: { "+": "delete", "y?": "2" },
						either: "a | b"
					}).export()
				).throws("is indeterminate")
			})

			it("is indeterminate through a cycle given delete by a method", () => {
				const { Expr } = scope({
					Expr: "Lit | Bin",
					Bin: { "op?": "string", "l?": "Expr" },
					Lit: { "value?": "number" }
				}).export()
				attest(() => Expr.onUndeclaredKey("delete")).throws
					.snap(`ParseError: An unordered union of a type including a morph and a type with overlapping input is indeterminate:
Left: { l?: $Expr, op?: string, + (undeclared): delete }
Right: { value?: number, + (undeclared): delete }
Make their inputs disjoint, e.g. by narrowing the morph's input, or pipe the union of their inputs to a single morph.`)
				attest(() => Expr.onDeepUndeclaredKey("delete")).throws(
					"is indeterminate"
				)
				attest(() =>
					type({ "value?": "number" })
						.or({ "op?": "string", "l?": "this" })
						.onUndeclaredKey("delete")
				).throws("is indeterminate")
			})

			it("deletes by a method through a cycle a key tells apart", () => {
				for (const jitless of [false, true]) {
					const { Expr } = scope(
						{
							Expr: "Lit | Bin",
							Bin: { kind: "'bin'", "l?": "Expr" },
							Lit: { kind: "'lit'", "value?": "number" }
						},
						{ jitless }
					).export()
					const Shallow = Expr.onUndeclaredKey("delete")
					const Deep = Expr.onDeepUndeclaredKey("delete")
					const data = () => ({
						kind: "bin",
						z: 1,
						l: { kind: "lit", value: 1, z: 2 }
					})
					for (const input of [data(), data()]) {
						// only the objects the method was called on delete
						attest(Shallow(input) as object).equals({
							kind: "bin",
							l: { kind: "lit", value: 1, z: 2 }
						})
						attest(Deep(input)).equals({
							kind: "bin",
							l: { kind: "lit", value: 1 }
						})
					}
				}
			})
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
				code: "undeclared",
				path: ["b"],
				expected: "removed",
				message: "must be removed"
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
				"b must be removed or a number"
			)
		})

		it("configured text reaches a rejected key", () => {
			const Configured = scope(
				{},
				{ undeclared: { message: "Unknown key" } }
			).type({ "+": "reject", a: "string" })
			attest(Configured({ a: "ok", b: 1 }).toString()).snap("b: Unknown key")
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
			attest(O({ a: [2] }).toString()).snap("a[0] must be a string")
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
			attest(Rejected(past).toString()).snap('["4294967295"] must be removed')
			attest(Deleted(past)).equals(["a"])
			const named = Object.assign(["a"], { 4294967295: "b" })
			attest(Rejected(named).toString()).snap('["4294967295"] must be removed')
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
				"a must be a string or removed"
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
