import { describe, it } from "mocha"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("instanceof", () => {
    it("base", () => {
        const t = type(["instanceof", Error])
        attest(t.infer).typed as Error
        attest(t.node).equals({ object: { class: Error } })
        const e = new Error()
        attest(t(e).data).equals(e)
        attest(t({}).problems?.summary).snap(
            "Must be an instance of Error (got Object)"
        )
    })
    it("inherited", () => {
        const t = type(["instanceof", TypeError])
        const e = new TypeError()
        attest(t(e).data).equals(e)
        attest(t(new Error()).problems?.summary).snap(
            "Must be an instance of TypeError (got Error)"
        )
    })
})
