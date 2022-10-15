import { assert } from "@re-/assert"
import { narrow } from "@re-/tools"
import { describe, test } from "mocha"
import { type } from "../../../api.js"

describe("object", () => {
    describe("infer", () => {
        test("base", () => {
            assert(
                type({
                    a: "0"
                }).infer
            ).typed as { a: 0 }
        })
        test("with optional key", () => {
            assert(
                type({
                    required: "boolean",
                    optional: "boolean?"
                }).infer
            ).typed as {
                required: boolean
                optional?: boolean | undefined
            }
        })
        test("empty", () => {
            assert(type({}).infer).typed as {}
        })
    })
    describe("check", () => {
        const shallowInputDef = narrow({
            a: "string",
            b: "number",
            c: "67"
        })
        const shallow = type.lazy(shallowInputDef)
        const nested = type.lazy({ nest: { ed: "string" } })
        test("standard", () => {
            assert(shallow.check({ a: "ok", b: 4.321, c: 67 }).errors).is(
                undefined
            )
        })
        test("nested", () => {
            assert(nested.check({ nest: { ed: "!" } }).errors).is(undefined)
        })
        describe("errors", () => {
            test("bad value", () => {
                assert(
                    shallow.check({ a: "ko", b: 123.4, c: 76 }).errors?.summary
                ).snap(`c must be 67 (was 76)`)
            })
            test("bad nested value", () => {
                assert(
                    nested.check({ nest: { ed: null } }).errors?.summary
                ).snap(`nest/ed must be a string (was null)`)
            })
            test("missing keys", () => {
                assert(shallow.check({ a: "ok" }).errors?.summary)
                    .snap(`b: b is required
c: c is required`)
            })
            // TODO: Reenable
            // test("extraneous keys", () => {
            //     assert(
            //         type(shallowInputDef, {
            //             // errors: {
            //             //     extraneousKeys: { enabled: true }
            //             // }
            //         }).check({
            //             // errors: {
            //             //     extraneousKeys: { enabled: true }
            //             // }
            //         }).errors?.summary
            //     ).snap()
            // })
            // test("single extraneous", () => {
            //     assert(
            //         type(shallowInputDef, {
            //             // errors: {
            //             //     extraneousKeys: { enabled: true }
            //             // }
            //         }).check({
            //             a: "",
            //             b: 1,
            //             c: 67,
            //             extraneous: true
            //         }).errors?.summary
            //     ).snap("<undefined>")
            // })
        })
    })
})
