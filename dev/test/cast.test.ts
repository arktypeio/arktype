import { attest } from "@arktype/attest"
import { type } from "arktype"
import type { CastTo, Type } from "arktype"
import { suite, test } from "mocha"
import type { Constructor } from "../utils/src/objectKinds.js"

suite("inferred", () => {
    test("primitive", () => {
        attest(type("string" as CastTo<"foo">)).typed as Type<"foo">
    })
    test("object", () => {
        // definitions that are cast can't be validated
        attest(type({ a: "string" } as CastTo<{ a: "foo" }>)).typed as Type<{
            a: "foo"
        }>
    })
    test("primitive to object", () => {
        attest(type("string" as CastTo<{ a: "foo" }>)).typed as Type<{
            a: "foo"
        }>
    })
    test("object to primitive", () => {
        attest(type({ a: "string" } as CastTo<"foo">)).typed as Type<"foo">
    })
    test("infer function", () => {
        type F = () => boolean
        const constructable = type({} as CastTo<F>)
        attest(constructable).typed as Type<F>
        attest(constructable.infer).typed as F
        attest(constructable.inferIn).typed as F
    })
    test("infer constructable", () => {
        const constructable = type({} as CastTo<Constructor>)
        attest(constructable).typed as Type<Constructor>
        attest(constructable.infer).typed as Constructor
        attest(constructable.inferIn).typed as Constructor
    })
})
