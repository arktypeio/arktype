import { bench } from "@re-/assert"
import { type } from "../../../type.js"
import { Bound } from "../index.js"

bench("single-bounded", () => {
    type("string>5").infer
}).type(`669 instantiations`)
bench("double-bounded", () => {
    type("-7<=integer<99").infer
}).type(`1041 instantiations`)
bench("single-bounded list", () => {
    type("object[]==1").infer
}).type(`792 instantiations`)
bench("parenthesized list", () => {
    type("-7<=(string|number[]|boolean[][])[]<99").infer
}).type(`2817 instantiations`)
