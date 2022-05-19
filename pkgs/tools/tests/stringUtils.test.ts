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
    filterChars,
    isInteger
} from "@re-/tools"
import { assert } from "@re-/assert"
const { test } = Deno

const original = "hello"
const transform = (_: string) => _.toUpperCase()

test("transformSubstring", ({ step }) => {
    step("start only", () => {
        assert(
            transformSubstring({
                original,
                transform,
                start: 1
            })
        ).equals("hELLO")
    })
    step("end only", () => {
        assert(
            transformSubstring({
                original,
                transform,
                end: 1
            })
        ).equals("Hello")
    })
    step("both start and end", () => {
        assert(
            transformSubstring({
                original,
                transform,
                start: 1,
                end: 4
            })
        ).equals("hELLo")
    })
    step("neither start nor end", () => {
        assert(
            transformSubstring({
                original,
                transform
            })
        ).equals("HELLO")
    })
})

test("camelCase", ({ step }) => {
    step("single word", () => {
        assert(camelCase(["HELLO"])).equals("hello")
    })
    step("multiple words", () => {
        assert(camelCase(["HELLO", "hELLO", "hELLO"])).equals("helloHelloHello")
    })
})

test("capsCase", ({ step }) => {
    step("single word", () => {
        assert(capsCase(["hELLO"])).equals("Hello")
    })
    step("multiple words", () => {
        assert(capsCase(["hELLO", "hELLO", "hELLO"])).equals("HelloHelloHello")
    })
})

test("capitalize", ({ step }) => {
    step("works", () => {
        assert(capitalize("hello")).equals("Hello")
    })
})

test("lettersAfterFirstToLower", ({ step }) => {
    step("works", () => {
        assert(lettersAfterFirstToLower("HELLO")).equals("Hello")
    })
})

test("alphanumeric regex", ({ step }) => {
    step("isAlphaNumeric", () => {
        assert(isAlphaNumeric("aB0")).equals(true)
        assert(isAlphaNumeric("aB0!")).equals(false)
        assert(isAlphaNumeric(" ")).equals(false)
    })
    step("isAlpha", () => {
        assert(isAlpha("aB")).equals(true)
        assert(isAlpha("aB0")).equals(false)
        assert(isAlpha(" ")).equals(false)
    })
    step("isDigits", () => {
        assert(isDigits("01")).equals(true)
        assert(isDigits("01A")).equals(false)
        assert(isDigits("5.0")).equals(false)
        assert(isDigits(" ")).equals(false)
    })
    step("isNumeric", () => {
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
        assert(asNumber("-3.14159", { asFloat: true })).equals(-3.14159)
        assert(asNumber("4.567n")).equals(null)
        assert(asNumber("I'm a number ;-)")).equals(null)
        assert(() => asNumber("KEKW", { assert: true })).throws()
        assert(asNumber(12)).equals(12)
    })
    step("filterChars", () => {
        const s = "aB0 !a"
        assert(filterChars(s, isAlpha)).equals("aBa")
        assert(filterChars(s, (char) => char === "a")).equals("aa")
    })
})
