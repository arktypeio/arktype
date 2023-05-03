import { describe, it } from "mocha"
import { scope, type } from "../../src/main.js"
import { attest } from "../attest/main.js"

describe("variadic", () => {
    it("spreads simple arrays", () => {
        const wellRested = type(["string", "...number[]"])
        attest(wellRested.infer).typed as [string, ...number[]]
    })
    it("spreads array expressions", () => {
        const greatSpread = type([{ a: "boolean" }, "...(Date|RegExp)[]"])
        attest(greatSpread.infer).typed as [
            {
                a: boolean
            },
            ...(RegExp | Date)[]
        ]
    })
    it("allows array keyword", () => {
        const types = scope({
            myArrayKeyword: "boolean[]",
            myVariadicKeyword: ["string", "...myArrayKeyword"]
        }).compile()
        attest(types.myVariadicKeyword.infer).typed as [string, ...boolean[]]
    })
    it("errors on non-array", () => {
        // @ts-expect-error
        attest(() => type(["email", "...symbol"])).throwsAndHasTypeError(
            "Rest element 'symbol' must be an array."
        )
    })
    it("errors on non-last element", () => {
        // @ts-expect-error
        attest(() => type(["...number[]", "string"])).throwsAndHasTypeError(
            "Rest elements are only allowed at the end of a tuple"
        )
    })
})
