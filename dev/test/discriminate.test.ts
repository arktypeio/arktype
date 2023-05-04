import { describe, it } from "mocha"
import { scope, type } from "../../src/main.js"
import { attest } from "../attest/main.js"

// TODO: fix
describe("discriminate", () => {
    it("shallow", () => {
        const t = type("'a'|'b'|'c'")
        attest(t.allows.toString()).snap("[object Object]")
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
        switch($arkIn.color) {
            case 'blue': {
                return ($arkIn.climate === 'dry' && $arkIn.isSky === true || $arkIn.climate === 'wet' && $arkIn.isOcean === true);
            }case 'green': {
                return $arkIn.climate === 'wet' && $arkIn.isRainForest === true;
            }case 'brown': {
                return $arkIn.climate === 'dry' && $arkIn.isDesert === true;
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
    it("discriminate class", () => {
        const t = type([["instanceof", Array], "|", ["instanceof", Date]])
        // attest(t.flat).snap([
        //     ["domain", "object"],
        //     [
        //         "switch",
        //         { path: [], kind: "class", cases: { Array: [], Date: [] } }
        //     ]
        // ])
        // attest(t([]).data).equals([])
        // attest(t({}).problems?.summary).snap(
        //     "Must be an array or a Date (was {})"
        // )
    })
    it("won't discriminate between possibly empty arrays", () => {
        const t = type("string[]|boolean[]")
    })
})
