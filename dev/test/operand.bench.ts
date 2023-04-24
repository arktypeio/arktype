import { scope, type } from "#arktype"
import { bench } from "#attest"

bench("single-quoted", () => {
    const _ = type("'nineteen characters'")
})
    .median([1.61, "us"])
    .types([558, "instantiations"])
bench("double-quoted", () => {
    const _ = type('"nineteen characters"')
})
    .median([1.48, "us"])
    .types([558, "instantiations"])
bench("regex literal", () => {
    const _ = type("/nineteen characters/")
})
    .median([1.73, "us"])
    .types([558, "instantiations"])
bench("keyword", () => {
    const _ = type("string")
})
    .median([1, "us"])
    .types([156, "instantiations"])
const $ = scope({ strung: "string" })
bench("alias", () => {
    const _ = $.type("strung")
})
    .median([1.11, "us"])
    .types([1230, "instantiations"])
bench("number", () => {
    const _ = type("-98765.4321")
})
    .median([1.5, "us"])
    .types([482, "instantiations"])
bench("bigint", () => {
    const _ = type("-987654321n")
})
    .median([1.5, "us"])
    .types([489, "instantiations"])
