import { attest, contextualize } from "@arktype/attest"
import { registeredReference } from "@arktype/util"
import { scope, type } from "arktype"

contextualize(() => {
	it("2 literal branches", () => {
		// should not use a switch with <=2 branches to avoid needless convolution
		const t = type("'a'|'b'")
		attest(t.json).snap([{ unit: "a" }, { unit: "b" }])
		attest(t.raw.hasKind("union") && t.raw.discriminantJson).snap({
			kind: "unit",
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
		attest(t.raw.hasKind("union") && t.raw.discriminantJson).snap({
			kind: "unit",
			path: [],
			cases: { '"a"': true, '"b"': true, '"c"': true }
		})
		attest(t.allows("a")).equals(true)
		attest(t.allows("b")).equals(true)
		attest(t.allows("c")).equals(true)
		attest(t.allows("d")).equals(false)
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
		attest(t.raw.hasKind("union") && t.raw.discriminantJson).snap({
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
		const t = getPlaces().type([
			"ocean",
			"|",
			{
				climate: "'wet'",
				color: "'blue'",
				indistinguishableFrom: "ocean"
			}
		])

		attest(t.raw.hasKind("union") && t.raw.discriminantJson).equals(null)
	})

	it("discriminate optional key", () => {
		const t = type({
			direction: "'forward' | 'backward'",
			"operator?": "'by'"
		}).or({
			duration: "'s' | 'min' | 'h'",
			operator: "'to'"
		})

		attest(t.raw.hasKind("union") && t.raw.discriminantJson).equals(null)
	})

	it("default case", () => {
		const t = getPlaces().type([
			"ocean|rainForest",
			"|",
			{ temperature: "'hot'" }
		])

		attest(t.raw.hasKind("union") && t.raw.discriminantJson).snap({
			kind: "unit",
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
		attest(t.raw.hasKind("union") && t.raw.discriminantJson).snap({
			kind: "unit",
			path: ["temperature"],
			cases: {
				'"cold"': true,
				'"hot"': true,
				default: {
					kind: "unit",
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
		attest(t.raw.hasKind("union") && t.raw.discriminantJson).equals(null)
	})

	it("discriminant path including symbol", () => {
		const s = Symbol("lobmyS")
		const sRef = registeredReference(s)
		const t = type({ [s]: "0" }).or({ [s]: "1" })
		attest(t.raw.hasKind("union") && t.raw.discriminantJson).snap({
			kind: "unit",
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
})
