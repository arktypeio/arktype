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
    .median(`17.97us`)
    .type(`1940 instantiations`)

bench("cyclic(50)", () => {
    const cyclic50Space = space(cyclic50)
})
    .median(`99.98us`)
    .type(`4986 instantiations`)

bench("cyclic(100)", () => {
    const cyclic100Space = space(cyclic100)
})
    .median(`203.16us`)
    .type(`8806 instantiations`)

bench("cyclic(250)", () => {
    const cyclic250Space = space(cyclic250)
})
    .median(`531.49us`)
    .type(`20093 instantiations`)

bench("cyclic(500)", () => {
    const cyclic500Space = space(cyclic500)
})
    .median(`1.22ms`)
    .type(`39948 instantiations`)
