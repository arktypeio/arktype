import { bench } from "@re-/assert"
import { type } from "../../../../index.js"

bench("single-bounded", () => {
    type("string>5").infer
}).type(`676 instantiations`)
bench("double-bounded", () => {
    type("-7<=integer<99").infer
}).type(`950 instantiations`)
bench("single-bounded list", () => {
    type("object[]==1").infer
}).type(`684 instantiations`)
bench("parenthesized list", () => {
    type("-7<=(string|number[]|boolean[][])[]<99").infer
}).type(`1807 instantiations`)
