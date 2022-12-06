import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"
import { incompleteArrayTokenMessage } from "../src/parse/shift/operator/operator.js"

describe("parse array", () => {
    test("parse", () => {
        const stringArray = type("string[]")
        attest(stringArray.infer).typed as string[]
        attest(stringArray.root).snap({
            type: "object",
            subtype: "array",
            children: {
                propTypes: {
                    number: "string"
                }
            }
        })
    })
    describe("errors", () => {
        test("incomplete token", () => {
            // @ts-expect-error
            attest(() => type("string[")).throwsAndHasTypeError(
                incompleteArrayTokenMessage
            )
        })
    })
})
