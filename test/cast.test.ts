import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import type { inferred } from "../src/parse/definition.ts"
import type { Out } from "../src/parse/tuple/morph.ts"
import type { Type } from "../src/type.ts"

describe("cast", () => {
    it("base", () => {
        const t = type("string" as inferred<"foo">)
        attest(t.infer).typed as "foo"
        attest(t.node).snap({ string: true })
    })
    // These may not be needed once the following is resolved:
    // https://github.com/arktypeio/arktype/issues/577
    it("function returns", () => {
        const types = scope({
            a: [{ a: "1" }, "=>", (data) => `${data}`, "string"],
            b: [{ a: "number" }, ":", (data) => data.a === 1, { a: "1" }]
        })
        attest(types.a).typed as Type<(In: { a: 1 }) => Out<string>>
        attest(types.b).typed as Type<{
            a: 1
        }>
        attest(types.a.node).snap({
            input: { object: { props: { a: { number: { value: 1 } } } } },
            morph: "<function>"
        })
        attest(types.b.node).snap({
            object: { props: { a: "number" }, narrow: "<function>" as any }
        })
    })
})
