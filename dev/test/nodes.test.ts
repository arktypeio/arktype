import { suite, test } from "mocha"
import { TypeNode } from "../../src/main.js"
import { attest } from "../attest/main.js"

suite("nodes", () => {
    test("cached", () => {
        attest(TypeNode.from({ basis: "string" })).is(
            TypeNode.from({ basis: "string" })
        )
    })
})
