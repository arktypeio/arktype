import { attest } from "@arktype/attest"
import { scope, type } from "arktype"
import { suite, test } from "mocha"

suite("discrimination", () => {
	test("2 literal branches", () => {
		// should not use a switch with <=2 branches to avoid visual clutter
		const t = type("'a'|'b'")
		attest(t.condition).snap(`if( $arkRoot !== "a" && $arkRoot !== "b") {
    return false
}`)
		attest(t.allows("a")).equals(true)
		attest(t.allows("b")).equals(true)
		attest(t.allows("c")).equals(false)
	})
	test(">2 literal branches", () => {
		const t = type("'a'|'b'|'c'")
		attest(t.condition).snap(`switch($arkRoot) {
        case "a":
    case "b":
    case "c":        break
    default:
        return false
}`)
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
	test("nested", () => {
		const t = getPlaces().type("ocean|sky|rainForest|desert")
		attest(t.condition).snap(`switch($arkRoot?.color) {
    case "blue": {
    switch($arkRoot?.climate) {
    case "dry": {
    

if (!($arkRoot.isSky === true)) {
            return false
}
     break
}case "wet": {
    

if (!($arkRoot.isOcean === true)) {
            return false
}
     break
}default: {
    return false
}
}
     break
}case "brown": {
    if (!($arkRoot.climate === "dry")) {
            return false
}

if (!($arkRoot.isDesert === true)) {
            return false
}
     break
}case "green": {
    if (!($arkRoot.climate === "wet")) {
            return false
}

if (!($arkRoot.isRainForest === true)) {
            return false
}
     break
}default: {
    return false
}
}`)
	})

	test("undiscriminable", () => {
		const t = getPlaces().type([
			"ocean",
			"|",
			{
				climate: "'wet'",
				color: "'blue'",
				indistinguishableFrom: "ocean"
			}
		])
	})
	test("doesn't discriminate optional key", () => {
		const t = type({
			direction: "'forward' | 'backward'",
			"operator?": "'by'"
		}).or({
			duration: "'s' | 'min' | 'h'",
			operator: "'to'"
		})
		attest(t.root.hasKind("union") && t.root.discriminant).equals(null)
	})
	test("default case", () => {
		const t = getPlaces().type([
			"ocean|rainForest",
			"|",
			{ temperature: "'hot'" }
		])
	})
	test("discriminable default", () => {
		const t = getPlaces().type([
			{ temperature: "'cold'" },
			"|",
			["ocean|rainForest", "|", { temperature: "'hot'" }]
		])
	})
	test("won't discriminate between possibly empty arrays", () => {
		const t = type("string[]|boolean[]")
	})
})
