import { suite, test } from "mocha"
import { scope, type } from "../../src/main.js"
import { attest } from "../attest/main.js"

suite("autocomplete", () => {
    test("multiple suggestions", () => {
        // @ts-expect-error
        attest(() => type("s")).types.errors(`"string" | "symbol" | "semver"`)
    })
    test("single suggestion", () => {
        // @ts-expect-error
        attest(() => type("str")).types.errors(
            `Argument of type '"str"' is not assignable to parameter of type '"string"'`
        )
    })
    test("post-operator", () => {
        // @ts-expect-error
        attest(() => type("string|num")).types.errors(`"string|number"`)
    })
    test("in-scope", () => {
        attest(() => {
            scope({
                foobar: "string",
                // @ts-expect-error
                baz: "fo"
            }).compile()
        }).types.errors(`Type '"fo"' is not assignable to type '"foobar"'`)
    })
    test("prefix", () => {
        // @ts-expect-error
        attest(type("k")).types.errors("keyof ")
    })
})
