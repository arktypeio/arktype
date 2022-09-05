import { bench } from "@re-/assert"
import { type } from "../../../../index.js"

bench("single-bounded", () => {
    type("string>5").infer
})
    .median(`617.00ns`)
    .type(`676 instantiations`)

bench("double-bounded", () => {
    type("-7<=integer<99").infer
})
    .median(`1.43us`)
    .type(`950 instantiations`)

bench("single-bounded list", () => {
    type("object[]==1").infer
})
    .median(`927.00ns`)
    .type(`684 instantiations`)

bench("parenthesized list", () => {
    type("-7<=(string|number[]|boolean[][])[]<99").infer
})
    .median(`2.53us`)
    .type(`1807 instantiations`)
