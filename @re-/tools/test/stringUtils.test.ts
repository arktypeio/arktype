import { assert } from "@re-/assert"
import {
    asNumber,
    camelCase,
    capitalize,
    capsCase,
    filterChars,
    isAlpha,
    isAlphaNumeric,
    isDigits,
    isInteger,
    isNumeric,
    lettersAfterFirstToLower,
    transformSubstring
} from "@re-/tools"

const original = "hello"
const transform = (_: string) => _.toUpperCase()

describe("transformSubstring", () => {
    it("start only", () => {
        assert(
            transformSubstring({
                original,
                transform,
                start: 1
            })
        ).equals("hELLO")
    })
    it("end only", () => {
        assert(
            transformSubstring({
                original,
                transform,
                end: 1
            })
        ).equals("Hello")
    })
    it("both start and end", () => {
        assert(
            transformSubstring({
                original,
                transform,
                start: 1,
                end: 4
            })
        ).equals("hELLo")
    })
    it("neither start nor end", () => {
        assert(
            transformSubstring({
                original,
                transform
            })
        ).equals("HELLO")
    })
})

describe("camelCase", () => {
    it("single word", () => {
        assert(camelCase(["HELLO"])).equals("hello")
    })
    it("multiple words", () => {
        assert(camelCase(["HELLO", "hELLO", "hELLO"])).equals("helloHelloHello")
    })
})

describe("capsCase", () => {
    it("single word", () => {
        assert(capsCase(["hELLO"])).equals("Hello")
    })
    it("multiple words", () => {
        assert(capsCase(["hELLO", "hELLO", "hELLO"])).equals("HelloHelloHello")
    })
})

describe("capitalize", () => {
    it("works", () => {
        assert(capitalize("hello")).equals("Hello")
    })
})

describe("lettersAfterFirstToLower", () => {
    it("works", () => {
        assert(lettersAfterFirstToLower("HELLO")).equals("Hello")
    })
})

describe("alphanumeric regex", () => {
    it("isAlphaNumeric", () => {
        assert(isAlphaNumeric("aB0")).equals(true)
        assert(isAlphaNumeric("aB0!")).equals(false)
        assert(isAlphaNumeric(" ")).equals(false)
    })
    it("isAlpha", () => {
        assert(isAlpha("aB")).equals(true)
        assert(isAlpha("aB0")).equals(false)
        assert(isAlpha(" ")).equals(false)
    })
    it("isDigits", () => {
        assert(isDigits("01")).equals(true)
        assert(isDigits("01A")).equals(false)
        assert(isDigits("5.0")).equals(false)
        assert(isDigits(" ")).equals(false)
    })
    it("isNumeric", () => {
        assert(isNumeric("7.5")).equals(true)
        assert(isNumeric(7.5)).equals(true)
        assert(isNumeric("f")).equals(false)
        assert(isInteger("0")).equals(true)
        assert(isInteger(654)).equals(true)
        assert(isInteger("0.1")).equals(false)
        assert(isInteger(654.456)).equals(false)
        assert(asNumber("7")).equals(7)
        assert(asNumber("7.5")).equals(7.5)
        assert(asNumber("7", { asFloat: true })).equals(7)
        assert(asNumber("7.5", { asFloat: false })).equals(7)
        assert(asNumber("-3.14159", { asFloat: true })).equals(-3.141_59)
        assert(asNumber("4.567n")).equals(null)
        assert(asNumber("I'm a number ;-)")).equals(null)
        assert(() => asNumber("KEKW", { assert: true })).throws()
        assert(asNumber(12)).equals(12)
    })
    it("filterChars", () => {
        const s = "aB0 !a"
        assert(filterChars(s, isAlpha)).equals("aBa")
        assert(filterChars(s, (char) => char === "a")).equals("aa")
    })
})
