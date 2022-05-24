import { assert } from "@re-/assert"
import { test } from "mocha"
import { lazily } from "../index.js"

test("calls thunk on prop access", () => {
    let callCounter = 0
    const lazyProxy = lazily(() => {
        callCounter++
        return {
            high: 5,
            low: "five"
        }
    })
    assert(lazyProxy).typed as {
        high: number
        low: string
    }
    assert(callCounter).is(0)
    assert(lazyProxy.high).is(5)
    assert(callCounter).is(1)
    assert(lazyProxy.low).is("five")
    assert(callCounter).is(1)
})
test("errors on args", () => {
    assert(() => {
        // @ts-expect-error
        const badProxy = lazily((n: number) => n) as any
        badProxy.someProp
    })
        .throws("no arguments")
        .type.errors.snap(
            `"Argument of type '(n: number) => number' is not assignable to parameter of type '() => object'."`
        )
})
test("errors on non-object", () => {
    assert(() => {
        // @ts-expect-error
        const badProxy = lazily(() => 5) as any
        badProxy.someProp
    })
        .throws("returns an object")
        .type.errors.snap(`"Type 'number' is not assignable to type 'object'."`)
})
