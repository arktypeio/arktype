import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import type { Inferred } from "../../src/parse/definition.js"
import type { Type } from "../../src/type.js"
import type { Constructor } from "../utils/src/objectKinds.js"
import { attest } from "../attest/main.js"

suite("inferred", () => {
    test("primitive", () => {
        attest(type("string" as Inferred<"foo">)).typed as Type<"foo">
    })
    test("object", () => {
        // definitions that are cast can't be validated
        attest(type({ a: "string" } as Inferred<{ a: "foo" }>)).typed as Type<{
            a: "foo"
        }>
    })
    test("primitive to object", () => {
        attest(type("string" as Inferred<{ a: "foo" }>)).typed as Type<{
            a: "foo"
        }>
    })
    test("object to primitive", () => {
        attest(type({ a: "string" } as Inferred<"foo">)).typed as Type<"foo">
    })
    test("infer function", () => {
        type F = () => boolean
        const constructable = type({} as Inferred<F>)
        attest(constructable).typed as Type<F>
        attest(constructable.infer).typed as F
        attest(constructable.inferIn).typed as F
    })
    test("infer constructable", () => {
        const constructable = type({} as Inferred<Constructor>)
        attest(constructable).typed as Type<Constructor>
        attest(constructable.infer).typed as Constructor
        attest(constructable.inferIn).typed as Constructor
    })
})
