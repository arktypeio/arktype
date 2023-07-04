import { bench } from "@arktype/attest"
import { type } from "arktype"

bench("inline definition", () => {
    const _ = type({
        a: "string"
    })
}).types([194, "instantiations"])

bench("referenced type", () => {
    const a = type("string")
    const _ = type({
        a
    })
}).types([138, "instantiations"])

// https://github.com/arktypeio/arktype/issues/787
bench("inline reference", () => {
    const _ = type({
        a: type("string")
    })
}).types([5853, "instantiations"])
