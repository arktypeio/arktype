import { describe, it } from "mocha"
import { scope, type } from "../../src/main.js"
import { attest } from "../attest/main.js"

describe("autocomplete", () => {
    it("multiple suggestions", () => {
        // @ts-expect-error
        attest(() => type("s")).types.errors(`"string" | "symbol" | "semver"`)
    })
    it("single suggestion", () => {
        // @ts-expect-error
        attest(() => type("str")).types.errors(
            `Argument of type '"str"' is not assignable to parameter of type '"string"'`
        )
    })
    it("post-operator", () => {
        // @ts-expect-error
        attest(() => type("string|num")).types.errors(`"string|number"`)
    })
    it("in-scope", () => {
        attest(() => {
            scope({
                foobar: "string",
                // @ts-expect-error
                baz: "fo"
            }).compile()
        }).types.errors(`Type '"fo"' is not assignable to type '"foobar"'`)
    })
})
