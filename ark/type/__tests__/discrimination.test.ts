// import { attest } from "@arktype/attest"
import { describe, it } from "vitest"
// import { scope, type } from "arktype"

describe("discrimination", () => {
	// it("2 literal branches", () => {
	// 	// should not use a switch with <=2 branches to avoid visual clutter
	// 	const t = type("'a'|'b'")
	// 	attest(t.json).snap({ unit: "a" })
	// 	attest(t.allows("a")).equals(true)
	// 	attest(t.allows("b")).equals(true)
	// 	attest(t.allows("c")).equals(false)
	// })
	// it(">2 literal branches", () => {
	// 	const t = type("'a'|'b'|'c'")
	// 	attest(t.json).snap({ unit: "a" })
	// 	attest(t.allows("a")).equals(true)
	// 	attest(t.allows("b")).equals(true)
	// 	attest(t.allows("c")).equals(true)
	// 	attest(t.allows("d")).equals(false)
	// })
	// const getPlaces = () =>
	// 	scope({
	// 		rainForest: {
	// 			climate: "'wet'",
	// 			color: "'green'",
	// 			isRainForest: "true"
	// 		},
	// 		desert: { climate: "'dry'", color: "'brown'", isDesert: "true" },
	// 		sky: { climate: "'dry'", color: "'blue'", isSky: "true" },
	// 		ocean: { climate: "'wet'", color: "'blue'", isOcean: "true" }
	// 	})
	// it("nested", () => {
	// 	const t = getPlaces().type("ocean|sky|rainForest|desert")
	// 	attest(t.json).snap()
	// })
	// it("undiscriminable", () => {
	// 	const t = getPlaces().type([
	// 		"ocean",
	// 		"|",
	// 		{
	// 			climate: "'wet'",
	// 			color: "'blue'",
	// 			indistinguishableFrom: "ocean"
	// 		}
	// 	])
	// })
	// it("doesn't discriminate optional key", () => {
	// 	const t = type({
	// 		direction: "'forward' | 'backward'",
	// 		"operator?": "'by'"
	// 	}).or({
	// 		duration: "'s' | 'min' | 'h'",
	// 		operator: "'to'"
	// 	})
	// 	attest(t.hasKind("union") && t.discriminant).equals(null)
	// })
	// it("default case", () => {
	// 	const t = getPlaces().type([
	// 		"ocean|rainForest",
	// 		"|",
	// 		{ temperature: "'hot'" }
	// 	])
	// })
	// it("discriminable default", () => {
	// 	const t = getPlaces().type([
	// 		{ temperature: "'cold'" },
	// 		"|",
	// 		["ocean|rainForest", "|", { temperature: "'hot'" }]
	// 	])
	// })
	// it("won't discriminate between possibly empty arrays", () => {
	// 	const t = type("string[]|boolean[]")
	// })
})
