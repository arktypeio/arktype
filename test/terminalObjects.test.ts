import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.ts"
import { type } from "../exports.ts"

describe("terminal objects", () => {
    test("regex", () => {
        const t = type(/.*/)
        attest(t.infer).typed as string
        attest(t.root).snap({ string: { regex: ".*" } })
    })
})
