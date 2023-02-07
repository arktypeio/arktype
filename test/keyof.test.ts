import type { Type } from "../api.ts"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("keyof", () => {
    it("object literal", () => {
        const t = type(["keyof", { a: "123", b: "123" }])
        attest(t.infer).typed as "a" | "b"
        attest(t.node).snap({ string: [{ value: "a" }, { value: "b" }] })
    })
    it("overlapping union", () => {
        const t = type([
            "keyof",
            [{ a: "number", b: "boolean" }, "|", { b: "number", c: "string" }]
        ])
        attest(t.infer).typed as "b"
        attest(t.node).snap({ string: [{ value: "b" }] })
    })
    it("non-overlapping union", () => {
        const t = type(["keyof", [{ a: "number" }, "|", { b: "number" }]])
        attest(t).typed as Type<never>
        attest(t.node).snap({ string: [] })
    })
    it("non-object", () => {
        const t = type(["keyof", "string"])
        attest(t).typed as Type<never>
        attest(t.node).snap({ string: [] })
    })
    it("union including non-object", () => {
        const t = type(["keyof", [{ a: "number" }, "|", "string"]])
        attest(t).typed as Type<never>
        attest(t.node).snap({ string: [] })
    })
    it("tuple", () => {
        const t = type(["keyof", ["string", "number"]])
        attest(t.infer).typed as "0" | "1"
        attest(t.node).snap({ string: [{ value: "0" }, { value: "1" }] })
    })
    it("array", () => {
        // conservatively inferred as never pending https://github.com/arktypeio/arktype/issues/605
        const t = type(["keyof", "unknown[]"])
        attest(t).typed as Type<never>
        attest(t.node).snap({ string: [] })
    })
})
