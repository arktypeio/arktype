import { bench, suite } from "@re-/assert"
import { type } from "../../../api.js"

suite("parse/obj", () => {
    bench("dictionary", () => {
        const dict = type({
            a: "string?",
            b: "number?",
            c: { nested: "boolean?" }
        })
    })
        .median()
        .type()

    bench("tuple", () => {
        const tuple = type(["string?", "number?", ["boolean?"]])
    })
        .median()
        .type()
})
