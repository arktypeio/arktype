import { bench, suite } from "@re-/assert"
import { type } from "../../../index.js"

suite("struct", () => {
    suite("dictionary", () => {
        const dict = type({
            a: "string?",
            b: "number?",
            c: { nested: "boolean?" }
        })

        suite("check", () => {
            bench("valid", () => {
                dict.check({
                    a: "okay",
                    b: 5,
                    c: { nested: true }
                })
            }).median("496.00ns")

            bench("invalid", () => {
                dict.check({
                    a: null,
                    c: { nested: null }
                })
            }).median("1.30us")
        })
    })

    suite("tuple", () => {
        const tuple = type(["string?", "number?", ["boolean?"]])

        suite("check", () => {
            bench("valid", () => {
                tuple.check(["okay", 5, [true]])
            }).median("308.00ns")

            bench("invalid", () => {
                tuple.check([null, null, [null, null]])
            }).median("1.11us")
        })
    })
})
