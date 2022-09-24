import { bench } from "@re-/assert"
import { space } from "../../../index.js"
import { cyclic10, cyclic100, cyclic500 } from "./generated/cyclic.js"

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
}).median()

bench("cyclic(10)", () => {
    const cyclic10Space = space(cyclic10)
})
    .median()
    .type()

bench("cyclic(100)", () => {
    const cyclic100Space = space(cyclic100)
})
    .median()
    .type()

bench("cyclic(500)", () => {
    const cyclic500Space = space(cyclic500)
})
    .median()
    .type()
