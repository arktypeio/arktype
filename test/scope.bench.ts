import { scope } from "../api.ts"
import { bench, suite } from "../dev/attest/api.ts"
import { cyclic10, cyclic100, cyclic500 } from "./generated/cyclic.ts"

// const recursive = scope({ dejaVu: { "dejaVu?": "dejaVu" } })
// const dejaVu: typeof recursive.$.infer.dejaVu = {}
// let i = 0
// let current = dejaVu
// while (i < 50) {
//     current.dejaVu = { dejaVu: {} }
//     current = current.dejaVu
//     i++
// }

suite("scope", () => {
    // TODO: Fix
    // bench("validate recursive", () => {
    //     recursive.dejaVu.check(dejaVu)
    // }).median()

    bench("cyclic(10)", () => {
        const cyclic10Space = scope(cyclic10).compile()
    })
        .median([35.48, "us"])
        .type([3065, "instantiations"])

    bench("cyclic(100)", () => {
        const cyclic100Space = scope(cyclic100).compile()
    })
        .median([348.78, "us"])
        .type([15197, "instantiations"])

    bench("cyclic(500)", () => {
        const cyclic500Space = scope(cyclic500).compile()
    })
        .median([2.31, "ms"])
        .type([67493, "instantiations"])
})
