import { describe, it } from "mocha"
import { type } from "../../src/main.js"
import { attest } from "../attest/main.js"

describe("regex object", () => {
    it("parse", () => {
        const t = type(/.*/)
        attest(t.infer).typed as string
        // attest(t.node).equals({ string: { regex: ".*" } })
    })
})
