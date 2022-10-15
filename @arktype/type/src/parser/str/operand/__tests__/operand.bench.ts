import { bench, suite } from "@arktype/assert"
import { space, type } from "../../../../api.js"

suite("parse/str/operand", () => {
    suite("enclosed", () => {
        bench("single-quoted", () => {
            const _ = type("'nineteen characters'")
        })
            .median()
            .type()
        bench("double-quoted", () => {
            const _ = type('"nineteen characters"')
        })
            .median()
            .type()
        bench("regex literal", () => {
            const _ = type("/nineteen characters/")
        })
            .median()
            .type()
    })
    suite("unenclosed", () => {
        bench("keyword", () => {
            const _ = type("string")
        })
            .median()
            .type()
        const spaceRoot = space({ strung: "string" }).$
        bench("alias", () => {
            const _ = spaceRoot.type("strung")
        })
            .median()
            .type()
        bench("number", () => {
            const _ = type("-98765.4321")
        })
            .median()
            .type()
        bench("bigint", () => {
            const _ = type("-987654321n")
        })
            .median()
            .type()
    })
})
