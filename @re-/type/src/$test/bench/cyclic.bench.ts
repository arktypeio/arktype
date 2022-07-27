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
    .median(`35.23us`)
    .type(`1909 instantiations`)

bench("cyclic(50)", () => {
    const cyclic50Space = space(cyclic50)
})
    .median(`204.17us`)
    .type(`4955 instantiations`)

bench("cyclic(100)", () => {
    const cyclic100Space = space(cyclic100)
})
    .median(`428.02us`)
    .type(`8775 instantiations`)

bench("cyclic(250)", () => {
    const cyclic250Space = space(cyclic250)
})
    .median(`1.36ms`)
    .type(`20062 instantiations`)

bench("cyclic(500)", () => {
    const cyclic500Space = space(cyclic500)
})
    .median(`2.71ms`)
    .type(`39917 instantiations`)
