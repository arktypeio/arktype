import { describe, it } from "mocha"
import { arrayOf, type } from "../../src/main.ts"
import { writeUnresolvableMessage } from "../../src/parse/string/shift/operand/unenclosed.ts"
import { incompleteArrayTokenMessage } from "../../src/parse/string/shift/operator/operator.ts"
import { attest } from "../attest/main.ts"

describe("parse array", () => {
    it("parse", () => {
        const t = type("string[]")
        attest(t.infer).typed as string[]
        attest(t.node).equals({
            object: {
                instance: Array,
                props: { "[index]": "string" }
            }
        })
        attest(t.steps).snap()
    })
    it("array intersection", () => {
        const t = type([[{ a: "string" }, "[]"], "&", [{ b: "number" }, "[]"]])
        attest(t.node).equals({
            object: {
                instance: Array,
                props: {
                    "[index]": {
                        object: { props: { a: "string", b: "number" } }
                    }
                }
            }
        })
        attest(t.steps).snap()
    })
    it("helper", () => {
        const t = arrayOf({ a: "string" })
        attest(t.infer).typed as {
            a: string
        }[]
        attest(t.node).equals({
            object: {
                instance: Array,
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
