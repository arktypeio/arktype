import { assert } from "@re-/assert"
import { DeepEvaluate, Exact } from "../index.js"

import { test } from "mocha"

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
