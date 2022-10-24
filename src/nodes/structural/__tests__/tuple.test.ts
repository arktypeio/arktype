import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../api.js"
import { Unenclosed } from "../../../parser/str/operand/unenclosed.js"

describe("tuple", () => {
    describe("empty", () => {
        const empty = type.lazy([])
        test("type", () => {
            attest(empty.infer).typed as []
        })
        test("validation", () => {
            attest(empty.check([]).problems).is(undefined)
            attest(empty.check({}).problems?.summary).snap(
                "Must be an array (was object)"
            )
        })
    })
    const shallow = type.lazy(["string", "number", "6"])
    describe("infer", () => {
        test("standard", () => {
            attest(shallow.infer).typed as [string, number, 6]
        })
        describe("errors", () => {
            test("invalid item definition", () => {
                attest(() =>
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
            attest(shallow.check(["violin", 42, 6]).problems).is(undefined)
        })
        describe("errors", () => {
            test("bad item value", () => {
                attest(
                    shallow.check(["violin", 42n, 6]).problems?.summary
                ).snap(`Value at index 1 must be a number (was bigint)`)
            })
            test("too short", () => {
                attest(shallow.check(["violin", 42]).problems?.summary).snap(
                    "Length must be 3 (was 2)"
                )
            })
            test("too long", () => {
                attest(
                    shallow.check(["violin", 42, 6, null]).problems?.summary
                ).snap(`Length must be 3 (was 4)`)
            })
        })
    })
})
