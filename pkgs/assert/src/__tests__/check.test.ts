import { check } from ".."

describe("check", () => {
    const n: number = 5
    test("value", () => {
        expect(check(n).value()).toBe(n)
    })
    test("type", () => {
        expect(check(n).type()).toBe("number")
    })
    test("no type errors", () => {
        expect(check(n).type.errors()).toStrictEqual([])
    })
    test("with type errors", () => {
        const takeAString = (s: string) => s
        expect(check(takeAString(n)).type.errors()).toMatchInlineSnapshot(`
            [
              "Argument of type 'number' is not assignable to parameter of type 'string'.",
            ]
        `)
    })
    test("all", () => {
        const { type, value } = check(n).all
        expect(value()).toBe(n)
        expect(type()).toBe("number")
        expect(check(n).type.errors()).toStrictEqual([])
    })
})
