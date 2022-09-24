import { bench, suite } from "@re-/assert"
import { type } from "../../../index.js"

suite("terminal", () => {
    suite("literal", () => {
        const literal = type("64")

        suite("check", () => {
            bench("valid", () => {
                literal.check(64)
            }).median()

            bench("invalid", () => {
                literal.check(-64)
            }).median()
        })
    })

    suite("keyword", () => {
        const keyword = type("string")

        suite("check", () => {
            bench("valid", () => {
                keyword.check("chomsky")
            }).median()

            bench("invalid", () => {
                keyword.check(false)
            }).median()
        })
    })
})
