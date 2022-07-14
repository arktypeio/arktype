import { strict } from "node:assert"
import { assert } from "../src/assert.js"

const n = 5
const o = { re: "do" }
const shouldThrow = (a: false) => {
    if (a) {
        throw new Error(`${a} is not assignable to false`)
    }
}
const throwError = () => {
    throw new Error("Test error.")
}
describe("Assertion Error Checking", () => {
    it("Assertion Error - not equal", () => {
        strict.throws(
            () => assert(o).equals({ re: "doo" }),
            strict.AssertionError,
            "do !== doo"
        )
    })
    it("Assertion Error - incorrect type", () => {
        strict.throws(
            () => assert(o).typed as { re: number },
            strict.AssertionError,
            "o is not of type number"
        )
    })
    it("incorrect return type", () => {
        assert(() => null).returns(null).typed as null
        strict.throws(
            () =>
                assert((input: string) => `${input}!`)
                    .args("hi")
                    .returns("hi!").typed as number,
            strict.AssertionError,
            "input is not of type number"
        )
        strict.throws(
            () =>
                assert((input: string) => `${input}!`)
                    .args("hi")
                    .returns.type.toString("number"),
            strict.AssertionError,
            "input is not of type number"
        )
    })
    it("valid type errors", () => {
        // @ts-expect-error
        assert(o.re.length.nonexistent).type.errors(
            /Property 'nonexistent' does not exist on type 'number'/
        )
        assert(o).type.errors("")
        // @ts-expect-error
        assert(() => shouldThrow(5, "")).type.errors.is(
            "Expected 1 arguments, but got 2."
        )
    })
    it("bad type errors", () => {
        strict.throws(
            () => assert(o).type.errors(/This error doesn't exist/),
            strict.AssertionError,
            "doesn't exist"
        )
        strict.throws(
            () =>
                assert(() =>
                    // @ts-expect-error
                    shouldThrow("this is a type error")
                ).type.errors.is(""),
            strict.AssertionError,
            "not assignable"
        )
    })
    it("chainable", () => {
        assert(o).equals({ re: "do" }).typed as { re: string }
        // @ts-expect-error
        assert(() => throwError("this is a type error"))
            .throws("Test error.")
            .type.errors("Expected 0 arguments, but got 1.")
    })
    it("bad chainable", () => {
        strict.throws(
            () =>
                assert(n)
                    .equals(5)
                    .type.errors.equals("Expecting an error here will throw"),
            strict.AssertionError,
            "Expecting an error"
        )
        strict.throws(
            () => assert(n).is(7).type.toString("string"),
            strict.AssertionError,
            "7"
        )
        strict.throws(
            () => assert(() => {}).returns.is(undefined).typed as () => null,
            strict.AssertionError,
            "null"
        )
    })
    it("any type", () => {
        assert(n as any).typedValue(5 as any)
        assert(o as any).typed as any
        strict.throws(
            () => assert(n).typedValue(5 as any),
            strict.AssertionError,
            "number"
        )
        strict.throws(
            () => assert({} as unknown).typed as any,
            strict.AssertionError,
            "unknown"
        )
    })
    it("typedValue", () => {
        const getDo = () => "do"
        assert(o).typedValue({ re: getDo() })
        strict.throws(
            () => assert(o).typedValue({ re: "do" as any }),
            strict.AssertionError,
            "any"
        )
        strict.throws(
            () => assert(o).typedValue({ re: "don't" }),
            strict.AssertionError,
            "don't"
        )
    })
    it("return has typed value", () => {
        assert(() => "ooo").returns.typedValue("ooo")
        // Wrong value
        strict.throws(
            () =>
                assert((input: string) => input)
                    .args("yes")
                    .returns.typedValue("whoop"),
            strict.AssertionError,
            "whoop"
        )
        // Wrong type
        strict.throws(
            () =>
                assert((input: string) => input)
                    .args("yes")
                    .returns.typedValue("yes" as unknown),
            strict.AssertionError,
            "unknown"
        )
    })
    it("throwsAndHasTypeError", () => {
        // @ts-expect-error
        assert(() => shouldThrow(true)).throwsAndHasTypeError(
            /true[\S\s]*not assignable[\S\s]*false/
        )
        // No thrown error
        strict.throws(
            () =>
                // @ts-expect-error
                assert(() => shouldThrow(null)).throwsAndHasTypeError(
                    "not assignable"
                ),
            strict.AssertionError,
            "didn't throw"
        )
        // No type error
        strict.throws(
            () =>
                assert(() => shouldThrow(true as any)).throwsAndHasTypeError(
                    "not assignable"
                ),
            strict.AssertionError,
            "not assignable"
        )
    })
    it("assert value ignores type", () => {
        const myValue = { a: ["+"] } as const
        const myExpectedValue = { a: ["+"] }
        // @ts-expect-error
        assert(myValue).equals(myExpectedValue)
        assert(myValue).value.equals(myExpectedValue)
        strict.throws(
            () => assert(myValue).value.is(myExpectedValue),
            strict.AssertionError,
            "not reference-equal"
        )
    })
    it("throws empty", () => {
        assert(throwError).throws()
        strict.throws(
            () => assert(() => shouldThrow(false)).throws(),
            strict.AssertionError,
            "didn't throw"
        )
    })
    it("args", () => {
        assert((input: string) => `${input}!`)
            .args("omg")
            .returns.is("omg!")
        strict.throws(
            () =>
                assert((input: string) => {
                    throw new Error(`${input}!`)
                })
                    .args("fail")
                    .throws("omg!"),
            strict.AssertionError,
            "fail"
        )
    })

    it("multiline", () => {
        assert({
            several: true,
            lines: true,
            long: true
        } as object).typed as object
        strict.throws(
            () =>
                assert({
                    several: true,
                    lines: true,
                    long: true
                }).typed as object,
            strict.AssertionError,
            "object"
        )
    })
})
