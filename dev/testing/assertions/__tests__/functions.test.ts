import { strict } from "node:assert"
import { basename } from "node:path"
import { fileName } from "#runtime"
import { describe, test } from "mocha"
import { assert } from "../../api.js"

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
describe("assertion errors", () => {
    test("incorrect return type", () => {
        assert(() => null).returns(null).typed as null

        const ok = assert(() => ({})).returns
        ok.equals({})
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
            "string"
        )
    })
    test("valid type errors", () => {
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
    test("bad type errors", () => {
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
    test("chainable", () => {
        assert(o).equals({ re: "do" }).typed as { re: string }
        // @ts-expect-error
        assert(() => throwError("this is a type error"))
            .throws("Test error.")
            .type.errors("Expected 0 arguments, but got 1.")
    })
    test("bad chainable", () => {
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
    test("throwsAndHasTypeError", () => {
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
    test("throws empty", () => {
        assert(throwError).throws()
        strict.throws(
            () => assert(() => shouldThrow(false)).throws(),
            strict.AssertionError,
            "didn't throw"
        )
    })
    test("args", () => {
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

    const getThrownError = (f: () => void) => {
        try {
            f()
        } catch (e) {
            if (e instanceof Error) {
                return e
            }
        }
        throw new Error("Expected function to throw an error.")
    }

    test("stack starts from test file", () => {
        const e = getThrownError(() => assert(1 + 1).equals(3))
        strict.match(e.stack!.split("\n")[1], new RegExp(basename(fileName())))
    })
})
