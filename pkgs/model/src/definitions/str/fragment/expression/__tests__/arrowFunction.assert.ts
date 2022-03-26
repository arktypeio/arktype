import { assert } from "@re-/assert"
import { create } from "@re-/model"

export const testArrowFunction = () => {
    describe("type", () => {
        test("zero args", () => {
            assert(create("()=>void").type).typed as () => void
        })
        test("one arg", () => {
            assert(create("(null)=>object").type).typed as (
                args_0: null
            ) => object
        })
        test("multiple args", () => {
            assert(create("(string,number)=>boolean").type).typed as (
                args_0: string,
                args_1: number
            ) => boolean
        })
        describe("errors", () => {
            test("bad args", () => {
                assert(() =>
                    // @ts-expect-error
                    create("(foop,string,nufmber)=>boolean")
                )
                    .throws("Unable to determine the type of 'foop'.")
                    .type.errors(
                        /Unable to determine the type of 'foop'[\s\S]*Unable to determine the type of 'nufmber'/
                    )
            })
            test("missing return", () => {
                // @ts-expect-error
                assert(() => create("()=>")).throwsAndHasTypeError(
                    "Unable to determine the type of ''."
                )
            })
            test("bad return", () => {
                // @ts-expect-error
                assert(() => create("()=>fork")).throwsAndHasTypeError(
                    "Unable to determine the type of 'fork'."
                )
            })
        })
    })
    describe("validation", () => {
        test("functional", () => {
            assert(create("()=>any").validate(() => {}).errors).is(undefined)
        })
        describe("errors", () => {
            test("non-functional", () => {
                assert(create("()=>any").validate({}).errors).snap(
                    `"{} is not assignable to ()=>any."`
                )
            })
        })
    })
    describe("generation", () => {
        test("unsupported", () => {
            assert(() => create("()=>void").generate()).throws.snap(
                `"Unable to generate a value for '()=>void' (arrow function generation is unsupported)."`
            )
        })
    })
}
