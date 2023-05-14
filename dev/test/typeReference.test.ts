import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { writeUnresolvableMessage } from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

suite("type references", () => {
    test("shallow type reference", () => {
        const t = type(type("boolean"))
        attest(t.infer).typed as boolean
    })

    test("bad shallow type reference", () => {
        attest(() => {
            // @ts-expect-error
            type(type("foolean"))
        }).throwsAndHasTypeError(writeUnresolvableMessage("foolean"))
    })

    // TODO: Why did this stop working if it's nested directly?
    // test("deep type reference", () => {
    //     const t = type({ a: type("boolean") })
    //     attest(t.infer).typed as { a: boolean }
    // })

    test("bad deep type reference", () => {
        attest(() => {
            // @ts-expect-error
            type({ a: type("goolean") })
        }).throwsAndHasTypeError(writeUnresolvableMessage("goolean"))
    })
})
