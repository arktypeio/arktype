import { bench, suite } from "@re-/assert"
import { narrow } from "@re-/tools"
import { type } from "../../../index.js"

suite("struct", () => {
    suite("dictionary", () => {
        const def = narrow({
            a: "string?",
            b: "number?",
            c: { nested: "boolean?" }
        })

        bench("parse", () => {
            const dict = type(def)
        })
            .median("3.43us")
            .type("132in")

        suite("check", () => {
            const preparsed = type(def)

            bench("valid", () => {
                preparsed.check({
                    a: "okay",
                    b: 5,
                    c: { nested: true }
                })
            }).median("507.00ns")

            bench("invalid", () => {
                preparsed.check({
                    a: null,
                    c: { nested: null }
                })
            }).median("1.32us")
        })
    })
    suite("tuple", () => {
        const def = narrow(["string?", "number?", ["boolean?"]])

        bench("parse", () => {
            const tuple = type(def)
        })
            .median("2.25us")
            .type("486in")

        suite("check", () => {
            const preparsed = type(def)

            bench("valid", () => {
                preparsed.check(["okay", 5, [true]])
            }).median("273.00ns")

            bench("invalid", () => {
                preparsed.check([null, null, [null, null]])
            }).median("1.10us")
        })
    })
})
