import { assert } from "@re-/assert"
import { o } from "./common.js"
import { addedOrChanged, deepEquals, diff, diffSets } from "#src"

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

it("deepEquals", () => {
    assert(deepEquals(o, { ...o })).equals(true)
    assert(
        deepEquals(o, {
            ...o,
            e: [{ a: ["old"], b: "extraneous" }, { a: ["old"] }]
        })
    ).equals(false)
})
