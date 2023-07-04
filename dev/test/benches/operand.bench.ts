import { bench } from "../@arktype/attest"
import { scope, type } from "../arktype"

bench("single-quoted", () => {
    const _ = type("'nineteen characters'")
})
    .median([3.05, "us"])
    .types([502, "instantiations"])

bench("double-quoted", () => {
    const _ = type('"nineteen characters"')
})
    .median([3.13, "us"])
    .types([502, "instantiations"])

bench("regex literal", () => {
    const _ = type("/nineteen characters/")
})
    .median([4.18, "us"])
    .types([502, "instantiations"])

bench("keyword", () => {
    const _ = type("string")
})
    .median([1.44, "us"])
    .types([84, "instantiations"])

const $ = scope({ strung: "string" })
bench("alias", () => {
    const _ = $.type("strung")
})
    .median([1.54, "us"])
    .types([725, "instantiations"])

bench("number", () => {
    const _ = type("-98765.4321")
})
    .median([4.41, "us"])
    .types([415, "instantiations"])

bench("bigint", () => {
    const _ = type("-987654321n")
})
    .median()
    .types()
