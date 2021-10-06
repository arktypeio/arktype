import { Evaluate, Exact } from ".."
import { expectType } from "tsd"

test("exact", () => {
    const noMatch = {} as Evaluate<
        Exact<
            { a: "ok"; nested: { on: true } },
            { a: "hi"; nested: { on: false } }
        >
    >
    expectType<{ a: "hi"; nested: { on: false } }>(noMatch)
    const match = {} as Evaluate<
        Exact<
            { a: "ok"; nested: { on: true } },
            { a: string; nested: { on: boolean } }
        >
    >
    expectType<{ a: "ok"; nested: { on: true } }>(match)
    const mixed = {} as Evaluate<
        Exact<
            { a: string; nested: { on: true } },
            { a: "hi"; nested: { on: boolean } }
        >
    >
    expectType<{ a: "hi"; nested: { on: true } }>(mixed)
})

test("any/unknown", () => {
    const first = {} as Evaluate<Exact<{ a: any }, { a: string }>>
    expectType<{ a: string }>(first)
    const second = {} as Evaluate<Exact<{ a: { b: "nested" } }, { a: unknown }>>
    expectType<{ a: { b: "nested" } }>(second)
})

test("unions", () => {
    const subset = {} as Evaluate<
        Exact<{ a: string | number }, { a: string | number | boolean }>
    >
    expectType<{ a: string | number }>(subset)
    const superset = {} as Evaluate<
        Exact<{ a: string | number | boolean }, { a: string | number }>
    >
    expectType<{ a: string | number }>(superset)
})

test("optional", () => {
    const first = {} as Evaluate<
        Exact<{ a: { nested: true } }, { a?: { nested: boolean } }>
    >
    expectType<{ a: { nested: true } }>(first)
})
