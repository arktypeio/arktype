import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../api.js"
import { ArrayOperator } from "../array.js"

describe("parse array", () => {
    test("parse", () => {
        attest(type("string[]").infer).typed as string[]
    })
    describe("errors", () => {
        test("incomplete token", () => {
            // @ts-expect-error
            attest(() => type("string[")).throwsAndHasTypeError(
                ArrayOperator.incompleteTokenMessage
            )
        })
    })
})
