import { it } from "mocha"
import { type } from "../../src/main.js"
import { writeUnresolvableMessage } from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

describe("type references", () => {
    it("shallow type reference", () => {
        const t = type(type("boolean"))
        attest(t.infer).typed as boolean
    })

    it("bad shallow type reference", () => {
        attest(() => {
            // @ts-expect-error
            type(type("foolean"))
        }).throwsAndHasTypeError(writeUnresolvableMessage("foolean"))
    })

    it("deep type reference", () => {
        const t = type({ a: type("boolean") })
        attest(t.infer).typed as { a: boolean }
    })

    it("bad deep type reference", () => {
        attest(() => {
            // @ts-expect-error
            type({ a: type("goolean") })
        }).throwsAndHasTypeError(writeUnresolvableMessage("goolean"))
    })
})
