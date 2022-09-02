import { assert } from "@re-/assert"
import { narrow } from "@re-/tools"
import { describe, test } from "mocha"
import { space } from "../../index.js"

describe("validation", () => {
    test("simple space", () => {
        const groceries = space({
            banana: {
                length: "number",
                description: "string"
            },
            apple: { circumference: "number", type: "string" },
            fruit: "banana|apple"
        }).$root.type({ fruits: "fruit[]" })
        assert(
            groceries.check({
                fruits: [
                    { length: 10, description: "ripe" },
                    { circumference: 4.832321, type: "Granny Smith" },
                    { length: 15, description: "nice" }
                ]
            }).errors
        ).equals(undefined)
        assert(
            groceries.check({
                fruits: [
                    {
                        length: 5000,
                        type: "slippery"
                    },
                    { circumference: 3.14159, description: "Fuji" }
                ]
            }).errors?.summary
        ).snap(`Encountered errors at the following paths:
  fruits/0: {length: 5000, type: "slippery"} is not assignable to any of banana|apple.
  fruits/1: {circumference: 3.14159, description: "Fuji"} is not assignable to any of banana|apple.
`)
    })
    // TODO: Reenable
    test.skip("errors on shallow cycle", () => {
        // @ts-expect-error
        assert(() => space({ a: "a" })).throwsAndHasTypeError(
            `Error: a references a shallow cycle: a=>a.`
        )
        assert(() =>
            // @ts-expect-error
            space({ a: "b", b: "c", c: "a|b|c" })
        ).throwsAndHasTypeError(`a references a shallow cycle: a=>b=>c=>a`)
    })
    test("cyclic space", () => {
        const bicycle = space({
            a: { a: "a?", b: "b?", isA: "true" },
            b: { a: "a?", b: "b?", isA: "false" },
            either: "a|b"
        }).$root.type({ a: "a", b: "b", c: "either[]" })
        assert(
            bicycle.check({
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
            }).errors
        ).equals(undefined)
        assert(
            bicycle.check({
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
            }).errors?.summary
        ).snap(`Encountered errors at the following paths:
  a/a/a/a/a/a/a/isA: false is not assignable to true.
  b/b/b/b/b/b/b/isA: true is not assignable to false.
  c/8: {isA: "the duck goes quack"} is not assignable to any of a|b.
`)
    })
    const recursiveDict = narrow({ dejaVu: { dejaVu: "dejaVu?" } })
    test("validates recursive objects", () => {
        const recursive = space(recursiveDict)
        type DejaVu = typeof recursive.$root.infer.dejaVu
        const dejaVu: DejaVu = {}
        dejaVu.dejaVu = dejaVu
        assert(recursive.dejaVu.check(dejaVu).errors).equals(undefined)
    })
    test("validates deep objects", () => {
        const recursive = space(recursiveDict)
        const dejaVu: typeof recursive.$root.infer.dejaVu = {}
        let i = 0
        let current = dejaVu
        while (i < 50) {
            current.dejaVu = { dejaVu: {} }
            current = current.dejaVu
            i++
        }
        assert(recursive.dejaVu.check(dejaVu).errors).equals(undefined)
        current.dejaVu = "whoops" as any
        assert(recursive.dejaVu.check(dejaVu).errors?.summary)
            .snap(`At path dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu, "whoops" is not assignable to {
    dejaVu: dejaVu?
}.`)
    })
})
