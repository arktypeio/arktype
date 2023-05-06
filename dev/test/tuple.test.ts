import { it } from "mocha"
import { scope, type } from "../../src/main.js"
import {
    prematureRestMessage,
    writeNonArrayRestMessage
} from "../../src/parse/ast/tuple.js"
import { attest } from "../attest/main.js"

describe("tuple", () => {
    it("shallow", () => {
        const t = type(["string", "number"])
        attest(t.infer).typed as [string, number]
    })
    it("nested", () => {
        const t = type([["string", "number"], [{ a: "boolean", b: ["null"] }]])
        attest(t.infer).typed as [
            [string, number],
            [
                {
                    a: boolean
                    b: [null]
                }
            ]
        ]
    })
    describe("variadic", () => {
        it("spreads simple arrays", () => {
            const wellRested = type(["string", "...number[]"])
            attest(wellRested.infer).typed as [string, ...number[]]
        })
        it("tuple expression", () => {
            const wellRestedTuple = type([
                "number",
                ["...", [{ a: "string" }, "[]"]]
            ])
            attest(wellRestedTuple.infer).typed as [number, ...{ a: string }[]]
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
            attest(types.myVariadicKeyword.infer).typed as [
                string,
                ...boolean[]
            ]
        })
        it("errors on non-array", () => {
            // @ts-expect-error
            attest(() => type(["email", "...symbol"])).throwsAndHasTypeError(
                writeNonArrayRestMessage("symbol")
            )
            attest(() =>
                // @ts-expect-error
                type(["number", ["...", "string"]])
            ).throwsAndHasTypeError(writeNonArrayRestMessage("string"))
        })
        it("errors on non-last element", () => {
            // @ts-expect-error
            attest(() => type(["...number[]", "string"])).throwsAndHasTypeError(
                prematureRestMessage
            )
            attest(() =>
                // @ts-expect-error
                type([["...", "string[]"], "number"])
            ).throwsAndHasTypeError(prematureRestMessage)
        })
    })
    describe("intersections", () => {
        it("tuple", () => {
            // TODO: can improve?
            const t = type([[{ a: "string" }], "&", [{ b: "boolean" }]])
            attest(t.infer).typed as [
                {
                    a: string
                    b: boolean
                }
            ]
        })
        it("array", () => {
            const tupleAndArray = type([
                [{ a: "string" }],
                "&",
                [{ b: "boolean" }, "[]"]
            ])
            const arrayAndTuple = type([
                [{ b: "boolean" }, "[]"],
                "&",
                [{ a: "string" }]
            ])
            attest(tupleAndArray.infer).typed as [
                {
                    a: string
                    b: boolean
                }
            ]
            attest(arrayAndTuple.infer).typed as [
                {
                    a: string
                    b: boolean
                }
            ]
        })
        it("variadic", () => {})
    })
})
