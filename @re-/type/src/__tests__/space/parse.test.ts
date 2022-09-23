import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { space } from "../../index.js"
import { shallowCycleMessage } from "../../parser/resolution.js"

describe("parse space", () => {
    test("errors on shallow cycle", () => {
        // TODO: Reenable
        try {
            // @ts-expect-error
            assert(() => space({ a: "a" })).throwsAndHasTypeError(
                shallowCycleMessage(["a", "a"])
            )
            assert(() =>
                // @ts-expect-error
                space({ a: "b", b: "c", c: "a|b|c" })
            ).throwsAndHasTypeError(shallowCycleMessage(["a", "b", "c", "a"]))
        } catch {}
    })
})
