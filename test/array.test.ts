import { attest } from "../dev/attest/api.js"
import { describe, test } from "mocha"
import { type } from "../api.js"
import { incompleteArrayTokenMessage } from "../src/parse/shift/operator/operator.js"

describe("parse array", () => {
    test("parse", () => {
        const stringArray = type("string[]")
        attest(stringArray.infer).typed as string[]
        attest(stringArray.attributes).snap({
            type: "array",
            props: { "*": { type: "string" } }
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
