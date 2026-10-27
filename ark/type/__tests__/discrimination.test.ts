import { attest, contextualize } from "@ark/attest"
import { registeredReference } from "@ark/schema"
import { scope, type, type ArkConfig } from "arktype"
import { discriminantJsonOf } from "arksets/internal"

contextualize(() => {
	it("2 literal branches", () => {
		// should not use a switch with <=2 branches to avoid needless convolution
		const T = type("'a'|'b'")
		attest(T.json).snap([{ unit: "a" }, { unit: "b" }])
		attest(discriminantJsonOf(T.internal.assertIs("union"))).snap({
			kind: "unit",
			path: [],
			cases: { '"a"': true, '"b"': true }
		})
		attest(T.allows("a")).equals(true)
		attest(T.allows("b")).equals(true)
		attest(T.allows("c")).equals(false)
	})

	it(">2 literal branches", () => {
		const T = type("'a'|'b'|'c'")
		attest(T.json).snap([{ unit: "a" }, { unit: "b" }, { unit: "c" }])
		attest(discriminantJsonOf(T.internal.assertIs("union"))).snap({
			kind: "unit",
			path: [],
			cases: { '"a"': true, '"b"': true, '"c"': true }
		})
		attest(T.allows("a")).equals(true)
		attest(T.allows("b")).equals(true)
		attest(T.allows("c")).equals(true)
		attest(T.allows("d")).equals(false)
	})

	it(">2 domain branches", () => {
		const T = type("string|bigint|number")
		attest(T.json).snap(["bigint", "number", "string"])
		attest(discriminantJsonOf(T.internal.assertIs("union"))).snap({
			kind: "domain",
			path: [],
			cases: {
				'"bigint"': true,
				'"number"': { domain: "number" },
				'"string"': true
			}
		})
		attest(T.allows("foo")).equals(true)
		attest(T.allows(5n)).equals(true)
		attest(T.allows(5)).equals(true)
		attest(T.allows(Number.NaN)).equals(false)
		attest(T.allows(true)).equals(false)
	})

	it("literals can be included in domain branches", () => {
		const T = type("string|bigint|true")
		attest(T.json).snap(["bigint", "string", { unit: true }])
		attest(discriminantJsonOf(T.internal.assertIs("union"))).snap({
			kind: "domain",
			path: [],
			cases: { '"bigint"': true, '"string"': true, '"boolean"': { unit: true } }
		})
		attest(T.allows("foo")).equals(true)
		attest(T.allows(5n)).equals(true)
		attest(T.allows(true)).equals(true)
		attest(T.allows(5)).equals(false)
	})

	const getPlaces = () =>
		scope({
			rainForest: {
				climate: "'wet'",
				color: "'green'",
				isRainForest: "true"
			},
			desert: { climate: "'dry'", color: "'brown'", isDesert: "true" },
			sky: { climate: "'dry'", color: "'blue'", isSky: "true" },
			ocean: { climate: "'wet'", color: "'blue'", isOcean: "true" }
		})

	it("nested", () => {
		const $ = getPlaces()
		const climate = $.type("ocean | sky | rainForest | desert")

		const missingLabel = climate({
			climate: "wet",
			color: "blue"
		})

		attest(missingLabel.toString()).snap("isOcean must be true (was missing)")

		const twoMissingKeys = climate({
			color: "blue"
		})

		attest(twoMissingKeys.toString()).snap(
			'climate must be "dry" or "wet" (was missing)'
		)

		attest(discriminantJsonOf(climate.internal.assertIs("union"))).snap({
			kind: "unit",
			path: ["color"],
			cases: {
				'"blue"': {
					kind: "unit",
					path: ["climate"],
					cases: {
						'"dry"': { required: [{ key: "isSky", value: { unit: true } }] },
						'"wet"': { required: [{ key: "isOcean", value: { unit: true } }] }
					}
				},
				'"brown"': {
					required: [
						{ key: "climate", value: { unit: "dry" } },
						{ key: "isDesert", value: { unit: true } }
					]
				},
				'"green"': {
					required: [
						{ key: "climate", value: { unit: "wet" } },
						{ key: "isRainForest", value: { unit: true } }
					]
				}
			}
		})
	})

	// https://github.com/arktypeio/arktype/issues/963
	it("described union discriminated by its value", () => {
		const Primitive = type("string | number").describe("a primitive")
		attest(Primitive({}).toString()).snap("must be a primitive (was an object)")
		const Letter = type("'a' | 'b' | 'c'").describe("a letter")
		attest(Letter("d").toString()).snap('must be a letter (was "d")')
	})

	it("described branches discriminated by their value", () => {
		const T = type("string < 2")
			.describe("short")
			.or(type("number").describe("a count"))
		attest(T({}).toString()).snap("must be a count or short (was an object)")
	})

	it("described union discriminated at a key", () => {
		const Shape = type({ kind: "'circle'", r: "number" })
			.or({ kind: "'square'", s: "number" })
			.describe("a shape")
		attest(Shape({ kind: "triangle" }).toString()).snap(
			"must be a shape (was an object)"
		)
		attest(type({ shape: Shape })({ shape: {} }).toString()).snap(
			"shape must be a shape (was an object)"
		)
	})

	it("described union reaching a default case", () => {
		const Event = type({ id: "0", k1: "number" })
			.or({ id: "1", k2: "number" })
			.or({ name: "string" })
			.describe("an event")
		attest(Event({}).toString()).snap("must be an event (was an object)")
		attest(Event(5).toString()).snap("must be an event (was a number)")
	})

	it("described branches discriminated at a key", () => {
		const Shape = type({ kind: "'circle'", r: "number" })
			.describe("a circle")
			.or(type({ kind: "'square'", s: "number" }).describe("a square"))
		attest(Shape({ kind: "triangle" }).toString()).snap(
			'kind must be "circle" or "square" (was "triangle")'
		)
	})

	it("prefers a key every branch holds to one with more cases", () => {
		const T = type({ kind: "'a'", channel: "'open' | 'closed'", x: "string" })
			.or({ kind: "'b'", channel: "'read' | 'write'", y: "number" })
			.or({ kind: "'c'", z: "boolean" })
		attest(T.internal.assertIs("union").discriminant?.path).snap(["kind"])
		attest(T({ kind: "c", z: 1 }).toString()).snap("z must be boolean (was 1)")
	})

	it("cases include units no pair of branches was told apart by", () => {
		// each pair with the third branch differs first at g, so only the
		// branches themselves hold its id
		const T = type({ g: "'x'", id: "1", a: "string" })
			.or({ g: "'x'", id: "2", b: "string" })
			.or({ g: "'y'", id: "4", d: "string" })
			.or({ e: "string" })
		attest(Object.keys(T.internal.assertIs("union").discriminant!.cases)).snap([
			"1",
			"2",
			"4",
			"default"
		])
		attest(T({ g: "y", id: 4 }).toString()).snap(
			"d must be a string (was missing) or e must be a string (was missing)"
		)
		attest(T({ id: 5 }).toString()).snap(
			"id must be 1, 2 or 4 (was 5) or e must be a string (was missing)"
		)
	})

	it("cases include domains no pair of branches was told apart by", () => {
		const T = type({ g: "'x'", v: "string", a: "string" })
			.or({ g: "'x'", v: "number", b: "string" })
			.or({ g: "'y'", v: "boolean", d: "string" })
			.or({ e: "string" })
		attest(T({ g: "y", v: true }).toString()).snap(
			"d must be a string (was missing) or e must be a string (was missing)"
		)
	})

	it("indiscriminable", () => {
		const T = getPlaces().type([
			"ocean",
			"|",
			{
				climate: "'wet'",
				color: "'blue'",
				indistinguishableFrom: "ocean"
			}
		])

		attest(discriminantJsonOf(T.internal.assertIs("union"))).equals(null)
	})

	it("discriminate optional key", () => {
		const T = type({
			direction: "'forward' | 'backward'",
			"operator?": "'by'"
		}).or({
			duration: "'s' | 'min' | 'h'",
			operator: "'to'"
		})

		attest(discriminantJsonOf(T.internal.assertIs("union"))).equals(null)
	})

	it("overlapping default case", () => {
		const T = getPlaces().type([
			"ocean|rainForest",
			"|",
			{ temperature: "'hot'" }
		])

		attest(discriminantJsonOf(T.internal.assertIs("union"))).snap({
			kind: "unit",
			path: ["color"],
			cases: {
				'"blue"': [
					{
						required: [
							{ key: "climate", value: { unit: "wet" } },
							{ key: "isOcean", value: { unit: true } }
						]
					},
					{ required: [{ key: "temperature", value: { unit: "hot" } }] }
				],
				'"green"': [
					{
						required: [
							{ key: "climate", value: { unit: "wet" } },
							{ key: "isRainForest", value: { unit: true } }
						]
					},
					{ required: [{ key: "temperature", value: { unit: "hot" } }] }
				],
				default: {
					required: [{ key: "temperature", value: { unit: "hot" } }],
					domain: "object"
				}
			}
		})
	})

	it("discriminable default", () => {
		const T = getPlaces().type([
			{ temperature: "'cold'" },
			"|",
			["ocean|rainForest", "|", { temperature: "'hot'" }]
		])

		attest(discriminantJsonOf(T.internal.assertIs("union"))).snap({
			kind: "unit",
			path: ["color"],
			cases: {
				'"blue"': [
					{
						required: [
							{ key: "climate", value: { unit: "wet" } },
							{ key: "isOcean", value: { unit: true } }
						]
					},
					{
						required: [
							{ key: "temperature", value: [{ unit: "cold" }, { unit: "hot" }] }
						]
					}
				],
				'"green"': [
					{
						required: [
							{ key: "climate", value: { unit: "wet" } },
							{ key: "isRainForest", value: { unit: true } }
						]
					},
					{
						required: [
							{ key: "temperature", value: [{ unit: "cold" }, { unit: "hot" }] }
						]
					}
				],
				default: {
					required: [
						{ key: "temperature", value: [{ unit: "cold" }, { unit: "hot" }] }
					],
					domain: "object"
				}
			}
		})
	})

	it("won't discriminate between possibly empty arrays", () => {
		const T = type("string[]|boolean[]")
		attest(discriminantJsonOf(T.internal.assertIs("union"))).equals(null)
	})

	it("won't discriminate at an index a variadic element shifts", () => {
		// null is at [0] only in [null]
		const Postfixed = type(["...", "number[]", "false"]).or([
			"...",
			"string[]",
			"null"
		])
		attest(discriminantJsonOf(Postfixed.internal.assertIs("union"))).equals(
			null
		)
		// null is at [1] only in [string, null]
		const Prefixed = type(["...", "string[]", "null"]).or([
			"number",
			"...",
			"false[]"
		])
		attest(discriminantJsonOf(Prefixed.internal.assertIs("union"))).equals(null)
	})

	it("discriminant path including symbol", () => {
		const s = Symbol("lobmyS")
		const sRef = registeredReference(s)
		const T = type({ [s]: "0", "a?": "string" }).or({ [s]: "1" })
		attest(discriminantJsonOf(T.internal.assertIs("union"))).snap({
			kind: "unit",
			path: [sRef],
			cases: {
				"0": { optional: [{ key: "a", value: "string" }] },
				"1": true
			}
		})

		attest(T.allows({ [s]: 0 })).equals(true)
		attest(T.allows({ [s]: -1 })).equals(false)

		attest(T({ [s]: 1 })).equals({ [s]: 1 })
		attest(T({ [s]: 2 }).toString()).snap(
			"value at [Symbol(lobmyS)] must be 0 or 1 (was 2)"
		)
	})

	// https://github.com/arktypeio/arktype/issues/1100
	it("discriminated null + object", () => {
		const Company = type({
			id: "number"
		}).or("string | null")

		attest(Company(null)).equals(null)
		attest(Company({ id: 1 })).equals({ id: 1 })
		attest(Company("foo")).equals("foo")
		attest(Company(5)?.toString()).snap(
			"must be a string, an object or null (was a number)"
		)
	})

	it("differing inner discriminated paths", () => {
		const Discriminated = type(
			{
				innerA: {
					id: "1"
				}
			},
			"|",
			{
				innerB: {
					id: "1"
				}
			}
		)
			.or({ innerA: { id: "2" } })
			.or({ innerB: { id: "2" } })

		const Union = Discriminated.internal.assertIs("union")

		attest(discriminantJsonOf(Union)).snap(null)

		attest(Union({ innerA: { id: 1 } })).equals({ innerA: { id: 1 } })
		attest(Union({ innerB: { id: 1 } })).equals({ innerB: { id: 1 } })
		attest(Union({ innerA: { id: 2 } })).equals({ innerA: { id: 2 } })
		attest(Union({ innerB: { id: 2 } })).equals({ innerB: { id: 2 } })

		attest(Union({})?.toString()).snap(
			"innerA must be an object (was missing) or innerB must be an object (was missing)"
		)
	})

	it("allows strict discriminated keys", () => {
		const AorB = type({
			type: "'A'",
			"a?": "string"
		})
			.or({
				type: "'B'"
			})
			.onUndeclaredKey("reject")

		attest(discriminantJsonOf(AorB.internal.assertIs("union"))).snap({
			kind: "unit",
			path: ["type"],
			cases: {
				'"A"': {
					undeclared: "reject",
					required: [{ key: "type", value: {} }],
					optional: [{ key: "a", value: "string" }]
				},
				'"B"': { undeclared: "reject", required: [{ key: "type", value: {} }] }
			}
		})

		attest(AorB({ type: "A" })).equals({ type: "A" })
	})

	it("can discriminated objects with disjoint strict keys", () => {
		const AorB = type({
			"+": "reject",
			something: "'A'"
		}).or({
			"+": "reject",
			something: "'B'",
			somethingelse: "number"
		})

		attest(discriminantJsonOf(AorB.internal.assertIs("union"))).snap({
			kind: "unit",
			path: ["something"],
			cases: {
				'"A"': {
					undeclared: "reject",
					required: [{ key: "something", value: {} }]
				},
				'"B"': {
					undeclared: "reject",
					required: [
						{ key: "something", value: {} },
						{ key: "somethingelse", value: "number" }
					]
				}
			}
		})

		attest(AorB({ something: "A" })).snap({ something: "A" })
	})

	it("includes non-disjoint branches in corresponding cases", () => {
		const T = type({
			id: "0",
			k1: "number"
		})
			.or({ id: "1", k2: "number" })
			.or({
				name: "string"
			})

		attest(discriminantJsonOf(T.internal.assertIs("union"))).snap({
			kind: "unit",
			path: ["id"],
			cases: {
				"0": [
					{ required: [{ key: "k1", value: "number" }] },
					{ required: [{ key: "name", value: "string" }] }
				],
				"1": [
					{ required: [{ key: "k2", value: "number" }] },
					{ required: [{ key: "name", value: "string" }] }
				],
				default: {
					required: [{ key: "name", value: "string" }],
					domain: "object"
				}
			}
		})

		// should hit the case discriminated for id: 1,
		// but still resolve correctly via the { name: string } branch
		attest(T({ name: "foo", id: 1 })).unknown.snap({ name: "foo", id: 1 })
	})

	it("correctly dsicriminated onDeclaredKey: reject in the above scenario", () => {
		const T = type({
			id: "0",
			k1: "number"
		})
			.or({ id: "1", k2: "number" })
			.or({
				"+": "reject",
				name: "string"
			})

		attest(discriminantJsonOf(T.internal.assertIs("union"))).snap({
			kind: "unit",
			path: ["id"],
			cases: {
				"0": { required: [{ key: "k1", value: "number" }] },
				"1": { required: [{ key: "k2", value: "number" }] },
				default: {
					undeclared: "reject",
					required: [{ key: "name", value: "string" }],
					domain: "object"
				}
			}
		})

		// now that we are rejecting undeclared keys, all branches fail
		attest(T({ name: "foo", id: 1 }).toString()).snap(
			"k2 must be a number (was missing)"
		)
	})

	it("discriminate array and tuple", () => {
		const T = type("null[] | false").or([type.undefined])

		const selected = T.select({
			kind: "union",
			method: "assertFind"
		})

		attest(discriminantJsonOf(selected)).snap({
			kind: "domain",
			path: [],
			cases: {
				'"object"': [
					{
						sequence: { prefix: [{ unit: "undefined" }] },
						proto: "Array",
						exactLength: 1
					},
					{ sequence: { unit: null }, proto: "Array" }
				],
				'"boolean"': { unit: false }
			}
		})
	})

	it("discriminate bounded array and tuple", () => {
		const T = type("3 <= null[] <= 10 | false").or([type.undefined])

		const selected = T.select({
			kind: "union",
			method: "assertFind"
		})

		attest(discriminantJsonOf(selected)).snap({
			kind: "domain",
			path: [],
			cases: {
				'"object"': [
					{
						sequence: { prefix: [{ unit: "undefined" }] },
						proto: "Array",
						exactLength: 1
					},
					{
						sequence: { unit: null },
						proto: "Array",
						maxLength: 10,
						minLength: 3
					}
				],
				'"boolean"': { unit: false }
			}
		})
	})

	it("tuple element case includes overlapping tuples", () => {
		const $ = scope({})
		const T = $.type(["'x'", "string"])
			.or(["unknown", "undefined"])
			.or(["1", "object"])

		attest(T.allows(["x", undefined])).equals(true)
		attest(T(["x", undefined])).equals(["x", undefined])
	})

	it("keeps a union at the discriminant path of an overlapping branch", () => {
		const $ = scope({})
		const T = $.type({ a: "string | number", b: "1 | 2" })
			.or({ a: "1", b: "string" })
			.or({ a: "string", b: "string" })

		attest(T.allows({ a: "x", b: 1 })).equals(true)
		attest(T({ a: "x", b: 1 })).equals({ a: "x", b: 1 })
	})

	it("describes an object case only arrays reach as an array", () => {
		attest(type("string | string[]")(5).toString()).snap(
			"must be a string or an array (was a number)"
		)
		attest(type("string | string[] | Date")(5).toString()).snap(
			"must be a string or an object (was a number)"
		)
		attest(type({ a: "string | number[]" })({ a: true }).toString()).snap(
			"a must be a string or an array (was boolean)"
		)
	})

	// https://github.com/arktypeio/arktype/issues/1435
	it("splits a literal union at the discriminant into cases", () => {
		const T = type.or(
			{ type: "'a'", val1: "number" },
			{ type: "'b'", val2: "number" },
			{ type: "'c' | 'd'", val3: "number" }
		)
		attest(discriminantJsonOf(T.internal.assertIs("union"))).snap({
			kind: "unit",
			path: ["type"],
			cases: {
				'"c"': {
					required: [
						{ key: "type", value: [{ unit: "c" }, { unit: "d" }] },
						{ key: "val3", value: "number" }
					]
				},
				'"d"': {
					required: [
						{ key: "type", value: [{ unit: "c" }, { unit: "d" }] },
						{ key: "val3", value: "number" }
					]
				},
				'"a"': { required: [{ key: "val1", value: "number" }] },
				'"b"': { required: [{ key: "val2", value: "number" }] }
			}
		})
		attest(T({ type: "e" }).toString()).snap(
			'type must be "c", "d", "a" or "b" (was "e")'
		)
		attest(T({ type: "d" }).toString()).snap(
			"val3 must be a number (was missing)"
		)
		attest(T({ type: "d", val3: 1 })).equals({ type: "d", val3: 1 })
	})

	// https://github.com/arktypeio/arktype/issues/1491
	it("splits literal unions on either side into cases", () => {
		const T = type({ tag: "'a'", a: "number" }).or({
			tag: "'b' | 'c'",
			bc: "string"
		})
		attest(T({}).toString()).snap('tag must be "a", "b" or "c" (was missing)')
		attest(T({ tag: "c" }).toString()).snap("bc must be a string (was missing)")
	})

	it("a unit in two branches' literal unions is a case of both", () => {
		const T = type.or(
			{ k: "'a' | 'b'", n: "number" },
			{ k: "'c'" },
			{ k: "'b' | 'd'", n: "string" }
		)
		attest(discriminantJsonOf(T.internal.assertIs("union"))).snap({
			kind: "unit",
			path: ["k"],
			cases: {
				'"a"': {
					required: [
						{ key: "k", value: [{ unit: "a" }, { unit: "b" }] },
						{ key: "n", value: "number" }
					]
				},
				'"b"': {
					kind: "domain",
					path: ["n"],
					cases: {
						'"number"': {
							required: [
								{ key: "k", value: [{ unit: "a" }, { unit: "b" }] },
								{ key: "n", value: "number" }
							]
						},
						'"string"': {
							required: [{ key: "k", value: [{ unit: "b" }, { unit: "d" }] }]
						}
					}
				},
				'"c"': true,
				'"d"': {
					required: [
						{ key: "k", value: [{ unit: "b" }, { unit: "d" }] },
						{ key: "n", value: "string" }
					]
				}
			}
		})
		attest(T({ k: "b", n: 1 })).equals({ k: "b", n: 1 })
		attest(T({ k: "b", n: "x" })).equals({ k: "b", n: "x" })
		attest(T({ k: "b" }).toString()).snap(
			"n must be a number or a string (was missing)"
		)
	})

	it("dimscrinate literal undefined value", () => {
		const T = type(["number[]", "|", ["undefined"]])

		attest(T.assert([])).equals([])
	})

	// https://github.com/arktypeio/arktype/issues/1547
	it("discriminates cyclic union on nested path", () => {
		const s = scope({
			AChild: { type: "'AChild'", children: "(AParent)[] > 0" },
			AParent: { type: "'AParent'", children: "(AChild)[] > 0" },
			BChild: { type: "'BChild'", children: "unknown[]" },
			BParent: {
				type: "'BParent'",
				layout: "number[]",
				children: "(BChild)[] > 0"
			}
		})

		const Thing = s.type("AParent | BParent")

		attest(discriminantJsonOf(Thing.internal.assertIs("union"))).equals({
			kind: "unit",
			path: ["type"],
			cases: {
				'"BParent"': {
					required: [
						{
							key: "children",
							value: {
								sequence: {
									required: [
										{ key: "children", value: "Array" },
										{ key: "type", value: { unit: "BChild" } }
									],
									domain: "object"
								},
								proto: "Array",
								minLength: 1
							}
						},
						{ key: "layout", value: { sequence: "number", proto: "Array" } }
					]
				},
				'"AParent"': {
					required: [
						{
							key: "children",
							value: {
								sequence: `$ark.${s.export().AChild.internal.id}`,
								proto: "Array",
								minLength: 1
							}
						}
					]
				}
			}
		})

		attest(
			Thing({
				type: "BParent",
				layout: "",
				children: [{ type: "BChild", children: [] }]
			}).toString()
		).snap("layout must be an array (was a string)")
	})

	it("discriminates neither a date nor NaN", () => {
		const $ = scope({})
		const T = $.type({ a: $.enumerated(new Date(0), Number.NaN, 1, 2) })
		const epoch = { a: new Date(0) }

		attest(T(epoch)).equals(epoch)
		attest(T({ a: Number.NaN })).equals({ a: Number.NaN })
		attest(T({ a: new Date(0).toISOString() }).toString()).snap(
			'a must be January 1, 1970, NaN, 1 or 2 (was "1970-01-01T00:00:00.000Z")'
		)
		attest($.type.enumerated(Number.NaN, "a", true)("c").toString()).snap(
			'must be NaN, "a" or true (was "c")'
		)
	})

	it("case relates a unit to an object whose basis was pruned", () => {
		const $ = scope({})
		const T = $.type({ a: "string" })
			.or({ a: "1 | object", b: "1" })
			.or({ a: { c: "number" }, b: "2" })

		attest(T.allows({ a: 1, b: 1 })).equals(true)
		attest(T.allows({ a: { c: 0 }, b: 2 })).equals(true)
		attest(T.allows({ a: { c: 0 }, b: 3 })).equals(false)
		// a refinement whose basis was pruned
		const U = $.type({ a: "string > 1", b: "1" })
			.or({ a: "number" })
			.or({ a: "null | 'x'", b: "2" })
		attest(U.allows({ a: "xy", b: 1 })).equals(true)
		attest(U.allows({ a: "x", b: 2 })).equals(true)
		attest(U.allows({ a: "y", b: 2 })).equals(false)
	})

	it("number case includes NaN and Infinity", () => {
		const $ = scope({})
		const T = $.type({ a: "number.NaN | number.Infinity | 'x'" })
			.or({ a: "object" })
			.or({ a: "3" })

		attest(T.allows({ a: Number.NaN })).equals(true)
		attest(T.allows({ a: Number.POSITIVE_INFINITY })).equals(true)
		attest(T.allows({ a: 4 })).equals(false)
	})

	it("tuple element case includes a string at a key", () => {
		const $ = scope({})
		const T = $.type({ a: ["'a'"] })
			.or({ a: ["'b'"] })
			.or({ a: "string | null" })
		const U = $.type({ a: ["'a'"] })
			.or({ a: ["'b'"] })
			.or({ "a?": "string" })

		attest(T.allows({ a: "a" })).equals(true)
		attest(T.allows({ a: ["c"] })).equals(false)
		attest(U.allows({ a: "a" })).equals(true)
		attest(U.allows({ a: ["c"] })).equals(false)
	})

	it("doesn't discriminate undefined at a path", () => {
		const $ = scope({})
		const T = $.type({ kind: "'c'", v: "undefined" }).or({
			kind: "'c'",
			v: "2"
		})

		attest(T({ kind: "c", v: undefined })).equals({ kind: "c", v: undefined })
		attest(T({ kind: "c" }).toString()).snap(
			"v must be undefined or 2 (was missing)"
		)
		attest(T(0).toString()).snap("must be an object (was a number)")
	})

	it("primitive with discriminant key", () => {
		const $ = scope({})
		const T = $.type({ length: "3", x: "string" }).or({
			length: "4",
			y: "number"
		})

		attest(T({ length: 3, x: "" })).equals({ length: 3, x: "" })
		attest(T("abc").toString()).snap("must be an object (was a string)")
	})

	it("object and symbol cases", () => {
		const o = {}
		const sym = Symbol("sym")
		const $ = scope({})
		const T = $.type({ a: $.enumerated(o, sym, 1) })

		attest(T({ a: o })).equals({ a: o })
		attest(T({ a: {} }).toString()).snap(
			"a must be 1, {} or Symbol(sym) (was an object)"
		)
	})

	it("rejected prop reads", () => {
		// its own scope, so each Type is first called here in any history
		const $ = scope({})
		const reads = (T: type.Any) => {
			let count = 0
			const v = Object.defineProperty({}, "a", {
				get: () => {
					count++
					return 5
				},
				enumerable: true
			})
			attest(T({ v }).toString()).equals("v.a must be a string (was a number)")
			return count
		}
		const A = $.type({ a: "string" })
		const unioned = reads($.type({ v: A.or("null") }))
		// compiled, A alone reads `a` once more, before checking v holds an object
		attest(reads($.type({ v: A })) - unioned).satisfies("0 | 1")
	})

	it("no discriminant from index signature", () => {
		const T = type({ a: "'x'", "[string]": "'x'" }).or({
			kind: "'a'",
			a: "string"
		})

		attest(T.allows({ a: "x" })).equals(true)
		attest(T({ a: "x" })).equals({ a: "x" })
		attest(T({ kind: "b", a: "y" }).toString()).snap(
			'kind must be "a" (was "b") or a must be "x" (was "y")'
		)
	})

	describe("data no case identifies", () => {
		const $ = scope({})
		const Shape = $.type({ kind: "'circle'", r: "number" }).or({
			kind: "'square'",
			side: "number"
		})

		it("can't hold the discriminant", () => {
			attest(Shape(5).toString()).snap("must be an object (was a number)")
			attest(Shape(null).toString()).snap("must be an object (was null)")
			const error = (Shape(5) as type.errors).issues[0]
			attest(error.code).equals("union")
		})

		it("lacks the discriminant's parent", () => {
			const T = $.type({ v: { kind: "'a'", x: "string" } }).or({
				v: { kind: "'b'", y: "number" },
				w: "string"
			})
			attest(T({}).toString()).snap("v must be an object (was missing)")
			attest(T({ v: 5 }).toString()).snap("v must be an object (was a number)")
			// a parent that is an object still misses at the key
			attest(T({ v: {} }).toString()).snap(
				'v.kind must be "a" or "b" (was missing)'
			)
		})

		it("isn't an array at an element discriminant", () => {
			const T = $.type(["'a'", "string"]).or(["'b'", "number"])
			attest(T({}).toString()).snap("must be an array (was an object)")
			attest(T([]).toString()).snap(
				'value at [0] must be "a" or "b" (was missing)'
			)
		})

		it("reaches a default case", () => {
			const Event = $.type({ id: "0", k1: "number" })
				.or({ id: "1", k2: "number" })
				.or({ name: "string" })
			attest(Event({}).toString()).snap(
				"id must be 0 or 1 (was missing) or name must be a string (was missing)"
			)
			attest(Event({ id: 5 }).toString()).snap(
				"id must be 0 or 1 (was 5) or name must be a string (was missing)"
			)
			// a case still reports only the branches it allows
			attest(Event({ id: 0 }).toString()).snap(
				"k1 must be a number (was missing) or name must be a string (was missing)"
			)
			const error = (Event({ id: 5 }) as type.errors).issues[0]
			attest(
				error.code === "union" && error.errors.map(e => [e.code, e.path])
			).snap([
				["discriminant", ["id"]],
				["required", ["name"]]
			])
		})

		it("reaches a default case at its own value", () => {
			const T = $.type("'a' | 'b' | 'c'").or("string > 5")
			attest(T("d").toString()).snap(
				'must be "a", "b", "c" or at least length 6 (was "d")'
			)
		})

		it("reaches a default case of another basis", () => {
			const T = $.type("Date").or({ a: "1" }).or({ a: "2" })
			attest(T({ a: 3 }).toString()).snap(
				"a must be 1 or 2 (was 3) or must be a Date (was an object)"
			)
			attest(T(5).toString()).snap("must be an object or a Date (was a number)")
		})

		it("in a cyclic union", () => {
			const T = scope({
				Field: { type: "'field'", value: "string >= 1" },
				Group: { type: "'group'", parts: "Part[]" },
				Part: "Field | Group"
			}).type({ parts: "Part[]" })
			attest(T({ parts: [5] }).toString()).snap(
				"parts[0] must be an object (was a number)"
			)
		})
	})

	describe("misses", () => {
		it("have their own code and the discriminant's value", () => {
			const $ = scope({})
			const T = $.type({ k: "1.5", a: "string" }).or({
				k: "2.5",
				b: "number"
			})
			const errors = T({ k: 3.5 }) as type.errors
			attest(errors.summary).snap("k must be 1.5 or 2.5 (was 3.5)")
			attest(errors.toJSON()[0]).snap({
				data: 3.5,
				path: ["k"],
				code: "discriminant",
				discriminantKind: "unit",
				onKey: true,
				absent: false,
				description: "1.5 or 2.5",
				meta: {},
				propString: "k",
				expected: "1.5 or 2.5",
				actual: "3.5",
				problem: "must be 1.5 or 2.5 (was 3.5)",
				message: "k must be 1.5 or 2.5 (was 3.5)"
			})
		})

		it("domain cases", () => {
			const $ = scope({})
			const T = $.type("string | number | bigint").or({ a: "1" })
			const errors = T(Symbol("domainCase")) as type.errors
			attest(errors.summary).snap(
				"must be a bigint, a number, a string or an object (was a symbol)"
			)
			const error = errors.issues[0]
			if (error.code !== "discriminant") throw new Error()
			attest(error.discriminantKind).equals("domain")
			attest(error.cases).equals(["bigint", "number", "string", "object"])
			attest((T(true) as type.errors).summary).snap(
				"must be a bigint, a number, a string or an object (was boolean)"
			)
		})

		it("unit cases are the units themselves", () => {
			const o = {}
			const sym = Symbol("unitCase")
			const $ = scope({})
			const T = $.type.enumerated(
				o,
				sym,
				"a",
				1,
				2n,
				-Infinity,
				true,
				null,
				undefined
			)
			const errors = T("z") as type.errors
			attest(errors.summary).snap(
				'must be 1, {}, Symbol(unitCase), -Infinity, 2n, "a", undefined, null or true (was "z")'
			)
			const error = errors.issues[0]
			if (error.code !== "discriminant") throw new Error()
			attest(error.cases).equals([
				1,
				o,
				sym,
				-Infinity,
				2n,
				"a",
				undefined,
				null,
				true
			])
			attest(error.cases[1]).is(o)
		})

		it("an absent key", () => {
			const $ = scope({})
			const T = $.type({ k: "'a'", x: "string" }).or({
				k: "'b'",
				y: "number"
			})
			const absent = (data: unknown) => {
				const error = (T(data) as type.errors).issues[0]
				if (error.code !== "discriminant") throw new Error()
				return [error.absent, error.message]
			}
			attest(absent({})).snap([true, 'k must be "a" or "b" (was missing)'])
			attest(absent({ k: undefined })).snap([
				false,
				'k must be "a" or "b" (was undefined)'
			])
			// each has its own key so they aren't merged into one v
			const Nested = $.type({ v: { k: "'a'", x: "string" }, "a?": "1" })
				.or({ v: { k: "'b'", y: "number" }, "b?": "1" })
				.or({ v: { k: "'c'" }, "c?": "1" })
			const nestedAbsent = (data: unknown) => {
				const error = (Nested(data) as type.errors).issues[0]
				return error.code === "discriminant" && error.absent
			}
			attest(nestedAbsent({ v: {} })).equals(true)
			attest(nestedAbsent({ v: { k: "d" } })).equals(false)
			attest(nestedAbsent({ v: { k: undefined } })).equals(false)
		})

		it("keep their path when merged", () => {
			const $ = scope({})
			const Disc = $.type({ k: "'a'", x: "string" }).or({
				k: "'b'",
				y: "number"
			})
			const T = $.type({ v: $.type("object").pipe(o => Disc(o)) })
			const error = (T({ v: { k: "c" } }) as type.errors).issues[0]
			attest(error.message).snap('v.k must be "a" or "b" (was "c")')
			attest(error.propString).equals("v.k")
		})

		it("serialize with bigint cases", () => {
			const T = type({ k: "1n", a: "string" }).or({ k: "2n", b: "number" })
			attest(JSON.parse(JSON.stringify(T({ k: "x" })))[0].message).snap(
				'k must be 1n or 2n (was "x")'
			)
		})

		it("in an outer union, print the value at their path", () => {
			const $ = scope({})
			const Disc = $.type({ k: "'a'", x: "string" }).or({
				k: "'b'",
				y: "number"
			})
			const T = $.type({ v: Disc }).or({
				v: { k: "string >= 5" },
				"w?": "string"
			})
			attest(T({ v: { k: "c" } }).toString()).snap(
				'v.k must be "a", "b" or at least length 5 (was "c")'
			)
		})

		it("configured text", () => {
			const define = (config: ArkConfig) =>
				scope({}, config)
					.type({ kind: "'a'", x: "string" })
					.or({ kind: "'b'", y: "number" })
			const Configured = define({
				discriminant: {
					problem: ctx => `isn't one of ${ctx.cases.length}`
				}
			})
			attest(Configured({ kind: "c" }).toString()).snap("kind isn't one of 2")
		})
	})

	it("jitless describes cases as compiled", () => {
		const $ = scope({})
		const StringOrFile = $.type("string | File")
		attest(StringOrFile(5).toString()).snap(
			"must be a string or an object (was a number)"
		)
		attest(StringOrFile({}).toString()).snap(
			"must be a File instance (was an object)"
		)
		attest($.type("'b' | 1 | 'a'")(2).toString()).snap(
			'must be 1, "a" or "b" (was 2)'
		)
		const Tagged = $.type({ kind: "'a'", a: "string" }).or({
			kind: "'b'",
			b: "number"
		})
		attest(Tagged({ kind: "a", a: 5 }).toString()).snap(
			"a must be a string (was a number)"
		)
	})

	it("describes a unit case once", () => {
		let calls = 0
		const unit = {
			toJSON: () => {
				calls++
				return { tag: "u" }
			}
		}
		const $ = scope({})
		const T = $.type({ k: $.type.unit(unit) }).or({ k: "'b'", v: "number" })
		attest(T({ k: "c" }).toString()).snap(
			'k must be {"toJSON":"Function(toJSON)"} or "b" (was "c")'
		)
		const callsOnFirstMiss = calls
		T({ k: "c" })
		attest(calls).equals(callsOnFirstMiss)
	})
})
