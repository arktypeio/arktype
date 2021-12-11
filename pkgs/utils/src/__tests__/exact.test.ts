import { DeepEvaluate, Exact, ExactObject } from ".."
import { assert } from "@re-do/assert"

describe("exact", () => {
    test("exact", () => {
        assert(
            {} as DeepEvaluate<
                Exact<
                    { a: "ok"; nested: { on: true } },
                    { a: "hi"; nested: { on: false } }
                >
            >
        ).typed as {
            a: "hi"
            nested: {
                on: false
            }
        }
        assert(
            {} as DeepEvaluate<
                Exact<
                    { a: "ok"; nested: { on: true } },
                    { a: string; nested: { on: boolean } }
                >
            >
        ).typed as { a: "ok"; nested: { on: true } }
    })

    test("unions", () => {
        assert(
            {} as DeepEvaluate<
                Exact<{ a: string | number }, { a: string | number | boolean }>
            >
        ).typed as { a: string | number }
        assert(
            {} as DeepEvaluate<
                Exact<{ a: string | number | boolean }, { a: string | number }>
            >
        ).typed as { a: string | number }
    })

    test("optional", () => {
        assert(
            {} as DeepEvaluate<
                Exact<{ a: { nested: true } }, { a?: { nested: boolean } }>
            >
        ).typed as { a: { nested: true } }
    })
})

describe("exact object", () => {
    test("exact", () => {
        assert(
            {} as DeepEvaluate<
                ExactObject<
                    { a: "ok"; nested: { on: true } },
                    { a: "hi"; nested: { on: false } }
                >
            >
        ).typed as { a: "hi"; nested: { on: false } }
        assert(
            {} as DeepEvaluate<
                ExactObject<
                    { a: "ok"; nested: { on: true } },
                    { a: string; nested: { on: boolean } }
                >
            >
        ).typed as { a: "ok"; nested: { on: true } }
        assert(
            {} as DeepEvaluate<
                ExactObject<
                    { a: string; nested: { on: true } },
                    { a: "hi"; nested: { on: boolean } }
                >
            >
        ).typed as { a: "hi"; nested: { on: true } }
    })

    test("extra keys", () => {
        assert(
            {} as DeepEvaluate<
                ExactObject<
                    { a: "hi"; nested: { a: "hello"; b: "hey"; c: "ayo" } },
                    {
                        a?: string | boolean | undefined
                        nested?: { a?: string | number }
                    }
                >
            >
        ).typed as {
            a: "hi"
            nested: {
                a: "hello"
                b: "Invalid property 'b'. Valid properties are: a"
                c: "Invalid property 'c'. Valid properties are: a"
            }
        }
    })

    test("missing keys", () => {
        assert(
            {} as DeepEvaluate<
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
        ).typed as {
            a: "hi"
            nested: {
                a: "hello"
                b: string | null
                c: string | boolean
            }
            c: "this is required"
        }
    })

    test("any/unknown", () => {
        assert({} as DeepEvaluate<Exact<{ a: any }, { a: string }>>).typed as {
            a: string
        }
        assert(
            {} as DeepEvaluate<
                ExactObject<{ a: { b: "nested" } }, { a: unknown }>
            >
        ).typed as { a: { b: "nested" } }
    })

    test("unions", () => {
        assert(
            {} as DeepEvaluate<
                ExactObject<
                    { a: string | number },
                    { a: string | number | boolean }
                >
            >
        ).typed as { a: string | number }
        assert(
            {} as DeepEvaluate<
                ExactObject<
                    { a: string | number | boolean },
                    { a: string | number }
                >
            >
        ).typed as { a: string | number }
    })

    test("optional", () => {
        assert(
            {} as DeepEvaluate<
                ExactObject<
                    { a: { nested: "yar" } },
                    { a?: { nested: string } }
                >
            >
        ).typed as { a: { nested: "yar" } }
    })
})
