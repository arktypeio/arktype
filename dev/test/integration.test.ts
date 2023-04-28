import { describe, it } from "mocha"
import { type } from "#arktype"
import { attest } from "#attest"

describe("branch", () => {
    it("intersection parsed before union", () => {
        // Should be parsed as:
        // 1. "0" | ("1"&"string") | "2"
        // 2. "0" | "1" | "2"
        const t = type("'0'|'1'&string|'2'")
        attest(t.infer).typed as "0" | "1" | "2"
        attest(t.node).snap({
            string: [{ value: "0" }, { value: "1" }, { value: "2" }]
        })
    })
})
