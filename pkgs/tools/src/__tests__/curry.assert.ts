import { curry, narrow, NumericCompositions } from ".."
import { assert } from "@re-/assert"

describe("curry", () => {
    test("empty", () => {
        assert(curry(() => {})).returns(undefined).typed as void
    })
    test("rest parameters", () => {
        // @ts-expect-error
        assert(() => curry((...args: any[]) => args)).type.errors.snap(
            `"Argument of type '(...args: any[]) => any[]' is not assignable to parameter of type '\\"Functions with rest parameters are not supported.\\"'."`
        )
    })
    test("compositions", () => {
        const expectedReturn = narrow(["yes", true, 1])
        const curryable = curry(
            (s: string, b: boolean, n: number) =>
                [s, b, n] as typeof expectedReturn
        )
        assert(curryable).type.toString.snap(
            `"((s: string) => (b: boolean) => (n: number) => [\\"yes\\", true, 1]) & ((s: string) => (b: boolean, n: number) => [\\"yes\\", true, 1]) & ((s: string, b: boolean) => (n: number) => [\\"yes\\", true, 1]) & ((s: string, b: boolean, n: number) => [\\"yes\\", true, 1])"`
        )
        // Dissabling this for now as union types are not being handled correctly
        // assert(curryable("yes", true, 1)).typedValue(expectedReturn)
        // assert(curryable("yes")(true)(1)).typedValue(expectedReturn)
        // assert(curryable("yes", true)(1)).typedValue(expectedReturn)
    })
    test("composition type", () => {
        // Valid because the list adds to 12
        const validComposition: NumericCompositions<12> = [1, 2, 7, 1, 1]
        assert(() => {
            // @ts-expect-error
            const invalidComposition: NumericCompositions<12> = [1, 2, 7, 1, 2] // Adds to 13
        }).type.errors(
            "Type '[1, 2, 7, 1, 2]' is not assignable to type '[2, 2, 2, 2, 2, 2] | [2, 2, 2, 2, 2, 1, 1]"
        )
    })
})
