import {
    transformSubstring,
    camelCase,
    capitalize,
    capsCase,
    lettersAfterFirstToLower,
    isAlphaNumeric,
    isAlpha,
    isDigits,
    isNumeric,
    asNumber,
    filterChars
} from ".."

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

describe("capsCase", () => {
    test("single word", () => {
        expect(capsCase(["hELLO"])).toEqual("Hello")
    })
    test("multiple words", () => {
        expect(capsCase(["hELLO", "hELLO", "hELLO"])).toEqual("HelloHelloHello")
    })
})

describe("capitalize", () => {
    test("works", () => {
        expect(capitalize("hello")).toEqual("Hello")
    })
})

describe("lettersAfterFirstToLower", () => {
    test("works", () => {
        expect(lettersAfterFirstToLower("HELLO")).toEqual("Hello")
    })
})

describe("alphanumeric regex", () => {
    test("isAlphaNumeric", () => {
        expect(isAlphaNumeric("aB0")).toBe(true)
        expect(isAlphaNumeric("aB0!")).toBe(false)
        expect(isAlphaNumeric(" ")).toBe(false)
    })
    test("isAlpha", () => {
        expect(isAlpha("aB")).toBe(true)
        expect(isAlpha("aB0")).toBe(false)
        expect(isAlpha(" ")).toBe(false)
    })
    test("isDigits", () => {
        expect(isDigits("01")).toBe(true)
        expect(isDigits("01A")).toBe(false)
        expect(isDigits("5.0")).toBe(false)
        expect(isDigits(" ")).toBe(false)
    })
    test("isNumeric", () => {
        expect(isNumeric("7.5")).toBe(true)
        expect(isNumeric(7.5)).toBe(true)
        expect(isNumeric("f")).toBe(false)
        expect(asNumber("7")).toBe(7)
        expect(asNumber("7.5")).toBe(7.5)
        expect(asNumber("7", { asFloat: true })).toBe(7)
        expect(asNumber("7.5", { asFloat: false })).toBe(7)
        expect(asNumber("-3.14159", { asFloat: true })).toBe(-3.14159)
        expect(asNumber("I'm a number ;-)")).toBe(null)
        expect(() => asNumber("KEKW", { assert: true })).toThrow()
        expect(asNumber(12)).toBe(12)
    })
    test("filterChars", () => {
        const s = "aB0 !a"
        expect(filterChars(s, isAlpha)).toBe("aBa")
        expect(filterChars(s, (char) => char === "a")).toBe("aa")
    })
})
