import { attest, contextualize } from "@ark/attest"
import { registeredReference } from "@ark/schema"
import { scope, type, type ArkConfig } from "arktype"
import { discriminantJsonOf } from "arksets"

contextualize(() => {
	it("2 literal branches", () => {
		// should not use a switch with <=2 branches to avoid needless convolution
		const T = type("'a'|'b'")
		attest(T.json).snap([{ unit: "a" }, { unit: "b" }])
		attest(discriminantJsonOf(T.internal.assertHasKind("union"))).snap({
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
		attest(discriminantJsonOf(T.internal.assertHasKind("union"))).snap({
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
		attest(discriminantJsonOf(T.internal.assertHasKind("union"))).snap({
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
		attest(discriminantJsonOf(T.internal.assertHasKind("union"))).snap({
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
			'climate must be "dry" or "wet" (was undefined)'
		)

		attest(discriminantJsonOf(climate.internal.assertHasKind("union"))).snap({
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

		attest(discriminantJsonOf(T.internal.assertHasKind("union"))).equals(null)
	})

	it("discriminate optional key", () => {
		const T = type({
			direction: "'forward' | 'backward'",
			"operator?": "'by'"
		}).or({
			duration: "'s' | 'min' | 'h'",
			operator: "'to'"
		})

		attest(discriminantJsonOf(T.internal.assertHasKind("union"))).equals(null)
	})

	it("overlapping default case", () => {
		const T = getPlaces().type([
			"ocean|rainForest",
			"|",
			{ temperature: "'hot'" }
		])

		attest(discriminantJsonOf(T.internal.assertHasKind("union"))).snap({
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

		attest(discriminantJsonOf(T.internal.assertHasKind("union"))).snap({
			kind: "unit",
			path: ["color"],
			cases: {
				'"blue"': {
					kind: "unit",
					path: ["temperature"],
					cases: {
						'"cold"': true,
						'"hot"': true,
						default: {
							required: [
								{ key: "climate", value: { unit: "wet" } },
								{ key: "isOcean", value: { unit: true } }
							]
						}
					}
				},
				'"green"': {
					kind: "unit",
					path: ["temperature"],
					cases: {
						'"cold"': true,
						'"hot"': true,
						default: {
							required: [
								{ key: "climate", value: { unit: "wet" } },
								{ key: "isRainForest", value: { unit: true } }
							]
						}
					}
				},
				default: {
					kind: "unit",
					path: ["temperature"],
					cases: { '"cold"': true, '"hot"': true }
				}
			}
		})
	})

	it("won't discriminate between possibly empty arrays", () => {
		const T = type("string[]|boolean[]")
		attest(discriminantJsonOf(T.internal.assertHasKind("union"))).equals(null)
	})

	it("discriminant path including symbol", () => {
		const s = Symbol("lobmyS")
		const sRef = registeredReference(s)
		const T = type({ [s]: "0" }).or({ [s]: "1" })
		attest(discriminantJsonOf(T.internal.assertHasKind("union"))).snap({
			kind: "unit",
			path: [sRef],
			cases: {
				"0": true,
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

		const Union = Discriminated.internal.assertHasKind("union")

		attest(discriminantJsonOf(Union)).snap({
			kind: "unit",
			path: ["innerA", "id"],
			cases: {
				"1": true,
				"2": true,
				default: {
					kind: "unit",
					path: ["innerB", "id"],
					cases: { "1": true, "2": true }
				}
			}
		})

		attest(Union({ innerA: { id: 1 } })).equals({ innerA: { id: 1 } })
		attest(Union({ innerB: { id: 1 } })).equals({ innerB: { id: 1 } })
		attest(Union({ innerA: { id: 2 } })).equals({ innerA: { id: 2 } })
		attest(Union({ innerB: { id: 2 } })).equals({ innerB: { id: 2 } })

		attest(Union({})?.toString()).snap(
			"innerB.id must be 1 or 2 (was undefined)"
		)
	})

	it("allows strict discriminated keys", () => {
		const AorB = type({
			type: "'A'"
		})
			.or({
				type: "'B'"
			})
			.onUndeclaredKey("reject")

		attest(discriminantJsonOf(AorB.internal.assertHasKind("union"))).snap({
			kind: "unit",
			path: ["type"],
			cases: {
				'"A"': { undeclared: "reject", required: [{ key: "type", value: {} }] },
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

		attest(discriminantJsonOf(AorB.internal.assertHasKind("union"))).snap({
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
			.or({ id: "1", k1: "number" })
			.or({
				name: "string"
			})

		attest(discriminantJsonOf(T.internal.assertHasKind("union"))).snap({
			kind: "unit",
			path: ["id"],
			cases: {
				"0": [
					{ required: [{ key: "k1", value: "number" }] },
					{ required: [{ key: "name", value: "string" }] }
				],
				"1": [
					{ required: [{ key: "k1", value: "number" }] },
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
			.or({ id: "1", k1: "number" })
			.or({
				"+": "reject",
				name: "string"
			})

		attest(discriminantJsonOf(T.internal.assertHasKind("union"))).snap({
			kind: "unit",
			path: ["id"],
			cases: {
				"0": { required: [{ key: "k1", value: "number" }] },
				"1": { required: [{ key: "k1", value: "number" }] },
				default: {
					undeclared: "reject",
					required: [{ key: "name", value: "string" }],
					domain: "object"
				}
			}
		})

		// now that we are rejecting undeclared keys, all branches fail
		attest(T({ name: "foo", id: 1 }).toString()).snap(
			"k1 must be a number (was missing)"
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
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
			const T = $.type(["'x'", "string"])
				.or(["unknown", "undefined"])
				.or(["1", "object"])

			attest(T.allows(["x", undefined])).equals(true)
			attest(T(["x", undefined])).equals(["x", undefined])
		}
	})

	it("keeps a union at the discriminant path of an overlapping branch", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
			const T = $.type({ a: "string | number", b: "1 | 2" })
				.or({ a: "1", b: "string" })
				.or({ a: "string", b: "string" })

			attest(T.allows({ a: "x", b: 1 })).equals(true)
			attest(T({ a: "x", b: 1 })).equals({ a: "x", b: 1 })
		}
	})

	it("dimscrinate literal undefined value", () => {
		const T = type(["number[]", "|", ["undefined"]])

		attest(T.assert([])).equals([])
	})

	// https://github.com/arktypeio/arktype/issues/1547
	it("discriminates cyclic union on nested path", () => {
		for (const jitless of [false, true]) {
			const s = scope(
				{
					AChild: { type: "'AChild'", children: "(AParent)[] > 0" },
					AParent: { type: "'AParent'", children: "(AChild)[] > 0" },
					BChild: { type: "'BChild'", children: "unknown[]" },
					BParent: {
						type: "'BParent'",
						layout: "number[]",
						children: "(BChild)[] > 0"
					}
				},
				{ jitless }
			)

			const Thing = s.type("AParent | BParent")

			attest(discriminantJsonOf(Thing.internal.assertHasKind("union"))).equals({
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
			).snap("layout must be an array (was string)")
		}
	})

	it("discriminates neither a date nor NaN", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
			const T = $.type({ a: $.enumerated(new Date(0), Number.NaN, 1, 2) })
			const epoch = { a: new Date(0) }

			attest(T(epoch)).equals(epoch)
			attest(T({ a: Number.NaN })).equals({ a: Number.NaN })
			attest(T({ a: new Date(0).toISOString() }).toString()).snap(
				'a must be 1970, NaN, 1 or 2 (was "1970-01-01T00:00:00.000Z")'
			)
			attest($.type.enumerated(Number.NaN, "a", true)("c").toString()).snap(
				'must be NaN, "a" or true (was "c")'
			)
		}
	})

	it("case relates a unit to an object whose basis was pruned", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
			const T = $.type({ a: "string" })
				.or({ a: "1 | object", b: "1" })
				.or({ a: { c: "number" }, b: "2" })

			attest(T.allows({ a: 1, b: 1 })).equals(true)
			attest(T.allows({ a: { c: 0 }, b: 2 })).equals(true)
			attest(T.allows({ a: { c: 0 }, b: 3 })).equals(false)
		}
	})

	it("number case includes NaN and Infinity", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
			const T = $.type({ a: "number.NaN | number.Infinity | 'x'" })
				.or({ a: "object" })
				.or({ a: "3" })

			attest(T.allows({ a: Number.NaN })).equals(true)
			attest(T.allows({ a: Number.POSITIVE_INFINITY })).equals(true)
			attest(T.allows({ a: 4 })).equals(false)
		}
	})

	it("tuple element case includes a string at a key", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
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
		}
	})

	it("doesn't discriminate undefined at a path", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
			const T = $.type({ kind: "'c'", v: "undefined" }).or({
				kind: "'c'",
				v: "2"
			})

			attest(T({ kind: "c", v: undefined })).equals({ kind: "c", v: undefined })
			attest(T({ kind: "c" }).toString()).snap(
				"v must be undefined or 2 (was missing)"
			)
			attest(T(0).toString()).snap("must be an object (was a number)")
		}
	})

	it("primitive with discriminant key", () => {
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
			const T = $.type({ length: "3", x: "string" }).or({
				length: "4",
				y: "number"
			})

			attest(T({ length: 3, x: "" })).equals({ length: 3, x: "" })
			attest(T("abc").toString()).snap("must be an object (was a string)")
		}
	})

	it("object and symbol cases", () => {
		const o = {}
		const sym = Symbol("sym")
		for (const jitless of [false, true]) {
			const $ = scope({}, { jitless })
			const T = $.type({ a: $.enumerated(o, sym, 1) })

			attest(T({ a: o })).equals({ a: o })
			attest(T({ a: {} }).toString()).snap(
				"a must be 1, {} or Symbol(sym) (was {})"
			)
		}
	})

	it("rejected prop reads", () => {
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
		const A = type({ a: "string" })
		attest(reads(type({ v: A.or("null") }))).equals(reads(type({ v: A })))
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

	describe("misses", () => {
		it("have their own code and the discriminant's value", () => {
			for (const jitless of [false, true]) {
				const $ = scope({}, { jitless })
				const T = $.type({ k: "1.5", a: "string" }).or({
					k: "2.5",
					b: "number"
				})
				const errors = T({ k: 3.5 }) as type.errors
				attest(errors.summary).snap("k must be 1.5 or 2.5 (was 3.5)")
				attest(errors.issues[0].toJSON()).snap({
					data: 3.5,
					path: ["k"],
					code: "discriminant",
					discriminantKind: "unit",
					onKey: true,
					absent: false,
					description: "1.5 or 2.5",
					meta: {},
					expected: "1.5 or 2.5",
					actual: "3.5",
					problem: "must be 1.5 or 2.5 (was 3.5)",
					message: "k must be 1.5 or 2.5 (was 3.5)"
				})
			}
		})

		it("domain cases", () => {
			for (const jitless of [false, true]) {
				const $ = scope({}, { jitless })
				const T = $.type("string | number | bigint").or({ a: "1" })
				const errors = T(Symbol("domainCase")) as type.errors
				attest(errors.summary).snap(
					"must be a bigint, a number, a string or an object (was a symbol)"
				)
				const error = errors.issues[0]
				if (!error.hasCode("discriminant")) throw new Error()
				attest(error.discriminantKind).equals("domain")
				attest(error.cases).equals(["bigint", "number", "string", "object"])
				attest((T(true) as type.errors).summary).snap(
					"must be a bigint, a number, a string or an object (was boolean)"
				)
			}
		})

		it("unit cases are the units themselves", () => {
			const o = {}
			const sym = Symbol("unitCase")
			for (const jitless of [false, true]) {
				const $ = scope({}, { jitless })
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
				if (!error.hasCode("discriminant")) throw new Error()
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
			}
		})

		it("share frozen cases", () => {
			for (const jitless of [false, true]) {
				const T = scope({}, { jitless }).type("'a' | 'b' | 'c'")
				const first = (T("d") as type.errors).issues[0]
				const second = (T("e") as type.errors).issues[0]
				if (!first.hasCode("discriminant") || !second.hasCode("discriminant"))
					throw new Error()
				attest(first.cases).is(second.cases)
				attest(Object.isFrozen(first.cases)).equals(true)
			}
		})

		it("an absent key", () => {
			for (const jitless of [false, true]) {
				const $ = scope({}, { jitless })
				const T = $.type({ k: "'a'", x: "string" }).or({
					k: "'b'",
					y: "number"
				})
				const absent = (data: unknown) => {
					const error = (T(data) as type.errors).issues[0]
					if (!error.hasCode("discriminant")) throw new Error()
					return [error.absent, error.toString()]
				}
				attest(absent({})).snap([true, 'k must be "a" or "b" (was undefined)'])
				attest(absent({ k: undefined })).snap([
					false,
					'k must be "a" or "b" (was undefined)'
				])
				const Nested = $.type({ v: { k: "'a'", x: "string" } })
					.or({ v: { k: "'b'", y: "number" } })
					.or({ v: { k: "'c'" } })
				const nestedAbsent = (data: unknown) => {
					const error = (Nested(data) as type.errors).issues[0]
					return error.hasCode("discriminant") && error.absent
				}
				attest(nestedAbsent({})).equals(true)
				attest(nestedAbsent({ v: 5 })).equals(true)
				attest(nestedAbsent({ v: "abc" })).equals(true)
				attest(nestedAbsent({ v: { k: "d" } })).equals(false)
				// a key on Object.prototype is still absent below a missing parent
				const Proto = $.type({ v: { toString: "'a'", x: "string" } })
					.or({ v: { toString: "'b'", y: "number" } })
					.or({ v: { toString: "'c'" } })
				const error = (Proto({}) as type.errors).issues[0]
				attest(error.hasCode("discriminant") && error.absent).equals(true)
			}
		})

		it("keep their path when merged", () => {
			for (const jitless of [false, true]) {
				const $ = scope({}, { jitless })
				const Disc = $.type({ k: "'a'", x: "string" }).or({
					k: "'b'",
					y: "number"
				})
				const T = $.type({ v: $.type("object").pipe(o => Disc(o)) })
				const error = (T({ v: { k: "c" } }) as type.errors).issues[0]
				attest(error.toString()).snap('v.k must be "a" or "b" (was "c")')
				attest(error.transform(input => input).propString).equals("v.k")
			}
		})

		it("serialize with bigint cases", () => {
			for (const jitless of [false, true]) {
				const T = scope({}, { jitless })
					.type({ k: "1n", a: "string" })
					.or({ k: "2n", b: "number" })
				attest(JSON.parse(JSON.stringify(T({ k: "x" })))[0].message).snap(
					'k must be 1n or 2n (was "x")'
				)
			}
		})

		it("in an outer union, print the value at their path", () => {
			for (const jitless of [false, true]) {
				const $ = scope({}, { jitless })
				const Disc = $.type({ k: "'a'", x: "string" }).or({
					k: "'b'",
					y: "number"
				})
				const T = $.type({ v: Disc }).or({ v: { k: "string >= 5" } })
				attest(T({ v: { k: "c" } }).toString()).snap(
					'v.k must be "a" or "b" or at least length 5 (was "c")'
				)
			}
		})

		it("configured text", () => {
			const define = (config: ArkConfig) =>
				scope({}, config)
					.type({ kind: "'a'", x: "string" })
					.or({ kind: "'b'", y: "number" })
			for (const jitless of [false, true]) {
				const Configured = define({
					jitless,
					discriminant: {
						problem: ctx => `isn't one of ${ctx.cases.length}`
					}
				})
				attest(Configured({ kind: "c" }).toString()).snap("kind isn't one of 2")
				// the union's expected and actual describe the object, not its key
				const Described = define({ jitless }).configure({
					expected: "a known kind"
				})
				attest(Described({ kind: "c" }).toString()).snap(
					'kind must be "a" or "b" (was "c")'
				)
				const Actual = define({ jitless }).configure({
					actual: data => `<${Object.keys(data as object).length} keys>`
				})
				attest(Actual({ kind: "c" }).toString()).snap(
					'kind must be "a" or "b" (was "c")'
				)
				const Letter = scope({}, { jitless })
					.type("'a' | 'b' | 'c'")
					.configure({ expected: "a letter" })
				attest(Letter("d").toString()).snap('must be a letter (was "d")')
				const Predicate = define({
					jitless,
					predicate: { problem: "isn't valid" }
				})
				attest(Predicate({ kind: "c" }).toString()).snap(
					'kind must be "a" or "b" (was "c")'
				)
			}
		})
	})
})
