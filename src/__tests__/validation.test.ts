import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { space, type } from "../api.js"

describe("space validation", () => {
    test("simple space", () => {
        const groceries = space({
            banana: {
                length: "number",
                description: "string"
            },
            apple: { circumference: "number", type: "string" },
            fruit: "banana|apple"
        })
        const list = type({ fruits: "fruit[]" }, { space: groceries })
        attest(
            list.check({
                fruits: [
                    { length: 10, description: "ripe" },
                    { circumference: 4.832321, type: "Granny Smith" },
                    { length: 15, description: "nice" }
                ]
            }).problems
        ).equals(undefined)
        attest(
            list.check({
                fruits: [
                    {
                        length: 5000,
                        type: "slippery"
                    },
                    { circumference: 3.14159, description: "Fuji" }
                ]
            }).problems?.summary
            // TODO: Fix
        ).snap(`<undefined>`)
    })
    test("cyclic space", () => {
        const bicycle = space({
            a: { "a?": "a", "b?": "b", isA: "true" },
            b: { "a?": "a", "b?": "b", isA: "false" },
            either: "a|b"
        })
        const bicyclic = type(
            { a: "a", b: "b", c: "either[]" },
            { space: bicycle }
        )
        attest(
            bicyclic.check({
                a: {
                    isA: true,
                    a: { isA: true },
                    b: { isA: false, a: { isA: true } }
                },
                b: { isA: false },
                c: [
                    { isA: false, a: { isA: true } },
                    { isA: true, b: { isA: false } }
                ]
            }).problems
        ).equals(undefined)
        attest(
            bicyclic.check({
                a: {
                    isA: true,
                    a: {
                        isA: true,
                        a: {
                            isA: true,
                            a: {
                                isA: true,
                                a: {
                                    isA: true,
                                    a: { isA: true, a: { isA: false } }
                                }
                            }
                        }
                    }
                },
                b: {
                    isA: false,
                    b: {
                        isA: false,
                        b: {
                            isA: false,
                            b: {
                                isA: false,
                                b: {
                                    isA: false,
                                    b: { isA: false, b: { isA: true } }
                                }
                            }
                        }
                    }
                },
                c: [
                    { isA: true },
                    { isA: false },
                    { isA: true },
                    { isA: false },
                    { isA: true },
                    { isA: false },
                    { isA: true },
                    { isA: false },
                    { isA: "the duck goes quack" }
                ]
            }).problems?.summary
        ).snap(`c/8 must be one of a|b (was {isA: "the duck goes quack"})`)
    })
    const recursive = space.lazy({ dejaVu: { "dejaVu?": "dejaVu" } })
    test("validates recursive objects", () => {
        type DejaVu = typeof recursive.$.infer.dejaVu
        const dejaVu: DejaVu = {}
        dejaVu.dejaVu = dejaVu
        attest(recursive.dejaVu.check(dejaVu).problems).equals(undefined)
    })
    test("validates deep objects", () => {
        const dejaVu: typeof recursive.$.infer.dejaVu = {}
        let i = 0
        let current = dejaVu
        while (i < 50) {
            current.dejaVu = { dejaVu: {} }
            current = current.dejaVu
            i++
        }
        attest(recursive.dejaVu.check(dejaVu).problems).equals(undefined)
        current.dejaVu = "whoops" as any
        attest(recursive.dejaVu.check(dejaVu).problems?.summary).snap(
            "dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu must be a non-array object (was string)"
        )
    })
})
