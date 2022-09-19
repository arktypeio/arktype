import { bench } from "@re-/assert"
import { type } from "../../../../index.js"

bench("single-bounded", () => {
    type("string>5").infer
})
    .median(`591.00ns`)
    .type(`661 instantiations`)

bench("double-bounded", () => {
    type("-7<=integer<99").infer
})
    .median(`1.36us`)
    .type(`943 instantiations`)

bench("single-bounded list", () => {
    type("object[]==1").infer
})
    .median(`889.00ns`)
    .type(`665 instantiations`)

bench("parenthesized list", () => {
    type("-7<=(string|number[]|boolean[][])[]<99").infer
})
    .median(`2.26us`)
    .type(`1832 instantiations`)
