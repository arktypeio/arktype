import { describe, it } from "mocha"
import { scope, type } from "#arktype"
import { attest } from "#attest"

describe("autocomplete", () => {
    it("multiple suggestions", () => {
        // @ts-expect-error
        attest(() => type("s")).type.errors(`"string" | "symbol" | "semver"`)
    })
    it("single suggestion", () => {
        // @ts-expect-error
        attest(() => type("str")).type.errors(
            `Argument of type '"str"' is not assignable to parameter of type '"string"'`
        )
    })
    it("post-operator", () => {
        // @ts-expect-error
        attest(() => type("string|num")).type.errors(`"string|number"`)
    })
    it("in-scope", () => {
        attest(() => {
            scope({
                foobar: "string",
                // @ts-expect-error
                baz: "fo"
            }).compile()
        }).type.errors(`Type '"fo"' is not assignable to type '"foobar"'`)
    })
})
