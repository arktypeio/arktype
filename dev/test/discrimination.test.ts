import { describe, it } from "mocha"
import { scope, type } from "../../src/main.js"
import { attest } from "../attest/main.js"

describe("discrimination", () => {
    it("shallow", () => {
        const t = type("'a'|'b'|'c'")
        attest(t.allows.toString()).snap(`function anonymous($arkRoot
) {
return (() => {
        switch($arkRoot) {
            case "a": {
                return true;
            }case "b": {
                return true;
            }case "c": {
                return true;
            }
        }
    })()
}`)
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
    it("nestedd", () => {
        const t = getPlaces().type("ocean|sky|rainForest|desert")
        attest(t.root.key).snap(`(() => {
        switch($arkRoot.color) {
            case "blue": {
                return (() => {
        switch($arkRoot.climate) {
            case "wet": {
                return $arkRoot.isOcean === true;
            }case "dry": {
                return $arkRoot.isSky === true;
            }
        }
    })();
            }case "green": {
                return $arkRoot.climate === "wet" && $arkRoot.isRainForest === true;
            }case "brown": {
                return $arkRoot.climate === "dry" && $arkRoot.isDesert === true;
            }
        }
    })()`)
    })

    it("undiscriminatable", () => {
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
    it("default case", () => {
        const t = getPlaces().type([
            "ocean|rainForest",
            "|",
            { temperature: "'hot'" }
        ])
    })
    it("discriminatable default", () => {
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
