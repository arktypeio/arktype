import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../api.js"
import { Unenclosed } from "../../../parser/str/operand/unenclosed.js"
import type { Diagnostic } from "../../traverse/diagnostics.js"

describe("tuple", () => {
    describe("empty", () => {
        const empty = () => type([])
        test("type", () => {
            assert(empty().infer).typed as []
        })
        test("validation", () => {
            assert(empty().check([]).errors).is(undefined)
            assert(empty().check({}).errors?.summary).snap(
                `Must be an array (was dictionary)`
            )
        })
    })
    const shallow = () => type(["string", "number", "6"])
    describe("infer", () => {
        test("standard", () => {
            assert(shallow().infer).typed as [string, number, 6]
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
            assert(shallow().check(["violin", 42, 6]).errors).is(undefined)
        })
        describe("errors", () => {
            test("bad item value", () => {
                assert(
                    shallow().check(["violin", 42n, 6]).errors?.summary
                ).snap(`Value at index 1 must be a number (was bigint)`)
            })
            test("too short", () => {
                assert(
                    shallow().check(["violin", 42]).errors as any as [
                        Diagnostic<"tupleLength">
                    ]
                ).snap()
            })
            test("too long", () => {
                assert(
                    shallow().check(["violin", 42, 6, null]).errors?.summary
                ).snap(`Length must be 3 (was 4)`)
            })
        })
    })
})
