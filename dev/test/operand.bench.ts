import { scope, type } from "../../src/main.js"
import { bench, suite } from "../attest/main.js"

suite("parse/str/operand", () => {
    suite("enclosed", () => {
        bench("single-quoted", () => {
            const _ = type("'nineteen characters'")
        })
            .median([3.05, "us"])
            .type([502, "instantiations"])
        bench("double-quoted", () => {
            const _ = type('"nineteen characters"')
        })
            .median([3.13, "us"])
            .type([502, "instantiations"])
        bench("regex literal", () => {
            const _ = type("/nineteen characters/")
        })
            .median([4.18, "us"])
            .type([502, "instantiations"])
    })
    suite("unenclosed", () => {
        bench("keyword", () => {
            const _ = type("string")
        })
            .median([1.44, "us"])
            .type([84, "instantiations"])
        const $ = scope({ strung: "string" })
        bench("alias", () => {
            const _ = $.type("strung")
        })
            .median([1.54, "us"])
            .type([725, "instantiations"])
        bench("number", () => {
            const _ = type("-98765.4321")
        })
            .median([4.41, "us"])
            .type([415, "instantiations"])
        bench("bigint", () => {
            const _ = type("-987654321n")
        })
            .median()
            .type()
    })
})
