import { transformSubstring, camelCase } from ".."

const original = "hello"
const transform = (_: string) => _.toUpperCase()

describe("transformSubstring", () => {
    test("start only", () => {
        expect(
            transformSubstring({
                original,
                transform,
                start: 1
            })
        ).toEqual("hELLO")
    })
    test("end only", () => {
        expect(
            transformSubstring({
                original,
                transform,
                end: 1
            })
        ).toEqual("Hello")
    })
    test("both start and end", () => {
        expect(
            transformSubstring({
                original,
                transform,
                start: 1,
                end: 4
            })
        ).toEqual("hELLo")
    })
    test("neither start nor end", () => {
        expect(
            transformSubstring({
                original,
                transform
            })
        ).toEqual("HELLO")
    })
})

describe("camelCase", () => {
    test("single word", () => {
        expect(camelCase(["HELLO"])).toEqual("hello")
    })
    test("multiple words", () => {
        expect(camelCase(["HELLO", "hELLO", "hELLO"])).toEqual(
            "helloHelloHello"
        )
    })
})
