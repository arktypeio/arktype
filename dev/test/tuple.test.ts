import { suite, test } from "mocha"
import { scope, type } from "../../src/main.js"
import {
    prematureRestMessage,
    writeNonArrayRestMessage
} from "../../src/parse/tuple.js"
import { attest } from "../attest/main.js"

suite("tuple", () => {
    test("shallow", () => {
        const t = type(["string", "number"])
        attest(t.infer).typed as [string, number]
        attest(t.root.condition).snap(
            '$arkRoot instanceof Array && $arkRoot.length === 2 && typeof $arkRoot["0"] === "string" && typeof $arkRoot["1"] === "number"'
        )
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
            attest(wellRested.root.condition)
                .snap(`$arkRoot instanceof Array && typeof $arkRoot["0"] === "string" && (() => {
            let valid = true;
            for(let $arkIndex = 1; $arkIndex < $arkRoot.length; $arkIndex++) {
                valid = typeof $arkRoot[$arkIndex] === "number" && valid;
            }
            return valid
        })()`)
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
            attest(greatSpread.root.condition)
                .snap(`$arkRoot instanceof Array && ((typeof $arkRoot["0"] === "object" && $arkRoot["0"] !== null) || typeof $arkRoot["0"] === "function") && (() => {
        switch($arkRoot["0"].a) {
            case true: {
                return true;
            }case false: {
                return true;
            }
        }
    })() && (() => {
            let valid = true;
            for(let $arkIndex = 1; $arkIndex < $arkRoot.length; $arkIndex++) {
                valid = ($arkRoot[$arkIndex] instanceof globalThis.$ark.Date || $arkRoot[$arkIndex] instanceof globalThis.$ark.RegExp) && valid;
            }
            return valid
        })()`)
        })
        test("allows array keyword", () => {
            const types = scope({
                myArrayKeyword: "boolean[]",
                myVariadicKeyword: ["string", "...myArrayKeyword"]
            }).export()
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
            const t = type([[{ a: "string" }], "&", [{ b: "boolean" }]])
            attest(t.condition).is(
                type([{ a: "string", b: "boolean" }]).condition
            )
        })
        test("array", () => {
            const tupleAndArray = type([{ a: "string" }]).and([
                { b: "boolean" }
            ])
            // Check to make sure the intersection is evaluated
            attest(tupleAndArray).types.toString.snap()
            const arrayAndTuple = type([
                [{ b: "boolean" }, "[]"],
                "&",
                [{ a: "string" }]
            ])
            const expected = type([{ a: "string", b: "boolean" }])
            attest(tupleAndArray.condition).equals(expected.condition)
            attest(arrayAndTuple.condition).equals(expected.condition)
        })
        test("variadic", () => {
            const b = type([{ b: "boolean" }, "[]"])

            const t = type([{ a: "string" }, ["...", b]]).and([
                { c: "number" },
                { d: "Date" }
            ])
            const expected = type([
                { a: "string", c: "number" },
                { b: "boolean", d: "Date" }
            ])
            attest(t.condition).typedValue(expected.condition)
        })
    })
})
