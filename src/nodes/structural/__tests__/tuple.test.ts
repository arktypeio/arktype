import { describe, test } from "mocha"
import { type } from "../../../api.js"
import { Unenclosed } from "../../../parser/str/operand/unenclosed.js"
import { assert } from "#testing"

describe("tuple", () => {
    describe("empty", () => {
        const empty = type.lazy([])
        test("type", () => {
            assert(empty.infer).typed as []
        })
        test("validation", () => {
            assert(empty.check([]).problems).is(undefined)
            assert(empty.check({}).problems?.summary).snap(
                "Must be an array (was object)"
            )
        })
    })
    const shallow = type.lazy(["string", "number", "6"])
    describe("infer", () => {
        test("standard", () => {
            assert(shallow.infer).typed as [string, number, 6]
        })
        describe("errors", () => {
            test("invalid item definition", () => {
                assert(() =>
                    // @ts-expect-error
                    type(["string", ["number", "boolean", "whoops"]])
                ).throwsAndHasTypeError(
                    Unenclosed.buildUnresolvableMessage("whoops")
                )
            })
        })
    })
    describe("check", () => {
        test("standard", () => {
            assert(shallow.check(["violin", 42, 6]).problems).is(undefined)
        })
        describe("errors", () => {
            test("bad item value", () => {
                assert(
                    shallow.check(["violin", 42n, 6]).problems?.summary
                ).snap(`Value at index 1 must be a number (was bigint)`)
            })
            test("too short", () => {
                assert(shallow.check(["violin", 42]).problems?.summary).snap(
                    "Length must be 3 (was 2)"
                )
            })
            test("too long", () => {
                assert(
                    shallow.check(["violin", 42, 6, null]).problems?.summary
                ).snap(`Length must be 3 (was 4)`)
            })
        })
    })
})
