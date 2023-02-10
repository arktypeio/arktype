import { describe, it } from "mocha"
import { type } from "../api.js"
import { attest } from "../dev/attest/api.js"
import { writeUnresolvableMessage } from "../src/parse/string/shift/operand/unenclosed.js"

describe("inferred", () => {
    it("shallow", () => {
        const t = type(type("boolean"))
        attest(t.infer).typed as boolean
        attest(() => {
            // @ts-expect-error
            type(type("foolean"))
        }).throwsAndHasTypeError(writeUnresolvableMessage("foolean"))
    })
    it("at path", () => {
        const t = type({ a: type("boolean") })
        attest(t.infer).typed as { a: boolean }
        attest(() => {
            // @ts-expect-error
            type({ a: type("goolean") })
        }).throwsAndHasTypeError(writeUnresolvableMessage("goolean"))
    })
    it("thunk", () => {
        const t = type(() => type("boolean"))
        attest(t.infer).typed as boolean
        attest(() => {
            // @ts-expect-error
            type(() => type("moolean"))
        }).throwsAndHasTypeError(writeUnresolvableMessage("moolean"))
    })
})
