import { describe, it } from "mocha"
import type { Infer } from "../../src/parse/definition.js"
import type { Type } from "#arktype"
import { type } from "#arktype"
import { attest } from "#attest"

describe("cast", () => {
    it("primitive", () => {
        attest(type("string" as Infer<"foo">)).typed as Type<"foo">
    })
    it("object", () => {
        // definitions that are cast can't be validated
        attest(type({ a: "string" } as Infer<{ a: "foo" }>)).typed as Type<{
            a: "foo"
        }>
    })
    it("primitive to object", () => {
        attest(type("string" as Infer<{ a: "foo" }>)).typed as Type<{
            a: "foo"
        }>
    })
    it("object to primitive", () => {
        attest(type({ a: "string" } as Infer<"foo">)).typed as Type<"foo">
    })
})
