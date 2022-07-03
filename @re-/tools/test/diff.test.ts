import { assert } from "@re-/assert"
import { addedOrChanged, deepEquals, diff, diffSets } from "../src/index.js"
import { o } from "./common.js"

const updatedO = Object.freeze({
    a: {
        a: "new",
        b: [0],
        c: {
            a: true,
            b: false,
            c: null
        }
    },
    b: {
        a: {
            a: 0
        }
    },
    c: null,
    d: "initial",
    e: [{ a: ["old"] }, { a: ["old"] }, { a: ["new"] }]
})

const diffedChanges = {
    changed: {
        a: { changed: { a: { base: "", compare: "new" } } },
        b: { changed: { a: { changed: { a: { base: 1, compare: 0 } } } } },
        e: { added: { 2: { a: ["new"] } } }
    }
}

const extractedChanges = {
    a: {
        a: "new"
    },
    b: {
        a: {
            a: 0
        }
    },
    e: [{ a: ["old"] }, { a: ["old"] }, { a: ["new"] }]
}

it("diffs shallow", () => {
    assert(diff("hey", "hey")).equals(undefined)
    assert(diff("hey", "hi")).equals({ base: "hey", compare: "hi" })
})

it("diffs deep", () => {
    assert(diff(o, o)).equals(undefined)
    assert(diff(o, updatedO)).value.equals(diffedChanges)
})

it("removed keys", () => {
    assert(diff({ a: "", b: "" }, { a: "" })).equals({
        removed: { b: "" }
    })
    assert(
        diff({ nested: { a: true, b: false } }, { nested: { b: false } })
    ).equals({ changed: { nested: { removed: { a: true } } } })
})

it("added keys", () => {
    assert(diff({ a: "" }, { a: "", b: "" })).equals({
        added: { b: "" }
    })
    assert(
        diff({ nested: { b: false } }, { nested: { a: true, b: false } })
    ).equals({ changed: { nested: { added: { a: true } } } })
})

it("diffs array", () => {
    assert(diff(["ok"], ["different"])).value.equals({
        changed: { 0: { base: "ok", compare: "different" } }
    })
})

it("extracts changes from deep objects", () => {
    assert(addedOrChanged(o, updatedO)).equals(extractedChanges)
})

it("diff sets", () => {
    assert(diffSets(["a", "b"], ["b", "a"])).equals(undefined)
    assert(
        diffSets([{ a: true }, { b: true }], [{ b: true }, { a: true }])
    ).equals(undefined)
    assert(diffSets(["a", "b"], ["b", "c"])).equals({
        added: ["c"],
        removed: ["a"]
    })
})

it("diff nested sets", () => {
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
    ).equals({
        changed: {
            a: { added: ["b"], removed: ["a"] },
            b: {
                changed: {
                    nested: {
                        added: ["b"],
                        removed: ["a"]
                    }
                }
            }
        }
    })
})

it("diff deepSets", () => {
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
            { listComparison: "deepSets" }
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
            { listComparison: "deepSets" }
        )
    ).snap({ changed: { a: { added: [[`d`, `g`]], removed: [[`d`, `f`]] } } })
})

it("diff unordered", () => {
    assert(
        diff(
            { a: ["a", "b", "c"], b: { nested: ["a", "b"] } },
            { a: ["c", "b", "a"], b: { nested: ["b", "a"] } },
            { listComparison: "unordered" }
        )
    ).equals(undefined)
    assert(
        diff(
            { a: ["a", "a", "c"], b: { nested: ["a", "a", "c", "c"] } },
            { a: ["c", "b", "b"], b: { nested: ["c", "b", "b"] } },
            { listComparison: "unordered" }
        )
    ).snap({
        changed: {
            a: { added: [`b`, `b`], removed: [`a`, `a`] },
            b: {
                changed: {
                    nested: { added: [`b`, `b`], removed: [`a`, `a`, `c`] }
                }
            }
        }
    })
})

it("diff deepUnordered", () => {
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
            { listComparison: "deepUnordered" }
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
            { listComparison: "deepUnordered" }
        )
    ).snap({
        changed: {
            a: {
                added: [
                    [`added`, `i`, `h`, `g`],
                    [`f`, `e`, `d`, `f`],
                    [`notEmpty`]
                ],
                removed: [[`d`, `e`, `f`, `d`], [`g`, `h`, `i`, `removed`], []]
            }
        }
    })
})

it("deepEquals", () => {
    assert(deepEquals(o, { ...o })).equals(true)
    assert(
        deepEquals(o, {
            ...o,
            e: [{ a: ["old"], b: "extraneous" }, { a: ["old"] }]
        })
    ).equals(false)
})
