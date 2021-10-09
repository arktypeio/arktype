import { expectError } from "tsd"
import { valueAtPath } from ".."

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
    const result = valueAtPath(obj, "d/1")
    expect(result).toBe("redo")
})
test("retrieves primitive from object in array", () => {
    const result = valueAtPath(obj, "d/0/e")
    expect(result).toBe(true)
})
test("returns undefined on nonexistent path", () => {
    // @ts-expect-error
    expect(valueAtPath(obj, "fake/fake")).toBe(undefined)
})
test("non-default delimiter", () => {
    const result = valueAtPath(obj, "a.b.c", { delimiter: "." })
    expect(result).toBe(31)
})
test("skip array paths", () => {
    const result: boolean[] = valueAtPath(obj, "g/a", {
        excludeArrayIndices: true
    })
    expect(result).toStrictEqual([true, false])
})

test("generic arrays", () => {
    const result: { a: boolean } = valueAtPath(obj, "g/0")
    expect(result).toStrictEqual({ a: true })
    const nested: boolean = valueAtPath(obj, "g/1/a")
    expect(nested).toStrictEqual(false)
})
