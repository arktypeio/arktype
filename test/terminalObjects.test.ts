import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"

describe("terminal objects", () => {
    test("regex", () => {
        const t = type(/.*/)
        attest(t.infer).typed as string
        attest(t.root).snap({ string: { regex: ".*" } })
    })
})
