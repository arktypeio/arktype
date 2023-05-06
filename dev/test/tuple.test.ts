import { test } from "mocha"
import { scope, type } from "../../src/main.js"
import {
    prematureRestMessage,
    writeNonArrayRestMessage
} from "../../src/parse/ast/tuple.js"
import { attest } from "../attest/main.js"

suite("tuple", () => {
    test("shallow", () => {
        const t = type(["string", "number"])
        attest(t.infer).typed as [string, number]
    })
    test("nested", () => {
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
    suite("variadic", () => {
        test("spreads simple arrays", () => {
            const wellRested = type(["string", "...number[]"])
            attest(wellRested.infer).typed as [string, ...number[]]
        })
        test("tuple expression", () => {
            const wellRestedTuple = type([
                "number",
                ["...", [{ a: "string" }, "[]"]]
            ])
            attest(wellRestedTuple.infer).typed as [number, ...{ a: string }[]]
        })
        test("spreads array expressions", () => {
            const greatSpread = type([{ a: "boolean" }, "...(Date|RegExp)[]"])
            attest(greatSpread.infer).typed as [
                {
                    a: boolean
                },
                ...(RegExp | Date)[]
            ]
        })
        test("allows array keyword", () => {
            const types = scope({
                myArrayKeyword: "boolean[]",
                myVariadicKeyword: ["string", "...myArrayKeyword"]
            }).compile()
            attest(types.myVariadicKeyword.infer).typed as [
                string,
                ...boolean[]
            ]
        })
        test("errors on non-array", () => {
            // @ts-expect-error
            attest(() => type(["email", "...symbol"])).throwsAndHasTypeError(
                writeNonArrayRestMessage("symbol")
            )
            attest(() =>
                // @ts-expect-error
                type(["number", ["...", "string"]])
            ).throwsAndHasTypeError(writeNonArrayRestMessage("string"))
        })
        test("errors on non-last element", () => {
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
    suite("intersections", () => {
        test("tuple", () => {
            // TODO: can improve?
            const t = type([[{ a: "string" }], "&", [{ b: "boolean" }]])
            attest(t.infer).typed as [
                {
                    a: string
                    b: boolean
                }
            ]
        })
        test("array", () => {
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
        test("variadic", () => {})
    })
})
