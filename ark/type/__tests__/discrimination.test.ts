import { attest, contextualize } from "@arktype/attest"
import { scope, type } from "arktype"

contextualize(() => {
	it("2 literal branches", () => {
		// should not use a switch with <=2 branches to avoid visual clutter
		const t = type("'a'|'b'")
		attest(t.json).snap({ unit: "a" })
		attest(t.allows("a")).equals(true)
		attest(t.allows("b")).equals(true)
		attest(t.allows("c")).equals(false)
	})
	it(">2 literal branches", () => {
		const t = type("'a'|'b'|'c'")
		attest(t.json).snap({ unit: "a" })
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
		const t = getPlaces().type("ocean|sky|rainForest|desert")
		attest(t.raw.hasKind("union") && t.raw.discriminant?.json).snap({
			"$ark.fn2": [
				{
					required: [
						{ key: "climate", value: { unit: "dry" } },
						{ key: "color", value: { unit: "blue" } },
						{ key: "isSky", value: { unit: true } }
					],
					domain: "object"
				},
				{
					required: [
						{ key: "climate", value: { unit: "wet" } },
						{ key: "color", value: { unit: "blue" } },
						{ key: "isOcean", value: { unit: true } }
					],
					domain: "object"
				}
			],
			"$ark.fn4": {
				required: [
					{ key: "climate", value: { unit: "dry" } },
					{ key: "color", value: { unit: "brown" } },
					{ key: "isDesert", value: { unit: true } }
				],
				domain: "object"
			},
			"$ark.fn3": {
				required: [
					{ key: "climate", value: { unit: "wet" } },
					{ key: "color", value: { unit: "green" } },
					{ key: "isRainForest", value: { unit: true } }
				],
				domain: "object"
			}
		})
	})

	it("undiscriminable", () => {
		const t = getPlaces().type([
			"ocean",
			"|",
			{
				climate: "'wet'",
				color: "'blue'",
				indistinguishableFrom: "ocean"
			}
		])

		attest(t.raw.hasKind("union") && t.raw.discriminant?.json).equals(undefined)
	})

	it("doesn't discriminate optional key", () => {
		const t = type({
			direction: "'forward' | 'backward'",
			"operator?": "'by'"
		}).or({
			duration: "'s' | 'min' | 'h'",
			operator: "'to'"
		})

		attest(t.raw.hasKind("union") && t.raw.discriminant?.json).equals(undefined)
	})

	it("default case", () => {
		const t = getPlaces().type([
			"ocean|rainForest",
			"|",
			{ temperature: "'hot'" }
		])
	})

	it("discriminable default", () => {
		const t = getPlaces().type([
			{ temperature: "'cold'" },
			"|",
			["ocean|rainForest", "|", { temperature: "'hot'" }]
		])
	})
	it("won't discriminate between possibly empty arrays", () => {
		const t = type("string[]|boolean[]")
	})
})
