import { describe, it } from "mocha"
import { ark, type } from "../../src/main.js"
import { attest } from "../attest/main.js"

describe("keywords", () => {
    describe("js", () => {
        it(" Function", () => {
            const t = type("Function")
            attest(t.node).snap("Function")
            attest(t((str: string) => [str]).data).snap("(function)")
            attest(t(1).problems?.summary).snap(
                "Must be a function (was Number)"
            )
        })
        it("Date", () => {
            attest(type("Date").node).snap("Date")
        })
        it("Error", () => {
            attest(type("Error").node).snap("Error")
        })
        it("Map", () => {
            attest(type("Map").node).snap("Map")
        })
        it("RegExp", () => {
            attest(type("RegExp").node).snap("RegExp")
        })
        it("Set", () => {
            attest(type("Set").node).snap("Set")
        })
        it("WeakMap", () => {
            attest(type("WeakMap").node).snap("WeakMap")
        })
        it("WeakSet", () => {
            attest(type("WeakSet").node).snap("WeakSet")
        })
        it("Promise", () => {
            attest(type("Promise").node).snap("Promise")
        })
    })
    describe("ts", () => {
        it("any", () => {
            attest(type("any").node).equals("any")
        })
        it("bigint", () => {
            attest(type("bigint").node).equals("bigint")
        })
        it("boolean", () => {
            attest(type("boolean").node).equals("boolean")
        })
        it("false", () => {
            attest(type("false").node).equals("false")
        })
        it("never", () => {
            attest(type("never").node).equals("never")
        })
        it("null", () => {
            attest(type("null").node).equals("null")
        })
        it("number", () => {
            attest(type("number").node).equals("number")
        })
        it("object", () => {
            attest(type("object").node).equals("object")
        })
        it("string", () => {
            attest(type("string").node).equals("string")
        })
        it("symbol", () => {
            attest(type("symbol").node).equals("symbol")
        })
        it("true", () => {
            attest(type("true").node).equals("true")
        })
        it("unknown", () => {
            attest(type("unknown").node).equals("unknown")
        })
        it("void", () => {
            attest(type("void").node).equals("void")
        })
        it("undefined", () => {
            attest(type("undefined").node).snap()
        })
    })
    describe("validation", () => {
        it("integer", () => {
            const integer = type("integer")
            attest(integer(123).data).snap(123)
            attest(integer("123").problems?.summary).snap(
                "Must be a number (was string)"
            )
            attest(integer(12.12).problems?.summary).snap(
                "Must be an integer (was 12.12)"
            )
        })
        it("alpha", () => {
            const alpha = type("alpha")
            attest(alpha("user").data).snap("user")
            attest(alpha("user123").problems?.summary).snap(
                "Must be only letters (was 'user123')"
            )
        })
        it("alphanumeric", () => {
            const alphanumeric = type("alphanumeric")
            attest(alphanumeric("user123").data).snap("user123")
            attest(alphanumeric("user").data).snap("user")
            attest(alphanumeric("123").data).snap("123")
            attest(alphanumeric("abc@123").problems?.summary).snap(
                "Must be only letters and digits (was 'abc@123')"
            )
        })
        it("lowercase", () => {
            const lowercase = type("lowercase")
            attest(lowercase("var").data).snap("var")
            attest(lowercase("newVar").problems?.summary).snap(
                "Must be only lowercase letters (was 'newVar')"
            )
        })
        it("uppercase", () => {
            const uppercase = type("uppercase")
            attest(uppercase("VAR").data).snap("VAR")
            attest(uppercase("CONST_VAR").problems?.summary).snap(
                "Must be only uppercase letters (was 'CONST_VAR')"
            )
            attest(uppercase("myVar").problems?.summary).snap(
                "Must be only uppercase letters (was 'myVar')"
            )
        })

        it("email", () => {
            const email = type("email")
            attest(email("shawn@mail.com").data).snap("shawn@mail.com")
            attest(email("shawn@email").problems?.summary).snap(
                "Must be a valid email (was 'shawn@email')"
            )
        })
        it("uuid", () => {
            const uuid = type("uuid")
            attest(uuid("f70b8242-dd57-4e6b-b0b7-649d997140a0").data).snap(
                "f70b8242-dd57-4e6b-b0b7-649d997140a0"
            )
            attest(uuid("1234").problems?.summary).snap(
                "Must be a valid UUID (was '1234')"
            )
        })
        it("parsedNumber", () => {
            const parsedNumber = type("parsedNumber")
            attest(parsedNumber("5").data).snap(5)
            attest(parsedNumber("5.5").data).snap(5.5)
            attest(parsedNumber("five").problems?.summary).snap(
                "Must be a well-formed numeric string (was 'five')"
            )
        })
        it("parsedInteger", () => {
            const parsedInteger = type("parsedInteger")
            attest(parsedInteger("5").data).snap(5)
            attest(parsedInteger("5.5").problems?.summary).snap(
                "Must be a well-formed integer string (was '5.5')"
            )
            attest(parsedInteger("five").problems?.summary).snap(
                "Must be a well-formed integer string (was 'five')"
            )
            attest(parsedInteger(5).problems?.summary).snap(
                "Must be a string (was number)"
            )
            attest(parsedInteger("9007199254740992").problems?.summary).snap(
                "Must be an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER (was '9007199254740992')"
            )
        })
        it("parsedDate", () => {
            const parsedDate = type("parsedDate")
            attest(parsedDate("5/21/1993").data?.toDateString()).snap(
                "Fri May 21 1993"
            )
            attest(parsedDate("foo").problems?.summary).snap(
                "Must be a valid date (was 'foo')"
            )
            attest(parsedDate(5).problems?.summary).snap(
                "Must be a string (was number)"
            )
        })
        it("json", () => {
            const json = type("json")
            attest(json('{"a": "hello"}').data).snap({ a: "hello" })
            attest(json(123).problems?.summary).snap(
                "Must be a JSON-parsable string (was number)"
            )
        })
        it("credit card", () => {
            const validCC = "5489582921773376"

            attest(ark.creditCard(validCC).data).equals(validCC)

            // Regex validation
            attest(ark.creditCard("0".repeat(16)).problems?.summary).snap(
                "Must be a valid credit card number (was '0000000000000000')"
            )
            // Luhn validation
            attest(
                ark.creditCard(validCC.slice(0, -1) + "0").problems?.summary
            ).snap(
                "Must be a valid credit card number (was '5489582921773370')"
            )
        })

        it("semver", () => {
            attest(ark.semver("1.0.0").data).equals("1.0.0")
            attest(ark.semver("-1.0.0").problems?.summary).snap(
                "Must be a valid semantic version (see https://semver.org/) (was '-1.0.0')"
            )
        })
    })
})
