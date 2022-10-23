import { describe, test } from "mocha"
import { assert } from "../../index.js"
import { deepEquals, diff, diffPermutables, diffSets } from "../index.js"

const base = {
    a: "",
    b: true,
    c: {
        a: 0,
        b: undefined
    },
    d: [{ a: [0] }, {}],
    e: null
}

const compare = {
    a: "",
    b: false,
    c: {
        a: 0,
        b: null
    },
    d: [{ a: [0, 1] }],
    f: 0n
}

describe("diff", () => {
    test("diffs shallow", () => {
        assert(diff("hey", "hey")).equals(undefined)
        assert(diff("hey", "hi")).equals({
            "/": { base: "hey", compare: "hi" }
        })
    })

    test("full deep diff", () => {
        assert(diff(base, base)).equals(undefined)
        const changes = diff(base, compare)
        assert(changes).equals({
            "/": { added: ["f"], removed: ["e"] },
            b: { base: true, compare: false },
            "c/b": { base: undefined, compare: null },
            d: { removed: ["1"] },
            "d/0/a": { added: ["1"] }
        })
    })

    test("removed keys", () => {
        assert(diff({ a: "", b: "" }, { a: "" })).equals({
            "/": { removed: ["b"] }
        })
        assert(
            diff({ nested: { a: true, b: false } }, { nested: { b: false } })
        ).equals({ nested: { removed: ["a"] } })
    })

    test("added keys", () => {
        assert(diff({ a: "" }, { a: "", b: "" })).equals({
            "/": { added: ["b"] }
        })
        assert(
            diff({ nested: { b: false } }, { nested: { a: true, b: false } })
        ).equals({ nested: { added: ["a"] } })
    })

    test("diffs array", () => {
        assert(diff(["ok"], ["different"])).unknown.equals({
            "0": { base: "ok", compare: "different" }
        })
    })

    test("diff sets", () => {
        assert(diffSets(["a", "a", "b"], ["b", "b", "a"])).equals(undefined)
        assert(diffSets(["a", "a", "b"], ["b", "b", "c"])).equals({
            added: ["c"],
            removed: ["a"]
        })
    })

    test("can change base/compare keys", () => {
        const changes = diff(
            { a: true, b: false },
            { b: true, a: false },
            { baseKey: "expected", compareKey: "actual" }
        )
        assert(changes).equals({
            a: { expected: true, actual: false },
            b: { expected: false, actual: true }
        })
    })

    test("diff sets of objects", () => {
        assert(
            diffSets(
                [{ a: true }, { a: true }, { b: true }],
                [{ b: true }, { b: true }, { a: true }]
            )
        ).equals(undefined)
        assert(
            diffSets(
                [{ a: true }, { a: true }, { b: true }],
                [{ b: true }, { b: true }, { c: true }]
            )
        ).snap({ added: [{ c: true }], removed: [{ a: true }] })
    })

    test("diff nested sets", () => {
        assert(
            diff(
                { a: ["a", "b", "a"], b: { nested: ["a", "b"] } },
                { a: ["b", "a", "a", "a"], b: { nested: ["b", "a", "b"] } },
                { listComparison: "set" }
            )
        ).equals(undefined)
        assert(
            diff(
                { a: ["a", "a", "c"], b: { nested: ["a", "a", "c", "c"] } },
                { a: ["c", "b", "b"], b: { nested: ["c", "b", "b"] } },
                { listComparison: "set" }
            )
        ).snap({
            a: { added: [`b`, `b`], removed: [`a`] },
            "b/nested": { added: [`b`, `b`], removed: [`a`] }
        })
    })

    test("diff deepSets", () => {
        assert(
            diff(
                {
                    a: [
                        ["a", "c"],
                        ["a", "a", "c"],
                        ["b", "b", "c"]
                    ]
                },
                {
                    a: [
                        ["b", "c"],
                        ["b", "c", "c"],
                        ["a", "c", "c"]
                    ]
                },
                { listComparison: "set" }
            )
        ).equals(undefined)
        assert(
            diff(
                {
                    a: [
                        ["a", "a", "c"],
                        ["b", "b", "c"],
                        ["d", "f"]
                    ]
                },
                {
                    a: [
                        ["b", "c", "c"],
                        ["a", "c", "c"],
                        ["d", "g"]
                    ]
                },
                { listComparison: "set" }
            )
        ).snap({ a: { added: [[`d`, `g`]], removed: [[`d`, `f`]] } })
    })

    test("diff permutable", () => {
        assert(diffPermutables(["a", "b", "c"], ["c", "b", "a"])).equals(
            undefined
        )
        assert(diffPermutables(["a", "a", "c", "c"], ["c", "b", "b"])).snap({
            added: [`b`, `b`],
            removed: [`a`, `a`, `c`]
        })
    })

    test("diff deeply permutable object", () => {
        assert(
            diff(
                {
                    a: [
                        ["a", "b", "c"],
                        ["d", "e", "f"],
                        ["g", "h", "i"]
                    ]
                },
                {
                    a: [
                        ["i", "h", "g"],
                        ["c", "b", "a"],
                        ["f", "e", "d"]
                    ]
                },
                { listComparison: "permutable" }
            )
        ).equals(undefined)
        assert(
            diff(
                {
                    a: [
                        ["a", "b", "c"],
                        ["d", "e", "f", "d"],
                        ["g", "h", "i", "removed"],
                        []
                    ]
                },
                {
                    a: [
                        ["added", "i", "h", "g"],
                        ["c", "b", "a"],
                        ["f", "e", "d", "f"],
                        ["notEmpty"]
                    ]
                },
                { listComparison: "permutable" }
            )
        ).snap({
            a: {
                added: [
                    [`added`, `i`, `h`, `g`],
                    [`f`, `e`, `d`, `f`],
                    [`notEmpty`]
                ],
                removed: [[`d`, `e`, `f`, `d`], [`g`, `h`, `i`, `removed`], []]
            }
        })
    })

    test("deepEquals", () => {
        assert(deepEquals(base, { ...base })).equals(true)
        assert(
            deepEquals(base, {
                ...base,
                e: [{ a: ["old"], b: "extraneous" }, { a: ["old"] }]
            })
        ).equals(false)
    })
})
