import { attest } from "@arktype/attest"
import { type } from "arktype"
import { suite, test } from "mocha"
import { node } from "../../src/nodes/composite/type.js"

suite("keywords", () => {
    suite("jsObjects", () => {
        test("Function", () => {
            // should not be treated as a morph
            attest(type("Function").infer).typed as Function
        })
        test("Date", () => {
            // should not expand built-in classes
            attest(type("Date").infer).types.toString.snap("Date")
        })
    })
    suite("tsKeywords", () => {
        test("any", () => {
            const any = type("any")
            // equivalent to unknown at runtime
            attest(any.condition).equals(type("unknown").condition)
            // inferred as any
            attest(any.infer).typed as any
        })
        test("boolean", () => {
            const boolean = type("boolean")
            attest(boolean.infer).typed as boolean
            // should be simplified to simple checks for true and false literals
            attest(boolean.condition).equals(type("true|false").condition)
            attest(boolean.condition)
                .snap(`if( $arkRoot !== false && $arkRoot !== true) {
    return false
}`)
        })
        test("never", () => {
            const never = type("never")
            attest(never.infer).typed as never
            // should be equivalent to a zero-branch union
            attest(never.condition).equals(node().condition)
        })
        test("unknown", () => {
            // should be equivalent to an unconstrained predicate
            attest(type("unknown").condition).equals(node({}).condition)
        })
        test("void", () => {
            const t = type("void")
            attest(t.infer).typed as void
            //should be treated as undefined at runtime
            attest(t.condition).equals(type("undefined").condition)
        })
    })
    // suite("validation", () => {
    // test("integer", () => {
    //     const integer = type("integer")
    //     attest(integer(123).data).equals(123)
    //     attest(integer("123").problems?.summary).equals(
    //         "Must be a number (was string)"
    //     )
    //     attest(integer(12.12).problems?.summary).equals(
    //         "Must be an integer (was 12.12)"
    //     )
    // })
    // test("alpha", () => {
    //     const alpha = type("alpha")
    //     attest(alpha("user").data).equals("user")
    //     attest(alpha("user123").problems?.summary).equals(
    //         "Must be only letters (was 'user123')"
    //     )
    // })
    // test("alphanumeric", () => {
    //     const alphanumeric = type("alphanumeric")
    //     attest(alphanumeric("user123").data).equals("user123")
    //     attest(alphanumeric("user").data).equals("user")
    //     attest(alphanumeric("123").data).equals("123")
    //     attest(alphanumeric("abc@123").problems?.summary).equals(
    //         "Must be only letters and digits (was 'abc@123')"
    //     )
    // })
    // test("lowercase", () => {
    //     const lowercase = type("lowercase")
    //     attest(lowercase("var").data).equals("var")
    //     attest(lowercase("newVar").problems?.summary).equals(
    //         "Must be only lowercase letters (was 'newVar')"
    //     )
    // })
    // test("uppercase", () => {
    //     const uppercase = type("uppercase")
    //     attest(uppercase("VAR").data).equals("VAR")
    //     attest(uppercase("CONST_VAR").problems?.summary).equals(
    //         "Must be only uppercase letters (was 'CONST_VAR')"
    //     )
    //     attest(uppercase("myVar").problems?.summary).equals(
    //         "Must be only uppercase letters (was 'myVar')"
    //     )
    // })
    // test("email", () => {
    //     const email = type("email")
    //     attest(email("shawn@mail.com").data).equals("shawn@mail.com")
    //     attest(email("shawn@email").problems?.summary).equals(
    //         "Must be a valid email (was 'shawn@email')"
    //     )
    // })
    // test("uuid", () => {
    //     const uuid = type("uuid")
    //     attest(uuid("f70b8242-dd57-4e6b-b0b7-649d997140a0").data).equals(
    //         "f70b8242-dd57-4e6b-b0b7-649d997140a0"
    //     )
    //     attest(uuid("1234").problems?.summary).equals(
    //         "Must be a valid UUID (was '1234')"
    //     )
    // })
    // test("parsedNumber", () => {
    //     const parsedNumber = type("parsedNumber")
    //     attest(parsedNumber("5").data).equals(5)
    //     attest(parsedNumber("5.5").data).equals(5.5)
    //     attest(parsedNumber("five").problems?.summary).equals(
    //         "Must be a well-formed numeric string (was 'five')"
    //     )
    // })
    // test("parsedInteger", () => {
    //     const parsedInteger = type("parsedInteger")
    //     attest(parsedInteger("5").data).equals(5)
    //     attest(parsedInteger("5.5").problems?.summary).equals(
    //         "Must be a well-formed integer string (was '5.5')"
    //     )
    //     attest(parsedInteger("five").problems?.summary).equals(
    //         "Must be a well-formed integer string (was 'five')"
    //     )
    //     attest(parsedInteger(5).problems?.summary).equals(
    //         "Must be a string (was number)"
    //     )
    //     attest(parsedInteger("9007199254740992").problems?.summary).equals(
    //         "Must be an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER (was '9007199254740992')"
    //     )
    // })
    // test("parsedDate", () => {
    //     const parsedDate = type("parsedDate")
    //     attest(parsedDate("5/21/1993").data?.toDateString()).equals(
    //         "Fri May 21 1993"
    //     )
    //     attest(parsedDate("foo").problems?.summary).equals(
    //         "Must be a valid date (was 'foo')"
    //     )
    //     attest(parsedDate(5).problems?.summary).equals(
    //         "Must be a string (was number)"
    //     )
    // })
    // test("json", () => {
    //     const json = type("json")
    //     attest(json('{"a": "hello"}').data).equals({ a: "hello" })
    //     attest(json(123).problems?.summary).equals(
    //         "Must be a JSON-parsable string (was number)"
    //     )
    // })
    // test("credit card", () => {
    //     const validCC = "5489582921773376"
    //     attest(ark.creditCard(validCC).data).equals(validCC)
    //     // Regex validation
    //     attest(ark.creditCard("0".repeat(16)).problems?.summary).equals(
    //         "Must be a valid credit card number (was '0000000000000000')"
    //     )
    //     // Luhn validation
    //     attest(
    //         ark.creditCard(validCC.slice(0, -1) + "0").problems?.summary
    //     ).equals(
    //         "Must be a valid credit card number (was '5489582921773370')"
    //     )
    // })
    // test("semver", () => {
    //     attest(ark.semver("1.0.0").data).equals("1.0.0")
    //     attest(ark.semver("-1.0.0").problems?.summary).equals(
    //         "Must be a valid semantic version (see https://semver.org/) (was '-1.0.0')"
    //     )
    // })
    // })
})
