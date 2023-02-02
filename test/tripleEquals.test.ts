import { describe, it } from "mocha"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("===", () => {
    it("base", () => {
        const s = Symbol("test")
        const t = type(["===", s])
        attest(t.infer).typed as symbol
        attest(t.node).equals({ symbol: { value: s } })
        attest(t(s).data).equals(s)
        attest(t(Symbol("test")).problems?.summary).snap(
            "Must be (symbol test) (was (symbol test))"
        )
    })
})
