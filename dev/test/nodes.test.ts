import { suite, test } from "mocha"
import { node } from "../../src/nodes/composite/type.js"
import { attest } from "../attest/main.js"

suite("nodes", () => {
    // TODO: add tests for other node kinds if we keep this design
    test("cached", () => {
        attest(node({ basis: "string" })).is(node({ basis: "string" }))
    })
})
