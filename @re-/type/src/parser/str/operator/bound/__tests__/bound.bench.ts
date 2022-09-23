import { bench } from "@re-/assert"
import { type } from "../../../../../index.js"

bench("single-bounded", () => {
    type("string>5").infer
})
    .median(`641.00ns`)
    .type(`664in`)

bench("double-bounded", () => {
    type("-7<=integer<99").infer
})
    .median(`1.45us`)
    .type(`946in`)

bench("single-bounded list", () => {
    type("object[]==1").infer
})
    .median(`909.00ns`)
    .type(`665in`)

bench("parenthesized list", () => {
    type("-7<=(string|number[]|boolean[][])[]<99").infer
})
    .median(`2.85us`)
    .type(`1833in`)
