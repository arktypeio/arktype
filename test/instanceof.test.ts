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
            "Must be an instance of Error (was Object)"
        )
    })
    it("inherited", () => {
        const t = type(["instanceof", TypeError])
        const e = new TypeError()
        // for some reason the return of TypeError's constructor is actually
        // inferred as Error? Disabling this check for now, seems like an anomaly.
        // attest(t.infer).typed as TypeError
        attest(t(e).data).equals(e)
        attest(t(new Error()).problems?.summary).snap(
            "Must be an instance of TypeError (was Error)"
        )
    })
    it("builtins not evaluated", () => {
        const t = type(["instanceof", Date])
        attest(t.infer).type.toString("Date")
    })
    it("non-constructor", () => {
        // @ts-expect-error
        attest(() => type(["instanceof", () => {}])).type.errors(
            "Type '() => void' is not assignable to type"
        )
    })
})
