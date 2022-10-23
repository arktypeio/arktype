import { assert } from "@arktype/check"
import { describe, test } from "mocha"
import type { Exact } from "../index.js"

describe("exact", () => {
    test("base", () => {
        assert(
            {} as Exact<
                { a: "ok"; nested: { on: true } },
                { a: "hi"; nested: { on: false } }
            >
        ).typed as {
            a: "hi"
            nested: {
                on: false
            }
        }
        assert(
            {} as Exact<
                { a: "ok"; nested: { on: true } },
                { a: string; nested: { on: boolean } }
            >
        ).typed as { a: "ok"; nested: { on: true } }
    })
    test("unions", () => {
        assert(
            {} as Exact<
                { a: string | number },
                { a: string | number | boolean }
            >
        ).typed as { a: string | number }
        assert(
            {} as Exact<
                { a: string | number | boolean },
                { a: string | number }
            >
        ).typed as { a: string | number }
    })

    test("optional", () => {
        assert(
            {} as Exact<{ a: { nested: true } }, { a?: { nested: boolean } }>
        ).typed as { a: { nested: true } }
    })
})
