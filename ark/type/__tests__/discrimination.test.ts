import { attest, contextualize } from "@ark/attest"
import { registeredReference } from "@ark/schema"
import { scope, type } from "arktype"

contextualize(() => {
	it("2 literal branches", () => {
		// should not use a switch with <=2 branches to avoid needless convolution
		const t = type("'a'|'b'")
		attest(t.json).snap([{ unit: "a" }, { unit: "b" }])
		attest(t.internal.hasKind("union") && t.internal.discriminantJson).snap({
			kind: "identity",
			path: [],
			cases: { '"a"': true, '"b"': true }
		})
		attest(t.allows("a")).equals(true)
		attest(t.allows("b")).equals(true)
		attest(t.allows("c")).equals(false)
	})

	it(">2 literal branches", () => {
		const t = type("'a'|'b'|'c'")
		attest(t.json).snap([{ unit: "a" }, { unit: "b" }, { unit: "c" }])
		attest(t.internal.hasKind("union") && t.internal.discriminantJson).snap({
			kind: "identity",
			path: [],
			cases: { '"a"': true, '"b"': true, '"c"': true }
		})
		attest(t.allows("a")).equals(true)
		attest(t.allows("b")).equals(true)
		attest(t.allows("c")).equals(true)
		attest(t.allows("d")).equals(false)
	})

	it(">2 domain branches", () => {
		const t = type("string|bigint|number")
		attest(t.json).snap(["bigint", "number", "string"])
		attest(t.internal.hasKind("union") && t.internal.discriminantJson).snap({
			kind: "typeOf",
			path: [],
			cases: { '"bigint"': true, '"number"': true, '"string"': true }
		})
		attest(t.allows("foo")).equals(true)
		attest(t.allows(5n)).equals(true)
		attest(t.allows(5)).equals(true)
		attest(t.allows(true)).equals(false)
	})

	it("literals can be included in domain branches", () => {
		const t = type("string|bigint|true")
		attest(t.json).snap(["bigint", "string", { unit: true }])
		attest(t.internal.hasKind("union") && t.internal.discriminantJson).snap({
			kind: "typeOf",
			path: [],
			cases: { '"bigint"': true, '"string"': true, '"boolean"': { unit: true } }
		})
		attest(t.allows("foo")).equals(true)
		attest(t.allows(5n)).equals(true)
		attest(t.allows(true)).equals(true)
		attest(t.allows(5)).equals(false)
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
		const t = $.type("ocean|sky|rainForest|desert")
		attest(t.internal.hasKind("union") && t.internal.discriminantJson).snap({
			kind: "identity",
			path: ["color"],
			cases: {
				'"blue"': {
					kind: "identity",
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
		const t = getPlaces().type([
			"ocean",
			"|",
			{
				climate: "'wet'",
				color: "'blue'",
				indistinguishableFrom: "ocean"
			}
		])

		attest(t.internal.hasKind("union") && t.internal.discriminantJson).equals(
			null
		)
	})

	it("discriminate optional key", () => {
		const t = type({
			direction: "'forward' | 'backward'",
			"operator?": "'by'"
		}).or({
			duration: "'s' | 'min' | 'h'",
			operator: "'to'"
		})

		attest(t.internal.hasKind("union") && t.internal.discriminantJson).equals(
			null
		)
	})

	it("default case", () => {
		const t = getPlaces().type([
			"ocean|rainForest",
			"|",
			{ temperature: "'hot'" }
		])

		attest(t.internal.hasKind("union") && t.internal.discriminantJson).snap({
			kind: "identity",
			path: ["color"],
			cases: {
				'"blue"': {
					required: [
						{ key: "climate", value: { unit: "wet" } },
						{ key: "isOcean", value: { unit: true } }
					]
				},
				'"green"': {
					required: [
						{ key: "climate", value: { unit: "wet" } },
						{ key: "isRainForest", value: { unit: true } }
					]
				},
				default: {
					required: [{ key: "temperature", value: { unit: "hot" } }],
					domain: "object"
				}
			}
		})
	})

	it("discriminable default", () => {
		const t = getPlaces().type([
			{ temperature: "'cold'" },
			"|",
			["ocean|rainForest", "|", { temperature: "'hot'" }]
		])
		attest(t.internal.hasKind("union") && t.internal.discriminantJson).snap({
			kind: "identity",
			path: ["temperature"],
			cases: {
				'"cold"': true,
				'"hot"': true,
				default: {
					kind: "identity",
					path: ["color"],
					cases: {
						'"blue"': {
							required: [
								{ key: "climate", value: { unit: "wet" } },
								{ key: "isOcean", value: { unit: true } }
							]
						},
						'"green"': {
							required: [
								{ key: "climate", value: { unit: "wet" } },
								{ key: "isRainForest", value: { unit: true } }
							]
						}
					}
				}
			}
		})
	})

	it("won't discriminate between possibly empty arrays", () => {
		const t = type("string[]|boolean[]")
		attest(t.internal.hasKind("union") && t.internal.discriminantJson).equals(
			null
		)
	})

	it("discriminant path including symbol", () => {
		const s = Symbol("lobmyS")
		const sRef = registeredReference(s)
		const t = type({ [s]: "0" }).or({ [s]: "1" })
		attest(t.internal.hasKind("union") && t.internal.discriminantJson).snap({
			kind: "identity",
			path: [sRef],
			cases: {
				"0": true,
				"1": true
			}
		})

		attest(t.allows({ [s]: 0 })).equals(true)
		attest(t.allows({ [s]: -1 })).equals(false)

		attest(t({ [s]: 1 })).equals({ [s]: 1 })
		attest(t({ [s]: 2 }).toString()).snap(
			"value at [Symbol(lobmyS)] must be 0 or 1 (was 2)"
		)
	})

	// https://github.com/arktypeio/arktype/issues/1100
	it("discriminated null + object", () => {
		const company = type({
			id: "number"
		}).or("string | null")

		attest(company(null)).equals(null)
		attest(company({ id: 1 })).equals({ id: 1 })
		attest(company("foo")).equals("foo")
		attest(company(5)?.toString()).snap("must be a number (was 5)")
	})

	it("differing inner discriminated paths", () => {
		const discriminated = type(
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

		const union = discriminated.internal.assertHasKind("union")

		attest(union.discriminantJson).snap({
			kind: "identity",
			path: ["innerB", "id"],
			cases: {
				"1": true,
				"2": true,
				default: {
					kind: "identity",
					path: ["innerA", "id"],
					cases: { "1": true, "2": true }
				}
			}
		})

		attest(union({ innerA: { id: 1 } })).equals({ innerA: { id: 1 } })
		attest(union({ innerB: { id: 1 } })).equals({ innerB: { id: 1 } })
		attest(union({ innerA: { id: 2 } })).equals({ innerA: { id: 2 } })
		attest(union({ innerB: { id: 2 } })).equals({ innerB: { id: 2 } })

		attest(union({})?.toString()).snap(
			"innerA.id must be 1 or 2 (was undefined)"
		)
	})
})
