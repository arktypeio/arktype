import { check } from ".."
const n: number = 5

describe("check", () => {
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
        expect(check(takeAString(n)).type.errors()).toStrictEqual([
            "Argument of type 'number' is not assignable to parameter of type 'string'."
        ])
    })
    test("all", () => {
        const { type, value } = check(n)()
        expect(value()).toBe(n)
        expect(type()).toBe("number")
        expect(check(n).type.errors()).toStrictEqual([])
    })
})
