import { attest, contextualize } from "@ark/attest"
import { registeredReference } from "@ark/schema"
import { scope, type } from "arktype"

contextualize(() => {
	it("2 literal branches", () => {
		// should not use a switch with <=2 branches to avoid needless convolution
		const T = type("'a'|'b'")
		attest(T.json).snap([{ unit: "a" }, { unit: "b" }])
		attest(T.internal.assertHasKind("union").discriminantJson).snap({
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
		attest(T.internal.assertHasKind("union").discriminantJson).snap({
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
		attest(T.internal.assertHasKind("union").discriminantJson).snap({
			kind: "domain",
			path: [],
			cases: { '"bigint"': true, '"number"': true, '"string"': true }
		})
		attest(T.allows("foo")).equals(true)
		attest(T.allows(5n)).equals(true)
		attest(T.allows(5)).equals(true)
		attest(T.allows(true)).equals(false)
	})

	it("literals can be included in domain branches", () => {
		const T = type("string|bigint|true")
		attest(T.json).snap(["bigint", "string", { unit: true }])
		attest(T.internal.assertHasKind("union").discriminantJson).snap({
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

		attest(climate.internal.assertHasKind("union").discriminantJson).snap({
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

		attest(T.internal.assertHasKind("union").discriminantJson).equals(null)
	})

	it("discriminate optional key", () => {
		const T = type({
			direction: "'forward' | 'backward'",
			"operator?": "'by'"
		}).or({
			duration: "'s' | 'min' | 'h'",
			operator: "'to'"
		})

		attest(T.internal.assertHasKind("union").discriminantJson).equals(null)
	})

	it("overlapping default case", () => {
		const T = getPlaces().type([
			"ocean|rainForest",
			"|",
			{ temperature: "'hot'" }
		])

		attest(T.internal.assertHasKind("union").discriminantJson).snap({
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

		attest(T.internal.assertHasKind("union").discriminantJson).snap({
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
		attest(T.internal.assertHasKind("union").discriminantJson).equals(null)
	})

	it("discriminant path including symbol", () => {
		const s = Symbol("lobmyS")
		const sRef = registeredReference(s)
		const T = type({ [s]: "0" }).or({ [s]: "1" })
		attest(T.internal.assertHasKind("union").discriminantJson).snap({
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

		attest(Union.discriminantJson).snap({
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

		attest(AorB.internal.assertHasKind("union").discriminantJson).snap({
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

		attest(AorB.internal.assertHasKind("union").discriminantJson).snap({
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

		attest(T.internal.assertHasKind("union").discriminantJson).snap({
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

		attest(T.internal.assertHasKind("union").discriminantJson).snap({
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

		const { discriminantJson } = T.select({
			kind: "union",
			method: "assertFind"
		})

		attest(discriminantJson).snap({
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

		const { discriminantJson } = T.select({
			kind: "union",
			method: "assertFind"
		})

		attest(discriminantJson).snap({
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
})
