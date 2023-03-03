import { describe, it } from "mocha"
import type { Type } from "../../src/main.ts"
import { scope, type } from "../../src/main.ts"
import { attest } from "../attest/main.ts"

// These need to be relocated to their proper test files
describe("Problems", () => {
    it("path.length === 1 && isWellFormedInteger(path[0])", () => {
        const t = type(["string"])
        attest(t([1]).problems?.summary).snap(
            "Item at index 0 must be a string (was number)"
        )
    })
})
