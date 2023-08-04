import { describe, it } from "mocha"
import { scope, type } from "../../src/main.js"

const ab = { a: "1", b: 1 }
describe("= JSDoc =", () => {
    // Note: `<#` are not checked, they are for understandability
    it("objects keep JSDoc", () => {
        type({
            /** JSDoc */
            a: "string"
        }).assert(ab).a // <# JSDoc
    })
    it("intersections keep JSDoc", () => {
        type([
            {
                /** JSDoc */
                a: "string"
            },
            "&",
            {
                b: "number"
            }
        ]).assert(ab).a // <# JSDoc

        type([
            {
                /** First */
                a: "string"
            },
            "&",
            {
                /** Second */
                a: "string"
            }
        ]).assert(ab).a // <# First

        scope({
            a: {
                /** JSDoc */
                a: "string"
            },
            b: {
                b: "number"
            },
            ab: "a & b"
        })
            .compile()
            .ab.assert(ab).a // <# JSDoc
    })

    it("works with module scopes", () => {
        scope({
            /** JSDoc */
            a: "string"
        }).compile().a // <# JSDoc
    })

    it("doesn't work with optional keys", () => {
        type({
            /** JSDoc */
            "a?": "string"
        }).assert(ab).a // <# ---
    })
})
