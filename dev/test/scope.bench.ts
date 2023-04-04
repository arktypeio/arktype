import { scope } from "../../src/main.ts"
import { bench, suite } from "../attest/src/main.ts"
import { cyclic10, cyclic100, cyclic500 } from "./generated/cyclic.ts"

const recursive = scope({ dejaVu: { "dejaVu?": "dejaVu" } }).compile()
const dejaVu: typeof recursive.dejaVu.infer = {}
let i = 0
let current = dejaVu
while (i < 50) {
    current.dejaVu = { dejaVu: {} }
    current = current.dejaVu
    i++
}

suite("scope", () => {
    bench("validate recursive", () => {
        recursive.dejaVu(dejaVu)
    }).median([11.21, "us"])

    bench("cyclic(10)", () => {
        const types = scope(cyclic10).compile()
    })
        .median([47.02, "us"])
        .type([2467, "instantiations"])

    bench("cyclic(100)", () => {
        const types = scope(cyclic100).compile()
    })
        .median([417.71, "us"])
        .type([14599, "instantiations"])

    bench("cyclic(500)", () => {
        const types = scope(cyclic500).compile()
    })
        .median([2.62, "ms"])
        .type([66895, "instantiations"])
})
