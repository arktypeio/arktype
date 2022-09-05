import { bench } from "@re-/assert"
import { space } from "../../index.js"
import {
    cyclic10,
    cyclic100,
    cyclic250,
    cyclic50,
    cyclic500
} from "./generated/cyclic.js"

const recursive = space({ dejaVu: { dejaVu: "dejaVu?" } })
const dejaVu: typeof recursive.$root.infer.dejaVu = {}
let i = 0
let current = dejaVu
while (i < 50) {
    current.dejaVu = { dejaVu: {} }
    current = current.dejaVu
    i++
}
bench("validate recursive", () => {
    recursive.dejaVu.check(dejaVu)
}).median(`77.57us`)

bench("cyclic(10)", () => {
    const cyclic10Space = space(cyclic10)
})
    .median(`16.00us`)
    .type(`2053 instantiations`)

bench("cyclic(100)", () => {
    const cyclic100Space = space(cyclic100)
})
    .median(`186.09us`)
    .type(`9189 instantiations`)

bench("cyclic(500)", () => {
    const cyclic500Space = space(cyclic500)
})
    .median(`1.08ms`)
    .type(`41531 instantiations`)
