import { suite, test } from "mocha"
import { node } from "../../src/nodes/type.js"
import { attest } from "../attest/main.js"

suite("nodes", () => {
    test("cached", () => {
        attest(node({ basis: "string" })).is(node({ basis: "string" }))
    })
})
