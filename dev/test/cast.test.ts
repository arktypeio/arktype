import { describe, it } from "mocha"
import type { Type } from "../../src/main.ts"
import { type } from "../../src/main.ts"
import type { cast } from "../../src/parse/definition.ts"
import { attest } from "../attest/main.ts"

describe("cast", () => {
    it("primitive", () => {
        attest(type("string" as cast<"foo">)).typed as Type<"foo">
    })
    it("object", () => {
        // definitions that are cast can't be validated
        attest(type({ a: "string" } as cast<{ a: "foo" }>)).typed as Type<{
            a: "foo"
        }>
    })
    it("primitive to object", () => {
        attest(type("string" as cast<{ a: "foo" }>)).typed as Type<{
            a: "foo"
        }>
    })
    it("object to primitive", () => {
        attest(type({ a: "string" } as cast<"foo">)).typed as Type<"foo">
    })
})
