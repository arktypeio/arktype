import { describe, it } from "mocha"
import { type } from "../../src/main.js"
import { writeUnresolvableMessage } from "../../src/parse/string/shift/operand/unenclosed.js"
import { incompleteArrayTokenMessage } from "../../src/parse/string/shift/operator/operator.js"
import { attest } from "../attest/main.js"

describe("parse array", () => {
    it("parse", () => {
        const t = type("string[]")
        attest(t.infer).typed as string[]
        attest(t.root.key).snap(`$arkIn instanceof Array && (() => {
            let valid = true;
            for(let i = 0; i < $arkIn.length; i++) {
                valid = typeof $arkIn[i] === "string" && valid;
            }
            return valid
        })()`)
        attest(t.allows(["foo", "bar"])).snap(true)
        attest(t.allows(["foo", 5, "bar"])).snap(false)
    })
    it("array intersection", () => {
        type([[{ a: "string" }, "[]"], "&", [{ b: "number" }, "[]"]])
    })
    it("multiple errors", () => {
        const stringArray = type("string[]")
        attest(stringArray([1, 2]).problems?.summary).snap(
            "Item at index 0 must be a string (was number)\nItem at index 1 must be a string (was number)"
        )
    })
    it("helper", () => {
        const t = type({ a: "string" }).toArray()
        attest(t.infer).typed as {
            a: string
        }[]
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
    })
})
