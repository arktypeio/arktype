import { curry, narrow, NumericCompositions } from ".."

describe("curry", () => {
    test("empty", () => {
        const result: () => void = curry(() => {})
        expect(result()).toBe(undefined)
    })
    test("rest parameters", () => {
        // @ts-expect-error
        const result = curry((...args: any[]) => args)
    })
    test("compositions", () => {
        const expectedReturn = narrow(["yes", true, 1])
        type ExpectedReturn = typeof expectedReturn
        const result = curry(
            (s: string, b: boolean, n: number) => expectedReturn
        )
        const allResult: ExpectedReturn = result("yes", true, 1)
        expect(allResult).toStrictEqual(expectedReturn)
        const oneAtATime: ExpectedReturn = result("yes")(true)(1)
        expect(oneAtATime).toStrictEqual(expectedReturn)
        const mixed: ExpectedReturn = result("yes", true)(1)
        expect(mixed).toStrictEqual(expectedReturn)
    })
    test("composition type", () => {
        // Valid because the list adds to 12
        const validComposition: NumericCompositions<12> = [1, 2, 7, 1, 1]
        // @ts-expect-error
        const invalidComposition: NumericCompositions<12> = [1, 2, 7, 1, 2] // Adds to 13
    })
})
