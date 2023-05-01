import { describe, it } from "mocha"
import { arrayOf, type } from "../../src/main.js"
import { writeUnresolvableMessage } from "../../src/parse/string/shift/operand/unenclosed.js"
import { incompleteArrayTokenMessage } from "../../src/parse/string/shift/operator/operator.js"
import { attest } from "../attest/main.js"

describe("parse array", () => {
    it("parse", () => {
        const t = type("string[]")
        attest(t.infer).typed as string[]
        attest(t.node).snap({
            object: {
                class: "(function Array)",
                props: { "[index]": "string" }
            }
        })
        attest(t.flat).snap([
            ["class", "(function Array)"],
            ["indexProp", "string"]
        ])
    })
    it("array intersection", () => {
        const t = type([[{ a: "string" }, "[]"], "&", [{ b: "number" }, "[]"]])
        attest(t.node).snap({
            object: {
                class: "(function Array)",
                props: {
                    "[index]": {
                        object: { props: { a: "string", b: "number" } }
                    }
                }
            }
        })
        attest(t.flat).snap([
            ["class", "(function Array)"],
            [
                "indexProp",
                [
                    ["domain", "object"],
                    ["requiredProp", ["a", "string"]],
                    ["requiredProp", ["b", "number"]]
                ]
            ]
        ])
    })
    it("multiple errors", () => {
        const stringArray = type("string[]")
        attest(stringArray([1, 2]).problems?.summary).snap(
            "Item at index 0 must be a string (was number)\nItem at index 1 must be a string (was number)"
        )
    })
    it("helper", () => {
        const t = arrayOf({ a: "string" })
        attest(t.infer).typed as {
            a: string
        }[]
        attest(t.node).snap({
            object: {
                class: "(function Array)",
                props: { "[index]": { object: { props: { a: "string" } } } }
            }
        })
    })

    describe("errors", () => {
        it("incomplete token", () => {
            // @ts-expect-error
            attest(() => type("string[")).throwsAndHasTypeError(
                incompleteArrayTokenMessage
            )
        })
        it("helper", () => {
            // @ts-expect-error
            attest(() => arrayOf({ a: "hmm" })).throwsAndHasTypeError(
                writeUnresolvableMessage("hmm")
            )
        })
        it("from node definition without class rule", () => {
            const t = type([
                "node",
                {
                    object: {
                        props: {
                            "[index]": { number: true }
                        }
                    }
                }
            ])
            attest(t({}).problems?.summary).snap(
                "Must be an array (was Object)"
            )
        })
    })
})
