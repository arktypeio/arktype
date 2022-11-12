import { bench, suite } from "@arktype/test"
import { scope, type } from "../api.js"
import { cyclic10, cyclic100, cyclic500 } from "./generated/cyclic.js"

const recursive = scope({ dejaVu: { "dejaVu?": "dejaVu" } })
const dejaVu: typeof recursive.$.infer.dejaVu = {}
let i = 0
let current = dejaVu
while (i < 50) {
    current.dejaVu = { dejaVu: {} }
    current = current.dejaVu
    i++
}

suite("scope", () => {
    bench("validate recursive", () => {
        recursive.dejaVu.check(dejaVu)
    }).median()

    bench("cyclic(10)", () => {
        const cyclic10Scope = scope(cyclic10)
    })
        // .median()
        .type([2212, "instantiations"])

    bench("cyclic(100)", () => {
        const cyclic100Scope = scope(cyclic100)
    })
        // .median()
        .type([11919, "instantiations"])

    bench("cyclic(500)", () => {
        const cyclic500Scope = scope(cyclic500)
    })
        // .median()
        .type([53550, "instantiations"])
})
