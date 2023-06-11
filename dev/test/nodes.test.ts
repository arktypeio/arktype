import { suite, test } from "mocha"
import { node } from "../../src/nodes/composite/type.js"
import { attest } from "../attest/main.js"

suite("nodes", () => {
    // TODO: Moar
    test("cached", () => {
        attest(node({ basis: "string" })).is(node({ basis: "string" }))
    })
})
