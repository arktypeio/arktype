import { bench, suite } from "@re-/assert"
import { type } from "../../../index.js"

suite("parse/obj", () => {
    bench("dictionary", () => {
        const dict = type({
            a: "string?",
            b: "number?",
            c: { nested: "boolean?" }
        })
    })
        .median("3.33us")
        .type("132in")

    bench("tuple", () => {
        const tuple = type(["string?", "number?", ["boolean?"]])
    })
        .median("2.31us")
        .type("486in")
})
