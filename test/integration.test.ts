import { describe, it } from "mocha"
import { attest } from "../dev/attest/exports.ts"
import { type } from "../exports.ts"

describe("branch", () => {
    it("intersection parsed before union", () => {
        // Should be parsed as:
        // 1. "0" | ("1"&"2") | "3"
        // 2. "0" | never | "3"
        // 3. "0" | "3"
        const t = type("'0'|'1'&'2'|'3'")
        attest(t.infer).typed as "0" | "3"
        attest(t.root).snap({ string: [{ value: "0" }, { value: "3" }] })
    })
})
