import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import type { inferred } from "../src/parse/definition.ts"
import type { Out } from "../src/parse/tuple/morph.ts"
import type { Type } from "../src/type.ts"

describe("cast", () => {
    it("primitive", () => {
        attest(type("string" as inferred<"foo">)).typed as Type<"foo">
    })
    it("object", () => {
        // definitions that are cast can't be validated
        attest(type({ a: "string" } as inferred<{ a: "foo" }>)).typed as Type<{
            a: "foo"
        }>
    })
    it("primitive to object", () => {
        attest(type("string" as inferred<{ a: "foo" }>)).typed as Type<{
            a: "foo"
        }>
    })
    it("object to primitive", () => {
        attest(type({ a: "string" } as inferred<"foo">)).typed as Type<"foo">
    })
    // These may not be needed once the following is resolved:
    // https://github.com/arktypeio/arktype/issues/577
    it("function returns", () => {
        const types = scope({
            a: [{ a: "1" }, "=>", (data) => `${data}`],
            b: [{ a: "number" }, ":", (data) => data.a === 1, { a: "1" }]
        })
        attest(types.a).typed as Type<(In: { a: 1 }) => Out<string>>
        attest(types.b).typed as Type<{
            a: 1
        }>
        attest(types.a.node).snap({
            object: {
                input: { props: { a: { number: { value: 1 } } } },
                morph: "(function)"
            }
        })
        attest(types.b.node).snap({
            object: { props: { a: "number" }, narrow: "(function)" }
        })
    })
    it("errors on bad function return cast", () => {
        attest(() =>
            scope({
                // @ts-expect-error
                a: [{ a: "1" }, "=>", (data) => `${data}`, "boolean"]
            })
        ).type.errors("Type 'string' is not assignable to type 'boolean'.")
    })
})
