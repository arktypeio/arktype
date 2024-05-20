import { attest, contextualize } from "@arktype/attest"
import { scope, type } from "arktype"

contextualize(() => {
	it("2 literal branches", () => {
		// should not use a switch with <=2 branches to avoid visual clutter
		const t = type("'a'|'b'")
		attest(t.json).snap([{ unit: "a" }, { unit: "b" }])
		attest(t.raw.hasKind("union") && t.raw.discriminant?.json).snap({
			a: true,
			b: true
		})
		attest(t.allows("a")).equals(true)
		attest(t.allows("b")).equals(true)
		attest(t.allows("c")).equals(false)
	})
	it(">2 literal branches", () => {
		const t = type("'a'|'b'|'c'")
		attest(t.json).snap([{ unit: "a" }, { unit: "b" }, { unit: "c" }])
		attest(t.raw.hasKind("union") && t.raw.discriminant?.json).snap({
			a: true,
			b: true,
			c: true
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
		attest(t.raw.hasKind("union") && t.raw.discriminant?.json).snap()
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

	it("discriminate optional key", () => {
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
