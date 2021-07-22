import { valueAtPath } from "../paths"

const obj = {
    a: {
        b: {
            c: 31
        }
    },
    d: [{ e: true }, "redo"] as const,
    f: [255],
    g: [{ a: true }, { a: false }]
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
test("retrieves primitive from object in array", () => {
    expect(valueAtPath(obj, "d/0/e")).toBe(true)
})
test("returns undefined on nonexistent path", () => {
    // @ts-ignore
    expect(valueAtPath(obj, "fake/fake")).toBe(undefined)
})
test("non-default delimiter", () => {
    expect(valueAtPath(obj, "a.b.c", { delimiter: "." })).toBe(31)
})
test("skip array paths", () => {
    expect(
        valueAtPath(obj, "g/a", { excludeArrayIndices: true })
    ).toStrictEqual([true, false])
})
