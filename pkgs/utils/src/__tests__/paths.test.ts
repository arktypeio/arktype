import { valueAtPath } from "../paths"
import { Object } from "ts-toolbelt"

const obj = {
    a: {
        b: {
            c: 31
        }
    },
    d: [{ e: true }, "redo"] as const,
    f: [255]
}

test("retrieves primitive at path", () => {
    expect(valueAtPath(obj, "a/b/c")).toBe(31)
})
test("retrieves object at path", () => {
    expect(valueAtPath(obj, "a/b")).toStrictEqual({ c: 31 })
})
test("retrieves primitive from array", () => {
    expect(valueAtPath(obj, "d/1")).toBe("redo")
})
test("retrieves primitive from array with number key", () => {
    expect(valueAtPath(obj, "f/0")).toBe(255)
})
test("retrieves primitive from object in array", () => {
    expect(valueAtPath(obj, "d/0/e")).toBe(true)
})
test("returns undefined on nonexistent path", () => {
    // @ts-ignore
    expect(valueAtPath(obj, "fake/fake")).toBe(undefined)
})
