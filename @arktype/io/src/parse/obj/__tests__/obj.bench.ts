import { bench, suite } from "@arktype/assert"
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
