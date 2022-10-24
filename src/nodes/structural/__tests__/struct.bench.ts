import { bench, suite } from "@arktype/test"
import { type } from "../../../api.js"

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
            }).median()

            bench("invalid", () => {
                dict.check({
                    a: null,
                    c: { nested: null }
                })
            }).median()
        })
    })

    suite("tuple", () => {
        const tuple = type(["string?", "number?", ["boolean?"]])

        suite("check", () => {
            bench("valid", () => {
                tuple.check(["okay", 5, [true]])
            }).median()

            bench("invalid", () => {
                tuple.check([null, null, [null, null]])
            }).median()
        })
    })
})
