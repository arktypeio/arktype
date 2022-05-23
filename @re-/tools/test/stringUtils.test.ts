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
} from "../src/index.js"
import { assert } from "@re-/assert"
import { describe, test } from "mocha"

const original = "hello"
const transform = (_: string) => _.toUpperCase()

describe("transformSubstring", () => {
    test("start only", () => {
        assert(
            transformSubstring({
                original,
                transform,
                start: 1
            })
        ).equals("hELLO")
    })
    test("end only", () => {
        assert(
            transformSubstring({
                original,
                transform,
                end: 1
            })
        ).equals("Hello")
    })
    test("both start and end", () => {
        assert(
            transformSubstring({
                original,
                transform,
                start: 1,
                end: 4
            })
        ).equals("hELLo")
    })
    test("neither start nor end", () => {
        assert(
            transformSubstring({
                original,
                transform
            })
        ).equals("HELLO")
    })
})

describe("camelCase", () => {
    test("single word", () => {
        assert(camelCase(["HELLO"])).equals("hello")
    })
    test("multiple words", () => {
        assert(camelCase(["HELLO", "hELLO", "hELLO"])).equals("helloHelloHello")
    })
})

describe("capsCase", () => {
    test("single word", () => {
        assert(capsCase(["hELLO"])).equals("Hello")
    })
    test("multiple words", () => {
        assert(capsCase(["hELLO", "hELLO", "hELLO"])).equals("HelloHelloHello")
    })
})

describe("capitalize", () => {
    test("works", () => {
        assert(capitalize("hello")).equals("Hello")
    })
})

describe("lettersAfterFirstToLower", () => {
    test("works", () => {
        assert(lettersAfterFirstToLower("HELLO")).equals("Hello")
    })
})

describe("alphanumeric regex", () => {
    test("isAlphaNumeric", () => {
        assert(isAlphaNumeric("aB0")).equals(true)
        assert(isAlphaNumeric("aB0!")).equals(false)
        assert(isAlphaNumeric(" ")).equals(false)
    })
    test("isAlpha", () => {
        assert(isAlpha("aB")).equals(true)
        assert(isAlpha("aB0")).equals(false)
        assert(isAlpha(" ")).equals(false)
    })
    test("isDigits", () => {
        assert(isDigits("01")).equals(true)
        assert(isDigits("01A")).equals(false)
        assert(isDigits("5.0")).equals(false)
        assert(isDigits(" ")).equals(false)
    })
    test("isNumeric", () => {
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
    test("filterChars", () => {
        const s = "aB0 !a"
        assert(filterChars(s, isAlpha)).equals("aBa")
        assert(filterChars(s, (char) => char === "a")).equals("aa")
    })
})
