import { diff, addedOrChanged } from ".."
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

// test("diffs shallow", () => {
//     expect(diff("hey", "hey")).toBe(undefined)
//     expect(diff("hey", "hi")).toStrictEqual({ base: "hey", compare: "hi" })
// })

// test("diffs deep", () => {
//     // expect(diff(o, o)).toBe(undefined)
//     expect(diff(o, updatedO)).toStrictEqual(diffedChanges)
// })

// test("diffs array", () => {
//     expect(diff(["ok"], ["different"])).toStrictEqual({
//         changed: { 0: { base: "ok", compare: "different" } }
//     })
// })

test("extracts changes from deep objects", () => {
    console.log(JSON.stringify(addedOrChanged(o, updatedO), null, 4))
    console.log(JSON.stringify(extractedChanges, null, 4))
    expect(addedOrChanged(o, updatedO)).toStrictEqual(extractedChanges)
})
