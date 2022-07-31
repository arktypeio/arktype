import { bench } from "@re-/assert"
import { type } from "../../../type.js"

bench("single-bounded", () => {
    type("string>5").infer
}).type(`646 instantiations`)
bench("double-bounded", () => {
    type("-7<=integer<99").infer
}).type(`1067 instantiations`)
bench("single-bounded list", () => {
    type("object[]==1").infer
}).type(`783 instantiations`)
bench("double-bounded list", () => {
    type("-7>=unknown[]>99").infer
}).type(`1177 instantiations`)
bench("parenthesized list", () => {
    type("-7<=(string|number[]|boolean[][])[]<99").infer
}).type(`2930 instantiations`)
