import { type } from "arktype"
import { bench, suite } from "./main.ts"

suite("parse/struct", () => {
    bench("dictionary", () => {
        const dict = type({
            a: "string[]",
            b: "number[]",
            c: { nested: "boolean[]" }
        })
    })
        // .median()
        .type([960, "instantiations"])
})
