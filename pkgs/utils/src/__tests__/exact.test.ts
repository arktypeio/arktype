import { DeepEvaluate, Exact, ExactObject } from ".."
import { expectType } from "tsd"

describe("exact", () => {
    test("exact", () => {
        const noMatch = {} as DeepEvaluate<
            Exact<
                { a: "ok"; nested: { on: true } },
                { a: "hi"; nested: { on: false } }
            >
        >
        expectType<{ a: "hi"; nested: { on: false } }>(noMatch)
        const match = {} as DeepEvaluate<
            Exact<
                { a: "ok"; nested: { on: true } },
                { a: string; nested: { on: boolean } }
            >
        >
        expectType<{ a: "ok"; nested: { on: true } }>(match)
    })

    test("unions", () => {
        const subset = {} as DeepEvaluate<
            Exact<{ a: string | number }, { a: string | number | boolean }>
        >
        expectType<{ a: string | number }>(subset)
        const superset = {} as DeepEvaluate<
            Exact<{ a: string | number | boolean }, { a: string | number }>
        >
        expectType<{ a: string | number }>(superset)
    })

    test("optional", () => {
        const first = {} as DeepEvaluate<
            Exact<{ a: { nested: true } }, { a?: { nested: boolean } }>
        >
        expectType<{ a: { nested: true } }>(first)
    })
})

describe("exact object", () => {
    test("exact", () => {
        const noMatch = {} as DeepEvaluate<
            ExactObject<
                { a: "ok"; nested: { on: true } },
                { a: "hi"; nested: { on: false } }
            >
        >
        expectType<{ a: "hi"; nested: { on: false } }>(noMatch)
        const match = {} as DeepEvaluate<
            ExactObject<
                { a: "ok"; nested: { on: true } },
                { a: string; nested: { on: boolean } }
            >
        >
        expectType<{ a: "ok"; nested: { on: true } }>(match)
        const mixed = {} as DeepEvaluate<
            ExactObject<
                { a: string; nested: { on: true } },
                { a: "hi"; nested: { on: boolean } }
            >
        >
        expectType<{ a: "hi"; nested: { on: true } }>(mixed)
    })

    test("extra keys", () => {
        const result = {} as DeepEvaluate<
            ExactObject<
                { a: "hi"; nested: { a: "hello"; b: "hey"; c: "ayo" } },
                {
                    a?: string | boolean | undefined
                    nested?: { a?: string | number }
                }
            >
        >
        expectType<{
            a: "hi"
            nested: {
                a: "hello"
                b: "Invalid property 'b'. Valid properties are: a"
                c: "Invalid property 'c'. Valid properties are: a"
            }
        }>(result)
    })

    test("missing keys", () => {
        const result = {} as DeepEvaluate<
            ExactObject<
                { a: "hi"; nested: { a: "hello" } },
                {
                    a?: string | boolean | undefined
                    nested?: {
                        a: string | number
                        b: string | null
                        c: string | boolean
                    }
                    c: "this is required"
                }
            >
        >
        expectType<{
            a: "hi"
            nested: {
                a: "hello"
                b: string | null
                c: string | boolean
            }
            c: "this is required"
        }>(result)
    })

    test("any/unknown", () => {
        const first = {} as DeepEvaluate<Exact<{ a: any }, { a: string }>>
        expectType<{ a: string }>(first)
        const second = {} as DeepEvaluate<
            ExactObject<{ a: { b: "nested" } }, { a: unknown }>
        >
        expectType<{ a: { b: "nested" } }>(second)
    })

    test("unions", () => {
        const subset = {} as DeepEvaluate<
            ExactObject<
                { a: string | number },
                { a: string | number | boolean }
            >
        >
        expectType<{ a: string | number }>(subset)
        const superset = {} as DeepEvaluate<
            ExactObject<
                { a: string | number | boolean },
                { a: string | number }
            >
        >
        expectType<{ a: string | number }>(superset)
    })

    test("optional", () => {
        const first = {} as DeepEvaluate<
            ExactObject<{ a: { nested: "yar" } }, { a?: { nested: string } }>
        >
        expectType<{ a: { nested: "yar" } }>(first)
    })
})
