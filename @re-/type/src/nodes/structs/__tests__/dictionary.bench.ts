import { bench, suite } from "@re-/assert"
import { narrow } from "@re-/tools"
import { type } from "../../../index.js"

const def = narrow({
    a: "string?",
    b: "number?",
    c: { nested: "boolean?" }
})

suite("dictionary", () => {
    bench("parse", () => {
        const dict = type(def)
    })
        .median("3.65us")
        .type("226in")
    suite("check", () => {
        const preparsed = type(def)
        bench("valid", () => {
            preparsed.check({
                a: "okay",
                b: 5,
                c: { nested: true }
            })
        }).median("488.00ns")
        bench("invalid", () => {
            preparsed.check({
                a: 5,
                b: 5,
                c: { nested: true }
            })
        }).median("1.19us")
    })
})
