import { assert } from "@re-/assert"
import { space } from "../../src/index.js"

describe("validation", () => {
    it("simple space", () => {
        const groceries = space({
            banana: {
                length: "number",
                description: "string?"
            },
            apple: { circumference: "number", type: "string" },
            fruit: "banana|apple"
        }).$meta.model({ fruits: "fruit[]" })
        assert(
            groceries.validate({
                fruits: [
                    { length: 10 },
                    { circumference: 4.832_321, type: "Granny Smith" },
                    { length: 15, description: "nice" }
                ]
            }).error
        ).equals(undefined)
        assert(
            groceries.validate({
                fruits: [
                    {
                        length: 5000,
                        description: "I'm a big banana!",
                        peel: "slippery"
                    },
                    { type: "Fuji" }
                ]
            }).error?.message
        ).snap(`Encountered errors at the following paths:
  fruits/0: {length: 5000, description: "I'm a big banana!", peel: "slippery"} is not assignable to any of banana|apple.
  fruits/1: {type: "Fuji"} is not assignable to any of banana|apple.
`)
    })
    it("errors on shallow cycle", () => {
        // @ts-expect-error
        assert(() => space({ a: "a" })).throwsAndHasTypeError(
            `Error: a references a shallow cycle: a=>a.`
        )
        assert(() =>
            // @ts-expect-error
            space({ a: "b", b: "c", c: "a|b|c" })
        ).throwsAndHasTypeError(`a references a shallow cycle: a=>b=>c=>a`)
    })
    it("cyclic space", () => {
        const bicycle = space({
            a: { a: "a?", b: "b?", isA: "true" },
            b: { a: "a?", b: "b?", isA: "false" },
            either: "a|b"
        }).$meta.model({ a: "a", b: "b", c: "either[]" })
        assert(
            bicycle.validate({
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
            }).error
        ).equals(undefined)
        assert(
            bicycle.validate({
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
            }).error?.message
        ).snap(`Encountered errors at the following paths:
  a/a/a/a/a/a/a/isA: false is not assignable to true.
  b/b/b/b/b/b/b/isA: true is not assignable to false.
  c/8: {isA: "the duck goes quack"} is not assignable to any of a|b.
`)
    })
    const recursiveDict = { dejaVu: { dejaVu: "dejaVu?" } } as const
    it("validates recursive objects", () => {
        const recursive = space(recursiveDict)
        type DejaVu = typeof recursive.$meta.types.dejaVu
        const dejaVu: DejaVu = {}
        dejaVu.dejaVu = dejaVu
        assert(recursive.dejaVu.validate(dejaVu).error).equals(undefined)
    })
    it("validates deep objects", () => {
        const recursive = space(recursiveDict)
        const dejaVu: typeof recursive.$meta.types.dejaVu = {}
        let i = 0
        let current = dejaVu
        while (i < 50) {
            current.dejaVu = { dejaVu: {} }
            current = current.dejaVu
            i++
        }
        assert(recursive.dejaVu.validate(dejaVu).error).equals(undefined)
        current.dejaVu = "whoops" as any
        assert(recursive.dejaVu.validate(dejaVu).error?.message)
            .snap(`At path dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu/dejaVu, "whoops" is not assignable to {
    dejaVu: dejaVu?
}.`)
    })
})
