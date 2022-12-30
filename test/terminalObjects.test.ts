import { describe, it } from "mocha"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("terminal objects", () => {
    it("regex", () => {
        const t = type(/.*/)
        attest(t.infer).typed as string
        attest(t.root).equals({ string: { regex: ".*" } })
    })
    // TODO: fix
    // it("type", () => {
    //     const t = type({
    //         a: type("string")
    //     })
    //     attest(t.infer).typed as { a: string }
    //     attest(t.root).equals({ object: { props: { a: "string" } } })
    // })
})
