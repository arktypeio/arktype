import { bench } from "@re-/assert"
import { space } from "../../index.js"
import {
    cyclic10,
    cyclic100,
    cyclic250,
    cyclic50,
    cyclic500
} from "./generated/cyclic.js"

bench("cyclic(10)", () => {
    const cyclic10Space = space(cyclic10)
})
    .median(`16.00us`)
    .type(`2053 instantiations`)

bench("cyclic(50)", () => {
    const cyclic50Space = space(cyclic50)
})
    .median(`88.55us`)
    .type(`5219 instantiations`)

bench("cyclic(100)", () => {
    const cyclic100Space = space(cyclic100)
})
    .median(`186.09us`)
    .type(`9189 instantiations`)

bench("cyclic(250)", () => {
    const cyclic250Space = space(cyclic250)
})
    .median(`511.60us`)
    .type(`20926 instantiations`)

bench("cyclic(500)", () => {
    const cyclic500Space = space(cyclic500)
})
    .median(`1.08ms`)
    .type(`41531 instantiations`)
