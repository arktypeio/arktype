import { assert } from "console"
import { diff, addedOrChanged, diffSets, deepEquals } from ".."
import { o } from "./common"

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

test("diffs shallow", () => {
    expect(diff("hey", "hey")).toBe(undefined)
    expect(diff("hey", "hi")).toStrictEqual({ base: "hey", compare: "hi" })
})

test("diffs deep", () => {
    expect(diff(o, o)).toBe(undefined)
    expect(diff(o, updatedO)).toStrictEqual(diffedChanges)
})

test("removed keys", () => {
    expect(diff({ a: "", b: "" }, { a: "" })).toStrictEqual({
        removed: { b: "" }
    })
    expect(
        diff({ nested: { a: true, b: false } }, { nested: { b: false } })
    ).toStrictEqual({ changed: { nested: { removed: { a: true } } } })
})

test("added keys", () => {
    expect(diff({ a: "" }, { a: "", b: "" })).toStrictEqual({
        added: { b: "" }
    })
    expect(
        diff({ nested: { b: false } }, { nested: { a: true, b: false } })
    ).toStrictEqual({ changed: { nested: { added: { a: true } } } })
})

test("diffs array", () => {
    expect(diff(["ok"], ["different"])).toStrictEqual({
        changed: { 0: { base: "ok", compare: "different" } }
    })
})

test("extracts changes from deep objects", () => {
    expect(addedOrChanged(o, updatedO)).toStrictEqual(extractedChanges)
})

test("diff sets", () => {
    expect(diffSets(["a", "b"], ["b", "a"])).toBe(undefined)
    expect(
        diffSets([{ a: true }, { b: true }], [{ b: true }, { a: true }])
    ).toBe(undefined)
    expect(diffSets(["a", "b"], ["b", "c"])).toStrictEqual({
        added: ["c"],
        removed: ["a"]
    })
})

test("deepEquals", () => {
    expect(deepEquals(o, { ...o })).toBe(true)
    expect(
        deepEquals(o, {
            ...o,
            e: [{ a: ["old"], b: "extraneous" }, { a: ["old"] }]
        })
    ).toBe(false)
})
