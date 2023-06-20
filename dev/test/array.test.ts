import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { writeUnresolvableMessage } from "../../src/parse/string/shift/operand/unenclosed.js"
import { incompleteArrayTokenMessage } from "../../src/parse/string/shift/operator/operator.js"
import { attest } from "../attest/main.js"

suite("array", () => {
    suite("parse", () => {
        test("base", () => {
            const t = type("string[]")
            attest(t.infer).typed as string[]
            attest(t.allows([])).equals(true)
            attest(t.allows(["foo", "bar"])).equals(true)
            attest(t.allows(["foo", "bar", 5])).equals(false)
            attest(t.allows([5, "foo", "bar"])).equals(false)
        })
        test("nested", () => {
            const t = type("string[][]")
            attest(t.infer).typed as string[][]
            attest(t.allows([])).equals(true)
            attest(t.allows([["foo"]])).equals(true)
            attest(t.allows(["foo"])).equals(false)
            attest(t.allows([["foo", 5]])).equals(false)
        })

        test("tuple expression", () => {
            const t = type(["string", "[]"])
            attest(t.infer).typed as string[]
            attest(t.condition).equals(type("string[]").condition)
        })

        test("root expression", () => {
            const t = type("string", "[]")
            attest(t.infer).typed as string[]
            attest(t.condition).equals(type("string[]").condition)
        })

        test("chained", () => {
            const t = type({ a: "string" }).array()
            attest(t.infer).typed as {
                a: string
            }[]
            // @ts-expect-error
            attest(() => type({ a: "hmm" }).array()).throwsAndHasTypeError(
                writeUnresolvableMessage("hmm")
            )
        })
        test("incomplete token", () => {
            // @ts-expect-error
            attest(() => type("string[")).throwsAndHasTypeError(
                incompleteArrayTokenMessage
            )
        })
    })
    suite("intersection", () => {
        test("shallow array intersection", () => {
            const actual = type("string[]&'foo'[]").condition
            const expected = type("'foo'[]").condition
            attest(actual).is(expected)
        })
        test("deep array intersection", () => {
            const actual = type([{ a: "string" }, "[]"]).and([
                { b: "number" },
                "[]"
            ]).condition
            const expected = type([
                { a: "string", b: "number" },
                "[]"
            ]).condition
            attest(actual).is(expected)
        })
        test("tuple intersection", () => {
            const t = type([[{ a: "string" }], "&", [{ b: "boolean" }]])
            attest(t.infer).typed as [
                {
                    a: string
                    b: boolean
                }
            ]
        })
        test("mixed tuple intersection", () => {
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
            const expected = type([{ a: "string", b: "boolean" }]).condition
            attest(tupleAndArray.condition).is(expected)
            attest(arrayAndTuple.condition).is(expected)
        })
    })
    suite("traversal", () => {
        test("multiple errors", () => {
            const stringArray = type("string[]")
            attest(stringArray([1, 2]).problems?.summary).snap(
                "Item at index 0 must be a string (was number)\nItem at index 1 must be a string (was number)"
            )
        })
    })
})
