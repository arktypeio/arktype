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
    .median(`17.03us`)
    .type(`1914 instantiations`)

bench("cyclic(50)", () => {
    const cyclic50Space = space(cyclic50)
})
    .median(`93.10us`)
    .type(`4960 instantiations`)

bench("cyclic(100)", () => {
    const cyclic100Space = space(cyclic100)
})
    .median(`191.24us`)
    .type(`8780 instantiations`)

bench("cyclic(250)", () => {
    const cyclic250Space = space(cyclic250)
})
    .median(`503.93us`)
    .type(`20067 instantiations`)

bench("cyclic(500)", () => {
    const cyclic500Space = space(cyclic500)
})
    .median(`1.07ms`)
    .type(`39922 instantiations`)
