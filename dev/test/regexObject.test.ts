import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { attest } from "../attest/main.js"

suite("regex object", () => {
    test("parse", () => {
        const t = type(/.*/)
        attest(t.infer).typed as string
        // attest(t.node).equals({ string: { regex: ".*" } })
    })
})
