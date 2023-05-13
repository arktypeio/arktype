import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { attest } from "../attest/main.js"

suite("keywords", () => {
    suite("jsObjects", () => {
        test(" Function", () => {
            attest(type("Function").root.condition).snap(
                "$arkRoot instanceof Function"
            )
        })
        test("Date", () => {
            attest(type("Date").root.condition).snap("$arkRoot instanceof Date")
        })
        test("Error", () => {
            attest(type("Error").root.condition).snap(
                "$arkRoot instanceof Error"
            )
        })
        test("Map", () => {
            attest(type("Map").root.condition).snap("$arkRoot instanceof Map")
        })
        test("RegExp", () => {
            attest(type("RegExp").root.condition).snap(
                "$arkRoot instanceof RegExp"
            )
        })
        test("Set", () => {
            attest(type("Set").root.condition).snap("$arkRoot instanceof Set")
        })
        test("WeakMap", () => {
            attest(type("WeakMap").root.condition).snap(
                "$arkRoot instanceof WeakMap"
            )
        })
        test("WeakSet", () => {
            attest(type("WeakSet").root.condition).snap(
                "$arkRoot instanceof WeakSet"
            )
        })
        test("Promise", () => {
            attest(type("Promise").root.condition).snap(
                "$arkRoot instanceof Promise"
            )
        })
    })
    suite("tsKeywords", () => {
        test("any", () => {
            attest(type("any").root).is(type("unknown").root)
        })
        test("bigint", () => {
            attest(type("bigint").root.condition).snap(
                'typeof $arkRoot === "bigint"'
            )
        })
        test("boolean", () => {
            // TODO: discriminated
            attest(type("boolean").root.condition).snap(
                "($arkRoot === false || $arkRoot === true)"
            )
        })
        test("false", () => {
            attest(type("false").root.condition).snap("$arkRoot === false")
        })
        test("never", () => {
            attest(type("never").root.condition).snap("false")
        })
        test("null", () => {
            attest(type("null").root.condition).snap("$arkRoot === null")
        })
        test("number", () => {
            attest(type("number").root.condition).snap(
                'typeof $arkRoot === "number"'
            )
        })
        test("object", () => {
            attest(type("object").root.condition).snap(
                '((typeof $arkRoot === "object" && $arkRoot !== null) || typeof $arkRoot === "function")'
            )
        })
        test("string", () => {
            attest(type("string").root.condition).snap(
                'typeof $arkRoot === "string"'
            )
        })
        test("symbol", () => {
            attest(type("symbol").root.condition).snap(
                'typeof $arkRoot === "symbol"'
            )
        })
        test("true", () => {
            attest(type("true").root.condition).snap("$arkRoot === true")
        })
        test("unknown", () => {
            attest(type("unknown").root.condition).snap("true")
        })
        test("void", () => {
            attest(type("void").root).is(type("undefined").root)
        })
        test("undefined", () => {
            attest(type("undefined").root.condition).snap(
                "$arkRoot === undefined"
            )
        })
    })
    // suite("validation", () => {
    // test("integer", () => {
    //     const integer = type("integer")
    //     attest(integer(123).data).snap(123)
    //     attest(integer("123").problems?.summary).snap(
    //         "Must be a number (was string)"
    //     )
    //     attest(integer(12.12).problems?.summary).snap(
    //         "Must be an integer (was 12.12)"
    //     )
    // })
    // test("alpha", () => {
    //     const alpha = type("alpha")
    //     attest(alpha("user").data).snap("user")
    //     attest(alpha("user123").problems?.summary).snap(
    //         "Must be only letters (was 'user123')"
    //     )
    // })
    // test("alphanumeric", () => {
    //     const alphanumeric = type("alphanumeric")
    //     attest(alphanumeric("user123").data).snap("user123")
    //     attest(alphanumeric("user").data).snap("user")
    //     attest(alphanumeric("123").data).snap("123")
    //     attest(alphanumeric("abc@123").problems?.summary).snap(
    //         "Must be only letters and digits (was 'abc@123')"
    //     )
    // })
    // test("lowercase", () => {
    //     const lowercase = type("lowercase")
    //     attest(lowercase("var").data).snap("var")
    //     attest(lowercase("newVar").problems?.summary).snap(
    //         "Must be only lowercase letters (was 'newVar')"
    //     )
    // })
    // test("uppercase", () => {
    //     const uppercase = type("uppercase")
    //     attest(uppercase("VAR").data).snap("VAR")
    //     attest(uppercase("CONST_VAR").problems?.summary).snap(
    //         "Must be only uppercase letters (was 'CONST_VAR')"
    //     )
    //     attest(uppercase("myVar").problems?.summary).snap(
    //         "Must be only uppercase letters (was 'myVar')"
    //     )
    // })
    // test("email", () => {
    //     const email = type("email")
    //     attest(email("shawn@mail.com").data).snap("shawn@mail.com")
    //     attest(email("shawn@email").problems?.summary).snap(
    //         "Must be a valid email (was 'shawn@email')"
    //     )
    // })
    // test("uuid", () => {
    //     const uuid = type("uuid")
    //     attest(uuid("f70b8242-dd57-4e6b-b0b7-649d997140a0").data).snap(
    //         "f70b8242-dd57-4e6b-b0b7-649d997140a0"
    //     )
    //     attest(uuid("1234").problems?.summary).snap(
    //         "Must be a valid UUID (was '1234')"
    //     )
    // })
    // test("parsedNumber", () => {
    //     const parsedNumber = type("parsedNumber")
    //     attest(parsedNumber("5").data).snap(5)
    //     attest(parsedNumber("5.5").data).snap(5.5)
    //     attest(parsedNumber("five").problems?.summary).snap(
    //         "Must be a well-formed numeric string (was 'five')"
    //     )
    // })
    // test("parsedInteger", () => {
    //     const parsedInteger = type("parsedInteger")
    //     attest(parsedInteger("5").data).snap(5)
    //     attest(parsedInteger("5.5").problems?.summary).snap(
    //         "Must be a well-formed integer string (was '5.5')"
    //     )
    //     attest(parsedInteger("five").problems?.summary).snap(
    //         "Must be a well-formed integer string (was 'five')"
    //     )
    //     attest(parsedInteger(5).problems?.summary).snap(
    //         "Must be a string (was number)"
    //     )
    //     attest(parsedInteger("9007199254740992").problems?.summary).snap(
    //         "Must be an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER (was '9007199254740992')"
    //     )
    // })
    // test("parsedDate", () => {
    //     const parsedDate = type("parsedDate")
    //     attest(parsedDate("5/21/1993").data?.toDateString()).snap(
    //         "Fri May 21 1993"
    //     )
    //     attest(parsedDate("foo").problems?.summary).snap(
    //         "Must be a valid date (was 'foo')"
    //     )
    //     attest(parsedDate(5).problems?.summary).snap(
    //         "Must be a string (was number)"
    //     )
    // })
    // test("json", () => {
    //     const json = type("json")
    //     attest(json('{"a": "hello"}').data).snap({ a: "hello" })
    //     attest(json(123).problems?.summary).snap(
    //         "Must be a JSON-parsable string (was number)"
    //     )
    // })
    // test("credit card", () => {
    //     const validCC = "5489582921773376"
    //     attest(ark.creditCard(validCC).data).equals(validCC)
    //     // Regex validation
    //     attest(ark.creditCard("0".repeat(16)).problems?.summary).snap(
    //         "Must be a valid credit card number (was '0000000000000000')"
    //     )
    //     // Luhn validation
    //     attest(
    //         ark.creditCard(validCC.slice(0, -1) + "0").problems?.summary
    //     ).snap(
    //         "Must be a valid credit card number (was '5489582921773370')"
    //     )
    // })
    // test("semver", () => {
    //     attest(ark.semver("1.0.0").data).equals("1.0.0")
    //     attest(ark.semver("-1.0.0").problems?.summary).snap(
    //         "Must be a valid semantic version (see https://semver.org/) (was '-1.0.0')"
    //     )
    // })
    // })
})
