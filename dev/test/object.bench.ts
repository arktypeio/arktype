import { type } from "../../src/main.js"
import { bench, suite } from "../attest/main.js"

suite("parse/struct", () => {
    bench("dictionary", () => {
        const dict = type({
            a: "string[]",
            b: "number[]",
            c: { nested: "boolean[]" }
        })
    })
        .median([20.83, "us"])
        .type([1704, "instantiations"])

    bench("dictionary with optional keys", () => {
        const dict = type({
            "a?": "string[]",
            "b?": "number[]",
            "c?": { "nested?": "boolean[]" }
        })
    })
        .median([21.23, "us"])
        .type([1704, "instantiations"])

    bench("tuple", () => {
        const tuple = type(["string[]", "number[]", ["boolean[]"]])
    })
        .median([28.6, "us"])
        .type([2739, "instantiations"])
})
