import { assert } from "@re-/assert"
import { define } from "@re-/model"

export const testArrowFunction = () => {
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
    describe("validation", () => {
        test("functional", () => {
            assert(define("()=>any").validate(() => {}).errors).is(undefined)
        })
        describe("errors", () => {
            test("non-functional", () => {
                assert(define("()=>any").validate({}).errors).snap(
                    `"{} is not assignable to ()=>any."`
                )
            })
        })
    })
    describe("generation", () => {
        test("no-op by default", () => {
            const generated = define("()=>any").generate()
            assert(generated()).is(undefined)
        })
    })
}
