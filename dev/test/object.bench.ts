import { type } from "#arktype"
import { bench } from "#attest"

bench("dictionary", () => {
    const dict = type({
        a: "string[]",
        b: "number[]",
        c: { nested: "boolean[]" }
    })
})
    // .median()
    .types([960, "instantiations"])

bench("dictionary with optional keys", () => {
    const dict = type({
        "a?": "string[]",
        "b?": "number[]",
        "c?": { "nested?": "boolean[]" }
    })
})
    // .median()
    .types([990, "instantiations"])

bench("tuple", () => {
    const tuple = type(["string[]", "number[]", ["boolean[]"]])
})
    // .median()
    .types([1320, "instantiations"])
