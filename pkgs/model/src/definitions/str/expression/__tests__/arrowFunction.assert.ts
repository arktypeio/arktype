import { assert } from "@re-/assert"
import { define } from "model"

describe("arrow function", () => {
    describe("type", () => {
        test("zero args", () => {
            assert(define("()=>void").type).typed as () => void
        })
        test("one arg", () => {
            assert(define("(null)=>object").type).typed as (
                args_0: null
            ) => object
        })
        test("multiple args", () => {
            assert(define("(string,number)=>boolean").type).typed as (
                args_0: string,
                args_1: number
            ) => boolean
        })
        describe("errors", () => {
            test("unparenthesized args", () => {
                // @ts-expect-error
                assert(() => define("=>string")).throwsAndHasTypeError(
                    "Unable to determine the type of '=>string'."
                )
            })
            test("bad args", () => {
                assert(() =>
                    // @ts-expect-error
                    define("(foop,string,nufmber)=>boolean")
                )
                    .throws("Unable to determine the type of 'foop'.")
                    .type.errors(
                        /Unable to determine the type of 'foop'[\s\S]*Unable to determine the type of 'nufmber'/
                    )
            })
            test("missing return", () => {
                // @ts-expect-error
                assert(() => define("()=>")).throwsAndHasTypeError(
                    "Unable to determine the type of ''."
                )
            })
            test("bad return", () => {
                // @ts-expect-error
                assert(() => define("()=>fork")).throwsAndHasTypeError(
                    "Unable to determine the type of 'fork'."
                )
            })
        })
    })
})
